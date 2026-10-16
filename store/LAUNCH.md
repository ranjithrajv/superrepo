# Launch runbook

How SuperRepo goes from "submitted to four stores" to "people actually use it".
The distribution bet is not paid reach — it is a **technical launch** plus the
**partner catalog** doing the long-tail work. This file is the sequence and the
copy.

Live per-store state is in [`SUBMIT.md`](SUBMIT.md).

---

## The gate: do not launch before these are true

**1. The Chrome listing is live — ✅ done.** Chrome is the browser most launch
audiences actually use, and it is now live in the Chrome Web Store (Edge is live
too). Firefox/Safari approvals are follow-up posts, not blockers. Edge being live
alone would not have been enough; Chrome was the gate, and it has cleared.

**2. A hosted, no-install demo exists — ✅ done.** It is live at
<https://ranjithrajv.github.io/superrepo/demo/> — the page is `site/demo/`, generated
by `npm run demo` from the same templates `npm run preview` uses, with only the
browser APIs stubbed. It lets a visitor *see the buttons before the permission
prompt*, which is the conversion problem this product has to beat, so every launch
channel links to it.

**3. The site has a canonical URL.** `site/index.html` has no `og:url` or
`rel="canonical"` today. Set both to the Pages URL before anything is posted, or
every share embeds the wrong link.

If 1–3 are not done, the launch is a wasted moment. It is not repeatable at the
same scale for the same audience.

---

## Assets to have ready before launch day

- [x] Hosted demo URL (see gate 2) — <https://ranjithrajv.github.io/superrepo/demo/>,
      linked from the hero of `site/index.html`.
- [ ] A short screencast (20–40s) or animated GIF of the header buttons + *More*
      panel. Screenshots convert; motion converts better.
- [ ] Chrome listing URL, and the five screenshots already captured.
- [ ] The repo README renders cleanly on github.com with the live demo linked near
      the top.
