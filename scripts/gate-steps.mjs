// The gate plan — ONE ordered list, the source of truth for both tiers.
//
//   deno task check            → the FULL gate: every step below, in order.
//   deno task check:affected   → the FAST gate: the `static` steps plus the
//                                `affected` steps that scripts/affected-tests.mjs
//                                selects for the change being tested.
//
// Why a module and not the flat `&&` chain deno.json used to hold (bead
// chrome_platform_showcase-6r8, ADR chrome_platform_showcase-15c, finding 97j):
//
//   * the chain could not say which step was slow, so "the fast gate is faster"
//     was unmeasurable and the next regression was invisible;
//   * 18 landings in one week appended a step each with no tier boundary, so
//     every doc edit paid for every integration and GC suite.
//
// scripts/run-gate.mjs executes this list and prints each step's REAL elapsed
// time (measured, never estimated). scripts/gate-parity.test.mjs reads the same
// list so the CI-parity and every-suite-is-registered guards stay honest, and
// scripts/affected-tests.test.mjs proves every non-static step is selectable.
//
// Step shape:
//   id    stable identifier — this is what affected-tests.mjs rules name, and
//         what the runner prints. Keep it equal to the task name unless the
//         task takes an argument (see responsive-support-report).
//   task  deno.json task that runs the step.
//   args  extra arguments appended to that task's command.
//   tier  "static"   always runs, in both the fast and the full gate.
//         "affected" runs when the change selects it; always runs in the full gate.
//   what  one line shown in the runner's header for that step.
//
// Tier rule of thumb (ADR 15c): `static` is structural and cheap — it is what a
// doc, demo or generated-artefact edit most plausibly breaks. `affected` is
// behavioural, so it runs when its subject changes and is skipped when it does
// not; the full gate always runs all of it.

