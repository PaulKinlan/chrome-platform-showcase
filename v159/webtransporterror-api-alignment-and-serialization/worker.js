// Dedicated worker for the WebTransportError concepts.
//  - "echo": receives a value by structured clone and posts it straight back,
//    reporting what arrived (used by the structured-clone concept).
//  - "connect": opens a real WebTransport, and when ready rejects, tries to
//    post the real WebTransportError to the page. If this browser cannot
//    serialize it (DataCloneError), it posts a plain record instead and says so.
//  - "app-error": builds an application error with the standard constructor
//    (falling back to the legacy form) and relays it the same way.

function describe(e) {
  if (e == null || typeof e !== "object") return { value: String(e) };
  return {
    class: e.constructor?.name,
    isWebTransportError: typeof WebTransportError === "function" && e instanceof WebTransportError,
    name: e.name,
    message: e.message,
    source: e.source,
    streamErrorCode: e.streamErrorCode,
  };
}

function relay(error, extra) {
  try {
    self.postMessage({ kind: "native", error, ...extra });
    return;
  } catch (cloneError) {
    self.postMessage({
      kind: "record",
      cloneError: cloneError.name + ": " + cloneError.message,
      record: {
        __webTransportError: 1,
        message: error.message,
        source: error.source ?? "stream",
        streamErrorCode: error.streamErrorCode ?? null,
      },
      ...extra,
    });
  }
}

function makeError(message, source, code) {
  try {
    const e = new WebTransportError(message, { source, streamErrorCode: code });
    if (e.message === message && e.source === source) return { error: e, path: "standard" };
  } catch { /* legacy build */ }
  const init = { message };
  if (code !== null) init.streamErrorCode = code;
  return { error: new WebTransportError(init), path: "legacy" };
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg && msg.op === "echo") {
    self.postMessage({ kind: "echo", value: msg.value, seen: describe(msg.value) });
    return;
  }
  if (msg && msg.op === "connect") {
    if (typeof WebTransport !== "function") {
      self.postMessage({
        kind: "unavailable",
        detail: "No WebTransport constructor in this worker.",
      });
      return;
    }
    const t0 = performance.now();
    let transport;
    try {
      transport = new WebTransport(msg.url);
    } catch (error) {
      relay(error, { phase: "constructor", ms: 0 });
      return;
    }
    transport.closed.catch(() => {});
    try {
      await transport.ready;
      self.postMessage({ kind: "connected", ms: Math.round(performance.now() - t0) });
      transport.close({ closeCode: 0, reason: "relay demo: connected, nothing to relay" });
    } catch (error) {
      relay(error, { phase: "ready", ms: Math.round(performance.now() - t0) });
    }
    return;
  }
  if (msg && msg.op === "app-error") {
    if (typeof WebTransportError !== "function") {
      self.postMessage({ kind: "unavailable", detail: "No WebTransportError in this worker." });
      return;
    }
    const { error, path } = makeError(msg.message, msg.source, msg.code);
    relay(error, { phase: "app", ctorPath: path, askedCode: msg.code });
  }
};
