// Static checks for the UA-parsing → UA-Client-Hints badge conversion
// (bead chrome_platform_showcase-6qi).
//
// Contract: the 11 v150 demo pages that used to regex-parse
// navigator.userAgent for a Chrome-version badge must now get the version
// from User-Agent Client Hints via the shared helper
// (public/chrome-compat.js) — or, where the badge states a capability with
// a spec-level surface, use capability detection instead — and must render
// an honest "version unknown" state when the browser reports no version.
//
// Run: deno task test-ua-badges

const REPO = new URL("..", import.meta.url).pathname;

function read(path) {
  return Deno.readTextFileSync(`${REPO}${path}`);
}

let failures = 0;
function check(label, ok) {
  if (ok) {
    console.log(`ok — ${label}`);
  } else {
    failures++;
    console.error(`FAIL — ${label}`);
  }
}

// Pages converted to the UA-CH helper. prototype-inspector is deliberately
// absent: its badge states a capability ('FontFaceSet' in window), not a
// version, so it uses spec-level detection and needs no helper.
const UA_CH_PAGES = [
  "v150/deprecate-and-remove-attribution-reporting-api/removal-timeline/index.html",
  "v150/focusgroup/api-console/index.html",
  "v150/focusgroup/grid-navigation/index.html",
  "v150/disable-svg-filters-on-plugins-and-iframes/clickjacking-replay/index.html",
  "v150/disable-svg-filters-on-plugins-and-iframes/sandbox-filter-test/index.html",
  "v150/disable-svg-filters-on-plugins-and-iframes/svg-filter-policy-tester/index.html",
  "v150/opaque-origin-for-data-urls/data-url-worker-test/index.html",
  "v150/opaque-origin-for-data-urls/origin-isolation-demo/index.html",
  "v150/opaque-origin-for-data-urls/migration-patterns/index.html",
  "v150/update-text-selection-on-mouseup-before-dispatching-click-event/event-sequence-visualizer/index.html",
  "v150/case-sensitive-anchor-name-matching-in-quirks-mode/anchor-matching-demo/index.html",
  "v150/case-sensitive-anchor-name-matching-in-quirks-mode/fragment-tester/index.html",
  "v150/deprecate-and-remove-related-website-sets-rws/rws-to-chips-migrator/index.html",
];

const ALL_PAGES = [
  ...UA_CH_PAGES,
  "v150/remove-legacynointerfaceobject-from-fontfaceset-idl/prototype-inspector/index.html",
];

for (const page of ALL_PAGES) {
  const html = read(page);
  check(
    `${page} does not parse navigator.userAgent`,
    !/navigator\.userAgent\b/.test(html),
  );
}

for (const page of UA_CH_PAGES) {
  const html = read(page);
  check(
    `${page} loads the UA-CH helper`,
    html.includes('<script src="/public/chrome-compat.js"></script>'),
  );
  check(
    `${page} reads the version via chromiumMajorVersion()`,
    /chromiumMajorVersion\(\)/.test(html),
  );
}

// Exact null-state strings per page. These pin the honest-unknown path by
// its RENDERED copy, not by a keyword: a regression that replaces the null
// branch with a guess (or a generic message) removes the exact string and
// fails the check. (Bead chrome_platform_showcase-gdn: the previous loose
// /unknown/ alternation was satisfied by an unrelated "unknown error"
// string in migration-patterns and pinned nothing.)
const HONEST_UNKNOWN_STRINGS = {
  "v150/deprecate-and-remove-attribution-reporting-api/removal-timeline/index.html":
    "(version unknown — no UA Client Hints)",
  "v150/focusgroup/api-console/index.html": "version unknown — focusgroup needs Chrome 150+",
  "v150/focusgroup/grid-navigation/index.html":
    "Browser version unknown</strong> (no UA Client Hints) — focusgroup needs Chrome 150+",
  "v150/disable-svg-filters-on-plugins-and-iframes/clickjacking-replay/index.html":
    "version unknown — visual check only",
  "v150/disable-svg-filters-on-plugins-and-iframes/sandbox-filter-test/index.html":
    "Browser version unknown (no UA Client Hints). Real same-origin, opaque-origin, and sandboxed iframes",
  "v150/disable-svg-filters-on-plugins-and-iframes/svg-filter-policy-tester/index.html":
    "Browser version unknown (no UA Client Hints) — real iframes are mounted below",
  "v150/opaque-origin-for-data-urls/data-url-worker-test/index.html":
    "Browser version unknown (no UA Client Hints) — run the test below to observe the actual data: worker origin behaviour.",
  "v150/opaque-origin-for-data-urls/origin-isolation-demo/index.html":
    "Browser version unknown (no UA Client Hints) — run the tests to see the actual behaviour",
  "v150/opaque-origin-for-data-urls/migration-patterns/index.html":
    "Browser version not reported (no UA Client Hints). Interpret the probes below from observed capability results.",
  "v150/update-text-selection-on-mouseup-before-dispatching-click-event/event-sequence-visualizer/index.html":
    "Browser version unknown (no UA Client Hints) — run the sequence below and compare the immediate vs deferred reads",
  "v150/case-sensitive-anchor-name-matching-in-quirks-mode/anchor-matching-demo/index.html":
    "Browser version not reported (no UA Client Hints). The page still compares this document with the real BackCompat iframe result.",
  "v150/case-sensitive-anchor-name-matching-in-quirks-mode/fragment-tester/index.html":
    "Browser version not reported (no UA Client Hints). The iframe still reports its real BackCompat fragment target.",
  "v150/deprecate-and-remove-related-website-sets-rws/rws-to-chips-migrator/index.html":
    "Browser version not reported (no UA Client Hints) — the grid above shows the real API presence in this browser.",
};

