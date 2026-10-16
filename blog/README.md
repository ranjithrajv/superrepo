# Draft posts

Essays written to be published elsewhere — Hacker News, a project blog, dev
submissions, peer-extension outreach. They are **drafts**: not finished, not
linked from the site, and deliberately **not** under `site/`, so the Pages build
never serves them by accident.

| Draft | Angle | Best home |
|---|---|---|
| [`zero-network-calls.md`](zero-network-calls.md) | No backend, privacy you can verify | HN, r/webdev, privacy-minded newsletters |
| [`neutral-catalog.md`](neutral-catalog.md) | A catalog you can't buy into | HN, partner outreach |
| [`header-coexistence.md`](header-coexistence.md) | The published in-page DOM contract | HN, peer extensions |
| [`one-codebase-five-browsers.md`](one-codebase-five-browsers.md) | What actually differs per browser — desktop and mobile | HN, dev newsletters |

## Before you publish one

- Re-check every number against the tree — service count (`src/catalog.js`), test
  count (`npm test`), lint output (`npx web-ext lint`), and the icon-table size.
  They drift.
- Confirm the links resolve: the repo, the live demo if it exists, and the site.
- On a technical forum, cut anything that reads as marketing. The strongest
  paragraphs here are the ones that admit a limitation.
- One piece per surface, spaced out. Do not drop all four the same week — see
  [`../store/LAUNCH.md`](../store/LAUNCH.md) for the sequence.
