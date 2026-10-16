# Four extensions, one GitHub header

There is a small crowding problem forming in the GitHub repository header. GitIngest
puts a button there. DeepWiki Button puts one there. Repomix puts one there. GitHub
Web IDE puts one there. So does SuperRepo.

Four separate clusters in one header is a mess, and the person who has to live in
that mess is the user, not any of the extensions.

This is not a problem you solve by winning. It is a problem you solve by agreeing.
So SuperRepo published its half of the agreement — a small, stable DOM contract that
any peer extension can read and rely on — and this is what it says.

## One element, one query

SuperRepo mounts a single custom element and marks it. That is the whole detection
surface:

```html
<ul data-testid="repo-header-actions">
  <!-- GitHub's own Watch / Fork / Star -->
  <li data-superepo="1">
    <superepo-root data-superepo="1" data-placement="inline">…</superepo-root>
  </li>
</ul>
```

A peer needs exactly one line to know whether SuperRepo is already on the page:

```js
document.querySelector("superepo-root[data-superepo]")
```

The shadow root is `mode: "open"`, so it is readable rather than a black box.

## Detect, then don't duplicate

If your own button for a service is already on the page, SuperRepo does not need to
add a second one for the same destination. The contract asks peers to check before
they render, and to leave the existing marker alone. Two buttons for one
destination is the failure mode we are both trying to avoid.

## Don't fight for the slot

SuperRepo appends to `repo-header-actions` and touches nothing else. It does not
reorder, hide or restyle anything GitHub rendered, and it does not touch children of
`ul.pagehead-actions` that it did not create. Two extensions can both live in that
header without either hiding the other. That is a choice, and it is available to
everyone.

The anchors it tries, in order — most reliable first — are
`[data-testid="repo-header-actions"]`, then the legacy `ul.pagehead-actions`, then
`#repository-container-header`, then the parent of `[data-testid="star-button"]`.
GitHub replaced the old list with Primer components whose class names are hashed and
unstable, so the `data-testid` hooks are the only stable target left.

## Match the theme, don't fight it

The cluster reads GitHub's own CSS custom properties — `--fgColor-default`,
`--fontStack-system` and the rest — so it follows light, dark and system themes for
free and sits in that header like something GitHub shipped. Any extension that wants
its buttons to look native should do the same rather than inventing a palette.

## The header is not static, so don't cache

GitHub's React re-renders the header and takes extension nodes with it. SuperRepo
watches for that and re-mounts, which means the host element you see can be replaced
within a second or two of first appearing. If you hold a reference to it, re-query
rather than caching — there is a regression test for exactly this failure, because
when it breaks, the panel ends up in a detached shadow root and silently never
appears.

## Contract versus internal

Stable and safe to depend on: the tag name `superepo-root`, `data-superepo="1"` on
the host and its `<li>` wrapper, `data-placement` with the values `inline` and
`floating`, and the open shadow root.

Internal and subject to change without notice: everything inside the shadow root —
every class name, the panel markup, button attributes. Style against the host
element and its attributes only, and nothing will move under you. New placement
modes and attribute values will be *added* to the contract rather than swapped in
underneath it, and the document has a versioning note that says so.

## Why publish it at all

Because the catalog is the product, and a catalog is only worth anything if it can
sit next to the things it lists. Being a pleasant neighbour in the GitHub header is
something we can choose to be. It costs us a document and a few lines of discipline,
and it is the difference between an ecosystem and a pile-up.

If you maintain an extension with buttons in that header, publish your marker too.
SuperRepo will respect it. `superepo@ranjithraj.dev` if you want us to add yours to
the list we check.
