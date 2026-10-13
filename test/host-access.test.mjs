import test from "node:test";
import assert from "node:assert/strict";

/**
 * host-access.js resolves the browser namespace at import time and api.js picks
 * `browser` only when it has a `runtime`, so the fake has to be fully installed
 * before the dynamic import below. Tests reset its state rather than swapping the
 * namespace, which would not be seen by the already-bound `api`.
 */
const granted = new Set();
const registered = new Map();
const asked = [];
const fake = { failRequests: false };

globalThis.browser = {
  runtime: {},
  permissions: {
    async contains({ origins }) {
      return origins.every((o) => granted.has(o));
    },
    async request({ origins }) {
      asked.push(origins[0]);
      if (fake.failRequests) return false;
      origins.forEach((o) => granted.add(o));
      return true;
    },
    async remove({ origins }) {
      const had = origins.every((o) => granted.has(o));
      origins.forEach((o) => granted.delete(o));
      return had;
    },
    onAdded: { addListener() {} },
    onRemoved: { addListener() {} },
  },
  scripting: {
    async getRegisteredContentScripts({ ids }) {
      return ids.filter((id) => registered.has(id)).map((id) => ({ id }));
    },
    async registerContentScripts(scripts) {
      for (const s of scripts) registered.set(s.id, s);
    },
    async unregisterContentScripts({ ids }) {
      ids.forEach((id) => registered.delete(id));
    },
  },
};

const mod = await import("../src/host-access.js");

function reset() {
  granted.clear();
  registered.clear();
  asked.length = 0;
  fake.failRequests = false;
}

test("the only optional host is gitlab, and github is not among them", () => {
  assert.deepEqual(mod.OPTIONAL_ORIGINS, ["https://gitlab.com"]);
  assert.ok(
    !mod.OPTIONAL_ORIGINS.includes("https://github.com"),
    "github.com is declared statically in the manifest and must not be requested",
  );
});

test("nothing is injected until a host is granted", async () => {
  reset();
  await mod.syncDynamicScripts();
  assert.equal(registered.size, 0, "no script should be registered without access");
  assert.deepEqual(await mod.grantedHosts(), []);
});

test("granting a host registers a content script for exactly it", async () => {
  reset();
  const ok = await mod.requestHost("https://gitlab.com");
  assert.equal(ok, true);
  assert.deepEqual(asked, ["https://gitlab.com/*/*"]);

  assert.deepEqual(await mod.grantedHosts(), ["https://gitlab.com"]);
  assert.equal(registered.size, 1);
  const script = [...registered.values()][0];
  assert.deepEqual(script.matches, ["https://gitlab.com/*/*"]);
  assert.deepEqual(script.js, ["src/content-styles.js", "src/content.js"]);
  assert.equal(script.runAt, "document_idle");
});

test("sync is idempotent and never double-registers", async () => {
  reset();
  await mod.requestHost("https://gitlab.com");
  await mod.syncDynamicScripts();
  await mod.syncDynamicScripts();
  assert.equal(registered.size, 1, "re-syncing must not duplicate the registration");
});

test("revoking a host unregisters the script again", async () => {
  reset();
  await mod.requestHost("https://gitlab.com");
  assert.equal(registered.size, 1);

  const ok = await mod.removeHost("https://gitlab.com");
  assert.equal(ok, true);
  assert.deepEqual(await mod.grantedHosts(), []);
  assert.equal(registered.size, 0, "losing access must take the content script with it");
});

test("a permission revoked outside the extension is cleaned up on the next sync", async () => {
  reset();
  await mod.requestHost("https://gitlab.com");
  assert.equal(registered.size, 1);

  // The browser's own permissions UI does not go through removeHost().
  granted.clear();
  await mod.syncDynamicScripts();
  assert.equal(registered.size, 0);
});

test("a refused request leaves nothing registered", async () => {
  reset();
  fake.failRequests = true;

  assert.equal(await mod.requestHost("https://gitlab.com"), false);
  assert.equal(registered.size, 0);
  assert.deepEqual(await mod.grantedHosts(), []);
});

test("an unknown host is refused rather than guessed at", async () => {
  reset();
  assert.equal(await mod.requestHost("https://evil.example"), false);
  assert.equal(await mod.removeHost("https://evil.example"), false);
  assert.deepEqual(asked, []);
});

test("permissions are asked for with a match pattern, not a bare origin", async () => {
  reset();
  await mod.requestHost("https://gitlab.com");
  assert.deepEqual(asked, ["https://gitlab.com/*/*"]);
  assert.ok(
    asked.every((o) => o.split("/").length > 3),
    "Chrome rejects an origin with an empty path: Invalid value for origin pattern",
  );
  assert.deepEqual(
    mod.OPTIONAL_ORIGINS,
    ["https://gitlab.com"],
    "the bare origin is for display only and never goes to the permissions API",
  );
});

test("every optional pattern carries a path, so Chrome will accept it", () => {
  for (const origin of mod.OPTIONAL_ORIGINS) {
    assert.ok(
      origin.startsWith("https://"),
      `${origin} must be https — the extension has no business over plain http`,
    );
  }
  assert.ok(
    Object.keys(mod.OPTIONAL_HOSTS).every((p) => p.endsWith("/*/*")),
    "a pattern without a path is rejected outright by scripting and permissions",
  );
});