for (const page of UA_CH_PAGES) {
  const html = read(page);
  const expected = HONEST_UNKNOWN_STRINGS[page];
  if (!expected) {
    check(`${page} has an entry in HONEST_UNKNOWN_STRINGS`, false);
    continue;
  }
  check(
    `${page} renders its exact honest version-unknown string`,
    html.includes(expected),
  );
}

{
  const html = read(
    "v150/remove-legacynointerfaceobject-from-fontfaceset-idl/prototype-inspector/index.html",
  );
  check(
    "prototype-inspector badge uses spec-level capability detection",
    html.includes("'FontFaceSet' in window"),
  );
}

{
  const helper = read("public/chrome-compat.js");
  check(
    "public/chrome-compat.js reads UA Client Hints brands",
    /navigator.*userAgentData/.test(helper) && /brands/.test(helper),
  );
  check(
    "public/chrome-compat.js never parses the navigator.userAgent string",
    !/navigator\.userAgent\s*\.(match|includes|indexOf|split|startsWith|test|slice|substr)/.test(
      helper,
    ),
  );
  check(
    "public/chrome-compat.js returns null (honest unknown) without UA-CH",
    /return null/.test(helper),
  );
}

// ── Runtime behaviour of chromiumMajorVersion() ─────────────────────────────
// The honest-unknown path is the load-bearing claim of this fix: when the
// browser reports no Chromium version (no UA-CH, empty brands, or only
// GREASE entries), the helper must return null — never a guess. These stubs
// pin that contract so a regression fails here, not just in an ad-hoc
// browser run.
{
  await import("../public/chrome-compat.js");
  const stub = (value) =>
    Object.defineProperty(globalThis.navigator, "userAgentData", {
      value,
      configurable: true,
    });

  check(
    "chromiumMajorVersion() returns null with no UA-CH support",
    globalThis.chromiumMajorVersion() === null,
  );
  stub({ brands: [] });
  check(
    "chromiumMajorVersion() returns null for empty brands (spoofed/reduced UA)",
    globalThis.chromiumMajorVersion() === null,
  );
  stub({ brands: [{ brand: "Not_A Brand", version: "99" }] });
  check(
    "chromiumMajorVersion() ignores GREASE-only brand lists",
    globalThis.chromiumMajorVersion() === null,
  );
  stub({ brands: [{ brand: "Firefox", version: "144" }] });
  check(
    "chromiumMajorVersion() returns null for non-Chromium brands",
    globalThis.chromiumMajorVersion() === null,
  );
  stub({
    brands: [
      { brand: "Not_A Brand", version: "99" },
      { brand: "Google Chrome", version: "154" },
    ],
  });
  check(
    "chromiumMajorVersion() reads the real Chromium version past GREASE",
    globalThis.chromiumMajorVersion() === 154,
  );
  stub({ brands: [{ brand: "Chromium", version: "garbage" }] });
  check(
    "chromiumMajorVersion() returns null for an unparseable version",
    globalThis.chromiumMajorVersion() === null,
  );
}

if (failures > 0) {
  console.error(`\n${failures} UA-badge check(s) failed`);
  Deno.exit(1);
}
console.log("\nAll UA-badge checks passed");
