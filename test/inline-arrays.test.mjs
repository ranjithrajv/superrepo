import test from "node:test";
import assert from "node:assert/strict";

import { CATALOG, CATEGORIES, allServices, customToService } from "../src/catalog.js";
import {
  PIN_LIMIT,
  cleanCategoryIds,
  cleanDisabled,
} from "../src/inline-settings.js";
import {
  DEFAULT_SETTINGS,
} from "../src/settings.js";

const ids = new Set(CATEGORIES.map((c) => c.id));

test("a valid category list passes through unchanged", () => {
  assert.deepEqual(cleanCategoryIds(["prompt", "wiki"]), ["prompt", "wiki"]);
  assert.deepEqual(cleanCategoryIds([]), [], "an empty list is a real answer: no buttons");
});

test("category pins keep the order the user chose", () => {
  // Order is what the header shows, so it must survive — not be sorted.
  assert.deepEqual(cleanCategoryIds(["wiki", "prompt"]), ["wiki", "prompt"]);
});

test("unknown category ids are dropped, not stored", () => {
  const out = cleanCategoryIds(["prompt", "not-a-category", "wiki"]);
  assert.deepEqual(out, ["prompt", "wiki"]);
  for (const id of out) assert.ok(ids.has(id), `${id} should be a real category`);
});

test("a repeated category fills one slot, not two", () => {
  // Two ids for one category would put the same tool in the header twice.
  assert.deepEqual(cleanCategoryIds(["prompt", "prompt", "prompt"]), ["prompt"]);
});

test("a category list longer than the cap is truncated, not silently dropped later", () => {
  // resolveCategories breaks at PIN_LIMIT anyway; this makes the boundary
  // explicit at the point the message is handled.
  const many = CATEGORIES.map((c) => c.id);
  assert.ok(many.length >= PIN_LIMIT, "fixture needs at least PIN_LIMIT categories");
  assert.equal(cleanCategoryIds(many).length, PIN_LIMIT);
});

test("non-strings and non-arrays are refused outright", () => {
  for (const bad of [null, undefined, "prompt", 7, {}, { 0: "prompt" }]) {
    assert.equal(cleanCategoryIds(bad), null, `${JSON.stringify(bad)} should be refused`);
  }
});

test("disabled accepts real service ids and drops the rest", () => {
  const known = new Set(CATALOG.map((s) => s.id));
  assert.deepEqual(cleanDisabled(["gitingest", "not-a-service"], known), ["gitingest"]);
});

test("disabled may be emptied, which re-enables everything", () => {
  // Un-hiding the opt-in services is a legitimate action, so this is not a
  // refusal — but it must arrive as an explicit empty list, never a missing one.
  assert.deepEqual(cleanDisabled([], new Set(["gitingest"])), []);
});

test("disabled will not smuggle in an id that matches no service", () => {
  const known = new Set(CATALOG.map((s) => s.id));
  const out = cleanDisabled(["gitingest", "x", 42, null, { id: "nope" }, "gitmcp"], known);
  assert.deepEqual(out, ["gitingest", "gitmcp"]);
});

test("a custom service can be disabled, because it is in the known set", () => {
  const mine = customToService({ id: "mine", name: "Mine", template: "https://m.dev/{owner}/{repo}" });
  const known = new Set(allServices([mine]).map((s) => s.id));
  assert.deepEqual(cleanDisabled([mine.id, "not-real"], known), [mine.id]);
});

test("disabled falls back to the catalog when no known set is given", () => {
  assert.deepEqual(cleanDisabled(["gitingest"], undefined), ["gitingest"]);
  assert.deepEqual(cleanDisabled(["not-real"], undefined), []);
});

test("non-arrays are refused for disabled too", () => {
  for (const bad of [null, undefined, "gitingest", 3, {}]) {
    assert.equal(cleanDisabled(bad), null, `${JSON.stringify(bad)} should be refused`);
  }
});

test("the default categoryIds survive their own validator", () => {
  assert.deepEqual(
    cleanCategoryIds(DEFAULT_SETTINGS.categoryIds),
    DEFAULT_SETTINGS.categoryIds,
    "the shipped default must be valid under the rule that guards user input",
  );
});