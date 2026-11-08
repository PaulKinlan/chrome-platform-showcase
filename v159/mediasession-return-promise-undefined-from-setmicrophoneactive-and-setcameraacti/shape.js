// Shared, side-effect-free helpers for the MediaSession Promise<undefined> demos.
// Exposed under one namespaced global so nothing collides with browser globals.
// Every helper reports what the API ACTUALLY returned — nothing is inferred or faked.
(() => {
  'use strict';

  // Cross-realm safe: a promise from a detached iframe is not `instanceof Promise`
  // in this realm, but its [[Class]] tag is still "Promise".
  function describe(value) {
    const tag = Object.prototype.toString.call(value);
    return {
      typeof: typeof value,
      instanceofPromise: value instanceof Promise,
      tag,
      isPromiseAnyRealm: tag === '[object Promise]',
      thenable: value != null && typeof value.then === 'function',
      ctor: value != null && value.constructor ? value.constructor.name : String(value),
    };
  }

  function errorText(error) {
    if (error == null) return String(error);
    const name = error.name || (error.constructor && error.constructor.name) || 'Error';
    return `${name}: ${error.message ?? ''}`.trim();
  }

  // Invoke fn with this/args and capture either a synchronous throw or the raw value.
  function invoke(fn, thisArg, args) {
    const t0 = performance.now();
    try {
      const value = fn.apply(thisArg, args);
      return { threw: false, value, shape: describe(value), syncMs: performance.now() - t0, t0 };
    } catch (error) {
      return { threw: true, error, errorName: error?.name, errorText: errorText(error), syncMs: performance.now() - t0, t0 };
    }
  }

  // Wait for a (possibly foreign-realm) promise to settle, with a timeout so a
  // promise whose reactions never run (detached realm) is reported, not hung on.
  function settle(value, t0, timeoutMs = 2000) {
    if (!(value != null && typeof value.then === 'function')) {
      return Promise.resolve({ state: 'not-a-promise' });
    }
    return new Promise((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        resolve({ state: 'pending-after-timeout', ms: performance.now() - t0, timeoutMs });
      }, timeoutMs);
      try {
        value.then(
          (v) => { if (done) return; done = true; clearTimeout(timer); resolve({ state: 'fulfilled', value: v, ms: performance.now() - t0 }); },
          (e) => { if (done) return; done = true; clearTimeout(timer); resolve({ state: 'rejected', error: e, errorName: e?.name, errorText: errorText(e), ms: performance.now() - t0 }); },
        );
      } catch (error) {
        done = true;
        clearTimeout(timer);
        resolve({ state: 'then-threw', errorText: errorText(error) });
      }
    });
  }

  function fmtValue(v) {
    if (v === undefined) return 'undefined';
    try { return JSON.stringify(v); } catch { return String(v); }
  }

  globalThis.__msPromiseShape = Object.freeze({ describe, errorText, invoke, settle, fmtValue });
})();
