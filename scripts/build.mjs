#!/usr/bin/env node
/**
 * Build dist/chrome and dist/firefox from the same source tree, using the
 * manifest each browser needs.
 *
 *   npm run build          → both trees
 *   npm run package        → both trees plus .zip files for uploading
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const zip = process.argv.includes("--zip");

const TARGETS = [
  { name: "chrome", manifest: "manifest.chrome.json" },
  { name: "edge", manifest: "manifest.edge.json" },
  { name: "safari", manifest: "manifest.safari.json" },
  { name: "firefox", manifest: "manifest.firefox.json" },
];

const SHARED = ["src", "icons"];

// Pre-flight: icons must exist, because the manifests reference them.
for (const size of [16, 32, 48, 96, 128]) {
  if (!existsSync(join(root, "icons", `icon${size}.png`))) {
    console.error("✗ icons missing — run `npm run icons` first");
    process.exit(1);
  }
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

for (const target of TARGETS) {
  const outDir = join(dist, target.name);
  mkdirSync(outDir, { recursive: true });

  for (const entry of SHARED) {
    cpSync(join(root, entry), join(outDir, entry), { recursive: true });
  }

  const manifest = JSON.parse(readFileSync(join(root, target.manifest), "utf8"));
  writeFileSync(join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  for (const extra of ["README.md", "SERVICES.md", "LICENSE"]) {
    if (existsSync(join(root, extra))) cpSync(join(root, extra), join(outDir, extra));
  }

  const fileCount = count(outDir);
  console.log(`✓ dist/${target.name}  (${fileCount} files, ${target.manifest})`);

  if (zip) {
    const archive = join(dist, `superepo-${target.name}.zip`);
    const result = spawnSync("zip", ["-rq", archive, "."], { cwd: outDir });
    if (result.status === 0) console.log(`  ↳ ${archive.replace(`${root}/`, "")}`);
    else console.warn("  ↳ `zip` not available — skipping archive");
  }
}

console.log("\nLoad it:");
console.log("  Chrome/Edge/Brave   chrome://extensions / edge://extensions → Load unpacked → dist/chrome (or dist/edge, dist/safari)");
console.log("  Firefox             about:debugging#/runtime/this-firefox → Load Temporary Add-on → dist/firefox/manifest.json");

function count(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? count(join(dir, entry.name)) : 1;
  }
  return total;
}
