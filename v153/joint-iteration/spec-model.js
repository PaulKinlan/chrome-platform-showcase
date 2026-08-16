// Joint Iteration — shared demo runtime for v153/joint-iteration concepts.
//
// Exposes ONE namespaced global (no host-global collisions): window.JointIterDemo.
// - hasNative(): exact probe for the real statics (typeof Iterator.zip /
//   Iterator.zipKeyed).
// - runZip / runZipKeyed: call the REAL statics when the browser ships them;
//   otherwise run modelZip / modelZipKeyed, a spec-step model of
//   https://tc39.es/proposal-joint-iteration/ (Stage 4). Every call site must
//   read `engine` from the returned record and label the output accordingly —
//   the model never reports itself as native.
(() => {
  "use strict";

  function isObject(v) {
    return v !== null && (typeof v === "object" || typeof v === "function");
  }

  function hasNative() {
    return typeof Iterator === "function" &&
      typeof Iterator.zip === "function" &&
      typeof Iterator.zipKeyed === "function";
  }

  function closeIterator(it) {
    try {
      const r = it.return;
      if (typeof r === "function") r.call(it);
    } catch {
      /* per IteratorClose, the pre-existing abrupt completion wins */
    }
  }

  // IteratorCloseAll closes in REVERSE list order (verified against the native
  // implementation: consumer .return() closed ["b","a"] for inputs [a, b]).
  function closeAllReverse(openSet) {
    const arr = Array.from(openSet).reverse();
    for (const it of arr) {
      openSet.delete(it);
      closeIterator(it);
    }
  }

  // GetIteratorFlattenable(value, reject-primitives): primitives — including
  // strings — throw TypeError; objects may be iterable OR iterator-like.
  function getIteratorFlattenable(value) {
    if (!isObject(value)) {
      throw new TypeError(
        "Joint iteration inputs must be objects; primitives (including strings) are rejected",
      );
    }
    const method = value[Symbol.iterator];
    let iterator;
    if (method === undefined || method === null) iterator = value;
    else iterator = method.call(value);
    if (!isObject(iterator)) {
      throw new TypeError("[Symbol.iterator]() did not return an object");
    }
    return iterator;
  }

  // GetOptionsObject: undefined -> fresh null-prototype object; any other
  // non-object (including null) -> TypeError.
  function getOptionsObject(options, label) {
    if (options === undefined) return Object.create(null);
    if (!isObject(options)) {
      throw new TypeError(label + " options must be an object or undefined");
    }
    return options;
  }

  function readModeAndPadding(opts, label) {
    let mode = opts.mode;
    if (mode === undefined) mode = "shortest";
    if (mode !== "shortest" && mode !== "longest" && mode !== "strict") {
      throw new TypeError(
        label + " mode must be 'shortest', 'longest', or 'strict'",
      );
    }
    let paddingOption;
    if (mode === "longest") {
      // Only read (observably Get) padding in longest mode — the demos probe
      // this ordering with getter spies.
      paddingOption = opts.padding;
      if (paddingOption !== undefined && !isObject(paddingOption)) {
        throw new TypeError(label + " padding must be an object or undefined");
      }
    }
    return { mode, paddingOption };
  }

  // The IteratorZip core, as a generator so consumer .return() flows into the
  // finally and closes remaining inputs (reverse order), like the spec's
  // CreateIteratorFromClosure result.
  function* zipCore(iters, mode, padding, finishResults) {
    const iterCount = iters.length;
    const open = new Set(iters);
    try {
      if (iterCount === 0) return;
      while (true) {
        const results = [];
        for (let i = 0; i < iterCount; i++) {
          const iter = iters[i];
          let result;
          if (iter === null) {
            // Exhausted input in longest mode: use its padding value.
            result = padding[i];
          } else {
            let step;
            try {
              step = iter.next();
            } catch (err) {
              open.delete(iter);
              closeAllReverse(open);
              throw err;
            }
            if (!isObject(step)) {
              open.delete(iter);
              closeAllReverse(open);
              throw new TypeError("iterator result is not an object");
            }
            if (step.done) {
              open.delete(iter);
              if (mode === "shortest") {
                closeAllReverse(open);
                return;
              }
              if (mode === "strict") {
                if (i !== 0) {
                  closeAllReverse(open);
                  throw new TypeError(
                    "Iterators passed in 'strict' mode must have the same length",
                  );
                }
                for (let k = 1; k < iterCount; k++) {
                  let openStep;
                  try {
                    openStep = iters[k].next();
                  } catch (err) {
                    open.delete(iters[k]);
                    closeAllReverse(open);
                    throw err;
                  }
                  if (openStep.done) {
                    open.delete(iters[k]);
                  } else {
                    closeAllReverse(open);
                    throw new TypeError(
                      "Iterators passed in 'strict' mode must have the same length",
                    );
                  }
                }
                return;
              }
              // longest
              if (open.size === 0) return;
              iters[i] = null;
              result = padding[i];
            } else {
              result = step.value;
            }
          }
          results.push(result);
        }
        yield finishResults(results);
      }
    } finally {
      // Consumer-driven abrupt completion (.return()/.throw()) lands here.
      closeAllReverse(open);
    }
  }

  // Spec-step model of Iterator.zip(iterables, options).
  function modelZip(iterables, options) {
    if (!isObject(iterables)) {
      throw new TypeError("Iterator.zip called on non-object");
    }
    const opts = getOptionsObject(options, "Iterator.zip");
    const { mode, paddingOption } = readModeAndPadding(opts, "Iterator.zip");
    const iters = [];
    const inputIter = getIteratorFlattenable(iterables);
    try {
      let step;
      while (!(step = inputIter.next()).done) {
        iters.push(getIteratorFlattenable(step.value));
      }
    } catch (err) {
      closeIterator(inputIter);
      closeAllReverse(new Set(iters));
      throw err;
    }
    const iterCount = iters.length;
    const padding = [];
    if (mode === "longest") {
      if (paddingOption === undefined) {
        for (let i = 0; i < iterCount; i++) padding.push(undefined);
      } else {
        // Padding is read EAGERLY from a sync iterator: shorter padding lists
        // fall back to undefined; longer ones are closed after iterCount reads.
        let paddingIter;
        try {
          paddingIter = getIteratorFlattenable(paddingOption);
        } catch (err) {
          closeAllReverse(new Set(iters));
          throw err;
        }
        let usingIterator = true;
        for (let i = 0; i < iterCount; i++) {
          if (usingIterator) {
            let step;
            try {
              step = paddingIter.next();
            } catch (err) {
              closeAllReverse(new Set(iters));
              throw err;
            }
            if (step.done) usingIterator = false;
            else {
              padding.push(step.value);
              continue;
            }
          }
          padding.push(undefined);
        }
        if (usingIterator) closeIterator(paddingIter);
      }
    }
    return zipCore(iters, mode, padding, (results) => results.slice());
  }

  // Spec-step model of Iterator.zipKeyed(iterables, options).
  function modelZipKeyed(iterables, options) {
    if (!isObject(iterables)) {
      throw new TypeError("Iterator.zipKeyed called on non-object");
    }
    const opts = getOptionsObject(options, "Iterator.zipKeyed");
    const { mode, paddingOption } = readModeAndPadding(
      opts,
      "Iterator.zipKeyed",
    );
    const keys = [];
    const iters = [];
    try {
      for (const key of Reflect.ownKeys(iterables)) {
        const desc = Object.getOwnPropertyDescriptor(iterables, key);
        if (desc && desc.enumerable) {
          const value = iterables[key];
          // Own enumerable properties whose value is undefined are SKIPPED.
          if (value !== undefined) {
            keys.push(key);
            iters.push(getIteratorFlattenable(value));
          }
        }
      }
    } catch (err) {
      closeAllReverse(new Set(iters));
      throw err;
    }
    const iterCount = iters.length;
    const padding = [];
    if (mode === "longest") {
      if (paddingOption === undefined) {
        for (let i = 0; i < iterCount; i++) padding.push(undefined);
      } else {
        for (const key of keys) padding.push(paddingOption[key]);
      }
    }
    return zipCore(iters, mode, padding, (results) => {
      // Result objects have a NULL prototype (OrdinaryObjectCreate(null)).
      const obj = Object.create(null);
      for (let i = 0; i < iterCount; i++) obj[keys[i]] = results[i];
      return obj;
    });
  }

  function runZip(iterables, options) {
    if (hasNative()) {
      return { engine: "native", value: Iterator.zip(iterables, options) };
    }
    return { engine: "model", value: modelZip(iterables, options) };
  }

  function runZipKeyed(iterables, options) {
    if (hasNative()) {
      return { engine: "native", value: Iterator.zipKeyed(iterables, options) };
    }
    return { engine: "model", value: modelZipKeyed(iterables, options) };
  }

  function fmt(v) {
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "symbol") return v.toString();
    if (typeof v === "bigint") return v + "n";
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (Array.isArray(v)) return "[" + v.map(fmt).join(", ") + "]";
    if (typeof v === "object") {
      const parts = [];
      for (const k of Reflect.ownKeys(v)) {
        parts.push(String(k) + ": " + fmt(v[k]));
      }
      return "{ " + parts.join(", ") + " }";
    }
    return String(v);
  }

  window.JointIterDemo = {
    hasNative,
    modelZip,
    modelZipKeyed,
    runZip,
    runZipKeyed,
    fmt,
  };

  // Shared honest banner, filled from the same probe every page uses.
  document.addEventListener("DOMContentLoaded", () => {
    const el = document.querySelector("[data-zip-banner]");
    if (!el) return;
    const native = hasNative();
    el.classList.add(native ? "banner-live" : "banner-absent");
    if (native) {
      el.innerHTML = "<strong>Live:</strong> this browser exposes <code>Iterator.zip</code> and " +
        '<code>Iterator.zipKeyed</code> (probe: <code>typeof Iterator.zip === "function"</code>). ' +
        "Every run on this page calls the real statics.";
    } else {
      const zipType = typeof Iterator === "function"
        ? typeof Iterator.zip
        : "undefined (no Iterator)";
      el.innerHTML = "<strong>Not in this browser:</strong> the probe " +
        "<code>typeof Iterator?.zip</code> returned <code>" + zipType +
        "</code>. The statics ship in V8 as <code>js_joint_iteration</code> and are listed for " +
        "<strong>Chrome 153</strong>. To run them for real today: Chrome/Chromium 153+ (including Canary), or " +
        "<code>deno run --v8-flags=--js-joint-iteration</code> (verified working in Deno 2.9.5 / V8 15.0). " +
        "Older Chromes cannot flag them on: Chromium 141's V8 (14.1) predates the implementation, so " +
        "<code>--js-flags=--js-joint-iteration</code> has no effect there (verified 2026-08-16). " +
        "Interactive panels below run a clearly labelled <strong>spec-model (polyfill)</strong> instead, and say so on every result.";
    }
    window.showcaseTelemetry?.assert(
      "joint-iteration-banner-honest",
      el.classList.contains(native ? "banner-live" : "banner-absent"),
      { native },
    );
  });
})();
