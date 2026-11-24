#!/usr/bin/env node
// "Pages must hold still" jank & static dvh-trap checker.
//
// Inspired by PaulKinlan/html-in-canvas-demos, built on the repo's raw-CDP
// client (scripts/lib/cdp.mjs) with zero Playwright dependency.
//
// Checks two complementary layers:
//   1. Static CSS/HTML scan (`scanDvhTraps`): flags `dvh` height/min-height/
//      max-height/block-size declarations that make mobile stages and canvases
//      resize when the browser URL bar hides or shows (recommending `svh`).
//   2. Runtime CDP probe (`probePageJank`): emulates a constrained mobile phone
//      (412x915, DPR 2.625, touch, 4x CPU throttle), injects a layout-shift
//      PerformanceObserver before navigation, loads the page untouched,
//      measures CLS, unexpected scroll, focus hijack, uncaught page errors,
//      console errors, blank/lost-context canvases, and simulates mobile
//      URL-bar collapse/expand (915 -> 845 -> 915) to measure URL-bar CLS.
//
// Usage:
//   node scripts/check-jank.mjs <id-or-path...>
//   node scripts/check-jank.mjs --milestone v<N> [--concepts]
//   node scripts/check-jank.mjs --sample <n> [--concepts]
//   node scripts/check-jank.mjs --static-only [path...]
//   node scripts/check-jank.mjs --base <url> --no-server <id-or-path...>
//   node scripts/check-jank.mjs --json <out> --timeout-ms <ms> ...

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, extname, join, relative, resolve } from "node:path";
import process from "node:process";
import { cdpConnection, cleanupChrome, launchChrome, spawnChild } from "./lib/cdp.mjs";
import { buildFromDisk, REPO_ROOT } from "./lib/manifest.mjs";

export const PHONE_METRICS = {
  width: 412,
  height: 915,
  deviceScaleFactor: 2.625,
  mobile: true,
};

export const URL_BAR_COLLAPSED_HEIGHT = 845;
export const CPU_THROTTLE_RATE = 4;

export const DEFAULT_THRESHOLDS = {
  maxCls: 0.01,
  maxUrlBarCls: 0.02,
  maxScrollX: 0,
  maxScrollY: 0,
  allowFocusMove: false,
  maxPageErrors: 0,
  maxConsoleErrors: 0,
  maxBlankCanvases: 0,
  maxDvhTraps: 0,
};

const DVH_ADVICE =
  "Replace dvh with svh (e.g. 100svh) so mobile URL-bar hide/show does not resize or jank " +
  "stages and canvases.";

const DVH_DECL_RE = new RegExp(
  "(?<![-\\w])(?:min-|max-)?(?:height|block-size)\\s*:\\s*[^;{}]*?" +
    "(?:\\d+\\.\\d+|\\.\\d+|\\d+)dvh\\b[^;{}]*",
  "gi",
);

function keepNewlines(str) {
  return str.replace(/[^\n]/g, " ");
}

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

function scanCssChunk(cssText, startLine, filename) {
  const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, keepNewlines);
  const findings = [];
  DVH_DECL_RE.lastIndex = 0;
  let match;
  while ((match = DVH_DECL_RE.exec(withoutComments)) !== null) {
    findings.push({
      file: filename,
      line: startLine + lineAt(withoutComments, match.index) - 1,
      match: match[0].replace(/\s+/g, " ").trim(),
      advice: DVH_ADVICE,
    });
  }
  return findings;
}

/**
 * Statically scan HTML or CSS source for `dvh` height/min-height/max-height/
 * block-size declarations that cause jank on mobile URL-bar collapse/expand.
 * Ignores `svh`/`lvh`/`vh`, CSS comments, HTML comments, prose, `<script>`,
 * `<pre>`, `<code>`, and `<textarea>` blocks.
 *
 * @param {string} htmlOrCss
 * @param {string} [filename="<input>"]
 * @returns {{ file: string, line: number, match: string, advice: string }[]}
 */
