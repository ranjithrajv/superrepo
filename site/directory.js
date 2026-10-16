/* Service directory (site/index.html) — lays the catalog out as a treemap and
 * draws the hover/focus tooltip.
 *
 * The catalog itself is inlined below so the page needs no fetch and works from
 * file:// as well as from Pages. It is a copy of src/catalog.js shaped for this
 * view; `npm run catalog` writes docs/CATALOG.md from the same source.
 */
(function () {
  const root = document.getElementById('treemap');
  if (!root) return;
  const tip = document.createElement('div');
  tip.className = 'treemap-tip';
  const tipName = document.createElement('strong');
  const tipBlurb = document.createElement('span');
  tip.append(tipName, tipBlurb);
  document.body.appendChild(tip);

  function showTip(item, x, y) {
    tipName.textContent = item.name;
    tipBlurb.textContent = item.blurb;
    tip.classList.add('is-on');
    moveTip(x, y);
  }
  function moveTip(x, y) {
    const pad = 14;
    let left = x + pad, top = y + pad;
    if (left + 270 > window.innerWidth) left = x - 280;
    if (top + 90 > window.innerHeight) top = y - 100;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hideTip() { tip.classList.remove('is-on'); }
  // BEGIN:generated — `npm run treemap` rewrites the three tables below from
  // src/catalog.js. Do not hand-edit; `npm run check` fails once they drift.
  const CAT_LABEL = {"prompt":"Prompt-ready digest","wiki":"AI-generated wiki","agent":"For AI agents","diagram":"Diagrams & structure","editor":"Editor in the page","workspace":"Cloud workspace","history":"History","analytics":"Analytics","cli":"Local command line","more":"More views","custom":"Your own"};
  const CAT_ORDER = ["prompt","wiki","agent","diagram","editor","workspace","history","analytics","cli","more","custom"];
  const BY_CAT = {"prompt":[{"id":"gitingest","name":"GitIngest","color":"#6d5efc","category":"prompt","icon":"text-file","docs":"https://gitingest.com/","blurb":"Whole repo as one prompt-friendly text digest","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.5 1.8h4.2L12 5.1v9.1H4.5z\"/><path d=\"M8.7 1.8v3.3H12\"/><path d=\"M6.4 8.2h3.4M6.4 10.7h3.4\"/></svg>"}],"wiki":[{"id":"deepwikiopen","name":"DeepWiki Open","color":"#64748b","category":"wiki","icon":"home","docs":"https://github.com/AsyncFuncAI/deepwiki-open","blurb":"Self-hosted DeepWiki, for private repos","kind":"link","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 7.6 8 3.2l5 4.4\"/><path d=\"M4.6 7.2v6.3h6.8V7.2\"/></svg>"}],"agent":[{"id":"gitmcp","name":"GitMCP","color":"#8b5cf6","category":"agent","icon":"plug","docs":"https://gitmcp.io/","blurb":"MCP server endpoint for AI agents","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6 2v2.6M10 2v2.6\"/><path d=\"M4.2 4.6h7.6v2.2a3.8 3.8 0 0 1-7.6 0z\"/><path d=\"M8 10.6v3.2\"/></svg>"},{"id":"githubgg","name":"GitHub.gg","color":"#f97316","category":"agent","icon":"chat","docs":"https://www.github.gg/","blurb":"Chat-style navigation of the repo","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.8 3.6h10.4v6.6H7.4L4.4 12.8v-2.6H2.8z\"/></svg>"},{"id":"gitsummarize","name":"GitSummarize","color":"#10b981","category":"agent","icon":"sparkle","docs":"https://gitsummarize.com/","blurb":"Generated documentation hub","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6.4 2.4l1.2 2.5 2.5 1.2-2.5 1.2-1.2 2.5-1.2-2.5L2.7 6.1l2.5-1.2z\"/><path d=\"M11.8 9l.8 1.6 1.6.8-1.6.8-.8 1.6-.8-1.6-1.6-.8 1.6-.8z\"/></svg>"},{"id":"gitreverse","name":"GitReverse","color":"#ef4444","category":"agent","icon":"undo","docs":"https://www.gitreverse.com/","blurb":"“Rebuild this from scratch” prompt","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.2 7.2h6.2a3 3 0 0 1 0 6H6.4\"/><path d=\"M6.8 4.6 4.2 7.2l2.6 2.6\"/></svg>"}],"diagram":[{"id":"gitdiagram","name":"GitDiagram","color":"#7c3aed","category":"diagram","icon":"nodes","docs":"https://gitdiagram.com/","blurb":"Interactive architecture diagram, Mermaid export","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"8\" cy=\"3.4\" r=\"1.6\"/><circle cx=\"3.6\" cy=\"12.4\" r=\"1.6\"/><circle cx=\"12.4\" cy=\"12.4\" r=\"1.6\"/><path d=\"M7.2 4.8 4.4 11M8.8 4.8 11.6 11M5.2 12.4h5.6\"/></svg>"},{"id":"code2flow","name":"code2flow","color":"#a16207","category":"diagram","icon":"flow","docs":"https://github.com/scottrogowski/code2flow","blurb":"Call graphs from static analysis","kind":"command","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.6 4.6h3.8a3.2 3.2 0 0 1 3.2 3.2 3.2 3.2 0 0 0 3.2 3.2h.4\"/><path d=\"M10.6 8.6l2.8 2.4-2.8 2.4\"/></svg>"}],"editor":[{"id":"githubdev","name":"github.dev","color":"#3b82f6","category":"editor","icon":"window","docs":"https://github.dev/","blurb":"Full VS Code in the browser, at this path","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.6 3.4h10.8v9.2H2.6z\"/><path d=\"M2.6 6.2h10.8\"/><path d=\"M4.6 4.8h.01M6.4 4.8h.01\"/></svg>"},{"id":"vscodedev","name":"VS Code for the Web","color":"#2563eb","category":"editor","icon":"code","docs":"https://vscode.dev/","blurb":"vscode.dev, opened at this repo","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6.2 4.6 2.8 8l3.4 3.4M9.8 4.6 13.2 8l-3.4 3.4\"/></svg>"},{"id":"github1s","name":"GitHub1s","color":"#1e40af","category":"editor","icon":"archive","docs":"https://github1s.com/","blurb":"Archived, but still a one-second VS Code","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.6 5.4h10.8v7.4H2.6z\"/><path d=\"M2 3.4h12v2H2z\"/><path d=\"M6.4 8.6h3.2\"/></svg>"}],"workspace":[{"id":"gitpod","name":"Gitpod","color":"#f59e0b","category":"workspace","icon":"cloud","docs":"https://gitpod.io/","blurb":"Cloud dev environment, prebuilt from this URL","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.8 12h6.4a2.4 2.4 0 0 0 .3-4.8 3.6 3.6 0 0 0-6.9-.9A2.9 2.9 0 0 0 4.8 12z\"/></svg>"},{"id":"stackblitz","name":"StackBlitz","color":"#1389fd","category":"workspace","icon":"play","docs":"https://stackblitz.com/","blurb":"Runs the repo in a browser workspace","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5.8 3.8 11.8 8l-6 4.2z\"/></svg>"},{"id":"codeflow","name":"Codeflow (pr.new)","color":"#06b6d4","category":"workspace","icon":"pull-request","docs":"https://pr.new/","blurb":"Open the branch or PR in a live workspace","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"4\" cy=\"3.8\" r=\"1.6\"/><circle cx=\"4\" cy=\"12.2\" r=\"1.6\"/><path d=\"M4 5.4v5.2\"/><circle cx=\"12\" cy=\"12.2\" r=\"1.6\"/><path d=\"M8 3.8h2.4a1.6 1.6 0 0 1 1.6 1.6v5.2\"/></svg>"},{"id":"bolt","name":"bolt.new","color":"#eab308","category":"workspace","icon":"bolt","docs":"https://bolt.new/","blurb":"AI app builder seeded from the repo","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M9.2 1.6 4 9h3.6l-.8 5.4L12 7H8.4z\"/></svg>"}],"history":[{"id":"githistory","name":"Git History","color":"#ec4899","category":"history","icon":"clock","docs":"https://githistory.xyz/","blurb":"Watch this file evolve, commit by commit","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"8\" cy=\"8\" r=\"5.6\"/><path d=\"M8 4.8V8l2.2 1.4\"/></svg>"},{"id":"githubtracker","name":"GitHubTracker","color":"#8b5cf6","category":"history","icon":"pulse","docs":"https://githubtracker.com/","blurb":"Commits, issues and PRs over time","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M1.8 8h2.6l1.9-4 2.4 8 1.8-4h2.7\"/></svg>"}],"analytics":[{"id":"ossinsight","name":"OSS Insight","color":"#14b8a6","category":"analytics","icon":"chart","docs":"https://ossinsight.io/","blurb":"Contributors, activity and trends","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3.2 13V8.6M6.8 13V4.6M10.4 13V7M13.2 13V9.6\" stroke-width=\"2\"/></svg>"},{"id":"starhistory","name":"Star History","color":"#f59e0b","category":"analytics","icon":"star","docs":"https://www.star-history.com/","blurb":"Star growth chart — organic, or one spike?","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 2.2l1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4L2.2 6.5l4-.6z\" fill=\"currentColor\" stroke=\"none\"/></svg>"}],"cli":[{"id":"repomix","name":"Repomix","color":"#f43f5e","category":"cli","icon":"box","docs":"https://repomix.com/","blurb":"Pack the repo into one AI-friendly file","kind":"command","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.4 5.6h11.2v7.2H2.4z\"/><path d=\"M2.4 5.6 3.6 3h8.8l1.2 2.6\"/><path d=\"M8 7.4v3.6M6.4 9.4 8 11l1.6-1.6\"/></svg>"},{"id":"gitingestcli","name":"GitIngest CLI","color":"#6d5efc","category":"cli","icon":"terminal","docs":"https://github.com/coderamp-labs/gitingest","blurb":"Prompt-friendly digest from your terminal","kind":"command","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M2.4 3.6h11.2v8.8H2.4z\"/><path d=\"M4.8 7l1.8 1.8-1.8 1.8\"/><path d=\"M8.6 10.6h2.6\"/></svg>"},{"id":"code2prompt","name":"code2prompt","color":"#f97316","category":"cli","icon":"target","docs":"https://github.com/mufeedvh/code2prompt","blurb":"Turn a local clone into a templated prompt","kind":"command","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"8\" cy=\"8\" r=\"5.2\"/><circle cx=\"8\" cy=\"8\" r=\"1.9\"/><path d=\"M8 1.4v1.8M8 12.8v1.8M1.4 8h1.8M12.8 8h1.8\"/></svg>"}],"more":[{"id":"sourcegraph","name":"Sourcegraph","color":"#dc2626","category":null,"icon":"search","docs":"https://sourcegraph.com/","blurb":"Cross-repo search: find references in unfamiliar code","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"7\" cy=\"7\" r=\"4.2\"/><path d=\"M10.2 10.2 13.6 13.6\"/></svg>"},{"id":"forgithubcache","name":"cache.forgithub","color":"#64748b","category":null,"icon":"database","docs":"https://cache.forgithub.com/","blurb":"Cached repo metadata on a stable path","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 2.4c2.9 0 4.8 1 4.8 2s-1.9 2-4.8 2-4.8-1-4.8-2 1.9-2 4.8-2z\"/><path d=\"M3.2 4.4v7.2c0 1 1.9 2 4.8 2s4.8-1 4.8-2V4.4\"/></svg>"},{"id":"threadsforgithub","name":"threads.forgithub","color":"#64748b","category":null,"icon":"at","docs":"https://threads.forgithub.com/","blurb":"Find X posts about this repo","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"8\" cy=\"8\" r=\"5.6\"/><path d=\"M8 5.4v4.4a1.6 1.6 0 0 0 3.2 0V8A3.2 3.2 0 1 0 8 11.2\"/></svg>"},{"id":"gitpodcast","name":"GitPodcast","color":"#a855f7","category":null,"icon":"mic","docs":"https://www.gitpodcast.com/","blurb":"Turn the repo into a narrated podcast episode","kind":"url","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 2.4a1.9 1.9 0 0 1 1.9 1.9v3a1.9 1.9 0 0 1-3.8 0v-3A1.9 1.9 0 0 1 8 2.4z\"/><path d=\"M4.6 7.2v.6a3.4 3.4 0 0 0 6.8 0v-.6\"/><path d=\"M8 11.2v2.4\"/></svg>"},{"id":"octotree","name":"Octotree","color":"#22c55e","category":null,"icon":"tree","docs":"https://www.octotree.io/","blurb":"Extension that adds an IDE file tree to GitHub","kind":"link","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 13V6.4a2.6 2.6 0 0 1 2.6-2.6h2.8\"/><path d=\"M9.2 8.6h1.6\"/><circle cx=\"5\" cy=\"13\" r=\"1.7\"/><circle cx=\"12.2\" cy=\"3.8\" r=\"1.7\"/><circle cx=\"12.2\" cy=\"8.6\" r=\"1.7\"/></svg>"},{"id":"sourcetrail","name":"Sourcetrail","color":"#a16207","category":null,"icon":"compass","docs":"https://www.sourcetrail.com/","blurb":"Offline interactive source explorer (archived)","kind":"link","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"8\" cy=\"8\" r=\"5.6\"/><path d=\"M10.6 5.4 9.2 9.2 5.4 10.6 6.8 6.8z\"/></svg>"}],"custom":[{"id":"custom-add","name":"Add your tool","color":"var(--accent)","category":"custom","icon":"sparkle","docs":"https://github.com/ranjithrajv/superrepo/blob/main/CONTRIBUTING.md","blurb":"One object in src/catalog.js covers buttons, panel, context menu and omnibox.","kind":"link","svg":"<svg width=\"22\" height=\"22\" viewBox=\"0 0 16 16\" aria-hidden=\"true\" focusable=\"false\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M6.4 2.4l1.2 2.5 2.5 1.2-2.5 1.2-1.2 2.5-1.2-2.5L2.7 6.1l2.5-1.2z\"/><path d=\"M11.8 9l.8 1.6 1.6.8-1.6.8-.8 1.6-.8-1.6-1.6-.8 1.6-.8z\"/></svg>"}]};
  // END:generated

  function sum(arr) { return arr.reduce((a,b)=>a+(b.value||1),0); }

  /** The band colour for a category, accent when the catalog gives it none. */
  function categoryColor(cid) {
    const sample = (BY_CAT[cid] || [])[0];
    const color = sample && sample.color;
    return color && color !== 'var(--accent)' ? color : 'var(--accent)';
  }
  function treemap(items, x, y, w, h) {
    if (!items.length) return [];
    if (items.length === 1) return [{ item: items[0], rect: { x, y, w, h } }];
    const total = sum(items);
    // find split closest to half
    let acc = 0, best = 1;
    const target = total / 2;
    for (let i = 1; i < items.length; i++) {
      acc += items[i-1].value || 1;
      if (acc >= target) { best = i; break; }
      best = i;
    }
    if (best < 1) best = 1;
    if (best > items.length - 1) best = items.length - 1;
    const left = items.slice(0, best);
    const right = items.slice(best);
    const ratio = sum(left) / total;
    if (w >= h) {
      const w1 = w * ratio;
      return treemap(left, x, y, w1, h).concat(treemap(right, x + w1, y, w - w1, h));
    } else {
      const h1 = h * ratio;
      return treemap(left, x, y, w, h1).concat(treemap(right, x, y + h1, w, h - h1));
    }
  }

  function build() {
    const W = root.clientWidth;
    const H = root.clientHeight;
    root.innerHTML = '';
    if (!W || !H) return;

    // top level: categories sized by item count
    const cats = CAT_ORDER.map(cid => ({ id: cid, value: (BY_CAT[cid] || []).length || 1 }));
    const catRects = treemap(cats, 0, 0, W, H);
    const catMap = Object.fromEntries(catRects.map(c => [c.item.id, c.rect]));

    // category background + label
    for (const cid of CAT_ORDER) {
      const r = catMap[cid];
      if (!r) continue;
      const color = categoryColor(cid);
      const div = document.createElement('div');
      div.className = 'treemap-cat';
      div.style.left = r.x + 'px';
      div.style.top = r.y + 'px';
      div.style.width = r.w + 'px';
      div.style.height = r.h + 'px';
      div.style.setProperty('--treemap-color', color);
      const strip = document.createElement('div');
      strip.className = 'treemap-cat__strip';
      div.appendChild(strip);
      const lab = document.createElement('span');
      lab.className = 'treemap-cat__label';
      lab.textContent = CAT_LABEL[cid] || cid;
      div.appendChild(lab);
      root.appendChild(div);
    }

    // leaves per category, absolute in the category rect, below label
    for (const cid of CAT_ORDER) {
      const r = catMap[cid];
      if (!r) continue;
      const items = (BY_CAT[cid] || []).map(it => ({ ...it, value: 1 }));
      const inset = 20;
      const sub = treemap(items, r.x, r.y + inset, r.w, Math.max(20, r.h - inset - 2), 4);
      for (const leaf of sub) {
        const it = leaf.item;
        const lr = leaf.rect;
        const a = document.createElement('a');
        a.className = 'treemap-leaf';
        a.href = it.docs;
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', it.name + ' — ' + it.blurb);
        a.style.left = (lr.x + 3) + 'px';
        a.style.top = (lr.y + 1) + 'px';
        a.style.width = Math.max(18, lr.w - 6) + 'px';
        a.style.height = Math.max(18, lr.h - 2) + 'px';
        if (it.color) a.style.color = it.color;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'treemap-leaf__icon';
        iconSpan.innerHTML = it.svg.replace('width="22" height="22"', 'width="16" height="16"');
        a.appendChild(iconSpan);

        if (lr.w > 58 && lr.h > 32) {
          const name = document.createElement('span');
          name.className = 'treemap-leaf__name';
          name.textContent = it.name;
          a.appendChild(name);
        }

        // motion smoothness: tooltip follows the pointer
        let pendingTip = null;
        a.addEventListener('mouseenter', (e) => showTip(it, e.clientX, e.clientY));
        a.addEventListener('mousemove', (e) => {
          if (pendingTip) cancelAnimationFrame(pendingTip);
          const x = e.clientX, y = e.clientY;
          pendingTip = requestAnimationFrame(() => { moveTip(x, y); pendingTip = null; });
        });
        a.addEventListener('mouseleave', () => {
          if (pendingTip) { cancelAnimationFrame(pendingTip); pendingTip = null; }
          hideTip();
        });
        a.addEventListener('focus', (e) => {
          const box = e.target.getBoundingClientRect();
          showTip(it, box.left, box.bottom);
        });
        a.addEventListener('blur', hideTip);

        // staggered, subtle entrance per category block
        a.style.animationDelay = (Math.random() * 120) + 'ms';
        root.appendChild(a);
      }
    }
  }

  let resizeTimer;
  function schedule() { clearTimeout(resizeTimer); resizeTimer = setTimeout(build, 120); }

  // compact legend
  const legend = document.getElementById('treemap-legend');
  if (legend) {
    for (const cid of CAT_ORDER) {
      const color = categoryColor(cid);
      const chip = document.createElement('span');
      chip.className = 'treemap-legend-chip';
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:1px solid var(--border);border-radius:999px;font-size:12px;background:var(--surface);';
      const dot = document.createElement('span');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:' + color + ';';
      const text = document.createElement('span');
      text.textContent = (CAT_LABEL[cid] || cid) + ' · ' + ((BY_CAT[cid] || []).length);
      chip.appendChild(dot);
      chip.appendChild(text);
      legend.appendChild(chip);
    }
  }

  window.addEventListener('resize', schedule);
  build();
})();
