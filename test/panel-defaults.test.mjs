import test from "node:test";
import assert from "node:assert/strict";

import { parseRepoUrl } from "../src/parse.js";
import { buildPayload } from "../src/payload.js";
import { CATEGORIES } from "../src/catalog.js";
import {
  mergeCategoryDefaults,
} from "../src/inline-settings.js";
import {
  DEFAULT_SETTINGS,
} from "../src/settings.js";

const settings = (patch = {}) => ({ ...DEFAULT_SETTINGS, disabled: [...DEFAULT_SETTINGS.disabled], ...patch });
const github = () => parseRepoUrl("https://github.com/octocat/hello-world");
const payload = (patch, usage) => buildPayload(settings(patch), usage ?? {}, github());

test("the panel is told about every category it could offer a default for", () => {
  // Choosing a default moved from the options page to this picker, so the
  // payload has to describe the categories and their options or the rows cannot
  // render at all.
  const { categories } = payload();
  assert.ok(categories.length > 0, "no categories reached the panel");

  for (const category of categories) {
    assert.ok(category.id, "a category has no id");
    assert.ok(category.label, `${category.id} has no label`);
    assert.ok(category.options.length > 0, `${category.id} was offered with no options`);
    assert.ok(
      category.options.some((o) => o.id === category.current),
      `${category.id}: current ${category.current} is not one of its options`,
    );
  }
});

test("only categories with an available service are offered", () => {
  for (const category of payload({ showCommands: false }).categories) {
    assert.ok(category.options.length > 0, `${category.id} cannot be filled`);
  }
  // "Local command line" is all command services, so hiding them must drop it
  // rather than leave a row that cannot be filled.
  const hidden = payload({ showCommands: false }).categories.map((c) => c.id);
  assert.ok(!hidden.includes("cli"), "a category with nothing enabled should not be offered");
});

test("an explicit default is reported as current", () => {
  const prompt = payload().categories.find((c) => c.id === "agent");
  const chosen = prompt.options.at(-1).id;
  const pinned = payload({ categoryDefaults: { agent: chosen } }).categories.find((c) => c.id === "agent");
  assert.equal(pinned.current, chosen);
});

test("every category reports a current default that resolves to a real name", () => {
  // The header shows "Automatic — <name>", so `current` has to name a service
  // that is actually in the list. A dangling id would render as "Automatic —"
  // with nothing after it.
  for (const category of payload().categories) {
    assert.ok(category.current, `${category.id} reports no current default`);
    assert.ok(
      category.options.some((o) => o.id === category.current),
      `${category.id}: current "${category.current}" is not among its options`,
    );
  }
});

test("each group carries its category id, or the header has no picker", () => {
  // renderList maps groups into a new shape; `category` has to survive that or
  // the picker silently renders nothing on every group.
  for (const group of payload().groups) {
    if (["Frequently used", "More views", "Your own"].includes(group.label)) {
      assert.equal(group.category, null, `${group.label} is not a category and needs no picker`);
    } else {
      const category = payload().categories.find((c) => c.label === group.label);
      assert.ok(category, `group "${group.label}" has no category`);
      assert.equal(group.category, category.id, `group "${group.label}" lost its category id`);
    }
  }
});

test("the panel is told which categories have an explicit pick", () => {
  const prompt = payload().categories.find((c) => c.id === "agent");
  const chosen = prompt.options[0].id;
  const out = payload({ categoryDefaults: { prompt: chosen } });
  assert.equal(out.categoryDefaults.prompt, chosen);
});

test("a default for a category is merged, not replaced", () => {
  // The panel sends one category at a time. A replace would blank the others.
  const start = { prompt: "gitingest", wiki: "deepwikiopen" };
  const next = mergeCategoryDefaults(start, { prompt: "gitingest" });
  assert.deepEqual(next, { prompt: "gitingest", wiki: "deepwikiopen" });
});

test("an unknown category in a patch is refused", () => {
  const next = mergeCategoryDefaults({}, { nope: "gitingest" });
  assert.deepEqual(next, {}, "a category that does not exist must not be written");
  assert.ok(
    !Object.keys(next).some((k) => !CATEGORIES.some((c) => c.id === k)),
    "no invented category ids may appear",
  );
});

test("a non-string service id is refused", () => {
  for (const bad of [null, 1, {}, [], true, undefined]) {
    const next = mergeCategoryDefaults({}, { prompt: bad });
    assert.deepEqual(next, {}, `${JSON.stringify(bad)} should not be stored`);
  }
});

test("only one service can be pinned per category", () => {
  // categoryDefaults is keyed by category, so a second pin in the same group
  // replaces the first rather than adding a second. This is the property the
  // panel's pin relies on, and it is structural rather than checked somewhere.
  const prompt = payload().categories.find((c) => c.id === "agent");
  const [first, second] = prompt.options.map((o) => o.id);

  const after = mergeCategoryDefaults({ agent: first }, { agent: second });
  assert.equal(after.agent, second, "the newer pin wins");
  assert.equal(Object.keys(after).length, 1, "still exactly one entry");

  // And it survives the whole way to storage, as one entry per category.
  const stored = payload({ categoryDefaults: { agent: second, wiki: "deepwikiopen" } });
  assert.deepEqual(Object.keys(stored.categoryDefaults).sort(), ["agent", "wiki"]);
});

test("unpinning a category clears it rather than pointing at nothing", () => {
  const cleared = mergeCategoryDefaults({ prompt: "gitingest", wiki: "deepwikiopen" }, { prompt: "" });
  assert.equal(cleared.prompt, undefined, "an empty value removes the pin so the category goes automatic");
  assert.equal(cleared.wiki, "deepwikiopen", "clearing one category must not touch the others");
});

test("an array or primitive patch leaves the map alone", () => {
  assert.deepEqual(mergeCategoryDefaults({ prompt: "gitingest" }, ["x"]), { prompt: "gitingest" });
  assert.deepEqual(mergeCategoryDefaults({ prompt: "gitingest" }, null), { prompt: "gitingest" });
  assert.deepEqual(mergeCategoryDefaults({ prompt: "gitingest" }, "prompt=gitingest"), { prompt: "gitingest" });
});

test("the pick survives and drives the header button", () => {
  const base = payload();
  const prompt = base.categories.find((c) => c.id === "prompt");
  const chosen = prompt.options.at(-1);
  const after = payload({ categoryDefaults: { prompt: chosen.id } });

  assert.ok(
    after.primary.some((s) => s.id === chosen.id),
    `the header should now show ${chosen.id}, it shows ${after.primary.map((s) => s.id).join(", ")}`,
  );
});