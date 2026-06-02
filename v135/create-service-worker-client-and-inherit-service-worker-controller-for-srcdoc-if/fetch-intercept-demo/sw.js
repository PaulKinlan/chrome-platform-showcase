const intercepts = [];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "skip-waiting") {
    self.skipWaiting();
    return;
  }

  if (data.type === "claim-now") {
    event.waitUntil(self.clients.claim());
    return;
  }

  if (data.type === "reset-log") {
    intercepts.length = 0;
    event.source?.postMessage({
      type: "intercepts",
      requestId: data.requestId,
      intercepts: [],
    });
    return;
  }

  if (data.type === "get-intercepts") {
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });
      event.source?.postMessage({
        type: "intercepts",
        requestId: data.requestId,
        intercepts,
        clients: clients.map((client) => ({
          id: client.id,
          url: client.url,
          focused: client.focused,
        })),
      });
    })());
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.endsWith("/sw-echo")) return;

  event.respondWith((async () => {
    const source = url.searchParams.get("source") || "unknown";
    const entry = {
      at: new Date().toISOString(),
      clientId: event.clientId || "",
      destination: event.request.destination || "fetch",
      mode: event.request.mode,
      source,
      url: event.request.url,
    };

    intercepts.push(entry);
    if (intercepts.length > 30) intercepts.shift();

    const body = {
      intercepted: true,
      clientId: entry.clientId,
      requestMode: entry.mode,
      requestUrl: event.request.url,
      source,
      workerScope: self.registration.scope,
    };

    return new Response(JSON.stringify(body, null, 2), {
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json; charset=utf-8",
        "x-sw-client-id": entry.clientId,
        "x-sw-intercepted": "true",
      },
    });
  })());
});
