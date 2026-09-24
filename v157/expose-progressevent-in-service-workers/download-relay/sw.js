// Streaming download relay for "Expose ProgressEvent in service workers" (Chrome 157).
//
// The worker fetches a real same-origin asset, counts bytes off the response
// body's ReadableStream, and reports progress to the page. Where the platform
// allows it, the progress values are read off a real ProgressEvent constructed
// HERE — which is precisely what this feature makes possible.
//
// An Event is not structured-cloneable, so the field values are what crosses
// postMessage. The point is where they came from, not how they travel.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const HAS_PROGRESS_EVENT = typeof self.ProgressEvent === "function";

// Native path: build the platform event and read the values back off it.
function nativeProgress(loaded, total) {
  const event = new self.ProgressEvent("progress", {
    lengthComputable: total > 0,
    loaded,
    total,
  });
  return {
    source: "ProgressEvent",
    type: event.type,
    lengthComputable: event.lengthComputable,
    loaded: event.loaded,
    total: event.total,
  };
}

// Pre-157 path: the shape every service worker had to invent for itself.
// Labelled so the page never presents it as the native one.
function handRolledProgress(loaded, total) {
  return {
    source: "hand-rolled object",
    type: "progress",
    lengthComputable: total > 0,
    loaded,
    total,
  };
}

async function relay(client, url) {
  const post = (message) => client.postMessage(message);

  let response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (err) {
    post({
      kind: "error",
      error: "fetch failed: " + (err && err.message ? err.message : String(err)),
    });
    return;
  }

  if (!response.ok) {
    post({ kind: "error", error: "fetch returned HTTP " + response.status });
    return;
  }
  if (!response.body) {
    post({ kind: "error", error: "response has no readable body in this browser" });
    return;
  }

  // Only claim lengthComputable when the server actually told us the length.
  const header = response.headers.get("content-length");
  const total = header ? Number(header) : 0;

  post({
    kind: "start",
    hasProgressEvent: HAS_PROGRESS_EVENT,
    total,
    lengthKnown: total > 0,
    url,
  });

  const reader = response.body.getReader();
  let loaded = 0;
  let chunks = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    loaded += value.byteLength;
    chunks++;
    const payload = HAS_PROGRESS_EVENT
      ? nativeProgress(loaded, total)
      : handRolledProgress(loaded, total);
    post({ kind: "progress", chunks, ...payload });
  }

  post({
    kind: "done",
    chunks,
    loaded,
    total,
    hasProgressEvent: HAS_PROGRESS_EVENT,
  });
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "relay") return;
  event.waitUntil((async () => {
    const client = event.source ||
      (await self.clients.matchAll()).find((c) => c.id === data.clientId) ||
      (await self.clients.matchAll())[0];
    if (!client) return;
    await relay(client, data.url);
  })());
});
