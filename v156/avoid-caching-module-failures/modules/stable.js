// A well-formed module. Successful module loads are cached in the module map
// (by design, in every Chrome), so importing the same URL twice produces
// exactly one network fetch. Used by the what-stays-cached concept and the
// conformance suite.
export const answer = 42;
export const loadedAt = performance.now();
