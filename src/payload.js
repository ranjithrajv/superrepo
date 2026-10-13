/**
 * Build the payload the in-page UI renders.
 *
 * Lives in the background because the content script cannot import modules.
 * Everything the panel needs is resolved here: which services apply to this
 * page, what each one points at, and the section they belong to.
 */

import { CATEGORIES, allServices, buildTarget } from "./catalog.js";
import { glyphMarkup, hasGlyph } from "./icons.js";
import { describePage } from "./parse.js";
import { sortByOrder } from "./settings.js";

/** How many services the "Frequently used" section shows. */
const FREQUENT_LIMIT = 4;

/**
 * What a row actually receives, so the path-awareness is visible rather than
 * silent.
 *
 * On a file view GitIngest gets the containing folder, Git History gets the file
 * and DeepWiki gets the repo — and until now the only way to discover that was
 * to hover the row and read the footer. This labels it up front.
 *
 * Derived by comparing the built target against the page, not from a declared
 * field, so it cannot drift from what the rewrite rule actually produces.
 *
 * @returns {"file"|"folder"|"repo"|"command"}
 */
export function granularityFor(target, ctx) {
  if (target?.kind === "command") return "command";
  const url = target?.url;
  if (!url) return "repo";
  if (!ctx?.path) return "repo";

  let decoded = url;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    /* a malformed escape just means we compare it as-is */
  }
  if (decoded.includes(ctx.path)) return ctx.type === "tree" ? "folder" : "file";

  const slash = ctx.path.lastIndexOf("/");
  const dir = slash === -1 ? "" : ctx.path.slice(0, slash);
  if (dir && decoded.includes(dir)) return "folder";
  return "repo";
}

/** Short, human phrasing for the label shown on a row. */
const GRANULARITY_LABEL = {
  file: "this file",
  folder: "this folder",
  repo: "the whole repo",
  command: "a command you run",
};

/**
 * A section of the panel: its heading, its rows, and the glyph that goes with
 * the heading. The markup travels rather than the name because content scripts
 * cannot import a module, same as the per-service icons.
 */
function group(label, items, icon, category = null) {
  return {
    label,
    icon,
    category,
    svg: glyphMarkup(hasGlyph(icon) ? icon : "dots"),
    items,
  };
}

/**
 * @param {object} settings
 * @param {object} usage   id → click count
 * @param {object} ctx     parsed repo context
 */
export function buildPayload(settings, usage, ctx) {
  const disabled = new Set(settings.disabled || []);

  const available = sortByOrder(allServices(settings.custom), settings.order)
    .filter((service) => !disabled.has(service.id))
    .filter((service) => settings.showCommands || service.kind !== "command")
    .map((service) => ({ service, target: buildTarget(service, ctx) }))
    .filter((entry) => entry.target)
    .map(({ service, target }) => {
      const granularity = granularityFor(target, ctx);
      return {
        id: service.id,
        name: service.name,
        abbr: service.abbr,
        color: service.color,
        category: service.category,
        // Shown as quiet labels in the panel, never as icons, to keep a long
        // list scannable without claiming too much of it.
        defaultOff: !!service.defaultOff,
        pricing: service.pricing || "free",
        signupRequired: !!service.signupRequired,
        blurb: service.blurb,
        // The content script has no imports, so the glyph travels with the payload.
        svg: glyphMarkup(hasGlyph(service.icon) ? service.icon : "link"),
        granularity,
        granularityLabel: GRANULARITY_LABEL[granularity],
        target,
      };
    });

  const frequent = Object.entries(usage || {})
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => available.find((service) => service.id === id))
    .filter(Boolean)
    .slice(0, FREQUENT_LIMIT);

  const groups = [];
  if (frequent.length) groups.push(group("Frequently used", frequent, "star"));

  const rest = available.filter((service) => !frequent.includes(service));
  for (const category of CATEGORIES) {
    const items = rest.filter((service) => service.category === category.id);
    if (items.length) groups.push(group(category.label, items, category.icon, category.id));
  }
  // Services without a category of their own are not near-duplicates of
  // anything, so they never get a header button or a category picker — they are
  // just listed. Grouping them keeps each label honest instead of pretending
  // that, say, two unrelated tools form a group.
  const labels = { extra: "More views", custom: "Your own" };
  const unknown = rest.filter((service) => !CATEGORIES.some((category) => category.id === service.category));
  for (const [category, label] of Object.entries(labels)) {
    const items = unknown.filter((service) => service.category === category);
    if (items.length) groups.push(group(label, items, category === "custom" ? "box" : "dots"));
  }
  const unlabelled = unknown.filter((service) => !labels[service.category]);
  if (unlabelled.length) groups.push(group("More views", unlabelled, "dots"));

  return {
    ok: true,
    repo: `${ctx.owner}/${ctx.repo}`,
    meta: `${ctx.host} · ${describePage(ctx)}`,
    // The page as the user is looking at it — distinct from any service's
    // rewritten target. This is what "copy a link to this file" copies.
    page: {
      url: ctx.webUrl,
      type: ctx.type,
      path: ctx.path || "",
      isView: ctx.type === "blob" || ctx.type === "tree",
    },
    moreSvg: glyphMarkup("dots"),
    primary: primaryServices(settings, available, usage),
    groups,
    settings: {
      // Every field the panel draws a control for must appear here, or that
      // control renders unbound — a checkbox with no value is silently wrong.
      openTarget: settings.openTarget,
      placement: settings.placement,
      buttonStyle: settings.buttonStyle,
      showCommands: settings.showCommands,
      pinMode: settings.pinMode,
      // The panel's category pins and per-service switches read these to paint
      // their checkboxes. Without them every box renders unchecked and then
      // bounces back, because a control with no value cannot show the truth.
      categoryIds: [...(settings.categoryIds ?? [])],
      disabled: [...(settings.disabled ?? [])],
    },
    // The panel's default picker needs to know what each category could offer
    // and which service fills it today. Every category is listed that has at
    // least one service available, whether or not it is pinned — someone may be
    // preparing a choice before pinning it. A category with nothing enabled in it
    // is left out, since a row that cannot be filled is worse than no row.
    categories: CATEGORIES.filter(
      (category) => available.some((service) => service.category === category.id),
    ).map((category) => {
      const options = available.filter((service) => service.category === category.id);
      return {
        id: category.id,
        label: category.label,
        current: resolveCategoryDefault(category.id, options, settings.categoryDefaults, usage)?.id ?? "",
        options: options.map((service) => ({ id: service.id, name: service.name })),
      };
    }),
    categoryDefaults: { ...(settings.categoryDefaults ?? {}) },
  };
}

