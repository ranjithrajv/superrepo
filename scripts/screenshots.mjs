#!/usr/bin/env node
/**
 * Store assets: screenshots, promo tiles and the store logo, generated from the
 * real extension.
 *
 * Both stores want images and neither has a "skip" button, so these are checked
 * in rather than shot by hand. Everything here is captured out of the built
 * extension running in headless Chromium against real github.com — nothing is
 * mocked, so the screenshots cannot drift from what the extension does.
 *
 *   npm run build && npm run shots
 *
 * Sizes come from the stores, checked 2026-10-15:
 *   · Chrome screenshots  1280x800, up to five (640x400 is the other option)
 *   · Chrome small promo  440x280, required
 *   · Chrome marquee      1400x560, optional — but it is the one that gets an
 *                         extension onto the front page, so it is worth having
 *   · AMO screenshots     1280x800 recommended, so it reuses the same five
 *   · Edge logo           1:1, 300x300 recommended with 128x128 the minimum,
 *                         required per language — Chrome reads its 128px icon
 *                         from the manifest and asks for no listing logo
 *
 * Format is "JPEG or 24-bit PNG (no alpha)" in both stores, and every file
 * written here is checked against that — see lib/png.mjs.
 *
 * The 920x680 "large tile" this script used to emit is not a size either store
 * lists any more; the marquee replaced it. The file shot used to be the promo
 * tile re-rendered at 1366x768 — a tile is not a screenshot, so it is now a real
 * capture of the panel open on a real file view.
 *
 * Output lands in store/. It is deliberately NOT in .gitignore: these are
 * listing assets, not build output.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { assertRunnable, extensionId, launch, openTab, root, sleep, waitFor } from "./lib/cdp.mjs";
import { describePng, toStorePng } from "./lib/png.mjs";

const OUT = join(root, "store");
const REPO = "https://github.com/octocat/hello-world";
/**
 * The file this repo actually has. It is called `README`, with no extension —
 * `/blob/master/README.md` is a 404, and a 404 makes a poor screenshot.
 */
const FILE = `${REPO}/blob/master/README`;

/**
 * The promo tile, as markup. One layout, two orientations: below 2:1 it stacks
 * vertically for the 440x280 small tile, at 2:1 and above it goes side by side
 * for the 1400x560 marquee, which is wide enough that a stack would leave the
 * middle half of the frame empty. Same elements in both, so the two tiles read
 * as one brand rather than two.
 */
const tileHtml = `<!doctype html><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 100%; height: 100%; }
  body {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2.4vmin; padding: 7vmin; text-align: center;
    background: radial-gradient(120% 120% at 18% 0%, #2b2f45 0%, #14161f 55%, #0d0f16 100%);
    color: #edeef3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .card { display: flex; flex-direction: column; align-items: center; gap: 2.6vmin; }
  .copy { display: flex; flex-direction: column; align-items: center; gap: 1.4vmin; }
  img { width: 22vmin; height: 22vmin; border-radius: 22%; }
  h1 { font-size: 12vmin; font-weight: 750; letter-spacing: -0.03em; line-height: 1; }
  p { font-size: 5vmin; color: #a6adc2; font-weight: 500; line-height: 1.35; }
  .row { display: flex; gap: 1.8vmin; flex-wrap: wrap; justify-content: center; margin-top: 0.6vmin; }
  .tag {
    font-size: 3.4vmin; font-weight: 650; color: #cbd1e2;
    background: #ffffff12; border: 1px solid #ffffff1f;
    border-radius: 999px; padding: 1.2vmin 3.2vmin;
  }
  .foot { font-size: 3vmin; color: #7c839b; }
  @media (min-aspect-ratio: 2/1) {
    body { padding: 8vmin 7vmin; }
    .card { flex-direction: row; align-items: center; gap: 6vmin; }
    .copy { align-items: flex-start; text-align: left; }
    img { width: 30vmin; height: 30vmin; }
    h1 { font-size: 11vmin; }
    p { font-size: 4.4vmin; }
    .row { justify-content: flex-start; }
  }
</style><body>
  <div class="card">
    <img alt="SuperRepo">
    <div class="copy">
      <h1>SuperRepo</h1>
      <p>One click from any repo to a prompt, a diagram, a wiki, an IDE or a podcast.</p>
      <div class="row">
        <span class="tag">Every tool</span>
        <span class="tag">No API keys</span>
        <span class="tag">No tracking</span>
      </div>
    </div>
  </div>
  <div class="foot">Not affiliated with GitHub.</div>
</body>`;

