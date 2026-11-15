// Shared observation harness for the "Deprecate and stop firing events during
// subframe removal" concepts. It creates real subframes running ./frame.html and
// records every lifecycle report they send, marking whether the report arrived
// SYNCHRONOUSLY inside the host's own DOM-removal call (the deprecated behaviour)
// or later (postMessage from opaque/cross-origin frames, or navigations).
(() => {
  "use strict";
  const FRAME_URL = new URL("./frame.html", document.currentScript.src).href;
  const LIFECYCLE = ["pagehide", "visibilitychange", "unload"];
  let insideRemoval = false;
  let sink = null; // current run's collector
  const loadWaiters = new Map(); // id -> resolve
  const listeners = new Set();

  function deliver(msg, channel) {
    if (!msg || msg.src !== "subframe-removal") return;
    const entry = Object.assign({}, msg, { sync: insideRemoval, channel });
    if (msg.type === "load" && loadWaiters.has(msg.id)) {
      loadWaiters.get(msg.id)(entry);
      loadWaiters.delete(msg.id);
    }
    if (sink) sink.push(entry);
    for (const fn of listeners) fn(entry);
  }

  // Same-origin frames call this directly and synchronously.
  globalThis.__subframeRemovalReport = (msg) => deliver(msg, "direct call");
  // Opaque / cross-origin frames can only postMessage.
  addEventListener("message", (e) => {
    if (e.data && e.data.src === "subframe-removal") deliver(e.data, "postMessage");
  });

  let counter = 0;
  function makeId(prefix) {
    counter++;
    return `${prefix}-${counter}`;
  }

  // Create a subframe element (iframe or object) and resolve once its document
  // has reported "load". Rejects after a timeout so a control can never hang.
  function createFrame(opts = {}) {
    const id = opts.id || makeId(opts.prefix || "frame");
    const tag = opts.tag || "iframe";
    const el = document.createElement(tag);
    const qs = new URLSearchParams(Object.assign({ id }, opts.query || {}));
    const url = `${FRAME_URL}?${qs}`;
    if (tag === "object") {
      el.type = "text/html";
      el.data = url;
    } else {
      el.src = url;
      el.title = opts.title || `Embedded widget ${id}`;
      if (opts.sandbox != null) el.setAttribute("sandbox", opts.sandbox);
    }
    el.dataset.frameId = id;
    const ready = new Promise((resolve, reject) => {
      loadWaiters.set(id, resolve);
      setTimeout(() => {
        if (loadWaiters.has(id)) {
          loadWaiters.delete(id);
          reject(new Error(`frame ${id} did not report load within 5s`));
        }
      }, 5000);
    });
    (opts.parent || document.body).append(el);
    return { el, id, ready };
  }

  // Run `mutate()` (the DOM removal) with the synchronous window open, then wait
  // `settleMs` for asynchronous reports. Returns every report received.
  async function observe(mutate, settleMs = 450) {
    const collected = [];
    sink = collected;
    let error = null;
    insideRemoval = true;
    try {
      mutate();
    } catch (e) {
      error = e;
    } finally {
      insideRemoval = false;
    }
    await new Promise((r) => setTimeout(r, settleMs));
    sink = null;
    const lifecycle = collected.filter((r) => LIFECYCLE.includes(r.type));
    return {
      reports: collected,
      lifecycle,
      syncLifecycle: lifecycle.filter((r) => r.sync),
      asyncLifecycle: lifecycle.filter((r) => !r.sync),
      error,
    };
  }

  function onReport(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function describe(r) {
    const extra = r.type === "visibilitychange" && r.state
      ? ` (${r.state})`
      : r.type === "pagehide"
      ? ` (persisted=${r.persisted})`
      : "";
    return `${r.id}: ${r.type}${extra} — ${
      r.sync ? "SYNCHRONOUS, inside the removal call" : "after the call returned"
    } via ${r.channel}`;
  }

  globalThis.SubframeRemovalHarness = Object.freeze({
    createFrame,
    observe,
    onReport,
    describe,
    LIFECYCLE,
    FRAME_URL,
  });
})();
