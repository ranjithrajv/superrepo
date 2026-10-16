/**
 * Content script: the entire UI lives on the page now.
 *
 * Classic script by necessity — content scripts cannot be ES modules, and
 * dynamic import() of extension modules from a content script does not work in
 * MV3 (crbug 40186218). So this file imports nothing: it asks the background,
 * which owns the catalog, for everything it needs over runtime.sendMessage.
 *
 * The UI itself lives in a shadow root so GitHub's stylesheet cannot reach it,
 * and it borrows GitHub's own CSS custom properties so it matches the theme.
 */
(() => {
  const api = globalThis.browser?.runtime ? globalThis.browser : globalThis.chrome;
  if (!api?.runtime?.id || globalThis.__superRepoContentLoaded) return;
  globalThis.__superRepoContentLoaded = true;

  const HOST_TAG = "superepo-root";

  /** What a toolbar button draws. Anything else falls back to "icon". */
  const BUTTON_STYLES = ["icon", "monogram", "labeled"];

  /** A pin for the row that fills its category's header button. */
  const PIN_SVG =
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" ' +
    'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M9.6 1.6 14.4 6.4l-1.9.5-3 3-.5 3.4-3-3L2.6 8.4 6 7.9l3-3z" fill="currentColor"/>' +
    "</svg>";
  const MSG = {
    catalog: "superepo:catalog",
    open: "superepo:open",
    save: "superepo:save",
    // Needed by the category pins: they read-modify-write categoryIds, and a
    // message type missing here sends undefined, which matches no handler and
    // comes back empty — so the set starts empty and one click wipes the rest.
    readSettings: "superepo:read-settings",
    toggle: "superepo:toggle",
    move: "superepo:move",
    services: "superepo:services",
    changed: "superepo:changed",
  };

  /**
   * The settings the panel can change without leaving the page. Each mirrors an
   * option in the settings page; anything heavier — enabling or reordering the
   * whole catalog, adding a service, granting a host — stays in the options page,
   * which stays one click away from here.
   */
  const INLINE_FIELDS = [
    {
      key: "buttonStyle",
      label: "Buttons show",
      options: [
        ["icon", "Just the icon"],
        ["monogram", "Two-letter chip"],
        ["labeled", "Icon and name"],
      ],
    },
    {
      key: "placement",
      label: "Where they go",
      options: [
        ["auto", "Next to Star, else floating"],
        ["inline", "Only in the repo header"],
        ["floating", "Only floating"],
        ["off", "Nowhere"],
      ],
    },
    {
      key: "openTarget",
      label: "Clicking a service",
      options: [
        ["newTab", "Opens a new tab"],
        ["sameTab", "Replaces this tab"],
        ["window", "Opens a new window"],
        ["copy", "Just copies the URL"],
      ],
    },
    { key: "showCommands", label: "Local command-line services", boolean: true },
  ];

  const state = {
    payload: null,
    query: "",
    open: false,
    /** True while the panel is showing inline settings instead of the list. */
    showingSettings: false,
    hostEl: null,
    shadow: null,
    panel: null,
    cluster: null,
    toast: null,
    attachedTo: null,
    /** "inline" | "floating" | null — how the cluster is currently mounted. */
    mode: null,
    lastUrl: location.href,
    toastTimer: null,
  };

  // ------------------------------------------------------------------ mounting

  /**
   * Anchors, most reliable first.
   *
   * GitHub replaced the old `ul.pagehead-actions` header with Primer React
   * components whose class names are hashed (`prc-components-*`), so classes
   * cannot be relied on any more. The `data-testid` hooks are stable, and they
   * exist even for logged-out visitors, where Watch/Star/Fork are still
   * rendered as sign-in prompts.
   */
  const ANCHORS = [
    { name: "repo-header-actions", find: () => byTestId("repo-header-actions"), at: "end" },
    { name: "pagehead-actions", find: () => document.querySelector("ul.pagehead-actions"), at: "end", list: true },
    { name: "repository-container-header", find: () => document.querySelector("#repository-container-header"), at: "start" },
    { name: "star-button", find: () => byTestId("star-button")?.parentElement, at: "end" },
  ];

  function byTestId(id) {
    return document.querySelector(`[data-testid="${id}"]`);
  }

  function findAnchor() {
    for (const anchor of ANCHORS) {
      const node = anchor.find();
      if (node) return { ...anchor, node };
    }
    return null;
  }

  function ensureMounted() {
    if (state.hostEl?.isConnected) return true;

    const placement = state.payload?.settings?.placement ?? "auto";
    if (placement === "off") {
      unmount();
      return false;
    }

    const anchor = placement === "floating" ? null : findAnchor();

    const host = document.createElement(HOST_TAG);
    host.setAttribute("data-superepo", "1");
    const shadow = host.attachShadow({ mode: "open" });

    // adoptedStyleSheets is not subject to the page's CSP, unlike a <style> tag.
    const css = globalThis.SuperRepoContentStyles ?? "";
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      shadow.adoptedStyleSheets = [sheet];
    } catch {
      const style = document.createElement("style");
      style.textContent = css;
      shadow.append(style);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "cluster";
    shadow.append(wrapper);

    // A new shadow root means the old panel and toast are gone with it. Without
    // this reset, renderPanel() would keep writing into the detached shadow root
    // after GitHub's React replaces the header subtree — the panel would exist
    // in memory and never appear on screen.
    state.panel = null;
    state.toast = null;

    shadow.addEventListener("click", onShadowClick);
    shadow.addEventListener("keydown", onShadowKeydown);

    if (anchor) {
      host.setAttribute("data-placement", "inline");
      if (anchor.list) {
        // Keep list semantics intact inside GitHub's own <ul>. Same attribute as
        // the host, so a peer extension only has to learn one spelling.
        const item = document.createElement("li");
        item.setAttribute("data-superepo", "1");
        item.append(host);
        anchor.node.append(item);
        state.attachedTo = item;
      } else if (anchor.at === "start") {
        anchor.node.insertBefore(host, anchor.node.firstChild);
      } else {
        anchor.node.append(host);
      }
      state.placement = `inline:${anchor.name}`;
      state.mode = "inline";
    } else {
      host.setAttribute("data-placement", "floating");
      document.body.append(host);
      state.placement = "floating";
      state.mode = "floating";
    }

    state.hostEl = host;
    state.shadow = shadow;
    state.cluster = wrapper;
    return true;
  }

  function unmount() {
    // The <li> wrapper and the host both need removing.
    (state.attachedTo ?? state.hostEl)?.remove();
    state.hostEl?.remove();
    state.hostEl = null;
    state.shadow = null;
    state.panel = null;
    state.cluster = null;
    state.attachedTo = null;
    state.mode = null;
    state.open = false;
  }

  // ----------------------------------------------------------------- rendering

  function render() {
    if (!state.payload || !ensureMounted()) return;
    renderCluster();
    renderPanel();
  }

  function renderCluster() {
    const { payload } = state;
    const cluster = state.cluster;
    const style = BUTTON_STYLES.includes(payload.settings?.buttonStyle)
      ? payload.settings.buttonStyle
      : "icon";
    // Every style but "labeled" is a square button that names itself via tooltip.
    const iconOnly = style !== "labeled";

    cluster.dataset.style = style;
    cluster.replaceChildren();

    for (const service of payload.primary) {
      cluster.append(buttonEl(service, style, iconOnly));
    }

    cluster.append(moreButton(iconOnly));
  }

  function buttonEl(service, style, iconOnly) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = iconOnly ? "btn btn--icon" : "btn";
    button.dataset.open = service.id;
    // The name lives in the tooltip and the accessible name, not on the button.
    button.title = service.blurb ? `${service.name} — ${service.blurb}` : service.name;
    button.setAttribute("aria-label", service.name);
    // "monogram" swaps the glyph for the 2-letter chip; the other styles keep it.
    button.append(style === "monogram" ? monogramEl(service) : markEl(service));
    if (!iconOnly) button.append(document.createTextNode(service.name));
    return button;
  }

  function moreButton(iconOnly) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = iconOnly ? "btn btn--icon btn--more" : "btn btn--more";
    more.dataset.toggle = "1";
    more.setAttribute("aria-expanded", String(state.open));
    more.setAttribute("aria-haspopup", "dialog");
    more.setAttribute("aria-label", "Every view of this repo");
    more.title = "Every view of this repo";

    if (iconOnly) {
      const glyph = document.createElement("span");
      glyph.className = "glyph glyph--muted";
      glyph.innerHTML = state.payload?.moreSvg || "";
      more.append(glyph);
    } else {
      more.append(document.createTextNode(payloadLength() ? "More" : "SuperRepo"));
    }
    return more;
  }

  function payloadLength() {
    return state.payload?.primary?.length ?? 0;
  }

  function markEl(service) {
    const mark = document.createElement("span");
    mark.className = "glyph";
    mark.style.setProperty("--c", service.color || "#59636e");
    mark.setAttribute("aria-hidden", "true");
    // Static markup generated by src/icons.js — never user input.
    mark.innerHTML = service.svg || "";
    return mark;
  }

  /**
   * The 2-letter chip that stands in for the glyph under the "monogram" style.
   *
   * Hidden from assistive tech for the same reason the glyph is: the button's
   * aria-label already spells the name out, and reading "GI" as well would just
   * make screen readers say it twice.
   */
  function monogramEl(service) {
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.style.setProperty("--c", service.color || "#59636e");
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = monogram(service);
    return mark;
  }

  /** The payload's abbr, or the first two letters of the name as a fallback. */
  function monogram(service) {
    const abbr = String(service.abbr || "").trim();
    if (abbr) return abbr.slice(0, 3).toUpperCase();
    return String(service.name || "?").trim().slice(0, 2).toUpperCase();
  }

  function renderPanel() {
    const { payload } = state;
    const shadow = state.shadow;

    if (!state.panel) {
      state.panel = document.createElement("div");
      state.panel.className = "panel";
      state.panel.setAttribute("role", "dialog");
      state.panel.setAttribute("aria-label", "SuperRepo services");
      shadow.append(state.panel);

      state.toast = document.createElement("div");
      state.toast.className = "toast";
      state.toast.setAttribute("role", "status");
      state.toast.setAttribute("aria-live", "polite");
      shadow.append(state.toast);
    }

    const panel = state.panel;
    panel.hidden = !state.open;

    const head = document.createElement("div");
    head.className = "panel-head";

    const repo = document.createElement("div");
    repo.className = "repo";
    const strong = document.createElement("strong");
    strong.textContent = payload.repo;
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = payload.meta;
    repo.append(strong, meta);

    // On a file or directory view, the single most common thing anyone wants is
    // the link to exactly what they are looking at — before any service has
    // rewritten it. This is that, as a first-class action.
    if (payload.page?.isView) {
      const pageCopy = document.createElement("button");
      pageCopy.type = "button";
      pageCopy.className = "icon-btn page-copy";
      pageCopy.dataset.copyPage = "1";
      pageCopy.textContent = "⧉";
      const what = payload.page.type === "blob" ? "Copy link to this file" : "Copy link to this folder";
      pageCopy.title = what;
      pageCopy.setAttribute("aria-label", what);
      repo.append(pageCopy);
    }

    const filter = document.createElement("input");
    filter.className = "filter";
    filter.type = "search";
    filter.placeholder = "Filter services…";
    filter.value = state.query;
    filter.setAttribute("aria-label", "Filter services");
    filter.addEventListener("input", () => {
      state.query = filter.value.trim().toLowerCase();
      renderList();
    });

    head.append(repo, filter);
    // The filter filters the service list, so it has no meaning on the settings
    // view — hide it rather than leaving an input that does nothing.
    head.dataset.listHead = "1";

    const list = document.createElement("div");
    list.className = "list";
    list.dataset.list = "1";

    // Where the panel returns to: the services list, or the inline settings.
    const view = document.createElement("div");
    view.className = "view";
    view.dataset.view = "1";

    const foot = document.createElement("div");
    foot.className = "panel-foot";
    const status = document.createElement("span");
    status.className = "status";
    status.dataset.status = "1";
    const settings = document.createElement("button");
    settings.type = "button";
    settings.className = "linkish";
    settings.dataset.settings = "1";
    // Says which way the click goes. A control that reads "Settings" while the
    // settings are already open reads as a second entry point rather than the
    // way out, which is how this went unnoticed.
    settings.textContent = state.showingSettings ? "Done" : "Settings";
    settings.setAttribute("aria-expanded", String(state.showingSettings));
    settings.setAttribute("aria-controls", "settings-view");
    foot.append(status, settings);

    panel.replaceChildren(head, view, foot);
    renderView();

    // Only focus the filter when it exists — it is part of the list view, so
    // focusing it while settings are showing would leave a dead caret target.
    if (state.open && !state.showingSettings) filter.focus({ preventScroll: true });
  }

  /**
   * The inline settings view: one control per INLINE_FIELDS entry, plus a link
   * out to the full settings page for everything deliberately left out.
   *
   * Changes go through MSG.save rather than writing storage from here, so the
   * background stays the only writer and the existing onChanged broadcast
   * re-renders every panel — including this one, once it is back on the list.
   */
  function renderSettings(host) {
    const settings = state.payload?.settings ?? {};
    const wrap = document.createElement("div");
    wrap.className = "settings-view";
    wrap.dataset.settingsView = "1";

    // The way back, at the top of the view rather than in the panel footer. The
    // footer control does toggle, but it is labelled "Settings" in both states
    // and sits below a list that can scroll, so once you are in here there is
    // nothing on screen that reads as a way out.
    const back = document.createElement("button");
    back.type = "button";
    back.className = "linkish set-back";
    back.dataset.settingsBack = "1";
    back.textContent = "← Back to services";
    wrap.append(back);

    for (const field of INLINE_FIELDS) {
      const row = document.createElement("label");
      row.className = "set-row";

      const name = document.createElement("span");
      name.className = "set-label";
      name.textContent = field.label;
      row.append(name);

      if (field.boolean) {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "set-check";
        input.checked = Boolean(settings[field.key]);
        input.addEventListener("change", () => saveInline({ [field.key]: input.checked }));
        row.append(input);
      } else {
        const select = document.createElement("select");
        select.className = "set-select";
        for (const [value, text] of field.options) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = text;
          if (settings[field.key] === value) option.selected = true;
          select.append(option);
        }
        select.addEventListener("change", () => saveInline({ [field.key]: select.value }));
        row.append(select);
      }

      wrap.append(row);
    }

    // Choosing which service fills a group's header button is not here — it sits on
    // each group header in the list view, where the question is actually asked.

    // Inline management: categories are toggled straight from here, so the
    // options page is no longer the only place to shape the header.
    const manage = document.createElement("div");
    manage.className = "set-manage";
    wrap.append(manage);

    const all = document.createElement("button");
    all.type = "button";
    all.className = "linkish set-more";
    all.dataset.settingsPage = "1";
    all.textContent = "Hosts, your own services, resets and everything else";
    wrap.append(all);

    // Attach immediately so the INLINE_FIELDS controls are visible while the
    // heavier management (categories + services) loads below them.
    host.append(wrap);

    (async () => {
      const settings = (await ask(MSG.readSettings)) || {};
      const categories = state.payload?.categories || [];

      const catTitle = document.createElement("div");
      catTitle.className = "set-section-title";
      catTitle.textContent = "Categories";
      manage.append(catTitle);

      for (const category of categories) {
        const row = document.createElement("label");
        row.className = "set-row";

        const name = document.createElement("span");
        name.className = "set-label";
        name.textContent = category.label;
        row.append(name);

        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "set-check";
        input.checked = Array.isArray(settings.categoryIds) && settings.categoryIds.includes(category.id);
        input.addEventListener("change", async () => {
          const latest = (await ask(MSG.readSettings)) || {};
          const set = new Set(Array.isArray(latest.categoryIds) ? latest.categoryIds : []);
          if (input.checked) set.add(category.id); else set.delete(category.id);
          const result = await saveInline({ categoryIds: [...set] });
          if (!result?.ok) toast("Could not save");
        });
        row.append(input);
        manage.append(row);
      }

      const svcTitle = document.createElement("div");
      svcTitle.className = "set-section-title";
      svcTitle.textContent = "Services";
      manage.append(svcTitle);

      const svcRes = (await ask(MSG.services)) || {};
      const services = Array.isArray(svcRes.services) ? svcRes.services : [];
      const list = document.createElement("div");
      list.className = "set-service-list";

      for (const service of services) {
        const row = document.createElement("div");
        row.className = "set-service-row";

        const name = document.createElement("span");
        name.className = "set-label";
        name.textContent = service.name;
        row.append(name);

        const actions = document.createElement("span");
        actions.className = "set-service-actions";

        // Move up/down reorder
        for (const [delta, mark] of [[-1, "↑"], [1, "↓"]]) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "icon-btn";
          btn.textContent = mark;
          btn.title = delta < 0 ? "Move up" : "Move down";
          btn.addEventListener("click", async () => {
            await ask(MSG.move, { serviceId: service.id, delta });
            await ask(MSG.save, { patch: {} }).catch(() => {});
          });
          actions.append(btn);
        }

        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.className = "set-check";
        toggle.title = service.enabled ? "Hide this service" : "Show this service";
        toggle.checked = !!service.enabled;
        toggle.addEventListener("change", async () => {
          const latest = (await ask(MSG.services)) || {};
          const disabled = new Set(Array.isArray(latest.settings?.disabled) ? latest.settings.disabled : []);
          if (toggle.checked) disabled.delete(service.id); else disabled.add(service.id);
          const result = await saveInline({ disabled: [...disabled] });
          if (!result?.ok) toast("Could not save");
        });
        actions.append(toggle);

        row.append(actions);
        list.append(row);
      }

      manage.append(list);

      // wrap is already attached above; no further append needed.
    })().catch(() => {});

  }

  /** Send one inline change and let the broadcast bring the panel back round. */
  async function saveInline(patch) {
    const result = await ask(MSG.save, { patch });
    if (!result?.ok) {
      toast(result?.error === "nothing to save" ? "That setting was not recognised" : "Could not save");
      return;
    }
    // A placement of "off" removes the cluster entirely, so there is nothing left
    // to show the result in. Say so before the UI disappears.
    if (patch.placement === "off") {
      toast("Buttons hidden — bring them back from the extension's settings page");
    }
  }

  /** Show whichever of the two views the panel is currently on. */
  function renderView() {
    const view = state.shadow?.querySelector("[data-view]");
    if (!view) return;
    view.replaceChildren();

    if (state.showingSettings) {
      renderSettings(view);
    } else {
      const list = document.createElement("div");
      list.className = "list";
      list.dataset.list = "1";
      view.append(list);
      renderList();
    }

    // The footer is built once and reused, so the toggle's own label is updated
    // here rather than only when the panel is first created.
    const toggle = state.shadow?.querySelector("[data-settings]");
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(state.showingSettings));
      toggle.textContent = state.showingSettings ? "Done" : "Settings";
    }
    // The filter belongs to the list; hidden on the settings view.
    state.shadow
      ?.querySelector("[data-list-head]")
      ?.toggleAttribute("hidden", state.showingSettings);
  }

  function renderList() {
    const list = state.shadow?.querySelector("[data-list]");
    if (!list) return;

    const { payload } = state;
    const query = state.query;
    list.replaceChildren();

    const groups = payload.groups
      .map((group) => ({
        label: group.label,
        svg: group.svg,
        items: query ? group.items.filter((s) => matches(s, query)) : group.items,
      }))
      .filter((group) => group.items.length);

    if (!groups.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = query ? `Nothing matches “${state.query}”` : "No services for this page.";
      list.append(empty);
      setStatus("");
      return;
    }

    for (const group of groups) {
      const title = document.createElement("h3");
      title.className = "group-title";
      // Reuses markEl so the heading icon goes through the same tinted-glyph
      // path as a row, rather than adding a second innerHTML on the page.
      title.append(markEl({ svg: group.svg, color: "" }), document.createTextNode(group.label));
      list.append(title);
      for (const service of group.items) list.append(rowEl(service));
    }

    const total = groups.reduce((sum, group) => sum + group.items.length, 0);
    setStatus(`${total} service${total === 1 ? "" : "s"}`);
  }

  /**
   * A pin on the service that currently fills this category's header button.
   *
   * This is the whole default-picker: one pin, on one row, per category. An
   * unpinned row in the same category shows a faint pin too, because a control
   * you can only reach by already knowing the answer is not a control. Clicking
   * the filled pin hands the choice back to automatic.
   *
   * @returns {HTMLElement|null} null for services in no pinned category, and for
   *   every service when the header picks services by name rather than category
   *   — there is no category default to set in that mode.
   */
  function defaultPin(service) {
    if (state.payload?.settings?.pinMode !== "categories") return null;

    const category = state.payload?.categories?.find((c) => c.id === service.category);
    if (!category?.options?.length) return null;

    const isCurrent = category.current === service.id;
    // A filled pin is a decision; an outline is a candidate. If the user pinned
    // this one, say so in the tooltip — otherwise the two look alike.
    const pinned = state.payload?.categoryDefaults?.[category.id] === service.id;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-btn pin-btn";
    button.dataset.pin = service.id;
    button.dataset.category = category.id;
    button.dataset.pinned = String(isCurrent);
    button.innerHTML = PIN_SVG; // static markup, no user input
    button.title = isCurrent
      ? pinned
        ? `${service.name} is your pinned default — click to go back to automatic`
        : `${service.name} is the default now (whichever you click most) — click to pin it`
      : `Use ${service.name} as the ${category.label.toLowerCase()} default`;
    button.setAttribute("aria-label", button.title);
    button.setAttribute("aria-pressed", String(isCurrent));

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      // Pressing the pinned one clears the pin, which sends the category back to
      // automatic rather than leaving it stuck on one service.
      saveInline({ categoryDefaults: { [category.id]: isCurrent && pinned ? "" : service.id } });
    });
    return button;
  }

  function matches(service, query) {
    return (
      service.name.toLowerCase().includes(query) ||
      (service.blurb || "").toLowerCase().includes(query)
    );
  }

  function rowEl(service) {
    const row = document.createElement("div");
    row.className = "row";
    row.dataset.id = service.id;
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    row.title = service.target?.kind === "command" ? service.target.command : service.target?.url || "";

    const text = document.createElement("span");
    text.className = "row-text";

    const name = document.createElement("span");
    name.className = "row-name";
    name.append(document.createTextNode(service.name));

    const blurb = document.createElement("span");
    blurb.className = "row-blurb";
    blurb.textContent = service.blurb || "";

    // Labels intentionally omitted from the row text: keeping one short line
    // per service (name, then blurb) is what makes the panel scannable. The
    // opt-in / pricing / sign-up state stays in the options page and on the
    // row tooltip instead.
    text.append(name, blurb);

    // Quiet state badges: only the non-obvious cases, so the row stays scannable.
    if (service.pricing && service.pricing !== "free") {
      const badge = document.createElement("span");
      badge.className = "row-badge";
      badge.textContent = service.pricing;
      text.append(badge);
    }
    if (service.defaultOff) {
      const badge = document.createElement("span");
      badge.className = "row-badge row-badge--muted";
      badge.textContent = "opt-in";
      text.append(badge);
    }

    // Only worth saying when it isn't the obvious case: on a repo root every
    // service gets the repo, and a label there is noise.
    if (service.granularityLabel && service.granularity !== "repo" &&
        service.granularity !== "command" && state.payload?.page?.isView) {
      const scope = document.createElement("span");
      scope.className = "row-scope";
      scope.textContent = service.granularityLabel;
      text.append(scope);
    }

    const actions = document.createElement("span");
    actions.className = "row-actions";

    const pin = defaultPin(service);
    if (pin) actions.append(pin);

    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "icon-btn";
    copy.dataset.copy = service.id;
    copy.textContent = "⧉";
    copy.title = service.target?.kind === "command" ? "Copy command" : "Copy URL";
    copy.setAttribute("aria-label", copy.title);
    actions.append(copy);

    row.append(markEl(service), text, actions);
    row.addEventListener("mouseenter", () => {
      setStatus(service.target?.kind === "command" ? service.target.command : service.target?.url || "", true);
    });
    row.addEventListener("focus", () => {
      setStatus(service.target?.kind === "command" ? service.target.command : service.target?.url || "", true);
    });
    return row;
  }

  function setStatus(text, asCode = false) {
    const status = state.shadow?.querySelector("[data-status]");
    if (!status) return;
    status.replaceChildren();
    if (asCode) {
      const code = document.createElement("code");
      code.textContent = text;
      status.append(code);
    } else {
      status.textContent = text;
    }
  }

  function toast(message) {
    if (!state.toast) return;
    state.toast.textContent = message;
    state.toast.dataset.show = "true";
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      state.toast.dataset.show = "false";
    }, 1300);
  }

  // ------------------------------------------------------------------ behaviour

  function togglePanel(next) {
    state.open = next ?? !state.open;

    if (state.open && !state.payload) {
      bootstrap().then(() => togglePanel(true));
      return;
    }
    if (!state.shadow) return;

    // Only the panel changes here — rebuilding the cluster would drop focus.
    if (!state.panel) renderPanel();
    state.panel.hidden = !state.open;
    state.cluster?.querySelector("[data-toggle]")?.setAttribute("aria-expanded", String(state.open));

    if (state.open) {
      // The filter only exists on the list view; focusing it while settings are
      // showing would drop the caret nowhere and lose the keyboard entry point.
      if (state.showingSettings) {
        state.panel.querySelector(".set-select")?.focus({ preventScroll: true });
      } else {
        renderList();
        state.panel.querySelector(".filter")?.focus({ preventScroll: true });
      }
    }
  }

  async function openService(id, event) {
    const service = findPayloadService(id);
    if (!service) return;

    if (service.target?.kind === "command") {
      copy(service.target.command, "Command copied");
      return;
    }

    const response = await ask(MSG.open, { id, url: location.href, background: Boolean(event?.metaKey || event?.ctrlKey) });
    if (!response?.ok) return;

    if (response.kind === "copy") copy(response.url ?? service.target?.url, "URL copied");
    else if (response.kind === "command") copy(response.command, "Command copied");
    else togglePanel(false);
  }

  function findPayloadService(id) {
    for (const group of state.payload?.groups ?? []) {
      const found = group.items.find((s) => s.id === id);
      if (found) return found;
    }
    return state.payload?.primary?.find((s) => s.id === id) ?? null;
  }

  async function copy(text, message) {
    if (!text) return;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.append(area);
        area.select();
        ok = document.execCommand("copy");
        area.remove();
      } catch {
        ok = false;
      }
    }
    toast(ok ? message : "Copy failed");
  }

  async function ask(type, extra = {}) {
    try {
      return await api.runtime.sendMessage({ type, ...extra });
    } catch {
      return null;
    }
  }

  function onShadowClick(event) {
    const path = event.composedPath();
    const target = path.find((node) => node instanceof Element);
    if (!target) return;

    const copyTarget = target.closest("[data-copy]");
    if (copyTarget) {
      const service = findPayloadService(copyTarget.dataset.copy);
      if (service) copy(service.target?.kind === "command" ? service.target.command : service.target?.url, "Copied");
      return;
    }

    if (target.closest("[data-copy-page]")) {
      const url = state.payload?.page?.url;
      if (url) copy(url, state.payload.page.type === "blob" ? "Link to this file copied" : "Link to this folder copied");
      return;
    }

    const openTarget = target.closest("[data-open]");
    if (openTarget) {
      openService(openTarget.dataset.open, event);
      return;
    }

    if (target.closest("[data-toggle]")) {
      togglePanel();
      return;
    }

    if (target.closest("[data-settings]")) {
      state.showingSettings = !state.showingSettings;
      renderView();
      return;
    }

    // "Back to services" — the same toggle, reached from inside the view.
    if (target.closest("[data-settings-back]")) {
      state.showingSettings = false;
      renderView();
      return;
    }

    // "All settings" — the one control here that does leave the page.
    if (target.closest("[data-settings-page]")) {
      api.runtime.openOptionsPage();
      return;
    }

    const row = target.closest(".row");
    if (row) openService(row.dataset.id, event);
  }

  function onShadowKeydown(event) {
    // Keep GitHub's own keyboard shortcuts out of the panel.
    event.stopPropagation();

    if (event.key === "Escape") {
      togglePanel(false);
      state.cluster?.querySelector("[data-toggle]")?.focus();
      return;
    }

    const row = event.target.closest?.(".row");
    if (row && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openService(row.dataset.id, event);
      return;
    }

    if (row && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const rows = [...state.shadow.querySelectorAll(".row")];
      rows[rows.indexOf(row) + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
    }
  }

  function onDocumentPointerDown(event) {
    if (!state.open) return;
    if (event.composedPath().includes(state.hostEl)) return;
    togglePanel(false);
  }

  api.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message?.type === MSG.toggle) {
      togglePanel();
      respond?.({ ok: true });
    } else if (message?.type === MSG.changed) {
      bootstrap().then(() => respond?.({ ok: true }));
    }
    return true;
  });

  // ------------------------------------------------------------------ lifecycle

  async function bootstrap() {
    const payload = await ask(MSG.catalog, { url: location.href });
    if (!payload?.ok) {
      unmount();
      return;
    }

    const wasOpen = state.open;
    state.payload = payload;
    state.query = "";
    state.open = wasOpen;

    // Placement is structural: the node has to move, not just re-render. Without
    // this, changing the setting would not take effect until a page reload.
    const placement = payload.settings?.placement ?? "auto";
    const wanted = placement === "inline" || placement === "floating" ? placement : null;
    if (state.hostEl && (placement === "off" || (wanted && state.mode !== wanted))) {
      unmount();
    }

    render();
  }

  function watchNavigation() {
    const check = () => {
      const changed = location.href !== state.lastUrl;
      if (changed) {
        state.lastUrl = location.href;
        state.open = false;
        unmount();
      }
      // GitHub's Turbo replaces the header subtree, taking our node with it.
      if (!state.hostEl?.isConnected) {
        state.panel = null;
        state.toast = null;
        state.hostEl = null;
        state.shadow = null;
        state.cluster = null;
        bootstrap();
      }
    };

    document.addEventListener("turbo:load", () => setTimeout(check, 50));
    document.addEventListener("pjax:end", () => setTimeout(check, 50));
    setInterval(check, 400);
  }

  if (!globalThis.__superRepoDocumentBound) {
    globalThis.__superRepoDocumentBound = true;
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
  }

  bootstrap();
  watchNavigation();
})();