export const GATE_STEPS = [
  {
    id: "typecheck",
    task: "typecheck",
    tier: "static",
    what: "deno check server.ts and the two gate-side scripts",
  },
  { id: "fmt-check", task: "fmt-check", tier: "static", what: "deno fmt --check" },
  {
    id: "test-gate-parity",
    task: "test-gate-parity",
    tier: "static",
    what: "local gate vs CI parity + every suite is named by a task",
  },
  {
    id: "test-run-gate-plan",
    task: "test-run-gate-plan",
    tier: "static",
    what: "the declared gate plan is the plan that is selected and executed (stub harness)",
  },
  {
    id: "test-affected-tests",
    task: "test-affected-tests",
    tier: "static",
    what: "the affected-file map's own guards (fail-closed, no orphaned suite)",
  },
  {
    id: "check-routes",
    task: "check-routes",
    tier: "static",
    what: "durable-demo route gate (append-only routes, no repurposed slug)",
  },
  {
    id: "responsive-support-report",
    task: "responsive-support",
    args: ["report"],
    tier: "static",
    what: "responsive support coverage report + monotonicity",
  },

  {
    id: "test-session-bounds",
    task: "test-session-bounds",
    tier: "affected",
    what: "release session store bounds",
  },
  // fleet/evp-6tg landed on main as 3fb49ba7 and registered its suite at chain
  // position 7 — right here, after test-session-bounds and before
  // test-header-grammar. scripts/affected-tests.mjs names it on the
  // scripts/check-routes.mjs rule (the suite pins the baseline support snapshot
  // loader that check-routes reads); scripts/lib/** selects the full gate.
  {
    id: "test-support-ref-fail-closed",
    task: "test-support-ref-fail-closed",
    tier: "affected",
    what: "baseline support snapshot read failures fail closed (6tg)",
  },
  // fleet/evp-3rg landed on main as 45819f9d and registered its suite at chain
  // position 8 — right here, after the 6tg suite and before test-header-grammar.
  // Same subjects: scripts/lib/support.mjs (changedFeatureIds, already → full
  // gate) and scripts/check-routes.mjs (the rule named below).
  {
    id: "test-check-routes-changed-demos",
    task: "test-check-routes-changed-demos",
    tier: "affected",
    what: "touched-demo set read failures fail closed (3rg)",
  },
  {
    id: "test-header-grammar",
    task: "test-header-grammar",
    tier: "affected",
    what: "release header grammar",
  },
  {
    id: "test-spc-bbk-device-name",
    task: "test-spc-bbk-device-name",
    tier: "affected",
    what: "SPC/BBK device-name contract",
  },
  {
    id: "test-spc-bbk-jwk-shape",
    task: "test-spc-bbk-jwk-shape",
    tier: "affected",
    what: "SPC/BBK JWK shape (GC-exposed)",
  },
  {
    id: "test-dbsc-jwk-shape",
    task: "test-dbsc-jwk-shape",
    tier: "affected",
    what: "DBSC JWK shape (GC-exposed)",
  },
  {
    id: "test-evp-nonce-replay",
    task: "test-evp-nonce-replay",
    tier: "affected",
    what: "EVP nonce replay (GC-exposed)",
  },
  {
    id: "test-speculation-probe-store",
    task: "test-speculation-probe-store",
    tier: "affected",
    what: "speculation probe record store",
  },
  {
    id: "test-speculation-probe-docs",
    task: "test-speculation-probe-docs",
    tier: "affected",
    what: "speculation probe docs contract (GC-exposed)",
  },
  {
    id: "test-drive-effect",
    task: "test-drive-effect",
    tier: "affected",
    what: "demo driver effect helper",
  },
  {
    id: "test-server-boot",
    task: "test-server-boot",
    tier: "affected",
    what: "server.ts boots and answers on a real port",
  },
  {
    id: "test-auth-throttle",
    task: "test-auth-throttle",
    tier: "affected",
    what: "auth throttle + demo telemetry",
  },
  {
    id: "audit-strict",
    task: "audit-strict",
    tier: "affected",
    what: "python3 .claude/audit-demos.py --strict over every demo page",
  },
  {
    id: "test-speech-transcripts",
    task: "test-speech-transcripts",
    tier: "affected",
    what: "speech demo transcript markup (repo-wide page list)",
  },
  {
    id: "test-speech-transcript-dom",
    task: "test-speech-transcript-dom",
    tier: "affected",
    what: "speech transcript DOM contract",
  },
  {
    id: "test-speech-transcript-highlight",
    task: "test-speech-transcript-highlight",
    tier: "affected",
    what: "speech transcript highlight contract",
  },
  {
    id: "test-critique-table-scroll",
    task: "test-critique-table-scroll",
    tier: "affected",
    what: "critique table scroll renderer",
  },
  {
    id: "test-corner-shape-values",
    task: "test-corner-shape-values",
    tier: "affected",
    what: "corner-shape demo values",
  },
  {
    id: "test-a11y-focus",
    task: "test-a11y-focus",
    tier: "affected",
    what: "focus-visible ring + keyboard reachability (static pass)",
  },
  {
    id: "test-ua-badges",
    task: "test-ua-badges",
    tier: "affected",
    what: "UA-CH version badges",
  },
  {
    id: "test-conformance-runner",
    task: "test-conformance-runner",
    tier: "affected",
    what: "public/conformance-runner.js",
  },
  {
    id: "test-hardening",
    task: "test-hardening",
    tier: "affected",
    what: "server hardening incl. a headless-Chrome pass",
  },
  {
    id: "test-font-loading",
    task: "test-font-loading",
    tier: "affected",
    what: "design-system @font-face assets exist on disk",
  },
  {
    id: "test-webrtc-diagnostic-logging",
    task: "test-webrtc-diagnostic-logging",
    tier: "affected",
    what: "WebRTC diagnostic logging demos",
  },
  {
    id: "test-entity-scripts",
    task: "test-entity-scripts",
    tier: "affected",
    what: "entity-escaped inline scripts across every demo (tree walk)",
  },
  {
    id: "test-webxr-depth-router",
    task: "test-webxr-depth-router",
    tier: "affected",
    what: "WebXR depth router demo",
  },

  // The two repo-wide structural scans stay LAST in the plan, exactly where the
  // old `&&` chain ran them: the plan's order is the chain's order (verified
  // command-for-command), so a failure reports in the same place it always did.
  {
    id: "check-duplicates",
    task: "check-duplicates",
    tier: "static",
    what: "one demo folder per feature + lineage notes present",
  },
  {
    id: "check-demo-index",
    task: "check-demo-index",
    tier: "static",
    what: "demo-index.json matches the folders on disk",
  },
];

/** Step ids that always run, in order. */
export const STATIC_STEP_IDS = GATE_STEPS.filter((s) => s.tier === "static").map((s) => s.id);

/** Step ids that are selected by the affected-file map, in order. */
export const AFFECTED_STEP_IDS = GATE_STEPS.filter((s) => s.tier === "affected").map((s) => s.id);

/** Every plan step id, in full-gate order. */
export const ALL_STEP_IDS = GATE_STEPS.map((s) => s.id);
