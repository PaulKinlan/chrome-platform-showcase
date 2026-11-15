// Service worker for the v159 "distinct TypeError message for cancelled
// race-network-and-fetch-handler fetch() requests" demos.
// Scope: /v159/serviceworker-static-routing-distinct-typeerror-message-for-cancelled-race-netwo/
//
// 1. At install it registers a REAL static routing rule:
//      { condition: { urlPattern: { pathname: <scope>/race/* } },
//        source: 'race-network-and-fetch-handler' }
//    so Chromium starts the network request for /race/* in parallel with the
//    fetch handler and deduplicates it with fetch(event.request).
// 2. Its fetch handler calls fetch(event.request) for /race/* and reports the
//    exact settlement (resolved, or rejected with the verbatim error name and
//    message) to every page over a BroadcastChannel. Nothing is synthesised:
//    the message string is whatever this browser's fetch() rejected with.
//
// Query parameters on /race/* choose the fetch-handler strategy:
//   mode=fallback&timer=<ms>  respondWith(race(fetch(event.request), timer → offline fallback))
//   mode=passthrough          respondWith(fetch(event.request))   (page may abort it)
//   mode=observe              no respondWith; fetch(event.request) under waitUntil only
//   mode=guard                respondWith(fetch(event.request) or, on rejection, an
//                             error-page Response) — the page never sees a failed load
//   tag=<label>               echoed back so pages can pair reports with requests

const VERSION = "sw-race-cancel-v3";
const SCOPE_PATH = new URL("./", self.location.href).pathname;
const RACE_PATH = SCOPE_PATH + "race/";
const CHANNEL = "sw-race-cancel";
const NEW_MESSAGE =
  "The service worker race-network-and-fetch-handler request was cancelled before 'fetch()' settled.";
const bc = new BroadcastChannel(CHANNEL);

let routerInstall = { attempted: false, ok: false, error: null };

self.addEventListener("install", (event) => {
  self.skipWaiting();
  routerInstall.attempted = true;
  if (typeof event.addRoutes !== "function") {
    routerInstall = {
      attempted: true,
      ok: false,
      error: "InstallEvent.addRoutes is not a function",
    };
    return;
  }
  event.waitUntil(
    Promise.resolve()
      .then(() =>
        event.addRoutes([{
          condition: { urlPattern: { pathname: RACE_PATH + "*" } },
          source: "race-network-and-fetch-handler",
        }])
      )
      .then(() => {
        routerInstall = { attempted: true, ok: true, error: null };
      })
      .catch((e) => {
        // A rejected addRoutes must not fail installation: the pages report it.
        routerInstall = { attempted: true, ok: false, error: `${e.name}: ${e.message}` };
      }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function classify(message) {
  if (message === NEW_MESSAGE) return "expected-race-cancellation";
  if (message === "Failed to fetch") return "generic-failed-to-fetch";
  return "other";
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "status") {
    event.source?.postMessage({
      type: "status",
      version: VERSION,
      routerInstall,
      racePath: RACE_PATH,
      newMessage: NEW_MESSAGE,
    });
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(RACE_PATH)) return;
  const mode = url.searchParams.get("mode") || "passthrough";
  const tag = url.searchParams.get("tag") || "untagged";
  const timer = Math.min(Math.max(Number(url.searchParams.get("timer") || 400), 0), 8000);
  const started = performance.now();

  const report = (extra) =>
    bc.postMessage({
      type: "fetch-settled",
      tag,
      mode,
      url: url.pathname + url.search,
      destination: event.request.destination,
      requestMode: event.request.mode,
      elapsedMs: Math.round(performance.now() - started),
      ...extra,
    });

  const networkLeg = fetch(event.request).then(
    (response) => {
      report({ outcome: "resolved", status: response.status });
      return response;
    },
    (error) => {
      const message = String(error && error.message);
      report({
        outcome: "rejected",
        name: error && error.name,
        message,
        isTypeError: error instanceof TypeError,
        classification: classify(message),
      });
      throw error;
    },
  );

  if (mode === "observe") {
    event.waitUntil(networkLeg.catch(() => {}));
    return;
  }

  if (mode === "fallback") {
    const fallback = new Promise((resolve) =>
      setTimeout(() =>
        resolve(
          new Response(
            JSON.stringify({ from: "sw-offline-fallback", tag, timer }),
            { headers: { "content-type": "application/json", "x-served-by": "sw-fallback-timer" } },
          ),
        ), timer)
    );
    event.respondWith(Promise.race([networkLeg, fallback]));
    event.waitUntil(networkLeg.catch(() => {}));
    return;
  }

  if (mode === "guard") {
    event.respondWith(networkLeg.catch((error) =>
      new Response(
        JSON.stringify({ from: "sw-error-page", tag, error: `${error.name}: ${error.message}` }),
        { headers: { "content-type": "application/json", "x-served-by": "sw-error-page" } },
      )
    ));
    return;
  }

  // passthrough
  event.respondWith(networkLeg);
});
