// Changed-path → gate-step map for the FAST gate (bead chrome_platform_showcase-6r8,
// ADR chrome_platform_showcase-15c).
//
// Input:  the files a change touches — `git diff --name-only <merge-base>..HEAD`,
//         plus staged/unstaged edits and untracked files, so work in progress is
//         covered as well as a committed branch (untracked files matter: a new
//         demo folder is untracked until it is added).
// Output: the gate steps to run. `static` steps always run; each changed path
//         contributes the `affected` steps of every rule it matches.
//
// THREE RULES MAKE THIS SAFE:
//
//   1. FAIL CLOSED. A path no rule matches selects the FULL gate. `public/styles.css`
//      and `public/media/**` are deliberately left unmatched for exactly that
//      reason: a shared style or asset change can break every demo, so it pays
//      the heavy gate. "Unknown" is never "skip".
//   2. GENERATED ARTEFACTS ARE STATIC-ONLY. responsive-support.json (34 edits/mo),
//      demo-index.json (9/mo) and feature-lineage.json are written by automated
//      fix passes and are already checked structurally by the static steps
//      (check-routes monotonicity, check-demo-index, check-duplicates), so they
//      must not drag an automated fix back through the 60 s integration gate.
//   3. A SUITE CANNOT BE ORPHANED. affected-tests.test.mjs (task
//      test-affected-tests, itself a static step of the gate) fails if any
//      non-static step in scripts/gate-steps.mjs is named by no rule, if a rule
//      names a step that does not exist, or if the fast gate selects a step the
//      full gate does not run.
//
// HONEST LIMIT: this is a heuristic map, not a coverage proof. What makes it
// safe is the fail-closed default, the orphan guard, and the unchanged full
// gate that the merger still runs once on the merged union.
//
// CLI:
//   deno run --allow-read --allow-run scripts/affected-tests.mjs [--base <ref>] [--json]
//   deno run --allow-read --allow-run scripts/affected-tests.mjs --paths a,b,c
//   deno run --allow-read --allow-run scripts/affected-tests.mjs --list

import { AFFECTED_STEP_IDS, ALL_STEP_IDS, GATE_STEPS, STATIC_STEP_IDS } from "./gate-steps.mjs";

const REPO = new URL("..", import.meta.url).pathname;

/**
 * Convert a small glob to a RegExp: `*` = one path segment, `**` = any depth,
 * `a/**` = everything under a, `?` = one non-slash character. No dependency.
 */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:[^/]+/)*";
        } else {
          re += ".*";
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += /[.+^${}()|[\]\\]/.test(c) ? `\\${c}` : c;
    }
  }
  return new RegExp(`^${re}$`);
}

export function matchPath(pattern, path) {
  return globToRegExp(pattern).test(path);
}

// The web-speech demo families the three speech suites walk.
const SPEECH_DEMOS = [
  "v135/add-mediastreamtrack-support-to-the-web-speech-api/**",
  "**/on-device-web-speech-api/**",
  "**/web-speech*/**",
  "**/speechrecognitionresult-timestamps-webspeech-api/**",
];

// The release-endpoint suites share routes/release-endpoints.ts as their subject
// (and the GC ones are the four `--v8-flags=--expose-gc` suites).
const RELEASE_ENDPOINT_STEPS = [
  "test-spc-bbk-device-name",
  "test-spc-bbk-jwk-shape",
  "test-dbsc-jwk-shape",
  "test-evp-nonce-replay",
  "test-speculation-probe-store",
  "test-speculation-probe-docs",
  "test-header-grammar",
  "test-session-bounds",
  "test-hardening",
  "check-routes",
];

// The server/behaviour family. Matched by server.ts, routes/** and lib/**.
const SERVER_STEPS = ["test-hardening", "test-server-boot", "check-routes"];

/**
 * rule shape:
 *   pattern     glob matched against a changed path
 *   steps       affected step ids this path selects (additive across rules)
 *   all: true   this path selects the FULL gate (shared infrastructure)
 *   staticOnly  this path selects the static tier and nothing else
 *   note        one line shown in the selection report
 */
