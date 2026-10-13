import test from "node:test";
import assert from "node:assert/strict";

import { parseRepoUrl } from "../src/parse.js";
import {
  CATALOG,
  CATEGORIES,
  SERVICE_HOSTS,
  allServices,
  buildTarget,
  buildTargetFromUrl,
  customToService,
  expandTemplate,
  findService,
  initials,
  slugify,
} from "../src/catalog.js";
import { hasGlyph } from "../src/icons.js";
import { buildPayload } from "../src/payload.js";
import { DEFAULT_SETTINGS } from "../src/settings.js";

const root = () => parseRepoUrl("https://github.com/octocat/hello-world");
const blob = () => parseRepoUrl("https://github.com/octocat/hello-world/blob/main/lib/x.js");
const settings = (patch = {}) => ({ ...DEFAULT_SETTINGS, disabled: [...DEFAULT_SETTINGS.disabled], ...patch });

test("every category has a glyph that exists, and they are all different", () => {
  const seen = new Map();
  for (const category of CATEGORIES) {
    assert.ok(category.icon, `${category.id} has no icon`);
    assert.ok(hasGlyph(category.icon), `${category.id} → ${category.icon} is not in GLYPHS`);
    const clash = seen.get(category.icon);
    assert.ok(!clash, `${category.id} and ${clash} both use ${category.icon} — two headings would look alike`);
    seen.set(category.icon, category.id);
  }
});

test("every panel group ships a glyph, including the ones with no category", () => {
  const payload = buildPayload(settings(), { gitingest: 9 }, root());
  const labels = payload.groups.map((g) => g.label);
  assert.ok(labels.includes("Frequently used"), "expected the frequently-used section");

  for (const g of payload.groups) {
    assert.match(g.svg, /^<svg viewBox="0 0 16 16"/, `group "${g.label}" has no glyph`);
    assert.ok(!/script|href|xlink|on[a-z]+\s*=|javascript:|data:/i.test(g.svg), `group "${g.label}" ships live markup`);
  }
});

