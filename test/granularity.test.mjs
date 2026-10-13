/**
 * The file-level job.
 *
 * On a file view the catalog deliberately does different things: GitIngest gets
 * the containing folder, Git History gets the file, OSS Insight stays at the repo. That
 * is the one capability a native substitute can't reach — GitHub's `.` key is
 * repo-level and Copilot needs you inside the editor — so it should be correct
 * and it should be visible.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { parseRepoUrl } from "../src/parse.js";
import { buildTarget, findService, CATALOG } from "../src/catalog.js";
import { buildPayload, granularityFor } from "../src/payload.js";

const settings = {
  openTarget: "newTab",
  showCommands: true,
  disabled: [],
  order: [],
  custom: [],
  primaryIds: ["gitingest", "gitdiagram", "ossinsight", "githubdev"],
  placement: "auto",
  buttonStyle: "icon",
};

const FILE = "https://github.com/octocat/hello-world/blob/main/lib/x.js";
const DIR = "https://github.com/octocat/hello-world/tree/main/lib";
const ROOT = "https://github.com/octocat/hello-world";

const svc = (id, raw) => findService(CATALOG, id) && buildTarget(findService(CATALOG, id), parseRepoUrl(raw));
const gran = (id, raw) => granularityFor(svc(id, raw), parseRepoUrl(raw));

test("granularity reflects what the rewrite rule actually produces", () => {
  // A file view: three different services, three different slices.
  assert.equal(gran("gitingest", FILE), "folder", "GitIngest ingests a directory");
  assert.equal(gran("githistory", FILE), "file", "Git History takes a blob");
  assert.equal(gran("ossinsight", FILE), "repo", "OSS Insight only accepts a repo");
});

test("on a repo root every url row is the whole repo", () => {
  for (const id of ["gitingest", "githistory", "ossinsight", "gitdiagram", "githubdev"]) {
    assert.equal(gran(id, ROOT), "repo", `${id} at repo root`);
  }
});

test("a directory view is a folder, not a file", () => {
  assert.equal(gran("gitingest", DIR), "folder");
  assert.equal(gran("githistory", DIR), "folder");
  assert.equal(gran("ossinsight", DIR), "repo");
});

test("a command row is labelled as a command, not a slice of the repo", () => {
  assert.equal(gran("repomix", FILE), "command");
  assert.equal(granularityFor(null, parseRepoUrl(FILE)), "repo");
});

test("the payload carries the page as the user is looking at it", () => {
  const payload = buildPayload(settings, {}, parseRepoUrl(FILE));
  assert.equal(payload.page.url, FILE, "the copy action targets the page, not a rewrite of it");
  assert.equal(payload.page.type, "blob");
  assert.equal(payload.page.isView, true);

  const root = buildPayload(settings, {}, parseRepoUrl(ROOT));
  assert.equal(root.page.isView, false, "no file action on a repo root");
});

test("every row is labelled, and the label agrees with its target", () => {
  for (const raw of [FILE, DIR, ROOT]) {
    const ctx = parseRepoUrl(raw);
    const payload = buildPayload(settings, {}, ctx);
    for (const item of payload.groups.flatMap((g) => g.items)) {
      assert.ok(
        ["file", "folder", "repo", "command"].includes(item.granularity),
        `${item.id} has granularity ${item.granularity}`,
      );
      assert.ok(item.granularityLabel, `${item.id} has a label`);
      if (item.target.kind !== "url") continue;

      // The label must not merely exist — it must match where the row actually
      // goes. A `/tree/<ref>` is still the whole repo, so the test is about
      // carrying a *path*, not about path-shaped URL segments.
      if (item.granularity === "repo") {
        assert.ok(
          !ctx.path || !item.target.url.includes(ctx.path),
          `${item.id} labelled 'the whole repo' must not carry the page's path ` +
            `(${ctx.path}): ${item.target.url}`,
        );
      }
      if (item.granularity === "file") {
        assert.match(item.target.url, /\/blob\//, `${item.id} labelled 'this file' opens a blob`);
        assert.ok(item.target.url.includes(ctx.path), `${item.id} labelled 'this file' must carry the path`);
      }
      if (item.granularity === "folder") {
        assert.ok(
          !ctx.path.includes("/") || !item.target.url.includes(ctx.path),
          `${item.id} labelled 'this folder' must not carry the whole file path`,
        );
      }
    }
  }
});