/**
 * The store logo, as markup: the icon, full bleed, at 1:1.
 *
 * Edge wants a square logo of its own — 300x300 recommended, 128x128 the
 * minimum — separately from the 128px package icon the manifests reference, and
 * one per language. It is 1:1, so the icon's own 23% corner radius has corners
 * that only cost something: dropped onto a no-alpha PNG (the same rule here as
 * for every other asset) they flatten to white, and white corners read wrong on
 * any frame that is not white. So the radius comes off and the mark owns the
 * whole square. Everything else is `icons/icon.svg` unedited — same gradient,
 * same stroke, same mark.
 */
const logoHtml = `<!doctype html><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  svg { display: block; width: 100%; height: 100%; }
</style><body>${readFileSync(join(root, "icons/icon.svg"), "utf8").replace('rx="30"', 'rx="0"')}</body>`;

/**
 * Capture the tab at an exact pixel size, and in the format the stores take.
 *
 * Scale is 1 on purpose: both stores check the *pixel* dimensions of a promo
 * tile against a fixed number (440x280, 1400x560) and reject anything else, so a
 * retina-scaled capture would be refused for being twice the size it claims.
 *
 * "JPEG or 24-bit PNG (no alpha)" is the other half of the rule, and it is
 * enforced here rather than assumed — see lib/png.mjs. The size is checked too,
 * because a screenshot that quietly came out 1280x801 is a rejection a week
 * later, not an error now.
 */
async function shoot(client, file, { width, height, scale = 1 } = {}) {
  await client.send("Page.enable");
  if (width && height) {
    await client.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: scale,
      mobile: false,
    });
  }
  await sleep(700); // let the layout settle after the resize
  const { data } = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });

  const png = toStorePng(Buffer.from(data, "base64"));
  const size = describePng(png);
  if (width && height && (size.width !== width || size.height !== height)) {
    throw new Error(`${file}: captured ${size.width}x${size.height}, but the stores want ${width}x${height}`);
  }
  if (size.colorType !== 2 || size.depth !== 8) {
    throw new Error(`${file}: not 24-bit RGB (colour type ${size.colorType}, depth ${size.depth})`);
  }

  writeFileSync(join(OUT, file), png);
  console.log(`  ${file}  ${size.width}x${size.height}  24-bit RGB`);
}

/**
 * Render a page of markup in a scratch tab and capture it at an exact size.
 *
 * The promo tiles and the store logo are the same job — draw HTML, shoot it — so
 * they go through one path. `after` runs in the page once the markup is in, for
 * what the markup cannot carry itself: the tiles take their icon that way rather
 * than embedding a base64 data: URI in this file, where nobody could read it.
 */
async function shootHtml(port, browser, html, file, width, height, after = "") {
  const tab = await openTab(port, browser, "about:blank");
  if (!tab) {
    console.warn(`  ! could not open a tab for ${file}`);
    return;
  }
  await tab.send("Page.enable");
  await tab.eval(`(() => {
    document.documentElement.innerHTML = ${JSON.stringify(html)};
    ${after}
    return true;
  })()`);
  await sleep(400);
  await shoot(tab, file, { width, height });
  tab.close();
}

/** Wait for the cluster to exist, which is the extension saying it is loaded. */
function waitForButtons(client) {
  return waitFor(
    client,
    `(() => {
      const shadow = document.querySelector("superepo-root")?.shadowRoot;
      return shadow?.querySelector(".cluster") ? "ok" : null;
    })()`,
    25000,
    { quiet: true },
  );
}

/** Click one element inside the extension's shadow root. */
function clickShadow(client, selector) {
  return client.eval(`(() => {
    const el = document.querySelector("superepo-root")?.shadowRoot?.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.click();
    return true;
  })()`);
}