export const RULES = [
  // ---- generated artefacts: structural checks only (ADR 15c) ------------
  {
    pattern: "responsive-support.json",
    staticOnly: true,
    note: "generated support record; its structural check is check-routes monotonicity",
  },
  {
    pattern: "demo-index.json",
    staticOnly: true,
    note: "generated index; its structural check is check-demo-index",
  },
  {
    pattern: "feature-lineage.json",
    staticOnly: true,
    note: "generated lineage; its structural check is check-duplicates",
  },
  // ---- docs, reports and task metadata: nothing behavioural ------------
  { pattern: "*.md", staticOnly: true, note: "prose" },
  { pattern: "reports/**", staticOnly: true, note: "generated report" },
  { pattern: ".beads/**", staticOnly: true, note: "task metadata" },

  // ---- shared gate infrastructure: fail closed to the full gate --------
  { pattern: "deno.json", all: true, note: "gate definition" },
  { pattern: "deno.lock", all: true, note: "dependency lock" },
  { pattern: ".github/**", all: true, note: "CI definition" },
  { pattern: "scripts/lib/**", all: true, note: "shared test/server helper" },
  { pattern: "scripts/gate-steps.mjs", all: true, note: "gate plan" },
  { pattern: "scripts/run-gate.mjs", all: true, note: "gate runner" },
  { pattern: "scripts/affected-tests.mjs", all: true, note: "affected map" },
  { pattern: "scripts/gate-parity.test.mjs", all: true, note: "gate-shape guard" },
  { pattern: "scripts/affected-tests.test.mjs", all: true, note: "affected-map guard" },
  { pattern: "scripts/*.test.mjs", all: true, note: "a suite is shared infrastructure" },

  // ---- demos -----------------------------------------------------------
  {
    pattern: "v*/**",
    steps: ["check-routes", "audit-strict", "test-a11y-focus", "test-entity-scripts"],
    note: "demo page/asset",
  },
  { pattern: "v150/**", steps: ["test-ua-badges"], note: "v150 UA-badge page inventory" },
  {
    pattern: "v150/webrtc-diagnostic-logging-api/**",
    steps: ["test-webrtc-diagnostic-logging"],
    note: "WebRTC diagnostic logging demo",
  },
  {
    pattern: "v139/webxr-depth-sensing-performance-improvements/**",
    steps: ["test-webxr-depth-router"],
    note: "WebXR depth router demo",
  },
  {
    pattern: "v155/css-corner-shorthand-properties/**",
    steps: ["test-corner-shape-values"],
    note: "corner-shape demo",
  },
  {
    pattern:
      "v151/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/_server.ts",
    steps: ["test-header-grammar", "check-routes"],
    note: "permission-policy-merger policy-echo sidecar",
  },
  {
    pattern:
      "v151/resource-timing-add-spec-compliant-service-worker-router-timing-fields/_server.ts",
    steps: ["test-header-grammar", "check-routes"],
    note: "resource-timing delayed-echo sidecar",
  },
  {
    pattern: "v145/reduced-user-agent-strings-by-default/_server.ts",
    steps: ["test-header-grammar", "check-routes"],
    note: "UA-CH migration client-hints-echo sidecar",
  },
  ...SPEECH_DEMOS.map((pattern) => ({
    pattern,
    steps: [
      "test-speech-transcripts",
      "test-speech-transcript-dom",
      "test-speech-transcript-highlight",
    ],
    note: "web-speech demo family",
  })),

  // ---- shared public assets -------------------------------------------
  {
    pattern: "public/conformance-runner.js",
    steps: ["test-conformance-runner", "test-webrtc-diagnostic-logging"],
    note: "conformance runner",
  },
  { pattern: "public/chrome-compat.js", steps: ["test-ua-badges"], note: "UA-CH helper" },
  { pattern: "public/fonts/**", steps: ["test-font-loading"], note: "design-system font" },
  // public/styles.css and public/media/** are DELIBERATELY unmatched: they are
  // shared by every demo, so they fall through to the full gate on purpose.

  // ---- server, routes, lib --------------------------------------------
  {
    pattern: "server.ts",
    steps: ["test-server-boot", "test-hardening", "check-routes"],
    note: "server entry",
  },
  {
    pattern: "routes/release-endpoints.ts",
    steps: RELEASE_ENDPOINT_STEPS,
    note: "release endpoint surface",
  },
  {
    pattern: "routes/critique-renderers.ts",
    steps: ["test-critique-table-scroll", "test-hardening"],
    note: "critique renderer",
  },
  {
    pattern: "routes/demo-telemetry.ts",
    steps: ["test-auth-throttle", "test-hardening"],
    note: "demo telemetry route",
  },
  { pattern: "routes/**", steps: SERVER_STEPS, note: "route surface" },
  // ALL of lib/** fails closed to the full gate (coord, 2026-10-09): the shared
  // backend library has no proven per-file affected coverage, so a narrowed map
  // here would be a guess about behaviour. Deliberately no per-file lib rules.
  {
    pattern: "lib/**",
    all: true,
    note: "shared backend library: unproven affected coverage → FULL gate",
  },

  // ---- gate-side scripts ----------------------------------------------
  { pattern: ".route-manifest.baseline.json", steps: ["check-routes"], note: "route baseline" },
  {
    pattern: "scripts/check-routes.mjs",
    steps: ["check-routes", "test-support-ref-fail-closed", "test-check-routes-changed-demos"],
    note: "route gate + the baseline snapshot and touched-demo readers it uses (6tg, 3rg)",
  },
  { pattern: "scripts/build-demo-index.mjs", steps: ["check-demo-index"], note: "index builder" },
  {
    pattern: "scripts/check-duplicate-features.mjs",
    steps: ["check-duplicates"],
    note: "duplicate gate",
  },
  {
    pattern: "scripts/apply-feature-lineage.mjs",
    steps: ["check-duplicates"],
    note: "lineage applier",
  },
  { pattern: "migrations.json", steps: ["check-duplicates"], note: "migration record" },
  {
    pattern: "scripts/responsive-support.mjs",
    steps: ["responsive-support-report"],
    note: "support record builder",
  },
  {
    pattern: "scripts/check-font-loading.mjs",
    steps: ["test-font-loading"],
    note: "font-loading gate",
  },
  { pattern: "scripts/drive-demos.mjs", steps: ["test-drive-effect"], note: "demo driver" },
  { pattern: ".claude/audit-demos.py", steps: ["audit-strict"], note: "demo auditor" },
  {
    pattern: "conformance/**",
    steps: ["audit-strict", "check-routes"],
    note: "conformance suite definitions",
  },
];