- [ ] `store/LAUNCH.md` copy below, adapted to the moment.
- [ ] Two or three peers lined up to vouch in the HN thread (handled as genuine
      participation, not vote-begging — see *Don't* below).

---

## The sequence

Fire on a **Tuesday or Wednesday**, posts going live **09:00–11:00 PT**. That is the
window Hacker News rewards and the window when US and EU developer audiences are
both awake. Do not launch on a Friday or a holiday.

| When | Channel | Notes |
|---|---|---|
| Day 0, 08:30 PT | **Show HN** | Submission lands first; you sit in the thread for 8+ hours |
| Day 0, 10:00 PT | **DevHunt** | GitHub-gated voting; good fit for OSS dev tools |
| Day 0 | **Reddit** | One sub at launch, the rest over the following days |
| Day 1 | **Dev newsletters** | Pitch after HN, so you can cite the thread |
| Day 2–3 | **Peerlist Launchpad** | Week-long window, not a single day |
| Week 2 | **Product Hunt** | Only if the demo + assets are polished; weak for pure OSS |
| Ongoing | **SEO / awesome-lists** | Compounding, not a moment — separate track |

### Show HN

**Title** (keep it plainly descriptive — HN punishes marketing):

```
Show HN: SuperRepo – one-click buttons for every repo-to-tool service
```

**First comment** — post it yourself immediately after submitting. Lead with the
problem and the engineering, not the tagline:

> GitHub's header has room for a handful of buttons, and there are dozens of tools
> that take a repo URL and turn it into something else — a prompt digest, an
> architecture diagram, a wiki, an IDE, a podcast. Every one works by swapping the
> host in the URL, and every one makes you remember the swap.
>
> SuperRepo is a WebExtension that puts those buttons in the repo header, right
> after Watch/Fork/Star. It is a catalog of those tools plus the in-page UI to reach
> them: a button cluster, a searchable panel, a right-click menu, and a `gp`
> omnibox.
>
> A few things I'd expect this crowd to poke at, so I'll front-run them:
>
> - **No backend, no telemetry.** It reads the URL, builds another URL, and lets the
>   browser navigate. No API calls, no remote config, no analytics. The Firefox
>   manifest declares `data_collection_permissions: none`. You can audit the whole
>   thing.
> - **One codebase, everywhere.** The content script imports nothing (content
>   scripts can't be modules, and dynamic `import()` is broken in them), so it asks
>   the background for its payload; Chrome runs the background as a module worker,
>   Firefox MV3 won't, so there's a three-line classic loader for it; Safari gets a
>   companion app. The same builds install on Firefox for Android, Edge for Android
>   and Safari for iOS, which almost nothing in this category does.
> - **It published its DOM contract** so it can coexist with GitIngest, DeepWiki
>   Button, Repomix and the other extensions already putting buttons in that header,
>   instead of stacking clusters on top of them.
> - **The catalog is not for sale.** Public, mechanical admission rules; placement
>   follows your own clicks, not who paid.
>
> Live demo (no install): <DEMO_URL> — same content script, mocked browser APIs.
> Source: github.com/ranjithrajv/superrepo
>
> Happy to answer anything about the MV3 seams or the catalog rules.

Stay in the thread. The "best" comments on an HN launch are usually the ones where
the author answers a sharp criticism well.

### DevHunt

GitHub-gated, so the audience is exactly right. Lead line:

```
SuperRepo — every repo-to-tool service, one click in the GitHub header.
No backend, no telemetry, open catalog. Loads in Chrome, Edge, Brave, Firefox
and Safari — including Firefox for Android, Edge for Android and Safari for iOS.
```

### Reddit (sparingly, and as story-first)

Read each subreddit's self-promotion rules before posting. Lead with the *story* —
"four extensions were stacking buttons in the GitHub header, so I published a
contract" or "I built a catalog that can't be gamed" — and put the link at the
bottom, if at all.

| Subreddit | Angle | Watch out for |
|---|---|---|
| r/github | The header crowding + the coexistence contract | Low tolerance for "check out my thing" |
| r/opensource | The neutral catalog, "list your tool in one issue" | Show the rules, not the pitch |
| r/firefox | Firefox for Android — a repo-tool UI on the phone | Read rules; r/firefox is strict |
| r/webdev | The MV3 / cross-browser engineering seams | "Showoff Saturday" threads only, per rules |
| r/javascript | The module-worker vs event-page difference | Same; read rules first |
| r/SideProject | The build story | Friendlier, but lower signal |

Space these out. Four subreddit drops in one day reads as spam and gets you banned.

### Newsletters

Pitch **after** HN, and put the thread in the email. Targets: JavaScript Weekly,
Bytes, TLDR, Console, and any "developer tools" newsletter that takes submissions.
One-paragraph pitch, demo link, and the one-line reason it is interesting to *their*
readers — for most of these that is the engineering story, not the product.

### Product Hunt (second, optional)

Only if the demo and screenshots are polished. OSS dev tools underperform on PH
relative to HN, so treat it as a second wave, not the main event. Tagline:

```
Every repo tool, one click, in the GitHub header.
```

---

## The partner wave (the compounding half)

This is separate from launch day and matters more over a year than the launch does.
`PARTNERS.md` already mechanizes *listing* — this is the outreach that activates
the ~two dozen listed tools as distribution channels:

- [ ] One tailored message per listed service maintainer: "here is your row, here
      is the drop-in README badge, here is the share block from `PARTNERS.md`."
- [ ] Ship a **"Works with SuperRepo" badge** services can put in their README — a
      free, honest backlink and awareness loop, consistent with no-pay-to-play.
- [ ] Close the loop with the "tell us before you break a URL" clause: that
      relationship is the reason to keep in contact, so it becomes the channel for
      release news too.

Time this to run *just after* the launch post, so outreach can cite a live thread
and a working demo.

---

## Day-of operations

- Submit HN, then post the first comment within a minute.
- Watch the thread for 8 hours; answer every substantive question.
- Have the demo and repo open in tabs — people will paste edge cases.
- If a bug shows up in the thread, fix it the same day and reply when it ships. That
  reply is often better advertising than the post.

## What to measure (no telemetry)

You cannot see the funnel, so use external proxies:

- Per-store installs, impressions and ratings (store dashboards).
- GitHub stars, clone traffic, and **per-asset release download counts**.
- Count of partner listings in the catalog.
- Issues and PRs from maintainers — the leading indicator that the partner loop is
  working.

## Don't

- **Don't launch on an unfinished funnel.** Chrome is live now, so the post lands
  on the demo and the README — if either is rough, fix it before firing.
- **Don't buy reach.** Permission-heavy installs from paid traffic churn hard.
- **Don't ask for HN/PH upvotes.** It reads badly and can get the post penalised.
- **Don't post marketing copy on technical forums.** The paragraphs that admit a
  limitation outperform the ones that sell.
- **Don't add telemetry to "measure the launch".** It is the brand. Use the proxies
  above, and the planned opt-in counts when they ship.

## After the launch wave

- Follow up each store approval (Firefox, Safari) with a short post — the same
  audience will not notice otherwise.
- Move to the compounding tracks: SEO pages for each service and the AI-citation
  angle, awesome-lists, and adjacent-extension co-marketing via the DOM contract.
- Keep a changelog; the weekly probe that keeps the catalog fresh is also a steady
  stream of "here's what changed" worth posting.
