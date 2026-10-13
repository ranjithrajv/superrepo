# Git Repo Service Catalog

Every tool that turns a GitHub repo URL into something else — a prompt, a diagram, a wiki,
a dev environment, a podcast.

The whole catalog rests on one trick: **almost all of these work by substituting a token in the
GitHub URL.** No API, no key, no auth. That is what makes a single browser extension able to
reach all of them.

Last verified: **2026-10-13** (HTTP probe of every URL below).

---

## 1. The original list

| Service | Rewrite |
|---|---|
| gitingest | `github.com` → `gitingest.com` |
| gitdiagram | `github.com` → `gitdiagram.com` |
| uithub | `github.com` → `uithub.com` |
| github.dev | `github.com` → `github.dev` |
| deepwiki | `/{owner}/{repo}` → `deepwiki.com/{owner}/{repo}` |
| gitpod | `https://gitpod.io/#` + the URL |
| stackblitz / codesandbox | `stackblitz.com/github/{owner}/{repo}` |
| githistory / sourcegraph / ossinsight / star-history | template on `{owner}/{repo}` (+ path) |

---

## 2. URL contract

Tools in this ecosystem follow the same URL shape as GitHub:

```
https://<tool-host>/<owner>/<repo>[/<page>/<branch>/<path>]
```

where `<page>` is usually `tree` (directory) or `blob` (file).

Placeholders used in this document:

| Placeholder | Meaning | Example |
|---|---|---|
| `{owner}` | GitHub user or org | `coderamp-labs` |
| `{repo}` | repository name | `gitingest` |
| `{ref}` | branch, tag, or SHA | `main` |
| `{path}` | path inside the repo, no leading slash | `src/utils` |
| `{url}` | the full original GitHub URL | `https://github.com/a/b/blob/main/x.py` |
| `{repoUrl}` | canonical repo root | `https://github.com/a/b` |

---

## 3. Full catalog

### 3.1 Feed it to an AI — repo as context

| Tool | URL | Rewrite / template | Notes |
|---|---|---|---|
| GitIngest | <https://gitingest.com/> | `github.com` → `gitingest.com`, or `https://gitingest.com/{owner}/{repo}[/tree/{ref}[/{path}]]` | Plaintext digest: tree + file contents + token count. Also a Python package and a CLI. |
| UIthub | <https://uithub.com/> | `github.com` → `uithub.com` (keeps `tree`/`blob`/`{ref}`/`{path}`) | Markdown output with token budget controls (`?maxTokens=`). |
| DeepWiki | <https://deepwiki.com/> | `https://deepwiki.com/{owner}/{repo}` | AI-generated wiki + chat, by Cognition/Devin. Public repos free. |
| DeepWiki Open | <https://github.com/AsyncFuncAI/deepwiki-open> | self-hosted | Community reimplementation — the route for private repos. |
| GitMCP | <https://gitmcp.io/> | `https://gitmcp.io/{owner}/{repo}` | Exposes the repo as an MCP server endpoint for AI agents. |
| GitHub.gg | <https://www.github.gg/> | `https://www.github.gg/{owner}/{repo}` | Chat-style navigation of a repo. |
| GitSummarize | <https://gitsummarize.com/> | `github.com` → `gitsummarize.com`, or `https://gitsummarize.com/{owner}/{repo}` | Documentation hub; `hub` → `summarize`. |
| GitReverse | <https://www.gitreverse.com/> | `github.com` → `gitreverse.com` | Repo → "rebuild this from scratch" prompt. |
| Repomix | <https://repomix.com/> | CLI: `npx repomix --remote {url}` | Packs a repo into one AI-friendly file. **Re-checked 2026-10-14:** repomix.com now has a browser app and Repomix ships its own Chrome/Firefox extension, but the guide documents no per-repo deep-link URL or `?repo=` parameter, so there is still nothing stable to rewrite to. Stays a `command`. |
| code2prompt | <https://github.com/mufeedvh/code2prompt> | CLI, local clone | Rust. gitignore-aware filtering, templated prompts. |
| GitIngest CLI | <https://github.com/coderamp-labs/gitingest> | CLI: `gitingest {url}` | Python package, supports `token=` for private repos. |

### 3.2 Diagrams & structure

| Tool | URL | Rewrite / template | Notes |
|---|---|---|---|
| GitDiagram | <https://gitdiagram.com/> | `github.com` → `gitdiagram.com` | Interactive architecture diagram, Mermaid export, MCP server. Also does narrated explainer videos. |
| code2flow | <https://github.com/scottrogowski/code2flow> | CLI, local clone | Call graphs from static analysis. |
| Octotree | <https://www.octotree.io/> | browser extension only | Adds an IDE-style file tree to GitHub. Not a URL rewrite. |
| Sourcetrail | <https://www.sourcetrail.com/> | desktop app | Offline interactive source explorer. **Archived** — `https://github.com/CoatiSoftware/Sourcetrail`. |

### 3.3 Editor in the page

