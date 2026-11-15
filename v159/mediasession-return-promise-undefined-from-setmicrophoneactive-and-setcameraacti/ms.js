// Shared helpers for the v159 MediaSession Promise<undefined> demos.
//
// Spec (W3C Media Session, after w3c/mediasession#312):
//   Promise<undefined> setMicrophoneActive(boolean active);
//   Promise<undefined> setCameraActive(boolean active);
// - fully active document  -> a promise resolved with undefined
// - not fully active       -> a promise rejected with an InvalidStateError DOMException
// Before Chrome 159 Chromium's IDL said `undefined` (void): the call returned
// undefined synchronously and argument errors were thrown synchronously.
//
// Every observation here is taken from a real call. Thenables are detected by
// shape (typeof x.then === "function"), not `instanceof Promise`, because a
// detached iframe's method returns a promise from the IFRAME's realm.

export const SETTLE_TIMEOUT_MS = 1500;

/**
 * Call fn() and record EXACTLY what happened: a synchronous throw, the
 * return value's type, and — if it is a thenable — how it settled.
 */
export async function observeCall(fn) {
  const rec = {
    threwSync: false,
    syncError: null,
    returnType: null,
    isThenable: false,
    isPromiseThisRealm: false,
    settled: null, // "fulfilled" | "rejected" | "pending (timed out)"
    value: undefined,
    reason: null,
  };
  let ret;
  try {
    ret = fn();
  } catch (e) {
    rec.threwSync = true;
    rec.syncError = describeError(e);
    return rec;
  }
  rec.returnType = ret === null ? "null" : typeof ret;
  rec.isThenable = !!ret && typeof ret.then === "function";
  rec.isPromiseThisRealm = ret instanceof Promise;
  if (!rec.isThenable) return rec;
  let timer;
  const timeout = new Promise((r) => {
    timer = setTimeout(() => r("timeout"), SETTLE_TIMEOUT_MS);
  });
  const outcome = await Promise.race([
    Promise.resolve(ret).then(
      (v) => ({ s: "fulfilled", v }),
      (e) => ({ s: "rejected", e }),
    ),
    timeout,
  ]);
  clearTimeout(timer);
  if (outcome === "timeout") rec.settled = "pending (timed out)";
  else if (outcome.s === "fulfilled") {
    rec.settled = "fulfilled";
    rec.value = outcome.v;
  } else {
    rec.settled = "rejected";
    rec.reason = describeError(outcome.e);
  }
  return rec;
}

export function describeError(e) {
  if (e && typeof e === "object") {
    return {
      name: String(e.name),
      message: String(e.message),
      isDOMException: e?.constructor?.name === "DOMException",
    };
  }
  return { name: typeof e, message: String(e), isDOMException: false };
}

export function summarize(rec) {
  if (rec.threwSync) return `threw synchronously: ${rec.syncError.name}: ${rec.syncError.message}`;
  if (!rec.isThenable) {
    return `returned ${
      rec.returnType === "undefined" ? "undefined" : rec.returnType
    } (not a promise)`;
  }
  if (rec.settled === "fulfilled") {
    return `returned a Promise → fulfilled with ${
      rec.value === undefined ? "undefined" : JSON.stringify(rec.value)
    }`;
  }
  if (rec.settled === "rejected") {
    return `returned a Promise → rejected with ${rec.reason.name}: ${rec.reason.message}`;
  }
  return `returned a Promise → still pending after ${SETTLE_TIMEOUT_MS} ms`;
}

export function hasMediaSession() {
  return "mediaSession" in navigator &&
    typeof navigator.mediaSession?.setMicrophoneActive === "function";
}

export const SHIP_NOTE =
  "ChromeStatus lists this for Chrome 159 with no runtime flag: the IDL change is unconditional, so Chrome 158 and earlier always return undefined and there is nothing to enable. Safari 18.4+ already returns a promise.";
