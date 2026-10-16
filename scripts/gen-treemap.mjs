#!/usr/bin/env node
/**
 * Generate the catalog block in `site/directory.js`.
 *
 * The directory section on the site is a treemap of the whole catalog, built
 * from a copy of that catalog embedded in the page. The site is a static page
 * with no module system to import `src/catalog.js` with, and fetching one at
 * runtime would leave a blank section whenever it is opened from disk.
 *
 * A copy is only useful while it cannot drift, so the block is written here and
 * `npm run check` fails once it stops matching. Same arrangement as
 * `docs/CATALOG.md` and `PARTNERS.md`.
 *
 *   node scripts/gen-treemap.mjs
 *   node scripts/gen-treemap.mjs --check
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CATALOG, CATEGORIES } from "../src/catalog.js";
import { glyphMarkup } from "../src/icons.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "site/directory.js");

const BEGIN = "  // BEGIN:generated";
const END = "  // END:generated";

/** Services with no category land here rather than being dropped. */
const REST = "more";
/** The page's own "add your tool" row, which is not a service. */
const OWN_ROW = {
  id: "custom-add",
  name: "Add your tool",
  color: "var(--accent)",
  category: "custom",
  icon: "sparkle",
  docs: "https://github.com/ranjithrajv/superrepo/blob/main/CONTRIBUTING.md",
  blurb: "One object in src/catalog.js covers buttons, panel, context menu and omnibox.",
  kind: "link",
};

const LABELS = { [REST]: "More views", custom: "Your own" };

/** The page draws the glyph itself, so the markup travels with the entry. */
const glyph = (icon) => glyphMarkup(icon).replace("<svg ", '<svg width="22" height="22" ');

/**
 * Only the fields the treemap reads. `supports`, `url` and the rest are how the
 * extension behaves, and a page that cannot run them has no use for them.
 */
const entry = (service) => ({
  id: service.id,
  name: service.name,
  color: service.color,
  category: service.category ?? null,
  icon: service.icon,
  docs: service.docs,
  blurb: service.blurb,
  kind: service.kind,
  svg: glyph(service.icon),
});

function render(source) {
  const ids = CATEGORIES.map((category) => category.id);
  const order = [...ids, REST, "custom"];

  const labels = Object.assign(
    Object.fromEntries(CATEGORIES.map((category) => [category.id, category.label])),
    LABELS,
  );
  const byCat = Object.fromEntries(order.map((id) => [id, []]));

  for (const service of CATALOG) {
    const group = service.category && ids.includes(service.category) ? service.category : REST;
    byCat[group].push(entry(service));
  }
  byCat.custom.push({ ...OWN_ROW, svg: glyph(OWN_ROW.icon) });

  const block = [
    "  // BEGIN:generated — `npm run treemap` rewrites the three tables below from",
    "  // src/catalog.js. Do not hand-edit; `npm run check` fails once they drift.",
    `  const CAT_LABEL = ${JSON.stringify(labels)};`,
    `  const CAT_ORDER = ${JSON.stringify(order)};`,
    `  const BY_CAT = ${JSON.stringify(byCat)};`,
    END,
  ].join("\n");

  const from = source.indexOf(BEGIN);
  const to = source.indexOf(END);
  if (from === -1 || to === -1 || to < from) {
    throw new Error(`${FILE} has no ${BEGIN} / ${END} markers to write between`);
  }
  return source.slice(0, from) + block + source.slice(to + END.length);
}

const current = await readFile(FILE, "utf8");
const next = render(current);

if (process.argv.includes("--check")) {
  if (next !== current) {
    console.error("\n✗ site/directory.js's catalog is out of date with src/catalog.js.\n  Run: npm run treemap\n");
    process.exit(1);
  }
  console.log("· site/directory.js catalog matches src/catalog.js");
} else {
  if (next === current) {
    console.log("· site/directory.js catalog already matches src/catalog.js");
  } else {
    await writeFile(FILE, next);
    console.log("✓ site/directory.js catalog rewritten from src/catalog.js");
  }
}
