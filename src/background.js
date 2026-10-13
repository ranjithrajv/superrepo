/**
 * Background: the only place that owns the catalog.
 *
 * Responsibilities:
 *   · answer the content script's questions (what applies to this page)
 *   · perform opens, so all the openTarget modes live in one place
 *   · right-click menus and the `gp` address-bar keyword
 *   · toggle the in-page panel when the toolbar icon is clicked
 *
 * Chrome loads this as a MODULE service worker (`"type": "module"`), so the
 * imports below are static — dynamic import() is forbidden on
 * ServiceWorkerGlobalScope. Firefox loads an event page, which cannot take
 * `"type": "module"`, and goes through background.firefox.js instead.
 *
 * Listeners are registered synchronously at the top level, as MV3 requires.
 */

import { CATALOG, buildTarget, buildTargetFromUrl, findService, allServices } from "./catalog.js";
import { parseRepoUrl } from "./parse.js";
import { syncDynamicScripts } from "./host-access.js";
import { buildPayload } from "./payload.js";
import { bumpUsage, loadSettings, loadUsage, saveSettings, visibleServices } from "./settings.js";
import {
  cleanCategoryIds,
  cleanDisabled,
  cleanInlinePatch,
  mergeCategoryDefaults,
} from "./inline-settings.js";

const api = globalThis.browser?.runtime ? globalThis.browser : globalThis.chrome;

const MSG = {
  catalog: "superepo:catalog",
  open: "superepo:open",
  save: "superepo:save",
  readSettings: "superepo:read-settings",
  toggle: "superepo:toggle",
  move: "superepo:move",
  services: "superepo:services",
  changed: "superepo:changed",
};

/**
 * Pages where the menus and the in-page UI make sense.
 *
 * Context menus are matched by URL pattern, which needs no host permission, so
 * these stay broad: right-clicking a Bitbucket link can still hand you the
 * command-line services even though the in-page buttons are not injected there.
 */
const REPO_PATTERNS = [
  "*://github.com/*/*",
  "*://gitlab.com/*/*",
  "*://bitbucket.org/*/*",
  "*://codeberg.org/*/*",
];

const ROOT_PAGE = "gp-page";
const ROOT_LINK = "gp-link";
const PAGE_PREFIX = `${ROOT_PAGE}:`;
const LINK_PREFIX = `${ROOT_LINK}:`;

// -------------------------------------------------------------- content script

api.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.type === MSG.catalog) {
    handleCatalog(message).then(respond);
    return true;
  }
  if (message?.type === MSG.open) {
    handleOpen(message, sender).then(respond);
    return true;
  }
  if (message?.type === MSG.save) {
    handleSave(message).then(respond);
    return true;
  }
  // The smoke test drives the panel and needs to confirm the change reached
  // storage. The page world has no chrome.* access, so it reads it back through
  // the worker. Only the inline-editable fields are returned.
  if (message?.type === MSG.readSettings) {
    loadSettings().then((s) => respond(s));
    return true;
  }
  if (message?.type === MSG.services) {
    loadSettings().then((s) => {
      const all = allServices(s.custom);
      respond({
        settings: s,
        categories: CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
        services: all.map((service) => ({
          id: service.id,
          name: service.name,
          enabled: !(s.disabled || []).includes(service.id),
        })),
      });
    });
    return true;
  }
  if (message?.type === MSG.move) {
    const id = message?.serviceId;
    const delta = Number(message?.delta) || 0;
    loadSettings().then(async (s) => {
      const ids = [...orderedIds(s)];
      const allIds = allServices(s.custom).map((x) => x.id);
      // Include disabled services at the end so they stay ordered.
      for (const serviceId of allIds) if (!ids.includes(serviceId)) ids.push(serviceId);
      const from = ids.indexOf(id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= ids.length) {
        respond({ ok: false, error: "out of range" });
        return;
      }
      [ids[from], ids[to]] = [ids[to], ids[from]];
      await saveSettings({ order: ids });
      broadcast({ type: MSG.changed }).catch(() => {});
      respond({ ok: true });
    });
    return true;
  }
  return false;
});