| Tool | URL | Rewrite / template | Notes |
|---|---|---|---|
| github.dev | <https://github.dev/> | `github.com` → `github.dev` (keeps full path) | Now redirects to `https://vscode.dev/github/…`. Also: press `.` on any repo. |
| VS Code for the Web | <https://vscode.dev/> | `https://vscode.dev/github/{owner}/{repo}` | |
| GitHub1s | <https://github1s.com/> | `github.com` → `github1s.com` | **Archived** upstream, still serving. Superseded by github.dev. |

### 3.4 Cloud workspace

| Tool | URL | Rewrite / template | Notes |
|---|---|---|---|
| Gitpod | <https://gitpod.io/> | `https://gitpod.io/#{url}` | Cloud dev environment, prebuilt from the URL. `#` fragment carries the repo. |
| StackBlitz | <https://stackblitz.com/> | `https://stackblitz.com/github/{owner}/{repo}` | Browser workspace with a real dev server. |
| CodeSandbox | <https://codesandbox.io/> | `https://codesandbox.io/s/github/{owner}/{repo}` | Cloud sandbox with dev server. |
| Codeflow | <https://pr.new/> | `https://pr.new/github.com/{owner}/{repo}` | Redirects to `https://stackblitz.com/codeflow/beta`. Useful for PRs (`/pull/{n}`). |
| bolt.new | <https://bolt.new/> | `https://bolt.new/github.com/{owner}/{repo}` | AI app builder seeded from the repo. |

### 3.5 History

| Tool | URL | Rewrite / template | Notes |
|---|---|---|---|
| Git History | <https://githistory.xyz/> | blob: `https://githistory.xyz/{owner}/{repo}/blob/{ref}/{path}`; repo/dir: `/commits/{ref}[/{path}]` | File-level history as a scrubbable timeline. |
| GitHubTracker | <https://githubtracker.com/> | `https://githubtracker.com/{owner}/{repo}` | Commits, issues, PRs over time. |

### 3.6 Analytics

| Tool | URL | Rewrite / template | Notes |
|---|---|---|---|
| OSS Insight | <https://ossinsight.io/> | `https://ossinsight.io/analyze/{owner}/{repo}` | Contributors, activity, trends. |
| Star History | <https://www.star-history.com/> | `https://www.star-history.com/#{owner}/{repo}&Date` | Star growth chart. Spot a one-day HN spike. |

### 3.7 Search & mirrors

These answer neither "what happened to this repo" nor "how is it doing", so they
carry no category and the panel lists them under *More views*.

| Tool | URL | Rewrite / template | Notes |
|---|---|---|---|
| Sourcegraph | <https://sourcegraph.com/> | `https://sourcegraph.com/github.com/{owner}/{repo}` | Cross-repo search, find refs/defs in unfamiliar code. |
| cache.forgithub | <https://cache.forgithub.com/> | `https://cache.forgithub.com/{owner}/{repo}` | Cached repo metadata over a stable path. Opt-in. |
| threads.forgithub | <https://threads.forgithub.com/> | `https://threads.forgithub.com/{owner}/{repo}` | Finds X/Twitter posts about a repo. Opt-in. |

### 3.8 Conversion & novelty

| Tool | URL | Rewrite / template | Notes |
|---|---|---|---|
| GitPodcast | <https://www.gitpodcast.com/> | `https://www.gitpodcast.com/{owner}/{repo}` | Repo → narrated podcast episode. No extension has this yet. |
| OpenRepoWiki | <https://openrepowiki.xyz/> | `https://openrepowiki.xyz/{owner}/{repo}` | **DEAD** as of 2026-10-13 (DNS failure). Still listed on forgithub.com. |

---

## 4. Known dead, renamed, or redundant

| Entry | Status | Detail |
|---|---|---|
| `openrepowiki.xyz` | **dead** | DNS failure on 2026-10-13. |
| `talktogithub.com` | **dead** | Redirects to `ww547.talktogithub.com/?tkn=…` — parked-domain behaviour. |
| `pr.new` | redundant | Alias for StackBlitz Codeflow (`/codeflow/beta`). |
| `github.dev` | renamed | Serves via `vscode.dev/github/`. |
| `star-history.com` | renamed | Canonical host is `www.star-history.com`. |
| `github.gg` | renamed | Canonical host is `www.github.gg`. |
| `gitpodcast.com` | renamed | Canonical host is `www.gitpodcast.com`. |
| `github1s` | archived | Upstream repo archived; superseded by github.dev. |
| `sourcetrail` | archived | Became Coati; no per-repo URL. |

---

## 4a. Probe results — `npm run probe`

Run it and it re-verifies every rewrite rule against a real repo over HTTP. This is
what replaces hand-maintaining the table above; the weekly
[`probe.yml`](.github/workflows/probe.yml) runs it on a schedule because this
rot decays on its own clock, not on a push.

**Last run: 2026-10-13** — 27 URL targets (commands and `link` rows have no URL to
probe): **22 ok · 2 aliased · 3 http error · 0 unreachable.**

The two **aliased** rows are known and intentional: `pr.new` → `stackblitz.com`,
`github.dev` → `vscode.dev`.

The three **http errors** are *not* counted as dead. An HTTP error usually means a
host that blocks automation or generates lazily; only an unreachable host —
DNS failure, refused connection, timeout — is treated as the graveyard. All three
below were re-checked by hand with a browser user-agent:

