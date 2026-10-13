/**
 * One-time dev setup: point git at .githooks so the pre-commit and pre-push
 * checks actually run.
 *
 * Git does not read hooks out of .git/hooks if core.hooksPath points
 * elsewhere, and a hook checked into the repo is invisible without this. So it
 * is run explicitly rather than assumed.
 *
 *   npm run setup
 *
 * Safe to re-run. It prints what it did and leaves an existing setting alone
 * unless it points somewhere unexpected.
 */
import { execFileSync } from "node:child_process";

const HOOKS_PATH = ".githooks";
const local = ["config", "core.hooksPath"];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function gitQuiet(...args) {
  try {
    return git(...args);
  } catch {
    return null;
  }
}

let inside = false;
try {
  inside = git("rev-parse", "--is-inside-work-tree") === "true";
} catch {
  inside = false;
}

if (!inside) {
  console.error(
    "\n✗ Not inside a git repository.\n" +
      "  The hooks only work once this is one. To start:\n\n" +
      "    git init\n" +
      "    git remote add origin https://github.com/ranjithrajv/superrepo\n" +
      "    npm run setup\n",
  );
  process.exit(1);
}

const current = gitQuiet(...local);

if (current === HOOKS_PATH) {
  console.log(`✓ core.hooksPath already ${HOOKS_PATH}`);
  process.exit(0);
}

if (current && current !== ".git/hooks") {
  console.warn(
    `⚠ core.hooksPath is already set to "${current}" — leaving it alone.\n` +
      "  If you meant to use SuperRepo's hooks, set it yourself:\n\n" +
      `    git config ${local.join(" ")} ${HOOKS_PATH}\n`,
  );
  process.exit(0);
}

git(...local, HOOKS_PATH);
console.log(`✓ core.hooksPath set to ${HOOKS_PATH}`);

// Hooks are not executable by default after a fresh checkout on some systems,
// and a non-executable hook is silently skipped — the worst possible failure
// mode for a check.
const { chmodSync, existsSync } = await import("node:fs");
for (const hook of ["pre-commit", "pre-push"]) {
  const path = `${HOOKS_PATH}/${hook}`;
  if (!existsSync(path)) continue;
  chmodSync(path, 0o755);
  console.log(`✓ ${path} is executable`);
}

console.log("\n  pre-commit   npm run check");
console.log("  pre-push     npm test, check, build, smoke\n");
console.log("  Bypass with --no-verify, or SUPERREPO_SKIP_SMOKE=1 to skip smoke locally.");