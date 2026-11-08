// subframe-kit.js — shared measurement harness for the
// "Deprecate and stop firing events during subframe removal" demos (v156).
//
// Everything here is a REAL measurement: it builds real <iframe srcdoc>
// subframes, registers real pagehide / visibilitychange / unload listeners
// inside them, removes (or navigates / moves) the frame, and records what the
// browser actually dispatched. Nothing is simulated.
//
// Reporting channels:
//  - Same-origin subframes call SubframeKit's report() directly through the
//    ancestor chain (synchronous: the parent sees the event while remove() is
//    still on the stack — the exact re-entrancy the feature removes).
//  - Opaque-origin (sandbox="allow-scripts" without allow-same-origin)
//    subframes cannot touch the parent, so they report over a MessagePort that
//    the parent transfers in after load. Delivery is asynchronous, so whether
//    the handler ran DURING remove() is judged by comparing the child's
//    wall-clock timestamp (performance.timeOrigin + performance.now()) with
//    the parent's [before, after] window around the remove() call.
(() => {
  'use strict';
  if (globalThis.SubframeKit) return;

  const ALL_EVENTS = ['pagehide', 'visibilitychange', 'unload'];
  const state = { seq: 0, removing: false, sink: null, frameCounter: 0 };
  const now = () => performance.timeOrigin + performance.now();

  function record(info, via) {
    const entry = {
      seq: ++state.seq,
      via,
      duringRemoval: state.removing,
      ...info,
    };
    if (state.sink) state.sink.push(entry);
    return entry;
  }

  // Same-origin children find this object by walking up their ancestors.
  Object.defineProperty(globalThis, '__subframeKitHost', {
    value: Object.freeze({ report: (info) => { record(info, 'direct'); } }),
    configurable: false,
  });

  const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

  // Script that runs inside every generated subframe. Written as ES5-ish text
  // because it is injected into srcdoc. `extra` is appended verbatim.
  function childScript(label, events, extra) {
    return `(function(){
  var label = ${JSON.stringify(label)};
  var host = null, port = null;
  try { var w = window; while (w !== w.parent) { w = w.parent; if (w.__subframeKitHost) { host = w.__subframeKitHost; break; } } } catch (e) { host = null; }
  function connected(){ try { return frameElement ? frameElement.isConnected : null; } catch (e) { return null; } }
  var pp = document.permissionsPolicy || document.featurePolicy;
  var unloadAllowed = (pp && typeof pp.allowsFeature === 'function') ? pp.allowsFeature('unload') : null;
  window.__subframeKitUnloadAllowed = unloadAllowed;
  ${JSON.stringify(events)}.forEach(function(t){
    // Registering an unload listener where Permissions Policy disallows it is
    // ignored by the browser (and logs a violation), so skip it and report why.
    if (t === 'unload' && unloadAllowed === false) return;
    addEventListener(t, function(e){
      var info = { label: label, type: t, ts: performance.timeOrigin + performance.now(),
        frameConnected: connected(), visibility: document.visibilityState,
        persisted: (typeof e.persisted === 'boolean') ? e.persisted : null };
      if (host) host.report(info); else if (port) port.postMessage(info);
    });
  });
  addEventListener('message', function(e){
    if (e.data === 'subframe-kit-port' && e.ports && e.ports[0]) { port = e.ports[0]; port.postMessage({ ready: label, unloadAllowed: unloadAllowed }); }
  });
  window.__subframeKitLabel = label;
  ${extra || ''}
})();`;
  }

  function buildDoc(label, events, depth, extra, body) {
    const script = '<script>' + childScript(label, events, extra) + '<' + '/script>';
    const inner = depth > 0
      ? `<iframe title="nested frame ${label}.1" srcdoc="${escAttr(buildDoc(label + '.1', events, depth - 1, '', ''))}" style="width:90%;height:3rem;border:1px solid"></iframe>`
      : '';
    return `<!doctype html><meta charset="utf-8"><style>body{font:12px/1.3 system-ui,sans-serif;margin:4px;background:#fff;color:#000}</style><p>subframe <b>${label}</b></p>${body || ''}${inner}${script}`;
  }

  // Create a subframe and resolve once it (and any nested frames) has loaded.
  // opts: { parent, events, depth, sandbox, allow, extra, body, hidden, title }
  async function create(opts = {}) {
    const label = opts.label || ('frame-' + (++state.frameCounter));
    const events = opts.events || ALL_EVENTS;
    const iframe = document.createElement('iframe');
    iframe.title = opts.title || `demo subframe ${label}`;
    if (opts.sandbox != null) iframe.setAttribute('sandbox', opts.sandbox);
    if (opts.allow) iframe.setAttribute('allow', opts.allow);
    if (opts.hidden) {
      iframe.tabIndex = -1;
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.cssText = 'position:absolute;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
    }
    iframe.srcdoc = buildDoc(label, events, opts.depth || 0, opts.extra, opts.body);
    const loaded = new Promise((resolve) => iframe.addEventListener('load', resolve, { once: true }));
    (opts.parent || document.body).append(iframe);
    await loaded;
    let port = null;
    const portEvents = [];
    let unloadAllowed = null;
    try { unloadAllowed = iframe.contentWindow.__subframeKitUnloadAllowed; } catch (e) { unloadAllowed = null; }
    if (opts.sandbox != null && !/allow-same-origin/.test(opts.sandbox)) {
      const mc = new MessageChannel();
      port = mc.port1;
      const ready = new Promise((resolve) => {
        const t = setTimeout(() => resolve(false), 1500);
        port.onmessage = (e) => {
          if (e.data && e.data.ready) { unloadAllowed = e.data.unloadAllowed; clearTimeout(t); resolve(true); return; }
          portEvents.push(record(e.data, 'port'));
        };
      });
      iframe.contentWindow.postMessage('subframe-kit-port', '*', [mc.port2]);
      if (!(await ready)) throw new Error('opaque subframe never acknowledged its MessagePort');
    }
    const listening = events.filter((t) => !(t === 'unload' && unloadAllowed === false));
    return { iframe, label, port, portEvents, unloadAllowed, listening };
  }

  // Run `action` synchronously while recording. Returns the full trace.
  // `settleMs` waits for asynchronous reports (MessagePort, navigation).
  async function measure(action, { settleMs = 400 } = {}) {
    const events = [];
    state.sink = events;
    const before = { seq: ++state.seq, ts: now() };
    let thrown = null;
    state.removing = true;
    try { action(); } catch (e) { thrown = `${e.name}: ${e.message}`; }
    state.removing = false;
    const after = { seq: ++state.seq, ts: now() };
    if (settleMs) await new Promise((r) => setTimeout(r, settleMs));
    state.sink = null;
    for (const ev of events) {
      if (ev.via === 'direct') ev.timing = ev.duringRemoval ? 'sync-during-call' : 'after-call';
      else ev.timing = (ev.ts >= before.ts - 1 && ev.ts <= after.ts + 1) ? 'sync-during-call' : 'after-call';
    }
    return { before, after, events, thrown };
  }

  // Observed-behaviour mode detection (never the UA string): remove a hidden
  // same-origin subframe that listens for pagehide and see what happened.
  let modePromise = null;
  function detectMode() {
    if (modePromise) return modePromise;
    modePromise = (async () => {
      const holder = document.createElement('div');
      holder.inert = true;
      holder.setAttribute('aria-hidden', 'true');
      holder.style.cssText = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;';
      document.body.append(holder);
      try {
        const f = await create({ parent: holder, hidden: true, label: 'mode-probe', events: ALL_EVENTS });
        const trace = await measure(() => f.iframe.remove(), { settleMs: 150 });
        const fired = trace.events.map((e) => e.type);
        const sync = trace.events.filter((e) => e.timing === 'sync-during-call').map((e) => e.type);
        let mode;
        if (fired.length === 0) mode = 'omits';
        else if (sync.includes('pagehide')) mode = 'legacy';
        else mode = 'async';
        return { mode, fired, sync, trace, unloadAllowed: f.unloadAllowed };
      } catch (e) {
        return { mode: 'error', fired: [], sync: [], error: `${e.name}: ${e.message}` };
      } finally {
        holder.remove();
      }
    })();
    return modePromise;
  }

  const MODE_COPY = {
    legacy: {
      cls: 'mode-legacy',
      title: 'Legacy behaviour observed: this browser fires the events during removal',
      text: 'A hidden same-origin probe frame was removed and its pagehide handler ran synchronously inside remove(). This is the long-standing Blink/Gecko/WebKit behaviour the feature deprecates. To see the HTML-Standard behaviour, relaunch Chrome with the flag below.',
    },
    omits: {
      cls: 'mode-omits',
      title: 'HTML-Standard behaviour observed: removal fired no events',
      text: 'A hidden same-origin probe frame was removed and none of its pagehide / visibilitychange / unload listeners ran. This browser destroys the child navigable silently — the OmitSubframeDetachmentEventsOnRemoval behaviour (or another engine that already matches the spec).',
    },
    async: {
      cls: 'mode-legacy',
      title: 'Events fired, but not synchronously inside remove()',
      text: 'The probe frame reported its events only after remove() returned. That is neither the old synchronous behaviour nor the spec\'s silent destruction; the timeline below shows the exact order.',
    },
    error: {
      cls: 'mode-legacy',
      title: 'Mode probe could not run',
      text: 'The hidden probe frame failed to load or report, so this page cannot say which behaviour your browser has. The manual experiments below still run the real calls.',
    },
  };

  function renderMode(el, result) {
    const copy = MODE_COPY[result.mode] || MODE_COPY.error;
    el.className = 'mode-banner ' + copy.cls;
    el.dataset.mode = result.mode;
    el.replaceChildren();
    const h = document.createElement('strong');
    h.textContent = copy.title;
    const p = document.createElement('span');
    p.textContent = ' ' + copy.text + (result.fired && result.fired.length ? ` Probe saw: ${result.fired.join(' → ')}.` : '') + (result.error ? ` (${result.error})` : '') + (result.unloadAllowed === false ? ' Note: Permissions Policy disallows unload in this document (Chrome\'s separate unload deprecation), so no unload listener could be registered — pagehide and visibilitychange carry the signal.' : '');
    el.append(h, p);
  }

  // Responsive tables: copy each column header into data-label on every cell so
  // the stacked mobile layout (subframe-demo.css container query) can label it.
  function labelTables() {
    for (const table of document.querySelectorAll('table.trace')) {
      const heads = [...table.querySelectorAll('thead th')].map((th) => th.textContent.trim());
      const apply = () => table.querySelectorAll('tbody tr').forEach((tr) => {
        [...tr.children].forEach((td, i) => { if (heads[i] && td.colSpan === 1) td.dataset.label = heads[i]; });
      });
      apply();
      new MutationObserver(apply).observe(table.tBodies[0], { childList: true });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', labelTables, { once: true });
  else labelTables();

  globalThis.SubframeKit = Object.freeze({ ALL_EVENTS, create, measure, detectMode, renderMode, buildDoc });
})();
