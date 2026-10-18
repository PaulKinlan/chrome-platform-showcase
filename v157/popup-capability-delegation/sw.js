// Service worker for the Popup Capability Delegation demos (v157).
// Scope: /v157/popup-capability-delegation/
//
// Exercises the EXACT proposed surface from the explainer
// (WICG/capability-delegation explainers/popup-delegation.md):
//   client.postMessage(message, { delegate: 'popup' })  // ClientPostMessageOptions
// - inside a notificationclick handler: the real delegation flow;
// - outside one (the probe): a supporting browser must throw NotAllowedError,
//   while a browser without the feature ignores the unknown dictionary member
//   and simply delivers the message. Both outcomes are reported to the page
//   verbatim — this file never fakes either branch.

const VERSION = 'popup-capdel-sw-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  const client = event.source;
  if (!client) return;

  if (data.type === 'ping') {
    client.postMessage({ type: 'pong', version: VERSION });
    return;
  }

  if (data.type === 'probe-delegate') {
    // The behavioural probe: attempt the delegation OUTSIDE a trusted
    // notificationclick event. Per the explainer, a supporting browser throws
    // NotAllowedError here (no active "popup" capability token in this
    // context). A browser without ClientPostMessageOptions.delegate treats the
    // option as an unknown dictionary member, ignores it, and delivers the
    // message. This probe can therefore genuinely return false.
    let threw = false, errorName = null, errorMessage = null;
    try {
      client.postMessage({
        type: 'probe-delivery',
        note: 'This message was DELIVERED despite { delegate: "popup" } — the option was ignored as an unknown dictionary member, so this browser does not implement Popup Capability Delegation.',
      }, { delegate: 'popup' });
    } catch (error) {
      threw = true;
      errorName = error.name;
      errorMessage = error.message;
    }
    client.postMessage({ type: 'probe-result', threw, errorName, errorMessage, version: VERSION });
    return;
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const mode = (event.notification.data && event.notification.data.mode) || 'delegate';
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const target = clientList.find((c) => c.url.includes('/notification-delegation-lab/')) || clientList[0];
    if (!target) {
      // Fallback path the explainer names: no client window — open a fresh
      // top-level context instead (no shared state, which is the limitation
      // the delegation exists to avoid).
      await self.clients.openWindow('./notification-delegation-lab/?from=openWindow');
      return;
    }
    let focusError = null;
    try {
      // Required: the popup blocker still demands a visible/active tab.
      await target.focus();
    } catch (error) {
      focusError = `${error.name}: ${error.message}`;
    }
    if (mode === 'plain') {
      // Control arm: an ordinary postMessage with NO delegation option.
      target.postMessage({ type: 'notification-open', delegated: false, focusError });
      return;
    }
    let delegateError = null;
    try {
      // The real thing: delegate the transient "popup" capability token that
      // this trusted notificationclick granted to this event context.
      target.postMessage(
        { type: 'notification-open', delegated: true, focusError },
        { delegate: 'popup' },
      );
    } catch (error) {
      delegateError = `${error.name}: ${error.message}`;
      // Report the real failure; the page labels what it means.
      target.postMessage({ type: 'notification-open', delegated: false, focusError, delegateError });
    }
  })());
});
