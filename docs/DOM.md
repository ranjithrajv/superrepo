# In-page DOM contract

SuperRepo puts a cluster of buttons on every repo page. Several other extensions
put buttons in the same header — GitIngest, DeepWiki Button, Repomix, GitHub Web
IDE and others. Four clusters in one header is a mess, and the user is the one who
has to live in it.

So this document exists so peer extensions can coexist with SuperRepo instead of
competing with it. Everything here is public and intended to be relied on.

## The host element

| | |
|---|---|
| Tag | `<superepo-root>` |
| Marker attribute | `data-superepo="1"` |
| Placement attribute | `data-placement="inline"` or `"floating"` |
| Shadow root | **open** (`mode: "open"`) — you can read it |

```html
<ul data-testid="repo-header-actions">
  <!-- GitHub's own Watch / Fork / Star -->
  <li data-superepo="1">
    <superepo-root data-superepo="1" data-placement="inline">…</superepo-root>
  </li>
</ul>
```

One detection call is enough:

```js
document.querySelector("superepo-root[data-superepo]")
```

## Placement

`data-placement="inline"` puts the cluster in GitHub's own header, `z-index: 60`.
`data-placement="floating"` pins it to the bottom-right (16px inset) at
`z-index: 2147483000` when no anchor was found.

Anchors are tried in order, most reliable first:

1. `[data-testid="repo-header-actions"]` — append
2. `ul.pagehead-actions` — append, wrapped in an `<li>` so list semantics survive
3. `#repository-container-header` — prepend
4. `[data-testid="star-button"]`'s parent — append

GitHub replaced `ul.pagehead-actions` with Primer components whose class names
are hashed, so the `data-testid` hooks are the only stable target.

## What peers should do

**Detect, then don't duplicate.** If your own button for a service is already on
the page, SuperRepo does not need to add a second one for the same destination.
Check the page before you render, and if you find a marker for your tool, leave it
alone.

**Don't fight for the slot.** SuperRepo appends to `repo-header-actions` and
nothing else. It does not reorder, hide or restyle anything GitHub renders, and
it does not touch `ul.pagehead-actions` children that it did not create. Two
extensions can both live there without either hiding the other.

**Match the theme, don't fight it.** SuperRepo inherits GitHub's own CSS custom
properties (`--fgColor-default`, `--fontStack-system`, and the rest) and follows
light/dark/system for free. Reading the same variables is how everything in that
header stays consistent.

## What's contract, and what isn't

Stable, safe to depend on:

- the tag `superepo-root`
- `data-superepo="1"` on the host **and** on the `<li>` wrapper
- `data-placement` with the values `inline` and `floating`
- the open shadow root

Internal, may change without notice: everything inside the shadow root — the
`.cluster` wrapper, `.btn`, `.glyph`, `.panel`, the `data-open` attribute on
individual buttons, and all class names. Style against the host element and its
attributes only.

## Re-mounting

GitHub's React re-renders the header and takes our node with it. SuperRepo
watches for that and re-mounts, resetting its own state. The host element you see
can therefore be replaced within a second or two of first appearing. If you hold
a reference to it, re-query rather than caching.

## Versioning

This contract changed in one way: the `<li>` wrapper used to be marked
`data-super-repo` and now matches the host's `data-superepo`. It is the only
change and nothing shipped depended on the old spelling. In general, a new
attribute value or a new placement mode will be added here rather than swapped
underneath you.

## Why we published this

Because the catalog is the product, and a catalog is only worth anything if it can
sit next to the things it lists. Being a pleasant neighbour in the GitHub header
is a thing we can choose to be, and we are choosing it.

Questions, or a marker you would like us to respect: `superepo@ranjithraj.dev`