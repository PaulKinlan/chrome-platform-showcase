// UA-parsing → UA-Client-Hints badge conversion (bead chrome_platform_showcase-6qi).
//
// Contract: the demo pages that used to regex-parse navigator.userAgent for a
// Chrome-version badge now get the version from User-Agent Client Hints via the
// shared helper (public/chrome-compat.js) — or, where the badge states a
// capability with a spec-level surface, use capability detection instead — and
// must render an honest "version unknown" state when the browser reports no
// version.
//
// Two layers, because they can fail in different ways (bead kz8):
//
//   1. BEHAVIOUR — the helper is loaded and chromiumMajorVersion() is called
//      for each browser the badge has to get right (no UA-CH, reduced/spoofed
//      brand lists, GREASE decoys, non-Chromium, unparseable and absent
//      versions). This is the load-bearing part: it asserts what the function
//      returns, not what the source looks like.
//   2. STATIC GUARDS — labelled as static. They pin wiring (page loads the
//      helper, calls it, never parses navigator.userAgent) and the rendered
//      honest-unknown copy. Copy is not behaviour, so the guard is only as good
//      as how tightly it is scoped: the page list below is checked for
//      COMPLETENESS against the tree, so a page wired to the helper but missing
//      from the list fails rather than silently losing its assertion.
//
// Migrated in place to ONE async native Deno.test case (Stage 20 of the dty
// proposal, bead chrome_platform_showcase-dty.27), under the dty.19 policy for
// this class of suite: the non-throwing `check(label, ok, detail)` helper, the
// `failures` counter, the thirteen bodies in their original order and the
// failure and success wording all survive, so a run still reports EVERY failing
// subject rather than the first, and no check became a throwing assert. The case
// is async because its body is: the early `pagesLoadingHelper()` recursive
// directory walk and every page read now run inside the case, the behaviour
// section still does its `await import("../public/chrome-compat.js")` at the
// same point in the sequence, and the `withNavigator` stub of
// `globalThis.navigator` - installed and restored around each behaviour case by
// its `finally` - still wraps exactly the same calls. Running them inside the
// case means a read or import failure fails the case loudly instead of aborting
// the module before any check could report, and the trailing `Deno.exit(1)`
// became the counter's failure message because exiting inside a case kills the
// test process before Deno can report it.
//
// Run: deno task test-ua-badges

const REPO = new URL("..", import.meta.url).pathname;

