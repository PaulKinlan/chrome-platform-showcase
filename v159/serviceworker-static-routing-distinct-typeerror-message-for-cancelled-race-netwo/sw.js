// The one service worker every concept on this feature shares.
//
// Scope: this feature folder only (registered with scope "./" from harness.js).
//
// What it does, all of it real:
//   1. At install it calls InstallEvent.addRoutes() so two same-origin URLs are
//      routed with source "race-network-and-fetch-handler". The browser starts
//      the network request itself and dispatches the fetch event in parallel.
//   2. Its fetch handler then calls fetch(event.request) — the call Chromium
//      deduplicates onto the raced network request — and settles
//      event.respondWith() in a way the page chooses (a fallback timer, an
//      immediate app-shell response, …).
//   3. Whatever each fetch() promise does — fulfil, or reject with a TypeError —
//      is reported verbatim (error.name + error.message) to the page over a
//      BroadcastChannel, tagged with the page's run id. Nothing is synthesised:
//      the message you see is the string the browser put on the TypeError.
//
// Chrome 159 (Finch feature ServiceWorkerRaceNetworkRequestAbortedErrorMessage)
// changes that string, for a raced request cancelled with net::ERR_ABORTED
// before response headers arrived, from "Failed to fetch" to RACE_CANCELLED.

const RACE_CANCELLED =
  "The service worker race-network-and-fetch-handler request was cancelled before 'fetch()' settled.";

// A published same-origin route that waits `delay` ms (0–1200) BEFORE sending
// response headers — exactly the window in which a raced request can be
// cancelled pre-settlement.
const SLOW_PATH = "/v151/cpu-performance-api/capability-echo";
// A published same-origin route that answers with a 301 (a durable-URL alias).
// Requested with redirect: "error" it produces a genuine network error that is
// NOT a cancellation, so it must keep the generic message.
const REDIRECT_PATH =
  "/v150/disable-svg-filters-on-plugins-and-cross-origin-or-restricted-iframes/";

const CHANNEL = "sw159-race-cancel";
const META_CACHE = "sw159-race-cancel-meta";
const SHELL_CACHE = "sw159-race-cancel-shell";
const SHELL_KEY = `${SLOW_PATH}?shell-copy=1`;

function classify(error) {
  if (!error) return "none";
  if (error.name === "AbortError") return "abort";
  if (error instanceof TypeError && error.message === RACE_CANCELLED) return "race-cancelled";
  if (error instanceof TypeError) return "network-error";
  return "other";
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const report = {
      addRoutes: typeof event.addRoutes === "function",
      routes: [],
      installedAt: new Date().toISOString(),
    };
    if (report.addRoutes) {
      const rules = [
        {
          condition: { urlPattern: { pathname: SLOW_PATH } },
          source: "race-network-and-fetch-handler",
        },
        {
          condition: { urlPattern: { pathname: REDIRECT_PATH } },
          source: "race-network-and-fetch-handler",
        },
      ];
      // One rule per call, so one rejection cannot hide whether the other was accepted.
      for (const rule of rules) {
        try {
          await event.addRoutes(rule);
          report.routes.push({
            pathname: rule.condition.urlPattern.pathname,
            source: rule.source,
            ok: true,
          });
        } catch (error) {
          report.routes.push({
            pathname: rule.condition.urlPattern.pathname,
            source: rule.source,
            ok: false,
            error: `${error.name}: ${error.message}`,
          });
        }
      }
    }
    const meta = await caches.open(META_CACHE);
    await meta.put("install-report", new Response(JSON.stringify(report)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  if (event.data?.type !== "install-report") return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    const meta = await caches.open(META_CACHE);
    const stored = await meta.match("install-report");
    const report = stored ? await stored.json() : null;
    port?.postMessage({ type: "install-report", report, RACE_CANCELLED });
  })());
});

function settle(label, promise, started) {
  return promise.then(
    (response) => ({
      label,
      settled: "fulfilled",
      status: response.status,
      type: response.type,
      ms: Math.round(performance.now() - started),
      response,
    }),
    (error) => ({
      label,
      settled: "rejected",
      name: error?.name ?? typeof error,
      message: error?.message ?? String(error),
      classification: classify(error),
      ms: Math.round(performance.now() - started),
    }),
  );
}

