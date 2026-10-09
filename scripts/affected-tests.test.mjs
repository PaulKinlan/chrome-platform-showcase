// Guards for the affected-file map and the gate plan (bead chrome_platform_showcase-6r8).
//
// The fast gate is only safe if three things hold, and this suite is the
// executable form of all three (ADR chrome_platform_showcase-15c):
//
//   1. FAIL CLOSED — an unknown path selects the full gate, and the deliberately
//      unmatched shared assets (public/styles.css, public/media/**) do too;
//   2. NO ORPHANED SUITE — every non-static step in scripts/gate-steps.mjs is
//      selectable by at least one rule, and no rule names a step that does not
//      exist. A suite nothing can select is the 86v failure mode again;
//   3. FAST ⊆ FULL — the fast gate can only run steps the full gate runs, and
//      the runner was never pointed at a task deno.json does not define.
//
// The selection tests are pure: they feed synthetic path lists through the same
// function the runner uses, so they need no git history and cost milliseconds.
//
// Run: deno task test-affected-tests

import { ALL_STEP_IDS, GATE_STEPS, STATIC_STEP_IDS } from "./gate-steps.mjs";
import {
  changedPaths,
  matchPath,
  orphanedSteps,
  selectSteps,
  unknownRuleSteps,
} from "./affected-tests.mjs";

