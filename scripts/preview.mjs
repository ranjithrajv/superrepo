#!/usr/bin/env node
/**
 * Live preview server.
 *
 * Serves a mock GitHub repo page with the REAL content script loaded into it, so
 * the in-page UI can be developed and demonstrated in a normal tab with no
 * extension installed. The options page is served the same way.
 *
 *   npm run preview            # http://127.0.0.1:4173
 *   PORT=8080 npm run preview
 *
 * scripts/preview-shim.js stubs only the browser APIs; parsing, the catalog and
 * the payload builder are the shipping modules, imported from /src.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_REPO, PRESETS, esc, shell, mockGitHubHtml } from "./lib/pages.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const shim = await readFile(join(root, "scripts/preview-shim.js"), "utf8");
const port = Number(process.env.PORT || 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  const path = decodeURIComponent(url.pathname);
  const repo = url.searchParams.get("u") || DEFAULT_REPO;

  const send = (body, type) => {
    response.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    response.end(body);
  };

  if (path === "/" || path === "/index.html") return send(indexHtml(repo), TYPES[".html"]);
  if (path === "/mock-github.html") return send(mockGitHubHtml(repo), TYPES[".html"]);
  if (path === "/glyphs") return send(glyphSheetHtml(), TYPES[".html"]);

  // Only ever serve files from inside the repository.
  const target = resolve(join(root, normalize(path).replace(/^(\.\.[/\\])+/, "")));
  if (!target.startsWith(root)) {
    response.writeHead(403).end("forbidden");
    return;
  }

  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      response.writeHead(404).end("not found");
      return;
    }

    const type = TYPES[extname(target)] ?? "application/octet-stream";
    let body = await readFile(target);

    // The options page needs the shim too; it is a classic script, so it runs
    // before the module that the page loads.
    if (path.endsWith("options.html")) {
      body = Buffer.from(String(body).replace(/<head>/, `<head>\n    <script src="/scripts/preview-shim.js"></script>`));
    }

    send(body, type);
  } catch {
    response.writeHead(404).end("not found");
  }
});

function indexHtml(repo) {
  const presets = PRESETS;
  return shell(
    "SuperRepo — live preview",
    `<div class="devbar">
      <strong>SuperRepo preview</strong>
      <span>simulated repo</span>
      <input value="${esc(repo)}" spellcheck="false" aria-label="Simulated repository URL" id="u">
      <button onclick="load()">Load</button>
      <span>real content script on a mock GitHub page</span>
    </div>
    <div class="devbar" style="background:#0d1117">
      ${presets.map(([label, url]) => `<button class="preset" data-url="${esc(url)}">${label}</button>`).join("")}
      <span>“File in a folder” narrows GitIngest to <code>src/gitingest</code> · “GitLab” drops the GitHub-only rows · “Not a repo” injects nothing</span>
    </div>
    <div style="display:flex;gap:18px;padding:18px;align-items:flex-start;flex-wrap:wrap">
      <iframe id="mock" src="/mock-github.html?u=${encodeURIComponent(repo)}" width="820" height="700"
              style="border:1px solid var(--border);border-radius:12px;background:var(--surface)"></iframe>
      <iframe src="/src/options.html" width="720" height="700"
              style="border:1px solid var(--border);border-radius:12px;background:var(--surface)"></iframe>
    </div>
    <script>
      function load() {
        const u = document.getElementById('u').value;
        document.getElementById('mock').src = '/mock-github.html?u=' + encodeURIComponent(u);
      }
      document.getElementById('u').addEventListener('keydown', (e) => { if (e.key === 'Enter') load(); });
      document.querySelectorAll('.preset').forEach((b) =>
        b.addEventListener('click', () => { document.getElementById('u').value = b.dataset.url; load(); }));
    </script>`,
  );
}

/** Contact sheet: every glyph, and every service's button, at real sizes. */
function glyphSheetHtml() {
  return shell(
    "SuperRepo — glyphs",
    `<div class="devbar"><strong>glyph contact sheet</strong>
      <span>button 18px · row 16px · big 32px — check nothing reads as a blob</span></div>
    <main style="max-width:1180px;margin:0 auto;padding:20px">
      <h2 style="font-size:14px">Buttons, as injected (18px on a 32px button)</h2>
      <div id="buttons" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:8px"></div>
      <div id="names" style="display:flex;flex-wrap:wrap;gap:8px;font-size:11px;color:var(--muted)"></div>

      <h2 style="font-size:14px;margin-top:28px">Every glyph</h2>
      <div id="all" style="display:flex;flex-wrap:wrap;gap:14px;align-items:center"></div>
    </main>
    <script type="module">
      import { GLYPHS, glyphMarkup } from "/src/icons.js";
      import { CATALOG } from "/src/catalog.js";

      const buttons = document.getElementById("buttons");
      const names = document.getElementById("names");
      const colors = ["#6d5efc","#0ea5e9","#2563eb","#8b5cf6","#f97316","#10b981","#ef4444","#7c3aed","#a16207","#3b82f6","#1e40af","#f59e0b","#1389fd","#151515","#06b6d4","#eab308","#ec4899","#dc2626","#14b8a6","#8b5cf6","#64748b","#a855f7","#f43f5e","#f97316","#22c55e","#a16207"];

      CATALOG.forEach((service, i) => {
        const color = colors[i % colors.length];
        const button = document.createElement("button");
        button.className = "gp-btn";
        button.title = service.name;
        button.innerHTML = '<span class="gp-glyph" style="--c:' + color + '">' + glyphMarkup(service.icon) + "</span>";
        buttons.append(button);

        const label = document.createElement("span");
        label.style.width = "104px";
        label.textContent = service.icon;
        names.append(label);
      });

      const all = document.getElementById("all");
      for (const name of Object.keys(GLYPHS)) {
        const cell = document.createElement("div");
        cell.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;color:var(--muted)";
        for (const size of [16, 24, 32]) {
          const wrap = document.createElement("span");
          wrap.className = "gp-glyph";
          wrap.style.setProperty("--c", "#5b6cff");
          wrap.style.width = wrap.style.height = size + "px";
          wrap.innerHTML = glyphMarkup(name);
          wrap.querySelector("svg").setAttribute("width", size);
          wrap.querySelector("svg").setAttribute("height", size);
          cell.append(wrap);
        }
        const label = document.createElement("span");
        label.textContent = name;
        cell.append(label);
        all.append(cell);
      }
    </script>
    <style>
      .gp-btn { width: 32px; height: 32px; display: grid; place-items: center; cursor: default;
                background: var(--surface); border: 1px solid var(--border); border-radius: 6px; }
      .gp-glyph { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px;
                  color: color-mix(in srgb, var(--c) 80%, var(--fg)); }
      .gp-glyph svg { display: block; }
    </style>`,
  );
}

server.listen(port, "127.0.0.1", () => {
  console.log(`SuperRepo live preview → http://127.0.0.1:${port}`);
  console.log("  mock repo page  /mock-github.html?u=<repo url>");
  console.log("  options page    /src/options.html");
  console.log("Ctrl-C to stop.");
});
