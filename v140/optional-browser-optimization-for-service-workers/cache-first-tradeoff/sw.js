// Cache-first trade-off worker. Scope: this concept folder only.
const CACHE_NAME = "autopreload-cache-first-v1";

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Synthesised at install time: this response never touches the network.
    await cache.put(
      new Request("./cached-probe.txt"),
      new Response("served-from-cachestorage " + new Date().toISOString(), {
        headers: { "content-type": "text/plain; charset=utf-8", "x-source": "cachestorage" },
      }),
    );
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/cached-probe.txt")) {
    // Cache-first: answered without the network. Under ServiceWorkerAutoPreload
    // the browser may still have started a parallel network request — that
    // request's bytes are the trade-off this demo talks about.
    event.respondWith((async () => {
      const hit = await caches.match("./cached-probe.txt");
      return hit || fetch(event.request);
    })());
  } else if (url.pathname.endsWith("/network-probe.txt")) {
    // Pass-through: the preloaded response gets consumed by this fetch().
    event.respondWith(fetch(event.request));
  }
});