/**
 * Write an inline settings change. Saving fires storage.onChanged, which already
 * rebuilds the menus and broadcasts `changed` to every panel — so the caller
 * does not need to re-fetch the payload itself.
 */
async function handleSave(message) {
  const patch = cleanInlinePatch(message?.patch);
  const raw = message?.patch;

  // The array-shaped fields cannot ride the scalar allowlist, and all three need
  // the current settings to validate against, so they are read once up front.
  const current = await loadSettings();
  let touched = Object.keys(patch).length > 0;

  // A map, merged rather than replaced: the panel sends one category at a time.
  if (raw?.categoryDefaults && typeof raw.categoryDefaults === "object") {
    patch.categoryDefaults = mergeCategoryDefaults(current.categoryDefaults, raw.categoryDefaults);
    touched = true;
  }

  if (Array.isArray(raw?.categoryIds)) {
    const ids = cleanCategoryIds(raw.categoryIds);
    if (ids) {
      patch.categoryIds = ids;
      touched = true;
    }
  }

  if (Array.isArray(raw?.disabled)) {
    // Custom services only exist in settings, so the known set has to be built
    // per request rather than baked in.
    const known = new Set(allServices(current.custom).map((service) => service.id));
    const disabled = cleanDisabled(raw.disabled, known);
    if (disabled) {
      patch.disabled = disabled;
      touched = true;
    }
  }

  if (!touched) return { ok: false, error: "nothing to save" };

  const settings = await saveSettings(patch);
  return { ok: true, settings };
}

async function handleCatalog(message) {
  const ctx = parseRepoUrl(message?.url);
  if (!ctx || ctx.type === "other") return { ok: false };

  const [settings, usage] = await Promise.all([loadSettings(), loadUsage()]);
  return buildPayload(settings, usage, ctx);
}

async function handleOpen(message, sender) {
  const ctx = parseRepoUrl(message?.url);
  const service = findService(CATALOG, message?.id);
  if (!ctx || !service) return { ok: false };

  const target = buildTarget(service, ctx);
  if (!target) return { ok: false };

  const settings = await loadSettings();

  // Commands and copy-only never open a tab: hand the text back so the content
  // script can copy it with a real document (clipboard access in a service
  // worker is not reliable).
  if (target.kind === "command") {
    recordUsage(service.id);
    return { ok: true, kind: "command", command: target.command };
  }
  if (settings.openTarget === "copy") {
    recordUsage(service.id);
    return { ok: true, kind: "copy", url: target.url };
  }

  try {
    if (message.background) {
      await api.tabs.create({ url: target.url, active: false });
    } else if (settings.openTarget === "sameTab" && sender?.tab?.id != null) {
      await api.tabs.update(sender.tab.id, { url: target.url });
    } else if (settings.openTarget === "window") {
      await api.windows.create({ url: target.url });
    } else {
      await api.tabs.create({ url: target.url });
    }
    recordUsage(service.id);
    return { ok: true, kind: "url" };
  } catch (error) {
    report(error);
    return { ok: false };
  }
}

function recordUsage(id) {
  bumpUsage(id).catch(() => {});
}

// ----------------------------------------------------------------- toolbar icon

api.action.onClicked.addListener(async (tab) => {
  if (tab?.id == null) return;
  try {
    await api.tabs.sendMessage(tab.id, { type: MSG.toggle });
  } catch {
    // No content script here, so there is nothing to toggle.
    api.runtime.openOptionsPage();
  }
});

// ---------------------------------------------------------------- context menus

api.runtime.onInstalled.addListener(() => {
  buildMenus().catch(report);
  syncDynamicScripts().catch(report);
});

api.runtime.onStartup.addListener(() => {
  buildMenus().catch(report);
  syncDynamicScripts().catch(report);
});

// A host granted or revoked from the options page changes what we may inject.
// The request path calls sync itself, but a revocation made from the browser's
// own permissions UI only shows up here.
api.permissions?.onAdded?.addListener(() => syncDynamicScripts().catch(report));
api.permissions?.onRemoved?.addListener(() => syncDynamicScripts().catch(report));

