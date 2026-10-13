/**
 * The trust boundary for settings the in-page panel is allowed to change.
 *
 * The panel is our own code, but it reaches settings over a message, so what
 * arrives is untrusted data — a bug, or anything that got into the page's
 * origin, must not be able to blank the catalog or empty the header. Every
 * patch therefore passes through one of the cleaners here before it is written.
 *
 * They live apart from settings.js because that module's job is persisting
 * settings; this one's job is deciding what may be written. They also belong
 * together because INLINE_SETTINGS, KNOWN_CATEGORY_IDS and PIN_LIMIT have to
 * agree with each other — the allowlist, the category set and the button cap
 * are one contract, and splitting them across files is how they drift.
 *
 * Scalars ride the INLINE_SETTINGS allowlist. Arrays and maps cannot, so each
 * has its own cleaner below.
 */

import { CATALOG, CATEGORIES } from "./catalog.js";

/**
 * The settings the in-page panel is allowed to change, and the only shapes
 * accepted for each.
 *
 * The panel is our own code, but it is still a message boundary — anything it
 * sends arrives as untrusted data. So a patch is matched against this list
 * instead of being handed to saveSettings as-is. Without it, a malformed message
 * could blank `disabled`, inject `custom` entries, or set `placement` to
 * something the panel cannot render, and the user would have no way to undo it
 * from where they hit it.
 */
export const INLINE_SETTINGS = {
  openTarget: ["newTab", "sameTab", "window", "copy"],
  placement: ["auto", "inline", "floating", "off"],
  buttonStyle: ["icon", "monogram", "labeled"],
  showCommands: [true, false],
};

/**
 * Keep only recognised keys with recognised values.
 *
 * @returns an object holding the accepted subset — empty when nothing survives,
 *          which the caller treats as "nothing to save" rather than writing an
 *          empty patch over real settings.
 */
export function cleanInlinePatch(raw) {
  const patch = {};
  if (!raw || typeof raw !== "object") return patch;
  for (const [key, allowed] of Object.entries(INLINE_SETTINGS)) {
    if (raw[key] !== undefined && allowed.includes(raw[key])) patch[key] = raw[key];
  }
  return patch;
}

/**
 * Which service the panel should pin to each category.
 *
 * `categoryDefaults` is a map rather than a scalar, so it cannot go through the
 * allowlist above — it is checked here instead. Two things make it the riskiest
 * field the panel can write:
 *
 *   · it is an object, so a bad patch could try to set keys on anything it liked;
 *   · it decides what the header shows for a whole category.
 *
 * So entries are taken only for categories that exist and only when the value is
 * a string naming a service. Merged rather than replaced, because the panel sends
 * one category at a time and a replace would blank the other five.
 */
const KNOWN_CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));

export function mergeCategoryDefaults(current = {}, patch) {
  const next = { ...(current ?? {}) };
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return next;
  for (const [categoryId, serviceId] of Object.entries(patch)) {
    if (!KNOWN_CATEGORY_IDS.has(categoryId)) continue;
    // An empty string is the unpin, not a bad value: the panel sends "" when the
    // pinned row is pressed a second time. Ignoring it left the pin stuck.
    if (serviceId === "") {
      delete next[categoryId];
      continue;
    }
    if (typeof serviceId !== "string") continue;
    next[categoryId] = serviceId;
  }
  return next;
}

/** How many categories may hold a header button. Mirrors resolveCategories. */
export const PIN_LIMIT = 8;

/**
 * `categoryIds` — which categories get a button in the header.
 *
 * An array, so it cannot ride the scalar allowlist, and a bad one is expensive:
 * unknown ids resolve to nothing, duplicates fill one slot twice, and more than
 * PIN_LIMIT would be truncated silently by resolveCategories. So it is filtered
 * here and the caller learns the real result.
 *
 * @returns {string[]|null} null when the patch is not an array at all
 */
export function cleanCategoryIds(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const id of raw) {
    if (typeof id !== "string" || !KNOWN_CATEGORY_IDS.has(id)) continue;
    if (out.includes(id)) continue;
    out.push(id);
    if (out.length >= PIN_LIMIT) break;
  }
  return out;
}

/**
 * `disabled` — the service ids the user has switched off.
 *
 * Same reasoning: an array from a message boundary. Unknown ids are dropped so a
 * malformed patch cannot inject ids that later match nothing, and so a service
 * that has been removed from the catalog stops lingering in the list. Custom ids
 * are supplied by the caller because they only exist in settings.
 *
 * @returns {string[]|null} null when the patch is not an array at all
 */
export function cleanDisabled(raw, known) {
  if (!Array.isArray(raw)) return null;
  const allowed = known instanceof Set ? known : new Set(known ?? CATALOG.map((s) => s.id));
  return raw.filter((id) => typeof id === "string" && allowed.has(id));
}
