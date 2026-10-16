# Contributing

SuperRepo is a browser extension with no backend and no network calls of its own, so contributing is
mostly a matter of editing one data file and proving it still works.

## Getting set up

No dependencies. Node 22+ is the only requirement.

```bash
git clone https://github.com/ranjithrajv/superrepo
cd superepo
npm test         # confirm you start green
npm run setup    # install the pre-commit / pre-push hooks (one time)
npm run preview  # http://127.0.0.1:4173 — no install needed
```

`npm run setup` points `core.hooksPath` at `.githooks`, which git otherwise ignores. After it,
**pre-commit** runs `npm run check` and **pre-push** runs `test`, `check`, `build` and `smoke`. Both
are skippable with `--no-verify`; set `SUPERREPO_SKIP_SMOKE=1` to skip the smoke test locally on a
machine without Chromium.

`npm run preview` serves a mock GitHub repo page with the real content script injected. Only the
browser APIs are stubbed; the parsing, the catalog and the payload builder are the shipping code, so
most changes can be checked without loading anything into a browser.

## Adding or changing a service

**This is the common contribution, and it is one object in
[`src/catalog.js`](src/catalog.js).**

```js
{
  id: "example", name: "Example", abbr: "EX", color: "#0ea5e9",
  category: "ai",           // ai | diagram | run | insight | extra | cli | reference
  kind: "url",              // url (opens a tab) | command (copies a shell command) | link (reference)
  icon: "link",             // key from src/icons.js
  blurb: "One line, in your own words",
  docs: "https://example.com/",   // homepage — required, it is the row's link
  supports: (ctx) => ctx.isGitHub,
  url: (ctx) => `https://example.com/${ctx.owner}/${ctx.repo}${ctx.ghSuffix}`,
}
```

That single object appears in the button cluster, the *More* panel, the context menu and the omnibox.
Nothing else needs touching.

`url` and `command` receive `{ owner, repo, ref, path, tail, webUrl, repoUrl, ghSuffix,
pathSuffix, ingestSuffix, host, isGitHub, line }`. The suffix fields already encode whether the user
is on a file or a directory — prefer them over reassembling the URL by hand, because that is what
keeps a file view narrowing to its containing folder instead of breaking.

`supports` decides where the row appears at all. Return `false` for a host you don't handle and the
row is not offered there, rather than being shown and broken.

After editing the catalog:

```bash
npm run partners   # regenerates the service table in PARTNERS.md
npm run catalog    # regenerates docs/CATALOG.md
npm run treemap    # regenerates the catalog tables in site/directory.js
npm run demo       # regenerates the hosted demo under site/demo/
npm run check      # fails if any generated file is now out of date
```

The generated files are checked in, so treat them as build artifacts rather than
something to hand-edit: change `src/catalog.js` and let the generators do the rest.

The marketing site lives in `site/`: hand-written `index.html`, `site.css` and
`site.js`, plus the hosted demo under `site/demo/`. It is published by
`.github/workflows/pages.yml` — GitHub Pages serves a branch folder only from `/`
or `/docs`, and the site is neither, so it goes out through Actions. The one file
there that is generated rather than written is `site/directory.js`, whose three
catalog tables come from `npm run treemap`.

## What we ask of a service

The rules live in [`PARTNERS.md`](PARTNERS.md), and the same four questions are asked by the
*List my service* issue template. In short: it takes a GitHub URL (or a repo URL for a CLI), it
works, it isn't a duplicate of a row we already have, and it fits a category.

Two things that are not negotiable:

- **Your own voice.** `blurb` is the vendor's wording and we don't restyle it.
- **No pay-to-play.** Placement is decided by the published rule and never by who asks. If a
  contribution reads as an attempt to buy a slot, it will be declined.

Services that ship their own extension are welcome in the catalog. If your button is already on the
page, say so and we'll avoid duplicating it — see [`docs/DOM.md`](docs/DOM.md) for the marker
contract.

## Before you open a PR

```bash
npm test        # unit tests: parsing, every rewrite rule, the payload builder
npm run check   # manifests, referenced files, JS parses, icons, permissions, PARTNERS.md drift
npm run build   # dist/chrome + dist/firefox
npm run smoke   # headless Chromium, against a real github.com page
```

All four should pass. `smoke` needs Chromium installed and network access to github.com — it is the
test that catches the bugs unit tests structurally cannot, because it loads the built extension into
a real browser and fails on any uncaught error in the log.

If you touched anything visual, walk the checklist in [`TESTING.md`](TESTING.md) by hand. A few things
are deliberately outside automation: the context menu's appearance, the omnibox suggestion styling,
and the Firefox background path.

## Reporting a bug

Open an issue with:

- what you did, what you expected, what happened
- your browser and version, and the extension version
- the repo URL you were on when it broke, if it was page-specific

A screenshot helps. So does the console output from the content script — it fails loudly rather than
silently.

## Expanding forge support

Most rows in `src/catalog.js` are GitHub-only. Very few downstream tools can turn a
GitLab, Bitbucket or Codeberg URL into something useful, and a button that looks
alive but opens a broken page is worse than no button — so `supports: gitHubOnly`
is the default and rows simply do not render on hosts they cannot handle.

The work here is upstream, not in this repo:

- **Upstream contributions.** Send a PR or feature request to a listed service so
  it accepts the new forge's URL shape. Usually that is replacing a hard-coded
  `github.com` with "any forge host" in their URL parsing. When a service ships
  that, its row can move from `gitHubOnly` to `always` (or to a host predicate)
  via a one-line change.
- **Independent services.** Where upstream will not take the change, or the
  service is hosted, someone can build a forge-native equivalent and list it as
  a new row. It gets its own entry, colour and blurb — it is not merged into the
  original row.

Trackers and coordination live in [`docs/FORGES.md`](docs/FORGES.md), and the
**[Expand a service to more forge platforms](https://github.com/ranjithrajv/superrepo/issues/new?template=forge-support.yml)**
issue template is the entry point. A row is only added for a new host once the
service's own docs show a working URL there, because `npm run probe` has nothing
stable to verify until then. The rule that keeps a half-finished row off the
page is `test/degrade.test.mjs`.

## Notes for people changing the tricky parts

A few constraints are not obvious and will bite otherwise:

- **The content script imports nothing.** Content scripts can't be ES modules, and dynamic `import()`
  inside one does not work (crbug 40186218). It asks the background for the payload over
  `runtime.sendMessage`. The background owns the catalog.
- **The background is a module worker in Chrome and a classic event page in Firefox.** Chrome takes
  `"type": "module"`; Firefox MV3 does not, so `src/background.firefox.js` is a three-line classic
  loader that imports the real module. Keep logic out of it or it will exist twice.
- **GitHub re-renders the header and takes our node with it.** The re-mount watcher resets the
  shadow-root state deliberately. Without that reset the panel ends up in a detached shadow root and
  silently never appears — there is a regression test for it, and it should stay.
- **GitHub's Primer class names are hashed and unstable.** Anchor on `data-testid`, keep legacy
  class selectors as fallbacks only.
- **The header has two pin modes.** `src/payload.js` resolves `primary` either from
  `primaryIds` (services) or one representative per chosen `categoryIds`
  (categories), using the per-service click counters from the settings object. The
  shipped default is categories. `loadSettings()` normalises an absent `pinMode`
  to `services`, so an old settings file does not silently change which buttons
  someone already has. The unit tests in `test/pin-mode.test.mjs` cover both paths;
  read them before touching either one.

## Releasing

Releases go out in three stages, and the stage is the whole point of the tag name:

| Tag | Who it is for |
|---|---|
| `v0.1.0-alpha` | people already using it; expect things to move |
| `v0.1.0-beta` | the shape is settled, the details are not |
| `v0.1.0` | the version you point the store listings at |

Push the tag and the `Release` workflow tests, checks, packages all four browser
builds and publishes them as release assets. Nothing else is required:

```bash
git tag -a v0.1.0-beta -m "v0.1.0-beta" && git push origin v0.1.0-beta
```

Anything with a hyphen after the version is flagged as a pre-release, so
`alpha` and `beta` never show up as "Latest"; the bare `v0.1.0` is the only one
that does.

Two things follow from that, and both have bitten this project already:

**The site's download buttons name a tag.** `site/index.html` links straight to
`/releases/download/<tag>/superepo-<browser>.zip`, so each stage needs those
links moved to the new tag. There is no rolling URL that works here: GitHub's
`/releases/latest/` skips pre-releases, so it 404s for as long as the newest
release is an alpha or a beta.

**A stable tag is not a dry run.** Pushing `v0.1.0` publishes it immediately, as
the current release, to anyone watching the repo. Decide the tag deliberately.

## Licence

MIT. Contributors keep copyright on their work.