function unique(list) {
  return [...new Set(list)];
}

/**
 * Decide which gate steps a change selects.
 *
 * @param {string[]|null} paths changed paths; null/undefined means "unknown
 *   change set", which fails closed to the full gate.
 * @param {{steps?: object[], rules?: object[]}} [opts] injectable for tests.
 */
export function selectSteps(paths, { steps = GATE_STEPS, rules = RULES } = {}) {
  const allIds = steps.map((s) => s.id);
  const staticIds = steps.filter((s) => s.tier === "static").map((s) => s.id);
  const reasons = [];
  const unmatched = [];
  const selected = new Set(staticIds);
  let full = false;

  if (paths == null) {
    reasons.push({
      path: "(unknown)",
      detail: "could not determine the change set → fail closed to the full gate",
      steps: allIds,
    });
    return {
      tier: "full",
      full: true,
      steps: allIds,
      staticIds,
      skipped: [],
      reasons,
      unmatched: [],
      allIds,
    };
  }

  for (const path of paths) {
    const hit = rules.filter((r) => matchPath(r.pattern, path));
    const escalate = hit.find((r) => r.all);
    if (escalate) {
      full = true;
      reasons.push({
        path,
        detail: `${escalate.pattern} → FULL gate (${escalate.note})`,
        steps: allIds,
      });
      continue;
    }
    if (hit.length === 0) {
      unmatched.push(path);
      continue;
    }
    const ids = [];
    for (const r of hit) for (const id of r.steps ?? []) ids.push(id);
    for (const id of ids) selected.add(id);
    reasons.push({
      path,
      detail: hit.map((r) => `${r.pattern} (${r.note})`).join("; "),
      steps: unique(ids),
    });
  }

  if (unmatched.length > 0) {
    full = true;
    for (const path of unmatched) {
      reasons.push({
        path,
        detail: "no rule matches this path → fail closed to the FULL gate",
        steps: allIds,
      });
    }
  }

  const selectedIds = allIds.filter((id) => full || selected.has(id));
  const skipped = allIds.filter((id) => !selectedIds.includes(id));
  const tier = full ? "full" : selectedIds.length === staticIds.length ? "static" : "affected";
  return { tier, full, steps: selectedIds, staticIds, skipped, reasons, unmatched, allIds };
}

/**
 * Steps in the plan that no rule can ever select (the orphan guard). A suite
 * that no change can reach is a suite that can only fail in the full gate.
 */
export function orphanedSteps(steps = GATE_STEPS, rules = RULES) {
  const named = new Set();
  for (const r of rules) for (const id of r.steps ?? []) named.add(id);
  return steps.filter((s) => s.tier !== "static" && !named.has(s.id)).map((s) => s.id);
}

/** Step ids a rule names that the plan does not contain (a typo or a dead rule). */
export function unknownRuleSteps(steps = GATE_STEPS, rules = RULES) {
  const known = new Set(steps.map((s) => s.id));
  const unknown = new Set();
  for (const r of rules) for (const id of r.steps ?? []) if (!known.has(id)) unknown.add(id);
  return [...unknown].sort();
}

function git(args, cwd = REPO) {
  try {
    const { code, stdout, stderr } = new Deno.Command("git", {
      args,
      cwd,
      stdout: "piped",
      stderr: "piped",
    }).outputSync();
    return {
      code,
      out: new TextDecoder().decode(stdout),
      err: new TextDecoder().decode(stderr).trim(),
    };
  } catch (err) {
    return { code: -1, out: "", err: String(err?.message ?? err) };
  }
}

