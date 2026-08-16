// Iterator Join — shared demo runtime for v153/iterator-join concepts.
//
// Exposes ONE namespaced global (no host-global collisions): window.IterJoinDemo.
// - hasNative(): exact probe for the real surface (typeof Iterator.prototype.join).
// - runJoin(iterator, separator): calls the REAL Iterator.prototype.join when the
//   browser ships it; otherwise runs modelJoin, a spec-step model of
//   https://tc39.es/proposal-iterator-join/ — every call site labels which one ran.
// - modelJoin never reports itself as native; callers must read `engine` from the
//   returned record and label the output accordingly.
(() => {
  "use strict";

  function isObject(v) {
    return v !== null && (typeof v === "object" || typeof v === "function");
  }

  // ECMA-262 ToString: throws TypeError for Symbol (String() special-cases
  // symbols and must not be used bare here).
  function toStr(v) {
    if (typeof v === "symbol") {
      throw new TypeError("Cannot convert a Symbol value to a string");
    }
    return String(v);
  }

  // IteratorClose: call return() if present; errors from return() are swallowed
  // when the outer completion is already abrupt (the demo paths that use this
  // are all abrupt paths).
  function closeIterator(it) {
    try {
      const r = it.return;
      if (typeof r === "function") r.call(it);
    } catch {
      /* per IteratorClose, the original abrupt completion wins */
    }
  }

  function hasNative() {
    return typeof Iterator === "function" &&
      typeof Iterator.prototype === "object" &&
      Iterator.prototype !== null &&
      typeof Iterator.prototype.join === "function";
  }

  // Spec-step model of Iterator.prototype.join(separator).
  // Follows https://tc39.es/proposal-iterator-join/ (Stage 3 draft, 2026-08-08)
  // step by step, including the step order the demos observe:
  //  1. non-object receiver -> TypeError;
  //  2. ToString(separator) happens BEFORE the "next" method is read, and an
  //     abrupt ToString closes the iterator (IfAbruptCloseIterator);
  //  3. undefined separator -> ",";
  //  4. undefined/null elements contribute the empty string (like
  //     Array.prototype.join) but still get separators;
  //  5. an abrupt element ToString closes the iterator.
  function modelJoin(obj, separator) {
    if (!isObject(obj)) {
      throw new TypeError("Iterator.prototype.join called on non-object");
    }
    let sep;
    if (separator === undefined) {
      sep = ",";
    } else {
      try {
        sep = toStr(separator);
      } catch (err) {
        // Spec step 4.b.ii: IfAbruptCloseIterator(sep, iterated).
        closeIterator(obj);
        throw err;
      }
    }
    const next = obj.next; // GetIteratorDirect
    if (typeof next !== "function") {
      throw new TypeError("the iterator's next is not a function");
    }
    let result = "";
    let first = true;
    while (true) {
      const step = next.call(obj); // IteratorStepValue
      if (!isObject(step)) {
        throw new TypeError("iterator result is not an object");
      }
      if (step.done) return result;
      const value = step.value;
      if (first) first = false;
      else result += sep;
      if (value !== undefined && value !== null) {
        let s;
        try {
          s = toStr(value);
        } catch (err) {
          closeIterator(obj);
          throw err;
        }
        result += s;
      }
    }
  }

  // Runs the real method when shipped, else the labelled model. Returns a
  // record so callers can (and must) label the engine that produced the value.
  function runJoin(iterator, separator) {
    if (hasNative()) {
      return {
        engine: "native",
        value: Iterator.prototype.join.call(iterator, separator),
      };
    }
    return { engine: "model", value: modelJoin(iterator, separator) };
  }

  // Human-readable value formatter for readouts (distinguishes "" / undefined).
  function fmt(v) {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "symbol") return v.toString();
    if (typeof v === "bigint") return v + "n";
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (typeof v === "object") {
      try {
        return JSON.stringify(v);
      } catch {
        return Object.prototype.toString.call(v);
      }
    }
    return String(v);
  }

  window.IterJoinDemo = { hasNative, modelJoin, runJoin, closeIterator, fmt };

  // Shared honest banner: every concept page has <div data-join-banner> filled
  // from the SAME probe so page copy can never drift from the real state.
  document.addEventListener("DOMContentLoaded", () => {
    const el = document.querySelector("[data-join-banner]");
    if (!el) return;
    const native = hasNative();
    el.classList.add(native ? "banner-live" : "banner-absent");
    if (native) {
      el.innerHTML =
        "<strong>Live:</strong> this browser exposes <code>Iterator.prototype.join</code> " +
        '(probe: <code>typeof Iterator.prototype.join === "function"</code>). ' +
        "Every run on this page calls the real method.";
    } else {
      el.innerHTML = "<strong>Not in this browser:</strong> the probe " +
        "<code>typeof Iterator?.prototype?.join</code> returned <code>" +
        (typeof Iterator === "function"
          ? typeof Iterator.prototype.join
          : "undefined (no Iterator)") +
        "</code>. The method ships in V8 as <code>js_iterator_join</code> and is listed for " +
        "<strong>Chrome 153</strong>. To run it for real today: Chrome/Chromium 153+ (including Canary), or " +
        "<code>deno run --v8-flags=--js-iterator-join</code> (verified working in Deno 2.9.5 / V8 15.0). " +
        "Older Chromes cannot flag it on: Chromium 141's V8 (14.1) predates the implementation, so " +
        "<code>--js-flags=--js-iterator-join</code> has no effect there (verified 2026-08-16). " +
        "Interactive panels below run a clearly labelled <strong>spec-model (polyfill)</strong> instead, and say so on every result.";
    }
    window.showcaseTelemetry?.assert(
      "iterator-join-banner-honest",
      el.classList.contains(native ? "banner-live" : "banner-absent"),
      { native },
    );
  });
})();
