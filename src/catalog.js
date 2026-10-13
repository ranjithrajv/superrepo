/**
 * The catalog: every "point a tool at this repo" service, as data.
 *
 * Adding a service is one object. `supports` decides whether a row appears for
 * the page you are on, and `url`/`command` builds the target from a parsed repo
 * context (see parse.js).
 *
 * Verified against SERVICES.md on 2026-10-13.
 */

import { parseRepoUrl } from "./parse.js";

export const CATEGORIES = [
  { id: "prompt", label: "Prompt-ready digest", icon: "text-file" },
  { id: "wiki", label: "AI-generated wiki", icon: "book" },
  // Was buried in "More views" when the old "ai" group was split by output type:
  // these are the ones that speak to an agent or write docs rather than produce a
  // digest or a wiki.
  { id: "agent", label: "For AI agents", icon: "plug" },
  { id: "diagram", label: "Diagrams & structure", icon: "nodes" },
  // "Open & run" was eight services in one group: three are an editor pointed at
  // this exact path, five are a hosted workspace. Different clicks, different
  // expectations about what happens next, so they are different buttons.
  { id: "editor", label: "Editor in the page", icon: "code" },
  { id: "workspace", label: "Cloud workspace", icon: "cube" },
  // "History & analytics" was one group holding two different questions: what
  // happened to this repo, and how is it doing. Sourcegraph is neither — it is
  // cross-repo search — so it carries no category and lands in "More views".
  { id: "history", label: "History", icon: "clock" },
  { id: "analytics", label: "Analytics", icon: "chart" },
  { id: "cli", label: "Local command line", icon: "terminal" },
];

const gitHubOnly = (ctx) => ctx.isGitHub;
const always = () => true;

const treeAt = (ctx) => (ctx.ref ? `/tree/${ctx.ref}` : "");

/**
 * @typedef {object} Service
 * @property {string} id
 * @property {string} name
 * @property {string} abbr      2-3 letter monogram, shown by the "monogram" button style
 * @property {string} color     chip colour
 * @property {string} category  one of CATEGORIES ids
 * @property {string} blurb     one-line description
 * @property {"url"|"command"|"link"} kind
 * @property {(ctx: object) => boolean} [supports]
 * @property {(ctx: object) => string} [url]
 * @property {(ctx: object) => string} [command]
 * @property {string} [docs]
 * @property {boolean} [defaultOff]
 * @property {"free"|"freemium"|"paid"} [pricing]  whether using it costs money
 */

