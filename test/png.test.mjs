/**
 * The store assets have to be "24-bit PNG (no alpha)". Chromium emits RGB today
 * and nothing promises it will tomorrow, so scripts/lib/png.mjs normalises and
 * checks every capture — which makes this module the thing standing between a
 * browser change and a rejected upload. Worth testing directly rather than only
 * through a browser run.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { decodePng, describePng, encodePng, toStorePng } from "../scripts/lib/png.mjs";

const CORNERS = [
  [255, 0, 0, 255], // red
  [0, 255, 0, 255], // green
  [0, 0, 255, 255], // blue
  [255, 255, 255, 255], // white
];

/** A 2x2 image with one corner per entry of `corners`. */
function image(corners, channels = 4) {
  const flat = corners.flat();
  const pixels = channels === 4
    ? Buffer.from(flat)
    : Buffer.from(flat.filter((_, i) => i % 4 !== 3));
  return encodePng({ width: 2, height: 2, channels, pixels });
}

test("an opaque RGB png is passed through untouched", () => {
  const png = image(CORNERS, 3);
  assert.equal(toStorePng(png), png, "already-compliant output should not be rewritten");
});

test("an RGBA png comes back as 24-bit RGB at the same size", () => {
  const rgba = image(CORNERS, 4);
  assert.equal(describePng(rgba).colorType, 6, "fixture should start with an alpha channel");

  const info = describePng(toStorePng(rgba));
  assert.equal(info.colorType, 2);
  assert.equal(info.depth, 8);
  assert.equal(info.width, 2);
  assert.equal(info.height, 2);
});

test("dropping a fully opaque alpha channel leaves the colours alone", () => {
  const before = decodePng(image(CORNERS, 4));
  const after = decodePng(toStorePng(image(CORNERS, 4)));
  assert.equal(after.channels, 3);

  for (let i = 0; i < CORNERS.length; i++) {
    assert.deepEqual(
      [...after.pixels.subarray(i * 3, i * 3 + 3)],
      CORNERS[i].slice(0, 3),
      `corner ${i} changed colour`,
    );
  }
  assert.equal(before.channels, 4, "fixture sanity");
});

test("a translucent pixel is composited onto white, not flattened to black", () => {
  // Half-opaque black over white is mid grey: 255 * (1 - 128/255) = 127.
  const pixels = Buffer.from([0, 0, 0, 128, 0, 0, 0, 128, 0, 0, 0, 128, 0, 0, 0, 128]);
  const out = toStorePng(encodePng({ width: 2, height: 2, channels: 4, pixels }));
  const { pixels: rgb } = decodePng(out);
  assert.deepEqual([...rgb.subarray(0, 3)], [127, 127, 127]);
});

test("the re-encoded file is itself parseable and stable", () => {
  const once = toStorePng(image(CORNERS, 4));
  const twice = toStorePng(once);
  assert.equal(twice, once, "a second pass should be a no-op, not a re-encode");
});

test("something that is not a PNG is refused", () => {
  const junk = Buffer.from("this is definitely not a png");
  assert.throws(() => describePng(junk), /not a PNG/);
  assert.throws(() => toStorePng(junk), /not a PNG/);
  assert.throws(() => decodePng(junk), /not a PNG/);
});
