// Worker half of the "worker error relay" demo.
// It owns the networking (a real WebTransport session attempt) and posts the
// resulting WebTransportError object to the page. On a build that cannot
// serialize WebTransportError, postMessage throws DataCloneError here, in the
// sender — the worker then reports that and posts a plain record instead,
// clearly labelled as a fallback.
"use strict";

const DEAD = "https://127.0.0.1:44443/never";

function fields(e) {
  return {
    ctor: e && e.constructor ? e.constructor.name : typeof e,
    name: e && e.name,
    message: e && e.message,
    source: e && "source" in e ? e.source : undefined,
    streamErrorCode: e && "streamErrorCode" in e ? e.streamErrorCode : undefined,
    code: e && e.code,
  };
}

function relay(origin, error) {
  try {
    self.postMessage({ kind: "error-object", origin, error });
  } catch (cloneError) {
    self.postMessage({
      kind: "clone-failed",
      origin,
      cloneError: { name: cloneError.name, message: cloneError.message },
      record: fields(error),
    });
  }
}

function makeError(message, source, code) {
  try {
    return {
      how: "standard",
      error: new WebTransportError(message, { source, streamErrorCode: code }),
    };
  } catch (standardError) {
    // Legacy dictionary shape: no source member, [Clamp] octet code.
    return {
      how: "legacy (standard threw " + standardError.name + ")",
      error: new WebTransportError({ message, streamErrorCode: code }),
    };
  }
}

self.addEventListener("message", async (event) => {
  const msg = event.data || {};
  if (msg.cmd === "connect") {
    if (typeof WebTransport !== "function") {
      self.postMessage({
        kind: "unsupported",
        detail: "WebTransport is not exposed in this worker.",
      });
      return;
    }
    let transport;
    try {
      transport = new WebTransport(DEAD);
    } catch (e) {
      relay("constructor", e);
      return;
    }
    transport.closed.catch(() => {});
    try {
      await transport.ready;
      self.postMessage({ kind: "unexpected-ready" });
      transport.close();
    } catch (e) {
      relay("ready", e);
    }
  } else if (msg.cmd === "make") {
    if (typeof WebTransportError !== "function") {
      self.postMessage({
        kind: "unsupported",
        detail: "WebTransportError is not exposed in this worker.",
      });
      return;
    }
    const { how, error } = makeError(msg.message, msg.source, msg.code);
    self.postMessage({
      kind: "note",
      detail: "worker constructed the error via the " + how + " constructor",
    });
    relay("constructed", error);
  } else if (msg.cmd === "inspect") {
    const e = msg.error;
    self.postMessage({
      kind: "inspected",
      record: fields(e),
      isWTE: typeof WebTransportError === "function" && e instanceof WebTransportError,
      isDOMException: e instanceof DOMException,
    });
  }
});

self.addEventListener("messageerror", () => {
  self.postMessage({
    kind: "messageerror",
    detail: "the worker received a message it could not deserialize",
  });
});
