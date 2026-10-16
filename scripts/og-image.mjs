#!/usr/bin/env node
/**
 * Render `site/og.png` — the 1200×630 social preview.
 *
 * It is a capture of the page it links to, so it cannot drift from the hero the
 * way a hand-drawn card would. Regenerate it after a change to the hero copy or
 * the store buttons:
 *
 *   npm run og
 *
 * The page is opened with the extension left out (no build needed) and with
 * reduced motion emulated, so the entrance animation does not have to finish
 * before the capture.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assertRunnable, launch, openTab, root, sleep } from "./lib/cdp.mjs";

const WIDTH = 1200;
const HEIGHT = 630;
const OUT = join(root, "site", "og.png");
const PAGE_URL = `file://${join(root, "site", "index.html")}`;

assertRunnable();

const browser = await launch({ width: WIDTH, height: HEIGHT, extension: false });
try {
  const page = await openTab(browser.port, browser.browser, PAGE_URL);
  if (!page) throw new Error(`could not open ${PAGE_URL}`);

  await page.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: HEIGHT,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "reduce" }],
  });

  // Let the webfont land and the reduced-motion reveal settle before capturing.
  await sleep(1500);

  const shot = await page.send("Page.captureScreenshot", { format: "png" });
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, Buffer.from(shot.data, "base64"));

  const errors = page.pageErrors ?? [];
  if (errors.length) console.error(`! page errors: ${errors.join("; ")}`);
  console.log(`✓ site/og.png (${WIDTH}×${HEIGHT})`);
} finally {
  browser.close();
}
