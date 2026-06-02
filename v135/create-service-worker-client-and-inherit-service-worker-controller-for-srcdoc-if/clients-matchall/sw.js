self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function serializeClient(client) {
  return {
    focused: client.focused,
    id: client.id,
    type: client.type,
    url: client.url,
    visibilityState: client.visibilityState,
  };
}

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

  if (data.type === "list-clients") {
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });
      event.source?.postMessage({
        type: "client-list",
        requestId: data.requestId,
        clients: clients.map(serializeClient),
      });
    })());
    return;
  }

  if (data.type === "broadcast") {
    event.waitUntil((async () => {
      const clients = await self.clients.matchAll({
        includeUncontrolled: true,
        type: "window",
      });
      for (const client of clients) {
        client.postMessage({
          type: "sw-broadcast",
          requestId: data.requestId,
          text: data.text || "postMessage from Service Worker",
        });
      }
      event.source?.postMessage({
        type: "broadcast-complete",
        requestId: data.requestId,
        count: clients.length,
        clients: clients.map(serializeClient),
      });
    })());
  }
});
