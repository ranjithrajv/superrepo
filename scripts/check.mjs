#!/usr/bin/env node
/**
 * Sanity checks that don't need a browser:
 *   1. both manifests parse and reference files that exist
 *   2. every JS file parses
 *   3. the icons exist
 *
 * Run with `npm run check`.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const notes = [];

// ------------------------------------------------------------------ manifests

const MANIFESTS = ["manifest.chrome.json", "manifest.firefox.json"];

for (const name of MANIFESTS) {
  const path = join(root, name);
  if (!existsSync(path)) {
    problems.push(`${name}: missing`);
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    problems.push(`${name}: invalid JSON — ${error.message}`);
    continue;
  }

  if (manifest.manifest_version !== 3) problems.push(`${name}: manifest_version must be 3`);
  if (!manifest.name || !manifest.version) problems.push(`${name}: needs name and version`);
  if (!/^\d+\.\d+\.\d+/.test(String(manifest.version))) problems.push(`${name}: version must be x.y.z`);

  const referenced = new Set();
  if (manifest.action?.default_popup) referenced.add(manifest.action.default_popup);
  if (manifest.options_ui?.page) referenced.add(manifest.options_ui.page);
  for (const icon of Object.values(manifest.icons ?? {})) referenced.add(icon);
  for (const icon of Object.values(manifest.action?.default_icon ?? {})) referenced.add(icon);
  if (manifest.background?.service_worker) referenced.add(manifest.background.service_worker);
  for (const script of manifest.background?.scripts ?? []) referenced.add(script);
  for (const entry of manifest.content_scripts ?? []) {
    for (const file of entry.js ?? []) referenced.add(file);
    for (const file of entry.css ?? []) referenced.add(file);
  }
  for (const resource of manifest.web_accessible_resources ?? []) {
    for (const item of resource.resources ?? []) referenced.add(item);
  }

  for (const file of referenced) {
    if (!existsSync(join(root, file))) problems.push(`${name}: references missing file ${file}`);
  }

  const backgroundCount = [manifest.background?.service_worker, ...(manifest.background?.scripts ?? [])].filter(Boolean).length;
  if (backgroundCount !== 1) problems.push(`${name}: expected exactly one background entry`);

  // The UI lives on the page, so the content script is the product.
  const contentScripts = (manifest.content_scripts ?? []).flatMap((entry) => entry.js ?? []);
  if (!contentScripts.includes("src/content.js")) {
    problems.push(`${name}: no content script — the in-page UI would never appear`);
  }
  if (contentScripts.includes("src/content-styles.js") && contentScripts.indexOf("src/content-styles.js") > contentScripts.indexOf("src/content.js")) {
    problems.push(`${name}: content-styles.js must load before content.js`);
  }
  if (manifest.action?.default_popup) {
    problems.push(`${name}: default_popup should not exist — there is no popup by design`);
  }

  // Permissions worth guarding: keep the install prompt quiet.
  const noisy = (manifest.permissions ?? []).filter((p) =>
    ["tabs", "activeTab", "history", "webRequest", "cookies", "bookmarks", "management"].includes(p),
  );
  if (noisy.length) problems.push(`${name}: permissions that are not needed (${noisy.join(", ")})`);

  notes.push(
    `${name}: ${Object.keys(manifest.icons ?? {}).length} icons, ` +
      `permissions [${(manifest.permissions ?? []).join(", ")}]`,
  );
}

// ------------------------------------------------------------------------ JS

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

const jsFiles = walk(root).filter((file) => !file.includes(`${join(root, "dist")}`));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || "").split("\n").slice(0, 4).join(" ").trim();
    problems.push(`${relative(root, file)}: ${message}`);
  }
}
notes.push(`${jsFiles.length} JS files parsed`);

// --------------------------------------------------------------------- icons

for (const size of [16, 32, 48, 96, 128]) {
  const icon = join(root, "icons", `icon${size}.png`);
  if (!existsSync(icon)) problems.push(`icons/icon${size}.png missing — run \`npm run icons\``);
}

// -------------------------------------------------------------------- report

for (const note of notes) console.log(`· ${note}`);

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem${problems.length === 1 ? "" : "s"}:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log("\n✓ manifests, JS and icons all check out");
