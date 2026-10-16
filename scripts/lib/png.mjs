/**
 * PNG plumbing for the store assets.
 *
 * Both stores accept "JPEG or 24-bit PNG (no alpha)". That last part is not a
 * style note — a 32-bit RGBA file is refused even when every pixel in it is
 * opaque. Chromium's screenshot encoder emits 24-bit RGB today, but that is its
 * choice rather than a promise, and a file that gets rejected at upload is a bad
 * way to find out it changed.
 *
 * So every capture goes through `toStorePng()` before it is written: RGB passes
 * straight through, RGBA is flattened onto white and re-encoded, and anything
 * else is an error here rather than a rejection there. The re-encode is read
 * back before it is returned, because a hand-written encoder that is wrong is
 * worse than no encoder at all.
 *
 * Browsers only ever produce non-interlaced 8-bit files, so that is the only
 * shape supported; anything else throws rather than guessing.
 */

import { deflateSync, inflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IHDR = 0x49484452;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}

/** The IHDR fields, without decoding a single pixel. */
export function describePng(buffer) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error("not a PNG");
  if (buffer.readUInt32BE(12) !== IHDR) throw new Error("PNG does not start with IHDR");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    depth: buffer[24],
    colorType: buffer[25],
    interlace: buffer[28],
  };
}

/** Concatenated, inflated IDAT — the filtered scanlines, still filtered. */
function scanlines(buffer) {
  const parts = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") parts.push(buffer.subarray(offset + 8, offset + 8 + length));
    if (type === "IEND") break;
    offset += 12 + length;
  }
  return inflateSync(Buffer.concat(parts));
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Undo the per-scanline filters, giving width*height*channels plain bytes. */
function unfilter(raw, width, height, channels) {
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);

  for (let y = 0, pos = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let value = line[x];
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) value += paeth(a, b, c);
      else if (filter !== 0) throw new Error(`unknown PNG filter ${filter} on row ${y}`);
      cur[x] = value & 0xff;
    }
  }
  return out;
}

/** Drop the alpha channel, compositing anything translucent onto white. */
function flatten(rgba, width, height) {
  const rgb = Buffer.alloc(width * height * 3);
  for (let source = 0, target = 0; source < rgba.length; source += 4, target += 3) {
    const alpha = rgba[source + 3] / 255;
    rgb[target] = Math.round(rgba[source] * alpha + 255 * (1 - alpha));
    rgb[target + 1] = Math.round(rgba[source + 1] * alpha + 255 * (1 - alpha));
    rgb[target + 2] = Math.round(rgba[source + 2] * alpha + 255 * (1 - alpha));
  }
  return rgb;
}

/**
 * Encode plain pixels as a non-interlaced 8-bit PNG.
 *
 * Exported so the tests can build the RGBA fixture that `toStorePng` has to
 * handle — there is no other way to get one in the test process.
 */
export function encodePng({ width, height, channels = 3, pixels }) {
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    // Filter 0 (none). The output is a screenshot, not something to be efficient
    // about; a filter would only make this harder to read and to check.
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = channels === 4 ? 6 : 2; // RGBA or RGB
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Decode to plain pixels: `channels` is 3 or 4 and `pixels` is
 * width*height*channels bytes, unfiltered.
 */
export function decodePng(buffer) {
  const info = describePng(buffer);
  if (info.depth !== 8) throw new Error(`PNG bit depth ${info.depth} is not supported — expected 8`);
  if (info.interlace !== 0) throw new Error("interlaced PNG is not supported");

  const channels = info.colorType === 2 ? 3 : info.colorType === 6 ? 4 : 0;
  if (!channels) throw new Error(`PNG colour type ${info.colorType} is not supported — expected 2 or 6`);

  return { ...info, channels, pixels: unfilter(scanlines(buffer), info.width, info.height, channels) };
}

/**
 * A PNG both stores will accept: 8-bit, colour type 2, no alpha channel.
 *
 * Returns the input untouched when it is already that, which is the normal case
 * and keeps the checked-in bytes identical to what the browser captured.
 */
export function toStorePng(buffer) {
  const info = describePng(buffer);
  if (info.depth === 8 && info.colorType === 2 && info.interlace === 0) return buffer;

  const image = decodePng(buffer);
  const rgb = image.channels === 3 ? image.pixels : flatten(image.pixels, image.width, image.height);
  const out = encodePng({ width: image.width, height: image.height, channels: 3, pixels: rgb });

  // Read it back rather than trusting the writer. A silently corrupt asset is
  // the one failure mode that would not surface until review.
  const check = describePng(out);
  if (check.colorType !== 2 || check.depth !== 8) throw new Error("re-encode did not produce 24-bit RGB");
  return out;
}
