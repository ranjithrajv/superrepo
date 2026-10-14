#!/usr/bin/env node
/**
 * Convert the built Chrome extension into a Safari web extension Xcode project.
 *
 * Safari does not load unpacked Manifest V3 extensions from a folder the way
 * Chrome does: an Xcode app target is required for signing and distribution.
 * This script wraps `xcrun safari-web-extension-converter`, which only exists on
 * macOS with Xcode installed — running it here on Linux prints instructions
 * instead of failing silently.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distChrome = join(root, "dist", "chrome");
const outDir = join(root, "safari");

if (!existsSync(distChrome)) {
  console.error("✗ dist/chrome not found — run `npm run build` first");
  process.exit(1);
}

let xcrun;
try {
  xcrun = execFileSync("which", ["xcrun"], { encoding: "utf8" }).trim();
} catch {
  xcrun = null;
}

if (!xcrun) {
  console.log("Safari conversion needs macOS + Xcode.");
  console.log("");
  console.log("On a Mac, run:");
  console.log("  npm run build");
  console.log("  xcrun safari-web-extension-converter dist/chrome \\");
  console.log("    --project-location safari \\");
  console.log("    --app-name SuperRepo \\");
  console.log("    --bundle-identifier dev.ranjithraj.superrepo \\");
  console.log("    --force");
  console.log("");
  console.log("Then open safari/SuperRepo.xcodeproj in Xcode, build, and ship via the Mac App Store.");
  process.exit(0);
}

execFileSync(
  "xcrun",
  [
    "safari-web-extension-converter",
    distChrome,
    "--project-location",
    outDir,
    "--app-name",
    "SuperRepo",
    "--bundle-identifier",
    "dev.ranjithraj.superrepo",
    "--force",
  ],
  { stdio: "inherit" },
);
console.log(`\n✓ Safari project written to ${outDir}`);
