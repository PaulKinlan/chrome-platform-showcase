// Uses the `import defer` grammar. On a browser that does not yet parse this
// syntax (anything before Chrome 156 / without --js-defer-import-eval) this
// module fails to PARSE, and dynamically importing it rejects with a
// SyntaxError — which is exactly how the demos feature-detect support honestly,
// rather than sniffing the version string.
//
// On a supporting browser, `expensive.js` is loaded and parsed now but its
// top-level code does NOT run until the first property access on `ns`.
import defer * as ns from "./expensive.js";

// Re-export the deferred namespace so the page can hold it and choose exactly
// when to touch it. Reading a property here would defeat the purpose, so we do
// not — we only forward the object.
export { ns };

// A helper the page calls to trigger evaluation deliberately, returning a value
// read from the (now-evaluated) module.
export function firstAccess() {
  return ns.ready; // this property GET is what triggers expensive.js to run
}

export function namespaceTag() {
  return ns[Symbol.toStringTag]; // "Deferred Module" per the proposal spec
}
