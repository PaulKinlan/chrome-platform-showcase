// Service worker for the Request.isReloadNavigation demo.
// Intercepts navigation fetches, reads event.request.isReloadNavigation,
// and stores the result so the page can retrieve it via a message round-trip.

let lastNavResult = null;

self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return;

  // Read isReloadNavigation — the new Chrome 147 boolean.
  // Falls back to false for browsers that don't support it yet.
  const isReload = event.request.isReloadNavigation ?? false;

  lastNavResult = {
    isReload,
    url: event.request.url,
    at: Date.now(),
  };

  // Don't intercept the response — just let the browser fetch normally.
});

// The page sends a 'get-nav-type' message on load; we reply with the stored result.
self.addEventListener('message', event => {
  if (event.data?.type === 'get-nav-type') {
    event.ports[0].postMessage({ result: lastNavResult });
  }
});
