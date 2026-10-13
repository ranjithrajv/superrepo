import test from "node:test";
import assert from "node:assert/strict";

import { CATALOG } from "../src/catalog.js";
import { GLYPHS, PICKABLE, glyphMarkup, hasGlyph } from "../src/icons.js";
import { parseRepoUrl } from "../src/parse.js";
import { buildPayload } from "../src/payload.js";
import { DEFAULT_SETTINGS, normalizeCustom } from "../src/settings.js";

const settings = (patch = {}) => ({ ...DEFAULT_SETTINGS, disabled: [...DEFAULT_SETTINGS.disabled], ...patch });
const github = () => parseRepoUrl("https://github.com/octocat/hello-world");
const items = (payload) => payload.groups.flatMap((group) => group.items);

test("every service maps to a glyph that exists", () => {
  for (const service of CATALOG) {
    assert.ok(service.icon, `${service.id} has no icon`);
    assert.ok(hasGlyph(service.icon), `${service.id} → ${service.icon} is not in GLYPHS`);
  }
});

test("no two services share a glyph", () => {
  const seen = new Map();
  for (const service of CATALOG) {
    const clash = seen.get(service.icon);
    assert.ok(!clash, `${service.id} and ${clash} both use ${service.icon}`);
    seen.set(service.icon, service.id);
  }
});

test("glyph names are the only thing a custom service can pick", () => {
  for (const name of PICKABLE) assert.ok(hasGlyph(name), `${name} is offered but missing`);
  assert.equal(normalizeCustom({ name: "X", template: "https://x.dev/{repo}", icon: "nope-not-real" }).icon, "sparkle");
  assert.equal(normalizeCustom({ name: "X", template: "https://x.dev/{repo}", icon: "mic" }).icon, "mic");
});

test("glyphMarkup produces self-contained, inert SVG", () => {
  const markup = glyphMarkup("bolt");
  assert.match(markup, /^<svg viewBox="0 0 16 16"/);
  assert.match(markup, /stroke="currentColor"/);
  assert.match(markup, /aria-hidden="true"/);
  assert.ok(markup.endsWith("</svg>"));
  // No scripts, no external references, no event handlers.
  assert.ok(!/script|href|xlink|on[a-z]+=/i.test(markup));

  // An unknown name still yields a usable glyph rather than nothing.
  assert.match(glyphMarkup("no-such-glyph"), /^<svg/);
});

test("every glyph is inert, not just the one we spot-check", () => {
  // These are the exact strings assigned to innerHTML in content.js and
  // options.js. Nothing a person can type reaches them — the name is always a
  // key into this table — but that is a claim, so it is checked.
  for (const [name, markup] of Object.entries(GLYPHS)) {
    assert.ok(!/script|href|xlink|on[a-z]+\s*=|javascript:|data:/i.test(markup), `${name} is not inert`);
  }

  const payload = buildPayload(settings(), {}, github());
  for (const service of items(payload)) {
    assert.ok(
      !/script|href|xlink|on[a-z]+\s*=|javascript:|data:/i.test(service.svg),
      `${service.id} ships markup that could execute`,
    );
  }
  assert.ok(!/script|href|xlink|on[a-z]+\s*=/i.test(payload.moreSvg), "moreSvg is not inert");
});

test("the payload carries the glyph, since the content script cannot import it", () => {
  const payload = buildPayload(settings(), {}, github());
  assert.match(payload.moreSvg, /^<svg/);

  for (const service of items(payload)) {
    assert.match(service.svg, /^<svg viewBox="0 0 16 16"/, `${service.id} has no glyph`);
    assert.equal(service.svg, glyphMarkup(CATALOG.find((s) => s.id === service.id).icon));
  }
});

test("a custom service gets a glyph too", () => {
  const payload = buildPayload(
    settings({ custom: [{ id: "x", name: "My viewer", template: "https://x.dev/{owner}/{repo}", icon: "compass" }] }),
    {},
    github(),
  );
  const custom = items(payload).find((s) => s.id === "custom:x");
  assert.equal(custom.svg, glyphMarkup("compass"));
});

test("the glyph set keeps its documented shape", () => {
  for (const [name, markup] of Object.entries(GLYPHS)) {
    assert.match(name, /^[a-z-]+$/, `${name} should be kebab-case`);
    assert.ok(markup.length > 20, `${name} looks empty`);
    assert.ok(!markup.includes("transition") && !markup.includes("animation"));
  }
  assert.ok(Object.keys(GLYPHS).length >= 32, "expected the full glyph set");
});
