// Probe service worker for "Expose ProgressEvent in service workers" (Chrome 157).
//
// The page cannot answer this question on its own: ProgressEvent has always
// existed on Window, so a window-side check tells you nothing about the
// ServiceWorkerGlobalScope. The only honest probe runs HERE and reports back.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

function probeGlobalScope() {
  const result = {
    scope: "ServiceWorkerGlobalScope",
    exposed: typeof self.ProgressEvent === "function",
    constructed: false,
    fields: null,
    error: null,
  };

  if (!result.exposed) {
    result.error = "ProgressEvent is not defined in this ServiceWorkerGlobalScope";
    return result;
  }

  try {
    // Construct with the three attributes the feature calls out by name.
    const event = new self.ProgressEvent("progress", {
      lengthComputable: true,
      loaded: 512,
      total: 2048,
    });
    result.constructed = true;
    result.fields = {
      type: event.type,
      lengthComputable: event.lengthComputable,
      loaded: event.loaded,
      total: event.total,
      // Chrome 136 made loaded/total IDL double — check the type survives here too.
      loadedIsNumber: typeof event.loaded === "number",
      instanceOfEvent: event instanceof Event,
    };
  } catch (err) {
    result.error = err && err.name ? err.name + ": " + err.message : String(err);
  }

  return result;
}

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "probe") return;
  const payload = probeGlobalScope();
  // Reply on the port the page opened, falling back to a broadcast.
  if (event.ports && event.ports[0]) {
    event.ports[0].postMessage(payload);
    return;
  }
  event.waitUntil(
    self.clients.matchAll().then((clients) => {
      for (const client of clients) client.postMessage(payload);
    }),
  );
});
