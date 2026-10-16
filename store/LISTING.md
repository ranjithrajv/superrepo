# Store listing copy

Everything the stores ask for, ready to paste. Field limits are noted so you can
check rather than guess. Live submission state is in [`SUBMIT.md`](SUBMIT.md).

## Shared metadata

| Field | Value | Limit |
|---|---|---|
| Name | `SuperRepo` | Chrome 45 · AMO 50 |
| Version | `0.1.0` | matches the manifest |
| Author / contact | Ranjith Raj — `superepo@ranjithraj.dev` | |
| Licence | MIT | Chrome asks for a licence URL: use the repo's `LICENSE` |
| Homepage | the public repo URL | required by both |
| Support URL | repo `/issues` | required by Chrome |

**Short description** (already in the manifest, 119/132):

> Turn every repo into a SuperRepo — a prompt, a diagram, a wiki, an IDE, a podcast and more. Not affiliated with GitHub.

**Category** — Chrome: `Developer Tools`. AMO: `Other`.

**Data usage** — declare **no data collected, no data sold, no data shared** in both
stores' own disclosures. Do not put the privacy text in the description; link
`PRIVACY.md` instead. Both stores cross-check this against what they see in the
manifest, and `PRIVACY.md` matches.

---

## Detailed description

Copy everything between the rules.

---

Every tool in this space works the same way: you take a GitHub URL and swap the
host for that tool's own. `github.com` → `gitingest.com` gives you a
prompt-ready digest. `github.com` → `gitpod.io/#` drops you into a cloud dev
environment. Every one of them works. Every one of them makes you remember the
rewrite.

SuperRepo puts those buttons on the repo page itself, right after Watch / Fork /
Star.

**Every tool, one click each**

- **Feed it to an AI** — GitIngest, UIthub, DeepWiki, GitMCP, GitHub.gg, GitSummarize, GitReverse
- **Diagrams & structure** — GitDiagram, code2flow
- **Open & run** — github.dev, VS Code for the Web, GitHub1s, Gitpod, StackBlitz, CodeSandbox, Codeflow, bolt.new
- **History & analytics** — Git History, Sourcegraph, OSS Insight, Star History, GitHubTracker
- **More views** — GitPodcast
- **Local command line** — Repomix, GitIngest CLI, code2prompt

**It knows where you are**

Most of these tools take a repository. Some take a folder. One takes a file. On a
file view like `.../blob/main/lib/x.js`, SuperRepo gives GitIngest the folder that
contains the file, gives github.dev the exact file, and gives DeepWiki the repo
root — because that is all DeepWiki accepts. A service that cannot accept the page
you are on is not offered at all, rather than offered and broken.

**Four ways in**

- Buttons in the repo header, configurable as glyph, monogram, or icon and name
- The **More** panel: filter, grouped sections, a preview of where each row points, and a copy button
- Right-click a repo page or any link to one
- Type `gp` in the address bar, then a repo URL or `owner/repo`

`Alt+Shift+G` toggles the panel. `/` filters, arrows move, `Enter` opens, `Esc`
closes. Copy is first-class: half the real use of these tools is pasting a repo URL
into a chat, so every row has a copy button.

**It asks for the least it can**

Install touches one site: github.com. There is no account, no analytics, no
backend and no network call of its own — the extension builds a URL and lets your
browser open it. Nothing is collected, transmitted or shared. GitLab is available
if you want it, but only when you turn it on yourself.

**Runs where you do** — Chrome, Edge, Brave and Firefox on desktop; Firefox for
Android and Edge for Android on a phone; Safari on macOS and iOS. That is every
browser that supports extensions: essentially all desktop usage, and all of mobile
where an extension can run at all.

Not affiliated with, endorsed by or connected to GitHub. All trademarks belong to
their owners.

---

## Privacy disclosure answers

Both stores ask the same questions in different words. The honest answers, matching
`PRIVACY.md` and the manifest:

