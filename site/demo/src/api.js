/**
 * Tiny cross-browser shim.
 *
 * Chrome MV3 exposes promise-based `chrome.*` APIs when no callback is passed.
 * Firefox exposes promise-based `browser.*` APIs. Both are interchangeable for
 * everything this extension uses, so we pick whichever exists.
 */
export const api = globalThis.browser?.runtime ? globalThis.browser : globalThis.chrome;

export const version = api?.runtime?.getManifest?.()?.version ?? "0.0.0";

// Note: there is deliberately no copyText() here. The only caller is the panel,
// and content.js is a classic script — it cannot import this module. Sharing the
// implementation would mean the panel's copy button silently did nothing, which
// is the exact failure the duplicated fallback in content.js exists to avoid.