export function scanDvhTraps(htmlOrCss, filename = "<input>") {
  const source = String(htmlOrCss ?? "");
  const ext = extname(filename).toLowerCase();
  const isCss = ext === ".css";
  const isHtml = ext === ".html" || ext === ".htm" ||
    (!isCss && /<(?:!doctype|!--|[a-z][a-z0-9-]*[\s/>])/i.test(source));

  if (!isHtml) {
    return scanCssChunk(source, 1, filename);
  }

  let masked = source.replace(/<!--[\s\S]*?-->/g, keepNewlines);
  for (const tag of ["script", "pre", "code", "textarea"]) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    masked = masked.replace(re, keepNewlines);
  }

  const findings = [];

  // 1. Scan <style> blocks with exact line offsets.
  const styleRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch;
  while ((styleMatch = styleRe.exec(masked)) !== null) {
    const openEnd = styleMatch[0].indexOf(">") + 1;
    const bodyStart = styleMatch.index + openEnd;
    findings.push(...scanCssChunk(styleMatch[1], lineAt(masked, bodyStart), filename));
  }

  // 2. Scan inline style="..." / style='...' attributes outside <style> blocks.
  const withoutStyles = masked.replace(styleRe, keepNewlines);
  const tagRe = /<[a-z][a-z0-9-]*\b[^>]*>/gi;
  let tagMatch;
  while ((tagMatch = tagRe.exec(withoutStyles)) !== null) {
    const tagText = tagMatch[0];
    const attrRe = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    let attrMatch;
    while ((attrMatch = attrRe.exec(tagText)) !== null) {
      const cssValue = attrMatch[1] ?? attrMatch[2] ?? "";
      const valStart = tagMatch.index + attrMatch.index + attrMatch[0].indexOf(cssValue);
      findings.push(...scanCssChunk(cssValue, lineAt(withoutStyles, valStart), filename));
    }
  }

  findings.sort((a, b) => a.line - b.line);
  return findings;
}

function countOf(value) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