| Question | Answer |
|---|---|
| Data collected | None |
| Data sold or shared | None |
| Why the permission `storage`? | Saves your settings and click counters, in `storage.local` |
| Why `contextMenus`? | The right-click menu |
| Why `clipboardWrite`? | The copy buttons — verified necessary in a real browser |
| Why `scripting`? | Injects into an optional host *you* have granted; asks for nothing on its own |
| Why host access? | The buttons have to render inside the page. No other reason |
| Remote code? | None. No remotely hosted code, no eval of remote scripts |

That table is the short version. The Chrome dashboard wants prose in a field per
permission, and **`PRIVACY-PRACTICES.md` is the text to paste for each of them** —
single purpose, one justification per permission, the remote-code declaration and
the data-usage certification, in the order the tab asks for them.

If a reviewer asks why `scripting` is present, the answer is in the manifest itself:
it has no effect without a host permission the user has to grant by hand.

---

## Keywords

Chrome keyword limit is fairly tight; use the ones with real search volume.

```
github, git, repository, repo, ai, llm, prompt, deepwiki, gitingest, diagram,
architecture, codebase, developer tools, open in vscode, gitpod, sourcegraph,
star history, podcast, ai context, code search, open source
```

AMO does not use keywords — the name, summary and categories carry it.

---

## The screenshots

Five, in the order the stores show them, all 1280×800. Chrome downscales them to
640×400, so the order matters: the first one is the one most people see.

| File | What it shows |
|---|---|
| `screenshot-1-buttons.png` | The header buttons on a repo, in the row with Watch / Fork / Star |
| `screenshot-2-panel.png` | The **More** panel: the whole catalog, grouped, one line per service |
| `screenshot-3-file.png` | The panel on a file view, where rows say "this file" because of where the page is |
| `screenshot-4-search.png` | The panel filtered — how you find one service among all of them |
| `screenshot-5-options.png` | The settings page, advanced section open |

Screenshots 1, 2 and 4 were captured with **Buttons show → Icon and name** set.
The shipped default is icon-only, and eight 32px glyphs are unreadable once the
store has downscaled the image — the labels say what each button does at a
glance. It is a real setting, saved through the options page before the capture,
so nothing is staged; screenshot 3 shows the same buttons on a file view.

## Sizing rules that get listings rejected

All of these have bitten other extensions and all of them are already satisfied
by what `npm run shots` produces:

| Asset | Required size | In `store/` |
|---|---|---|
| Edge extension logo | 1:1 — 300×300 recommended, 128×128 minimum | `logo.png` |
| Small promo tile | exactly 440×280 | `promo-small.png` |
| Marquee promo tile | exactly 1400×560 | `promo-marquee.png` |
| Chrome screenshots | 1280×800 (or 640×400), up to 5 | `screenshot-1..5` |
| AMO screenshots | 1280×800 recommended, so the same five | `screenshot-1..5` |

The Edge logo is the one listing image no store works out for itself: Edge asks
for a square logo per language and reads nothing from the manifest, where Chrome
takes its 128px icon and asks for no logo. So `logo.png` is the icon full bleed —
the icon's own 23% corner radius comes off in the render, because rounding
dropped onto a no-alpha PNG turns into white corners, and white corners read
wrong on any frame that is not white.

The two promo tiles are the only Chrome promotional sizes currently listed. A
920×680 "large tile" is in older guides and in this repo's history; it is not a
size the Web Store accepts any more, and the marquee replaced it.

The AMO shot used to be the promo tile re-rendered at 1366×768. A tile is not a
screenshot, and AMO now recommends the same 1280×800 the Web Store wants, so both
listings use the one set.

Promo tiles are captured at 1× on purpose. A retina-scaled capture is twice the
size it looks like it is and gets rejected.

The other half of the Chrome rule is the format: **JPEG or 24-bit PNG, no alpha**.
A 32-bit RGBA file is refused even when every pixel in it is opaque. Every file
here is 8-bit RGB (PNG colour type 2), and `npm run shots` checks that — along
with the exact pixel size — on each capture, so a file the store would reject
fails the run instead of the upload.