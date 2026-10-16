/**
 * Dev-only preview shim.
 *
 * Emulates the browser APIs the content script and the options page touch, so
 * they can run in a normal tab on a mock page. Everything else — parsing, the
 * catalog, the payload — is the real code, loaded as modules below.
 *
 * Not shipped: nothing in dist/ references this file.
 */
(() => {
  const PARAM = new URLSearchParams(location.search);
  /** The repo the preview pretends you are looking at. */
  const simulated = PARAM.get("u") || "https://github.com/octocat/hello-world";

  // Where the real modules and the options page live. The defaults suit
  // `npm run preview` (shim in /scripts, modules in /src). The hosted demo sets
  // these before loading the shim, because it is served from a subdirectory and
  // the shim lives beside the modules there. See site/demo and lib/pages.mjs.
  const moduleBase = new URL(globalThis.__SUPERREPO_MODULE_BASE__ || "/src/", document.baseURI);
  const optionsUrl = new URL(globalThis.__SUPERREPO_OPTIONS_URL__ || "/src/options.html", document.baseURI).href;
  const mod = (name) => new URL(name, moduleBase).href;

  const read = (key) => {
    try {
      const raw = localStorage.getItem(`preview:${key}`);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  };
  const write = (key, value) => localStorage.setItem(`preview:${key}`, JSON.stringify(value));

  const storage = {
    local: {
      async get(keys) {
        if (typeof keys === "string") return { [keys]: read(keys) };
        const out = {};
        for (const key of Array.isArray(keys) ? keys : Object.keys(keys || {})) out[key] = read(key);
        return out;
      },
      async set(items) {
        for (const [key, value] of Object.entries(items)) write(key, value);
      },
      async remove(keys) {
        for (const key of Array.isArray(keys) ? keys : [keys]) localStorage.removeItem(`preview:${key}`);
      },
    },
    onChanged: { addListener() {} },
  };

  // The real modules, so the preview exercises the shipping logic.
  let modules = null;
  const load = () =>
    (modules ??= Promise.all([
      import(mod("parse.js")),
      import(mod("payload.js")),
      import(mod("settings.js")),
      import(mod("catalog.js")),
    ]).then(([parse, payload, settings, catalog]) => ({ parse, payload, settings, catalog })));

  const reply = (value) => Promise.resolve(value);

  const api = {
    storage,
    runtime: {
      id: "preview",
      getURL: (path) => new URL(String(path).replace(/^\/+/, ""), moduleBase).href,
      getManifest: () => ({ version: "0.1.0-preview" }),
      openOptionsPage: () => window.open(optionsUrl, "_blank", "noopener"),
      lastError: null,
      onMessage: { addListener() {} },
      sendMessage: async (message) => {
        const { parse, payload, settings: settingsModule, catalog } = await load();
        // The mock page's own URL is meaningless, so swap in the simulated repo.
        const url = String(message?.url || "").startsWith(location.origin) ? simulated : message?.url;
        const ctx = parse.parseRepoUrl(url);

        if (message?.type === "superepo:catalog") {
          if (!ctx) return { ok: false };
          const current = await settingsModule.loadSettings();
          const usage = await settingsModule.loadUsage();
          return payload.buildPayload(current, usage, ctx);
        }

        if (message?.type === "superepo:open") {
          const current = await settingsModule.loadSettings();
          const service = catalog.findService(catalog.CATALOG, message.id);
          const target = ctx && service ? catalog.buildTarget(service, ctx) : null;
          if (!target) return { ok: false };
          if (target.kind === "command") return { ok: true, kind: "command", command: target.command };
          if (current.openTarget === "copy" || message.background) {
            window.open(target.url, "_blank", "noopener");
            return { ok: true, kind: "copy", url: target.url };
          }
          window.open(target.url, "_blank", "noopener");
          return { ok: true, kind: "url" };
        }

        return reply({ ok: false });
      },
    },
    tabs: { async query() { return []; }, async create({ url }) { window.open(url, "_blank", "noopener"); }, async sendMessage() {} },
    windows: { async create({ url }) { window.open(url, "_blank", "noopener"); } },
    contextMenus: {
      create: () => "preview",
      removeAll: (callback) => (typeof callback === "function" ? (callback(), undefined) : Promise.resolve()),
      onClicked: { addListener() {} },
    },
    omnibox: { setDefaultSuggestion() {}, onInputChanged: { addListener() {} }, onInputEntered: { addListener() {} } },
    action: { onClicked: { addListener() {} } },
  };

  globalThis.chrome = api;
  globalThis.browser = api;
  globalThis.__SUPERREPO_PREVIEW__ = { simulated };
})();
