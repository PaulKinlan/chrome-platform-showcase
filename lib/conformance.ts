// Conformance data model.
//
// Each feature can ship a `conformance.json` file listing assertions that
// describe what the spec actually promises. The conformance page loads the
// JSON in the visitor's browser, runs each assertion, and renders the verdict
// — so a Chrome stable, Chrome canary, Firefox, Safari visitor will each see
// a different shape of pass/fail. The rollup page lists assertions per
// feature; a future nightly job can drive headless browsers across the
// matrix to persist a cross-browser table.
//
// File location: v<N>/<feature-slug>/conformance.json
// Optional concept-level: v<N>/<feature-slug>/<concept-slug>/conformance.json

export type AssertionKind =
  // Feature-detection via CSS.supports. `test` is the string passed in.
  | "css-supports"
  // Feature-detection via property/method existence. `test` is a path
  // like "navigator.gpu" or "Window.prototype.scheduler".
  | "exists"
  // Type check: `test` is a path; `expect` is the expected `typeof` result
  // ("function", "object", "boolean", etc.).
  | "typeof"
  // Free-form script. `test` is a JS expression evaluated in the page's
  // global scope; the result is coerced to boolean. The expression should
  // be a single statement or an IIFE; throwing is treated as fail.
  | "script"
  // The expression must throw (`test` is a JS expression). Used for
  // "this should now be removed / blocked" checks.
  | "throws";

export interface ConformanceAssertion {
  // Slug-style id, unique per conformance file. Used in the URL fragment
  // when linking to a specific assertion result.
  id: string;
  // One short sentence describing the contract the spec asserts. Kept
  // human-readable; this is what the visitor sees on the conformance page.
  description: string;
  // Type-tagged check. See AssertionKind.
  kind: AssertionKind;
  // Test payload — semantics depend on kind.
  test: string;
  // For `typeof` checks only.
  expect?: string;
  // Optional spec section/URL anchor. Adds a link on the conformance page.
  specSection?: string;
  // Optional baseline expectation. If `expectedBrowsers` lists a browser,
  // the rollup expects that browser to pass this assertion. Useful for
  // cross-browser parity claims: e.g. "this should pass in Firefox too".
  expectedBrowsers?: string[];
}

export interface ConformanceSuite {
  // The release this suite is attached to.
  release: string;
  // The feature slug.
  featureSlug: string;
  // Optional concept slug for concept-level suites.
  conceptSlug?: string;
  // ChromeStatus id for the deep link.
  chromestatusId: number;
  // Canonical spec URL.
  specUrl?: string;
  // ISO timestamp the suite was generated.
  generatedAt: string;
  // Author/generator name (subagent id, "manual", etc.).
  author: string;
  // The assertions themselves. 3-10 is a healthy range; assertions should
  // cover the distinct contracts the spec text makes, not just one big
  // "does it exist" check.
  assertions: ConformanceAssertion[];
}

export function conformanceFilePath(
  release: string,
  featureSlug: string,
  conceptSlug?: string,
): string {
  if (conceptSlug) {
    return `${release}/${featureSlug}/${conceptSlug}/conformance.json`;
  }
  return `${release}/${featureSlug}/conformance.json`;
}

// Client-side runner: the script tag emitted by the conformance page uses
// the same kind tags. Keep these two in sync; the runtime lives in
// `renderConformancePage` in server.ts.