/**
 * The buttons shown inline on the page.
 *
 * Two ways to choose them. `services` names each one outright. `categories`
 * names groups, and each group fills with a single service — the most-used one
 * available in it, falling back to catalog order so the answer is stable for
 * someone who has never clicked anything.
 *
 * Either way the fallback is the same: if nothing resolves, take the first few
 * available so the cluster is never just a "More" button.
 */
function primaryServices(settings, available, usage) {
  const chosen =
    settings.pinMode === "categories"
      ? resolveCategories(settings, available, usage)
      : resolveServices(settings.primaryIds, available);

  return chosen.length ? chosen : available.slice(0, 4);
}

/** Pinned by name, in the order the user pinned them. */
function resolveServices(ids, available) {
  if (!Array.isArray(ids)) return [];
  return ids
    .map((id) => available.find((service) => service.id === id))
    .filter(Boolean)
    .slice(0, 8);
}

/**
 * One button per chosen category.
 *
 * The representative is the most-clicked service in that category — the counters
 * are already kept per service and never leave the device — so the header shows
 * the tool you actually reach for rather than whichever one sorts first. A tie,
 * or no history at all, falls back to catalog order.
 */
function resolveCategories(settings, available, usage) {
  const categoryIds = Array.isArray(settings?.categoryIds) ? settings.categoryIds : [];

  const out = [];
  const seen = new Set();

  for (const categoryId of categoryIds) {
    if (out.length >= 8) break;
    // The promise is one button per category. A repeated category — reachable
    // through a hand-edited settings file — fills one slot, not two; otherwise
    // the cluster could end up holding two rows that do the same job, which is
    // the redundancy this whole mode exists to avoid.
    if (seen.has(categoryId)) continue;
    seen.add(categoryId);

    const inCategory = available.filter((service) => service.category === categoryId);
    if (!inCategory.length) continue;

    // A per-category pick wins over both usage and catalog order: it is the
    // user saying "this one specifically, regardless of what I click."
    out.push(resolveCategoryDefault(categoryId, inCategory, settings.categoryDefaults, usage));
  }
  return out;
}

/**
 * The service that fills a category's button.
 *
 * One implementation, shared with the options page so its "Default" label
 * cannot disagree with the button that appears in the header. Order: an explicit
 * per-category pick, then the most-clicked service available, then catalog order
 * so the answer is stable for someone who has never clicked anything.
 *
 * @returns {object|null} null only when the category has no available service
 */
export function resolveCategoryDefault(categoryId, inCategory, categoryDefaults = {}, usage = {}) {
  if (!inCategory?.length) return null;

  const preferred = categoryDefaults?.[categoryId];
  if (preferred) {
    const picked = inCategory.find((service) => service.id === preferred);
    if (picked) return picked;
  }

  return inCategory.reduce((winner, candidate) => {
    const a = usage?.[candidate.id] || 0;
    const b = usage?.[winner.id] || 0;
    return a > b ? candidate : winner;
  }, inCategory[0]);
}