api.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.settings) return;
  buildMenus().catch(report);
  // Keep any open panel in step with the new settings.
  broadcast({ type: MSG.changed }).catch(() => {});
});

async function buildMenus() {
  const services = visibleServices(await loadSettings()).filter((s) => s.kind === "url");

  await removeAllMenus();

  createMenu({
    id: ROOT_PAGE,
    title: "SuperRepo",
    contexts: ["page"],
    documentUrlPatterns: REPO_PATTERNS,
  });
  createMenu({
    id: ROOT_LINK,
    title: "SuperRepo",
    contexts: ["link"],
    targetUrlPatterns: REPO_PATTERNS,
  });

  for (const service of services) {
    createMenu({ id: PAGE_PREFIX + service.id, parentId: ROOT_PAGE, title: service.name });
    createMenu({ id: LINK_PREFIX + service.id, parentId: ROOT_LINK, title: service.name });
  }
}

api.contextMenus.onClicked.addListener(async (info, tab) => {
  const menuId = String(info.menuItemId);
  const serviceId = menuId.startsWith(PAGE_PREFIX)
    ? menuId.slice(PAGE_PREFIX.length)
    : menuId.startsWith(LINK_PREFIX)
      ? menuId.slice(LINK_PREFIX.length)
      : "";

  const service = serviceId ? findService(CATALOG, serviceId) : null;
  if (!service) return;

  const source = info.linkUrl || info.pageUrl || tab?.url || "";
  const target = buildTargetFromUrl(service, source);
  if (!target || target.kind !== "url") return;

  try {
    await api.tabs.create({ url: target.url });
  } catch (error) {
    report(error);
  }
});

/** Chrome takes a callback and returns undefined; Firefox returns a promise. */
function createMenu(properties) {
  try {
    const result = api.contextMenus.create(properties);
    if (result && typeof result.then === "function") result.catch(() => {});
  } catch {
    /* duplicate ids after a rebuild are expected and harmless */
  }
}

function removeAllMenus() {
  return new Promise((resolve) => {
    try {
      const result = api.contextMenus.removeAll(() => resolve());
      if (result && typeof result.then === "function") result.then(resolve, resolve);
    } catch {
      resolve();
    }
  });
}

/** Message every tab; ones without a content script just fail silently. */
async function broadcast(message) {
  const tabs = await api.tabs.query({});
  await Promise.all(
    tabs.map((tab) => (tab.id == null ? null : api.tabs.sendMessage(tab.id, message).catch(() => {}))),
  );
}

// -------------------------------------------------------------------- omnibox

api.omnibox.setDefaultSuggestion({
  description: "SuperRepo — paste a repo URL or owner/repo, then pick a service",
});

api.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const ctx = parseRepoUrl(text);

  if (!ctx) {
    suggest([
      { content: text, description: "SuperRepo: try a repo URL, or <match>owner/repo</match>" },
    ]);
    return;
  }

  const services = visibleServices(await loadSettings()).filter((s) => s.kind === "url");
  const suggestions = [];

  for (const service of services) {
    const target = buildTarget(service, ctx);
    if (target?.kind !== "url") continue;
    suggestions.push({
      content: target.url,
      description: `${escapeXml(service.name)} — <url>${escapeXml(target.url)}</url>`,
    });
    if (suggestions.length >= 8) break;
  }

  suggest(suggestions);
});

api.omnibox.onInputEntered.addListener(async (text) => {
  if (/^https?:\/\//i.test(text)) {
    await api.tabs.create({ url: text });
    return;
  }

  const ctx = parseRepoUrl(text);
  if (!ctx) return;

  const [first] = visibleServices(await loadSettings()).filter((s) => s.kind === "url");
  if (!first) return;

  const target = buildTarget(first, ctx);
  if (target?.kind === "url") await api.tabs.create({ url: target.url });
});

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function report(error) {
  console.error("[superepo]", error);
}
