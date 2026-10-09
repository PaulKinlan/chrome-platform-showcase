// Focused contract checks for the v150 WebRTC Diagnostic Logging demos
// (bead chrome_platform_showcase-p4m).
//
// The WICG/WebRTC-Extensions spec was rewritten (2026-07-27): the API moved off
// `navigator.rtc` onto static methods on `RTCPeerConnection`,
// `finishDiagnosticLogging` became `stopDiagnosticLogging`, `allowUpload` was
// dropped, the calls became synchronous, and the spec now names one TypeError
// (metadata limits) and three InvalidStateError contracts. These assertions
// encode that surface so the demos and the conformance contract cannot silently
// drift back to the old one.
//
// The load-bearing layer (bead kz8) EXECUTES the conformance payloads with the
// same evaluator the browser sweep uses (public/conformance-runner.js) against
// two mocks: the post-rewrite static surface the spec defines, and the
// pre-rewrite surface the payloads must reject. That is what makes the contract
// a behaviour claim rather than a grep — and it means a payload that stops
// discriminating (one that returns true unconditionally, say) fails the second
// run instead of passing forever. The remaining HTML/JSON string checks are
// labelled STATIC; the demo pages themselves are executed by
// scripts/conformance-sweep.mjs in a real browser (task `conformance-sweep`,
// not part of `deno task check`).
//
// Run: deno task test-webrtc-diagnostic-logging

import { runConformanceAssertion } from "../public/conformance-runner.js";

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

// Replace a global for the duration of `fn`, then put back what was there.
async function withGlobal(name, value, fn) {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  try {
    return await fn();
  } finally {
    if (original) Object.defineProperty(globalThis, name, original);
    else delete globalThis[name];
  }
}

// The real Navigator exposes userAgentData as a getter-only property, so a
// legacy `navigator.rtc` has to be a replaced navigator object.
async function withNavigator(value, fn) {
  return await withGlobal("navigator", value, fn);
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
  `specUrl = ${JSON.stringify(conformance.specUrl)}`,
);

check(
  "conformance.json carries 3-10 assertions",
  Array.isArray(conformance.assertions) &&
    conformance.assertions.length >= 3 &&
    conformance.assertions.length <= 10,
  `found ${
    Array.isArray(conformance.assertions) ? conformance.assertions.length : "no"
  } assertions`,
);

check(
  "every assertion specSection is anchored in the canonical spec",
  conformance.assertions.every(
    (a) => typeof a.specSection === "string" && a.specSection.startsWith(CANONICAL_SPEC),
  ),
  conformance.assertions
    .filter((a) => !(typeof a.specSection === "string" && a.specSection.startsWith(CANONICAL_SPEC)))
    .map((a) => `${a.id} -> ${JSON.stringify(a.specSection)}`)
    .join("; "),
);

// ── 2. The payloads discriminate the current surface from the pre-rewrite one ─
// Post-rewrite surface: three synchronous statics on RTCPeerConnection, a
// non-empty non-thenable session id from start, InvalidStateError when the
// lifecycle is wrong, TypeError for the metadata limits. This is the contract a
// real Chrome 150 exposing the rewritten API presents.
function modernSurface() {
  let active = false;
  return class RTCPeerConnection {
    static startDiagnosticLogging(options = {}) {
      if (active) throw new DOMException("already logging", "InvalidStateError");
      const metadata = options.metadata ?? {};
      const keys = Object.keys(metadata);
      if (keys.length > 5) throw new TypeError("too many metadata keys");
      for (const key of keys) {
        if (String(metadata[key]).length > 100) throw new TypeError("metadata value too long");
      }
      active = true;
      return "session-1";
    }
    static stopDiagnosticLogging() {
      if (!active) throw new DOMException("not logging", "InvalidStateError");
      active = false;
    }
    static cancelDiagnosticLogging() {
      if (!active) throw new DOMException("not logging", "InvalidStateError");
      active = false;
    }
  };
}

// Pre-rewrite surface: the removed Navigator binding, a promise-returning
// start, the removed finish method, and no statics at all.
function legacySurface() {
  return class RTCPeerConnection {};
}
const LEGACY_NAVIGATOR = {
  rtc: {
    startDiagnosticLogging: () => Promise.resolve("session-1"),
    finishDiagnosticLogging: () => {},
    cancelDiagnosticLogging: () => {},
  },
};

async function runPayloads(surface, navigatorValue) {
  const results = [];
  for (const assertion of conformance.assertions) {
    const result = await withGlobal("RTCPeerConnection", surface(), async () => {
      const run = () => runConformanceAssertion(assertion.kind, assertion.test, assertion.expect);
      return navigatorValue === undefined ? await run() : await withNavigator(navigatorValue, run);
    });
    results.push({ id: assertion.id, ...result });
  }
  return results;
}

const modern = await runPayloads(modernSurface, undefined);
for (const result of modern) {
  check(
    `conformance payload ${result.id} passes on the rewritten static surface`,
    result.ok === true,
    `ok=${result.ok} detail=${JSON.stringify(result.detail)}`,
  );
}

// The discrimination half: every payload must REJECT the surface the rewrite
// removed. A payload that cannot tell the two apart is a tautology, and this is
// the assertion that fails when one is introduced.
const legacy = await runPayloads(legacySurface, LEGACY_NAVIGATOR);
for (const result of legacy) {
  check(
    `conformance payload ${result.id} rejects the pre-rewrite surface`,
    result.ok === false,
    `ok=${result.ok} — this payload passes against the removed API too, so it does not ` +
      `test the rewrite at all (detail=${JSON.stringify(result.detail)})`,
  );
}

// ── 3. STATIC: the payloads never name the removed surface ───────────────────
// Kept as a cheap contract statement next to the execution above: prose may name
// what was removed, an executable payload may not.
const assertionTests = conformance.assertions.map((a) => String(a.test)).join("\n");

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

// ── 4. STATIC: the demos call only the current surface ───────────────────────
// Prose and the honest legacy-surface detection (a `typeof ... === "function"`
// check) are allowed; *calling* a removed method, or passing the removed
// allowUpload option, is not.
function scripts(html) {
  return [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).join("\n");
}

for (const route of ROUTES.slice(1)) {
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

// The feature index is copy only: it must carry no executable script that could
// call either surface.
check(
  "the feature index carries no inline script",
  scripts(read(ROUTES[0])) === "",
);

// ── 5. STATIC: each demo feature-detects the static surface honestly ─────────
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

// ── 6. STATIC: the feature index links the canonical spec ────────────────────
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
