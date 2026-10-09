// Gate runner: executes a plan and prints each step's REAL measured duration.
//
//   deno task check            → every step in scripts/gate-steps.mjs (full gate)
//   deno task check:affected   → static steps + the steps the changed files select
//   … --json / --list          → print the decision or the plan; run nothing
//
// Why (bead chrome_platform_showcase-6r8, ADR chrome_platform_showcase-15c): the
// gate used to be one `&&` chain in deno.json. Nothing recorded how long a step
// took, so "the fast gate is faster" was unmeasurable and the next regression
// was invisible. This runs the same steps in the same order, fails fast on the
// first non-zero exit (the `&&` semantics), and reports timings.
//
// The timing is measured around each child process with performance.now(). It is
// never estimated, and nothing is cached across runs: a duration printed here is
// a duration this run observed.
//
// Exit code is the failing step's exit code (so 124/137/143 still mean "killed
// by a bound", exactly as the fleet wrappers expect). 0 means every step passed.

import { ALL_STEP_IDS, GATE_STEPS, STATIC_STEP_IDS } from "./gate-steps.mjs";
import { changedPaths, selectSteps } from "./affected-tests.mjs";

const REPO = new URL("..", import.meta.url).pathname;

function readTasks() {
  const config = JSON.parse(Deno.readTextFileSync(`${REPO}deno.json`));
  return config.tasks ?? {};
}

// Steps run as `deno task <task> [args]`, i.e. through Deno's own task shell,
// exactly the way the old `&&` chain ran each of them. This is deliberate: a
// `bash -c` wrapper would add a bash dependency and a different shell's
// semantics, and the gate must behave identically on the VM, in CI and on a
// developer's machine (Deno's task shell is cross-platform; bash is not).
function displayCommand(step) {
  return ["deno task", step.task, ...(step.args ?? [])].join(" ");
}

function assertTaskExists(step, tasks) {
  if (typeof tasks[step.task] !== "string") {
    throw new Error(
      `gate plan names task "${step.task}" (step ${step.id}) but deno.json has no such task — ` +
        `the plan and deno.json have drifted`,
    );
  }
}

function parseArgs(argv) {
  const value = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1];
  };
  return {
    affected: argv.includes("--affected"),
    json: argv.includes("--json"),
    list: argv.includes("--list"),
    base: value("--base"),
    paths: value("--paths") == null
      ? null
      : value("--paths").split(",").map((p) => p.trim()).filter(Boolean),
  };
}

// A child killed by a signal reports code === null, and `signal` may be a
// number (Deno on Linux) or a name. Either way the shell convention is
// 128 + signal, so 137/143 still mean SIGKILL/SIGTERM to every fleet wrapper
// (reviewer finding, 2026-10-09: the name branch returned the bare signal).
function signalToCode(signal) {
  const names = { SIGINT: 2, SIGKILL: 9, SIGTERM: 15 };
  const num = typeof signal === "number" ? signal : names[signal] ?? 15;
  return 128 + num;
}

function fmt(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

const args = parseArgs(Deno.args);
const tasks = readTasks();

let selection;
let source;
if (args.affected) {
  if (args.paths) {
    selection = selectSteps(args.paths);
    source = `--paths (${args.paths.length} path(s))`;
  } else {
    const changes = changedPaths({ base: args.base });
    selection = selectSteps(changes.paths);
    source = changes.paths == null
      ? changes.error
      : `${changes.paths.length} changed file(s) vs ${changes.base} (merge-base ${
        changes.mergeBase.slice(0, 12)
      })`;
  }
} else {
  selection = {
    tier: "full",
    full: true,
    steps: ALL_STEP_IDS,
    staticIds: STATIC_STEP_IDS,
    skipped: [],
    reasons: [],
    unmatched: [],
    allIds: ALL_STEP_IDS,
  };
  source = "the full plan";
}

const byId = new Map(GATE_STEPS.map((s) => [s.id, s]));
const plan = selection.steps.map((id) => byId.get(id));

if (args.list || args.json) {
  if (args.json) {
    console.log(
      JSON.stringify({ mode: args.affected ? "affected" : "full", source, selection }, null, 2),
    );
  } else {
    for (const [i, step] of plan.entries()) {
      console.log(
        `${String(i + 1).padStart(2)}. ${step.id.padEnd(28)} ${step.tier.padEnd(9)} ${step.what}`,
      );
    }
  }
  Deno.exit(0);
}

console.log(
  `gate: ${selection.tier} tier — ${plan.length}/${selection.allIds.length} steps ` +
    `(${selection.staticIds.length} static` +
    (selection.tier === "full"
      ? ")"
      : `, ${plan.length - selection.staticIds.length} selected by the change)`),
);
console.log(`gate: change set — ${source}`);
for (const r of selection.reasons) console.log(`gate: reason — ${r.path} → ${r.detail}`);
if (selection.skipped.length) console.log(`gate: skipped — ${selection.skipped.join(", ")}`);
console.log("gate: ---------------------------------------------------------------");

const timings = [];
let failed = null;
const started = performance.now();

for (const [i, step] of plan.entries()) {
  let cmd;
  try {
    assertTaskExists(step, tasks);
    cmd = displayCommand(step);
  } catch (err) {
    console.error(`gate: PLAN ERROR — ${err.message}`);
    Deno.exit(2);
  }
  console.log(`gate: [${i + 1}/${plan.length}] ${step.id} (${cmd}) — ${step.what}`);
  const t0 = performance.now();
  const child = new Deno.Command("deno", {
    args: ["task", step.task, ...(step.args ?? [])],
    cwd: REPO,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();
  const status = await child.status;
  const ms = performance.now() - t0;
  const rc = status.code ?? signalToCode(status.signal);
  timings.push({ id: step.id, ms, rc });
  console.log(`gate: ${rc === 0 ? "ok" : `FAILED (exit ${rc})`} — ${step.id} in ${fmt(ms)}`);
  if (rc !== 0) {
    failed = { step, rc, ms };
    break;
  }
}

const total = performance.now() - started;
console.log("gate: ---------------------------------------------------------------");
const slowest = [...timings].sort((a, b) => b.ms - a.ms).slice(0, 5)
  .map((t) => `${t.id} ${fmt(t.ms)}`).join(", ");
console.log(`gate: per-step — ${timings.map((t) => `${t.id} ${fmt(t.ms)}`).join(", ")}`);
console.log(`gate: slowest — ${slowest}`);

if (failed) {
  const notRun = plan.length - timings.length;
  console.log(
    `gate: FAILED — step ${failed.step.id} exited ${failed.rc} after ${fmt(failed.ms)}` +
      (notRun > 0 ? `; ${notRun} step(s) not run` : "") + ` (total ${fmt(total)})`,
  );
  Deno.exit(failed.rc);
}
console.log(
  `gate: PASS — ${plan.length}/${plan.length} steps in ${fmt(total)}` +
    (selection.tier === "full" ? "" : ` (full plan is ${selection.allIds.length} steps)`),
);