/**
 * Evaluate a measured page jank run against thresholds.
 *
 * @param {object} metrics
 * @param {object} [thresholds]
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function evaluateJankMetrics(metrics, thresholds = {}) {
  const m = metrics ?? {};
  const t = { ...DEFAULT_THRESHOLDS, ...thresholds };
  const reasons = [];

  const cls = Number(m.cls ?? 0);
  if (Number.isFinite(cls) && cls > t.maxCls) {
    reasons.push(`CLS ${cls.toFixed(4)} exceeds threshold ${t.maxCls}`);
  }

  const urlBarCls = Number(m.urlBarCls ?? 0);
  if (Number.isFinite(urlBarCls) && urlBarCls > t.maxUrlBarCls) {
    reasons.push(
      `URL-bar resize CLS delta ${urlBarCls.toFixed(4)} exceeds threshold ${t.maxUrlBarCls}`,
    );
  }

  const scrollX = Number(m.scrollX ?? 0);
  const scrollY = Number(m.scrollY ?? 0);
  if (Math.abs(scrollX) > t.maxScrollX || Math.abs(scrollY) > t.maxScrollY) {
    reasons.push(`unexpected scroll on load (scrollX=${scrollX}, scrollY=${scrollY})`);
  }

  if (!t.allowFocusMove && Boolean(m.focusMoved)) {
    const tag = m.activeTag ? String(m.activeTag) : "unknown";
    reasons.push(`unexpected focus hijack on load (activeElement=${tag})`);
  }

  const pageErrorCount = countOf(m.pageErrors);
  if (pageErrorCount > t.maxPageErrors) {
    const first = Array.isArray(m.pageErrors) && m.pageErrors.length
      ? `: ${String(m.pageErrors[0]).slice(0, 120)}`
      : "";
    reasons.push(`${pageErrorCount} uncaught page error(s)${first}`);
  }

  const consoleErrorCount = countOf(m.consoleErrors);
  if (consoleErrorCount > t.maxConsoleErrors) {
    const first = Array.isArray(m.consoleErrors) && m.consoleErrors.length
      ? `: ${String(m.consoleErrors[0]).slice(0, 120)}`
      : "";
    reasons.push(`${consoleErrorCount} console error(s)${first}`);
  }

  const blankCanvasCount = countOf(m.blankCanvases);
  if (blankCanvasCount > t.maxBlankCanvases) {
    reasons.push(`${blankCanvasCount} blank or lost-context canvas(es)`);
  }

  const dvhTrapCount = countOf(m.dvhTraps);
  if (dvhTrapCount > t.maxDvhTraps) {
    const first = Array.isArray(m.dvhTraps) && m.dvhTraps.length
      ? ` (${m.dvhTraps[0].file}:${m.dvhTraps[0].line} ${m.dvhTraps[0].match})`
      : "";
    reasons.push(`${dvhTrapCount} dvh height trap(s)${first}`);
  }

  return { ok: reasons.length === 0, reasons };
}

// ── pre-navigation & runtime CDP probe scripts ────────────────────────────────

const PRE_NAV_OBSERVER_SCRIPT = `(() => {
  if (window.__jankProbe) return;
  const state = { cls: 0, shifts: [], contexts: new WeakMap(), observer: null };
  window.__jankProbe = state;
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        state.cls += entry.value;
        state.shifts.push({ value: entry.value, startTime: entry.startTime });
      }
    });
    po.observe({ type: "layout-shift", buffered: true });
    state.observer = po;
  } catch {
    // layout-shift observer not supported
  }
  try {
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args) {
      const ctx = origGetContext.apply(this, args);
      if (ctx) state.contexts.set(this, ctx);
      return ctx;
    };
  } catch {
    // prototype frozen or unavailable
  }
})();`;

const READ_METRICS_SCRIPT = `(() => {
  const state = window.__jankProbe ?? { cls: 0, shifts: [], contexts: new WeakMap() };
  if (state.observer && typeof state.observer.takeRecords === "function") {
    for (const entry of state.observer.takeRecords()) {
      if (entry.hadRecentInput) continue;
      state.cls += entry.value;
      state.shifts.push({ value: entry.value, startTime: entry.startTime });
    }
  }
  const active = document.activeElement;
  const activeTag = active ? String(active.tagName || "").toUpperCase() : "";
  const focusMoved = Boolean(active && activeTag !== "BODY" && activeTag !== "HTML");

  const blankCanvases = [];
  for (const canvas of document.querySelectorAll("canvas")) {
    let visible = true;
    if (typeof canvas.checkVisibility === "function") {
      visible = canvas.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    } else {
      const style = getComputedStyle(canvas);
      visible = style.display !== "none" && style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 && !canvas.closest("[hidden], details:not([open])");
    }
    if (!visible) continue;
    const rect = canvas.getBoundingClientRect();
    const zeroRect = rect.width === 0 || rect.height === 0;
    const zeroBuffer = canvas.width === 0 || canvas.height === 0;
    const ctx = state.contexts?.get(canvas);
    let contextLost = false;
    if (ctx && typeof ctx.isContextLost === "function") {
      try {
        contextLost = Boolean(ctx.isContextLost());
      } catch {
        contextLost = false;
      }
    }
    if (zeroRect || zeroBuffer || contextLost) {
      blankCanvases.push({
        id: canvas.id || null,
        width: canvas.width,
        height: canvas.height,
        rectWidth: Math.round(rect.width),
        rectHeight: Math.round(rect.height),
        contextLost,
      });
    }
  }

  return {
    cls: Number(state.cls.toFixed(6)),
    scrollX: Math.round(window.scrollX),
    scrollY: Math.round(window.scrollY),
    focusMoved,
    activeTag,
    blankCanvases,
  };
})();`;

const READ_CLS_ONLY_SCRIPT = `(() => {
  const state = window.__jankProbe ?? { cls: 0 };
  if (state.observer && typeof state.observer.takeRecords === "function") {
    for (const entry of state.observer.takeRecords()) {
      if (entry.hadRecentInput) continue;
      state.cls += entry.value;
    }
  }
  return Number(state.cls.toFixed(6));
})();`;

const WAIT_TWO_FRAMES_SCRIPT = `new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)));
})`;

function withBudget(promise, ms, label) {
  promise.catch(() => {});
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} did not answer within ${ms}ms`)), ms);
    }),
  ]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── local server boot (mirrors scripts/responsive-check.mjs) ─────────────────

function portIsFree(port) {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", (e) => (e.code === "EADDRINUSE" ? resolve(false) : reject(e)));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });
}

async function findFreePort() {
  for (let i = 0; i < 64; i++) {
    const port = 3400 + Math.floor(Math.random() * 600);
    if (await portIsFree(port)) return port;
  }
  throw new Error("no free port found in 3400-3999 after 64 attempts");
}

async function assertServingThisTree(base, probeRoute) {
  const probe = `${base}${probeRoute}`;
  let status = "no response";
  try {
    const r = await fetch(probe, { signal: AbortSignal.timeout(5000) });
    await r.body?.cancel();
    if (r.ok) return;
    status = `HTTP ${r.status}`;
  } catch (e) {
    status = e?.message ?? String(e);
  }
  throw new Error(
    `${base} is not serving this working tree (${probe} -> ${status}).\n` +
      `  Start a server from THIS worktree and pass --base http://localhost:<port> --no-server.`,
  );
}

async function bootServer({ explicitBase, noServer, probeRoute }) {
  let base = explicitBase ?? "http://localhost:3000";
  if (noServer) {
    await assertServingThisTree(base, probeRoute);
    return { base, serverChild: null };
  }
  const requested = explicitBase ? Number(new URL(base).port) || 3000 : null;
  if (requested !== null && !(await portIsFree(requested))) {
    throw new Error(
      `port ${requested} is already in use.\n` +
        `  Free the port, omit --base to get a free one automatically, or pass ` +
        `--base http://localhost:${requested} --no-server.`,
    );
  }
  const port = requested ?? await findFreePort();
  base = `http://localhost:${port}`;
  const serverChild = spawnChild(process.execPath, ["server.ts"], {
    cwd: REPO_ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "ignore", "ignore"],
  });
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${base}/`, { signal: AbortSignal.timeout(1000) });
      await r.body?.cancel();
      if (r.ok) {
        try {
          await assertServingThisTree(base, probeRoute);
          return { base, serverChild };
        } catch (err) {
          killServer(serverChild);
          throw err;
        }
      }
    } catch (e) {
      if (e.message && e.message.includes("is not serving this working tree")) throw e;
    }
    await sleep(500);
  }
  killServer(serverChild);
  throw new Error(`local server on port ${port} did not become ready`);
}

function killServer(serverChild) {
  if (!serverChild) return;
  try {
    serverChild.kill("SIGKILL");
  } catch {
    // already exited
  }
}

// ── filesystem helpers ───────────────────────────────────────────────────────

function formatDisplayPath(filePath) {
  const rel = relative(REPO_ROOT, filePath);
  return rel && !rel.startsWith("..") ? rel : filePath;
}

function isStaticTargetFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  return ext === ".html" || ext === ".htm" || ext === ".css";
}

function collectStaticFiles(targetPath, out = []) {
  let full = resolve(targetPath);
  if (!existsSync(full)) {
    const stripped = String(targetPath).replace(/^\/+/, "");
    const fromRoot = resolve(REPO_ROOT, stripped);
    if (existsSync(fromRoot)) full = fromRoot;
  }
  const st = statSync(full);
  if (st.isFile()) {
    if (isStaticTargetFile(full)) out.push(full);
    return out;
  }
  if (!st.isDirectory()) return out;
  for (const entry of readdirSync(full, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const child = join(full, entry.name);
    if (entry.isDirectory()) {
      collectStaticFiles(child, out);
    } else if (isStaticTargetFile(child)) {
      out.push(child);
    }
  }
  return out;
}

function listReleaseDirs() {
  const dirs = [];
  for (const entry of readdirSync(REPO_ROOT, { withFileTypes: true })) {
    if (entry.isDirectory() && /^v\d+$/.test(entry.name)) {
      dirs.push(join(REPO_ROOT, entry.name));
    }
  }
  return dirs.sort();
}

function scanRouteDvhTraps(route) {
  const relDir = route.replace(/^\/+|\/+$/g, "");
  if (!relDir) return [];
  const dir = join(REPO_ROOT, relDir);
  if (!existsSync(dir)) return [];
  let st;
  try {
    st = statSync(dir);
  } catch {
    return [];
  }
  if (!st.isDirectory()) return [];
  const traps = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const lower = entry.name.toLowerCase();
    if (lower !== "index.html" && !lower.endsWith(".css")) continue;
    const full = join(dir, entry.name);
    traps.push(...scanDvhTraps(readFileSync(full, "utf8"), formatDisplayPath(full)));
  }
  return traps;
}

// ── CDP page jank probe ──────────────────────────────────────────────────────

export async function probePageJank(conn, url, { route = "", perPageMs = 12000 } = {}) {
  const pageErrors = [];
  const consoleErrors = [];
  const dvhTraps = route ? scanRouteDvhTraps(route) : [];

  let targetId = null;
  let sessionId = null;
  const disposers = [];

  try {
    const created = await withBudget(
      conn.send("Target.createTarget", { url: "about:blank" }),
      perPageMs,
      "Target.createTarget",
    );
    targetId = created.targetId;
    const attached = await withBudget(
      conn.send("Target.attachToTarget", { targetId, flatten: true }),
      perPageMs,
      "Target.attachToTarget",
    );
    sessionId = attached.sessionId;

    await conn.send("Page.enable", {}, sessionId);
    await conn.send("Runtime.enable", {}, sessionId);
    await conn.send("Emulation.setDeviceMetricsOverride", PHONE_METRICS, sessionId);
    await conn.send(
      "Emulation.setTouchEmulationEnabled",
      { enabled: true, maxTouchPoints: 5 },
      sessionId,
    ).catch(() => {});
    await conn.send(
      "Emulation.setCPUThrottlingRate",
      { rate: CPU_THROTTLE_RATE },
      sessionId,
    ).catch(() => {});
    await conn.send(
      "Page.addScriptToEvaluateOnNewDocument",
      { source: PRE_NAV_OBSERVER_SCRIPT },
      sessionId,
    );

    disposers.push(
      conn.onEvent((msg) => {
        if (msg.sessionId !== sessionId) return;
        if (msg.method === "Runtime.exceptionThrown") {
          const ex = msg.params?.exceptionDetails;
          pageErrors.push(ex?.exception?.description ?? ex?.text ?? "uncaught exception");
        } else if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
          const text = (msg.params.args ?? [])
            .map((a) => a.value ?? a.description ?? "")
            .join(" ")
            .trim();
          if (text) consoleErrors.push(text);
        }
      }),
    );

    const loaded = new Promise((resolveLoad) => {
      const dispose = conn.onEvent((msg) => {
        if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
          dispose();
          resolveLoad();
        }
      });
      disposers.push(dispose);
    });

    const nav = await withBudget(
      conn.send("Page.navigate", { url }, sessionId),
      perPageMs,
      "Page.navigate",
    );
    if (nav.errorText) {
      return {
        route,
        url,
        status: "blocked",
        ok: false,
        reasons: [`navigation failed: ${nav.errorText}`],
        metrics: null,
      };
    }

    await Promise.race([loaded, sleep(Math.min(perPageMs, 8000))]);
    await sleep(1200);

    const settledEval = await withBudget(
      conn.send(
        "Runtime.evaluate",
        { expression: READ_METRICS_SCRIPT, returnByValue: true },
        sessionId,
      ),
      perPageMs,
      "settled metrics probe",
    );
    const settled = settledEval.result?.value ?? {
      cls: 0,
      scrollX: 0,
      scrollY: 0,
      focusMoved: false,
      activeTag: "",
      blankCanvases: [],
    };

    // Simulate mobile URL-bar collapse (915 -> 845) then expand (845 -> 915).
    await conn.send(
      "Emulation.setDeviceMetricsOverride",
      { ...PHONE_METRICS, height: URL_BAR_COLLAPSED_HEIGHT },
      sessionId,
    );
    await withBudget(
      conn.send(
        "Runtime.evaluate",
        { expression: WAIT_TWO_FRAMES_SCRIPT, awaitPromise: true, returnByValue: true },
        sessionId,
      ),
      perPageMs,
      "url-bar collapse settle",
    ).catch(() => {});
    await sleep(250);

    await conn.send("Emulation.setDeviceMetricsOverride", PHONE_METRICS, sessionId);
    await withBudget(
      conn.send(
        "Runtime.evaluate",
        { expression: WAIT_TWO_FRAMES_SCRIPT, awaitPromise: true, returnByValue: true },
        sessionId,
      ),
      perPageMs,
      "url-bar expand settle",
    ).catch(() => {});
    await sleep(250);

    const afterEval = await withBudget(
      conn.send(
        "Runtime.evaluate",
        { expression: READ_CLS_ONLY_SCRIPT, returnByValue: true },
        sessionId,
      ),
      perPageMs,
      "post-resize CLS probe",
    );
    const afterCls = Number(afterEval.result?.value ?? settled.cls);
    const urlBarCls = Number(Math.max(0, afterCls - settled.cls).toFixed(6));

    const metrics = {
      cls: settled.cls,
      scrollX: settled.scrollX,
      scrollY: settled.scrollY,
      focusMoved: settled.focusMoved,
      activeTag: settled.activeTag,
      urlBarCls,
      pageErrors: pageErrors.slice(0, 10),
      consoleErrors: consoleErrors.slice(0, 10),
      blankCanvases: settled.blankCanvases,
      dvhTraps,
    };
    const verdict = evaluateJankMetrics(metrics);
    return {
      route,
      url,
      status: verdict.ok ? "pass" : "fail",
      ok: verdict.ok,
      reasons: verdict.reasons,
      metrics,
    };
  } catch (e) {
    return {
      route,
      url,
      status: "blocked",
      ok: false,
      reasons: [`harness error: ${e.message}`],
      metrics: null,
    };
  } finally {
    for (const dispose of disposers) dispose();
    if (targetId) {
      await conn.send("Target.closeTarget", { targetId }).catch(() => {});
    }
  }
}

// ── CLI argument parsing & target resolution ─────────────────────────────────

function parseArgs(argv) {
  const rest = [...argv];
  function takeFlag(name, { boolean = false } = {}) {
    const i = rest.indexOf(name);
    if (i < 0) return null;
    if (boolean) {
      rest.splice(i, 1);
      return true;
    }
    const val = rest[i + 1];
    const hasVal = val !== undefined && !val.startsWith("--");
    rest.splice(i, hasVal ? 2 : 1);
    return hasVal ? val : null;
  }

  const help = Boolean(takeFlag("--help", { boolean: true }) || takeFlag("-h", { boolean: true }));
  const staticOnly = Boolean(takeFlag("--static-only", { boolean: true }));
  const includeConcepts = Boolean(takeFlag("--concepts", { boolean: true }));
  const noServer = Boolean(takeFlag("--no-server", { boolean: true }));
  const explicitBase = takeFlag("--base");
  const milestone = takeFlag("--milestone");
  const sampleRaw = takeFlag("--sample");
  const jsonOut = takeFlag("--json");
  const timeoutRaw = takeFlag("--timeout-ms");
  const positionals = rest.filter((a) => !a.startsWith("--"));

  return {
    help,
    staticOnly,
    includeConcepts,
    noServer,
    explicitBase,
    milestone,
    sampleN: sampleRaw ? Number(sampleRaw) : 0,
    jsonOut,
    perPageMs: timeoutRaw ? Number(timeoutRaw) : 12000,
    positionals,
  };
}

function normalizeRouteArg(arg) {
  let clean = String(arg).trim().replace(/^\/+/, "").replace(/\/+$/, "");
  clean = clean.replace(/\/index\.html$/i, "");
  return clean;
}

function expandManifestEntries(entries, includeConcepts) {
  const routes = [];
  for (const entry of entries) {
    routes.push({ id: entry.id, route: `/${entry.id}/` });
    if (includeConcepts) {
      for (const concept of entry.concepts ?? []) {
        const cid = `${entry.id}/${concept}`;
        routes.push({ id: cid, route: `/${cid}/` });
      }
    }
  }
  return routes;
}

function selectRuntimeTargets(opts) {
  const manifest = buildFromDisk().filter((m) => m.status === "built");
  const byId = new Map(manifest.map((m) => [m.id, m]));

  if (opts.positionals.length > 0) {
    const out = [];
    const seen = new Set();
    const pushTarget = (id) => {
      if (seen.has(id)) return;
      seen.add(id);
      out.push({ id, route: `/${id}/` });
    };
    for (const raw of opts.positionals) {
      const id = normalizeRouteArg(raw);
      if (!id) continue;
      if (/^v\d+$/.test(id)) {
        const matches = manifest.filter((m) => m.id.startsWith(`${id}/`));
        for (const t of expandManifestEntries(matches, opts.includeConcepts)) {
          pushTarget(t.id);
        }
      } else if (byId.has(id) && opts.includeConcepts) {
        for (const t of expandManifestEntries([byId.get(id)], true)) {
          pushTarget(t.id);
        }
      } else {
        pushTarget(id);
      }
    }
    return out;
  }

  if (opts.milestone) {
    const matches = manifest.filter((m) => m.id.startsWith(`${opts.milestone}/`));
    return expandManifestEntries(matches, opts.includeConcepts);
  }

  if (opts.sampleN > 0) {
    const pool = expandManifestEntries(manifest, opts.includeConcepts);
    const step = Math.max(1, Math.floor(pool.length / opts.sampleN));
    return pool.filter((_, i) => i % step === 0).slice(0, opts.sampleN);
  }

  return [];
}

async function writeJsonOutput(outPath, payload) {
  const full = resolve(outPath);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, JSON.stringify(payload, null, 2) + "\n");
}

function printUsage() {
  process.stdout.write(
    "Usage:\n" +
      "  node scripts/check-jank.mjs <id-or-path...>\n" +
      "  node scripts/check-jank.mjs --milestone v<N> [--concepts]\n" +
      "  node scripts/check-jank.mjs --sample <n> [--concepts]\n" +
      "  node scripts/check-jank.mjs --static-only [path...]\n" +
      "  node scripts/check-jank.mjs --base <url> --no-server <id-or-path...>\n" +
      "Options:\n" +
      "  --concepts          Include concept subpages for features/milestones\n" +
      "  --static-only       Run static dvh-trap scan only (no Chrome or server)\n" +
      "  --base <url>        Server base URL\n" +
      "  --no-server         Reuse an already running server at --base\n" +
      "  --json <out>        Write structured JSON report to <out>\n" +
      "  --timeout-ms <ms>   Per-page CDP probe timeout (default 12000)\n",
  );
}

async function runStaticOnly(opts) {
  const files = [];
  if (opts.positionals.length > 0) {
    for (const p of opts.positionals) collectStaticFiles(p, files);
  } else if (opts.milestone) {
    collectStaticFiles(join(REPO_ROOT, opts.milestone), files);
  } else {
    for (const dir of listReleaseDirs()) collectStaticFiles(dir, files);
  }

  const uniqueFiles = [...new Set(files)].sort();
  const findings = [];
  for (const file of uniqueFiles) {
    const rel = formatDisplayPath(file);
    const content = readFileSync(file, "utf8");
    findings.push(...scanDvhTraps(content, rel));
  }

  if (opts.jsonOut) {
    await writeJsonOutput(opts.jsonOut, {
      mode: "static-only",
      generatedAt: new Date().toISOString(),
      scannedFiles: uniqueFiles.length,
      findingCount: findings.length,
      findings,
    });
  }

  for (const f of findings) {
    process.stdout.write(`${f.file}:${f.line} [dvh-trap] "${f.match}" — ${f.advice}\n`);
  }

  if (findings.length > 0) {
    process.stderr.write(
      `check-jank (static): FAIL — ${findings.length} dvh trap(s) across ` +
        `${uniqueFiles.length} file(s)\n`,
    );
    return 1;
  }

  process.stdout.write(
    `check-jank (static): PASS — 0 dvh traps across ${uniqueFiles.length} file(s)\n`,
  );
  return 0;
}

async function runCli(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    printUsage();
    return 0;
  }
  if (opts.staticOnly) {
    return await runStaticOnly(opts);
  }

  const targets = selectRuntimeTargets(opts);
  if (targets.length === 0) {
    process.stderr.write(
      "Specify <id-or-path...>, --milestone v<N>, --sample <n>, or --static-only.\n",
    );
    return 2;
  }

  let unhandledRejections = 0;
  const onUnhandled = (reason) => {
    unhandledRejections++;
    process.stderr.write(
      `check-jank: unhandled rejection #${unhandledRejections}: ${reason?.message ?? reason}\n`,
    );
  };
  process.on("unhandledRejection", onUnhandled);

  let serverChild = null;
  let chrome = null;
  let conn = null;
  try {
    let base;
    try {
      const booted = await bootServer({
        explicitBase: opts.explicitBase,
        noServer: opts.noServer,
        probeRoute: targets[0].route,
      });
      base = booted.base;
      serverChild = booted.serverChild;
    } catch (e) {
      process.stderr.write(`check-jank: ${e.message}\n`);
      return 2;
    }

    try {
      chrome = await launchChrome();
    } catch (e) {
      process.stderr.write(`check-jank: CHROME UNAVAILABLE: ${e.message}\n`);
      return 1;
    }

    conn = await cdpConnection(chrome.wsUrl);
    const results = [];
    let passed = 0;
    let failed = 0;
    let blocked = 0;

    for (const target of targets) {
      const url = `${base}${target.route}`;
      const res = await probePageJank(conn, url, {
        route: target.route,
        perPageMs: opts.perPageMs,
      });
      results.push({ id: target.id, ...res });
      if (res.status === "pass") {
        passed++;
        process.stdout.write(
          `  PASS ${target.id} (cls=${res.metrics.cls}, urlBarCls=${res.metrics.urlBarCls})\n`,
        );
      } else if (res.status === "fail") {
        failed++;
        process.stdout.write(`  FAIL ${target.id} — ${res.reasons.join("; ")}\n`);
      } else {
        blocked++;
        process.stdout.write(`  BLOCKED ${target.id} — ${res.reasons.join("; ")}\n`);
      }
    }

    if (opts.jsonOut) {
      await writeJsonOutput(opts.jsonOut, {
        mode: "runtime",
        generatedAt: new Date().toISOString(),
        emulation: {
          ...PHONE_METRICS,
          urlBarCollapsedHeight: URL_BAR_COLLAPSED_HEIGHT,
          cpuThrottleRate: CPU_THROTTLE_RATE,
        },
        thresholds: DEFAULT_THRESHOLDS,
        harness: { unhandledRejections, perPageTimeoutMs: opts.perPageMs },
        summary: { total: targets.length, passed, failed, blocked },
        results,
      });
    }

    process.stdout.write(
      `\ncheck-jank: ${targets.length} page(s) · pass ${passed} · fail ${failed} · ` +
        `blocked ${blocked}\n`,
    );
    return failed === 0 && blocked === 0 ? 0 : 1;
  } finally {
    process.off("unhandledRejection", onUnhandled);
    if (conn) {
      try {
        conn.close();
      } catch {
        // ignore
      }
    }
    if (chrome) await cleanupChrome(chrome);
    if (serverChild) {
      killServer(serverChild);
      await serverChild.status.catch(() => {});
    }
  }
}

if (import.meta.main) {
  const code = await runCli(process.argv.slice(2));
  process.exit(code);
}
