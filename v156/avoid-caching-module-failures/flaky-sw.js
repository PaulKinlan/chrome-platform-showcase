// Service worker for the flaky-network-recovery concept.
//
// It plays the role of an UNRELIABLE NETWORK, nothing more. For module URLs
// under ./flaky-modules/<session>/ it fails the first `failCount` fetch
// attempts with a genuine network error (Response.error()), then serves a
// real, working ES module. The page's dynamic import() goes through this
// fetch handler exactly like it would go through a flaky radio link, so the
// module map's failure-caching behaviour is exercised for real:
//
//   - pre-Chrome-156: the first failure is cached in the module map, a retry
//     import() rejects immediately and this worker NEVER sees attempt #2;
//   - Chrome 156+ ("avoid caching module failures"): the retry issues a real
//     fetch, this worker sees attempt #2 and serves the module, and the
//     import succeeds.
//
// The per-session attempt counters live in worker memory; if the worker is
// stopped by the browser they reset, which the page treats as a fresh run.

"use strict";

const attempts = new Map(); // session -> number of fetches seen

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function broadcast(payload) {
  return self.clients.matchAll({ includeUncontrolled: true }).then((clients) => {
    for (const client of clients) client.postMessage(payload);
  });
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "reset" && typeof data.session === "string") {
    attempts.delete(data.session);
    broadcast({ type: "reset-done", session: data.session });
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const match = url.pathname.match(/\/flaky-modules\/([a-z0-9-]+)\/widget\.js$/);
  if (!match) return; // everything else goes to the real network untouched

  const session = match[1];
  const failCount = Number(url.searchParams.get("fail") || "1");
  const seen = (attempts.get(session) || 0) + 1;
  attempts.set(session, seen);

  event.waitUntil(broadcast({ type: "network-attempt", session, attempt: seen, failCount }));

  if (seen <= failCount) {
    // A real network-level failure, indistinguishable from a dropped
    // connection as far as the module loader is concerned.
    event.respondWith(Response.error());
    return;
  }

  const source = [
    "// Served by the flaky-network service worker on attempt #" + seen + ".",
    "const mount = (root) => {",
    "  const p = document.createElement('p');",
    "  p.className = 'widget-live';",
    "  p.textContent = 'Widget module evaluated on network attempt #" + seen +
    " at ' + new Date().toLocaleTimeString() + '. The retry reached the network and recovered.';",
    "  root.replaceChildren(p);",
    "};",
    "export { mount };",
    "export const attempt = " + seen + ";",
  ].join("\n");

  event.respondWith(
    new Response(source, {
      status: 200,
      headers: {
        "content-type": "text/javascript; charset=utf-8",
        "cache-control": "no-store",
      },
    }),
  );
});
