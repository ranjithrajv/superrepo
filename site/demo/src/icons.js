/**
 * Glyphs: one small inline SVG per service.
 *
 * Monochrome and stroke-based on purpose — the injected UI sits inside GitHub's
 * header, between their own filled icons, so colour emoji would look foreign and
 * could not follow the page's theme. Everything inherits `currentColor`, which
 * the caller tints with the service's hue.
 *
 * The background embeds the markup in the payload it sends the content script,
 * which cannot import this module (content scripts are classic scripts). The
 * options page imports it directly. One source of truth either way.
 */

const SVG_ATTRS =
  'viewBox="0 0 16 16" aria-hidden="true" focusable="false" ' +
  'fill="none" stroke="currentColor" stroke-width="1.5" ' +
  'stroke-linecap="round" stroke-linejoin="round"';

/** @type {Record<string, string>} inner markup, keyed by glyph name */
export const GLYPHS = {
  // Feed it to an AI
  "text-file":
    '<path d="M4.5 1.8h4.2L12 5.1v9.1H4.5z"/><path d="M8.7 1.8v3.3H12"/><path d="M6.4 8.2h3.4M6.4 10.7h3.4"/>',
  braces:
    '<path d="M6.6 3.2c-2 0-1.6 2.9-3.4 2.9 1.8 0 1.4 2.9 3.4 2.9"/><path d="M9.4 3.2c2 0 1.6 2.9 3.4 2.9-1.8 0-1.4 2.9-3.4 2.9"/>',
  book: '<path d="M4 2.5h8v11H4z"/><path d="M6.4 2.5v11"/>',
  home: '<path d="M3 7.6 8 3.2l5 4.4"/><path d="M4.6 7.2v6.3h6.8V7.2"/>',
  plug:
    '<path d="M6 2v2.6M10 2v2.6"/><path d="M4.2 4.6h7.6v2.2a3.8 3.8 0 0 1-7.6 0z"/><path d="M8 10.6v3.2"/>',
  chat: '<path d="M2.8 3.6h10.4v6.6H7.4L4.4 12.8v-2.6H2.8z"/>',
  sparkle:
    '<path d="M6.4 2.4l1.2 2.5 2.5 1.2-2.5 1.2-1.2 2.5-1.2-2.5L2.7 6.1l2.5-1.2z"/><path d="M11.8 9l.8 1.6 1.6.8-1.6.8-.8 1.6-.8-1.6-1.6-.8 1.6-.8z"/>',
  undo: '<path d="M4.2 7.2h6.2a3 3 0 0 1 0 6H6.4"/><path d="M6.8 4.6 4.2 7.2l2.6 2.6"/>',

  // Diagrams & structure
  nodes:
    '<circle cx="8" cy="3.4" r="1.6"/><circle cx="3.6" cy="12.4" r="1.6"/><circle cx="12.4" cy="12.4" r="1.6"/><path d="M7.2 4.8 4.4 11M8.8 4.8 11.6 11M5.2 12.4h5.6"/>',
  flow:
    '<path d="M2.6 4.6h3.8a3.2 3.2 0 0 1 3.2 3.2 3.2 3.2 0 0 0 3.2 3.2h.4"/><path d="M10.6 8.6l2.8 2.4-2.8 2.4"/>',

  // Open & run
  window:
    '<path d="M2.6 3.4h10.8v9.2H2.6z"/><path d="M2.6 6.2h10.8"/><path d="M4.6 4.8h.01M6.4 4.8h.01"/>',
  code: '<path d="M6.2 4.6 2.8 8l3.4 3.4M9.8 4.6 13.2 8l-3.4 3.4"/>',
  archive: '<path d="M2.6 5.4h10.8v7.4H2.6z"/><path d="M2 3.4h12v2H2z"/><path d="M6.4 8.6h3.2"/>',
  cloud:
    '<path d="M4.8 12h6.4a2.4 2.4 0 0 0 .3-4.8 3.6 3.6 0 0 0-6.9-.9A2.9 2.9 0 0 0 4.8 12z"/>',
  play: '<path d="M5.8 3.8 11.8 8l-6 4.2z"/>',
  cube: '<path d="M8 2.2 12.8 5v6L8 13.8 3.2 11V5z"/><path d="M3.2 5 8 7.8 12.8 5M8 7.8v6"/>',
  "pull-request":
    '<circle cx="4" cy="3.8" r="1.6"/><circle cx="4" cy="12.2" r="1.6"/><path d="M4 5.4v5.2"/><circle cx="12" cy="12.2" r="1.6"/><path d="M8 3.8h2.4a1.6 1.6 0 0 1 1.6 1.6v5.2"/>',
  bolt: '<path d="M9.2 1.6 4 9h3.6l-.8 5.4L12 7H8.4z"/>',

  // History & analytics
  clock: '<circle cx="8" cy="8" r="5.6"/><path d="M8 4.8V8l2.2 1.4"/>',
  search: '<circle cx="7" cy="7" r="4.2"/><path d="M10.2 10.2 13.6 13.6"/>',
  chart:
    '<path d="M3.2 13V8.6M6.8 13V4.6M10.4 13V7M13.2 13V9.6" stroke-width="2"/>',
  star: '<path d="M8 2.2l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 6.5l4-.6z" fill="currentColor" stroke="none"/>',
  pulse: '<path d="M1.8 8h2.6l1.9-4 2.4 8 1.8-4h2.7"/>',
  database:
    '<path d="M8 2.4c2.9 0 4.8 1 4.8 2s-1.9 2-4.8 2-4.8-1-4.8-2 1.9-2 4.8-2z"/><path d="M3.2 4.4v7.2c0 1 1.9 2 4.8 2s4.8-1 4.8-2V4.4"/>',
  at: '<circle cx="8" cy="8" r="5.6"/><path d="M8 5.4v4.4a1.6 1.6 0 0 0 3.2 0V8A3.2 3.2 0 1 0 8 11.2"/>',

  // More views
  mic: '<path d="M8 2.4a1.9 1.9 0 0 1 1.9 1.9v3a1.9 1.9 0 0 1-3.8 0v-3A1.9 1.9 0 0 1 8 2.4z"/><path d="M4.6 7.2v.6a3.4 3.4 0 0 0 6.8 0v-.6"/><path d="M8 11.2v2.4"/>',

  // Local command line
  box: '<path d="M2.4 5.6h11.2v7.2H2.4z"/><path d="M2.4 5.6 3.6 3h8.8l1.2 2.6"/><path d="M8 7.4v3.6M6.4 9.4 8 11l1.6-1.6"/>',
  terminal:
    '<path d="M2.4 3.6h11.2v8.8H2.4z"/><path d="M4.8 7l1.8 1.8-1.8 1.8"/><path d="M8.6 10.6h2.6"/>',
  target:
    '<circle cx="8" cy="8" r="5.2"/><circle cx="8" cy="8" r="1.9"/><path d="M8 1.4v1.8M8 12.8v1.8M1.4 8h1.8M12.8 8h1.8"/>',

  // Reference
  tree: '<path d="M5 13V6.4a2.6 2.6 0 0 1 2.6-2.6h2.8"/><path d="M9.2 8.6h1.6"/><circle cx="5" cy="13" r="1.7"/><circle cx="12.2" cy="3.8" r="1.7"/><circle cx="12.2" cy="8.6" r="1.7"/>',
  compass: '<circle cx="8" cy="8" r="5.6"/><path d="M10.6 5.4 9.2 9.2 5.4 10.6 6.8 6.8z"/>',

  // Chrome
  dots: '<circle cx="3.2" cy="8" r="1.6" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none"/><circle cx="12.8" cy="8" r="1.6" fill="currentColor" stroke="none"/>',
  link: '<path d="M6.6 9.4 9.4 6.6"/><path d="M7.4 4.6 8.8 3.2a2.6 2.6 0 0 1 3.7 3.7L11 8.4"/><path d="M8.6 11.4 7.2 12.8a2.6 2.6 0 0 1-3.7-3.7L4.9 7.6"/>',
};

/** Names a user may pick for their own service, in a sensible order. */
export const PICKABLE = [
  "sparkle", "star", "book", "text-file", "box", "cube", "window", "terminal",
  "code", "braces", "target", "compass", "search", "chart", "clock", "pulse",
  "database", "cloud", "bolt", "play", "mic", "chat", "link", "home", "plug",
  "tree", "nodes", "flow", "undo", "archive", "at", "pull-request",
];

export function glyphMarkup(name) {
  const glyph = GLYPHS[name] ?? GLYPHS.link;
  return `<svg ${SVG_ATTRS}>${glyph}</svg>`;
}

export function hasGlyph(name) {
  return Object.prototype.hasOwnProperty.call(GLYPHS, name);
}