function fallbackResponse(reason) {
  return new Response(JSON.stringify({ servedBy: "offline-fallback", reason }), {
    headers: { "content-type": "application/json", "x-served-by": "offline-fallback" },
  });
}

function timer(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname !== SLOW_PATH && url.pathname !== REDIRECT_PATH) return;
  const mode = url.searchParams.get("sw-mode");
  const run = url.searchParams.get("run");
  if (!mode || !run) return;

  const started = performance.now();
  const fb = Math.min(Math.max(Number(url.searchParams.get("fb") ?? 150), 0), 5000);
  const watched = [];
  let responder = "network";
  const watch = (label, promise) => {
    const tracked = settle(label, promise, started);
    watched.push(tracked);
    return promise;
  };
  const raceWithTimer = (promise) =>
    Promise.race([
      promise.then((response) => response),
      timer(fb).then(() => {
        responder = "fallback-timer";
        return fallbackResponse(`fallback timer (${fb} ms) fired first`);
      }),
    ]).catch(() => {
      responder = "fallback-after-error";
      return fallbackResponse("fetch() rejected before the timer fired");
    });

  switch (mode) {
    case "await": {
      // Control: respondWith the deduplicated fetch itself. Nothing cancels it.
      event.respondWith(watch("fetch(event.request)", fetch(event.request)));
      break;
    }
    case "fallback": {
      // The chromestatus scenario: an offline-fallback timer settles respondWith
      // first, so the browser cancels the raced request it no longer needs.
      event.respondWith(raceWithTimer(watch("fetch(event.request)", fetch(event.request))));
      break;
    }
    case "shell":
    case "shell-url": {
      // App-shell / stale-while-revalidate: answer at once from cache, and try
      // to refresh the cached copy in the background.
      const refresh = mode === "shell"
        ? watch("fetch(event.request)", fetch(event.request))
        : watch(
          "fetch(event.request.url, {cache:'no-store'})",
          fetch(event.request.url, { cache: "no-store" }),
        );
      event.waitUntil(refresh.then(async (response) => {
        const shell = await caches.open(SHELL_CACHE);
        const body = await response.clone().text();
        await shell.put(
          SHELL_KEY,
          new Response(body, {
            headers: {
              "content-type": "application/json",
              "x-refreshed-at": new Date().toISOString(),
            },
          }),
        );
      }, () => {}));
      responder = "cache-shell";
      event.respondWith((async () => {
        const shell = await caches.open(SHELL_CACHE);
        return (await shell.match(SHELL_KEY)) ?? fallbackResponse("no cached shell yet");
      })());
      break;
    }
    case "double": {
      const first = watch("1st fetch(event.request)", fetch(event.request));
      watch("2nd fetch(event.request)", fetch(event.request));
      event.respondWith(raceWithTimer(first));
      break;
    }
    case "copy": {
      event.respondWith(
        raceWithTimer(
          watch("fetch(new Request(event.request))", fetch(new Request(event.request))),
        ),
      );
      break;
    }
    case "url": {
      event.respondWith(raceWithTimer(watch("fetch(event.request.url)", fetch(event.request.url))));
      break;
    }
    case "genuine": {
      // The page asked with redirect: "error" and this URL answers 301, so the
      // fetch fails for a real reason — not a pre-settlement cancellation.
      const attempt = watch("fetch(event.request) [redirect: error]", fetch(event.request));
      event.respondWith(attempt.catch(() => {
        responder = "fallback-after-error";
        return fallbackResponse("genuine network error");
      }));
      break;
    }
    default:
      return;
  }

  // Report every fetch() outcome once they have all settled (capped, so a hung
  // request cannot keep the worker alive forever).
  event.waitUntil((async () => {
    const outcomes = await Promise.race([
      Promise.all(watched),
      timer(8000, null),
    ]);
    const fetches = (outcomes ?? []).map(({ response, ...rest }) => rest);
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({
      run,
      mode,
      fb,
      responder,
      timedOut: outcomes === null,
      fetches,
      fetchEventMs: Math.round(performance.now() - started),
    });
    channel.close();
  })());
});
