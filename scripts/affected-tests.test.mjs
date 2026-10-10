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
//
// Migrated in place to ONE ASYNC native Deno.test case (Stage 27 of the dty
// proposal, bead chrome_platform_showcase-dty.34), under the dty.19 policy for
// this class of suite. The imports, `REPO`, the `failures` counter, the boolean
// `check` helper and the `read` helper stay at module scope; everything that used
// to run after them - the `deno.json` task read, the plan-shape and selection
// checks with their small helpers, the fail-closed git-plumbing fixtures and the
// temp-repository fixture with its `try/finally` - now runs inside the case in
// its original order. Every label, detail string, helper and the conditional
// ordering of the three helper families is unchanged, so a run still reports
// every failing guard instead of the first. The trailing `Deno.exit(1)` became a
// named throw carrying the same count, because exiting inside a case kills the
// test process before Deno can report it, and the legacy success line still
// prints on a clean run.

import { ALL_STEP_IDS, GATE_STEPS, STATIC_STEP_IDS } from "./gate-steps.mjs";
import {
  changedPaths,
  ChangeSetError,
  matchPath,
  orphanedSteps,
  RULES,
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
Deno.test("the affected-file map fails closed and never orphans a suite", async () => {
  const tasks = JSON.parse(read("deno.json")).tasks ?? {};

  // ---------------------------------------------------------------- plan shape
  const ids = GATE_STEPS.map((s) => s.id);

  // The order the gate ran in when it was the flat `&&` chain (bead 6r8, coord
  // constraint: preserve EXACT order). The plan may add steps, but these must not
  // be reordered: the order is where a failure reports, and reordering it silently
  // invalidates every cached gate log. `typecheck` and `audit-strict` are the two
  // steps that were inline commands in that chain and are now named tasks, at the
  // same positions; `test-support-ref-fail-closed` (6tg) and
  // `test-check-routes-changed-demos` (3rg) are the steps that landed at chain
  // positions 7 and 8. Verified command-for-command against the chain order.
  const CHAIN_ORDER = [
    "typecheck",
    "fmt-check",
    "test-gate-parity",
    "check-routes",
    "responsive-support-report",
    "test-session-bounds",
    "test-support-ref-fail-closed",
    "test-check-routes-changed-demos",
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
  check(
    "the plan has both tiers",
    STATIC_STEP_IDS.length > 0 && ids.length > STATIC_STEP_IDS.length,
  );
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
  check(
    "glob: a directory wildcard matches one segment",
    matchPath("v*/**", "v156/foo/index.html"),
  );
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
  check(
    "a permission-policy-merger sidecar change selects the header-grammar suite",
    selectSteps([
      "v151/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/_server.ts",
    ]).steps.includes("test-header-grammar"),
  );
  check(
    "a resource-timing delayed-echo sidecar change selects the header-grammar suite",
    selectSteps([
      "v151/resource-timing-add-spec-compliant-service-worker-router-timing-fields/_server.ts",
    ]).steps.includes("test-header-grammar"),
  );
  check(
    "a UA-CH migration sidecar change selects the header-grammar suite",
    selectSteps([
      "v145/reduced-user-agent-strings-by-default/_server.ts",
    ]).steps.includes("test-header-grammar"),
  );
  check(
    "a referrer-echo sidecar change selects the header-grammar suite",
    selectSteps([
      "v150/css-url-request-modifiers/_server.ts",
    ]).steps.includes("test-header-grammar"),
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
    "a JWK helper change fails closed to the full gate (lib/** has unproven coverage)",
    selectSteps(["lib/jwk.ts"]).tier === "full",
  );
  check(
    "a request-body change fails closed to the full gate",
    selectSteps(["lib/request-body.ts"]).tier === "full",
  );
  check(
    "every lib/** path fails closed",
    [
      "lib/jwk.ts",
      "lib/chromestatus.ts",
      "lib/request-body.ts",
      "lib/probe-record-store.ts",
      "lib/session-store.ts",
      "lib/auth-throttle.ts",
      "lib/sub/dir/helper.ts",
    ].every((p) => selectSteps([p]).tier === "full"),
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
  check(
    "the 6tg support-snapshot suite is selectable from the route gate it belongs to",
    selectSteps(["scripts/check-routes.mjs"]).steps.includes("test-support-ref-fail-closed"),
  );
  check(
    "the 3rg touched-demo suite is selectable from the route gate it belongs to",
    selectSteps(["scripts/check-routes.mjs"]).steps.includes("test-check-routes-changed-demos"),
  );
  check(
    "a shared support-helper change selects the full gate (so the 6tg and 3rg suites run)",
    selectSteps(["scripts/lib/support.mjs"]).tier === "full",
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
    "a gate-wide (`all`) rule does not count as naming a step",
    // Deliberate strictness, pinned after the 98a802f1 review: a step reachable
    // only by editing some suite file — which runs the whole gate — is still
    // orphaned for the change that should have selected it, so the map must name
    // it. If this ever becomes false, the map has been silently weakened.
    orphanedSteps(
      [...GATE_STEPS, {
        id: "test-brand-new",
        task: "test-brand-new",
        tier: "affected",
        what: "new",
      }],
      [...RULES, { pattern: "everywhere/**", all: true, note: "probe" }],
    ).includes("test-brand-new"),
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

  // ------------------------------------------------- fail-closed git plumbing (ysp)
  // Reviewer finding ysp on 1701cee9: a failing `git diff`/`ls-files` decoded to an
  // empty path list, which read as "nothing changed" and produced a silent STATIC
  // pass on a tree with 8 changed paths. Every required git query now throws
  // ChangeSetError, and the runner turns that into the FULL gate.
  const realGit = (args, cwd) => {
    const p = new Deno.Command("git", { args, cwd, stdout: "piped", stderr: "piped" }).outputSync();
    return {
      code: p.code,
      out: new TextDecoder().decode(p.stdout),
      err: new TextDecoder().decode(p.stderr).trim(),
    };
  };
  // A wrapper that fails EXACTLY the calls whose full argument list is listed and
  // records every call, so each fixture can prove the query it claims to exercise
  // actually ran, and that the earlier queries succeeded first. A prefix match here
  // is what finding goc caught: `wrapper("diff --name-only")` also failed the
  // committed diff, so the working-tree fixture aborted before reaching the second
  // query and could not catch a regression limited to it.
  const recordingWrapper = (failingExact) => {
    const calls = [];
    const run = (args, cwd) => {
      const key = args.join(" ");
      const result = failingExact.includes(key)
        ? { code: 128, out: "", err: `fatal: ${key} unavailable (fixture)` }
        : realGit(args, cwd);
      calls.push({ key, code: result.code });
      return result;
    };
    return { run, calls };
  };
  // Only the three change-set queries, so rev-parse/merge-base noise is ignored.
  const queryCalls = (calls) =>
    calls.filter((c) => c.key.startsWith("diff ") || c.key.startsWith("ls-files "));
  const mustThrow = (label, run) => {
    let threw = null;
    try {
      changedPaths({ base: "HEAD", run });
    } catch (err) {
      threw = err;
    }
    check(
      label,
      threw instanceof ChangeSetError,
      threw ? `threw ${threw.constructor.name}` : "returned a change set instead of failing closed",
    );
    return threw;
  };

  const HEAD_TO_HEAD = `diff --name-only ${changes.mergeBase} HEAD`;
  const WORKING_TREE = "diff --name-only HEAD";
  const UNTRACKED = "ls-files --others --exclude-standard";

  // 1. the committed (head-to-head) diff fails
  const headToHead = recordingWrapper([HEAD_TO_HEAD]);
  const headToHeadErr = mustThrow(
    "a failing `git diff <base>..HEAD` fails closed (head-to-head)",
    headToHead.run,
  );
  check(
    "the head-to-head fixture fails that query itself, and reaches no other query",
    queryCalls(headToHead.calls).length === 1 && queryCalls(headToHead.calls)[0].code === 128 &&
      String(headToHeadErr?.message ?? "").includes(HEAD_TO_HEAD),
    JSON.stringify(queryCalls(headToHead.calls)),
  );

  // 2. ONLY the working-tree diff fails — the point of finding goc: the committed
  //    diff must have RUN and succeeded before the working-tree query fails.
  const workingTree = recordingWrapper([WORKING_TREE]);
  const workingTreeErr = mustThrow(
    "a failing working-tree `git diff --name-only HEAD` fails closed",
    workingTree.run,
  );
  const workingTreeQueries = queryCalls(workingTree.calls);
  check(
    "the committed diff was called and succeeded before the working-tree query",
    workingTreeQueries.length === 2 && workingTreeQueries[0].key === HEAD_TO_HEAD &&
      workingTreeQueries[0].code === 0,
    JSON.stringify(workingTreeQueries),
  );
  check(
    "the working-tree query alone failed and is what threw (fixture is not vacuous)",
    workingTreeQueries[1]?.key === WORKING_TREE && workingTreeQueries[1].code === 128 &&
      String(workingTreeErr?.message ?? "").includes(WORKING_TREE),
    JSON.stringify(workingTreeQueries),
  );

  // 3. only the untracked-files query fails, after both diffs succeeded
  const untracked = recordingWrapper([UNTRACKED]);
  const untrackedErr = mustThrow("a failing `git ls-files --others` fails closed", untracked.run);
  const untrackedQueries = queryCalls(untracked.calls);
  check(
    "both diffs succeeded before `git ls-files --others` alone failed",
    untrackedQueries.length === 3 && untrackedQueries[0].code === 0 &&
      untrackedQueries[1].code === 0 &&
      untrackedQueries[2].key === UNTRACKED && untrackedQueries[2].code === 128 &&
      String(untrackedErr?.message ?? "").includes(UNTRACKED),
    JSON.stringify(untrackedQueries),
  );
  const unknownBase = (() => {
    try {
      // No fallback: an explicit base that does not resolve must not become a
      // different ref's (possibly empty) diff.
      changedPaths({ base: "definitely-not-a-ref-ysp", run: realGit });
      return null;
    } catch (err) {
      return err;
    }
  })();
  check(
    "an explicit --base that does not resolve fails closed",
    unknownBase instanceof ChangeSetError,
  );
  check(
    "the explicit-base error names the requested ref (no silent fallback)",
    String(unknownBase?.message ?? "").includes("definitely-not-a-ref-ysp"),
    String(unknownBase?.message ?? ""),
  );
  check(
    "an unavailable git binary fails closed",
    (() => {
      try {
        changedPaths({ base: "HEAD", run: () => ({ code: -1, out: "", err: "spawn failed" }) });
        return false;
      } catch (err) {
        return err instanceof ChangeSetError;
      }
    })(),
  );
  check(
    "an unknown change set selects the full gate (never a silent static pass)",
    selectSteps(null).tier === "full" && selectSteps(null).steps.length === ALL_STEP_IDS.length,
  );

  // A genuinely unchanged tree is legitimately static: real temp repo, one commit,
  // nothing staged/unstaged/untracked.
  const fixture = await Deno.makeTempDir({ prefix: "tier-unchanged-" });
  try {
    const gitIn = (args) => {
      const p = new Deno.Command("git", { args, cwd: fixture, stdout: "piped", stderr: "piped" })
        .outputSync();
      if (p.code !== 0) {
        throw new Error(`git ${args.join(" ")}: ${new TextDecoder().decode(p.stderr)}`);
      }
    };
    gitIn(["init", "-q"]);
    Deno.writeTextFileSync(`${fixture}/readme.txt`, "unchanged\n");
    gitIn(["add", "readme.txt"]);
    gitIn(["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", "init"]);
    const unchanged = changedPaths({ base: "HEAD", cwd: fixture });
    check(
      "an unchanged tree legitimately selects the static tier",
      unchanged.paths.length === 0 && selectSteps(unchanged.paths).tier === "static",
      `paths=${JSON.stringify(unchanged.paths)}`,
    );
  } finally {
    await Deno.remove(fixture, { recursive: true });
  }

  // The legacy tail exited the process on a non-zero counter. `Deno.exit(1)` cannot
  // live inside a case - it kills the test process before Deno can report the case -
  // so the counter is carried into the named failure instead, and the legacy success
  // line above still prints on a clean run.
  if (failures) {
    console.error(`\n${failures} affected-tests guard(s) failed`);
    throw new Error(`${failures} affected-tests guard(s) failed`);
  }
  console.log(
    `\naffected-tests: all guards passed (${GATE_STEPS.length} steps, ${STATIC_STEP_IDS.length} static)`,
  );
});
