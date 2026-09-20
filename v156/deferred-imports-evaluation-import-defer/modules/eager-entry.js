// The eager counterpart to defer-entry.js: a plain namespace import. This
// parses everywhere, and evaluating this module runs expensive.js's top-level
// code IMMEDIATELY, before any property is accessed — the behaviour `import
// defer` lets you opt out of.
import * as ns from "./expensive.js?eager";

export { ns };
export const importedAt = performance.now();
