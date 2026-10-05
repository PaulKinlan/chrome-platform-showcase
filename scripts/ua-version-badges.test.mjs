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
  check(
    `${page} has an honest version-unknown state`,
    /ver(?:sion)? === null|unknown/.test(html),
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

if (failures > 0) {
  console.error(`\n${failures} UA-badge check(s) failed`);
  Deno.exit(1);
}
console.log("\nAll UA-badge checks passed");
