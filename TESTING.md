# Manual testing

For loading the extension by hand and checking it actually behaves. Everything below was verified
by `npm run smoke` on a real github.com page; this file is for the parts a robot cannot judge.

## Build and load

```bash
npm run build
```

**Chrome / Edge / Brave**

1. Go to `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → select the `dist/chrome` folder in this repo
4. Chrome will ask to read and change your data on **github.com** only. That is the in-page UI;
   there is no way to show buttons in the page without it, and it is the only site requested at
   install time.

**Firefox**

1. Go to `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on…** → select
   `dist/firefox/manifest.json` in this repo
3. Temporary add-ons are gone when Firefox restarts — you will re-load it each session.

Both point at the folder containing `manifest.json`. Load unpacked from the UI works in branded
Chrome; only the `--load-extension` command-line flag was removed in Chrome 137+.

## Reloading after a change

```bash
npm run build
```

Then reload the extension — **not** just the page:

- **Chrome**: `chrome://extensions` → the ↻ on the SuperRepo card
- **Firefox**: `about:debugging` → **Reload** on the SuperRepo entry

A page reload alone will not pick up a rebuilt content script.

## Checklist

Open `https://github.com/octocat/hello-world`.

| # | Do this | Expect |
|---|---|---|
| 1 | Look at the repo header | Four glyph buttons after Watch/Fork/Star, then **⋯** — coloured icons, no text |
| 2 | Hover one of them | Tooltip: service name and what it does |
| 3 | Tab to a button | Focus ring; the screen-reader name is the service name |
| 4 | Click **⋯** | Panel drops below; the filter has focus |
| 3 | Type `wiki` in the filter | Only matching services (DeepWiki) |
| 4 | Press `Esc` | Panel closes, focus returns to More |
| 5 | Hover a row | Footer previews the exact URL it will open |
| 6 | Click **⧉** on a row | Toast says "Copied"; paste somewhere to confirm |
| 7 | Click **GitIngest** | gitingest.com opens for that repo, in a new tab |
| 8 | ⌘/Ctrl-click a row | Opens in a background tab, panel stays open |
| 9 | Open `…/octocat/hello-world/blob/master/README` and hover GitIngest | Target is `…/tree/master` — a file view narrows to its folder |
| 10 | Open `https://gitlab.com/group/project` | Floating cluster bottom-right, and the panel lists only the services that can take a GitLab repo, not the GitHub-only ones — but only after granting GitLab below |
| 10a | Options → *Other sites* → **Enable** on gitlab.com, then reload a GitLab repo page | Chrome asks once; buttons and the panel appear there |
| 10b | …→ **Remove access**, then reload | Buttons stop appearing on GitLab; the right-click menu still works |
| 11 | Open `https://github.com/settings/profile` | **Nothing** is injected — reserved path, not a repo |
| 12 | Right-click a repo page → **SuperRepo** | Submenu of services; picking one opens it |
| 13 | Address bar: type `gp coderamp-labs/gitingest` | Suggestions are services, each showing the target URL |
| 14 | `Alt+Shift+G` on a repo page | Toggles the panel |
| 15 | Options → *What the buttons show* → **Two-letter chip** | Buttons swap their glyphs for 2–3 letter monograms, without reloading |
| 16 | …that same setting → **Icon and name** | Buttons grow labels on the next render, without reloading the page |
| 17 | Options → pin `UIthub`, unpin `DeepWiki`, reload the page | Buttons match the new set |
| 18 | Options → *Where the buttons go* → **Only as a floating cluster** | Buttons move to the bottom-right |
| 19 | Options → that same setting → **Nowhere** | No buttons anywhere; menu and `gp` still work |
| 20 | Options → *Add your own* with `https://example.com/{owner}/{repo}` | It appears in the panel and as an option to pin |
| 21 | Switch GitHub to dark mode | Injected UI follows; it uses GitHub's own CSS variables |
| 22 | Zoom to 150% and to 80% | Buttons stay aligned with GitHub's own |

## Troubleshooting

| Symptom | Check |
|---|---|
| No buttons on a repo page | You are on a repo page (not `/settings`, `/orgs`, `/marketplace`). Reload the extension, then the page. |
| Buttons in the wrong place | Expected during a GitHub redesign: it falls back to floating. Switch *Where the buttons go* to force a mode. |
| Panel opens but appears empty | The content script talks to the background over messages. Open the service worker console (`chrome://extensions` → *service worker*) and look for `[superepo]` errors. |
| Copy does nothing | Clipboard writes need a user gesture; the ⧉ button supplies one. Clicking the row of a `cmd` service also copies. |
| Nothing works after a rebuild | You reloaded the page but not the extension. |

## Inspecting it

The whole UI lives in a shadow root, so it is invisible to normal selectors. In the page console:

```js
const host = document.querySelector('superepo-root');
host.shadowRoot.querySelectorAll('.row').length;         // rows currently listed
host.shadowRoot.querySelector('.meta').textContent;      // detected repo · ref · path
host.shadowRoot.querySelectorAll('.cluster .btn').length; // pinned buttons + More
```

To see what the background decided:

```js
// In the service worker console (chrome://extensions → service worker → Inspect)
chrome.runtime.sendMessage; // then instead, from the page console:
chrome.runtime.sendMessage({ type: 'superepo:catalog', url: location.href })
  .then((p) => console.log(p.groups.map((g) => [g.label, g.items.length])));
```

## Resetting state

Settings and the usage counters that drive *Frequently used* live in `storage.local`. Either use
**Restore defaults** in the options page, or clear everything:

```js
chrome.storage.local.clear();
```

Removing and re-adding the extension also resets it — and resets anything you pinned while testing.

## Known gaps at this point

- Firefox's background path is lint-verified but has **not** been executed: the temporary add-on flow
  is not automatable here, so give the `Alt+Shift+G`, right-click and `gp` paths a manual pass.
- The context menu's visual appearance and the omnibox suggestion styling are unchecked by
  automation.
- Private repos are not special-cased: the buttons appear, but the destination services may refuse
  the repo.
