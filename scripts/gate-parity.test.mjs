// Local-gate vs CI parity guard (bead chrome_platform_showcase-j3f).
//
// Regression: br0 (8c67399c) passed the local full gate (`deno task check`,
// which `fleet-check` runs) but failed GitHub CI, because CI runs
// `deno fmt --check` and the full gate did not. Unformatted report markdown
// shipped green locally and only surfaced in CI, where it blocked the deploy
// job. g0e fixed the data; this guard keeps the gate honest.
//
// The rule: every formatter gate CI enforces must be part of the repo's full
// gate, `deno task check` — the task the VM fleet's `fleet-check` wrapper runs.
// CI is parsed rather than hard-coded, so adding a formatter step to CI
// without adding it to the gate fails here instead of in CI.
//
// The second rule: every scripts/*.test.mjs is named by a task reachable from
// that same gate (bead 86v), so a suite that exists cannot be one nothing ever
// runs.
//
// The gate is no longer an inline `&&` chain string in deno.json: it is the
// ordered plan in scripts/gate-steps.mjs, executed by scripts/run-gate.mjs and
// reported with per-step timings (bead 6r8, ADR 15c). This guard reads that
// plan and expands each step through `deno task`, so the two rules above still
// hold against the commands the gate actually runs — and it fails if a plan
// step names a task deno.json does not define.
//
// Run: deno task test-gate-parity

import { GATE_STEPS } from "./gate-steps.mjs";

const REPO = new URL("..", import.meta.url).pathname;

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) console.log(`ok — ${label}`);
  else {
    failures++;
    console.error(`FAIL — ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

function read(path) {
  return Deno.readTextFileSync(`${REPO}${path.replace(/^\/+/, "")}`);
}

const squash = (s) => s.replace(/\s+/g, " ").trim();

const ci = read(".github/workflows/ci.yml");
const tasks = JSON.parse(read("deno.json")).tasks ?? {};

// Every command CI runs, in order.
const ciRuns = [...ci.matchAll(/^\s*-?\s*run:\s*(.+)$/gm)].map((m) => squash(m[1]));

// Expand `deno task <name>` references inside a repo task so the returned text
// is the commands that actually run. `seen` stops any task cycle.
function expand(name, seen = new Set()) {
  const raw = tasks[name];
  if (raw == null || seen.has(name)) return raw ?? "";
  seen.add(name);
  return raw.replace(
    /deno task ([a-z0-9:-]+)/g,
    (m, n) => (tasks[n] != null ? expand(n, seen) : m),
  );
}

// The full gate: every plan step, in order, expanded to the commands it runs.
const stepCommand = (step) => squash([expand(step.task), ...(step.args ?? [])].join(" "));
const fullGate = squash(GATE_STEPS.map(stepCommand).join(" && "));

// The gate exists, it is plan-driven, and the plan is wired to deno.json.
check("deno.json defines the `check` full gate", typeof tasks.check === "string");
check(
  "deno.json defines the fast `check:affected` gate",
  typeof tasks["check:affected"] === "string",
);
check(
  "the full gate runs the plan through scripts/run-gate.mjs",
  (tasks.check ?? "").includes("scripts/run-gate.mjs"),
  `check = ${JSON.stringify(tasks.check)}`,
);
check(
  "the fast gate runs the plan through scripts/run-gate.mjs with --affected",
  (tasks["check:affected"] ?? "").includes("scripts/run-gate.mjs") &&
    (tasks["check:affected"] ?? "").includes("--affected"),
  `check:affected = ${JSON.stringify(tasks["check:affected"])}`,
);
check(
  "the gate plan declares steps for both tiers",
  GATE_STEPS.length > 0 && GATE_STEPS.some((s) => s.tier === "static") &&
    GATE_STEPS.some((s) => s.tier === "affected"),
);
for (const step of GATE_STEPS.filter((s) => tasks[s.task] == null)) {
  check(
    `plan step \`${step.id}\` names an existing deno.json task`,
    false,
    `deno.json has no task \`${step.task}\`; the plan and deno.json have drifted`,
  );
}
check("deno.json defines a formatter task", typeof tasks.fmt === "string");