/**
 * The change set could not be determined, so no tier may be guessed.
 * Thrown by changedPaths for ANY required git query that fails, and for a base
 * ref that cannot be established (including an explicit --base). Callers must
 * fail closed: the runner runs the FULL gate, the CLI exits non-zero. Before
 * this existed, `git diff` failing decoded to an empty path list, which read as
 * "nothing changed" and produced a silent static PASS (reviewer finding ysp on
 * 1701cee9).
 */
export class ChangeSetError extends Error {}

const lines = (text) => (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

/**
 * The change set for the current tree.
 *
 * Base selection: an explicit --base is the ONLY candidate (a base that does
 * not resolve is an error, never a silent fall back to a different ref); with
 * no --base, origin/main, main and HEAD are tried in order. The merge-base is
 * the branch's fork point, which is what makes the diff describe the change
 * rather than everything main has landed since. No network access: a lane
 * fetches before it asks.
 *
 * `run` is injectable so the fail-closed behaviour can be tested with a git
 * wrapper that fails a chosen subcommand (affected-tests.test.mjs).
 */
export function changedPaths({ base = null, cwd = REPO, run = git } = {}) {
  const candidates = base ? [base] : ["origin/main", "main", "HEAD"];
  const problems = [];
  for (const ref of candidates) {
    const probe = run(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], cwd);
    if (probe.code !== 0) {
      problems.push(`${ref}: ${probe.err || "does not resolve to a commit"}`);
      continue;
    }
    const mb = run(["merge-base", ref, "HEAD"], cwd);
    if (mb.code !== 0) {
      problems.push(`${ref}: merge-base failed${mb.err ? ` (${mb.err})` : ""}`);
      continue;
    }
    const mergeBase = lines(mb.out)[0];
    if (!mergeBase) {
      problems.push(`${ref}: merge-base produced no commit`);
      continue;
    }
    // Every one of these is REQUIRED. A non-zero exit means the change set is
    // unknown, not empty — see ChangeSetError above.
    const queries = [
      ["diff", "--name-only", mergeBase, "HEAD"],
      ["diff", "--name-only", "HEAD"],
      ["ls-files", "--others", "--exclude-standard"],
    ];
    const paths = [];
    for (const args of queries) {
      const r = run(args, cwd);
      if (r.code !== 0) {
        throw new ChangeSetError(
          `git ${args.join(" ")} exited ${r.code}${
            r.err ? ` (${r.err})` : ""
          } — the change set cannot be determined`,
        );
      }
      paths.push(...lines(r.out));
    }
    return { base: ref, mergeBase, paths: unique(paths).sort() };
  }
  throw new ChangeSetError(
    `no base ref could be established (tried ${candidates.join(", ")}): ${problems.join("; ")}`,
  );
}

function main() {
  const argv = Deno.args;
  const flag = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1];
  };
  if (argv.includes("--list")) {
    for (const [i, s] of GATE_STEPS.entries()) {
      console.log(`${String(i + 1).padStart(2)}. ${s.id.padEnd(28)} ${s.tier.padEnd(9)} ${s.what}`);
    }
    return;
  }

  let paths;
  let source;
  if (argv.includes("--paths")) {
    paths = (flag("--paths") ?? "").split(",").map((p) => p.trim()).filter(Boolean);
    source = "--paths";
  } else {
    let changes;
    try {
      changes = changedPaths({ base: flag("--base") });
    } catch (err) {
      // Fail closed, loudly: an unknown change set must never be reported as a
      // small one (reviewer finding ysp on 1701cee9).
      console.error(`affected: ${err.message}`);
      console.error("affected: FAIL-CLOSED — no tier can be chosen from an unknown change set");
      Deno.exit(2);
    }
    paths = changes.paths;
    source = `${paths.length} changed file(s) vs ${changes.base} (merge-base ${
      changes.mergeBase.slice(0, 12)
    })`;
  }

  const selection = selectSteps(paths);
  if (argv.includes("--json")) {
    console.log(JSON.stringify({ source, selection }, null, 2));
    return;
  }

  console.log(`affected: ${source}`);
  for (const r of selection.reasons) console.log(`  ${r.path} → ${r.detail}`);
  console.log(
    `affected: ${selection.tier} tier — ${selection.steps.length}/${selection.allIds.length} steps ` +
      `(${selection.staticIds.length} static${
        selection.tier === "full"
          ? ""
          : `, ${selection.steps.length - selection.staticIds.length} selected`
      })`,
  );
  console.log(`affected: run with deno task check:affected`);
  if (selection.tier !== "full" && selection.skipped.length) {
    console.log(`affected: skipped — ${selection.skipped.join(", ")}`);
  }
  console.log(
    `register: ${ALL_STEP_IDS.length} steps in the plan, ${AFFECTED_STEP_IDS.length} selectable`,
  );
  console.log(`static: ${STATIC_STEP_IDS.join(", ")}`);
}

if (import.meta.main) main();
