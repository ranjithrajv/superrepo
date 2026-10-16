#!/usr/bin/env node
/**
 * Build the hosted, no-install demo into `site/demo/`.
 *
 * GitHub Pages serves the marketing site from `site/` (see
 * `.github/workflows/pages.yml`), so the demo lives at the `/demo/` subpath —
 * which is exactly why every path in it is relative. The generated pages
 * declare the module base before the shim runs, and the shim (placed beside the
 * modules) resolves everything from there. See `scripts/lib/pages.mjs` and
 * `scripts/preview-shim.js`.
 *
 * `site/demo/src/` is a copy of `src/`, so it is regenerated, never hand-edited.
 * The same `--check` pattern as PARTNERS.md / docs/CATALOG.md guards it.
 *
 *   npm run demo            # write site/demo/
 *   npm run demo -- --check # exit non-zero if site/demo/ is stale
 */

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_REPO, demoPageHtml } from "./lib/pages.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "src");
const outDir = join(root, "site", "demo");
const checkOnly = process.argv.includes("--check");

/** The options page, with the module base and the shim injected into <head>. */
function optionsPageForDemo(html) {
  const inject =
    `<script>globalThis.__SUPERREPO_MODULE_BASE__ = "./"; ` +
    `globalThis.__SUPERREPO_OPTIONS_URL__ = "./options.html";</script>\n    ` +
    `<script src="shim.js"></script>`;
  return html.replace(/<head>/, `<head>\n    ${inject}`);
}

/** Every file the demo needs, keyed by its path inside site/demo/. */
async function build() {
  const files = new Map();
  files.set("index.html", demoPageHtml(DEFAULT_REPO));
  files.set("src/shim.js", await readFile(join(root, "scripts", "preview-shim.js"), "utf8"));

  for (const name of await readdir(srcDir)) {
    const raw = await readFile(join(srcDir, name));
    if (name === "options.html") {
      files.set(`src/${name}`, optionsPageForDemo(String(raw)));
    } else {
      files.set(`src/${name}`, raw);
    }
  }
  return files;
}

/** Every file currently under a directory, relative to it. */
async function listFiles(dir, base = dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full, base)));
    else out.push(relative(base, full));
  }
  return out;
}

const files = await build();

if (checkOnly) {
  const problems = [];
  for (const [rel, body] of files) {
    const want = Buffer.isBuffer(body) ? body : Buffer.from(body);
    let have = null;
    try {
      have = await readFile(join(outDir, rel));
    } catch {
      have = null;
    }
    if (!have || !have.equals(want)) problems.push(rel);
  }
  for (const rel of await listFiles(outDir)) {
    if (!files.has(rel)) problems.push(`${rel} (stale)`);
  }

  if (problems.length) {
    console.error("✗ site/demo/ is out of date — run `npm run demo`");
    for (const p of problems) console.error(`  · ${p}`);
    process.exit(1);
  }
  console.log(`· site/demo matches src (${files.size} files)`);
} else {
  await rm(outDir, { recursive: true, force: true });
  for (const [rel, body] of files) {
    const target = join(outDir, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body);
  }
  console.log(`✓ demo written to site/demo/ (${files.size} files) → /demo/`);
}
