import test from "node:test";
import assert from "node:assert/strict";

import { parseRepoUrl } from "../src/parse.js";
import { buildPayload, resolveCategoryDefault } from "../src/payload.js";
import { CATEGORIES, customToService } from "../src/catalog.js";
import { DEFAULT_SETTINGS } from "../src/settings.js";

const settings = (patch = {}) => ({ ...DEFAULT_SETTINGS, disabled: [...DEFAULT_SETTINGS.disabled], ...patch });
const github = () => parseRepoUrl("https://github.com/octocat/hello-world");

const inCategory = (id, patch) => {
  const payload = buildPayload(settings(patch), {}, github());
  return payload.groups.flatMap((g) => g.items).filter((s) => s.category === id);
};

/**
 * A category that actually has something to choose between.
 *
 * Naming one by hand broke the moment the catalog changed shape — "prompt" held
 * two services for months and now holds one, which made the ordering assertions
 * below vacuous. Deriving it means a category gaining or losing a member leaves
 * these tests still asking the question they were written to ask.
 */
const crowded = () => {
  const payload = buildPayload(settings(), {}, github());
  const counts = new Map();
  for (const s of payload.groups.flatMap((g) => g.items)) {
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }
  const id = [...counts].find(([, n]) => n > 2)?.[0];
  assert.ok(id, "no category has more than two services to choose between");
  return id;
};

test("with no history, the default is catalog order", () => {
  const id = crowded();
  const services = inCategory(id);
  assert.ok(services.length > 1, "needs more than one service in the category to mean anything");
  assert.equal(resolveCategoryDefault(id, services).id, services[0].id);
});

test("an explicit per-category pick beats both usage and catalog order", () => {
  const id = crowded();
  const services = inCategory(id);
  const favourite = services.at(-1);
  const resolved = resolveCategoryDefault(id, services, { [id]: favourite.id }, {
    [services[0].id]: 99,
  });
  assert.equal(resolved.id, favourite.id, "the explicit pick must win over the most-clicked");
});

test("the most-clicked wins when there is no explicit pick", () => {
  const id = crowded();
  const services = inCategory(id);
  const favourite = services.at(-1);
  const resolved = resolveCategoryDefault(id, services, {}, { [favourite.id]: 12 });
  assert.equal(resolved.id, favourite.id);
});

test("a pick for a service that is not available falls back rather than blanking", () => {
  // The chosen service can be disabled, or removed as a custom service.
  const id = crowded();
  const services = inCategory(id);
  const resolved = resolveCategoryDefault(id, services, { [id]: "no-such-service" }, {});
  assert.ok(resolved, "must still resolve to something");
  assert.equal(resolved.id, services[0].id);
});

test("an empty category resolves to null instead of throwing", () => {
  assert.equal(resolveCategoryDefault("prompt", []), null);
  assert.equal(resolveCategoryDefault("prompt", undefined), null);
});

test("a custom service can be the default for its category", () => {
  const mine = customToService({ id: "x", name: "My viewer", template: "https://x.dev/{owner}/{repo}" });
  assert.equal(mine.category, "custom");
  const resolved = resolveCategoryDefault("custom", [mine], {});
  assert.equal(resolved.id, mine.id);
});

test("the label the options page shows matches the button the header renders", () => {
  // The point of sharing the resolver: for every category, what the options page
  // calls the default must be what the header actually shows.
  for (const category of CATEGORIES) {
    const services = inCategory(category.id);
    if (!services.length) continue;
    const label = resolveCategoryDefault(category.id, services, {});

    const payload = buildPayload(settings(), {}, github());
    const primaryIds = payload.primary.map((s) => s.id);
    const labelId = label.id;

    // Either the header shows this exact service, or the category is not pinned.
    if (payload.settings.pinMode === "categories" && settings().categoryIds.includes(category.id)) {
      assert.ok(
        primaryIds.includes(labelId),
        `${category.id}: the options page says the default is ${labelId}, ` +
          `but the header shows ${primaryIds.join(", ")}`,
      );
    }
  }
});