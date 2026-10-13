/**
 * Probe every service in the catalog.
 *
 * SERVICES.md keeps a graveyard of entries that died or were renamed, and every
 * one of them was found by hand. That is the chore that killed every incumbent
 * extension in this space — not competition, staleness. This does it
 * mechanically.
 *
 *   npm run probe              human-readable table
 *   npm run probe -- --strict  also exit non-zero on an HTTP error
 *   npm run probe -- --out f   write the machine-readable report to a file
 *   npm run probe -- --full    also probe a directory and a file view
 *
 * The report goes to --out rather than stdout, because `npm run` prints its own
 * banner to stdout and a redirect of it is not valid JSON. --json still prints
 * to stdout for reading by hand; anything parsing it should use --out.
 *
 * The exit code is the useful part: non-zero only when a host is *unreachable*,
 * which is the same signal the graveyard records — DNS failure, refused
 * connection, timeout. An HTTP error is deliberately NOT a failure, because
 * several services in the catalog generate lazily (DeepWiki builds a wiki on
 * first visit and may answer 404 until it exists) or answer 403 to anything
 * that looks automated. Calling those dead would be a false alarm, and a probe
 * that cries wolf gets ignored — which is worse than not having one.
 */
import { CATALOG } from "../src/catalog.js";
import { parseRepoUrl } from "../src/parse.js";
import { buildTarget } from "../src/catalog.js";

/** A real, stable, public repo. Its root target is the least volatile URL per service. */
const SAMPLE_REPO = "https://github.com/coderamp-labs/gitingest";

/** Extra page shapes for --full. */
const EXTRA_PAGES = [
  ["tree", "https://github.com/coderamp-labs/gitingest/tree/main/src"],
  ["file", "https://github.com/coderamp-labs/gitingest/blob/main/README.md"],
];

const TIMEOUT_MS = 15_000;
const CONCURRENCY = 6;

const strict = process.argv.includes("--strict");
const asJson = process.argv.includes("--json");
const full = process.argv.includes("--full");
const outIndex = process.argv.indexOf("--out");
const outFile = outIndex !== -1 ? process.argv[outIndex + 1] : null;
if (outIndex !== -1 && !outFile) {
  console.error("✗ --out needs a path");
  process.exit(1);
}

/**
 * @returns {Promise<{state: string, status: number|null, ms: number, to: string, note?: string}>}
 */
async function probeUrl(url) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // GET rather than HEAD: some of these hosts answer HEAD with 405 or with a
    // body-less 200 that hides a redirect. The body is cancelled immediately so
    // nothing is actually downloaded.
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "superepo-probe (+catalog freshness check)" },
    });
    await response.body?.cancel();

    const ms = Date.now() - started;
    const requested = new URL(url);
    const landed = new URL(response.url || url);

    if (response.status >= 200 && response.status < 300) {
      const aliased = landed.host !== requested.host;
      return {
        state: aliased ? "ok-aliased" : "ok",
        status: response.status,
        ms,
        to: landed.host,
        note: aliased ? `redirects to ${landed.host}` : undefined,
      };
    }
    return { state: "http-error", status: response.status, ms, to: landed.host };
  } catch (error) {
    const ms = Date.now() - started;
    const code = error?.cause?.code || error?.name || "error";
    // These are the graveyard-class failures: the name does not resolve, the
    // connection is refused, the TLS cert is gone, or we ran out of time.
    return { state: "unreachable", status: null, ms, to: url, note: String(code) };
  } finally {
    clearTimeout(timer);
  }
}

/** Every (label, url) pair worth checking for one service. */
function targetsFor(service) {
  const pages = [["repo", SAMPLE_REPO]];
  if (full) pages.push(...EXTRA_PAGES);

  const out = [];
  for (const [label, page] of pages) {
    const ctx = parseRepoUrl(page);
    if (!ctx) continue;
    const target = buildTarget(service, ctx);
    if (!target || target.kind !== "url") continue;
    out.push([label, target.url]);
  }
  return out;
}

async function main() {
  const queue = [];
  for (const service of CATALOG) {
    for (const [label, url] of targetsFor(service)) {
      queue.push({ service, label, url });
    }
  }
  if (!queue.length) {
    console.error("✗ nothing to probe — the catalog produced no URL targets");
    process.exit(1);
  }

  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < queue.length) {
      const item = queue[cursor++];
      const result = await probeUrl(item.url);
      results.push({ id: item.service.id, name: item.service.name, page: item.label, url: item.url, ...result });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  results.sort((a, b) => a.name.localeCompare(b.name) || a.page.localeCompare(b.page));

  const byId = (state) => results.filter((r) => r.state === state);
  const unreachable = byId("unreachable");
  const httpErrors = byId("http-error");
  const aliased = byId("ok-aliased");
  const ok = byId("ok");

  const report = {
    generated: new Date().toISOString(),
    sample: SAMPLE_REPO,
    summary: {
      total: results.length,
      ok: ok.length,
      aliased: aliased.length,
      httpError: httpErrors.length,
      unreachable: unreachable.length,
    },
    results,
  };

  if (outFile) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(outFile, JSON.stringify(report, null, 2) + "\n");
    if (!asJson) console.log(`  report written to ${outFile}`);
  } else if (asJson) {
    const sample = SAMPLE_REPO;
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    const pad = (text, width) => String(text).padEnd(width);
    const MARK = { ok: "✓", "ok-aliased": "→", "http-error": "!", unreachable: "✗" };
    console.log(`\nCatalog probe — ${results.length} targets, sample ${SAMPLE_REPO}\n`);
    let lastId = null;
    for (const r of results) {
      if (r.id !== lastId) {
        console.log(`  ${r.name}`);
        lastId = r.id;
      }
      const detail = [r.status ?? "—", `${r.ms}ms`, r.note].filter(Boolean).join("  ");
      console.log(`    ${pad(MARK[r.state] ?? "?", 3)} ${pad(r.page, 5)} ${detail}`);
    }
    console.log(
      `\n  ${ok.length} ok · ${aliased.length} aliased · ${httpErrors.length} http error · ${unreachable.length} unreachable\n`,
    );
    if (httpErrors.length) {
      console.log("  HTTP errors are not failures — lazy generation and bot blocking look like this.");
      console.log("  Check them by hand before changing anything:\n");
      for (const r of httpErrors) console.log(`    ${pad(r.id, 16)} ${r.status}  ${r.url}`);
      console.log("");
    }
    if (unreachable.length) {
      console.log("  Unreachable — these are the graveyard. Notify the owner before recording:\n");
      for (const r of unreachable) console.log(`    ${pad(r.id, 16)} ${pad(r.note, 12)} ${r.url}`);
      console.log("");
    }
  }

  if (unreachable.length) {
    console.error(`✗ ${unreachable.length} service${unreachable.length === 1 ? "" : "s"} unreachable`);
    process.exit(1);
  }
  if (strict && httpErrors.length) {
    console.error(`✗ ${httpErrors.length} service${httpErrors.length === 1 ? "" : "s"} returned an HTTP error (--strict)`);
    process.exit(1);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(`✗ probe failed: ${error.message}`);
  process.exit(1);
});