/** Type into the panel's filter the way a person would, input event and all. */
function typeFilter(client, text) {
  return client.eval(`(() => {
    const filter = document.querySelector("superepo-root")?.shadowRoot?.querySelector(".filter");
    if (!filter) return false;
    filter.value = ${JSON.stringify(text)};
    filter.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
}

/**
 * Drive the settings through the product's own save path.
 *
 * The options page is an extension page, so it has `chrome.*`; a content script's
 * page world does not. Going through the same message the panel sends means the
 * screenshots only ever show states the extension can reach — a partial object
 * written straight into storage would skip the defaults merge in loadSettings()
 * and quietly produce a header with no buttons in it at all.
 */
async function settingsDriver(port, browser, id) {
  const page = await openTab(port, browser, `chrome-extension://${id}/src/options.html`);
  if (!page) throw new Error("could not open the options page");
  await sleep(500);
  return {
    page,
    async save(patch) {
      const result = await page.eval(
        `chrome.runtime.sendMessage({ type: "superepo:save", patch: ${JSON.stringify(patch)} })`,
      );
      if (!result?.ok) throw new Error(`save failed for ${JSON.stringify(patch)}: ${JSON.stringify(result)}`);
      await sleep(400); // let the storage broadcast reach the open repo tab
      return result.settings;
    },
  };
}

assertRunnable();
mkdirSync(OUT, { recursive: true });

console.log("· launching Chromium with dist/chrome");
const launched = await launch({ width: 1440, height: 900 });
const { browser, port } = launched;

try {
  const id = await extensionId(browser);
  if (!id) throw new Error("service worker never appeared");
  console.log(`  extension ${id}`);

  const drive = await settingsDriver(port, browser, id);

  // ---- 1. the header buttons, in the page they belong to ---------------------
  // "Icon and name" rather than the shipped icon-only default. Eight 32px glyphs
  // are unreadable once the store has downscaled the screenshot, and in a
  // listing the screenshot *is* the pitch; the labels say in one glance what
  // each button does. It is a real setting, saved through the options page the
  // same way a user would set it, so nothing here is staged.
  await drive.save({ buttonStyle: "labeled" });

  const repo = await openTab(port, browser, REPO);
  if (!repo || !(await waitForButtons(repo))) {
    console.warn("  ! github.com did not render a repo page; screenshots 1, 2 and 4 skipped");
  } else {
    await shoot(repo, "screenshot-1-buttons.png", { width: 1280, height: 800 });

    // ---- 2. the panel: the whole catalog, grouped, one line per service ------
    if (!(await clickShadow(repo, "[data-toggle]"))) console.warn("  ! no More button to open");
    await sleep(900);
    await shoot(repo, "screenshot-2-panel.png", { width: 1280, height: 800 });

    // ---- 4. the filter, for "there are many of these, here is how you find one"
    if (!(await typeFilter(repo, "ai"))) console.warn("  ! no filter to type into");
    await sleep(500);
    await shoot(repo, "screenshot-4-search.png", { width: 1280, height: 800 });
  }

  // ---- 3. a file view, where the buttons change to match the page ------------
  // The one screenshot that shows the part that is genuinely different from
  // swapping the host in the URL by hand: on a file, the services get this file
  // or the folder holding it, and the ones that cannot take a file drop out.
  const fileTab = await openTab(port, browser, FILE);
  if (fileTab && (await waitForButtons(fileTab))) {
    await clickShadow(fileTab, "[data-toggle]");
    await sleep(1000);
    // Scroll to the rows that carry a "this file" badge. The top of the list is
    // the same rows screenshot 2 already shows; the reason this shot exists is
    // the part that changes because of where the page is.
    await fileTab.eval(`(() => {
      const shadow = document.querySelector("superepo-root")?.shadowRoot;
      const list = shadow?.querySelector(".list");
      const scope = list?.querySelector(".row-scope");
      if (!list || !scope) return false;
      list.scrollTop += scope.getBoundingClientRect().top - list.getBoundingClientRect().top - 90;
      return true;
    })()`);
    await sleep(400);
    await shoot(fileTab, "screenshot-3-file.png", { width: 1280, height: 800 });
  } else {
    console.warn("  ! the file view did not render; screenshot 3 skipped");
  }

  // ---- 5. the settings page --------------------------------------------------
  // Opened up, because collapsed the page is one card and a summary, which says
  // nothing about how much there is to configure.
  await drive.page.eval(`(() => {
    const advanced = document.querySelector("details.advanced");
    if (advanced) advanced.open = true;
    return !!advanced;
  })()`);
  await sleep(500);
  await shoot(drive.page, "screenshot-5-options.png", { width: 1280, height: 800 });

  // ---- 6. promo tiles, rendered from HTML ------------------------------------
  // Rendered rather than drawn, so they stay on-brand and need no image library.
  const icon = `data:image/svg+xml;base64,${readFileSync(join(root, "icons/icon.svg")).toString("base64")}`;
  for (const [file, width, height] of [
    ["promo-small.png", 440, 280],
    ["promo-marquee.png", 1400, 560],
  ]) {
    await shootHtml(port, browser, tileHtml, file, width, height, `document.querySelector("img").src = ${JSON.stringify(icon)};`);
  }

  // ---- 7. the Edge store logo -------------------------------------------------
  // Edge's one required listing image that is neither a screenshot nor a tile.
  // Square and 1:1 by rule, so the only size it is shot at is the recommended one.
  await shootHtml(port, browser, logoHtml, "logo.png", 300, 300);
} finally {
  browser.close();
  launched.chrome.kill("SIGKILL");
  await sleep(300);
}

console.log(`\n✓ store assets written to ${OUT}`);
