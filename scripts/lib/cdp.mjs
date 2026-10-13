/**
 * Shared headless-Chromium harness.
 *
 * Both the smoke test and the screenshot builder need the same thing: a browser
 * with the built extension loaded, attached over CDP. That plumbing lives here
 * so there is one copy of it.
 *
 * Chromium is preferred over branded Chrome, which ignores --load-extension
 * (security change in Chrome 137+). Override with CHROME=/path/to/chrome.
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const dist = join(root, "dist/chrome");

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CANDIDATES = [process.env.CHROME, "chromium", "chromium-browser", "google-chrome-stable", "google-chrome"].filter(Boolean);
export const BIN = CANDIDATES.find((bin) => spawnSync("sh", ["-c", `command -v ${bin}`], { stdio: "ignore" }).status === 0);

/** Fail loudly and early if we cannot possibly run. */
export function assertRunnable() {
  if (!existsSync(join(dist, "manifest.json"))) {
    console.error("✗ dist/chrome not built — run `npm run build` first");
    process.exit(1);
  }
  if (!BIN) {
    console.error("✗ no Chrome/Chromium found; set CHROME=/path/to/chrome");
    process.exit(1);
  }
}

// ------------------------------------------------------------------ CDP client

export class CDP {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.handlers = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id != null) {
        const entry = this.pending.get(message.id);
        if (!entry) return;
        this.pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
        return;
      }
      for (const handler of this.handlers.get(message.method) ?? []) handler(message.params);
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((ok, fail) => {
      socket.addEventListener("open", ok, { once: true });
      socket.addEventListener("error", fail, { once: true });
    });
    return new CDP(socket);
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  on(method, handler) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(handler);
  }

  async eval(expression) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description ?? "evaluation threw");
    }
    return result.result.value;
  }

  close() {
    try {
      this.socket.close();
    } catch {
      /* already gone */
    }
  }
}

// --------------------------------------------------------------------- helpers

export async function freePort() {
  return new Promise((ok, fail) => {
    const server = createServer();
    server.on("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => ok(port));
    });
  });
}

export async function devtools(port, path, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${path}`);
      if (res.ok) return res.json();
    } catch {
      /* not up yet */
    }
    await sleep(200);
  }
  throw new Error(`DevTools ${path} never came up`);
}

export async function attach(port, targetId) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = list.find((t) => t.id === targetId);
    if (target?.webSocketDebuggerUrl) return CDP.connect(target.webSocketDebuggerUrl);
    await sleep(200);
  }
  return null;
}

export async function waitFor(client, expression, timeoutMs = 15000, { quiet = false } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    try {
      const value = await client.eval(expression);
      if (value) return value;
      last = value;
    } catch (error) {
      last = error.message;
      if (!quiet) last = error.message;
    }
    await sleep(250);
  }
  return null;
}

/** Open a tab, attach, and collect page exceptions. */
export async function openTab(port, browser, url) {
  const { targetId } = await browser.send("Target.createTarget", { url });
  const client = await attach(port, targetId);
  if (!client) return null;
  const errors = [];
  client.on("Runtime.exceptionThrown", (params) =>
    errors.push(params.exceptionDetails?.exception?.description ?? "exception"),
  );
  await client.send("Runtime.enable");
  client.pageErrors = errors;
  return client;
}

/** Boot headless Chromium with the built extension loaded. */
export async function launch({ width = 1280, height = 900 } = {}) {
  let id = null;
  const port = await freePort();
  const profile = mkdtempSync(join(tmpdir(), "superepo-smoke-"));
  const chrome = spawn(
    BIN,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      `--disable-extensions-except=${dist}`,
      `--load-extension=${dist}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-gpu",
      `--window-size=${width},${height}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let stderr = "";
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const { webSocketDebuggerUrl } = await devtools(port, "/json/version");
  const browser = await CDP.connect(webSocketDebuggerUrl);
  id = await extensionId(browser);

  return {
    chrome,
    browser,
    port,
    profilePath: profile,
    serviceWorker: id,
    stderr: () => stderr,
    close() {
      browser.close();
      chrome.kill();
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

/**
 * Attach to the extension's service worker.
 *
 * The page world has no chrome.* access, so anything that needs to confirm what
 * the extension actually stored has to go through the worker — that is the only
 * context where the extension's own APIs exist.
 */
export async function attachServiceWorker(port, extensionId, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const target = list.find((t) => t.type === "service_worker" && t.url.includes(extensionId));
    if (target?.webSocketDebuggerUrl) return CDP.connect(target.webSocketDebuggerUrl);
    await sleep(200);
  }
  return null;
}

/** Wait for the extension's service worker and return its id. */
export async function extensionId(browser, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { targetInfos } = await browser.send("Target.getTargets");
    const worker = targetInfos.find((t) => t.type === "service_worker" && t.url.includes("src/background.js"));
    if (worker) {
      const id = /chrome-extension:\/\/([a-p]{32})/.exec(worker.url)?.[1];
      if (id) return id;
    }
    await sleep(300);
  }
  return null;
}