/** @type {Service[]} */
export const CATALOG = [
  // ---------------------------------------------------------------- AI context
  {
    id: "gitingest",
    name: "GitIngest",
    abbr: "GI",
    color: "#6d5efc",
    category: "prompt",
    kind: "url",
    blurb: "Whole repo as one prompt-friendly text digest",
    docs: "https://gitingest.com/",
    supports: gitHubOnly,
    url: (c) => `https://gitingest.com/${c.owner}/${c.repo}${c.ingestSuffix}`,
  },
  {
    id: "gitmcp",
    name: "GitMCP",
    abbr: "GM",
    color: "#8b5cf6",
    category: "agent",
    kind: "url",
    blurb: "MCP server endpoint for AI agents",
    docs: "https://gitmcp.io/",
    supports: gitHubOnly,
    url: (c) => `https://gitmcp.io/${c.owner}/${c.repo}`,
  },
  {
    id: "githubgg",
    name: "GitHub.gg",
    abbr: "GG",
    color: "#f97316",
    category: "agent",
    pricing: "freemium",
    kind: "url",
    blurb: "Chat-style navigation of the repo",
    docs: "https://www.github.gg/",
    supports: gitHubOnly,
    url: (c) => `https://www.github.gg/${c.owner}/${c.repo}`,
  },
  {
    id: "gitsummarize",
    name: "GitSummarize",
    abbr: "GS",
    color: "#10b981",
    category: "agent",
    pricing: "freemium",
    kind: "url",
    blurb: "Generated documentation hub",
    docs: "https://gitsummarize.com/",
    supports: gitHubOnly,
    url: (c) => `https://gitsummarize.com/${c.owner}/${c.repo}`,
  },
  {
    id: "gitreverse",
    name: "GitReverse",
    abbr: "GR",
    color: "#ef4444",
    category: "agent",
    kind: "url",
    blurb: "“Rebuild this from scratch” prompt",
    docs: "https://www.gitreverse.com/",
    supports: gitHubOnly,
    url: (c) => `https://www.gitreverse.com/${c.owner}/${c.repo}`,
  },
  {
    id: "deepwikiopen",
    name: "DeepWiki Open",
    abbr: "DO",
    color: "#64748b",
    category: "wiki",
    kind: "link",
    blurb: "Self-hosted DeepWiki, for private repos",
    docs: "https://github.com/AsyncFuncAI/deepwiki-open",
    defaultOff: true,
    url: () => "https://github.com/AsyncFuncAI/deepwiki-open",
  },

  // ------------------------------------------------------------------ diagrams
  {
    id: "gitdiagram",
    name: "GitDiagram",
    abbr: "GD",
    color: "#7c3aed",
    category: "diagram",
    kind: "url",
    blurb: "Interactive architecture diagram, Mermaid export",
    docs: "https://gitdiagram.com/",
    supports: gitHubOnly,
    url: (c) => `https://gitdiagram.com/${c.owner}/${c.repo}`,
  },
  {
    id: "code2flow",
    name: "code2flow",
    abbr: "2F",
    color: "#a16207",
    category: "diagram",
    kind: "command",
    blurb: "Call graphs from static analysis",
    docs: "https://github.com/scottrogowski/code2flow",
    command: (c) => `git clone ${c.repoUrl} && code2flow "${c.repo}" --output callgraph.svg`,
  },

  // ------------------------------------------------------------------ open/run
  {
    id: "githubdev",
    name: "github.dev",
    abbr: "GH",
    color: "#3b82f6",
    category: "editor",
    kind: "url",
    blurb: "Full VS Code in the browser, at this path",
    docs: "https://github.dev/",
    supports: gitHubOnly,
    url: (c) => `https://github.dev/${c.owner}/${c.repo}${c.ghSuffix}`,
  },
  {
    id: "vscodedev",
    name: "VS Code for the Web",
    abbr: "VS",
    color: "#2563eb",
    category: "editor",
    kind: "url",
    blurb: "vscode.dev, opened at this repo",
    docs: "https://vscode.dev/",
    supports: gitHubOnly,
    url: (c) => `https://vscode.dev/github/${c.owner}/${c.repo}${c.ghSuffix}`,
  },
  {
    id: "github1s",
    name: "GitHub1s",
    abbr: "G1",
    color: "#1e40af",
    category: "editor",
    kind: "url",
    blurb: "Archived, but still a one-second VS Code",
    docs: "https://github1s.com/",
    supports: gitHubOnly,
    url: (c) => `https://github1s.com/${c.owner}/${c.repo}${c.ghSuffix}`,
  },
  {
    id: "gitpod",
    name: "Gitpod",
    abbr: "GP",
    color: "#f59e0b",
    category: "workspace",
    pricing: "freemium",
    kind: "url",
    blurb: "Cloud dev environment, prebuilt from this URL",
    docs: "https://gitpod.io/",
    supports: always,
    url: (c) => `https://gitpod.io/#${c.webUrl}`,
  },
  {
    id: "stackblitz",
    name: "StackBlitz",
    abbr: "SB",
    color: "#1389fd",
    category: "workspace",
    pricing: "freemium",
    kind: "url",
    blurb: "Runs the repo in a browser workspace",
    docs: "https://stackblitz.com/",
    supports: gitHubOnly,
    url: (c) => `https://stackblitz.com/github/${c.owner}/${c.repo}${treeAt(c)}`,
  },
  {
    id: "codeflow",
    name: "Codeflow (pr.new)",
    abbr: "CF",
    color: "#06b6d4",
    category: "workspace",
    pricing: "freemium",
    kind: "url",
    blurb: "Open the branch or PR in a live workspace",
    docs: "https://pr.new/",
    supports: gitHubOnly,
    url: (c) => `https://pr.new/github.com/${c.owner}/${c.repo}${c.ghSuffix}`,
  },
  {
    id: "bolt",
    name: "bolt.new",
    abbr: "BO",
    color: "#eab308",
    category: "workspace",
    pricing: "freemium",
    kind: "url",
    blurb: "AI app builder seeded from the repo",
    docs: "https://bolt.new/",
    supports: gitHubOnly,
    url: (c) => `https://bolt.new/github.com/${c.owner}/${c.repo}`,
  },

  // ------------------------------------------------------- history & analytics
  {
    id: "githistory",
    name: "Git History",
    abbr: "HI",
    color: "#ec4899",
    category: "history",
    kind: "url",
    blurb: "Watch this file evolve, commit by commit",
    docs: "https://githistory.xyz/",
    supports: gitHubOnly,
    url: (c) => {
      const ref = c.ref || "HEAD";
      if (c.type === "blob") return `https://githistory.xyz/${c.owner}/${c.repo}/blob/${ref}/${c.path}`;
      if (c.type === "tree") return `https://githistory.xyz/${c.owner}/${c.repo}/commits/${ref}${c.path ? `/${c.path}` : ""}`;
      return `https://githistory.xyz/${c.owner}/${c.repo}/commits/HEAD`;
    },
  },
  {
    id: "sourcegraph",
    name: "Sourcegraph",
    abbr: "SG",
    color: "#dc2626",
    category: null,
    kind: "url",
    blurb: "Cross-repo search: find references in unfamiliar code",
    docs: "https://sourcegraph.com/",
    supports: gitHubOnly,
    url: (c) => `https://sourcegraph.com/github.com/${c.owner}/${c.repo}`,
  },
  {
    id: "ossinsight",
    name: "OSS Insight",
    abbr: "OI",
    color: "#14b8a6",
    category: "analytics",
    kind: "url",
    blurb: "Contributors, activity and trends",
    docs: "https://ossinsight.io/",
    supports: gitHubOnly,
    url: (c) => `https://ossinsight.io/analyze/${c.owner}/${c.repo}`,
  },
  {
    id: "starhistory",
    name: "Star History",
    abbr: "ST",
    color: "#f59e0b",
    category: "analytics",
    kind: "url",
    blurb: "Star growth chart — organic, or one spike?",
    docs: "https://www.star-history.com/",
    supports: gitHubOnly,
    url: (c) => `https://www.star-history.com/#${c.owner}/${c.repo}&Date`,
  },
  {
    id: "githubtracker",
    name: "GitHubTracker",
    abbr: "TR",
    color: "#8b5cf6",
    category: "history",
    kind: "url",
    blurb: "Commits, issues and PRs over time",
    docs: "https://githubtracker.com/",
    supports: gitHubOnly,
    url: (c) => `https://githubtracker.com/${c.owner}/${c.repo}`,
  },
  {
    id: "forgithubcache",
    name: "cache.forgithub",
    abbr: "CA",
    color: "#64748b",
    category: null,
    kind: "url",
    blurb: "Cached repo metadata on a stable path",
    docs: "https://cache.forgithub.com/",
    defaultOff: true,
    signupRequired: true,
    supports: gitHubOnly,
    url: (c) => `https://cache.forgithub.com/${c.owner}/${c.repo}`,
  },
  {
    id: "threadsforgithub",
    name: "threads.forgithub",
    abbr: "TH",
    color: "#64748b",
    category: null,
    kind: "url",
    blurb: "Find X posts about this repo",
    docs: "https://threads.forgithub.com/",
    defaultOff: true,
    signupRequired: true,
    supports: gitHubOnly,
    url: (c) => `https://threads.forgithub.com/${c.owner}/${c.repo}`,
  },

  // --------------------------------------------------------------- more views
  {
    id: "gitpodcast",
    name: "GitPodcast",
    abbr: "PD",
    color: "#a855f7",
    category: null,
    kind: "url",
    blurb: "Turn the repo into a narrated podcast episode",
    docs: "https://www.gitpodcast.com/",
    supports: gitHubOnly,
    url: (c) => `https://www.gitpodcast.com/${c.owner}/${c.repo}`,
  },

  // ------------------------------------------------------------------ local CLI
  {
    id: "repomix",
    name: "Repomix",
    abbr: "RM",
    color: "#f43f5e",
    category: "cli",
    kind: "command",
    blurb: "Pack the repo into one AI-friendly file",
    docs: "https://repomix.com/",
    supports: always,
    command: (c) => `npx repomix --remote ${c.webUrl}`,
  },
  {
    id: "gitingestcli",
    name: "GitIngest CLI",
    abbr: "IC",
    color: "#6d5efc",
    category: "cli",
    kind: "command",
    blurb: "Prompt-friendly digest from your terminal",
    docs: "https://github.com/coderamp-labs/gitingest",
    supports: always,
    command: (c) => `gitingest ${c.webUrl}`,
  },
  {
    id: "code2prompt",
    name: "code2prompt",
    abbr: "2P",
    color: "#f97316",
    category: "cli",
    kind: "command",
    blurb: "Turn a local clone into a templated prompt",
    docs: "https://github.com/mufeedvh/code2prompt",
    supports: always,
    command: (c) => `git clone ${c.repoUrl} && code2prompt --path ${c.repo}`,
  },

  // ------------------------------------------------------------------ reference
  {
    id: "octotree",
    name: "Octotree",
    abbr: "OT",
    color: "#22c55e",
    category: null,
    pricing: "freemium",
    kind: "link",
    blurb: "Extension that adds an IDE file tree to GitHub",
    docs: "https://www.octotree.io/",
    defaultOff: true,
    url: () => "https://www.octotree.io/",
  },
  {
    id: "sourcetrail",
    name: "Sourcetrail",
    abbr: "SR",
    color: "#a16207",
    category: null,
    kind: "link",
    blurb: "Offline interactive source explorer (archived)",
    docs: "https://www.sourcetrail.com/",
    defaultOff: true,
    url: () => "https://www.sourcetrail.com/",
  },
];

