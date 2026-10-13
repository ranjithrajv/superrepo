# Forge support

SuperRepo runs on **github.com, gitlab.com, bitbucket.org and codeberg.org**, but
most of the services it points at were written for GitHub URLs and only understand
those. A button offered on GitLab that quietly rewrites a `gitlab.com` URL into
a GitHub-shaped one is worse than no button, so on those hosts the extension
lists only the services that can genuinely handle them — today that is Gitpod,
Repomix, GitIngest CLI, code2prompt and code2flow.

Getting the rest of the catalog there is up to the services themselves, and this
page tracks that work.

## What we are asking for

Two routes, either is welcome.

1. **Upstream contributions.** A small change in an existing service so that it
   accepts a GitLab / Bitbucket / Codeberg / Gitea / SourceHut URL the same way it
   accepts a GitHub one. Most of these tools already parse `owner/repo` out of a
   URL — they just hard-code `github.com` at the front. Replacing that with
   "anything that looks like `host/owner/repo`" is usually the whole fix.
2. **Independent services.** If an upsteam will not take the change, or the
   GitHub-only service is hosted rather than open source, someone can build a
   forge-native equivalent and list it beside the original. We do not replace or
   merge rows — a GitLab-native diagram tool is a different product with a
   different URL, and gets its own entry.

What we will not do is spoof a host: SuperRepo will not send a GitLab URL to a
service that cannot take it, and will not keep a row visible on a host where it
does not work.

## Hosts we care about

| Host | Why |
|---|---|
| `gitlab.com` | Largest non-GitHub forge; in-page buttons are opt-in already |
| `bitbucket.org` | Still common in enterprise setups |
| `codeberg.org` / Gitea / Forgejo | The forges the extension already recognises via the context menu |
| Self-hosted Gitea and GitLab | Same URL shape as the hosted versions; the harder part is knowing the host is a forge at all |

## How to claim or start a piece of work

1. Open the **[Expand a service to more forge platforms](https://github.com/ranjithrajv/superrepo/issues/new?template=forge-support.yml)**
   issue. Say whether you are doing an upstream contribution or building an
   independent service, which forges you are covering, and where the maintainers
   are.
2. If you are going upstream, link the PR or issue you filed, so we can follow
   along and list the support once it ships.
3. If you are building an independent service, say what makes it genuinely
   different from the row it sits beside, so it is not collapsed into it.
4. When a service has a stable, documented URL template for a new forge, file a
   PR against `src/catalog.js` (or a row in the *List my service* form) and we
   will add `supports` for that host. The degrade test in `test/degrade.test.mjs`
   is the rule that row must satisfy before it can ship.

## What "done" looks like

- The service's own docs show a working URL for at least one repo on the new
  forge.
- SuperRepo's `supports` returns true for that host and `npm run probe` (or a
  manual browser check) confirms the URL resolves.
- The generated `PARTNERS.md` and `docs/CATALOG.md` are regenerated with
  `npm run partners && npm run catalog`.

Nothing else has to change: one object in `src/catalog.js` already reaches the
buttons, the panel, the context menu and the omnibox, and the `supports` field is
what decides whether it is offered on a given host.

## Maintainers and upstreams we have already identified

| Service | Upstream |
|---|---|
| GitIngest | https://github.com/coderamp-labs/gitingest |
| GitDiagram | https://github.com/ahmedkhaleel2004/gitdiagram |
| Repomix | https://github.com/yamadashy/repomix |
| code2flow | https://github.com/scottrogowski/code2flow |
| code2prompt | https://github.com/mufeedvh/code2prompt |
| DeepWiki Open | https://github.com/AsyncFuncAI/deepwiki-open |

If your tool is not here, add yourself with one issue:
[List my service →](https://github.com/ranjithrajv/superrepo/issues/new?template=partners.yml)
