#!/usr/bin/env node
/**
 * Store assets: screenshots and promo tiles, generated from the real extension.
 *
 * Both stores want images and neither has a "skip" button, so these are checked
 * in rather than shot by hand. Everything here is captured out of the built
 * extension running in headless Chromium against real github.com — nothing is
 * mocked, so the screenshots cannot drift from what the extension does.
 *
 *   npm run build && npm run shots
 *
 * Sizes come from the stores:
 *   · Chrome Web Store screenshots  1280x800 (640x400 is the other option)
 *   · Chrome promo tiles            440x280 and 920x680
 *   · AMO screenshots               1366x768 recommended, so the wide one
 *
 * Output lands in store/. It is deliberately NOT in .gitignore: these are
 * listing assets, not build output.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { assertRunnable, extensionId, launch, openTab, root, sleep, waitFor } from "./lib/cdp.mjs";

const OUT = join(root, "store");
const REPO = "https://github.com/octocat/hello-world";

/**
 * The promo tile, as markup. One layout scaled by the viewport, so the small and
 * large tiles stay visually identical — stores show them side by side.
 */
const tileHtml = `<!doctype html><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 100%; height: 100%; }
  body {
    display: grid; place-items: center; gap: 2.2vmin;
    background: radial-gradient(120% 120% at 18% 0%, #2b2f45 0%, #14161f 55%, #0d0f16 100%);
    color: #edeef3; text-align: center; padding: 8vmin;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  img { width: 20vmin; height: 20vmin; border-radius: 22%; }
  h1 { font-size: 11vmin; font-weight: 750; letter-spacing: -0.03em; line-height: 1; }
  p { font-size: 4.6vmin; color: #a6adc2; font-weight: 500; line-height: 1.35; max-width: 34em; }
  .row { display: flex; gap: 1.8vmin; flex-wrap: wrap; justify-content: center; margin-top: 1vmin; }
  .tag {
    font-size: 3.2vmin; font-weight: 650; color: #cbd1e2;
    background: #ffffff12; border: 1px solid #ffffff1f;
    border-radius: 999px; padding: 1.1vmin 3vmin;
  }
  .foot { font-size: 2.9vmin; color: #7c839b; margin-top: 1.5vmin; }
</style><body>
  <img alt="SuperRepo">
  <h1>SuperRepo</h1>
  <p>One click from any repo to a prompt, a diagram, a wiki, an IDE or a podcast.</p>
  <div class="row">
    <span class="tag">26 tools</span>
    <span class="tag">No API keys</span>
    <span class="tag">No tracking</span>
  </div>
  <div class="foot">Not affiliated with GitHub.</div>
</body>`;

/**
 * Capture the tab at an exact pixel size.
 *
 * Scale is 1 on purpose: both stores check the *pixel* dimensions of a promo
 * tile against a fixed number (440x280, 920x680) and reject anything else, so a
 * retina-scaled capture would be refused for being twice the size it claims.
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
  writeFileSync(join(OUT, file), Buffer.from(data, "base64"));
  console.log(`  ${file}  ${width ?? "?"}x${height ?? "?"}`);
}

assertRunnable();
mkdirSync(OUT, { recursive: true });

console.log("· launching Chromium with dist/chrome");
const launched = await launch({ width: 1400, height: 900 });
const { browser, port } = launched;

try {
  const id = await extensionId(browser);
  if (!id) throw new Error("service worker never appeared");
  console.log(`  extension ${id}`);

  // ---- 1. the in-page UI on a real repo -------------------------------------
  const repo = await openTab(port, browser, REPO);
  if (!repo) throw new Error("could not open the repo tab");

  const injected = await waitFor(
    repo,
    `(() => {
      const shadow = document.querySelector("superepo-root")?.shadowRoot;
      return shadow?.querySelector(".cluster") ? "ok" : null;
    })()`,
    25000,
    { quiet: true },
  );
  if (!injected) {
    console.warn("  ! github.com did not render a repo page; screenshots skipped");
  } else {
    // Buttons only, so the cluster is the thing being looked at.
    await shoot(repo, "screenshot-1-buttons.png", { width: 1280, height: 800 });

    // The panel open, which is the shot that shows the catalog.
    await repo.send("Runtime.enable");
    await repo.eval(`(() => {
      document.querySelector("superepo-root")?.shadowRoot
        ?.querySelector("[data-toggle]")?.click();
      return true;
    })()`);
    await sleep(900);
    await shoot(repo, "screenshot-2-panel.png", { width: 1280, height: 800 });
  }

  // ---- 2. the options page ---------------------------------------------------
  const options = await openTab(port, browser, `chrome-extension://${id}/src/options.html`);
  if (options) {
    await sleep(900);
    await shoot(options, "screenshot-3-options.png", { width: 1280, height: 800 });
  } else {
    console.warn("  ! options page did not open; screenshot skipped");
  }

  // ---- 3. promo tiles, rendered from HTML ------------------------------------
  // Rendered rather than drawn, so they stay on-brand and need no image library.
  const icon = `data:image/svg+xml;base64,${readFileSync(join(root, "icons/icon.svg")).toString("base64")}`;
  for (const [file, width, height] of [
    ["promo-small.png", 440, 280],
    ["promo-large.png", 920, 680],
  ]) {
    const tile = await openTab(port, browser, "about:blank");
    await tile.send("Page.enable");
    await tile.eval(`(() => {
      document.documentElement.innerHTML = ${JSON.stringify(tileHtml)};
      document.querySelector("img").src = ${JSON.stringify(icon)};
      return true;
    })()`);
    await sleep(400);
    await shoot(tile, file, { width, height });
    tile.close();
  }

  // The wide shot AMO prefers.
  const wide = await openTab(port, browser, "about:blank");
  if (wide) {
    await wide.send("Page.enable");
    await wide.eval(`(() => {
      document.documentElement.innerHTML = ${JSON.stringify(tileHtml)};
      document.querySelector("img").src = ${JSON.stringify(icon)};
      return true;
    })()`);
    await sleep(400);
    await shoot(wide, "screenshot-4-promo.png", { width: 1366, height: 768 });
    wide.close();
  }
} finally {
  browser.close();
  launched.chrome.kill("SIGKILL");
  await sleep(300);
}

console.log(`\n✓ store assets written to ${OUT}`);