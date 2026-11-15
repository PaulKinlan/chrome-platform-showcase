// Shared helpers for the WebTransportError alignment concepts. Every probe
// calls the real constructor / structured-clone machinery and can return false.

export const DEAD = "https://127.0.0.1:44443/never";
export const U32_MAX = 4294967295;

export function hasCtor() {
  return typeof globalThis.WebTransportError === "function";
}

// The standard form: new WebTransportError(message, options).
// Supported only if the call does not throw AND the fields round-trip.
export function probeStandardCtor() {
  if (!hasCtor()) {
    return { ok: false, detail: "WebTransportError is " + typeof globalThis.WebTransportError };
  }
  try {
    const e = new WebTransportError("probe", { source: "session", streamErrorCode: 300 });
    const ok = e.message === "probe" && e.source === "session" && e.streamErrorCode === 300;
    return {
      ok,
      detail: ok
        ? 'new WebTransportError("probe", {source: "session", streamErrorCode: 300}) kept all three fields'
        : "constructed, but read back message=" + JSON.stringify(e.message) + ", source=" +
          JSON.stringify(e.source) + ", streamErrorCode=" + e.streamErrorCode,
    };
  } catch (error) {
    return { ok: false, detail: error.name + ": " + error.message };
  }
}

// The legacy Chromium form: new WebTransportError({message, streamErrorCode}).
export function probeLegacyCtor() {
  if (!hasCtor()) {
    return { ok: false, detail: "WebTransportError is " + typeof globalThis.WebTransportError };
  }
  try {
    const e = new WebTransportError({ message: "legacy", streamErrorCode: 7 });
    const ok = e.message === "legacy" && e.streamErrorCode === 7;
    return {
      ok,
      detail: ok
        ? 'new WebTransportError({message: "legacy", streamErrorCode: 7}) kept both fields'
        : "read back message=" + JSON.stringify(e.message) + ", streamErrorCode=" +
          e.streamErrorCode,
    };
  } catch (error) {
    return { ok: false, detail: error.name + ": " + error.message };
  }
}

// Build an error with whichever constructor this browser accepts. Reports
// which path ran and what (if anything) the legacy path could not carry.
export function make(message, options = {}) {
  const source = options.source ?? "stream";
  const code = options.streamErrorCode ?? null;
  if (probeStandardCtor().ok) {
    return {
      error: new WebTransportError(message, { source, streamErrorCode: code }),
      path: "standard",
      lost: [],
    };
  }
  const init = { message };
  if (code !== null) init.streamErrorCode = code;
  const error = new WebTransportError(init);
  const lost = [];
  if (error.source !== source) {
    lost.push(
      "source (asked " + JSON.stringify(source) + ", got " + JSON.stringify(error.source) + ")",
    );
  }
  if (error.streamErrorCode !== code) {
    lost.push("streamErrorCode (asked " + code + ", got " + error.streamErrorCode + ")");
  }
  return { error, path: "legacy", lost };
}

// Does structured cloning preserve a WebTransportError in this browser?
export function probeClone() {
  if (!hasCtor()) return { ok: false, detail: "no WebTransportError" };
  const { error } = make("clone probe", { source: "session", streamErrorCode: 42 });
  try {
    const c = structuredClone(error);
    const ok = c instanceof WebTransportError && c.message === error.message &&
      c.source === error.source &&
      c.streamErrorCode === error.streamErrorCode;
    return {
      ok,
      detail: ok
        ? "structuredClone() returned a WebTransportError with message, source and streamErrorCode intact"
        : "cloned to " + Object.prototype.toString.call(c) + " but fields differ: " +
          JSON.stringify(describe(c)),
    };
  } catch (e) {
    return { ok: false, detail: e.name + ": " + e.message };
  }
}

export function describe(e) {
  if (e == null || typeof e !== "object") return { value: String(e) };
  return {
    class: e.constructor?.name ?? Object.prototype.toString.call(e),
    isWebTransportError: hasCtor() && e instanceof WebTransportError,
    isDOMException: e instanceof DOMException,
    name: e.name,
    message: e.message,
    code: e.code,
    source: "source" in e ? e.source : undefined,
    streamErrorCode: "streamErrorCode" in e ? e.streamErrorCode : undefined,
  };
}

// Plain-object fallback for browsers that cannot clone the error itself.
export function toRecord(e) {
  return {
    __webTransportError: 1,
    message: e.message,
    source: e.source ?? "stream",
    streamErrorCode: e.streamErrorCode ?? null,
  };
}

export function fromRecord(r) {
  return make(r.message, { source: r.source, streamErrorCode: r.streamErrorCode });
}

// WebIDL [Clamp] unsigned long? conversion, as the spec's options dictionary
// declares it: null stays null, NaN → 0, clamp to [0, 2^32-1], round half to even.
export function specClamp(v) {
  if (v === null) return null;
  let x = Number(v);
  if (Number.isNaN(x)) return 0;
  x = Math.min(Math.max(x, 0), U32_MAX);
  const f = Math.floor(x);
  const diff = x - f;
  if (diff > 0.5) return f + 1;
  if (diff < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}

// draft-ietf-webtrans-http3 §4.3: application code → HTTP/3 error code on the wire.
export function toHttpCode(n) {
  if (n === null || n === undefined) return null;
  const b = BigInt(n);
  return 0x52e4a40fa8dbn + b + b / 0x1en;
}

export function show(v) {
  if (v === undefined) return "absent";
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  return String(v);
}
