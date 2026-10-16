# Submitting to the stores

Everything that can be prepared has been. Three of the four listings are live;
the last one is in review.

## Store status

State as of **2026-10-17**:

| Store | Identifier | Status |
|---|---|---|
| Chrome Web Store | `dhgigpmjjookcmdbfmeodiafhdlbhfde` | **Live** |
| Microsoft Edge Add-ons | `mjdmnnjekkkeihdjojdcbppmcpimkkbo` | **Live** |
| Firefox Add-ons (AMO) | `superepo@ranjithraj.dev` | **Live** |
| Safari (App Store) | macOS & iOS companion app — `safari/SuperRepo.xcodeproj` | In review |

Listing URLs:

- Chrome — <https://chromewebstore.google.com/detail/superrepo/dhgigpmjjookcmdbfmeodiafhdlbhfde>
- Edge — <https://microsoftedge.microsoft.com/addons/detail/mjdmnnjekkkeihdjojdcbppmcpimkkbo>
- Firefox — <https://addons.mozilla.org/en-US/firefox/addon/superepo/>
- Safari — the App Store link lands when review passes; one submission covers
  macOS and iOS. Until then the site's Safari button points at the release zip.

Chrome, Edge and Firefox are live and wired into `site/index.html`; only the Safari
URL 404s for the public until its review clears. The Edge listing also backs **Edge
for Android**, the Chrome listing backs every Chromium browser that loads the Chrome
Web Store, the Firefox build covers **Firefox for Android**, and the one Safari app
covers **macOS and iOS**.

## Done, and verified

- [x] `npm test` — 135 passing
- [x] `npm run check` — manifests, referenced files, permissions sanity
- [x] `npm run smoke` — loads in headless Chromium against real github.com
- [x] `npx web-ext lint` on `dist/firefox` — **0 errors, 0 notices, 5 warnings**
- [x] `npm run package` — `dist/superepo-chrome.zip`, `dist/superepo-firefox.zip`
- [x] `npm run shots` — five 1280×800 screenshots, both promo tiles and the Edge
      listing logo, all at exact store dimensions, all 24-bit RGB PNG with no
      alpha channel
- [x] Store copy written and checked against field limits — `LISTING.md`
- [x] Chrome privacy fields drafted, one per permission, matched to `manifest.chrome.json` — `PRIVACY-PRACTICES.md`
- [x] Privacy statements reconciled with the manifest — `PRIVACY.md`
- [x] Not-affiliated disclaimer in the README footer **and** the manifest description
- [x] Repo is public at `github.com/ranjithrajv/superrepo` — the homepage and
      support URL both stores require
- [x] Submitted to Chrome, Edge, Firefox and Safari — see *Store status* above
- [x] Firefox listing enabled for **Firefox for Android** (AMO)

## While Safari clears

- **Firefox** — live. Code signing was optional for the listing and becomes
  required the first time it is updated, so enable it before the next release.
  The listing is enabled for **Firefox for Android** (the manifest's 142 floor
  covers it), so the one `dist/firefox` build covers desktop and Android.
- **Safari** — the App Store listing goes through App Review like any Mac or iOS app
  (`safari-web-extension-packager --rebuild-project` adds the iOS target if the
  converter did not); the `safari-web-extension-converter` output in `safari/` is
  what was submitted, and the one listing covers macOS and iOS.

## Review notes

Expect to be asked about the host permission. The answer, in one sentence: *the
buttons render inside the page, so the extension needs to read that page; it reads
nothing else and sends nothing anywhere.* If asked about `scripting`, it has no
effect without a host permission the user grants by hand.

The five `web-ext lint` warnings are `innerHTML` assignments for the icon glyphs —
three in `content.js`, two in `options.js`. They are warnings, not errors, and AMO
does not block on them — but expect the question. The answer is that the value is
always a lookup in a closed table of 33 hand-written SVG icons in `src/icons.js`,
never anything a person can type, and a unit test asserts every shipped glyph is
free of scripts and event handlers.

## After publishing

- [ ] Bump the version in every manifest for each future release. Every store
      rejects a re-upload of an existing version number.
- [ ] Re-run `npm run shots` if the UI changes — the store screenshots are checked
      in, so they can otherwise drift from what ships.
- [ ] Point the site's install buttons at each store listing as it goes live. Chrome,
      Edge and Firefox are wired (`site/index.html`); Safari follows, and until then
      its button downloads the build from the release page.
- [ ] Partner outreach (`PARTNERS.md`) is the distribution plan. Publishing is the
      thing that makes it possible, not the thing that does it.
