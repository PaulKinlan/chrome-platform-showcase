// Service worker with Static Routing rules for the Router Timing Inspector demo.
// Chrome 116+ supports the 'install' event addRoutes() method.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    if (!self.registration?.navigationPreload) return;
    try {
      await self.registration.addRoutes([
        {
          condition: { urlPattern: new URLPattern({ pathname: '/v149/service-worker-router-timing-fields/router-timing-inspector/assets/cached-*' }) },
          source: 'cache',
        },
        {
          condition: { urlPattern: new URLPattern({ pathname: '/v149/service-worker-router-timing-fields/router-timing-inspector/assets/network-*' }) },
          source: 'network',
        },
        {
          condition: { urlPattern: new URLPattern({ pathname: '/v149/service-worker-router-timing-fields/router-timing-inspector/assets/sw-*' }) },
          source: 'fetch-event',
        },
      ]);
    } catch (e) {
      // addRoutes not supported — graceful degradation
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/assets/sw-')) {
    event.respondWith(new Response(
      JSON.stringify({ source: 'fetch-event', url: url.pathname, ts: Date.now() }),
      { headers: { 'Content-Type': 'application/json', 'X-Served-By': 'fetch-event' } }
    ));
  }
});
