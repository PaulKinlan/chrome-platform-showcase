// Page-side client for the v159 race-network-and-fetch-handler cancellation demos.
//
// Registers ./sw.js (which installs a REAL static routing rule with
// source: 'race-network-and-fetch-handler' for ./race/*), waits until it
// controls the page, and runs scenarios: the page fetches ./race/... and the
// worker reports, over BroadcastChannel, exactly how ITS fetch(event.request)
// settled. The TypeError message shown anywhere in these demos is the one this
// browser produced — nothing is synthesised.

export const NEW_MESSAGE =
  "The service worker race-network-and-fetch-handler request was cancelled before 'fetch()' settled.";
export const PRELOAD_MESSAGE =
  "The service worker navigation preload request was cancelled before 'preloadResponse' settled.";
export const GENERIC_MESSAGE = "Failed to fetch";
export const FEATURE_FLAG = "ServiceWorkerRaceNetworkRequestAbortedErrorMessage";
export const FLAG_STEPS =
  `Proposed for Chrome 159 behind the base::Feature ${FEATURE_FLAG} (disabled by default in source until it ships). To test before then, launch a Chrome/Canary build that contains it with --enable-features=${FEATURE_FLAG}. There is no chrome://flags entry and no Blink runtime flag; builds that predate the change ignore the switch and keep "Failed to fetch".`;

const BASE = new URL("./", import.meta.url);
const channel = "BroadcastChannel" in globalThis ? new BroadcastChannel("sw-race-cancel") : null;
const waiters = new Map();
channel?.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type !== "fetch-settled") return;
  const w = waiters.get(d.tag);
  if (w) {
    waiters.delete(d.tag);
    w(d);
  }
});

let readyPromise = null;

/** Register the worker and resolve once it controls this page. */
export function ensureController() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("navigator.serviceWorker is unavailable (insecure context?)");
    }
    if (!channel) throw new Error("BroadcastChannel is unavailable");
    const reg = await navigator.serviceWorker.register(new URL("sw.js", BASE), {
      scope: BASE.pathname,
    });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error("worker activated but did not take control; reload the page")),
          5000,
        );
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          clearTimeout(t);
          resolve();
        }, { once: true });
      });
    }
    const status = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(null), 2000);
      navigator.serviceWorker.addEventListener("message", function on(e) {
        if (e.data?.type !== "status") return;
        navigator.serviceWorker.removeEventListener("message", on);
        clearTimeout(t);
        resolve(e.data);
      });
      navigator.serviceWorker.controller.postMessage({ type: "status" });
    });
    return { reg, status };
  })();
  readyPromise.catch(() => {
    readyPromise = null;
  });
  return readyPromise;
}

let counter = 0;

/**
 * Run one scenario.
 *  kind: "slow" | "fast" | "loop"
 *  mode: "fallback" | "passthrough" | "observe"
 *  delay: server header delay (ms), timer: SW fallback timer (ms)
 *  abortAfter: page-side AbortController delay (ms) or null
 */
export async function runScenario(
  { kind = "slow", mode = "fallback", delay = 3000, timer = 400, abortAfter = null, waitMs = 9000 },
) {
  await ensureController();
  const tag = `s${Date.now().toString(36)}${(counter++).toString(36)}`;
  const params = new URLSearchParams({ mode, tag, delay: String(delay), timer: String(timer) });
  const url = new URL(`race/${kind}?${params}`, BASE);
  const swReport = new Promise((resolve) => {
    waiters.set(tag, resolve);
    setTimeout(() => {
      if (waiters.delete(tag)) resolve(null);
    }, waitMs);
  });
  const ac = new AbortController();
  if (abortAfter != null) setTimeout(() => ac.abort(), abortAfter);
  const started = performance.now();
  let page;
  try {
    const res = await fetch(url, { signal: ac.signal, cache: "no-store" });
    const body = await res.text();
    page = {
      outcome: "resolved",
      status: res.status,
      servedBy: res.headers.get("x-served-by") || "network",
      body: body.slice(0, 200),
    };
  } catch (e) {
    page = { outcome: "rejected", name: e.name, message: e.message };
  }
  page.elapsedMs = Math.round(performance.now() - started);
  const sw = await swReport;
  const entry = performance.getEntriesByName(url.href).at(-1);
  const routing = entry
    ? {
      matched: entry.workerMatchedSourceType ?? "(field unsupported)",
      final: entry.workerFinalSourceType ?? "(field unsupported)",
    }
    : null;
  return { tag, url: url.pathname + url.search, page, sw, routing };
}

/** Classify a worker report the way a telemetry pipeline would. */
export function classify(sw) {
  if (!sw) return { label: "no report", kind: "unknown" };
  if (sw.outcome === "resolved") return { label: "network leg resolved", kind: "ok" };
  if (sw.message === NEW_MESSAGE) {
    return { label: "expected race cancellation (distinct message)", kind: "cancel-new" };
  }
  if (sw.message === PRELOAD_MESSAGE) {
    return { label: "navigation-preload cancellation", kind: "cancel-preload" };
  }
  if (sw.message === GENERIC_MESSAGE) {
    return { label: 'generic "Failed to fetch"', kind: "generic" };
  }
  return { label: `other: ${sw.name}: ${sw.message}`, kind: "other" };
}