test("every catalog entry has the shape the UI relies on", () => {
  const ids = new Set();
  for (const service of CATALOG) {
    const where = service.id || service.name;
    assert.ok(service.id, "id");
    assert.ok(service.name, `name for ${where}`);
    assert.ok(service.abbr && service.abbr.length <= 3, `abbr for ${where}`);
    assert.match(service.color, /^#[0-9a-f]{6}$/i, `color for ${where}`);
    assert.ok(
      service.category === null || ["extra", "custom"].includes(service.category) || CATEGORIES.some((c) => c.id === service.category),
      `category for ${where}`,
    );
    assert.ok(service.blurb, `blurb for ${where}`);
    assert.ok(["url", "command", "link"].includes(service.kind), `kind for ${where}`);
    if (service.kind === "url" || service.kind === "link") assert.equal(typeof service.url, "function", `url for ${where}`);
    if (service.kind === "command") assert.equal(typeof service.command, "function", `command for ${where}`);
    assert.ok(!ids.has(service.id), `duplicate id ${service.id}`);
    ids.add(service.id);
  }
});

test("repo root targets", () => {
  const ctx = root();
  const expected = {
    gitingest: "https://gitingest.com/octocat/hello-world",
    gitmcp: "https://gitmcp.io/octocat/hello-world",
    githubgg: "https://www.github.gg/octocat/hello-world",
    gitsummarize: "https://gitsummarize.com/octocat/hello-world",
    gitreverse: "https://www.gitreverse.com/octocat/hello-world",
    gitdiagram: "https://gitdiagram.com/octocat/hello-world",
    githubdev: "https://github.dev/octocat/hello-world",
    vscodedev: "https://vscode.dev/github/octocat/hello-world",
    github1s: "https://github1s.com/octocat/hello-world",
    gitpod: "https://gitpod.io/#https://github.com/octocat/hello-world",
    stackblitz: "https://stackblitz.com/github/octocat/hello-world",
    codeflow: "https://pr.new/github.com/octocat/hello-world",
    bolt: "https://bolt.new/github.com/octocat/hello-world",
    githistory: "https://githistory.xyz/octocat/hello-world/commits/HEAD",
    sourcegraph: "https://sourcegraph.com/github.com/octocat/hello-world",
    ossinsight: "https://ossinsight.io/analyze/octocat/hello-world",
    starhistory: "https://www.star-history.com/#octocat/hello-world&Date",
    githubtracker: "https://githubtracker.com/octocat/hello-world",
    gitpodcast: "https://www.gitpodcast.com/octocat/hello-world",
  };

  for (const [id, url] of Object.entries(expected)) {
    const target = buildTarget(findService(CATALOG, id), ctx);
    assert.equal(target?.url, url, `${id} target`);
  }
});

test("a file view is path-aware where the service supports it", () => {
  const ctx = blob();

  // Path-aware services follow you into the folder or file.
  assert.equal(
    buildTarget(findService(CATALOG, "gitingest"), ctx).url,
    "https://gitingest.com/octocat/hello-world/tree/main/lib",
  );
  assert.equal(
    buildTarget(findService(CATALOG, "githubdev"), ctx).url,
    "https://github.dev/octocat/hello-world/blob/main/lib/x.js",
  );
  assert.equal(
    buildTarget(findService(CATALOG, "githistory"), ctx).url,
    "https://githistory.xyz/octocat/hello-world/blob/main/lib/x.js",
  );

  // Repo-level services deliberately stay at the root.
  assert.equal(buildTarget(findService(CATALOG, "ossinsight"), ctx).url, "https://ossinsight.io/analyze/octocat/hello-world");
  assert.equal(buildTarget(findService(CATALOG, "stackblitz"), ctx).url, "https://stackblitz.com/github/octocat/hello-world/tree/main");
});

test("command services produce runnable commands", () => {
  const ctx = root();
  assert.deepEqual(buildTarget(findService(CATALOG, "repomix"), ctx), {
    kind: "command",
    command: "npx repomix --remote https://github.com/octocat/hello-world",
  });
  assert.equal(
    buildTarget(findService(CATALOG, "gitingestcli"), ctx).command,
    "gitingest https://github.com/octocat/hello-world",
  );
  assert.match(
    buildTarget(findService(CATALOG, "code2prompt"), ctx).command,
    /^git clone https:\/\/github\.com\/octocat\/hello-world && code2prompt --path hello-world$/,
  );
});

test("GitHub-only services drop out on other hosts", () => {
  const ctx = parseRepoUrl("https://gitlab.com/group/project");

  for (const id of ["gitingest", "gitdiagram", "githubdev", "githistory", "ossinsight", "gitpodcast"]) {
    assert.equal(buildTarget(findService(CATALOG, id), ctx), null, `${id} should be hidden`);
  }
  // These work on any git host.
  for (const id of ["gitpod", "repomix", "gitingestcli", "code2prompt"]) {
    assert.ok(buildTarget(findService(CATALOG, id), ctx), `${id} should still work`);
  }
});

test("link-kind services always resolve", () => {
  for (const service of CATALOG.filter((s) => s.kind === "link")) {
    assert.ok(buildTarget(service, root())?.url, `${service.id} link`);
  }
});

test("templates expand, and an unknown placeholder is left alone", () => {
  const ctx = parseRepoUrl("https://github.com/octocat/hello-world/tree/main/src");
  assert.equal(
    expandTemplate("https://x.dev/{owner}/{repo}/{ref}/{path}", ctx),
    "https://x.dev/octocat/hello-world/main/src",
  );
  assert.equal(expandTemplate("https://x.dev/{nope}", ctx), "https://x.dev/{nope}");
  assert.equal(expandTemplate("https://x.dev/{url}", ctx), "https://x.dev/https://github.com/octocat/hello-world/tree/main/src");
});

test("custom services behave like built-ins", () => {
  const ctx = parseRepoUrl("https://github.com/octocat/hello-world/tree/main/src");
  const service = customToService({ id: "abc", name: "My viewer", template: "https://x.dev/{owner}/{repo}" });

  assert.equal(service.id, "custom:abc");
  assert.equal(service.abbr, "MV");
  assert.equal(service.category, "custom");
  assert.equal(buildTarget(service, ctx).url, "https://x.dev/octocat/hello-world");

  // An id that already carries the prefix is not double-prefixed.
  assert.equal(customToService({ id: "custom:x", name: "X", template: "https://x.dev" }).id, "custom:x");
});

test("buildTargetFromUrl works on a raw URL, and fails honestly", () => {
  const built = buildTargetFromUrl(findService(CATALOG, "gitingest"), "https://github.com/octocat/hello-world/tree/main");
  assert.equal(built.url, "https://gitingest.com/octocat/hello-world/tree/main");
  assert.equal(built.ctx.owner, "octocat");

  assert.equal(buildTargetFromUrl(findService(CATALOG, "gitingest"), "https://example.com"), null);
  assert.equal(buildTargetFromUrl(findService(CATALOG, "gitingest"), ""), null);
  assert.equal(buildTargetFromUrl(null, "https://github.com/a/b"), null);
});

test("SERVICE_HOSTS only point at real service ids", () => {
  for (const [host, id] of Object.entries(SERVICE_HOSTS)) {
    assert.ok(findService(CATALOG, id), `${host} → ${id} is not a known service`);
  }
});

test("allServices appends custom entries without mutating the catalog", () => {
  const before = CATALOG.length;
  const list = allServices([{ id: "x", name: "X", template: "https://x.dev/{repo}" }]);
  assert.equal(list.length, before + 1);
  assert.equal(list.at(-1).id, "custom:x");
  assert.equal(CATALOG.length, before);
});

test("monogram and slug helpers", () => {
  assert.equal(initials("GitIngest"), "GI");
  assert.equal(initials("VS Code for the Web"), "VC");
  assert.equal(initials("Sourcetrail"), "SO");
  assert.equal(initials(""), "??");
  assert.equal(slugify("My  Viewer!"), "my-viewer");
  assert.equal(slugify(""), "service");
});
