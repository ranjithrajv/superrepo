import test from "node:test";
import assert from "node:assert/strict";

import { parseRepoUrl } from "../src/parse.js";
import { buildPayload } from "../src/payload.js";
import {
  INLINE_SETTINGS,
} from "../src/inline-settings.js";
import {
  DEFAULT_SETTINGS,
} from "../src/settings.js";

const settings = (patch = {}) => ({ ...DEFAULT_SETTINGS, disabled: [...DEFAULT_SETTINGS.disabled], ...patch });
const github = () => parseRepoUrl("https://github.com/octocat/hello-world");
const payload = (patch, usage) => buildPayload(settings(patch), usage ?? {}, github());

test("the payload carries every setting the panel draws a control for", () => {
  // A control bound to a missing field renders as if the setting were off: the
  // showCommands checkbox came up unchecked on a page where the default was true.
  const shipped = payload().settings;
  for (const key of Object.keys(INLINE_SETTINGS)) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(shipped, key),
      `payload.settings is missing ${key}, so its control would render unbound`,
    );
  }
});

test("those values reflect the settings, not a default", () => {
  const shipped = payload({
    openTarget: "copy",
    placement: "floating",
    buttonStyle: "labeled",
    showCommands: false,
  }).settings;

  assert.equal(shipped.openTarget, "copy");
  assert.equal(shipped.placement, "floating");
  assert.equal(shipped.buttonStyle, "labeled");
  assert.equal(shipped.showCommands, false);
});

test("showCommands defaults to true and reaches the panel as true", () => {
  assert.equal(DEFAULT_SETTINGS.showCommands, true);
  assert.equal(payload().settings.showCommands, true);
});

test("an inline change comes back in the payload", () => {
  // What the panel saves, the next render must read — otherwise a control shows
  // a value the user did not pick.
  assert.equal(payload({ buttonStyle: "monogram" }).settings.buttonStyle, "monogram");
  assert.equal(payload({ placement: "off" }).settings.placement, "off");
});