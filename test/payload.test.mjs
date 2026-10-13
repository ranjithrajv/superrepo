import test from "node:test";
import assert from "node:assert/strict";

import { parseRepoUrl } from "../src/parse.js";
import { buildPayload } from "../src/payload.js";
import { DEFAULT_SETTINGS } from "../src/settings.js";

const github = () => parseRepoUrl("https://github.com/octocat/hello-world");
const gitlab = () => parseRepoUrl("https://gitlab.com/group/project");
const settings = (patch = {}) => ({
  ...DEFAULT_SETTINGS,
  disabled: [...DEFAULT_SETTINGS.disabled],
  ...patch,
});

/**
 * Pin-by-name is the non-default mode now, so tests about pinning services have
 * to ask for it. Without this they would silently be testing category
 * resolution and passing for the wrong reason.
 */
const byService = (patch = {}) => settings({ pinMode: "services", ...patch });

const items = (payload) => payload.groups.flatMap((group) => group.items);

test("payload describes the repo and the page", () => {
  const payload = buildPayload(settings(), {}, github());
  assert.equal(payload.ok, true);
  assert.equal(payload.repo, "octocat/hello-world");
  assert.equal(payload.meta, "github.com · repo root");
  assert.equal(payload.settings.placement, "auto");
  assert.equal(payload.settings.buttonStyle, "icon", "buttons are icon-only by default");

  // The content script renders from these, so they must survive the payload.
  assert.equal(buildPayload(settings({ buttonStyle: "labeled" }), {}, github()).settings.buttonStyle, "labeled");
  assert.equal(buildPayload(settings({ buttonStyle: "monogram" }), {}, github()).settings.buttonStyle, "monogram");

  // A file view reports the ref and path.
  const blob = buildPayload(settings(), {}, parseRepoUrl("https://github.com/octocat/hello-world/blob/main/lib/x.js"));
  assert.equal(blob.meta, "github.com · main · lib/x.js");
});

test("only services that work here are included", () => {
  const payload = buildPayload(settings(), {}, github());
  assert.equal(items(payload).length, 23);

  const ids = items(payload).map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "no duplicates");
  assert.ok(!ids.includes("octotree"), "opt-in services stay out");
  assert.ok(ids.includes("repomix"), "command services are in by default");
});

test("every item carries a resolved target", () => {
  const payload = buildPayload(settings(), {}, github());
  for (const service of items(payload)) {
    assert.ok(service.target, `${service.id} has no target`);
    if (service.target.kind === "command") assert.ok(service.target.command, `${service.id} command`);
    else assert.ok(/^https?:\/\//.test(service.target.url), `${service.id} url`);
  }
});

test("every item carries an abbr, so the monogram style can always render", () => {
  const payload = buildPayload(settings(), {}, github());
  for (const service of items(payload)) {
    assert.ok(service.abbr, `${service.id} has no abbr`);
    assert.ok(service.abbr.length <= 3, `${service.id} abbr is too long: ${service.abbr}`);
  }

  // Custom services derive one from their name.
  const custom = buildPayload(
    settings({ custom: [{ id: "y", name: "My viewer", template: "https://y.dev/{owner}/{repo}" }] }),
    {},
    github(),
  );
  assert.equal(items(custom).find((s) => s.id === "custom:y").abbr, "MV");
});

test("GitHub-only services disappear on another host", () => {
  const payload = buildPayload(settings(), {}, gitlab());
  const ids = items(payload).map((s) => s.id);

  assert.deepEqual(ids.sort(), ["code2flow", "code2prompt", "gitingestcli", "gitpod", "repomix"]);
  assert.ok(!ids.includes("gitdiagram"));
});

test("primary buttons follow the setting, with a sensible fallback", () => {
  const configured = buildPayload(byService(), {}, github());
  assert.deepEqual(
    configured.primary.map((s) => s.id),
    ["gitingest", "gitdiagram", "gitmcp", "githubdev"],
  );

  // Nothing pinned: fall back to the first four that work here.
  const empty = buildPayload(byService({ primaryIds: [] }), {}, github());
  assert.deepEqual(
    empty.primary.map((s) => s.id),
    ["gitingest", "gitmcp", "githubgg", "gitsummarize"],
  );

  // Pinned buttons that do not exist on this page are dropped, not shown broken.
  const unavailable = buildPayload(byService({ primaryIds: ["gitmcp", "gitdiagram"] }), {}, gitlab());
  for (const service of unavailable.primary) {
    assert.ok(items(unavailable).some((s) => s.id === service.id), `${service.id} must be available`);
  }
  assert.deepEqual(
    unavailable.primary.map((s) => s.id),
    ["code2flow", "gitpod", "repomix", "gitingestcli"],
  );
});

test("frequently used leads, ordered by count", () => {
  const payload = buildPayload(settings(), { gitmcp: 5, gitingest: 2 }, github());
  assert.equal(payload.groups[0].label, "Frequently used");
  assert.deepEqual(
    payload.groups[0].items.map((s) => s.id),
    ["gitmcp", "gitingest"],
  );

  // ...and they are not repeated in their own category.
  const rest = payload.groups.slice(1).flatMap((g) => g.items.map((s) => s.id));
  assert.ok(!rest.includes("gitmcp"));
  assert.ok(!rest.includes("gitingest"));
  assert.equal(items(payload).length, 23);
});

test("no usage means no frequently-used section", () => {
  const payload = buildPayload(settings(), {}, github());
  assert.equal(payload.groups[0].label, "Prompt-ready digest");
});

test("hiding commands removes them from the panel and the count", () => {
  const payload = buildPayload(settings({ showCommands: false }), {}, github());
  const ids = items(payload).map((s) => s.id);
  assert.equal(ids.length, 19, "23 minus the four command services");
  for (const id of ["repomix", "gitingestcli", "code2prompt", "code2flow"]) {
    assert.ok(!ids.includes(id), `${id} should be hidden`);
  }
});

test("a hidden service never becomes a button", () => {
  // Pin by name: hiding the pinned service just drops the button.
  const named = buildPayload(
    byService({ disabled: [...DEFAULT_SETTINGS.disabled, "gitingest"], primaryIds: ["gitingest", "gitmcp"] }),
    {},
    github(),
  );
  assert.deepEqual(named.primary.map((s) => s.id), ["gitmcp"]);
  assert.ok(!items(named).some((s) => s.id === "gitingest"));

  // By category: the group still needs filling, so it moves to the next service
  // in that category rather than showing a hidden one.
  const grouped = buildPayload(
    settings({ disabled: [...DEFAULT_SETTINGS.disabled, "gitdiagram"] }),
    {},
    github(),
  );
  assert.ok(!items(grouped).some((s) => s.id === "gitdiagram"), "gitdiagram is not offered anywhere");
  const aiSlot = grouped.primary.find((s) => s.category === "diagram");
  assert.ok(aiSlot, "the prompt group still fills its slot");
  assert.notEqual(aiSlot.id, "gitdiagram", "but not with the hidden service");
  assert.equal(grouped.primary.length, 7, "and the header keeps every other group");
});

test("custom services reach the panel with their template resolved", () => {
  const payload = buildPayload(
    settings({ custom: [{ id: "x", name: "My viewer", template: "https://x.dev/{owner}/{repo}" }] }),
    {},
    github(),
  );
  const custom = items(payload).find((s) => s.id === "custom:x");
  assert.ok(custom, "custom service missing");
  assert.equal(custom.target.url, "https://x.dev/octocat/hello-world");
  assert.ok(!payload.groups.some((g) => g.label === "Your own") === false);
});
