/**
 * Styles for the injected UI, as a string.
 *
 * This is a .js file rather than a .css file on purpose:
 *   · content scripts are classic scripts and cannot import a stylesheet
 *   · fetching an extension .css from a content script is unreliable, and a
 *     <link> would need web_accessible_resources
 *   · the sheet is applied through adoptedStyleSheets, which is not subject to
 *     the page's CSP (unlike injecting a <style> element)
 *
 * Colours come from GitHub's own CSS custom properties, so the UI follows the
 * page's light/dark/system theme for free, with sane fallbacks.
 */
globalThis.SuperRepoContentStyles = `
:host {
  display: inline-block;
  position: relative;
  font-family: var(--fontStack-system, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif);
  font-size: 12px;
  line-height: 20px;
  color: var(--fgColor-default, #1f2328);
  text-align: left;
}

:host([data-placement="floating"]) {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483000;
}

:host([data-placement="inline"]) { z-index: 60; }

* { box-sizing: border-box; }

/* ----------------------------------------------------------------- the buttons */

.cluster {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.cluster[data-style="icon"],
.cluster[data-style="monogram"] { gap: 4px; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  font: inherit;
  font-weight: 600;
  color: var(--button-default-fgColor-rest, #24292f);
  background: var(--button-default-bgColor-rest, #f6f8fa);
  border: 1px solid var(--button-default-borderColor-rest, rgba(31, 35, 40, 0.15));
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--button-default-shadow-resting, 0 1px 0 rgba(31, 35, 40, 0.04));
}

/* Icon-only: a square button the same height as GitHub's own header buttons. */
.btn--icon {
  width: 32px;
  height: 32px;
  padding: 0;
  justify-content: center;
  gap: 0;
}

.btn--icon:hover .glyph,
.btn--icon:hover .mark {
  color: color-mix(in srgb, var(--c, #59636e) 92%, var(--fgColor-default, #1f2328));
}

/* A glyph: a monochrome inline SVG tinted with the service's hue. */
.glyph {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: color-mix(in srgb, var(--c, #59636e) 80%, var(--fgColor-default, #1f2328));
}

.glyph svg {
  display: block;
  width: 16px;
  height: 16px;
}

.glyph--muted { color: var(--fgColor-muted, #59636e); }

.btn--icon .glyph,
.btn--icon .glyph svg {
  width: 18px;
  height: 18px;
}

.btn:hover {
  background: var(--button-default-bgColor-hover, #f3f4f6);
  border-color: var(--button-default-borderColor-hover, rgba(31, 35, 40, 0.15));
}

.btn:active { background: var(--button-default-bgColor-active, #ebecf0); }

.btn:focus-visible,
.filter:focus-visible,
.row:focus-visible {
  outline: 2px solid var(--focus-outlineColor, #0969da);
  outline-offset: 1px;
}

.btn[aria-expanded="true"] {
  background: var(--button-default-bgColor-active, #ebecf0);
}

.btn--more { color: var(--fgColor-muted, #59636e); }

/* Monogram chip — the 2-3 letter stand-in for a glyph, under buttonStyle:monogram.
   Two-tone so it stays legible on any hue, in either theme. */
.mark {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 3px;
  border-radius: 5px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: color-mix(in srgb, var(--c) 16%, var(--bgColor-default, #fff));
  color: color-mix(in srgb, var(--c) 70%, var(--fgColor-default, #1f2328));
  border: 1px solid color-mix(in srgb, var(--c) 26%, transparent);
}

/* ------------------------------------------------------------------- the panel */

.panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: min(384px, calc(100vw - 32px));
  max-height: min(72vh, 620px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--overlay-bgColor, var(--bgColor-default, #ffffff));
  border: 1px solid var(--borderColor-default, #d1d9e0);
  border-radius: 12px;
  box-shadow: var(--shadow-overlay, 0 12px 28px rgba(140, 149, 159, 0.3));
}

:host([data-placement="floating"]) .panel {
  top: auto;
  bottom: calc(100% + 8px);
}

.panel[hidden] { display: none; }

.panel-head {
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--borderColor-muted, var(--borderColor-default, #d1d9e0));
}

.repo {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 8px;
  min-width: 0;
}

/* "Copy link to this file" sits at the end of the header row. */
.repo .page-copy {
  margin-left: auto;
  flex: none;
  align-self: center;
}

.repo strong {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  font-size: 11px;
  color: var(--fgColor-muted, #59636e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter {
  width: 100%;
  padding: 5px 9px;
  font: inherit;
  color: inherit;
  background: var(--bgColor-default, #ffffff);
  border: 1px solid var(--borderColor-default, #d1d9e0);
  border-radius: 6px;
}

.filter::placeholder { color: var(--fgColor-muted, #59636e); }

.list {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 4px 0 6px;
}

.group-title {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  margin: 0;
  padding: 6px 12px 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--fgColor-muted, #59636e);
  background: linear-gradient(var(--overlay-bgColor, var(--bgColor-default, #fff)) 70%, transparent);
}

/* Inline settings — the controls that live inside the panel. */

.view {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  flex: 1;
}

.view .list {
  overflow-y: auto;
  min-height: 0;
}

.settings-view {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 12px 10px;
  overflow-y: auto;
  min-height: 0;
}

.set-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 0;
  font-size: 12px;
}

.set-row + .set-row {
  border-top: 1px solid var(--borderColor-muted, var(--borderColor-default, #d1d9e0));
}

.set-label {
  color: var(--fgColor-default, #1f2328);
  font-weight: 500;
  line-height: 1.35;
}

/* The pin marking the service that fills its category's header button. Quiet by
   default so a list of rows does not read as a list of buttons; filled when it
   is the one that would actually open. */
.pin-btn svg {
  width: 13px;
  height: 13px;
}

.pin-btn {
  color: var(--fgColor-muted, #59636e);
  opacity: 0;
  transition: opacity 0.12s ease, color 0.12s ease;
}

/* Shown on the current default at rest, so the answer is visible without
   hovering anything — and on every other row the moment the pointer or keyboard
   arrives, because a control you cannot find is not a control. */
.pin-btn[data-pinned="true"],
.row:hover .pin-btn,
.row:focus-within .pin-btn {
  opacity: 1;
}

.pin-btn[data-pinned="true"] {
  color: var(--fgColor-accent, #0969da);
  opacity: 1;
}

.pin-btn:hover {
  color: var(--fgColor-accent, #0969da);
}

.pin-btn:focus-visible {
  outline: 2px solid var(--focus-outlineColor, #0969da);
  outline-offset: 1px;
  opacity: 1;
}

.set-section {
  margin: 10px 0 2px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--fgColor-muted, #59636e);
}

.set-section:first-child {
  margin-top: 0;
}

.set-select {
  flex: 0 0 auto;
  max-width: 62%;
  appearance: none;
  font: inherit;
  font-size: 11.5px;
  color: var(--fgColor-default, #1f2328);
  background: var(--bgColor-default, #fff);
  border: 1px solid var(--borderColor-default, #d1d9e0);
  border-radius: 6px;
  padding: 3px 6px;
  cursor: pointer;
  text-align: right;
}

.set-check {
  flex: 0 0 auto;
  margin: 0;
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--accent-fg, var(--fgColor-accent, #0969da));
}

.set-more {
  margin-top: 10px;
  align-self: flex-start;
  font-size: 11px;
}

.set-select:focus-visible,
.set-check:focus-visible,
.set-more:focus-visible {
  outline: 2px solid var(--focus-outlineColor, #0969da);
  outline-offset: 1px;
  border-radius: 4px;
}

/* The heading glyph sits in 10px caps, so it is sized to that, not to a row. */
.group-title .glyph {
  width: 12px;
  height: 12px;
  color: var(--fgColor-muted, #59636e);
}

.group-title .glyph svg {
  width: 12px;
  height: 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 6px 12px;
  font: inherit;
  color: inherit;
  text-align: left;
  background: none;
  border: 0;
  cursor: pointer;
}

.row:hover { background: var(--control-transparent-bgColor-hover, rgba(208, 215, 222, 0.32)); }

.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.row-name {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
}

.row-blurb {
  font-size: 11px;
  color: var(--fgColor-muted, #59636e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-meta {
  font-size: 10.5px;
  color: var(--fgColor-muted, #59636e);
  opacity: 0.85;
}

/* Quiet state badges: cost tier and opt-in. Shown only for the non-free /
   default-off rows, so the common case stays a single short line. */
.row-badge {
  align-self: flex-start;
  margin-top: 3px;
  padding: 0 5px;
  border: 1px solid var(--borderColor-muted, #d1d9e0);
  border-radius: 999px;
  font-size: 10px;
  line-height: 15px;
  color: var(--fgColor-muted, #59636e);
  white-space: nowrap;
  text-transform: capitalize;
}
.row-badge--muted { opacity: 0.75; }

/* Which slice of the repo this row actually receives. Only rendered on file and
   directory views, where the answer is not obvious and is worth saying. */
.row-scope {
  align-self: flex-start;
  margin-top: 3px;
  padding: 0 5px;
  border: 1px solid var(--borderColor-muted, #d1d9e0);
  border-radius: 999px;
  font-size: 10px;
  line-height: 15px;
  color: var(--fgColor-muted, #59636e);
  white-space: nowrap;
}

.row-actions { display: flex; gap: 2px; opacity: 0; }
.row:hover .row-actions,
.row:focus-within .row-actions { opacity: 1; }

/* A row carrying the default must show its pin without a hover — otherwise the
   one piece of state the panel is there to reveal is hidden behind the same
   gesture that reveals the copy button. :has() is well past this extension's
   Firefox floor of 142. */
.row-actions:has(.pin-btn[data-pinned="true"]) { opacity: 1; }

.icon-btn {
  padding: 2px 5px;
  font: inherit;
  color: var(--fgColor-muted, #59636e);
  background: none;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
}

.icon-btn:hover {
  color: var(--fgColor-default, #1f2328);
  background: var(--control-transparent-bgColor-hover, rgba(208, 215, 222, 0.32));
}

.panel-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 12px;
  border-top: 1px solid var(--borderColor-muted, var(--borderColor-default, #d1d9e0));
}

.status {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  color: var(--fgColor-muted, #59636e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status code { font-family: var(--fontStack-monospace, ui-monospace, SFMono-Regular, monospace); }

.linkish {
  padding: 3px 6px;
  font: inherit;
  color: var(--fgColor-muted, #59636e);
  background: none;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
}

.linkish:hover { color: var(--fgColor-default, #1f2328); background: var(--control-transparent-bgColor-hover, rgba(208, 215, 222, 0.32)); }

.empty {
  padding: 20px;
  text-align: center;
  color: var(--fgColor-muted, #59636e);
}

.hint {
  margin: 0 0 6px;
  font-size: 11px;
  color: var(--fgColor-muted, #59636e);
}

.note {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--fgColor-attention, #9a6700);
}

.toast {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translate(-50%, 6px);
  padding: 5px 12px;
  font-weight: 600;
  color: var(--bgColor-default, #fff);
  background: var(--fgColor-default, #1f2328);
  border-radius: 999px;
  box-shadow: var(--shadow-overlay, 0 10px 24px rgba(140, 149, 159, 0.35));
  opacity: 0;
  transition: opacity 0.14s ease, transform 0.14s ease;
  pointer-events: none;
}

.toast[data-show="true"] { opacity: 1; transform: translate(-50%, 0); }

@media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
`;
