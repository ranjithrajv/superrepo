/**
 * Settings + usage counters, stored in `storage.local`.
 *
 * Deliberately local-only: no sync, no network, nothing to leak. See README.
 */

import { api } from "./api.js";
import { CATALOG, allServices } from "./catalog.js";
import { hasGlyph } from "./icons.js";

const SETTINGS_KEY = "settings";
const USAGE_KEY = "usage";

/** Built-ins that ship hidden until the user opts in. */
const DEFAULT_OFF = CATALOG.filter((s) => s.defaultOff).map((s) => s.id);

export const DEFAULT_SETTINGS = {
  /** newTab | sameTab | window | copy */
  openTarget: "newTab",
  showCommands: true,
  disabled: [...DEFAULT_OFF],
  order: [],
  custom: [],
  /**
   * Services shown as buttons when `pinMode` is `services`, and the seed used
   * when someone switches back to that mode. A services list starting empty
   * would fall back to the first four rows in catalog order, which are all
   * "Feed it to an AI" — so the list is populated even though it is not what
   * ships.
   */
  primaryIds: ["gitingest", "gitdiagram", "gitmcp", "githubdev"],
  /**
   * How the page buttons are chosen.
   *
   *   categories— `categoryIds` names groups, and each group resolves to one
   *               service: the most-used one you have available in it, falling
   *               back to catalog order.
   *   services  — `primaryIds` names them outright
   *
   * Categories are the shipped default because picking four of thirty-one by
   * hand is work, and because a default of four *named* services quietly
   * promotes whoever those four belong to. Naming groups says what the header is
   * for and lets the catalog decide who fills it — which is the promise the
   * partner rules rest on.
   *
   * The three default groups are three of the jobs the tagline names: a prompt,
   * a diagram, an IDE.
   */
  pinMode: "categories",
  /**
   * Which categories ship with a button in the header.
   *
   * Curated, not "every category". These two used to be the same list, which
   * coupled the number of categories to the size of the header: adding a ninth
   * category would have pushed past the button cap and been silently dropped by
   * resolveCategories. Splitting "Open & run" into an editor and a workspace is
   * what forced the split, because it added a category nobody had budget for.
   *
   * So a new category ships unpinned unless it is listed here — "agent" is the
   * first to do that. Anyone who wants it can pin it in the panel or settings.
   */
  categoryIds: [
    "prompt",
    "wiki",
    "diagram",
    "editor",
    "workspace",
    "history",
    "analytics",
    "cli",
  ],
  /** Per-category chosen representative (overrides usage → catalog order). */
  categoryDefaults: {},
  /** auto | inline | floating | off */
  placement: "auto",
  /** icon | monogram | labeled — icon shows the SVG glyph, monogram the 2-letter chip */
  buttonStyle: "icon",
};

/** @returns {Promise<typeof DEFAULT_SETTINGS>} */


/** Turn an old by-name pin list into category picks when upgrading. */
function seedCategoriesFromPrimary(primaryIds, custom) {
  if (!Array.isArray(primaryIds) || !primaryIds.length) return [];
  const seen = new Set();
  const out = [];
  for (const id of primaryIds) {
    const service = (custom || []).map ? null : null;
    const builtin = CATALOG.find((s) => s.id === id);
    const category = builtin?.category ?? null;
    if (!category) continue;
    if (seen.has(category)) continue;
    seen.add(category);
    out.push(category);
  }
  return out.slice(0, 8);
}



function seedDefaultsFromPrimary(primaryIds) {
  if (!Array.isArray(primaryIds)) return {};
  const out = {};
  for (const id of primaryIds) {
    const service = CATALOG.find((s) => s.id === id);
    const category = service?.category;
    if (!category || out[category]) continue;
    out[category] = id;
  }
  return out;
}

export async function loadSettings() {
  let raw = null;
  try {
    raw = (await api.storage.local.get(SETTINGS_KEY))?.[SETTINGS_KEY];
  } catch {
    raw = null;
  }
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS, custom: [] };
  return {
    ...DEFAULT_SETTINGS,
    ...raw,
    disabled: Array.isArray(raw.disabled) ? raw.disabled : [...DEFAULT_OFF],
    order: Array.isArray(raw.order) ? raw.order : [],
    custom: Array.isArray(raw.custom) ? raw.custom : [],
    // A settings object with no `pinMode` was written by a version that predates
    // categories, and that version shipped pinned services by name. So an absent
    // value means "services" — this preserves the header someone already has,
    // rather than silently re-deciding it for them on upgrade. Only a genuinely
    // fresh install, which has no settings object at all, gets the new default.
    pinMode: "categories",
    categoryIds: (Array.isArray(raw.categoryIds) && raw.categoryIds.length)
      ? raw.categoryIds
      : seedCategoriesFromPrimary(raw.primaryIds, raw.custom),
    categoryDefaults:
      raw.categoryDefaults && typeof raw.categoryDefaults === "object" && !Array.isArray(raw.categoryDefaults)
        ? raw.categoryDefaults
        : seedDefaultsFromPrimary(raw.primaryIds),
  };
}

export async function saveSettings(patch) {
  const next = { ...(await loadSettings()), ...patch };
  await api.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export async function resetSettings() {
  await api.storage.local.remove(SETTINGS_KEY);
  return loadSettings();
}

/** Enabled services for the current settings, in the user's order. */
export function visibleServices(settings) {
  const off = new Set(settings.disabled || []);
  const list = allServices(settings.custom).filter(
    (s) => !off.has(s.id) && (settings.showCommands || s.kind !== "command"),
  );
  return sortByOrder(list, settings.order);
}

/** Apply the user's explicit ordering; anything unlisted keeps catalog order. */
export function sortByOrder(services, order) {
  if (!Array.isArray(order) || !order.length) return services;
  const pos = new Map(order.map((id, i) => [id, i]));
  const fallback = order.length + services.length;
  return [...services].sort((a, b) => (pos.get(a.id) ?? fallback) - (pos.get(b.id) ?? fallback));
}

/** Every service id in display order — used by the options page for reordering. */
export function orderedIds(settings) {
  const off = new Set(settings.disabled || []);
  return sortByOrder(allServices(settings.custom), settings.order)
    .filter((s) => !off.has(s.id))
    .map((s) => s.id);
}

export async function loadUsage() {
  try {
    const raw = (await api.storage.local.get(USAGE_KEY))?.[USAGE_KEY];
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export async function bumpUsage(id) {
  const usage = await loadUsage();
  usage[id] = (usage[id] || 0) + 1;
  try {
    await api.storage.local.set({ [USAGE_KEY]: usage });
  } catch {
    /* counters are a nicety, never fatal */
  }
  return usage;
}


/** Validate and normalise one user-defined service from the options form. */
export function normalizeCustom(raw) {
  const name = String(raw?.name || "").trim().slice(0, 60);
  const template = String(raw?.template || "").trim().slice(0, 400);
  if (!name || !template) return null;
  if (!/^https?:\/\//i.test(template) && !/\{url\}|\{owner\}/.test(template)) return null;
  return {
    id: raw.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name,
    template,
    blurb: String(raw?.blurb || "").trim().slice(0, 120),
    icon: hasGlyph(raw?.icon) ? raw.icon : "sparkle",
    color: /^#[0-9a-f]{3,8}$/i.test(raw?.color || "") ? raw.color : "",
  };
}
