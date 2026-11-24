// Shared page-side harness for every concept (and the conformance suite).
//
// ready()  registers ./sw.js scoped to this feature folder, waits for it to
//          activate and reports what InstallEvent.addRoutes() accepted.
// run()    makes ONE real request that the static router races
//          ("race-network-and-fetch-handler"), tells the worker how to settle
//          event.respondWith() via the query string, and resolves with what the
//          page received plus the worker's verbatim report of every fetch()
//          promise it made (error.name + error.message).
//
// If the calling document is not inside the worker's scope (e.g. the
// /conformance/ pages), requests are issued from a hidden same-origin iframe
// that IS in scope, so they are still controlled — and still really raced.

export const BASE = new URL("./", import.meta.url).pathname;
export const SW_URL = `${BASE}sw.js`;
export const SLOW_PATH = "/v151/cpu-performance-api/capability-echo";
export const REDIRECT_PATH =
  "/v150/disable-svg-filters-on-plugins-and-cross-origin-or-restricted-iframes/";
export const RACE_CANCELLED_MESSAGE =
  "The service worker race-network-and-fetch-handler request was cancelled before 'fetch()' settled.";
export const NAV_PRELOAD_CANCELLED_MESSAGE =
  "The service worker navigation preload request was cancelled before 'preloadResponse' settled.";
export const GENERIC_MESSAGE = "Failed to fetch";
// The worker's app-shell cache (see the "shell" / "shell-url" modes in sw.js).
export const SHELL_CACHE = "sw159-race-cancel-shell";
export const SHELL_KEY = `${SLOW_PATH}?shell-copy=1`;
const CHANNEL = "sw159-race-cancel";

export function classify(error) {
  if (!error) return "none";
  if (error.name === "AbortError") return "abort";
  if (error.name === "TypeError" && error.message === RACE_CANCELLED_MESSAGE) {
    return "race-cancelled";
  }
  if (error.name === "TypeError") return "network-error";
  return "other";
}

let readyPromise = null;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms)
    ),
  ]);
}

async function waitActivated(registration) {
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker) throw new Error("registration has no worker");
  if (worker.state === "activated") return worker;
  await new Promise((resolve, reject) => {
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") resolve();
      if (worker.state === "redundant") reject(new Error("service worker became redundant"));
    });
  });
  return registration.active;
}

function installReport(worker) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => resolve(event.data?.report ?? null);
    worker.postMessage({ type: "install-report" }, [channel.port2]);
    setTimeout(() => resolve(null), 3000);
  });
}

function controlledBy(win) {
  const controller = win.navigator.serviceWorker?.controller;
  return Boolean(controller && new URL(controller.scriptURL).pathname === SW_URL);
}

async function fetchContext() {
  const inScope = location.pathname.startsWith(BASE);
  if (inScope) {
    if (!controlledBy(window)) {
      // clients.claim() in activate hands us to the worker; wait for it.
      await withTimeout(
        new Promise((resolve) =>
          navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true })
        ),
        5000,
        "controllerchange",
      ).catch(() => {});
    }
    if (controlledBy(window)) return { win: window, via: "this page" };
  }
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.title = "service worker probe frame";
  frame.src = `${BASE}probe.html`;
  document.body.append(frame);
  await withTimeout(
    new Promise((resolve) => frame.addEventListener("load", resolve, { once: true })),
    10000,
    "probe frame load",
  );
  if (!controlledBy(frame.contentWindow)) {
    throw new Error("probe frame is not controlled by the feature's service worker");
  }
  return { win: frame.contentWindow, via: "in-scope probe iframe" };
}

export function ready() {
  readyPromise ??= (async () => {
    if (!("serviceWorker" in navigator)) {
      return {
        ok: false,
        reason:
          "navigator.serviceWorker is not available (needs a secure context and a browser with Service Workers).",
      };
    }
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: BASE });
    const worker = await withTimeout(
      waitActivated(registration),
      10000,
      "service worker activation",
    );
    const report = await installReport(worker);
    const context = await fetchContext();
    const raceRoute = report?.routes?.find((route) => route.pathname === SLOW_PATH);
    return {
      ok: Boolean(report?.addRoutes && raceRoute?.ok),
      reason: !report
        ? "The worker did not return its install report."
        : !report.addRoutes
        ? "InstallEvent.addRoutes() is not available in this browser, so no request is raced."
        : !raceRoute?.ok
        ? `addRoutes() rejected the race-network-and-fetch-handler rule: ${
          raceRoute?.error ?? "unknown"
        }`
        : "",
      report,
      context,
    };
  })();
  readyPromise.catch(() => (readyPromise = null));
  return readyPromise;
}

let counter = 0;

// mode: await | fallback | shell | shell-url | double | copy | url | genuine
// opts: { delay (ms before server headers), fb (fallback timer ms), pageAbortMs }
export async function run(mode, opts = {}) {
  const state = await ready();
  const { win } = state.context;
  const runId = `${Date.now().toString(36)}-${(++counter).toString(36)}-${
    Math.random().toString(36).slice(2, 7)
  }`;
  const delay = Math.round(opts.delay ?? 800);
  const fb = Math.round(opts.fb ?? 150);
  const genuine = mode === "genuine";
  const target = new URL(genuine ? REDIRECT_PATH : SLOW_PATH, location.origin);
  if (!genuine) target.searchParams.set("delay", String(delay));
  target.searchParams.set("sw-mode", mode);
  target.searchParams.set("fb", String(fb));
  target.searchParams.set("run", runId);

  const channel = new BroadcastChannel(CHANNEL);
  const workerReport = new Promise((resolve) => {
    channel.onmessage = (event) => {
      if (event.data?.run === runId) resolve(event.data);
    };
  });

  const started = performance.now();
  const controller = new win.AbortController();
  if (opts.pageAbortMs) setTimeout(() => controller.abort(), opts.pageAbortMs);
  const page = {};
  try {
    const response = await win.fetch(target.href, {
      cache: "no-store",
      redirect: genuine ? "error" : "follow",
      signal: controller.signal,
    });
    page.ok = true;
    page.status = response.status;
    page.servedBy = response.headers.get("x-served-by") ?? "network";
    page.body = (await response.text()).slice(0, 400);
  } catch (error) {
    page.ok = false;
    page.name = error.name;
    page.message = error.message;
  }
  page.ms = Math.round(performance.now() - started);

  const worker = await withTimeout(workerReport, 10000, "worker report").catch((error) => ({
    error: error.message,
    fetches: [],
  }));
  channel.close();

  // Resource Timing, where exposed, says which router source matched this exact URL.
  const entry = win.performance.getEntriesByName(target.href).at(-1);
  const timing = entry
    ? {
      matched: entry.workerMatchedRouterSource ?? null,
      final: entry.workerFinalRouterSource ?? null,
    }
    : null;

  return { runId, mode, delay, fb, url: target.pathname + target.search, page, worker, timing };
}