// --------------------------------------------------------------------- helpers

/**
 * Which glyph each service uses. Kept as a table rather than a property on every
 * entry so the catalog stays about URLs and this stays about presentation.
 * Names must exist in src/icons.js — there is a test for that.
 */
const ICONS = {
  gitingest: "text-file",
  deepwikiopen: "home",
  gitmcp: "plug",
  githubgg: "chat",
  gitsummarize: "sparkle",
  gitreverse: "undo",
  gitdiagram: "nodes",
  code2flow: "flow",
  githubdev: "window",
  vscodedev: "code",
  github1s: "archive",
  gitpod: "cloud",
  stackblitz: "play",
  codeflow: "pull-request",
  bolt: "bolt",
  githistory: "clock",
  sourcegraph: "search",
  ossinsight: "chart",
  starhistory: "star",
  githubtracker: "pulse",
  forgithubcache: "database",
  threadsforgithub: "at",
  gitpodcast: "mic",
  repomix: "box",
  gitingestcli: "terminal",
  code2prompt: "target",
  octotree: "tree",
  sourcetrail: "compass",
};

for (const service of CATALOG) {
  service.icon = ICONS[service.id] ?? "link";
}

/** Hosts we can recognise so the UI can say "you are already here". */
export const SERVICE_HOSTS = {
  "gitingest.com": "gitingest",
  "gitmcp.io": "gitmcp",
  "github.gg": "githubgg",
  "gitsummarize.com": "gitsummarize",
  "gitreverse.com": "gitreverse",
  "gitdiagram.com": "gitdiagram",
  "github.dev": "githubdev",
  "vscode.dev": "vscodedev",
  "github1s.com": "github1s",
  "gitpod.io": "gitpod",
  "stackblitz.com": "stackblitz",
  "pr.new": "codeflow",
  "bolt.new": "bolt",
  "githistory.xyz": "githistory",
  "sourcegraph.com": "sourcegraph",
  "ossinsight.io": "ossinsight",
  "star-history.com": "starhistory",
  "githubtracker.com": "githubtracker",
  "gitpodcast.com": "gitpodcast",
  "repomix.com": "repomix",
};

