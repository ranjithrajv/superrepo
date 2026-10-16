# The extension that never phones home

Every browser extension is a small program you hand a large amount of trust to. It
runs inside every page you visit, it can read what you read, and most of us install
it in three seconds and never look at it again.

The category norm, for extensions like this one, is to spend that trust quietly. An
analytics SDK that reports "anonymous" events. A remote config endpoint so the
vendor can change behaviour without a release. A "usage ping" with a random install
id you were never shown. None of it is unusual, and almost none of it is disclosed
where you would see it.

SuperRepo does none of it. That is not a promise on a marketing page — it is a
property you can check in a few minutes, because there is nothing to check beyond
the source you already have.

## What it actually does

It reads the URL in your address bar, builds another URL from it, and hands that URL
to the browser to navigate to. That is the entire transaction.

- No proxy and no redirect through a server we run.
- No wrapper or interstitial page between you and the tool you clicked.
- No GitHub token, no API call, no OAuth.
- No backend, because there is nothing a backend would be for.

The catalog of tools lives in the extension itself, as one data file. The whole
product is "construct a URL". A URL constructor has nothing to phone home about.

## What it asks for

| Permission | Why |
|---|---|
| `storage` | Your settings and your local click counters, in `storage.local` |
| `contextMenus` | The right-click menu |
| `clipboardWrite` | The copy buttons |
| `scripting` | Used only to inject into an optional host *you* granted |
| content script on `github.com` | This is the UI — it is what makes the buttons appear |
| optional host access for `gitlab.com` | Off until you turn it on in Settings; nothing is requested at install |

No `tabs`, no `activeTab`, no `webRequest`. The single real ask is host access to
`github.com`, and it is unavoidable: if the buttons render inside the page, the
extension has to be allowed to see the page. There is a setting — *Placement →
Nowhere* — that stops the script rendering entirely if the trade is not for you.

## How to verify it, in five minutes

1. Open the source. There is no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no
   `sendBeacon` anywhere in the shipped code. There is no URL that could be an
   endpoint.
2. The only network activity in the repository at all is `scripts/probe.mjs` — a
   development script that checks whether the listed services are still alive so
   the catalog stays honest. It is not part of the extension build and never runs
   in your browser.
3. Run `npx web-ext lint` against the Firefox build. It comes back with zero
   errors.
4. The Firefox manifest declares `data_collection_permissions: { required: ["none"] }`,
   which is the strongest statement the platform lets you make.

If you find a call we said we do not make, open an issue and it becomes the
priority.

## The honest caveats

- **The extension makes no requests. The sites it opens do.** When you click the
  DeepWiki button, you go to DeepWiki, and DeepWiki's privacy policy — not ours —
  governs what happens next. SuperRepo is a door, not a room. It does not proxy,
  scrub or stand in front of anything.
- **It counts your clicks.** Per service, in `storage.local`, on your machine, to
  fill the *Frequently used* section. Those counts have never been sent anywhere.
  There is a planned, off-by-default toggle to share a bare `{service, count}` pair
  with the tools you actually use — never a repo, owner or URL — and until that
  ships, nothing leaves the browser.
- **Host access is the price of the in-page UI.** We would rather be explicit about
  that than pretend a popup-only design is the same thing.

## Why this matters now

Manifest V3 already bans remotely hosted *code*, but remote *configuration*,
telemetry and "anonymous" pings are alive and well across the store. Meanwhile the
stores now require a data-usage disclosure that most users never read. An extension
with no backend is harder to abuse and easier to review — you can audit the whole
thing in an afternoon, and the reviewer can too.

The interesting design constraint is not "add privacy features". It is refusing
the architecture that would have needed them. No server means no data to leak, no
policy to keep current, and no endpoint to go dark when the project stops being
maintained.

## Audit it

The source is public and MIT licensed. Read it, build it, lint it. The extension is
at `github.com/ranjithrajv/superrepo`. If the argument above is only true until the
first commit that adds a `fetch`, that commit is the whole test, and it is a test
anyone can run.
