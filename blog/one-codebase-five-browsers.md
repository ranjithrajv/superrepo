# One codebase, five browsers: what actually differs

SuperRepo ships to Chrome, Edge, Brave, Firefox and Safari from a single source
tree — on desktop and, through the same builds, on Firefox for Android, Edge for
Android and Safari for iOS. The interesting part is not that it works everywhere —
plenty of extensions do that badly. The interesting part is the handful of places
where the platforms genuinely disagree, and how few of them there are once you design
around them.

Here is the honest map, including the parts that bit us.

## Constraint one: a content script cannot be a module

The UI is a content script, and content scripts cannot be ES modules. Dynamic
`import()` inside one does not work either — it is a long-standing Chromium bug
(crbug 40186218). So the content script imports nothing at all.

Instead it asks the background for the payload it needs over
`runtime.sendMessage`, and the background is the single place that owns the catalog.
No bundler, no shared module graph, and no duplicate copy of the rewrite rules living
in two places.

## Constraint two: the background is a module in Chrome and a classic script in Firefox

Chrome loads the service worker as a module — `"type": "module"` — which is how the
real background code gets to use `import`.

Firefox MV3 runs an event page and will not accept `"type": "module"`. So
`src/background.firefox.js` is a three-line classic loader that imports the real
module. That is the entire Firefox-specific background. No logic is duplicated; if
you were tempted to fork the background "just for Firefox", that fork is the bug.

## Constraint three: Safari will not load an unpacked MV3 extension from a folder

Safari still needs a companion app around the extension, so `dist/safari` is
essentially `dist/chrome` repackaged through Apple's
`safari-web-extension-converter` into an Xcode project you build and run locally —
one project that targets both macOS and iOS/iPadOS. Same code, same manifest shape,
one native wrapper the other three engines do not need.

## Constraint four: GitHub keeps taking our node away

GitHub's React re-renders the repository header and removes extension nodes with it.
A watcher re-mounts the cluster and **resets the per-shadow-root state** — without
that reset the panel ends up in a detached shadow root and silently never appears
again. There is a regression test for precisely this, because it is the kind of bug
that looks like "the extension just stopped working" and is miserable to diagnose
after the fact.

## Constraint five: the page's CSS and CSP are hostile by default

The UI lives in a shadow root, so GitHub's stylesheet cannot reach in and ours cannot
leak out. Styles are applied through `adoptedStyleSheets`, which the page's Content
Security Policy does not block — a `<style>` injection can be, depending on the
policy. And rather than inventing a palette, the cluster reads GitHub's own CSS
custom properties, so it follows light and dark themes for free.

## Constraint six: on a phone there is no header to anchor to

The in-page cluster normally appends to GitHub's `repo-header-actions`. GitHub's
mobile layout has no such header, so on Firefox for Android, Edge for Android and
Safari for iOS the cluster falls back to its floating placement — fixed to the
bottom-right — rather than disappearing. Same content script, same catalog, a
different anchor outcome. Few extensions in this category ship on a phone at all,
which is why the fallback is worth having.

## What this buys

One catalog, five targets, and a permission footprint that is small on purpose:
`storage`, `contextMenus`, `clipboardWrite`, `scripting`, and a content script on
`github.com`. Nothing is requested at install for GitLab; that host is optional and
opt-in. There is no `tabs`, no `activeTab`, no `webRequest`, and no backend to call.

## How it stays honest

The reasons above are the reasons the code is shaped the way it is, and they are easy
to undo by accident. So they are pinned by tests:

- A unit suite covers URL parsing, every rewrite rule, the panel payload, and the
  pages that must be rejected rather than guessed at.
- `npm run check` validates every manifest, the files they reference, that each JS
  file parses, and that the icons and permissions are sane.
- `npm run smoke` loads the built extension into headless Chromium and asserts
  behaviour on a **real** github.com page — buttons inline in the header, the panel's
  rows and groups, a correct GitIngest target, file views narrowing to their
  containing folder, and a clean re-mount when React replaces the header. It fails
  on **any** uncaught error in the browser log. That is how the
  dynamic-import-in-a-worker bug and the detached-panel bug were both caught.
- `npx web-ext lint` on the Firefox build reports zero errors and zero notices.

The lesson that generalises: cross-browser pain is usually not "the platforms are
wildly different". It is three or four specific disagreements, and the way through
is to find each one and design a single seam for it — one loader file, one repackage
step, one re-mount watcher — instead of forking the whole thing per browser.

The source is at `github.com/ranjithrajv/superrepo`. If you ship a WebExtension and
some of this looks familiar, the seam notes are in `CONTRIBUTING.md`.
