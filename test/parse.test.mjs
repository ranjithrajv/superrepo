import test from "node:test";
import assert from "node:assert/strict";

import { parseRepoUrl, normalizeInput, describePage } from "../src/parse.js";

test("repo root", () => {
  const ctx = parseRepoUrl("https://github.com/octocat/hello-world");
  assert.equal(ctx.owner, "octocat");
  assert.equal(ctx.repo, "hello-world");
  assert.equal(ctx.ownerSlashRepo, "octocat/hello-world");
  assert.equal(ctx.type, "repo");
  assert.equal(ctx.ghSuffix, "");
  assert.equal(ctx.pathSuffix, "");
  assert.equal(ctx.ingestSuffix, "");
  assert.equal(ctx.isGitHub, true);
  assert.equal(ctx.repoUrl, "https://github.com/octocat/hello-world");
  assert.equal(ctx.webUrl, "https://github.com/octocat/hello-world");
});

test("directory view keeps ref and path", () => {
  const ctx = parseRepoUrl("https://github.com/octocat/hello-world/tree/main/src/utils");
  assert.equal(ctx.type, "tree");
  assert.equal(ctx.ref, "main");
  assert.equal(ctx.path, "src/utils");
  assert.equal(ctx.ghSuffix, "/tree/main/src/utils");
  assert.equal(ctx.pathSuffix, "/tree/main/src/utils");
  assert.equal(ctx.ingestSuffix, "/tree/main/src/utils");
});

test("file view narrows GitIngest to the containing folder", () => {
  const ctx = parseRepoUrl("https://github.com/octocat/hello-world/blob/main/lib/x.js");
  assert.equal(ctx.type, "blob");
  assert.equal(ctx.path, "lib/x.js");
  assert.equal(ctx.ghSuffix, "/blob/main/lib/x.js");
  assert.equal(ctx.pathSuffix, "/blob/main/lib/x.js");
  assert.equal(ctx.ingestSuffix, "/tree/main/lib");
});

test("file at the repo root has no folder to narrow to", () => {
  const ctx = parseRepoUrl("https://github.com/octocat/hello-world/blob/main/README.md");
  assert.equal(ctx.ingestSuffix, "/tree/main");
});

test("branch without a path still narrows to the branch", () => {
  const ctx = parseRepoUrl("https://github.com/octocat/hello-world/tree/dev");
  assert.equal(ctx.ref, "dev");
  assert.equal(ctx.path, "");
  assert.equal(ctx.ingestSuffix, "/tree/dev");
});

test("non-directory pages parse but drop path suffixes", () => {
  const pr = parseRepoUrl("https://github.com/octocat/hello-world/pull/12");
  assert.equal(pr.type, "pull");
  assert.equal(pr.ghSuffix, "/pull/12");
  assert.equal(pr.pathSuffix, "");
  assert.equal(pr.ingestSuffix, "");

  const issues = parseRepoUrl("https://github.com/octocat/hello-world/issues/3");
  assert.equal(issues.type, "issues");

  const commits = parseRepoUrl("https://github.com/octocat/hello-world/commits/main");
  assert.equal(commits.type, "commits");

  const weird = parseRepoUrl("https://github.com/octocat/hello-world/not-a-real-page");
  assert.equal(weird.type, "other");
});

test("shorthand, bare hosts and remotes all normalise", () => {
  assert.equal(parseRepoUrl("octocat/hello-world").repoUrl, "https://github.com/octocat/hello-world");
  assert.equal(parseRepoUrl("github.com/octocat/hello-world").isGitHub, true);

  const ssh = parseRepoUrl("git@github.com:octocat/hello-world.git");
  assert.equal(ssh.repo, "hello-world");
  assert.equal(ssh.repoUrl, "https://github.com/octocat/hello-world");

  assert.equal(parseRepoUrl("https://github.com/octocat/hello-world.git").repo, "hello-world");

  // Pasting from markdown or chat picks up wrappers.
  assert.equal(parseRepoUrl("(https://github.com/octocat/hello-world)").repo, "hello-world");
  assert.equal(parseRepoUrl("<https://github.com/octocat/hello-world>").repo, "hello-world");
  assert.equal(parseRepoUrl("https://github.com/octocat/hello-world/").repo, "hello-world");
});

test("other hosts parse and are flagged as not GitHub", () => {
  const ctx = parseRepoUrl("https://gitlab.com/group/project");
  assert.equal(ctx.host, "gitlab.com");
  assert.equal(ctx.isGitHub, false);
  assert.equal(ctx.repoUrl, "https://gitlab.com/group/project");

  assert.equal(parseRepoUrl("https://codeberg.org/team/app").isGitHub, false);
});

test("www is stripped, line numbers are captured", () => {
  assert.equal(parseRepoUrl("https://www.github.com/octocat/hello-world").host, "github.com");
  const ctx = parseRepoUrl("https://github.com/octocat/hello-world/blob/main/x.js#L42");
  assert.equal(ctx.line, 42);
  assert.equal(describePage(ctx), "main · x.js · line 42");
});

test("GitHub's own top-level paths are not repos", () => {
  // Without this the in-page buttons would appear on settings pages.
  const reserved = [
    "https://github.com/settings/profile",
    "https://github.com/orgs/acme/people",
    "https://github.com/notifications/subscriptions",
    "https://github.com/marketplace/actions/checkout",
    "https://github.com/topics/javascript",
    "https://github.com/sponsors/octocat",
    "https://github.com/search/advanced",
  ];
  for (const url of reserved) {
    assert.equal(parseRepoUrl(url), null, `expected null for ${url}`);
  }

  // A repo whose owner happens to be a plausible word still works.
  const ok = parseRepoUrl("https://github.com/torvalds/linux");
  assert.equal(ok.owner, "torvalds");
  assert.equal(ok.repo, "linux");

  // The same words are fine as a repo name or as a sub-page.
  assert.equal(parseRepoUrl("https://github.com/octocat/settings").repo, "settings");
  assert.equal(parseRepoUrl("https://github.com/octocat/hello-world/stargazers").type, "stargazers");
});

test("garbage is rejected rather than guessed at", () => {
  const bad = [
    "",
    "   ",
    "not a url",
    "https://github.com",
    "https://github.com/only-owner",
    "mailto:someone@example.com",
    "javascript:alert(1)",
    "file:///etc/passwd",
  ];
  for (const input of bad) {
    assert.equal(parseRepoUrl(input), null, `expected null for ${JSON.stringify(input)}`);
  }
});

test("normalizeInput returns null for empty input", () => {
  assert.equal(normalizeInput(null), null);
  assert.equal(normalizeInput(undefined), null);
  assert.equal(normalizeInput("  "), null);
});
