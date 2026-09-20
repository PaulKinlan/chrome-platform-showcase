// A module with an OBSERVABLE, expensive top-level side effect. `import defer`
// loads and parses this module up front but does NOT run this top-level code
// until a property of the namespace is first accessed. The demos read
// globalThis.__importDeferLog to prove exactly when that happened.
//
// Served as a real ES module from inside the feature folder, so a browser that
// supports the `import defer` grammar exercises the genuine deferral timing.

const start = performance.now();

// A deliberately non-trivial synchronous cost, so the evaluation is measurable
// on the timeline rather than instantaneous.
let acc = 0;
for (let i = 0; i < 2_000_000; i++) acc += Math.sqrt(i);

const at = performance.now();
(globalThis.__importDeferLog ||= []).push({
  module: "expensive.js",
  event: "top-level-evaluated",
  at,
  cost: at - start,
});

export const ready = true;
export const checksum = Math.round(acc);
export function describe() {
  return "expensive.js evaluated at " + at.toFixed(1) + "ms (took " + (at - start).toFixed(1) + "ms of synchronous work)";
}
