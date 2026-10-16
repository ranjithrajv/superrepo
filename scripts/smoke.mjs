#!/usr/bin/env node
/**
 * Real-browser smoke test. Loads dist/chrome into headless Chromium and checks
 * the things unit tests cannot:
 *
 *   1. the service worker boots and the background module evaluates cleanly
 *   2. the options page renders the catalog
 *   3. the content script injects buttons into a REAL github.com repo page,
 *      the panel lists services, the copy button works, and the targets are right
 *      — including whether GitIngest is narrowed to the folder containing the
 *      file you are looking at
 *
 *   npm run build && npm run smoke
 *
 * Notes:
 *   · Chromium is preferred over branded Chrome, which ignores --load-extension
 *     (security change in Chrome 137+). Override with CHROME=/path/to/chrome.
 *   · The GitHub and options parts need to be reachable; if github.com cannot be
 *     loaded the injection checks are skipped and reported rather than failing.
 */

import { rmSync } from "node:fs";

import { parseRepoUrl } from "../src/parse.js";
import { buildPayload } from "../src/payload.js";
import { DEFAULT_SETTINGS } from "../src/settings.js";

import {
  assertRunnable,
  attachServiceWorker,
  extensionId,
  launch,
  openTab,
  waitFor,
} from "./lib/cdp.mjs";

const REPO = "https://github.com/octocat/hello-world";
const NESTED = "https://github.com/coderamp-labs/gitingest/blob/main/src/gitingest/utils";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

assertRunnable();

// ------------------------------------------------------------------------ main

const failures = [];
const notes = [];

// Defined here rather than lower down: the checks below run inside the module's
// top-level try block, which executes before a const further down would be
// initialised. Function declarations hoist, but the `check` alias does not.
function assert(condition, message) {
  if (condition) return;
  failures.push(message);
}

const check = assert;

let browser;
let launched;
let worker;
let port;
let githubReachable = true;

