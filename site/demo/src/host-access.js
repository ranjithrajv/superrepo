/**
 * Optional host access, and the content scripts that depend on it.
 *
 * github.com is declared statically in the manifest, so the install prompt asks
 * for one site and nothing else. Every other host a user may want buttons on is
 * an `optional_host_permissions` entry that they grant themselves from the
 * options page — Chrome cannot show a permission prompt there, but the user
 * clicking a button in our own page is exactly the user gesture that
 * `permissions.request()` requires.
 *
 * Granting an origin is only half of it: a content script that matches a host we
 * do not hold access for is refused at injection time. So each optional host has
 * a matching entry here, and the registration is kept in step with whatever the
 * user has actually granted.
 *
 * Registrations survive restarts but are dropped when the extension is updated
 * or reloaded, so `syncDynamicScripts` runs on install, on startup, and whenever
 * the granted set changes.
 */

import { api } from "./api.js";

/**
 * Hosts beyond github.com, each with the content scripts to run there.
 * The key is the origin pattern — it must match the manifest's
 * `optional_host_permissions` exactly, because `permissions.contains` and
 * `permissions.request` both compare on that string.
 */
export const OPTIONAL_HOSTS = {
  "https://gitlab.com/*/*": ["src/content-styles.js", "src/content.js"],
};

/** Stable id per host, so re-registering replaces rather than duplicates. */
const scriptId = (origin) => `superepo-host:${origin}`;

const PATTERNS = Object.keys(OPTIONAL_HOSTS);

/** Strips the trailing match path so a pattern reads as a host for a person. */
const toOrigin = (pattern) => pattern.replace(/\/\*\/.*$/, "");

/** The same hosts, ready to show a person. */
export const OPTIONAL_ORIGINS = PATTERNS.map(toOrigin);

const patternFor = (origin) => PATTERNS.find((p) => toOrigin(p) === origin);

/**
 * `permissions.*` takes match patterns, not bare origins — Chrome rejects an
 * origin with an empty path — so these calls pass the pattern exactly as the
 * manifest declares it, which is also what `contains` compares against.
 */
export async function grantedHosts() {
  if (!api?.permissions?.contains) return [];
  const granted = [];
  for (const pattern of PATTERNS) {
    if (await hasPattern(pattern)) granted.push(toOrigin(pattern));
  }
  return granted;
}

/**
 * Ask for one host. Must be called from a click handler — a permission request
 * outside a user gesture is rejected, and on Firefox it throws rather than
 * resolving false.
 *
 * @param {string} origin  a bare origin, as listed in OPTIONAL_ORIGINS
 * @returns {Promise<boolean>} whether it is now granted
 */
export async function requestHost(origin) {
  const pattern = patternFor(origin);
  if (!pattern) return false;
  let granted = false;
  try {
    granted = await api.permissions.request({ origins: [pattern] });
  } catch {
    granted = false;
  }
  // Chrome only fires onAdded for origins inside a requested set, so sync here
  // rather than waiting for the event — this also covers a granted request that
  // produced no event at all.
  if (granted) await syncDynamicScripts();
  return granted;
}

/** Hand a host back, and stop injecting there. */
export async function removeHost(origin) {
  const pattern = patternFor(origin);
  if (!pattern || !api?.permissions?.remove) return false;
  try {
    const removed = await api.permissions.remove({ origins: [pattern] });
    if (removed) await syncDynamicScripts();
    return removed;
  } catch {
    return false;
  }
}

/**
 * Register a content script for every granted optional host, and drop the rest.
 *
 * Safe to call repeatedly and from a lifecycle event that cannot await: failures
 * are swallowed, because a missing registration degrades to "no buttons on that
 * host" rather than breaking the worker.
 */
export async function syncDynamicScripts() {
  const scripting = api?.scripting;
  if (!scripting?.registerContentScripts) return;

  const registered = new Set(
    (await scripting.getRegisteredContentScripts({ ids: PATTERNS.map(scriptId) })).map((s) => s.id),
  );

  for (const pattern of PATTERNS) {
    const id = scriptId(pattern);
    const has = await hasPattern(pattern);
    if (has && !registered.has(id)) {
      try {
        await scripting.registerContentScripts([
          { id, matches: [pattern], js: OPTIONAL_HOSTS[pattern], runAt: "document_idle" },
        ]);
      } catch {
        /* keep going: one refused host should not stop the others */
      }
    } else if (!has && registered.has(id)) {
      try {
        await scripting.unregisterContentScripts({ ids: [id] });
      } catch {
        /* nothing to clean up */
      }
    }
  }
}

async function hasPattern(pattern) {
  if (!api?.permissions?.contains) return false;
  try {
    return await api.permissions.contains({ origins: [pattern] });
  } catch {
    return false;
  }
}