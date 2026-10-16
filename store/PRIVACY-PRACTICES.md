# Chrome Web Store — Privacy practices

The Privacy practices tab asks for one piece of prose per permission the manifest
declares, plus a single-purpose statement and a data-usage certification. The
dashboard rejects the upload until every one is filled in, and reviewers read
them before they read anything else, so this file is the text to paste, checked
against what the extension actually does.

Everything below matches `manifest.chrome.json` exactly. If a permission changes
there, the matching section here changes with it — the two are read side by side.

The blocks are short on purpose: the longest is 820 characters, so every one fits
the dashboard's per-field box without trimming.

**Before pasting:** nothing here says anything that `PRIVACY.md` (the public
policy you link in the last field) does not also say. If that stops being true,
one of the two is wrong.

---

## 1. Single purpose description

> Field: *Single purpose description*

The one thing a reviewer will look for here is a bundle of unrelated features,
and this extension is unusually exposed to that reading: it links to twenty-eight
different third-party tools. So the field leads with the single operation rather
than with the buttons, and then says outright that the catalog is data. Keep that
order if you edit it — leading with "many tools" is what makes it sound like a
portal.

```text
SuperRepo does one thing: it opens the GitHub repository you are looking at in another developer tool, so you don't have to rewrite the URL by hand.

Developer tools each expect a repository in their own URL format — gitingest.com/owner/repo, gitpod.io/#owner/repo. SuperRepo puts those destinations in the repository header, beside Watch / Fork / Star, and opens the one you click. The list of tools is data, not added functionality: every entry is the same single operation with a different destination, reachable from the header, the panel, the right-click menu or the address bar.

It reads only the repository owner and name, and whether the page is the repository, a folder or a single file, so each destination gets the right URL. No account, no server, no analytics, and nothing collected, transmitted or shared.
```

---

## 2. Permission justifications

The dashboard shows one field per declared permission. Paste the matching block.
Order below is the manifest's order.

> Field: *Justification for `storage`*

```text
Two things, both on the user's own device and nowhere else.

1. Their settings: which buttons appear, whether they show an icon or a name, where the buttons sit, what a click does (open a tab, a window, or only copy the URL), which services they have hidden, their order, and any custom service they add themselves.

2. A count of how many times they have clicked each service, used only to put the ones they actually use first in the panel.

Both live in chrome.storage.local. Nothing is synced, and no code path sends either anywhere — the extension has no server and makes no network requests of its own.
```

> Field: *Justification for `contextMenus`*

```text
Adds one "SuperRepo" item to the right-click menu, so a service can be opened for the page the user is on, or for a repository link they right-clicked, without going back to the page first.

The menu is matched on the repository URL, so it works on a GitHub, GitLab, Bitbucket or Codeberg link — three of which the extension holds no host access to. This is deliberate, and it is why the permission is here: a context menu is matched by URL pattern and needs no host permission, so the right-click menu works everywhere the buttons themselves do not.

Nothing about the click is stored, transmitted or shared.
```

> Field: *Justification for `clipboardWrite`*

```text
Every service in the panel has a copy button, and a file or folder view has a copy button for the link to what the user is looking at. Clicking it copies the rewritten URL — or, for the command-line tools in the catalog, the shell command — to the clipboard.

This is central to what the extension is for: a large part of the reason people use these tools is to paste a repository URL into a chat message, an issue or a terminal. The permission is used only to write text the user explicitly asked to copy. The extension never reads the clipboard.
```

> Field: *Justification for `scripting`*

```text
Used for one thing only: registering the extension's own bundled content script on an optional host after the user has granted access to that host by hand from the options page.

Chrome will not run a content script on a host whose permission the extension does not hold, so the registration is kept in step with what the user has actually granted, and removed again when they take that access away.

No remote code is involved and nothing is injected that the user has not switched on. With no user-granted host this permission does nothing and cannot run on any site by itself.
```

> Field: *Justification for host permission `https://github.com/*/*`*

```text
The buttons are drawn inside GitHub's own repository header, in the same row as Watch / Fork / Star, so the content script has to be able to run on that page.

It reads two things from the page: the URL, from which it takes the repository owner, the repository name and whether the user is looking at the repository, a folder or a file; and the position of GitHub's header row, which is where the buttons are inserted. Repository contents are not read, and no account, personal or authentication data is read.

Nothing is transmitted. Clicking a button opens a normal URL in a tab, which loads that site under its own permissions and privacy policy — not ours.

github.com is the only host required at install, and the only one the install prompt mentions. No other site is requested.
```

> Field: *Justification for optional host permission `https://gitlab.com/*/*`*

```text
Optional, and off unless the user turns it on. It lets the same buttons be drawn on GitLab instead of GitHub, and it exists as an optional permission rather than a required one precisely so the install prompt stays quiet — GitHub is what the extension is for, and a user who does not use GitLab never sees this request.

The user grants it by clicking Enable next to gitlab.com in the extension's own settings page, and can remove it there again, which stops the content script. It reads the same two things it reads on GitHub: the page URL for the project owner, project name and page type, and the position of GitLab's header row.

It is not requested at install, it is not part of any other flow, and nothing is transmitted from it.
```

> Field: *Remote code*

The dashboard asks for this separately from the permissions. Select
**"No, I am not using remote code"**.

```text
No. Everything the extension runs is in the package that was installed. There is no remotely hosted code, no eval, no new Function, and no configuration fetched at runtime.

The extension makes no network requests of its own. Clicking a button hands a URL to the browser, which loads that site in a normal tab under that site's own permissions and privacy policy. We see nothing about what happens there.
```

---

## 3. Data usage

**Data types collected — leave every checkbox unticked.** Nothing is collected,
so no category applies. Do not tick "Website content": the extension reads the
repository URL to build a link, but stores nothing and transmits nothing.

**Certifications — the three standard statements, then the general one. They
read roughly:**

- [ ] I do not sell or transfer user data to third parties, outside of the approved use cases
- [ ] I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- [ ] I do not use or transfer user data to determine creditworthiness or for lending purposes
- [ ] I certify that my data usage complies with the Chrome Web Store Developer Program Policies

The last one is the separate certification the dashboard nags about at the bottom
of the tab. All four are true: there is no data collection of any kind, and no
server to send it to.

---

## 4. Privacy policy URL

Must be a public, resolveable URL. Use the policy in this repository — the
rendered page, not the raw file:

```text
https://github.com/<owner>/superepo/blob/main/PRIVACY.md
```

The store cross-checks this against the declarations above. `PRIVACY.md` lists
the same four permissions and the same "nothing is collected" claim, which is why
it is worth re-reading before submitting rather than after.
