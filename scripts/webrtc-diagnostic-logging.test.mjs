// Focused contract checks for the v150 WebRTC Diagnostic Logging demos
// (bead chrome_platform_showcase-p4m).
//
// The WICG/WebRTC-Extensions spec was rewritten (2026-07-27): the API moved off
// `navigator.rtc` onto static methods on `RTCPeerConnection`, `finishDiagnosticLogging`
// became `stopDiagnosticLogging`, `allowUpload` was dropped, the calls became
// synchronous, and the spec now names one TypeError (metadata limits) and three
// InvalidStateError contracts. These assertions encode that surface so the demos
// and the conformance contract cannot silently drift back to the old one.
//
// Run: deno task test-webrtc-diagnostic-logging

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

const FEATURE = "v150/webrtc-diagnostic-logging-api";
const ROUTES = [
  `${FEATURE}/index.html`,
  `${FEATURE}/logging-lifecycle/index.html`,
  `${FEATURE}/bug-report-companion/index.html`,
  `${FEATURE}/capability-policy-probe/index.html`,
];
const CANONICAL_SPEC = "https://w3c.github.io/webrtc-extensions/#diagnostic-logging";
const STATIC_METHODS = [
  "startDiagnosticLogging",
  "stopDiagnosticLogging",
  "cancelDiagnosticLogging",
];

const conformanceRaw = read(`${FEATURE}/conformance.json`);
const conformance = JSON.parse(conformanceRaw);

// ── 1. The conformance contract points at the current, canonical spec ─────────
check(
  "conformance.json specUrl is the canonical WebRTC Extensions diagnostic-logging spec",
  typeof conformance.specUrl === "string" && conformance.specUrl.startsWith(CANONICAL_SPEC),
);

check(
  "conformance.json carries 3-10 assertions",
  Array.isArray(conformance.assertions) &&
    conformance.assertions.length >= 3 &&
    conformance.assertions.length <= 10,
);

check(
  "every assertion specSection is anchored in the canonical spec",
  conformance.assertions.every(
    (a) => typeof a.specSection === "string" && a.specSection.startsWith(CANONICAL_SPEC),
  ),
);

// ── 2. Assertion *tests* probe the new static surface, not the old Navigator one ─
// Descriptions may legitimately name what the rewrite removed; only the
// executable `test` payloads are held to the current surface.
const assertionTests = conformance.assertions.map((a) => String(a.test)).join("\n");

for (const method of STATIC_METHODS) {
  check(
    `conformance contract probes RTCPeerConnection.${method}`,
    assertionTests.includes(`RTCPeerConnection.${method}`),
  );
}

check(
  "no conformance assertion *test* references the removed navigator.rtc binding",
  !assertionTests.includes("navigator.rtc"),
);

check(
  "no conformance assertion *test* references the removed finishDiagnosticLogging method",
  !assertionTests.includes("finishDiagnosticLogging"),
);

check(
  "no conformance assertion *test* references the removed allowUpload option",
  !/allowUpload/.test(assertionTests),
);

// ── 3. The spec's error contracts are represented ────────────────────────────
check(
  "the metadata limit is asserted as a TypeError",
  /TypeError/.test(assertionTests),
);

check(
  "the three InvalidStateError contracts are asserted",
  (conformanceRaw.match(/InvalidStateError/g) ?? []).length >= 3,
);

// ── 4. The demos call only the current surface ───────────────────────────────
// Prose and the honest legacy-surface detection (a `typeof ... === "function"`
// check) are allowed; *calling* a removed method, or passing the removed
// allowUpload option, is not.
function scripts(html) {
  return [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
}

for (const route of ROUTES) {
  const html = read(route);
  const code = scripts(html);
  check(`${route} references RTCPeerConnection`, /RTCPeerConnection/.test(html));
  check(
    `${route} never calls the removed finishDiagnosticLogging method`,
    !/\.finishDiagnosticLogging\s*\(/.test(code),
  );
  check(
    `${route} never passes the removed allowUpload option`,
    !/allowUpload\s*[:=]/.test(code),
  );
  check(
    `${route} never calls the pre-rewrite navigator.rtc methods`,
    !/navigator\.rtc\.(start|finish|cancel)DiagnosticLogging\s*\(/.test(code),
  );
  check(
    `${route} does not await the (now synchronous) diagnostic-logging methods`,
    !/await\s+[\w.$]*\.?(start|stop|cancel)DiagnosticLogging/.test(code),
  );
}

// ── 5. Each demo feature-detects the static surface honestly ─────────────────
for (const route of ROUTES.slice(1)) {
  const html = read(route);
  check(
    `${route} feature-detects a current static method`,
    STATIC_METHODS.some((m) => html.includes(`${m}`)) && /RTCPeerConnection/.test(html),
  );
}

const probe = read(`${FEATURE}/capability-policy-probe/index.html`);
check(
  "capability probe names the pre-rewrite navigator.rtc surface as legacy, not as present",
  probe.includes("pre-rewrite") && /"rtc" in navigator/.test(probe),
);

// ── 6. The feature index links the canonical spec ────────────────────────────
const index = read(`${FEATURE}/index.html`);
check(
  "feature index links the canonical spec URL",
  index.includes("https://w3c.github.io/webrtc-extensions/#diagnostic-logging"),
);
check(
  "feature index still links the ChromeStatus entry",
  index.includes("https://chromestatus.com/feature/5091582546149376"),
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  Deno.exit(1);
}
console.log("\nPASS — WebRTC diagnostic logging contract");
