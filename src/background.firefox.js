/**
 * Firefox background entry point.
 *
 * Firefox MV3 runs background scripts as an event page (a document, not a
 * service worker) and does not accept `"type": "module"` there. Documents *can*
 * use dynamic import, so this classic shim is all that is needed to reach the
 * real module in background.js — no logic lives here.
 *
 * Chrome loads src/background.js directly as a module service worker.
 */

import("./background.js").catch((error) => {
  console.error("[superepo] background failed to start", error);
});
