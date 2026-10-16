# Partners

SuperRepo turns every repo into a SuperRepo — a prompt, a diagram, a wiki, an
IDE, a podcast and a lot more, one click each, on the page itself.

Every tool in the catalog is someone else's work. This page is about what we
promise the people who made them.

**Maintain a tool like this?** Get it listed in one issue — no code needed:
**[List my service](https://github.com/ranjithrajv/superrepo/issues/new?template=partners.yml)**.

---

## What you get

**A row in the catalog**, rendered everywhere the extension works: the button
cluster on the repo page, the *More* panel, the right-click context menu, and the
`gp` omnibox. One entry in `catalog.js` and it appears in all four.

**Their own name, colour and glyph.** We show your tool in its own colour with its
own mark and your own one-line description, worded by you. We don't rename,
merge, or restyle your service into a house voice.

**A button when it earns one.** Up to eight can be pinned inline in the repo
header. Out of the box the header ships three groups — *a prompt*, *a diagram* and
*an IDE* — because those are the three jobs the tagline names. History and
analytics, the podcast view and the local command-line tools are not groups on
their own: they ship behind *More* rather than being promoted as categories they
are not. Each group fills
with the service a user reaches for most in it, so **placement follows use rather
than asking.** That is deliberate: a default list of *named* tools would promote
whoever those tools were, which is exactly what the no-pay-to-play rule below
exists to prevent.

**A public link back**, and a listing on the page below.

## What we promise

**We open the door and walk away.** No proxy, no redirect through us, no wrapper,
no interstitial, no analytics on your traffic. We build a URL, the browser
navigates to it, and that is the entire transaction. We take no cut and never
will.

**Neutrality is the whole product.** We list your competitors beside you, in a
curated order, and we do not sell placement. There is no paid pin, no "featured"
badge and no rate for being listed. If that ever changed, every other tool in the
catalog would have a reason to stop trusting the catalog, so it won't.

**Your row is yours to fix.** Wrong URL, renamed host, changed path shape, new
tier — you can open a PR against `catalog.js` yourself. You never have to wait on
us, and you never have to ask.

**You hear it from us first.** If a probe finds your service broken, we contact
you before we record anything. There is a grace window. A row that dies gets
demoted and marked unverified; it does not get deleted, and it does not get
shamed in public.

**We stay out of your analytics and out of the header fight.** If another
extension already put your button on the page, we don't add a second one for the
same destination. See [`docs/DOM.md`](docs/DOM.md) — the header contract is public,
and we ask every peer extension to publish theirs too.

## How a tool gets listed

Four conditions, all mechanical. No exceptions, and no money involved:

1. **It takes the GitHub URL shape** — `https://<host>/<owner>/<repo>[/<page>/<branch>/<path>]`,
   or a subset. Or it accepts a full GitHub URL as a parameter. Or it is a local
   CLI worth handing a repo URL to.
2. **It is alive**, probed within the freshness window.
3. **It is not an alias** of a row already in the catalog — a service that is just
   another name for a destination we already list does not become a second row.
4. **It fits a category**, so the panel groups sensibly.

Conditions 2 and 3 are checked by the same probe that keeps the catalog fresh, so
the rule can't be quietly broken by a favour.

## Get listed: one click, no code

**If you maintain a tool that turns a repo into something else, this is the whole
process for you:**

1. Open **[List my service](https://github.com/ranjithrajv/superrepo/issues/new?template=partners.yml)** —
   a short form that asks the four admission questions above.
2. We probe the URL you paste. If it answers, you are in.
3. If we need a change — wrong URL, renamed host, new tier — we come back to you.

No PR required, no code, no waiting on us to notice you exist. The same four
questions are asked whether you fill in the form or open a PR, so the shorter
path gets the same treatment.

**What we need from you, in total:** one working URL for one real public repo.
That is the entire ask. Everything else in the form has a default, and nothing in
it is a condition of being listed — if you would rather not be, say so and we
will drop the row.

---

## What you get, in numbers you can check

| | |
|---|---|
| **Where your row appears** | The button cluster on every repo page, the *More* panel, the right-click menu, and the `gp` omnibox — one entry reaches all four |
| **How it's rendered** | Your name, your colour, your glyph, your blurb, in your own words. Not restyled to a house voice |
| **Default visibility** | Every service ships visible; only what opts out is hidden. The default header holds one button per group that ships an enabled service, resolved from usage, so no service is promoted by being named in our defaults |
| **Freshness** | `npm run probe` re-verifies every row weekly and publishes the result — see [`SERVICES.md`](SERVICES.md#4a-probe-results--npm-run-probe) for the last run |
| **Cost to you** | Nothing. We never take a cut and never will |

## Share this page

**You are welcome to forward, quote or link this document.** If your users already
know your tool and wonder what else exists, this is the shortest honest answer.

Copy-paste block for your README or docs:

```markdown
**[SuperRepo](https://github.com/ranjithrajv/superrepo)** puts a button on every
GitHub repo that opens it as a prompt, a diagram, a wiki, an IDE, a podcast and
more — [GitIngest](https://gitingest.com/) and friends, one click each, no install.

Maintained tools: [add yours in one issue](https://github.com/ranjithrajv/superrepo/issues/new?template=partners.yml)
```

Three sentences, if that's all you want:

> SuperRepo puts a button on every GitHub repo that turns it into a prompt, a
> diagram, a wiki, an IDE or a podcast. It lists a whole catalog of tools — including ours —
> and every one is a row in an open catalog that anyone can add to. If you maintain
> one of those tools, listing it is one issue:
> `github.com/ranjithrajv/superrepo`

What we ask in return is only this: **a way to tell us before you break a URL**, so
we can fix it and say we did, instead of quietly repairing it and you never finding
out.

## How to add or fix your row

If you'd rather do it as code — or you maintain more than one tool, or you want to
correct an existing row — open a PR. A row is one object in
[`src/catalog.js`](src/catalog.js):

```js
{
  id: "example", name: "Example", abbr: "EX", color: "#0ea5e9",
  category: "ai",           // ai | diagram | run | insight | extra | cli | reference
  kind: "url",              // url (opens a tab) | command (copies a shell command) | link (reference site)
  blurb: "One line, in your voice",
  supports: (ctx) => ctx.isGitHub,
  url: (ctx) => `https://example.com/${ctx.owner}/${ctx.repo}${ctx.ghSuffix}`,
}
```

`url` and `command` receive `{ owner, repo, ref, path, tail, webUrl, repoUrl,
ghSuffix, pathSuffix, ingestSuffix, host, isGitHub, line }`. `supports` decides
where your row appears at all — return `false` for hosts you don't handle and it
is simply not offered there. Use `pathSuffix` or `ingestSuffix` if you care about
whether the user is looking at a file or a directory.

The same object shape is what a user writes in **Settings → Your own**, which is
deliberate: the bar for adding a service to the catalog is the bar a user already
has to clear to add one for themselves.

## What we ask of you

1. **A stable, documented URL template.** Our entire product is a dependency on
   it. This is the spec we hold ourselves to; we'd like it to be ours together.
2. **A way to tell us before you break it.** An issue, a mailing address, a
   channel — anything that gets us a heads-up instead of us quietly repairing it
   and you never finding out.
3. **Optionally, your preferred entry point**, in your own words, for the blurb.
   Private repos go to your CLI, no-install goes to your web app. You know better
   than we do which is which.

## Forge support

Most rows here are GitHub-only. Supporting GitLab, Bitbucket and Codeberg properly
is a matter of getting the upstream services to accept those URLs — or of
someone building a forge-native equivalent. We coordinate that work here:

- [`docs/FORGES.md`](docs/FORGES.md) — the hosts we care about, how to claim work, and what ships.
- Issue template: **[Expand a service to more forge platforms](https://github.com/ranjithrajv/superrepo/issues/new?template=forge-support.yml)**.
- SuperRepo will not send a forge URL to a service that cannot take it, and will
  not keep a row visible on a host where it does not work.

## Planned, not shipped

Stated here so nobody has to guess:

- **De-duplicating against other extensions' buttons.** The detection half exists
  and the contract is published; the behaviour is not built yet.
- **Opt-in anonymous usage counts.** SuperRepo already counts clicks per service,
  locally, and never sends them. We intend to add an explicit off-by-default
  toggle that would share a `{service, count}` pair with the tools you use —
  never a repo, URL or owner. Until it exists, nothing leaves your browser.

## The tools we list

<!-- BEGIN:tools -->
| Service | Category | What it does |
| --- | --- | --- |
| [GitIngest](https://gitingest.com/) | Prompt-ready digest | Whole repo as one prompt-friendly text digest |
| [DeepWiki Open](https://github.com/AsyncFuncAI/deepwiki-open) | AI-generated wiki | Self-hosted DeepWiki, for private repos |
| [GitMCP](https://gitmcp.io/) | For AI agents | MCP server endpoint for AI agents |
| [GitHub.gg](https://www.github.gg/) | For AI agents | Chat-style navigation of the repo |
| [GitSummarize](https://gitsummarize.com/) | For AI agents | Generated documentation hub |
| [GitReverse](https://www.gitreverse.com/) | For AI agents | “Rebuild this from scratch” prompt |
| [GitDiagram](https://gitdiagram.com/) | Diagrams & structure | Interactive architecture diagram, Mermaid export |
| [code2flow](https://github.com/scottrogowski/code2flow) | Diagrams & structure | Call graphs from static analysis |
| [github.dev](https://github.dev/) | Editor in the page | Full VS Code in the browser, at this path |
| [VS Code for the Web](https://vscode.dev/) | Editor in the page | vscode.dev, opened at this repo |
| [GitHub1s](https://github1s.com/) | Editor in the page | Archived, but still a one-second VS Code |
| [Gitpod](https://gitpod.io/) | Cloud workspace | Cloud dev environment, prebuilt from this URL |
| [StackBlitz](https://stackblitz.com/) | Cloud workspace | Runs the repo in a browser workspace |
| [Codeflow (pr.new)](https://pr.new/) | Cloud workspace | Open the branch or PR in a live workspace |
| [bolt.new](https://bolt.new/) | Cloud workspace | AI app builder seeded from the repo |
| [Git History](https://githistory.xyz/) | History | Watch this file evolve, commit by commit |
| [GitHubTracker](https://githubtracker.com/) | History | Commits, issues and PRs over time |
| [OSS Insight](https://ossinsight.io/) | Analytics | Contributors, activity and trends |
| [Star History](https://www.star-history.com/) | Analytics | Star growth chart — organic, or one spike? |
| [Repomix](https://repomix.com/) | Local command line | Pack the repo into one AI-friendly file |
| [GitIngest CLI](https://github.com/coderamp-labs/gitingest) | Local command line | Prompt-friendly digest from your terminal |
| [code2prompt](https://github.com/mufeedvh/code2prompt) | Local command line | Turn a local clone into a templated prompt |
<!-- END:tools -->

Names, colours and marks belong to their owners. SuperRepo is an independent
tool: not affiliated with, endorsed by, or connected to GitHub or any of the
services above. The reverse is equally true — **no service listed here endorses
SuperRepo**, and none of them is responsible for it. A row is a link and a
description, not a partnership.

## Contact

`superepo@ranjithraj.dev` — for listing requests, corrections, broken links, or
a channel for change notices. We answer mail.