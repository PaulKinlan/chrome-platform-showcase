// Shared helpers for the WebTransportError alignment + serialization demos.
// Classic script (works in pages via <script src> and in workers via
// importScripts). Exposes globalThis.WTE. Every probe calls the exact
// surface it reports on and can return false.
(function (g) {
  'use strict';

  const has = () => typeof g.WebTransportError === 'function';

  // Read every field the spec + DOMException define, verbatim.
  function describe(e) {
    if (e === null || typeof e !== 'object') return { kind: 'non-object', value: String(e) };
    const W = has() ? g.WebTransportError : null;
    return {
      kind: W && e instanceof W ? 'WebTransportError instance'
        : (typeof DOMException === 'function' && e instanceof DOMException) ? 'DOMException (not WebTransportError)'
        : (e instanceof Error ? 'Error' : 'plain object'),
      constructorName: e.constructor ? e.constructor.name : '(none)',
      name: e.name,
      message: e.message,
      source: e.source,
      streamErrorCode: e.streamErrorCode,
      legacyCode: e.code,
      instanceofDOMException: typeof DOMException === 'function' && e instanceof DOMException,
      instanceofError: e instanceof Error,
      toString: (() => { try { return Object.prototype.toString.call(e) + ' / ' + String(e); } catch (x) { return '(toString threw)'; } })(),
    };
  }

  // Standard (message, options) constructor: real call, verbatim outcome.
  function tryStandard(message, options) {
    if (!has()) return { ok: false, error: { name: 'ReferenceError', message: 'WebTransportError is not defined in this context' } };
    try {
      const e = arguments.length >= 2 ? new g.WebTransportError(message, options) : new g.WebTransportError(message);
      return { ok: true, value: e };
    } catch (err) {
      return { ok: false, error: { name: err && err.name, message: err && err.message } };
    }
  }

  // Chromium's legacy dictionary constructor (kept as a compatibility overload).
  function tryLegacy(init) {
    if (!has()) return { ok: false, error: { name: 'ReferenceError', message: 'WebTransportError is not defined in this context' } };
    try {
      return { ok: true, value: new g.WebTransportError(init) };
    } catch (err) {
      return { ok: false, error: { name: err && err.name, message: err && err.message } };
    }
  }

  // Behavioural probe for the standard constructor: a browser that only has the
  // dictionary constructor throws TypeError; one that coerces the args
  // differently fails the field comparison. Can return false.
  function standardCtorSupported() {
    const r = tryStandard('probe', { source: 'session', streamErrorCode: 300 });
    return !!(r.ok && r.value.message === 'probe' && r.value.source === 'session' && r.value.streamErrorCode === 300);
  }

  // Behavioural probe for serialization: structuredClone must return a real
  // WebTransportError with all three fields intact (DataCloneError = false).
  function serializationSupported() {
    if (typeof g.structuredClone !== 'function') return false;
    const src = standardCtorSupported()
      ? new g.WebTransportError('clone-probe', { source: 'session', streamErrorCode: 4294967295 })
      : tryLegacy({ message: 'clone-probe', streamErrorCode: 7 }).value;
    if (!src) return false;
    try {
      const c = g.structuredClone(src);
      return c instanceof g.WebTransportError && c.message === src.message && c.source === src.source && c.streamErrorCode === src.streamErrorCode;
    } catch (err) {
      return false;
    }
  }

  // LABELLED FALLBACK wire shape for browsers whose serializer refuses
  // WebTransportError (DataCloneError). This is app code, not the platform.
  function toWire(e) {
    return { __wire: 'WebTransportError/v1', name: e.name, message: e.message, source: e.source, streamErrorCode: e.streamErrorCode };
  }
  // Rebuild from the wire shape with whichever constructor this browser has;
  // the result says which path was taken so the UI can label it.
  function fromWire(w) {
    if (standardCtorSupported()) {
      return { via: 'standard constructor', value: new g.WebTransportError(w.message, { source: w.source, streamErrorCode: w.streamErrorCode }) };
    }
    const init = { message: w.message };
    if (w.streamErrorCode !== null && w.streamErrorCode !== undefined) init.streamErrorCode = w.streamErrorCode;
    const r = tryLegacy(init);
    if (r.ok) return { via: 'legacy dictionary constructor (source is fixed to "stream"; codes clamp to 0-255)', value: r.value };
    return { via: 'plain object (no WebTransportError constructor usable)', value: w };
  }

  // Build an error the way an app would, preferring the standard form.
  function make(message, source, code) {
    if (standardCtorSupported()) {
      return { via: 'standard', value: new g.WebTransportError(message, { source: source, streamErrorCode: code }) };
    }
    const init = { message: message };
    if (code !== null && code !== undefined) init.streamErrorCode = code;
    const r = tryLegacy(init);
    return r.ok ? { via: 'legacy', value: r.value } : { via: 'none', value: null, error: r.error };
  }

  function fmt(v) {
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return JSON.stringify(v);
    return String(v);
  }

  g.WTE = { has, describe, tryStandard, tryLegacy, standardCtorSupported, serializationSupported, toWire, fromWire, make, fmt };
})(globalThis);
