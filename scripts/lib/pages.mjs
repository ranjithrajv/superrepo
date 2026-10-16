/**
 * Page templates shared by the dev preview (`npm run preview`) and the hosted
 * demo (`npm run demo` → `site/demo/`).
 *
 * Both draw the same GitHub-shaped page, because the point of the demo is that
 * it is the preview, hosted. Keeping the markup here means the two cannot drift.
 */

export const DEFAULT_REPO = "https://github.com/octocat/hello-world";

export const PRESETS = [
  ["Repo root", "https://github.com/octocat/hello-world"],
  ["File in a folder", "https://github.com/coderamp-labs/gitingest/blob/main/src/gitingest/utils"],
  ["GitLab", "https://gitlab.com/group/project"],
  ["Not a repo", "https://github.com/settings/profile"],
];

export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function repoParts(repo) {
  const parsed = new URL(repo.includes("://") ? repo : `https://github.com/${repo}`);
  const [, owner = "octocat", name = "hello-world"] = parsed.pathname.split("/");
  return { owner, name };
}

/** The mark, inline so the mock pages need no extra request and no icon build. */
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E" +
  "%3Crect width='32' height='32' rx='8' fill='%235b6cff'/%3E%3Ctext x='16' y='22' " +
  "font-family='system-ui' font-size='18' font-weight='700' fill='white' text-anchor='middle'%3ES%3C/text%3E%3C/svg%3E";

