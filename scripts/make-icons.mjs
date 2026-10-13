#!/usr/bin/env node
/**
 * Rasterise icons/icon.svg into the PNG sizes the manifests reference.
 *
 * Chrome will not accept an SVG for manifest icons, so the PNGs are committed.
 * Re-run this after editing the SVG:  npm run icons
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const svg = resolve(root, "icons/icon.svg");
const outDir = resolve(root, "icons");
const SIZES = [16, 32, 48, 96, 128];

if (!existsSync(svg)) {
  console.error(`✗ missing ${svg}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

/** Is a binary on PATH? */
function available(command) {
  const result = spawnSync(command, ["--help"], { stdio: "ignore" });
  return !result.error || result.error.code !== "ENOENT";
}

const rasterisers = [
  {
    name: "rsvg-convert",
    run: (size, target) =>
      spawnSync("rsvg-convert", ["-w", String(size), "-h", String(size), "-o", target, svg]),
  },
  {
    name: "ImageMagick",
    run: (size, target) =>
      spawnSync("convert", ["-background", "none", "-density", "384", "-resize", `${size}x${size}`, svg, target]),
  },
];

const rasteriser = rasterisers.find((tool) => available(tool.name));
if (!rasteriser) {
  console.error("✗ need rsvg-convert or ImageMagick `convert` on PATH to build icons");
  console.error("  Debian/Ubuntu: apt install librsvg2-bin   (or imagemagick)");
  console.error("  macOS:         brew install librsvg        (or imagemagick)");
  process.exit(1);
}

let failures = 0;
for (const size of SIZES) {
  const target = resolve(outDir, `icon${size}.png`);
  const result = rasteriser.run(size, target);
  const ok = result.status === 0 && existsSync(target) && statSync(target).size > 0;
  if (!ok) {
    failures += 1;
    console.error(`✗ icon${size}.png failed${result.stderr ? `: ${result.stderr}` : ""}`);
  } else {
    console.log(`✓ icons/icon${size}.png  (${statSync(target).size} bytes)`);
  }
}

if (failures) process.exit(1);
console.log(`Done — ${SIZES.length} icons via ${rasteriser.name}`);