| Service | Status | Hand-check |
|---|---|---|
| **UIthub** | `401` | **Real, and unexplained.** `https://uithub.com/` is `200`, but `/owner/repo` is `401` for every user-agent tried, including a browser one. Either the per-repo path now needs a token, or the route changed. Worth asking the owner — see the contact line below. |
| **DeepWiki** | `429` | Rate limited. Still `429` on a retry and on a different repo, so it may be blanket protection for non-browser traffic rather than per-repo quota. Buttons still work in a real browser. |
| **CodeSandbox** | `403` | Cloudflare bot protection on `codesandbox.io/s/…`. Resolves normally in a browser. |

If you maintain one of these and can tell us what is happening, that is exactly
the kind of correction the *List my service* issue template is for — or mail
`superepo@ranjithraj.dev`.

---

## 5. Prior art — what already exists

Three extensions attempt this. None is complete.

| Project | Reach | Coverage | State |
|---|---|---|---|
| **Repo Swap** — <https://addons.mozilla.org/en-US/firefox/addon/repo-swap/> · <https://reposwap.pro> | Firefox only | GitIngest, GitMCP, GitDiagram, DeepWiki, GitHub.gg, StackBlitz, Star History (7) | v0.1.0, 2026-06-17, MIT, 22 KB. `tabs` + `storage` + `https://github.com/*`. **2 average daily users, 0 ratings.** Popup only; refuses to act off a repo page. |
| **GitRepoTools** — <https://github.com/rohit-wadhwa/git-repo-tools> · [store](https://chromewebstore.google.com/detail/gitrepotools/jlhmngpldhnhigcjbbnldinemegmcooa) | Chrome only | DeepWiki, GitDiagram, GitIngest + WebIDE dropdown (vscode.dev, github.dev, CodeSandbox, StackBlitz, Gitpod) | 9★, MIT, 2024, v1.0, 7 commits. Injects buttons into the GitHub DOM via a content script. |
| **gitingest-extension** — <https://github.com/coderamp-labs/gitingest-extension> · [Chrome](https://chromewebstore.google.com/detail/gitingest-turn-any-git-re/adfjahbijlkjfoicpjkhjicpjpjfaood) · [Firefox](https://addons.mozilla.org/firefox/addon/gitingest/) · [Edge](https://microsoftedge.microsoft.com/addons/detail/nfobhllgcekbmpifkjlopfdfdmljmipf) | Chrome + Firefox + Edge | GitIngest only | 228★, MIT, official. WXT + Tailwind. The only one with real adoption. |
| **Github Open With** — [store](https://chromewebstore.google.com/detail/github-open-with/dggpihfahccepeedgkckjlcfgnfbjofe) | Chrome | Clone / open-in entries on the green **Code** button | Adjacent, not URL-swap. |
| **Open in GitHub1s** — [store](https://chromewebstore.google.com/detail/open-in-github1s/iijaagbkdohcopmmohlgfkcloefoeaoj) | Chrome | GitHub1s only | Single-purpose. |

**The gap:** no cross-browser extension covers the full catalog, works from any page (not just a
repo tab), offers copy-to-clipboard for LLM pasting, is path-aware, or lets you add your own
service. Every incumbent here died of staleness.

---

## 6. Sources & indexes

| Source | URL |
|---|---|
| **forgithub.com** — "the index of every swap tool" | <https://forgithub.com/> |
| forgithub source | <https://github.com/janwilmake/forgithub> |
| GITHUB-TRICKS — every feature, URL trick, shortcut | <https://github.com/amey-thakur/github-tricks> |
| Gitingest upstream | <https://github.com/coderamp-labs/gitingest> |
| GitDiagram upstream | <https://github.com/ahmedkhaleel2004/gitdiagram> |
| Repomix upstream | <https://github.com/yamadashy/repomix> |

forgithub.com's contribution rule, which is a good filter for anything added here:

> the tool must at least support the `/[owner]/[repo]/[page]/[branch]/[...path]` url structure
> or a subset thereof

Note that the index is itself stale — `openrepowiki.xyz` and `talktogithub.com` are on it and are
both dead. Anything added to this catalog should be probed, not trusted.

---

## 6a. Forge support

Most rows in this catalog are GitHub-only on purpose, because that is what the
upstream tools support. GitLab, Bitbucket, Codeberg and other forges are handled
where a service can genuinely take them (see `test/degrade.test.mjs` for the
rule). [`docs/FORGES.md`](docs/FORGES.md) tracks the upstream contributions and
independent services that would widen that list.

## 7. Adding a tool

A tool belongs here if it satisfies **at least one** of:

1. it accepts a GitHub URL path structure (`/{owner}/{repo}/…`) and returns a transformed view, or
2. it accepts a full GitHub URL as a parameter (e.g. `gitpod.io/#{url}`), or
3. it is a local CLI worth handing a repo URL to.

Record for each entry: `name`, `url`, `rewrite`/`template`, `category`, and a `verified` date.
Re-probe the whole file periodically — the graveyard in section 4 is the reason why.