function read(path) {
  return Deno.readTextFileSync(`${REPO}${path}`);
}

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) {
    console.log(`ok — ${label}`);
  } else {
    failures++;
    console.error(`FAIL — ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

Deno.test("the UA badge reads Client Hints, never the UA string, and stays honest when the version is unknown", async () => {
  const HELPER_TAG = '<script src="/public/chrome-compat.js"></script>';

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

  // Every published page that loads the helper, discovered from the tree rather
  // than listed here, so the two can be compared in both directions.
  function pagesLoadingHelper(dir = "v150") {
    const found = [];
    for (const entry of Deno.readDirSync(`${REPO}${dir}`)) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory) found.push(...pagesLoadingHelper(path));
      else if (entry.name === "index.html" && read(path).includes(HELPER_TAG)) found.push(path);
    }
    return found.sort();
  }

  // ── Static guard: the page list is exactly the pages wired to the helper ────
  {
    const discovered = pagesLoadingHelper();
    const listed = [...UA_CH_PAGES].sort();
    const missing = discovered.filter((page) => !listed.includes(page));
    const dead = listed.filter((page) => !discovered.includes(page));
    check(
      "UA_CH_PAGES lists every page that loads the helper, and no others",
      missing.length === 0 && dead.length === 0,
      `pages loading the helper but not listed: ${missing.join(", ") || "(none)"}; ` +
        `listed but not loading it: ${dead.join(", ") || "(none)"}`,
    );
  }

  // ── Static guards: wiring and the absence of UA-string parsing ──────────────
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
      html.includes(HELPER_TAG),
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
  //
  // This is a STATIC copy guard, deliberately: the string it wants is produced by
  // per-page inline script against a real browser's UA-CH, and that is what the
  // behaviour layer above covers for the shared half. Keep it — it is the only
  // thing pinning the wording a user is shown — but treat it as copy, not proof.
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
    check(`${page} has an entry in HONEST_UNKNOWN_STRINGS`, Boolean(expected));
    if (!expected) continue;
    check(
      `${page} renders its exact honest version-unknown string`,
      html.includes(expected),
      `expected the rendered copy to contain: ${JSON.stringify(expected)}`,
    );
  }

  {
    const stray = Object.keys(HONEST_UNKNOWN_STRINGS).filter((page) => !UA_CH_PAGES.includes(page));
    check(
      "HONEST_UNKNOWN_STRINGS has no entry for a page that is not listed",
      stray.length === 0,
      `entries with no page in UA_CH_PAGES: ${stray.join(", ")}`,
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

  // ── Behaviour: what chromiumMajorVersion() actually returns ─────────────────
  // The honest-unknown path is the load-bearing claim of this fix: when the
  // browser reports no Chromium version (no UA-CH, empty or unparseable brands,
  // or only GREASE entries), the helper must return null — never a guess. This
  // drives the real helper with a stubbed navigator; each case names the
  // regression it catches, so the suite fails on behaviour rather than on a
  // string in the source.
  {
    await import("../public/chrome-compat.js");

    // Deno's own navigator has no userAgentData, so this is the real "browser
    // without UA-CH" case before anything is stubbed.
    check(
      "chromiumMajorVersion() returns null for a browser with no UA-CH support",
      globalThis.chromiumMajorVersion() === null,
      `got ${JSON.stringify(globalThis.chromiumMajorVersion())}`,
    );

    // Replace the whole navigator for a case and restore the real one after: the
    // real Navigator instance exposes userAgentData as a getter-only property, so
    // a stub has to be a different object, and leaving one installed would leak
    // into every later case.
    const REAL_NAVIGATOR = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    function withNavigator(navigatorValue, fn) {
      Object.defineProperty(globalThis, "navigator", {
        value: navigatorValue,
        configurable: true,
        writable: true,
      });
      try {
        return fn();
      } finally {
        Object.defineProperty(globalThis, "navigator", REAL_NAVIGATOR);
      }
    }

    const cases = [
      ["no userAgentData at all", {}, null],
      ["userAgentData present but brands absent", { userAgentData: {} }, null],
      ["brands is not an array", { userAgentData: { brands: "Google Chrome" } }, null],
      ["empty brands (reduced UA)", { userAgentData: { brands: [] } }, null],
      [
        "GREASE-only brand list",
        { userAgentData: { brands: [{ brand: "Not_A Brand", version: "99" }] } },
        null,
      ],
      [
        "non-Chromium brands",
        { userAgentData: { brands: [{ brand: "Firefox", version: "144" }] } },
        null,
      ],
      [
        "Google Chrome",
        { userAgentData: { brands: [{ brand: "Google Chrome", version: "154" }] } },
        154,
      ],
      ["Chromium", { userAgentData: { brands: [{ brand: "Chromium", version: "120" }] } }, 120],
      [
        "Microsoft Edge",
        { userAgentData: { brands: [{ brand: "Microsoft Edge", version: "121" }] } },
        121,
      ],
      [
        "real version sitting behind a GREASE decoy",
        {
          userAgentData: {
            brands: [
              { brand: "Not_A Brand", version: "99" },
              { brand: "Google Chrome", version: "154" },
            ],
          },
        },
        154,
      ],
      [
        "unparseable version string",
        { userAgentData: { brands: [{ brand: "Chromium", version: "garbage" }] } },
        null,
      ],
      [
        "major version 0 (a falsy version is not a version)",
        { userAgentData: { brands: [{ brand: "Google Chrome", version: "0" }] } },
        null,
      ],
      [
        "brand entry with no version at all",
        { userAgentData: { brands: [{ brand: "Google Chrome" }] } },
        null,
      ],
    ];

    for (const [name, navigatorValue, expected] of cases) {
      const got = withNavigator(navigatorValue, () => globalThis.chromiumMajorVersion());
      check(
        `chromiumMajorVersion() with ${name} returns ${JSON.stringify(expected)}`,
        got === expected,
        `got ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`,
      );
    }
  }

  // The legacy tail exited the process on a non-zero counter. `Deno.exit(1)` cannot
  // live inside a case - it kills the test process before Deno can report the case -
  // so the counter is carried into the failure message instead: every failing label
  // above has already printed, and this makes the case fail loudly with the same
  // wording the guard used before the migration.
  if (failures > 0) throw new Error(`${failures} UA-badge check(s) failed`);
  console.log("\nAll UA-badge checks passed");
});
