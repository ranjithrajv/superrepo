# What this changes

<!-- One or two sentences. What is different after this merges? -->

## Type of change

- [ ] **New service** — adds a row to `src/catalog.js` (most PRs; jump to *Adding a service* below)
- [ ] Fix to an existing service — a wrong URL, a renamed host, a broken path rule
- [ ] Change to how services are parsed, filtered or grouped
- [ ] UI, options page, or styling
- [ ] Tests, tooling, docs
- [ ] Something else

---

## Adding a service

If you ticked **New service**, the whole contribution is one object in
[`src/catalog.js`](src/catalog.js):

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

That one object appears in the button cluster, the *More* panel, the right-click menu and the
omnibox. Nothing else should need changing.

**Then run `npm run partners`.** The service table in `PARTNERS.md` is generated from the catalog, and
`npm run check` fails if the two disagree — which it will if you skip this step.

### Which admission rule this satisfies

The four rules are in [`PARTNERS.md`](PARTNERS.md#how-a-tool-gets-listed). Say briefly which ones
your service meets — it makes review much faster:

- Takes a GitHub URL (or accepts a repo URL for a CLI): yes / no
- Works today, with a URL you can paste in the description below
- Not a duplicate of a row already listed
- Fits a category

**A working URL for one real public repo** — the single most useful thing in this PR:

```

```

### Path handling

Does it take a file path, a directory path, or only a repo root? If file or directory, does it use
the `pathSuffix` / `ingestSuffix` field rather than reassembling the URL by hand? This is what keeps
a button on a file view narrowing to the containing folder instead of breaking.

### If you maintain this service

- [ ] I maintain this tool and I'm happy to be listed by name, colour and glyph, with a link back
- [ ] Please don't use our logo — link the name only
- [ ] **Written permission to list is fine** (checked above counts as written permission)
- [ ] A way to send change notices, so we can fix a broken URL and tell you we did
- [ ] I'd rather send you private-repo or CLI instructions to include in the blurb

### If you don't maintain it

Totally fine — tell us below who does, or leave it and we'll find out. We're asking because we'd
rather route bug reports to the right person.

> **Maintain a tool like this but would rather not open a PR?** The same four questions are asked
> in the [*List my service* issue template](https://github.com/ranjithrajv/superrepo/issues/new?template=partners.yml).
> It needs one working URL and a yes to being listed — no code, and no waiting on us to notice you.

---

## Verification

<!-- Tick what you ran. All four should pass; CI runs the first three on every push. -->

- [ ] `npm test` — unit tests: URL parsing, every rewrite rule, the payload builder
- [ ] `npm run check` — manifests, icons, permissions, and PARTNERS.md drift
- [ ] `npm run build` — `dist/chrome` + `dist/firefox`
- [ ] `npm run partners` — if you touched the catalog
- [ ] `npm run smoke` — headless Chromium against a real repo page
- [ ] The checklist in [`TESTING.md`](TESTING.md), by hand, if you touched anything visual

### If you added a rewrite rule

Show the before and after for a repo page, a directory view and a file view. A file view is the one
that breaks silently:

| Page | Resulting URL |
| --- | --- |
| `github.com/owner/repo` | |
| `github.com/owner/repo/tree/main/src` | |
| `github.com/owner/repo/blob/main/src/lib/x.js` | |

---

## Notes

Anything worth saying that the diff doesn't. Screenshots if you touched the UI.

<!--
Two things that aren't negotiable, so no surprises in review:

- `blurb` is the tool owner's wording. We don't rewrite it to a house style.
- Placement is decided by the published rule, never by who asks. There is no paid pin.
-->