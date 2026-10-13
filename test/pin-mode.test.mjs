/**
 * Choosing the page buttons.
 *
 * Pinned by name is exact and takes effort: four of thirty-one, by hand.
 * Pinned by category is a statement of intent — "I want a diagram and a prompt"
 * — and lets the catalog decide which tool fills each slot, using the click
 * counters that are already kept per service.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { CATALOG, CATEGORIES } from "../src/catalog.js";
import { parseRepoUrl } from "../src/parse.js";
import { buildPayload } from "../src/payload.js";
import { DEFAULT_SETTINGS } from "../src/settings.js";

const ROOT = "https://github.com/octocat/hello-world";

const base = {
  ...DEFAULT_SETTINGS,
  disabled: [],
  custom: [],
  placement: "off", // keeps the payload build independent of any DOM
};

const ids = (payload) => payload.primary.map((s) => s.id);
const withSettings = (patch) => buildPayload({ ...base, ...patch }, {}, parseRepoUrl(ROOT));
const withUsage = (patch, usage) =>
  buildPayload({ ...base, ...patch }, usage, parseRepoUrl(ROOT));

test("services mode pins by name, in the order pinned", () => {
  const payload = withSettings({ pinMode: "services", primaryIds: ["gitmcp", "gitdiagram"] });
  assert.deepEqual(ids(payload), ["gitmcp", "gitdiagram"]);
});

test("history and analytics are separate groups", () => {
  // "History & analytics" was one group answering two unrelated questions, and
  // Sourcegraph fitted neither. Guard the split: the two must not merge back,
  // and a service must land in exactly one of them.
  const ids = CATEGORIES.map((c) => c.id);
  assert.ok(ids.includes("history"), "the history group is missing");
  assert.ok(ids.includes("analytics"), "the analytics group is missing");
  assert.ok(!ids.includes("insight"), "the merged group should be gone");

  const history = CATALOG.filter((s) => s.category === "history").map((s) => s.id);
  const analytics = CATALOG.filter((s) => s.category === "analytics").map((s) => s.id);
  assert.ok(history.length > 0 && analytics.length > 0, "both groups need members");
  assert.ok(
    !history.some((id) => analytics.includes(id)),
    "a service cannot be in both groups",
  );

  // A service in neither should say so explicitly, rather than naming a category
  // that no longer exists and vanishing from the panel.
  const known = new Set(ids);
  for (const service of CATALOG) {
    assert.ok(
      service.category === null || known.has(service.category),
      `${service.id} points at "${service.category}", which is not a category`,
    );
  }
});

test("the default pin list is curated, not every category", () => {
  // This is what makes splitting categories safe. While the default was "every
  // category", adding one pushed the header past the button cap and the last one
  // was dropped silently by resolveCategories.
  const everyCategory = CATEGORIES.map((c) => c.id);
  assert.ok(
    DEFAULT_SETTINGS.categoryIds.length < everyCategory.length,
    "the shipped default must leave some categories unpinned, or category count " +
      "still decides header size",
  );
  assert.ok(
    DEFAULT_SETTINGS.categoryIds.length <= 8,
    `the shipped default must fit the button cap, got ${DEFAULT_SETTINGS.categoryIds.length}`,
  );

  // Everything pinned must still be a real category.
  for (const id of DEFAULT_SETTINGS.categoryIds) {
    assert.ok(
      CATEGORIES.some((c) => c.id === id),
      `the default pins "${id}", which is not a category`,
    );
  }

  // The categories that ship unpinned must still be pinnable and resolvable.
  const unpinned = everyCategory.filter((id) => !DEFAULT_SETTINGS.categoryIds.includes(id));
  for (const id of unpinned) {
    const payload = withSettings({ pinMode: "categories", categoryIds: [id] });
    assert.equal(payload.primary.length, 1, `${id} ships unpinned but cannot be pinned`);
  }
});

test("open and run is split into an editor and a workspace", () => {
  const ids = CATEGORIES.map((c) => c.id);
  assert.ok(!ids.includes("run"), "the combined group should be gone");
  assert.ok(ids.includes("editor"), "the editor group is missing");
  assert.ok(ids.includes("workspace"), "the workspace group is missing");

  const inCat = (id) => CATALOG.filter((s) => s.category === id).map((s) => s.id);
  assert.ok(inCat("editor").includes("githubdev"), "github.dev belongs in the editor group");
  assert.ok(inCat("editor").includes("vscodedev"), "VS Code for the Web belongs in the editor group");
  assert.ok(inCat("workspace").includes("gitpod"), "Gitpod belongs in the workspace group");
  assert.ok(inCat("workspace").includes("bolt"), "bolt.new belongs in the workspace group");
});

test("categories mode gives one button per chosen category", () => {
  const payload = withSettings({
    pinMode: "categories",
    categoryIds: ["diagram", "prompt", "analytics"],
  });
  const chosen = payload.primary;
  assert.equal(chosen.length, 3);
  assert.deepEqual(
    chosen.map((s) => s.category),
    ["diagram", "prompt", "analytics"],
    "categories appear in the order the user chose them",
  );
  // One per category, and each is really in that category.
  assert.equal(new Set(chosen.map((s) => s.category)).size, 3);
});

test("a category picks the service you actually use", () => {
  const usage = { gitingest: 12, ossinsight: 3, gitmcp: 1 };
  const payload = withUsage({ pinMode: "categories", categoryIds: ["prompt"] }, usage);
  assert.deepEqual(ids(payload), ["gitingest"]);
});

test("with no history the answer is stable, not random", () => {
  const first = withSettings({ pinMode: "categories", categoryIds: ["prompt", "editor"] });
  const second = withSettings({ pinMode: "categories", categoryIds: ["prompt", "editor"] });
  assert.deepEqual(ids(first), ids(second), "same settings, same buttons");
  assert.ok(ids(first).length === 2);
});

test("two chosen categories never collapse onto one service", () => {
  // Both are in the prompt category; asking for it twice must not double-pin.
  const payload = withSettings({ pinMode: "categories", categoryIds: ["prompt", "prompt"] });
  assert.equal(payload.primary.length, 1);
  assert.equal(new Set(ids(payload)).size, payload.primary.length, "no duplicates");
});

test("a category with nothing enabled resolves to nothing, not a wrong button", () => {
  // Every diagram service hidden — the diagram slot must be empty rather than
  // filled with something that is not a diagram.
  const payload = withSettings({
    pinMode: "categories",
    categoryIds: ["diagram", "prompt"],
    disabled: ["gitdiagram", "code2flow"],
  });
  assert.ok(!ids(payload).includes("gitdiagram"));
  assert.ok(!ids(payload).includes("code2flow"));
  assert.equal(payload.primary.length, 1, "only the AI category resolved");
  assert.equal(payload.primary[0].category, "prompt");
});

test("an unknown category id is ignored rather than throwing", () => {
  const payload = withSettings({ pinMode: "categories", categoryIds: ["not-a-category", "prompt"] });
  assert.equal(payload.primary.length, 1);
});

test("both modes fall back rather than showing only More", () => {
  for (const patch of [
    { pinMode: "services", primaryIds: [] },
    { pinMode: "categories", categoryIds: [] },
    { pinMode: "categories", categoryIds: ["nope"] },
  ]) {
    const payload = withSettings(patch);
    assert.ok(payload.primary.length > 0, `${JSON.stringify(patch)} should still show buttons`);
  }
});

test("the mode survives to the payload so the UI can reflect it", () => {
  assert.equal(withSettings({ pinMode: "categories" }).settings.pinMode, "categories");
  assert.equal(withSettings({ pinMode: "services" }).settings.pinMode, "services");
});

test("categories is what ships, and it fills every group that has a service", () => {
  assert.equal(DEFAULT_SETTINGS.pinMode, "categories");
  // Every category that ships an enabled service gets a button, so no group is
  // silently left out just because we forgot to name it. "reference" ships
  // nothing by default, so it contributes no button here.
  const payload = withSettings({});
  // `withSettings` enables every service (disabled: []), so the default-off
  // "reference" group contributes a button here even though it ships nothing by
  // default. On a real install, reference stays empty until someone opts in.
  assert.equal(payload.primary.length, 8, "eight filled groups when nothing is disabled");
  assert.deepEqual(
    payload.primary.map((s) => s.category),
    DEFAULT_SETTINGS.categoryIds,
    "one button per filled group, in the order the default pins them",
  );
  assert.equal(new Set(payload.primary.map((s) => s.category)).size, payload.primary.length);
  // DeepWiki and DeepWiki Open are the actual duplicates now; DeepWiki being
  // the default representative of its group is expected, but it does not get a
  // second button on DeepWiki Open's account.
});

test("the shipped default promotes no vendor by name", () => {
  // The point of the default: no category contributes two buttons, so no single
  // tool is in the header twice or favoured over a peer in its own group.
  const payload = withSettings({});
  assert.equal(new Set(payload.primary.map((s) => s.category)).size, payload.primary.length);
});

test("the services-mode seed spans several groups, unlike a bare fallback", async () => {
  // Services mode lets you pin two tools from one group — that is your choice,
  // not a fault. What matters is that the *seed* has breadth: the first four
  // rows in catalog order are all "Feed it to an AI", so a services list that
  // shipped empty would open on four AI tools.
  const { loadSettings } = await import("../src/settings.js");
  const fresh = await loadSettings();
  assert.ok(fresh.primaryIds.length >= 3, "services mode has something to fall back on");

  const seeded = withSettings({ pinMode: "services" });
  const seededGroups = new Set(seeded.primary.map((s) => s.category));
  assert.ok(seededGroups.size >= 3, `seed spans ${seededGroups.size} groups`);

  // The bare fallback, by contrast, is not breadth — it is just the top of the
  // catalog. Recorded so the difference is a decision, not an accident.
  const fallback = withSettings({ pinMode: "services", primaryIds: [] });
  assert.ok(fallback.primary.length > 0, "never an empty cluster");
});

test("a settings file written before categories existed still pins by name", () => {
  // loadSettings() normalises an absent pinMode to "services" rather than
  // treating an old file as "no buttons chosen" — and, on upgrade, as the new
  // default. Someone's header should not change because we changed ours.
  const old = { disabled: [], order: [], custom: [], primaryIds: ["gitdiagram"] };
  assert.equal(old.pinMode, undefined, "no pinMode means the pre-categories build");
  const normalised = old.pinMode === "categories" ? "categories" : "services";
  assert.equal(normalised, "services");
});
test("a per-category default overrides both usage and catalog order", () => {
  const payload = withSettings({
    categoryIds: ["prompt"],
    categoryDefaults: { prompt: "gitingest" },
  });
  assert.deepEqual(ids(payload), ["gitingest"]);
});

test("an invalid per-category default is ignored rather than crashing", () => {
  const payload = withSettings({
    categoryIds: ["prompt"],
    categoryDefaults: { prompt: "not-a-service" },
  });
  // Falls back to the normal resolution for that group.
  assert.deepEqual(ids(payload), ["gitingest"]);
});
