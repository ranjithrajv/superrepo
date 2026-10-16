/**
 * GitHub URL parsing.
 *
 * Everything this extension does starts from one of these: take a repo URL, work
 * out the owner/repo, the ref, the path, and what kind of page we are on, then let
 * each service build its own target from that.
 *
 * Pure functions only — no DOM, no extension APIs — so it is unit testable.
 */

/** Second path segments that mean "this is not a directory or file view". */
const PAGES = new Set([
  "commits", "commit", "pull", "pulls", "issues", "issue", "compare", "releases",
  "release", "tags", "tag", "branches", "branch", "blame", "actions", "wiki",
  "discussions", "network", "graphs", "settings", "projects", "security", "pulse",
  "contributors", "stargazers", "forks", "watchers", "sponsors", "deployments",
  "environments", "milestones", "labels", "activity", "insights", "packages",
  "codespaces", "raw", "find", "search", "edit", "new", "archive",
]);

const SHORTHAND = /^[\w.-]+\/[\w.-]+(\/.*)?$/;
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

/**
 * Top-level paths GitHub reserves for itself. Without this, `/settings/profile`
 * and `/orgs/acme/people` would parse as repos named "profile" and "people",
 * and the in-page UI would appear where it has no business being.
 */
const RESERVED_OWNERS = new Set([
  "about", "account", "api", "apps", "blog", "codespaces", "collections",
  "contact", "dashboard", "discover", "discussions", "download", "events",
  "explore", "features", "gist", "gists", "help", "home", "join", "login",
  "logout", "marketplace", "new", "notifications", "organizations", "orgs",
  "pages", "pricing", "projects", "pulls", "search", "security", "sessions",
  "settings", "signup", "site", "sponsors", "stars", "topics", "trending",
  "users", "watching", "welcome", "workflows",
]);

/**
 * Accept whatever a human pastes: full URL, bare host path, `owner/repo`,
 * `git@host:owner/repo.git`, or a `//host/path` protocol-relative URL.
 * Returns a URL string that `new URL()` can handle, or null.
 */
export function normalizeInput(input) {
  if (input == null) return null;
  let s = String(input).trim();
  if (!s) return null;

  // Strip wrapping punctuation people pick up when copying from chat or markdown.
  s = s.replace(/^[<("'`\[]+/, "").replace(/[>)"'`\],.]+$/, "");
  if (!s) return null;

  // scp-like: git@github.com:owner/repo.git
  const scp = /^(?:[a-z0-9._-]+@)?([a-z0-9.-]+\.[a-z]{2,}):(?!\/\/)(.+)$/i.exec(s);
  if (scp && !HAS_SCHEME.test(s)) {
    return `https://${scp[1]}/${scp[2].replace(/^\/+/, "")}`;
  }

  if (s.startsWith("//")) return `https:${s}`;
  if (SHORTHAND.test(s) && !s.includes(":")) return `https://github.com/${s}`;
  if (!HAS_SCHEME.test(s)) return `https://${s}`;
  return s;
}

function decode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Parse a repository URL into the shape every service needs.
 *
 * @returns {null | {
 *   input: string, host: string, owner: string, repo: string, page: string,
 *   type: string, ref: string|null, path: string, line: number|null, tail: string,
 *   ghSuffix: string, pathSuffix: string, ingestSuffix: string,
 *   isGitHub: boolean, repoUrl: string, webUrl: string,
 *   ownerSlashRepo: string
 * }}
 */
export function parseRepoUrl(input) {
  const normalized = normalizeInput(input);
  if (!normalized) return null;

  let url;
  try {
    url = new URL(normalized);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!host.includes(".")) return null;

  const segments = url.pathname.split("/").filter(Boolean).map(decode);
  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, "");
  if (!owner || !repo) return null;
  if (host === "github.com" && RESERVED_OWNERS.has(owner.toLowerCase())) return null;

  const rest = segments.slice(2);
  const page = rest[0] || "";

  let type = "repo";
  let ref = null;
  let path = "";

  if (page === "tree" || page === "blob") {
    type = page;
    ref = rest[1] || null;
    path = rest.slice(2).join("/");
  } else if (PAGES.has(page)) {
    type = page;
  } else if (page) {
    type = "other";
  }

  const line = /^#L(\d+)/.exec(url.hash || "");
  const tail = rest.join("/");
  const isDirView = type === "tree" || type === "blob";
  /** Directory and file views keep their path; everything else drops it. */
  const pathSuffix = isDirView && tail ? `/${tail}` : "";

  const ctx = {
    input: String(input),
    host,
    owner,
    repo,
    ownerSlashRepo: `${owner}/${repo}`,
    page,
    type,
    ref,
    path,
    line: line ? Number(line[1]) : null,
    tail,
    /** Everything after owner/repo, including page segments (`/pull/12`). */
    ghSuffix: tail ? `/${tail}` : "",
    /** Only directory/file views, `''` for anything else. */
    pathSuffix,
    isGitHub: host === "github.com",
    repoUrl: `https://${host}/${owner}/${repo}`,
    webUrl: `https://${host}/${owner}/${repo}${tail ? `/${tail}` : ""}`,
  };

  ctx.ingestSuffix = ingestSuffix(ctx);
  return ctx;
}

/**
 * GitIngest takes a directory, so a file view is narrowed to the folder that
 * contains it. A repo root or branch without a path stays at the root.
 */
function ingestSuffix({ type, ref, path }) {
  if (!ref) return "";
  if (type === "tree") return `/tree/${ref}${path ? `/${path}` : ""}`;
  if (type === "blob") {
    const slash = path.lastIndexOf("/");
    const dir = slash === -1 ? "" : path.slice(0, slash);
    return `/tree/${ref}${dir ? `/${dir}` : ""}`;
  }
  return "";
}

/** Human label for the kind of page we detected, used in the popup header. */
export function describePage(ctx) {
  if (!ctx) return "";
  const bits = [];
  if (ctx.ref) bits.push(ctx.ref);
  if (ctx.path) bits.push(ctx.path);
  if (ctx.line) bits.push(`line ${ctx.line}`);
  if (bits.length) return bits.join(" · ");
  if (ctx.type !== "repo") return ctx.type;
  return "repo root";
}