try {
  launched = await launch({ width: 1280, height: 900 });
  browser = launched.browser;
  port = launched.port;
  const id = launched.serviceWorker;
  if (!id) throw new Error("service worker never appeared");
  notes.push(`service worker running (extension id ${id})`);

  // For confirming what the extension persisted. The page world has no chrome.*
  // access, so a DOM-only check could pass on a change that never saved.
  worker = await attachServiceWorker(port, id);

  // ---- 2. options page ------------------------------------------------------
  const optionsUrl = `chrome-extension://${id}/src/options.html`;
  const options = await openTab(port, browser, optionsUrl);
  if (!options) throw new Error("options page target never appeared");

  // The options page keeps only what has no in-page equivalent: your own
  // services, other hosts, and reset. Everything about the header buttons moved
  // to the panel, so asserting a service list here would assert removed UI.
  //
  // Wait for the whole set before comparing. Waiting for "at least one card" let
  // a half-painted page satisfy the wait and then fail the comparison, which is a
  // red run that says nothing about the options page.
  const expectedCards = ["Buttons and services", "Other sites", "Add your own", "Reset"];
  const expected = expectedCards.join("|");
  const cardsIn = `[...document.querySelectorAll("section.card h2")].map((h) => h.textContent.trim())`;
  await waitFor(options, `(${cardsIn}.join("|") === ${JSON.stringify(expected)}) ? "ok" : ""`, 10000, {
    quiet: true,
  });
  const optionsUi = await options.eval(`${cardsIn}.join("|")`);
  if (optionsUi !== expected) {
    failures.push(`options page sections were ${JSON.stringify(optionsUi)}, expected ${JSON.stringify(expected)}`);
  } else {
    notes.push(`options page renders its remaining sections (${expectedCards.length})`);
  }
  if (!(await waitFor(options, `document.getElementById("reset") ? "ok" : ""`))) {
    failures.push("options page lost its reset button");
  }

  // PinMode is no longer switchable from the options page, so the category-pin
  // behaviour is seeded through storage instead and checked on a real page.
  await options
    .eval(
      `chrome.storage.local.set(${JSON.stringify({
        settings: { pinMode: "categories", categoryIds: ["prompt", "diagram"] },
      })})`,
    )
    .catch(() => failures.push("could not seed categoryIds into extension storage"));

  // And the seeded categories must actually reach the page, not just storage —
  // otherwise categoryIds is a setting that goes nowhere.
  const page = await openTab(port, browser, REPO);
  if (page) {
    const shown = await waitFor(
      page,
      `(() => {
        const shadow = document.querySelector("superepo-root")?.shadowRoot;
        if (!shadow) return "";
        return [...shadow.querySelectorAll(".btn")]
          .filter((b) => !b.dataset.toggle)
          .map((b) => b.getAttribute("aria-label"))
          .join("|");
      })()`,
    );
    const labels = (shown || "").split("|").filter(Boolean);
    const fromAi = labels.some((n) => /GitIngest|UIthub|DeepWiki|GitMCP|GitHub\.gg|GitSummarize|GitReverse/i.test(n));
    const fromDiagram = labels.some((n) => /GitDiagram|code2flow/i.test(n));
    if (labels.length !== 2 || !fromAi || !fromDiagram) {
      failures.push(
        `category pins did not reach the page (got ${JSON.stringify(labels)})`,
      );
    } else {
      notes.push(`category pins reach the page: ${labels.join(" + ")}`);
    }
    if (page.pageErrors.length) failures.push(`page errors: ${page.pageErrors.join("; ")}`);
    page.close();
  } else {
    failures.push("could not open a repo page to check the category pins");
  }

  // Put the default back, and prove it: settings live in the browser profile for
  // the rest of this run, so leaving them seeded would make every later
  // assertion about the shipped default meaningless. Removing without checking
  // is what let a seeded profile leak into the next assertion before.
  await options
    .eval(`chrome.storage.local.remove("settings")`)
    .catch(() => failures.push("could not clear the seeded settings"));
  const cleared = await waitFor(
    options,
    `(async () => (await chrome.storage.local.get("settings")).settings ? "still-there" : "gone")()`,
  );
  if (cleared !== "gone") failures.push(`seeded settings survived the reset (${cleared})`);
  else notes.push("seeded settings cleared before the default checks");

  const backgrounds = await options
    .eval(`chrome.runtime.getContexts({ contextTypes: ["BACKGROUND"] }).then((c) => c.length)`)
    .catch(() => -1);
  if (backgrounds < 1) failures.push(`no BACKGROUND context reported (got ${backgrounds})`);
  else notes.push("extension background context is live");
  if (options.pageErrors.length) failures.push(`options errors: ${options.pageErrors.join("; ")}`);
  options.close();

  // ---- 3. the in-page UI on a real repo page --------------------------------
  const probe = await openTab(port, browser, REPO);
  if (probe) {
    const httpStatus = await probe
      .eval(`fetch(location.href, { method: "HEAD" }).then((r) => r.status)`)
      .catch(() => 0);
    const mounted = await waitFor(
      probe,
      `Boolean(document.querySelector("superepo-root")?.shadowRoot)`,
      25000,
      { quiet: true },
    );

    if (!mounted) {
      githubReachable = false;
      notes.push(`github.com did not render a repo page (HEAD ${httpStatus}) — injection checks skipped`);
    } else {
      // GitHub's React re-renders the header, which detaches our node, so this
      // read-out is retried until it succeeds rather than taken in one shot.
      const summary = await waitFor(probe, `(() => {
        const host = document.querySelector("superepo-root");
        const shadow = host?.shadowRoot;
        if (!shadow) return null;
        const more = shadow.querySelector("[data-toggle]");
        if (!more) return null;
        const buttons = [...shadow.querySelectorAll(".cluster .btn")];
        more.click();
        const rows = [...shadow.querySelectorAll(".row")];
        const gitingest = rows.find((r) => r.dataset.id === "gitingest");
        gitingest?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        return {
          placement: host.getAttribute("data-placement"),
          clusterStyle: shadow.querySelector(".cluster")?.dataset.style,
          primaryText: buttons.filter((b) => b.dataset.open).map((b) => b.textContent.trim()),
          primaryGlyphs: buttons
            .filter((b) => b.dataset.open)
            .map((b) => b.querySelector("svg")?.children.length ?? 0),
          moreGlyph: Boolean(shadow.querySelector("[data-toggle] svg")),
          primaryLabels: buttons.filter((b) => b.dataset.open).map((b) => b.getAttribute("aria-label")),
          primaryTitles: buttons.filter((b) => b.dataset.open).map((b) => b.title),
          anchor: host.parentElement?.dataset?.testid || host.parentElement?.tagName || "",
          parentTestId: host.parentElement?.dataset?.testid || null,
          primary: buttons.filter((b) => b.dataset.open).map((b) => b.dataset.open),
          hasMore: Boolean(more),
          expanded: more.getAttribute("aria-expanded"),
          panelVisible: !shadow.querySelector(".panel").hidden,
          groups: [...shadow.querySelectorAll(".group-title")].map((t) => t.textContent),
          rows: rows.length,
          status: shadow.querySelector("[data-status]")?.textContent,
          repo: shadow.querySelector(".repo strong")?.textContent,
          meta: shadow.querySelector(".meta")?.textContent,
          copiedTitle: gitingest?.title,
        };
      })()`, 20000, { quiet: true });

      if (!summary) {
        failures.push("the in-page UI never settled into a readable state");
      } else {
        checkSummary(summary);
      }

      // ---- 4. survives GitHub replacing the header ------------------------
      // React/Turbo detaches our node when it re-renders the header. The content
      // script must rebuild cleanly, otherwise the panel ends up in a detached
      // shadow root and silently never appears.
      await probe.eval(`document.querySelector("superepo-root")?.remove()`);
      await sleep(1500);

      const afterRemount = await waitFor(
        probe,
        `(() => {
           const shadow = document.querySelector("superepo-root")?.shadowRoot;
           const toggle = shadow?.querySelector("[data-toggle]");
           if (!toggle) return null;
           toggle.click();
           const panel = shadow.querySelector(".panel");
           return panel && !panel.hidden ? shadow.querySelectorAll(".row").length : null;
         })()`,
        15000,
        { quiet: true },
      );

      if (afterRemount) notes.push(`re-mounts cleanly when the header is replaced (${afterRemount} rows)`);
      else failures.push("panel never came back after the header was replaced");

      // ---- 5. copying a URL, which is the manifest's clipboardWrite ---------
      // Copy is the first-class path for half of these tools, so whether it
      // works is a manifest question, not just a UI one. The toast says which
      // path ran: the async Clipboard API, or the execCommand fallback.
      const copied = await probe
        .eval(`(async () => {
          const shadow = document.querySelector("superepo-root")?.shadowRoot;
          const toggle = shadow?.querySelector("[data-toggle]");
          if (!toggle) return { error: "no toggle" };
          if (shadow.querySelector(".panel").hidden) toggle.click();
          await new Promise((r) => setTimeout(r, 400));
          const row = [...shadow.querySelectorAll(".row")].find((r) => r.dataset.id === "gitingest");
          const btn = row?.querySelector("[data-copy]");
          if (!btn) return { error: "no copy button" };
          btn.click();
          await new Promise((r) => setTimeout(r, 300));
          const toast = shadow.querySelector(".toast");
          return { text: toast?.textContent || "", shown: toast?.dataset.show === "true" };
        })()`)
        .catch((error) => ({ error: String(error) }));

      if (copied?.error) {
        notes.push(`clipboard check skipped (${copied.error})`);
      } else if (copied.text === "Copy failed") {
        failures.push(
          "the copy button reported failure — if this extension runs without the " +
            "clipboardWrite permission, the async Clipboard API and the execCommand " +
            "fallback both failed",
        );
      } else if (copied.shown) {
        notes.push(`copy button works in a real page (toast: "${copied.text}")`);
      } else {
        failures.push(`copy button showed no toast (got ${JSON.stringify(copied.text)})`);
      }

      // ---- 6. path awareness, from the injected panel ----------------------
      await browser.send("Page.navigate", { url: NESTED }).catch(() => {});
      await probe.send("Page.enable").catch(() => {});
      await probe.send("Page.navigate", { url: NESTED }).catch(() => {});
      await sleep(1500);

      const nested = await waitFor(
        probe,
        `(() => {
           const shadow = document.querySelector("superepo-root")?.shadowRoot;
           if (!shadow) return null;
           const button = shadow.querySelector("[data-toggle]");
           button?.click();
           const row = [...shadow.querySelectorAll(".row")].find((r) => r.dataset.id === "gitingest");
           return row?.title || null;
         })()`,
        25000,
        { quiet: true },
      );

      if (!nested) {
        notes.push("nested-path check skipped (github.com did not render that file page)");
      } else if (
        nested === "https://gitingest.com/coderamp-labs/gitingest/tree/main/src/gitingest" ||
        nested === "https://gitingest.com/coderamp-labs/gitingest/tree/main/src/gitingest/utils"
      ) {
        notes.push("a file view narrows GitIngest to its containing folder");
      } else {
        failures.push(`nested GitIngest target was ${JSON.stringify(nested)}`);
      }

      // ---- 7. changing a setting from inside the panel, without leaving ------
      // The panel's whole point is that these do not need the options page, so
      // assert the change survives a round trip through storage and comes back
      // on the re-render the broadcast triggers.
      const inline = await probe
        .eval(`(async () => {
          const shadow = document.querySelector("superepo-root")?.shadowRoot;
          const toggle = shadow?.querySelector("[data-toggle]");
          if (!toggle) return { error: "no toggle" };
          if (shadow.querySelector(".panel").hidden) toggle.click();
          await new Promise((r) => setTimeout(r, 300));

          // The settings view is a toggle. Step 8 below re-uses it, so land on a known
          // state rather than assuming: open it only if it is currently closed.
          if (shadow.querySelector("[data-list]")) shadow.querySelector("[data-settings]").click();
          await new Promise((r) => setTimeout(r, 250));

          const select = shadow.querySelector(".set-select");
          const rowsHidden = !shadow.querySelector("[data-list]");
          if (!select) return { error: "settings view did not render a control", rowsHidden };

          // The filter filters the service list, so on the settings view it is a
          // dead input. It must be hidden rather than left taking clicks.
          const filterVisible = Boolean(shadow.querySelector(".filter")?.offsetParent);

          // showCommands defaults to true; an unchecked box here would mean the
          // payload omitted it and the control rendered unbound.
          const commandsBox = shadow.querySelector(".set-check");
          const commandsShown = commandsBox ? commandsBox.checked : null;

          const before = select.value;
          select.value = before === "labeled" ? "icon" : "labeled";
          select.dispatchEvent(new Event("change", { bubbles: true }));
          await new Promise((r) => setTimeout(r, 900));

          const cluster = shadow.querySelector(".cluster");
          return {
            rowsHidden,
            filterVisible,
            commandsShown,
            controls: shadow.querySelectorAll(".set-row").length,
            labels: [...shadow.querySelectorAll(".set-label")].map((l) => l.textContent),
            hasMore: Boolean(shadow.querySelector("[data-settings-page]")),
            clusterStyle: cluster?.dataset.style,
          };
        })()`)
        .catch((error) => ({ error: String(error) }));

      if (inline?.error) {
        failures.push(`inline settings could not be exercised (${inline.error})`);
      } else {
        check(inline.rowsHidden, "the services list should be replaced by the settings view");
        check(!inline.filterVisible, "the filter belongs to the list and must be hidden here");
        check(
          inline.commandsShown === true,
          `the showCommands checkbox is ${inline.commandsShown}, expected true — the payload is missing it`,
        );
        // The four scalar controls are fixed; the category pickers below them vary with
        // the catalog, so assert by name rather than by count.
        for (const label of ["Buttons show", "Where they go", "Clicking a service"]) {
          check(inline.labels.includes(label), `the settings view is missing "${label}"`);
        }
        check(
          inline.labels.includes("Local command-line services"),
          "the settings view is missing the showCommands checkbox",
        );
        check(inline.hasMore, "there must be a way on to the full settings page");
        check(
          inline.clusterStyle === "labeled",
          `the header did not follow the change: cluster is ${inline.clusterStyle}, expected labeled`,
        );

        // And that it reached storage, not just the DOM: an unsaved change would
        // look identical above but vanish on the next page load.
        const saved = worker
          ? await worker
              .eval(`(async () => (await chrome.storage.local.get("settings")).settings?.buttonStyle)()`)
              .catch(() => null)
          : null;
        check(
          saved === "labeled",
          `the change did not persist: storage holds ${JSON.stringify(saved)}, expected "labeled"`,
        );

        // Put it back, so the screenshot run and any later check see the default.
        await probe
          .eval(`(async () => {
            const shadow = document.querySelector("superepo-root")?.shadowRoot;
            const select = [...shadow.querySelectorAll(".set-select")]
              .find((s) => [...s.options].some((o) => o.value === "icon"));
            if (!select) return false;
            select.value = "icon";
            select.dispatchEvent(new Event("change", { bubbles: true }));
            await new Promise((r) => setTimeout(r, 600));
            return true;
          })()`)
          .catch(() => {});

        notes.push("settings can be changed from the panel and the page follows");
      }

      // ---- 8. choosing which service fills a category's button --------------
      // This moved here from the settings page, so it is checked where people
      // now do it: the header must follow the pick, and it must persist.
      const defaults = await probe
        .eval(`(async () => {
          const shadow = document.querySelector("superepo-root")?.shadowRoot;
          const toggle = shadow?.querySelector("[data-toggle]");
          if (!toggle) return { error: "no toggle" };
          if (shadow.querySelector(".panel").hidden) toggle.click();
          await new Promise((r) => setTimeout(r, 300));
          // The pin lives on the service row, so work at row level rather than looking
          // for a select on the heading.
          if (!shadow.querySelector("[data-list]")) shadow.querySelector("[data-settings]").click();
          await new Promise((r) => setTimeout(r, 300));

          // Pick a category that is both pinned and has something to choose between.
          // Both halves matter: an unpinned category has no header button, so
          // changing its default would move nothing and look like a failure.
          // The pinned list is injected because this runs in the page, which has
          // no import of the settings module.
          const pinnedCategories = new Set(${JSON.stringify(DEFAULT_SETTINGS.categoryIds ?? [])});
          const counts = {};
          for (const b of shadow.querySelectorAll(".pin-btn")) {
            counts[b.dataset.category] = (counts[b.dataset.category] ?? 0) + 1;
          }
          const roomy = Object.keys(counts).find(
            (c) => counts[c] > 1 && pinnedCategories.has(c),
          );
          if (!roomy) return { error: "no pinned category has two services to choose between" };

          // Pin a different service in that category.
          const altBtn = shadow.querySelector(
            '.pin-btn[data-category="' + roomy + '"][data-pinned="false"]',
          );
          if (!altBtn) return { error: "no sibling service to pin instead" };
          const categoryId = roomy;

          const before = shadow.querySelector(".cluster [data-open]")?.dataset.open;
          altBtn.click();
          await new Promise((r) => setTimeout(r, 900));

          return {
            categoryId,
            picked: altBtn.dataset.pin,
            before,
            headerNowShows: [...shadow.querySelectorAll(".cluster [data-open]")].map((b) => b.dataset.open),
            pickerCount: shadow.querySelectorAll(".pin-btn").length,
            // Only one pin may be set in a category at a time.
            pinsSetInCategory: [
              ...shadow.querySelectorAll('.pin-btn[data-category="' + categoryId + '"]'),
            ].filter((b) => b.dataset.pinned === "true").length,
            pinnedNow: shadow
              .querySelector('.pin-btn[data-category="' + categoryId + '"][data-pinned="true"]')?.dataset.pin,
          };
        })()`)
        .catch((error) => ({ error: String(error) }));

      if (defaults?.error) {
        failures.push(`category default could not be exercised (${defaults.error})`);
      } else {
        check(defaults.pickerCount > 0, "no pins rendered on service rows");
        check(
          defaults.pinnedNow === defaults.picked,
          `the pin did not move to the newly chosen default: ${defaults.pinnedNow}`,
        );
        check(
          defaults.pinsSetInCategory === 1,
          `expected exactly one pinned service in ${defaults.categoryId}, found ${defaults.pinsSetInCategory}`,
        );
        check(
          defaults.headerNowShows.includes(defaults.picked),
          `the header does not show the chosen default ${defaults.picked}: ${defaults.headerNowShows.join(", ")}`,
        );

        const saved = worker
          ? await worker
              .eval(
                `(async () => (await chrome.storage.local.get("settings")).settings?.categoryDefaults)()`,
              )
              .catch(() => null)
          : null;
        check(
          saved?.[defaults.categoryId] === defaults.picked,
          `the default did not persist: ${JSON.stringify(saved)}`,
        );
        notes.push("a category's default can be chosen from the panel and the header follows");

        // Press the pinned one again to hand the category back to automatic, so later
        // steps see the shipped state rather than a leftover pin.
        await probe
          .eval(`(async () => {
            const shadow = document.querySelector("superepo-root")?.shadowRoot;
            const set = shadow?.querySelector('.pin-btn[data-category="' + defaults.categoryId + '"][data-pinned="true"]');
            if (!set) return false;
            set.click();
            await new Promise((r) => setTimeout(r, 700));
            return true;
          })()`)
          .catch(() => {});
      }

      // ---- 9. getting back out of the settings view -----------------------
      // The footer control does toggle, but it read "Settings" in both states
      // and sat below the list, so once you were in there nothing on screen
      // looked like a way out. Check the way out that is actually on screen.
      const backOut = await probe
        .eval(`(async () => {
          const shadow = document.querySelector("superepo-root")?.shadowRoot;
          if (!shadow) return { error: "no panel" };
          if (shadow.querySelector(".panel").hidden) shadow.querySelector("[data-toggle]").click();
          await new Promise((r) => setTimeout(r, 300));

          // Start from the list regardless of where the last step left it.
          if (!shadow.querySelector("[data-list]")) {
            shadow.querySelector("[data-settings]")?.click();
            await new Promise((r) => setTimeout(r, 300));
          }

          const enteredFromList = Boolean(shadow.querySelector("[data-list]"));
          shadow.querySelector("[data-settings]")?.click();
          await new Promise((r) => setTimeout(r, 300));

          const inSettings = Boolean(shadow.querySelector("[data-settings-view]"));
          const back = shadow.querySelector("[data-settings-back]");
          const backText = back?.textContent?.trim() ?? null;
          // First control in the view: if it is below a long list it is not
          // reachable without scrolling, which is the failure being guarded.
          const backIsFirst = shadow.querySelector(".settings-view")?.firstElementChild === back;
          const footLabelWhileOpen = shadow.querySelector("[data-settings]")?.textContent?.trim() ?? null;

          back?.click();
          await new Promise((r) => setTimeout(r, 300));

          return {
            enteredFromList,
            inSettings,
            hasBack: Boolean(back),
            backText,
            backIsFirst,
            footLabelWhileOpen,
            backOnList: Boolean(shadow.querySelector("[data-list]")),
            stillInSettings: Boolean(shadow.querySelector("[data-settings-view]")),
            footLabelAfter: shadow.querySelector("[data-settings]")?.textContent?.trim() ?? null,
          };
        })()`)
        .catch((error) => ({ error: String(error) }));

      if (backOut?.error) {
        failures.push(`settings view back navigation could not be exercised (${backOut.error})`);
      } else {
        check(backOut.inSettings, "the settings toggle did not open the settings view");
        check(backOut.hasBack, "the settings view offers no way back to the services list");
        check(
          /back to services/i.test(backOut.backText ?? ""),
          `the back control does not say where it goes: ${JSON.stringify(backOut.backText)}`,
        );
        check(backOut.backIsFirst, "the back control is not the first thing in the settings view");
        check(
          backOut.backOnList && !backOut.stillInSettings,
          "clicking back did not return to the services list",
        );
        check(
          backOut.footLabelAfter === "Settings" && backOut.footLabelWhileOpen === "Done",
          `the footer toggle does not change label: ${backOut.footLabelWhileOpen} -> ${backOut.footLabelAfter}`,
        );

        if (
          backOut.enteredFromList &&
          backOut.hasBack &&
          backOut.backOnList &&
          !backOut.stillInSettings
        ) {
          notes.push("the settings view has a way back to the services list");
        }
      }
    }

    if (probe.pageErrors.length) failures.push(`page errors: ${probe.pageErrors.join("; ")}`);
    probe.close();
  }
} catch (error) {
  failures.push(`smoke run failed: ${error.message}`);
} finally {
  if (browser) browser.close();
  launched?.chrome?.kill("SIGKILL");
  await sleep(300);
  rmSync(launched?.profilePath ?? "", { recursive: true, force: true });
}