/** The shared chrome: same tokens, same dark dev bar, light/dark aware. */
export const shell = (title, body, extraHead = "") => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="${FAVICON}"><title>${title}</title>
<style>
  :root { color-scheme: light dark; --border: #d1d9e0; --muted: #59636e; --bg: #fbfbfc; --fg: #1f2328; --surface: #fff; }
  @media (prefers-color-scheme: dark) {
    :root { --border: #3d444d; --muted: #9198a1; --bg: #0d1117; --fg: #f0f6fc; --surface: #151b23; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--fg); }
  .devbar { display: flex; gap: 8px; align-items: center; padding: 10px 16px; background: #1f2328; color: #fff; font-size: 12px; flex-wrap: wrap; }
  .devbar input { flex: 1; min-width: 220px; max-width: 620px; padding: 5px 8px; border-radius: 6px; border: 1px solid #444c56; background: #0d1117; color: #f0f6fc; font: inherit; }
  .devbar button { padding: 5px 12px; border: 0; border-radius: 6px; background: #5b6cff; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
  .devbar span { color: #9198a1; }
  .devbar a { color: #8ea1ff; }
</style>${extraHead}</head><body>${body}</body></html>`;

/**
 * The GitHub-shaped header and repo body — the part the injected UI lands in.
 * `#repo-owner` / `#repo-name` carry ids so a page can re-render them for a
 * different simulated repo without rebuilding the markup.
 */
export function githubBody({ owner, name, bar = "", footer = "", scripts = [] }) {
  const btn = 'style="font:600 12px/20px inherit;padding:5px 12px;border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--fg)"';
  return `${bar}
    <header style="background:var(--surface);border-bottom:1px solid var(--border)">
      <div style="max-width:1180px;margin:0 auto;padding:16px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
          <span style="color:var(--muted)" id="repo-owner">${owner}</span>
          <span style="color:var(--muted)">/</span>
          <strong style="font-size:20px" id="repo-name">${name}</strong>
          <span style="border:1px solid var(--border);border-radius:999px;padding:1px 8px;font-size:12px;color:var(--muted)">Public</span>
        </div>

        <ul data-testid="repo-header-actions" style="display:flex;align-items:center;gap:8px;list-style:none;margin:0;padding:0;flex-wrap:wrap">
          <li><button ${btn}>Notifications</button></li>
          <li><button ${btn}>Fork 7.1k</button></li>
          <li><button ${btn}>Star 3.8k</button></li>
        </ul>

        <nav style="display:flex;gap:18px;margin-top:16px;border-bottom:1px solid var(--border);padding-bottom:8px;font-size:13px;color:var(--muted);overflow-x:auto">
          <span style="font-weight:600;color:var(--fg);border-bottom:2px solid #fd8c73;padding-bottom:8px">Code</span>
          <span>Issues</span><span>Pull requests</span><span>Actions</span><span>Projects</span><span>Wiki</span><span>Security and quality</span><span>Insights</span>
        </nav>
      </div>
    </header>

    <main style="max-width:1180px;margin:0 auto;padding:20px">
      <div style="border:1px solid var(--border);border-radius:8px;background:var(--surface)">
        <div style="padding:12px 16px;border-bottom:1px solid var(--border);color:var(--muted);font-size:13px">
          This page exists so the injected UI can be seen in context. Nothing here is GitHub.
        </div>
        <div style="padding:10px 16px;font-size:13px;color:var(--muted)">README.md · update line at end of file</div>
        <div style="padding:10px 16px;font-size:13px;color:var(--muted)">hello-world.txt · first commit</div>
      </div>
    </main>
    ${footer}
    ${scripts.map((s) => `<script src="${s}"></script>`).join("\n    ")}`;
}

/** Dev preview page: a bare mock GitHub page, shim and modules from the repo root. */
export function mockGitHubHtml(repo) {
  const { owner, name } = repoParts(repo);
  return shell(
    `${owner}/${name} · SuperRepo preview`,
    githubBody({
      owner,
      name,
      bar: `<div class="devbar">
      <strong>mock github.com</strong>
      <span>the buttons below are injected by src/content.js — open <strong>More</strong></span>
    </div>`,
      scripts: ["/scripts/preview-shim.js", "/src/content-styles.js", "/src/content.js"],
    }),
  );
}

/**
 * Public hosted demo. Everything is relative because it is served from the
 * `/demo/` subpath; the module base is declared before the shim runs.
 */
export function demoPageHtml(repo) {
  const { owner, name } = repoParts(repo);
  const head = `<meta name="description" content="SuperRepo live demo — a mock GitHub page with the real in-page UI, no install.">
    <script>globalThis.__SUPERREPO_MODULE_BASE__ = "./src/"; globalThis.__SUPERREPO_OPTIONS_URL__ = "./src/options.html";</script>`;
  const bar = `<div class="devbar">
      <strong>SuperRepo</strong>
      <span>live demo — a mock GitHub page; the buttons are the real extension code</span>
      <input value="${esc(repo)}" spellcheck="false" aria-label="Repository URL to simulate" id="u">
      <button onclick="load()">Load</button>
    </div>
    <div class="devbar" style="background:#0d1117">
      ${PRESETS.map(([label, url]) => `<button class="preset" data-url="${esc(url)}">${label}</button>`).join("")}
      <span id="preset-hint">“File in a folder” narrows GitIngest to the containing folder · “GitLab” drops the GitHub-only rows · “Not a repo” injects nothing</span>
    </div>`;
  const footer = `<div class="devbar" style="background:#0d1117">
      <span>Demo only — the real extension draws these buttons in your own GitHub header.
      <a href="../">Back to the site</a> · <a href="https://github.com/ranjithrajv/superrepo">Source</a> · not affiliated with GitHub.</span>
    </div>
    <script>
      const DEFAULT_REPO = ${JSON.stringify(DEFAULT_REPO)};
      function simulatedRepo() {
        return new URLSearchParams(location.search).get("u") || DEFAULT_REPO;
      }
      function load() { location.search = "?u=" + encodeURIComponent(document.getElementById("u").value); }
      document.getElementById("u").addEventListener("keydown", (e) => { if (e.key === "Enter") load(); });
      document.querySelectorAll(".preset").forEach((b) =>
        b.addEventListener("click", () => { document.getElementById("u").value = b.dataset.url; load(); }));
      const current = simulatedRepo();
      document.getElementById("u").value = current;
      try {
        const parsed = new URL(current.includes("://") ? current : "https://github.com/" + current);
        const [, owner = "octocat", name = "hello-world"] = parsed.pathname.split("/");
        document.getElementById("repo-owner").textContent = owner;
        document.getElementById("repo-name").textContent = name;
      } catch {}
    </script>`;
  return shell(
    `${owner}/${name} · SuperRepo live demo`,
    githubBody({
      owner,
      name,
      bar,
      footer,
      scripts: ["./src/shim.js", "./src/content-styles.js", "./src/content.js"],
    }),
    head,
  );
}
