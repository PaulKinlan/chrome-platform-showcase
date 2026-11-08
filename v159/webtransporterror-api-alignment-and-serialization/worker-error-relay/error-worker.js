// Connection-manager worker for the worker-error-relay demo.
// It does NOT open a WebTransport session (that needs an HTTP/3 server this
// site does not run). It constructs the WebTransportError that a real
// session/stream would reject with, then posts it to the UI thread — the
// structured serialization under test is real.
importScripts("../wte-lib.js");
const WTE = self.WTE;

const SCENARIOS = {
  "stream-reset": {
    message: "server reset the upload stream (RESET_STREAM)",
    source: "stream",
    code: 500,
  },
  "quota": { message: "application quota exceeded on stream", source: "stream", code: 70000 },
  "max-code": {
    message: "peer used the largest 32-bit application code",
    source: "stream",
    code: 4294967295,
  },
  "session-closed": { message: "session terminated by peer", source: "session", code: null },
};

self.onmessage = (ev) => {
  const msg = ev.data || {};
  if (msg.type === "fail") {
    const s = SCENARIOS[msg.scenario];
    if (!s) return;
    const made = WTE.make(s.message, s.source, s.code);
    if (!made.value) {
      self.postMessage({ type: "no-ctor", scenario: msg.scenario, error: made.error });
      return;
    }
    try {
      self.postMessage({
        type: "failure",
        scenario: msg.scenario,
        ctor: made.via,
        error: made.value,
      });
    } catch (err) {
      // Real DataCloneError from the worker's own postMessage — fall back to
      // the app-level wire shape, labelled so the UI never presents it as native.
      self.postMessage({
        type: "failure-wire",
        scenario: msg.scenario,
        ctor: made.via,
        cloneError: { name: err.name, message: err.message },
        wire: WTE.toWire(made.value),
      });
    }
  } else if (msg.type === "abort-reason") {
    // The UI thread sent a WebTransportError as a cancel reason; report what arrived.
    self.postMessage({ type: "abort-ack", desc: WTE.describe(msg.reason) });
  }
};
self.postMessage({
  type: "ready",
  hasWTE: WTE.has(),
  standardCtor: WTE.standardCtorSupported(),
  serialization: WTE.serializationSupported(),
  secure: self.isSecureContext,
});
