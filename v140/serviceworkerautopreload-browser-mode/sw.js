// The service worker the three demos share.
//
// It registers a static router at install time and reports exactly what the
// browser accepted, then serves three deliberately different paths so the cost
// of going through a fetch handler can be measured against not going through
// one at all.
//
// Every route here is real. Nothing is simulated: the slow path is slow because
// the handler waits, and the network path is fast because the router never
// wakes the handler at all.

const HANDLER_DELAY_MS = 220;
const CACHE_NAME = "sw-routing-demo-v1";

const SOURCES = [
  "network",
  "cache",
  "fetch-event",
  "race-network-and-fetch-handler",
  "race-network-and-cache",
  "bogus-source",
];

let installReport = null;

self.addEventListener("install", (event) => {
  const report = { sources: {}, routesInstalled: [], synchronousThrow: null };

  event.waitUntil((async () => {
    // Each source is offered on its own so one rejection does not hide the rest.
    for (const source of SOURCES) {
      const rule = { condition: { urlPattern: `/probe-${source}` }, source };
      try {
        const returned = event.addRoutes([rule]);
        report.synchronousThrow ??= false;
        await returned;
        report.sources[source] = { accepted: true, message: "" };
      } catch (error) {
        report.sources[source] = { accepted: false, message: `${error.name}: ${error.message}` };
      }
    }

    // The routes the demos actually use.
    // Three sibling files with identical contents, so the only difference
    // between the lanes is which source the router picked. Full pathnames
    // rather than wildcards: an ambiguous pattern would make the measurements
    // meaningless in a way that is hard to notice.
    const base = new URL("./", self.location).pathname;
    const real = [
      { condition: { urlPattern: `${base}lane-network.txt` }, source: "network" },
      { condition: { urlPattern: `${base}lane-handler.txt` }, source: "fetch-event" },
      {
        condition: { urlPattern: `${base}lane-race.txt` },
        source: "race-network-and-fetch-handler",
      },
      // A path where the network is genuinely slow, so the race has something
      // to race against rather than being decided by a local file read.
      {
        condition: { urlPattern: "/public/slow-stream" },
        source: "race-network-and-fetch-handler",
      },
    ];
    for (const rule of real) {
      try {
        await event.addRoutes([rule]);
        report.routesInstalled.push({
          pattern: rule.condition.urlPattern,
          source: rule.source,
          ok: true,
        });
      } catch (error) {
        report.routesInstalled.push({
          pattern: rule.condition.urlPattern,
          source: rule.source,
          ok: false,
          message: `${error.name}: ${error.message}`,
        });
      }
    }

    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      new Request("/sw-routing-demo/cached"),
      new Response("from the cache", { headers: { "content-type": "text/plain" } }),
    );

    installReport = report;
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// A fetch handler must exist for the fetch-event and race sources to be
// accepted at all — the browser refuses those routes otherwise, which the
// router-sources demo shows.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // The racing demo: answer immediately, or after a delay the page chooses, so
  // the crossover between the two sides of the race can be found.
  if (url.pathname === "/public/slow-stream") {
    const handlerDelay = Number(url.searchParams.get("hd") ?? 0);
    event.respondWith((async () => {
      if (handlerDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, handlerDelay));
      }
      return new Response("served from inside the worker", {
        headers: {
          "content-type": "text/plain",
          "x-served-by": "fetch-handler",
          "x-handler-delay": String(handlerDelay),
        },
      });
    })());
    return;
  }

  if (!/lane-(network|handler|race)\.txt$/.test(url.pathname)) return;

  event.respondWith((async () => {
    const started = performance.now();
    // The handler is deliberately slow, so the difference between reaching it
    // and skipping it is larger than the noise.
    await new Promise((resolve) => setTimeout(resolve, HANDLER_DELAY_MS));
    const response = await fetch(event.request);
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/octet-stream",
        "x-served-by": "fetch-handler",
        "x-handler-ms": String(Math.round(performance.now() - started)),
      },
    });
  })());
});

self.addEventListener("message", (event) => {
  event.source?.postMessage({
    type: "report",
    install: installReport,
    handlerDelayMs: HANDLER_DELAY_MS,
    hasAddRoutes: typeof self.InstallEvent === "function" &&
      Object.getOwnPropertyNames(self.InstallEvent.prototype).includes("addRoutes"),
  });
});