// ---------------------------------------------------------------------- report

// Any uncaught error or [superepo] log is a bug. This is what caught dynamic
// import() being forbidden in a service worker.
const noisy = (launched?.stderr() ?? "")
  .split("\n")
  .filter((line) => /Uncaught|\[superepo\]/.test(line))
  .map((line) => line.trim());

for (const note of notes) console.log(`· ${note}`);

if (noisy.length) failures.push(`browser logged errors:\n    ${noisy.slice(0, 5).join("\n    ")}`);

if (failures.length) {
  console.error(`\n✗ ${failures.length} failure${failures.length === 1 ? "" : "s"}:`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(
  githubReachable
    ? "\n✓ extension loads, background runs clean, buttons inject into a real GitHub page"
    : "\n✓ extension loads, background runs clean (GitHub was unreachable, so injection was not checked)",
);

/**
 * What the shipped default should render in the header, and in the panel.
 *
 * Both were hard-coded lists and counts, which meant every catalog edit broke
 * the smoke test for a reason that had nothing to do with the smoke test. They
 * are derived from the same modules the extension uses, so they track the
 * catalog instead of chasing it.
 */
function expectedPrimaryIds() {
  const settings = { ...DEFAULT_SETTINGS, disabled: [...DEFAULT_SETTINGS.disabled] };
  const payload = buildPayload(settings, {}, parseRepoUrl(REPO));
  return payload.primary.map((s) => s.id);
}

function expectedPanelRows() {
  const settings = { ...DEFAULT_SETTINGS, disabled: [...DEFAULT_SETTINGS.disabled] };
  const payload = buildPayload(settings, {}, parseRepoUrl(REPO));
  return payload.groups.flatMap((g) => g.items).length;
}

/** Assertions about the injected UI, read from the page in one pass. */
function checkSummary(summary) {

  // The shipped default pins one category per group, so the header opens with one
  // tool per group. Both the count and the list are derived from the catalog
  // rather than written down: a service leaving the catalog should not require
  // editing a smoke test to find out, and a stale list would read as a real
  // regression when it is only a catalog edit.
  const expectedPrimary = expectedPrimaryIds();
  check(
    summary.primary.length === expectedPrimary.length,
    `expected ${expectedPrimary.length} primary buttons, got ${JSON.stringify(summary.primary)}`,
  );
  check(
    JSON.stringify(summary.primary) === JSON.stringify(expectedPrimary),
    `unexpected primary buttons: ${JSON.stringify(summary.primary)} (expected ${JSON.stringify(expectedPrimary)})`,
  );
  check(summary.hasMore && summary.expanded === "true", "the More button did not open the panel");
  check(summary.panelVisible, "panel did not become visible");
  check(summary.repo === "octocat/hello-world", `panel repo was ${summary.repo}`);
  const expectedRows = expectedPanelRows();
  check(
    summary.rows === expectedRows,
    `panel listed ${summary.rows} rows, expected ${expectedRows}`,
  );
  check(
    summary.copiedTitle === "https://gitingest.com/octocat/hello-world",
    `gitingest target was ${JSON.stringify(summary.copiedTitle)}`,
  );
  check(
    summary.groups.includes("Prompt-ready digest") &&
      summary.groups.includes("Local command line") &&
      // Split out of the old combined group, so both must appear separately.
      summary.groups.includes("History") &&
      summary.groups.includes("Analytics"),
    `unexpected groups: ${JSON.stringify(summary.groups)}`,
  );
  check(
    summary.placement === "inline",
    `buttons were placed ${summary.placement} instead of inline in the repo header`,
  );

  // Buttons are glyphs, not text: no visible name, but still named for keyboard
  // and screen-reader users.
  check(summary.clusterStyle === "icon", `cluster style was ${summary.clusterStyle}, expected icon`);
  check(
    summary.primaryText.every((text) => text.length === 0),
    `buttons still show text: ${JSON.stringify(summary.primaryText)}`,
  );
  check(
    summary.primaryGlyphs.every((count) => count > 0),
    `a button has no icon: ${JSON.stringify(summary.primaryGlyphs)}`,
  );
  check(summary.moreGlyph, "the More button has no icon");
  check(
    summary.primaryLabels.every((label) => label && label.length > 2),
    `a button has no accessible name: ${JSON.stringify(summary.primaryLabels)}`,
  );
  check(
    summary.primaryTitles.every((title) => title.includes("—")),
    `a button has no descriptive tooltip: ${JSON.stringify(summary.primaryTitles)}`,
  );

  if (summary.placement === "inline") notes.push(`buttons injected inline (${summary.anchor})`);
  notes.push(`icon-only buttons: ${JSON.stringify(summary.primaryLabels)}`);
  notes.push(`panel shows ${summary.rows} rows in ${summary.groups.length} groups (${summary.meta})`);
}
