// Preload timing lab worker. Scope: this concept folder only.
// The probe page URL carries ?mode=respondwith|fallback&delay=<ms>.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.endsWith("/probe-page.html")) return;
  const mode = url.searchParams.get("mode") || "respondwith";
  const delay = Math.min(2000, Math.max(0, Number(url.searchParams.get("delay") || "0")));
  if (mode === "fallback") {
    // Deliberately no respondWith(): the browser falls back to the network.
    // With ServiceWorkerAutoPreload the parallel request is handed to the page
    // directly instead of being re-issued after the handler returns.
    return;
  }
  event.respondWith((async () => {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    // With auto-preload, this fetch() consumes the response the browser
    // already put on the wire during worker bootstrap + this delay.
    return fetch(event.request);
  })());
});
