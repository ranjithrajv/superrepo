/**
 * Regenerate the service table in PARTNERS.md from src/catalog.js.
 *
 * The table lists other people's work in a document we send to them, so it has to
 * be right — and it has to keep being right as entries are added, renamed or
 * dropped. Hand-maintaining it guarantees it won't be, so it is generated from
 * the same data the extension ships: name and link from `docs`, the human label
 * from `category`, and the blurb verbatim, because the blurb is the vendor's own
 * wording and PARTNERS.md promises not to restyle it.
 *
 *   node scripts/gen-partners.mjs           rewrite the table
 *   node scripts/gen-partners.mjs --check   exit 1 if it is stale (used by `npm run check`)
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { CATALOG, CATEGORIES } from "../src/catalog.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "PARTNERS.md");
const BEGIN = "<!-- BEGIN:tools -->";
const END = "<!-- END:tools -->";

/** A pipe would end the markdown cell early; a link paren would end the link. */
const cell = (text) => String(text).replace(/\|/g, "\\|").trim();

function buildTable() {
  const labels = new Map(CATEGORIES.map((c) => [c.id, c.label]));
  const rows = [];

  // Category order first, then the order the catalog already uses inside each —
  // the same order the panel groups them in.
  for (const category of CATEGORIES) {
    for (const service of CATALOG) {
      if (service.category !== category.id) continue;
      if (!service.docs) {
        throw new Error(`${service.id}: no \`docs\` URL, so it cannot be listed`);
      }
      rows.push(
        `| [${cell(service.name)}](${service.docs}) | ${cell(labels.get(category.id))} | ${cell(service.blurb)} |`,
      );
    }
  }

  return [
    "| Service | Category | What it does |",
    "| --- | --- | --- |",
    ...rows,
  ].join("\n");
}

async function main() {
  const check = process.argv.includes("--check");
  const table = buildTable();

  let source;
  try {
    source = await readFile(FILE, "utf8");
  } catch {
    console.error(`✗ ${FILE} not found`);
    process.exit(1);
  }

  const start = source.indexOf(BEGIN);
  const end = source.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    console.error(`✗ ${FILE} is missing the ${BEGIN} / ${END} markers`);
    process.exit(1);
  }

  const next =
    source.slice(0, start + BEGIN.length) + "\n" + table + "\n" + source.slice(end);

  if (check) {
    if (next === source) {
      console.log("· PARTNERS.md service table matches src/catalog.js");
      return;
    }
    console.error(
      "\n✗ PARTNERS.md service table is out of date with src/catalog.js.\n" +
        "  Run: npm run partners\n",
    );
    process.exit(1);
  }

  if (next === source) {
    console.log(`· PARTNERS.md service table already up to date (${CATALOG.length} services)`);
    return;
  }

  await writeFile(FILE, next);
  console.log(`✓ PARTNERS.md service table written from src/catalog.js (${CATALOG.length} services)`);
}

main().catch((error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});