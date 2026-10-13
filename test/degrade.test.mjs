/**
 * "Every row degrades, never dangles."
 *
 * A catalog of third-party URLs fails in one specific way: a service that can't
 * handle the page you're on still renders a row, and the row opens something
 * broken or misleading. The graveyard in SERVICES.md is the record of that
 * having happened — openrepowiki is dead and github1s is archived, and neither
 * fact was visible from the page.
 *
 * The rule these tests enforce: a row is either offered because `supports` says
 * the service handles this host, or it is host-agnostic by construction — a
 * reference link, or a command the user runs themselves. Nothing in between.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { parseRepoUrl } from "../src/parse.js";
import { CATALOG, buildTarget, expandTemplate } from "../src/catalog.js";

const HOSTS = [
  "https://github.com/octocat/hello-world",
  "https://gitlab.com/group/project",
  "https://bitbucket.org/owner/repo",
  "https://codeberg.org/owner/repo",
];

/**
 * A row is host-agnostic if it can't be "wrong for this host" — a reference
 * link, a command the user runs, or a target that ignores the page entirely.
 *
 * Note this is NOT the same as `supports: always`. Gitpod declares `always`
 * because `gitpod.io/#<any git url>` genuinely takes a GitLab or Codeberg repo;
 * that is a deliberate claim about a service that works, not a gap in the rule.
 */
function isHostAgnostic(service) {
  if (service.kind === "link" || service.kind === "command") return true;
  const here = { owner: "a", repo: "b", host: "github.com", isGitHub: true };
  const there = { owner: "a", repo: "b", host: "gitlab.com", isGitHub: false };
  const a = buildTarget({ ...service, supports: undefined }, here)?.url;
  const b = buildTarget({ ...service, supports: undefined }, there)?.url;
  // Same URL on both hosts means the target cannot depend on the host at all.
  return Boolean(a) && a === b;
}

test("every row either declares supports() or is host-agnostic by construction", () => {
  for (const service of CATALOG) {
    if (service.supports) continue;
    assert.ok(
      isHostAgnostic(service),
      `${service.id} has no supports() and its target still varies by host — ` +
        `add supports: gitHubOnly (or always, if it genuinely takes any host), ` +
        `or make it a link/command so it cannot dangle`,
    );
  }
});

test("every row on a non-GitHub host either claims the host or cannot vary by it", () => {
  for (const raw of HOSTS) {
    const ctx = parseRepoUrl(raw);
    assert.ok(ctx, `parsed ${raw}`);
    if (ctx.isGitHub) continue;

    for (const service of CATALOG) {
      if (!buildTarget(service, ctx)) continue;
      assert.ok(
        service.supports || isHostAgnostic(service),
        `${service.id} produces a target on ${ctx.host} without declaring ` +
          `supports() and without being host-agnostic — it would open a ` +
          `broken or wrong-repo URL there`,
      );
    }
  }
});

test("no target ever leaks an unresolved placeholder or a non-string", () => {
  for (const raw of HOSTS) {
    const ctx = parseRepoUrl(raw);
    for (const service of CATALOG) {
      const target = buildTarget(service, ctx);
      if (target?.kind !== "url") continue;

      assert.equal(typeof target.url, "string", `${service.id} url is a string`);
      assert.ok(
        !/\{|\bundefined\b|\bNaN\b|\[object/.test(target.url),
        `${service.id} produced a malformed url on ${ctx.host}: ${target.url}`,
      );
      assert.doesNotMatch(
        target.url,
        /\/undefined|\/null|\/\s|\/\?/,
        `${service.id} produced a url with an empty path segment on ${ctx.host}`,
      );
    }
  }
});

test("buildTarget refuses rather than guessing when it cannot help", () => {
  const ctx = parseRepoUrl("https://github.com/octocat/hello-world");
  assert.equal(buildTarget(null, ctx), null);
  assert.equal(buildTarget(CATALOG[0], null), null);
  // A service whose builder returns nothing is a row that must not render.
  assert.equal(buildTarget({ kind: "url", url: () => "" }, ctx), null);
  assert.equal(buildTarget({ kind: "command", command: () => "" }, ctx), null);
});

test("a custom template with an unknown placeholder keeps the typo visible but never opens", () => {
  const ctx = parseRepoUrl("https://github.com/octocat/hello-world");

  // Preserved literally on purpose: someone editing a template needs to see what
  // they typed, not a silently-mangled URL.
  assert.match(
    expandTemplate("https://x.test/{nonsense}", ctx),
    /\{nonsense\}/,
    "expandTemplate should show the literal text so the typo is visible",
  );

  // ...but a row built from it must not render or open, or it is a button that
  // 404s on every repo.
  const typo = {
    id: "custom:typo",
    kind: "url",
    template: "https://x.test/{nonsense}",
    url: (c) => expandTemplate("https://x.test/{nonsense}", c),
  };
  assert.equal(buildTarget(typo, ctx), null, "a row with an unresolved placeholder must not open");

  // The real placeholders still work.
  assert.equal(
    buildTarget({ kind: "url", url: (c) => `https://x.test/${c.owner}/${c.repo}` }, ctx)?.url,
    "https://x.test/octocat/hello-world",
  );
});