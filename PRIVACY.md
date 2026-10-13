# Privacy

**SuperRepo collects nothing.**

There is no account, no analytics, no telemetry, no tracking, and no server. The
extension has no backend and makes no network requests of its own. The only thing
it ever does is open a URL you chose to open.

## What is stored, and where

Everything stays in your browser, in `storage.local` — your settings, which
services you enabled, which you pinned, your own custom services, and a counter
of how many times you clicked each service. That counter never leaves the device
and there is no code path that sends it anywhere.

Deleting it: clear the extension's storage from your browser's extension settings,
or use the reset control in **Settings**.

## What is sent, and where

Nothing. To make that checkable rather than a promise:

- **Permissions.** `storage`, `contextMenus`, `clipboardWrite`, `scripting`. Not `tabs`, not
  `activeTab`, not `webRequest`, not `<all_urls>`. `scripting` is used only to inject the same
  content script into an optional host you have already granted, and asks for nothing on its own.
- **Host access.** `github.com`, declared in the manifest, and nothing else at install time.
  `gitlab.com` is an *optional* host and stays off until you turn it on in
  **Settings → Other sites**. Bitbucket and Codeberg are never requested: the right-click menu and
  the address bar work there anyway, because a context menu is matched by URL and needs no host
  permission. Turning access off removes it and the buttons go with it. You can also turn the
  in-page UI off entirely (**Settings → placement → Nowhere**).
- **Host permissions for third-party tools.** There are none. SuperRepo holds no
  access to any of the services in its catalog. Clicking a button hands the URL
  to your browser, which then loads that site under *its own* permissions and *its
  own* privacy policy — not ours. We see nothing about what happens there, and we
  have no way to know you visited.
- **No remote code.** Nothing is fetched at runtime and no code is downloaded
  after install. Everything the extension runs is in the package you installed.

## Optional, and off by default

We may add an explicitly opt-in toggle that shares an anonymous per-service click
count with the tools you use — `{service, count}`, never a repo name, URL, owner
or anything identifying. It will be off by default, it will say so on its face,
and it will not exist until it is built. If it never ships, nothing is lost.

## Children

Not directed at children, and we collect nothing from anyone.

## Changes

Any change to this policy ships with the extension version that makes it, and the
privacy tab in both stores will point at the version in this repository.

## Independent tool

SuperRepo is not affiliated with, endorsed by, or sponsored by GitHub, Microsoft,
Cognition, StackBlitz, Sourcegraph, or any of the tools it links to. Names, logos
and marks belong to their owners. This extension is a directory of links; it does
not wrap, proxy, embed or modify any of them.

## Contact

`superepo@ranjithraj.dev` — questions about privacy, or anything else.