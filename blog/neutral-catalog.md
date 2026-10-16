# A catalog you cannot buy your way into

SuperRepo is a browser extension that puts a button in the GitHub header for every
tool that turns a repository into something else — a prompt, a diagram, a wiki, an
IDE, a podcast. Almost every one of those tools is someone else's work. The product
is the catalog, and a catalog is worth exactly as much as the trust you place in
its order.

So the ordering rules are public, mechanical, and not for sale.

## No pay-to-play

There is no featured badge. There is no paid pin, no "sponsored" row, no rate card.
We take no cut of anything and never will. If a contribution reads as an attempt to
buy a slot, it is declined.

That is easy to say and easy to break later, so it is written down as the premise
rather than a policy: **if placement were ever for sale, every tool in the catalog
would have a reason to stop trusting the catalog.** Since the catalog is the only
thing we have, it cannot be.

## Placement follows use, not names

Here is the part most "curated directory" pitches skip. A default list of *named*
tools would quietly promote whoever those tools were. So the shipped header does
not name tools in its defaults at all.

Out of the box it renders **one button per category** — a prompt, a diagram, an
IDE, and so on — and each group fills with the service a given user reaches for
most in it, resolved from that user's own clicks. Being listed does not privilege
you. Being the vendor's favourite does not privilege you. The only thing that
changes which button you see is which button you actually use.

## Four mechanical admission rules

A tool gets in if, and only if:

1. It takes the GitHub URL shape — or accepts a full repo URL, or is a local CLI
   worth handing one to.
2. It is alive, probed within a freshness window.
3. It is not an alias of a row we already have.
4. It fits a category, so the panel groups sensibly.

Rules 2 and 3 are checked by the same weekly probe that keeps the catalog fresh, so
neither can be quietly waived as a favour to a friend.

## Your row is yours

We show your tool in its own colour with its own mark and **your own one-line
description, in your words**. We do not rename it, merge it into a house voice, or
restyle it to match us. A row is a link and a description, not a partnership — you
did not endorse us and we do not imply you did.

## Rows die honorably

Tools get renamed, change their URL shape, or shut down. When the probe finds one
broken, we contact the maintainer **before** we record anything. A dead row is
demoted and marked unverified; it is not deleted and it is not shamed in public.
The catalog's freshness should be visible in a diff, not in a takedown.

## Getting listed takes one issue and no code

If you maintain a tool that turns a repo into something else, you open one issue,
paste one working URL for one real repo, and we probe it. No PR, no code, no account,
no waiting to be noticed. Everything else on the form has a default, and nothing on
it is a condition of being listed.

```
github.com/ranjithrajv/superrepo → List my service
```

## Why we would be stupid to change any of this

The moment placement is for sale, the catalog stops being a directory and becomes an
advertisement, and the first vendor who suspects their competitor paid for a slot
leaves. Neutrality is not a values statement bolted on at the end. It is the
mechanism that keeps the catalog worth reading, and therefore the mechanism that
keeps this project alive.
