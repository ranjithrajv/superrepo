# Submitting to both stores

Everything that can be prepared has been. This is the list of what is left, which
is all of it — it needs your accounts, your money and your judgement.

## Done, and verified

- [x] `npm test` — 64 passing
- [x] `npm run check` — manifests, referenced files, permissions sanity
- [x] `npm run smoke` — loads in headless Chromium against real github.com
- [x] `npx web-ext lint` on `dist/firefox` — **0 errors, 0 notices, 4 warnings**
- [x] `npm run package` — `dist/superepo-chrome.zip`, `dist/superepo-firefox.zip`
- [x] `npm run shots` — all six images at exact store dimensions
- [x] Store copy written and checked against field limits — `LISTING.md`
- [x] Privacy statements reconciled with the manifest — `PRIVACY.md`
- [x] Not-affiliated disclaimer in the README footer **and** the manifest description

## Not done — needs you

- [ ] **The repo is not public, and is not a git repo.** `github.com/ranjithrajv`
      was checked on 2026-10-14 and the repo does not exist. Both stores require a
      homepage and a support URL that resolve. `git init`, first commit, push.
- [ ] **Chrome Web Store** — needs a one-off $5 developer fee.
      - `chrome.google.com/webstore/devconsole` → *Add new item* → *Upload a Chrome extension package* → `dist/superepo-chrome.zip`
      - Fill in the form from `LISTING.md`: name, short description, category *Developer Tools*, detailed description
      - Privacy practices → **no data collected**
      - Upload `promo-small.png`, `promo-large.png`, and the three 1280×800 screenshots
      - Set homepage + support URL
      - *Submit for review*
- [ ] **Firefox Add-ons** — listing is free; review is slower.
      - `addons.mozilla.org/developers` → *Submit a New Add-on* → `dist/superepo-firefox.zip`
      - It will flag the `data_collection_permissions` key as requiring Firefox 142+
      - Copy from `LISTING.md`; category *Other*; declare no data collected
      - Upload `promo-large.png` and `screenshot-4-promo.png` (1366×768)
      - Code signing is optional for a listed add-on — it becomes required the first
        time you update an existing listing. Worth doing before that point.

## Before you click submit

- [ ] Check the Chrome Web Store name is free **by hand** in the dashboard. It has no
      public API, and neither store lets you rename a listing after publishing.
- [ ] Check the AMO slug `superepo` / `super-repo` is still free.
- [ ] Confirm the repo is public and the README renders correctly on github.com —
      that URL is your homepage for both listings.
- [ ] Read the manifest description one more time; it is the only thing shown before
      install and it carries the not-affiliated line.

## Review notes

Expect to be asked about the host permission. The answer, in one sentence: *the
buttons render inside the page, so the extension needs to read that page; it reads
nothing else and sends nothing anywhere.* If asked about `scripting`, it has no
effect without a host permission the user grants by hand.

The four `web-ext lint` warnings are `innerHTML` assignments for the icon glyphs.
They are warnings, not errors, and AMO does not block on them — but expect the
question. The answer is that the value is always a lookup in a closed table of 32
hand-written SVG icons, never anything a person can type, and a unit test asserts
every shipped glyph is free of scripts and event handlers.

## After publishing

- [ ] Bump the version in both manifests for every future release. Both stores
      reject a re-upload of an existing version number.
- [ ] Re-run `npm run shots` if the UI changes — the store screenshots are checked
      in, so they can otherwise drift from what ships.
- [ ] Partner outreach (`PARTNERS.md`) is the distribution plan. Publishing is the
      thing that makes it possible, not the thing that does it.