// Formatter parity: each formatter command CI enforces must run in the gate.
const ciFmt = ciRuns.filter((c) => /(^|\s)deno fmt(\s|$)/.test(c));
check(
  "CI declares at least one deno fmt gate",
  ciFmt.length > 0,
  `CI run steps: ${JSON.stringify(ciRuns)}`,
);
for (const cmd of ciFmt) {
  check(
    `full gate runs CI's formatter step (\`${cmd}\`)`,
    fullGate.includes(cmd),
    "deno task check does not cover this CI step, so an unformatted tree " +
      "passes locally (fleet-check) and only fails in CI",
  );
}

// Type-check parity: CI's `deno check server.ts` must also be in the gate.
for (const cmd of ciRuns.filter((c) => /(^|\s)deno check\b/.test(c))) {
  check(`full gate runs CI's type check (\`${cmd}\`)`, fullGate.includes(cmd));
}

// Test-registration parity (bead chrome_platform_showcase-86v).
//
// scripts/corner-shape-values.test.mjs sat in the tree named by no task and
// reachable from no gate, so it could have rotted or started failing and nothing
// would ever have reported it. The rule: every scripts/*.test.mjs is named by a
// deno.json task AND that task is reachable from the full gate — a task defined
// but left off the `check` chain still never runs in the gate the fleet and the
// pre-push routine execute.
//
// What this proves: the suite's path appears in a task command and that task is
// on the chain. What it cannot prove: that the command actually executes the file
// (a task that merely echoed the path would satisfy it), and it does not scan
// subdirectories of scripts/. Running the gate is what proves execution; this is
// the guard against a suite that nothing names at all.
const scriptTests = [...Deno.readDirSync(`${REPO}scripts`)]
  .filter((entry) => entry.isFile && entry.name.endsWith(".test.mjs"))
  .map((entry) => entry.name)
  .sort();
// Tasks reachable from the plan, following nested `deno task <name>` references.
const gateTasks = new Set();
function walk(name) {
  if (gateTasks.has(name) || tasks[name] == null) return;
  gateTasks.add(name);
  for (const m of tasks[name].matchAll(/deno task ([a-z0-9:-]+)/g)) walk(m[1]);
}
for (const step of GATE_STEPS) walk(step.task);
const tasksRunning = (file) =>
  // Match the path, not the bare name: `cmd.includes(file)` would let a new
  // scripts/runner.test.mjs be "covered" by a task running
  // scripts/conformance-runner.test.mjs, which is the same silent-suite hole
  // this guard exists to close (review finding on 86v, driven by the reviewer).
  Object.entries(tasks)
    .filter(([, cmd]) => cmd.includes(`scripts/${file}`))
    .map(([name]) => name);
const unnamed = scriptTests.filter((file) => tasksRunning(file).length === 0);
const unreachable = scriptTests.filter((file) =>
  tasksRunning(file).length > 0 &&
  !tasksRunning(file).some((name) => gateTasks.has(name))
);

check(
  "the repo declares test suites to run",
  scriptTests.length > 0,
  "no scripts/*.test.mjs found — if the suites were moved, move this guard with them",
);
check(
  "every scripts/*.test.mjs is named by a deno.json task",
  unnamed.length === 0,
  `unregistered suites: ${unnamed.join(", ")} — add a test-* task that runs each one, ` +
    "or delete the file; a suite no task names cannot report a failure",
);
check(
  "every test suite is reachable from the full gate (deno task check)",
  unreachable.length === 0,
  `suites whose tasks are off the check chain: ${
    unreachable.map((file) => `${file} (${tasksRunning(file).join(", ")})`).join("; ")
  }`,
);