const REPO = new URL("..", import.meta.url).pathname;

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) console.log(`ok — ${label}`);
  else {
    failures++;
    console.error(`FAIL — ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

const read = (path) => Deno.readTextFileSync(`${REPO}${path}`);
const tasks = JSON.parse(read("deno.json")).tasks ?? {};

// ---------------------------------------------------------------- plan shape
const ids = GATE_STEPS.map((s) => s.id);

// The order the gate ran in when it was the flat `&&` chain (bead 6r8, coord
// constraint: preserve EXACT order). The plan may add steps, but these must not
// be reordered: the order is where a failure reports, and reordering it silently
// invalidates every cached gate log. `typecheck` and `audit-strict` are the two
// steps that were inline commands in that chain and are now named tasks, at the
// same positions. Verified command-for-command against 82fabde3:deno.json.
const CHAIN_ORDER = [
  "typecheck",
  "fmt-check",
  "test-gate-parity",
  "check-routes",
  "responsive-support-report",
  "test-session-bounds",
  "test-header-grammar",
  "test-spc-bbk-device-name",
  "test-spc-bbk-jwk-shape",
  "test-dbsc-jwk-shape",
  "test-evp-nonce-replay",
  "test-speculation-probe-store",
  "test-speculation-probe-docs",
  "test-drive-effect",
  "test-server-boot",
  "test-auth-throttle",
  "audit-strict",
  "test-speech-transcripts",
  "test-speech-transcript-dom",
  "test-speech-transcript-highlight",
  "test-critique-table-scroll",
  "test-corner-shape-values",
  "test-a11y-focus",
  "test-ua-badges",
  "test-conformance-runner",
  "test-hardening",
  "test-font-loading",
  "test-webrtc-diagnostic-logging",
  "test-entity-scripts",
  "test-webxr-depth-router",
  "check-duplicates",
  "check-demo-index",
];
const planChainOrder = ids.filter((id) => CHAIN_ORDER.includes(id));
check(
  "the full gate keeps the historical chain order (new steps may be inserted, none reordered)",
  JSON.stringify(planChainOrder) === JSON.stringify(CHAIN_ORDER),
  `expected ${CHAIN_ORDER.join(", ")}\n      got      ${planChainOrder.join(", ")}`,
);
check(
  "every historical gate step is still in the plan",
  CHAIN_ORDER.every((id) => ids.includes(id)),
  `missing: ${CHAIN_ORDER.filter((id) => !ids.includes(id))}`,
);
check("the plan is not empty", GATE_STEPS.length > 0);
check(
  "every step id is unique",
  new Set(ids).size === ids.length,
  `duplicates: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`,
);
check(
  "every step declares a valid tier, a task and a description",
  GATE_STEPS.every((s) => (s.tier === "static" || s.tier === "affected") && !!s.task && !!s.what),
);
check(
  "every step names a deno.json task that exists",
  GATE_STEPS.every((s) => typeof tasks[s.task] === "string"),
  `missing tasks: ${
    GATE_STEPS.filter((s) => typeof tasks[s.task] !== "string").map((s) => s.task)
  }`,
);
check("the plan has both tiers", STATIC_STEP_IDS.length > 0 && ids.length > STATIC_STEP_IDS.length);
check(
  "deno task check runs the timing runner over the full plan",
  (tasks.check ?? "").includes("scripts/run-gate.mjs"),
  `check = ${JSON.stringify(tasks.check)}`,
);
check(
  "deno task check:affected runs the same runner with --affected",
  (tasks["check:affected"] ?? "").includes("scripts/run-gate.mjs") &&
    (tasks["check:affected"] ?? "").includes("--affected"),
  `check:affected = ${JSON.stringify(tasks["check:affected"])}`,
);
check(
  "the runner reads the plan from scripts/gate-steps.mjs (one source of truth)",
  read("scripts/run-gate.mjs").includes('from "./gate-steps.mjs"'),
);

// ------------------------------------------------------------ glob translation
check("glob: a directory wildcard matches one segment", matchPath("v*/**", "v156/foo/index.html"));
check("glob: a directory wildcard does not cross a segment", !matchPath("v*/**", "v156"));
check(
  "glob: **/ matches zero directories",
  matchPath("**/web-speech*/**", "web-speech-api/x.html"),
);
check(
  "glob: **/ matches nested directories",
  matchPath("**/on-device-web-speech-api/**", "v150/on-device-web-speech-api/x/y.html"),
);
check(
  "glob: *.md is top-level only",
  matchPath("*.md", "AGENTS.md") && !matchPath("*.md", "docs/AGENTS.md"),
);
check("glob: ** at the end matches any depth", matchPath("reports/**", "reports/a/b.md"));
check(
  "glob: a literal dot is literal",
  matchPath("scripts/*.test.mjs", "scripts/x.test.mjs") &&
    !matchPath("scripts/*.test.mjs", "scripts/xxtestx.mjs"),
);

// ----------------------------------------------------------------- selection
const staticOnly = (name, path) => {
  const sel = selectSteps([path]);
  check(
    `${name} (${path}) selects the static tier only`,
    sel.tier === "static" && sel.steps.length === STATIC_STEP_IDS.length,
    `tier=${sel.tier} steps=${sel.steps.length}`,
  );
  check(
    `${name} does not drag in the heavy suites`,
    !sel.steps.includes("test-hardening") && !sel.steps.includes("audit-strict"),
  );
};

const full = (name, path) => {
  const sel = selectSteps([path]);
  check(
    `${name} (${path}) fails closed to the full gate`,
    sel.tier === "full" && sel.steps.length === ALL_STEP_IDS.length,
    `tier=${sel.tier} steps=${sel.steps.length}`,
  );
};

staticOnly("generated support record", "responsive-support.json");
staticOnly("generated demo index", "demo-index.json");
staticOnly("generated lineage", "feature-lineage.json");
staticOnly("prose", "reports/2026-10-09-critique.md");
staticOnly("task metadata", ".beads/issues.jsonl");

full("unknown path", "tools/mystery.bin");
full("shared design system", "public/styles.css");
full("shared media asset", "public/media/hero.webp");
full("gate definition", "deno.json");
full("shared test helper", "scripts/lib/manifest.mjs");
full("a suite file itself", "scripts/brand-new.test.mjs");

const demo = selectSteps(["v156/some-new-feature/index.html"]);
check("a demo edit selects the affected tier", demo.tier === "affected", `tier=${demo.tier}`);
check(
  "a demo edit runs the route gate, the demo auditor and the tree-walking suites",
  ["check-routes", "audit-strict", "test-a11y-focus", "test-entity-scripts"].every((id) =>
    demo.steps.includes(id)
  ),
  `steps=${demo.steps.join(", ")}`,
);
check(
  "a demo edit skips the heavy server suites",
  ["test-hardening", "test-server-boot", "test-evp-nonce-replay"].every((id) =>
    !demo.steps.includes(id)
  ),
  `steps=${demo.steps.join(", ")}`,
);
check(
  "a demo edit still runs every static step",
  STATIC_STEP_IDS.every((id) => demo.steps.includes(id)),
);

check(
  "a v150 demo edit selects the UA-badge suite",
  selectSteps(["v150/focusgroup/toolbar-demo/index.html"]).steps.includes("test-ua-badges"),
);
check(
  "a web-speech demo edit selects the speech suites",
  ["test-speech-transcripts", "test-speech-transcript-dom", "test-speech-transcript-highlight"]
    .every((id) =>
      selectSteps(["v142/web-speech-api-contextual-biasing/voice-commands/index.html"]).steps
        .includes(id)
    ),
);

const gc = selectSteps(["routes/release-endpoints.ts"]);
check(
  "a release-endpoint change selects every GC-exposed suite",
  [
    "test-spc-bbk-jwk-shape",
    "test-dbsc-jwk-shape",
    "test-evp-nonce-replay",
    "test-speculation-probe-docs",
  ].every((id) => gc.steps.includes(id)),
  `steps=${gc.steps.join(", ")}`,
);
check(
  "a JWK helper change selects the JWK shape suite",
  selectSteps(["lib/jwk.ts"]).steps.includes("test-spc-bbk-jwk-shape"),
);
check(
  "a request-body change selects the hardening suite",
  selectSteps(["lib/request-body.ts"]).steps.includes("test-hardening"),
);
check(
  "a server.ts change selects the boot suite",
  selectSteps(["server.ts"]).steps.includes("test-server-boot"),
);
check(
  "a font asset change selects the font-loading suite",
  selectSteps(["public/fonts/Inter.woff2"]).steps.includes("test-font-loading"),
);

check(
  "one unknown path among known ones still forces the full gate",
  selectSteps(["v156/a/index.html", "mystery/x"]).tier === "full",
);
check(
  "known paths together stay in the affected tier",
  selectSteps(["v156/a/index.html", "responsive-support.json"]).tier === "affected",
);
check("an unknown change set fails closed", selectSteps(null).tier === "full");
check("an empty change set runs the static tier", selectSteps([]).tier === "static");

// ------------------------------------------------------- orphan / typo guards
check(
  "every non-static step is selectable by some rule",
  orphanedSteps().length === 0,
  `orphaned: ${orphanedSteps().join(", ")} — add a rule that selects it, or make it static`,
);
check(
  "a newly added suite with no rule is reported as orphaned",
  orphanedSteps([...GATE_STEPS, {
    id: "test-brand-new",
    task: "test-brand-new",
    tier: "affected",
    what: "new",
  }]).includes("test-brand-new"),
);
check(
  "no rule names a step that is not in the plan",
  unknownRuleSteps().length === 0,
  unknownRuleSteps().join(", "),
);
check(
  "the fast tier can never select a step outside the full plan",
  selectSteps(["v156/a/index.html"]).steps.every((id) => ALL_STEP_IDS.includes(id)),
);

// ------------------------------------------------------------------ git plumbing
const changes = changedPaths({ base: "HEAD" });
check(
  "changedPaths resolves a merge-base and returns a path list",
  Array.isArray(changes.paths),
  JSON.stringify(changes).slice(0, 200),
);
check(
  "changedPaths returns non-empty relative paths only",
  (changes.paths ?? []).every((p) => typeof p === "string" && p.length > 0 && !p.startsWith("/")),
);

if (failures) {
  console.error(`\n${failures} affected-tests guard(s) failed`);
  Deno.exit(1);
}
console.log(
  `\naffected-tests: all guards passed (${GATE_STEPS.length} steps, ${STATIC_STEP_IDS.length} static)`,
);