const PLACEHOLDERS = {
  url: (c) => c.webUrl,
  webUrl: (c) => c.webUrl,
  repoUrl: (c) => c.repoUrl,
  owner: (c) => c.owner,
  repo: (c) => c.repo,
  ref: (c) => c.ref || "",
  path: (c) => c.path || "",
  tail: (c) => c.tail || "",
  ghSuffix: (c) => c.ghSuffix || "",
  pathSuffix: (c) => c.pathSuffix || "",
  ingestSuffix: (c) => c.ingestSuffix || "",
  host: (c) => c.host,
};

/** Expand `{owner}`-style placeholders in a user-supplied template. */
export function expandTemplate(template, ctx) {
  return String(template ?? "").replace(/\{(\w+)\}/g, (match, key) => {
    const fn = PLACEHOLDERS[key];
    return fn ? String(fn(ctx)) : match;
  });
}

export function initials(name) {
  const words = String(name || "")
    .replace(/[^\w\s.-]/g, " ")
    .split(/[\s.-]+/)
    .filter(Boolean);
  if (!words.length) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function slugify(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "service";
}

/** Turn a user-defined entry from settings into a normal Service. */
export function customToService(def) {
  const id = def.id?.startsWith("custom:") ? def.id : `custom:${def.id || slugify(def.name)}`;
  return {
    id,
    name: def.name || "Custom",
    abbr: def.abbr || initials(def.name),
    color: def.color || "#64748b",
    category: "custom",
    kind: "url",
    blurb: def.blurb || "Your own destination",
    custom: true,
    icon: def.icon || "sparkle",
    template: def.template || "",
    supports: always,
    url: (ctx) => expandTemplate(def.template, ctx),
  };
}

/** The full list: built-ins plus the user's own, in the order they arrived. */
export function allServices(custom = []) {
  return [...CATALOG, ...custom.map(customToService)];
}

export function findService(catalog, id) {
  return catalog.find((s) => s.id === id) || null;
}

/**
 * Build the thing a service actually points at.
 * @returns {null | {kind: "url"|"command", url?: string, command?: string}}
 */
export function buildTarget(service, ctx) {
  if (!service || !ctx) return null;
  if (service.supports && !service.supports(ctx)) return null;

  if (service.kind === "command") {
    const command = service.command?.(ctx);
    return command ? { kind: "command", command } : null;
  }

  const url = service.url?.(ctx);
  // An unresolved `{placeholder}` means we cannot honestly say where this row
  // points, so the row does not render. expandTemplate keeps the literal text on
  // purpose — a user editing a custom template needs to see their typo — but a
  // typo must not become a button that opens a 404.
  if (!url || /\{\w+\}/.test(url)) return null;
  return { kind: "url", url };
}

/**
 * Build a target straight from a raw URL string. Used by the context menu and
 * the omnibox, where there is no pre-parsed context.
 */
export function buildTargetFromUrl(service, rawUrl) {
  const ctx = parseRepoUrl(rawUrl);
  if (!ctx) return null;
  const target = buildTarget(service, ctx);
  return target ? { ctx, ...target } : null;
}
