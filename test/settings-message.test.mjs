import test from "node:test";
import assert from "node:assert/strict";

/**
 * The panel changes settings over a message, so the boundary that matters is the
 * one that decides what may be written. A permissive writer would let a bad patch
 * set `placement` to something the panel does not understand, or blank the whole
 * catalog — neither of which the user could undo from where they hit it.
 */

import {
  INLINE_SETTINGS,
  cleanInlinePatch as cleanPatch,
} from "../src/inline-settings.js";

test("the allowlist covers exactly the controls the panel renders", () => {
  // If the panel grows a control with no matching entry here, the change would
  // silently save as "nothing to save" — so the shapes are asserted directly.
  assert.deepEqual(Object.keys(INLINE_SETTINGS).sort(), [
    "buttonStyle",
    "openTarget",
    "placement",
    "showCommands",
  ]);
});

test("an inline change is accepted", () => {
  assert.deepEqual(cleanPatch({ buttonStyle: "labeled" }), { buttonStyle: "labeled" });
  assert.deepEqual(cleanPatch({ placement: "off" }), { placement: "off" });
  assert.deepEqual(cleanPatch({ openTarget: "copy" }), { openTarget: "copy" });
  assert.deepEqual(cleanPatch({ showCommands: false }), { showCommands: false });
  assert.deepEqual(cleanPatch({ showCommands: true }), { showCommands: true });
});

test("several fields at once survive", () => {
  assert.deepEqual(cleanPatch({ buttonStyle: "monogram", placement: "floating", showCommands: false }), {
    buttonStyle: "monogram",
    placement: "floating",
    showCommands: false,
  });
});

test("unknown values are dropped rather than stored", () => {
  assert.deepEqual(cleanPatch({ buttonStyle: "huge" }), {});
  assert.deepEqual(cleanPatch({ placement: "everywhere" }), {});
  assert.deepEqual(cleanPatch({ openTarget: "javascript:alert(1)" }), {});
  assert.deepEqual(cleanPatch({ buttonStyle: 7 }), {});
  assert.deepEqual(cleanPatch({ showCommands: "yes" }), {});
});

test("settings the panel has no business changing are refused", () => {
  // These are the ones that would actually hurt: the catalog, the disabled
  // list, the user's own services, and the pinned buttons.
  assert.deepEqual(cleanPatch({ disabled: [] }), {});
  assert.deepEqual(cleanPatch({ custom: [{ name: "evil" }] }), {});
  assert.deepEqual(cleanPatch({ primaryIds: ["x"] }), {});
  assert.deepEqual(cleanPatch({ order: ["x"] }), {});
});

test("a good field alongside a bad one keeps only the good one", () => {
  assert.deepEqual(cleanPatch({ buttonStyle: "icon", disabled: [] }), { buttonStyle: "icon" });
  assert.deepEqual(cleanPatch({ placement: "inline", custom: [{}] }), { placement: "inline" });
});

test("nothing usable is an empty patch, which the background refuses to save", () => {
  for (const input of [null, undefined, {}, "nope", 42, []]) {
    const patch = cleanPatch(input);
    assert.deepEqual(patch, {}, `${JSON.stringify(input)} should produce an empty patch`);
    assert.equal(Object.keys(patch).length, 0, "an empty patch must be detectable as such");
  }
});

test("no patch can smuggle in a prototype-polluting key", () => {
  const patch = cleanPatch({ __proto__: { polluted: true }, buttonStyle: "icon" });
  assert.deepEqual(Object.keys(patch), ["buttonStyle"]);
  assert.equal({}.polluted, undefined, "Object.prototype was not touched");
});