// Task-level registration (bead 6r8 union guard). A suite can be registered as a
// deno.json task before — or without — a file this scan sees, and two branches
// can each add one: the union must not keep the task and lose the chain entry
// (which is what replacing the flat `&&` chain with a plan could do). So every
// task whose command runs a `*.test.mjs` must be reachable from the plan; a
// newly registered suite that no plan step names fails the gate instead of
// silently stopping running.
const suiteTasks = Object.entries(tasks)
  .filter(([, cmd]) => /\.test\.mjs\b/.test(cmd))
  .map(([name]) => name)
  .sort();
const offPlanSuiteTasks = suiteTasks.filter((name) => !gateTasks.has(name));
check(
  "every task that runs a *.test.mjs suite is reachable from the gate plan",
  offPlanSuiteTasks.length === 0,
  `off-plan suite tasks: ${offPlanSuiteTasks.join(", ")} — add a step to scripts/gate-steps.mjs ` +
    "(and a rule in scripts/affected-tests.mjs selects it), or the suite stops running",
);

// Stage 0 opt-in native Deno.test pilot (bead 9th, from dty). The pilot lives in
// tests/unit/ and is deliberately NOT on the gate plan: it is opt-in, it runs
// with zero permissions, and nothing about it may change the full gate, CI or
// the fleet CHECK_CMD. It must not be invisible either, so it is pinned here:
// a suite exists, the directory is flat and holds nothing but suites, and the
// runner task is exactly the runner invocation below. The runner is what keeps
// the pilot off the plan — the task command names scripts/native-test.mjs, not a
// *.test.mjs path, so the task-level rule above has nothing to demand of the
// plan; it also carries the zero-test rule that `deno test <dir>` cannot express
// (Stage 1, bead 0a0).
//
// The pin has to cover everything the runner can reach (finding 08a):
// `deno test <dir>` recurses, so a nested suite is discovered and imported, and
// it also discovers `*_test.mjs` (a stray helper is imported as a zero-test
// module that exits 0). A symlinked entry could put content outside this
// directory in the runner's reach. So every entry must be a REGULAR
// *.test.mjs FILE — no subdirectories, no symlinks. That is why the pilot
// directory is required to stay flat rather than matched recursively: a flat
// directory makes the single-level scan exhaustive, and a nested suite fails
// loudly here instead of silently joining the run (the runner refuses it too,
// through the same rule in scripts/lib/native-test.mjs).
const UNIT_DIR = "tests/unit";
const UNIT_RUNNER = "deno run --allow-read --allow-run scripts/native-test.mjs --dir tests/unit";
let unitEntries = [];
try {
  unitEntries = [...Deno.readDirSync(`${REPO}${UNIT_DIR}`)].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
} catch {
  // Reported by the first check below, which fails with a readable message.
}
const isRegularSuite = (entry) =>
  entry.isFile && !entry.isSymlink && entry.name.endsWith(".test.mjs");
const unitFiles = unitEntries.filter(isRegularSuite).map((entry) => entry.name);
const unreachableByScan = unitEntries
  .filter((entry) => !isRegularSuite(entry))
  .map((entry) => `${entry.name}${entry.isDirectory ? "/" : entry.isSymlink ? " (symlink)" : ""}`);
check(
  "the opt-in pilot declares at least one *.test.mjs suite",
  unitFiles.length > 0,
  `${UNIT_DIR} holds no suite — delete this guard only together with the pilot`,
);
check(
  "the opt-in pilot directory is flat: only regular *.test.mjs files",
  unreachableByScan.length === 0,
  `entries outside a single-level scan: ${
    unreachableByScan.join(", ")
  } — deno test recurses into ` +
    "subdirectories, imports `*_test.mjs`, and can follow a symlink, so a nested suite, a nested " +
    "helper or a symlink would join the run unnoticed",
);
check(
  "the opt-in pilot runner is exactly the fail-closed native-test invocation",
  tasks["test:unit"] === UNIT_RUNNER,
  `test:unit = ${JSON.stringify(tasks["test:unit"])} — expected ${JSON.stringify(UNIT_RUNNER)}`,
);

if (failures) {
  console.error(`\n${failures} local-gate/CI parity check(s) failed`);
  Deno.exit(1);
}
console.log("\nlocal-gate/CI parity: all checks passed");
