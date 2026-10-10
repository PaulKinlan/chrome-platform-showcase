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
// CI inventory and gate grammar (bead chrome_platform_showcase-uzc). CI is read
// with a pinned real YAML parser, jsr:@std/yaml@1.3.0, because a regex over
// `run:` saw only the styles it was written for: a flow-style step, a quoted
// key, a block or folded scalar and a bare `run:` all slipped past it, and any
// CI command outside the classes it happened to check was unmirrored and
// invisible. The dependency needs no network after its first fetch — it is
// pinned in the import specifier and recorded in deno.lock, so a COLD cache
// costs one fetch on the first run after a checkout and works offline
// afterwards (`--cached-only` fails loudly rather than skipping the check); CI
// never runs this guard. Only .github/workflows/ci.yml is in scope;
// showcase-worklist.yml is a scheduled work-list job, out of scope on purpose.
// A CI step must be ONE declared invocation — shell operators are refused by
// name, never interpreted — and gate or task text may chain with a flat `&&`
// only. Every command CI runs must be mirrored by a gate plan step, matched BY
// TASK NAME for `deno task …` steps and by expanded text for raw commands.
//
// Run: deno task test-gate-parity

import { parse } from "jsr:@std/yaml@1.3.0";
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

// ── CI inventory: a real YAML parse, not a regex (bead chrome_platform_showcase-uzc)
//
// The regex this replaces (`/^\s*-?\s*run:\s*(.+)$/gm`) saw only the styles it
// was written for. A flow-style step, a quoted key, a block or folded scalar, a
// bare `run:` and every CI command outside the three classes it happened to
// check were all invisible — a plain block-style unmirrored `deno task` step
// included. The inventory below is parsed, so the style of the YAML cannot
// change what it sees.
//
// Scope is ONLY .github/workflows/ci.yml, the pre-merge gate.
// .github/workflows/showcase-worklist.yml is OUT OF SCOPE by declaration: it is
// a scheduled work-list job whose last step is a shell redirect into
// $GITHUB_STEP_SUMMARY, which the CI grammar below deliberately refuses.
// Widening the scope is a separate decision, not an accident of parsing.
const CI_WORKFLOW = ".github/workflows/ci.yml";
const CI_OUT_OF_SCOPE = ".github/workflows/showcase-worklist.yml";
const ci = read(CI_WORKFLOW);
const tasks = JSON.parse(read("deno.json")).tasks ?? {};

const ciRunSteps = [];
for (const [jobName, job] of Object.entries(parse(ci)?.jobs ?? {})) {
  for (const step of (Array.isArray(job?.steps) ? job.steps : [])) {
    if (step && typeof step === "object" && "run" in step) {
      ciRunSteps.push({ job: jobName, name: String(step?.name ?? ""), run: step.run });
    }
  }
}
// Totality detector: a permissive counter of `run` keys in ANY style (leading
// `-`/`,`/`{`/whitespace, quoted or not) against the parsed inventory. It is
// deliberately over-matching: a mismatch can only make this guard louder, never
// quieter, so a YAML style the parser somehow normalises away still fails here.
const runKeyCount = (ci.match(/(^|[{,\s]-?\s*)("|')?run\2\s*:/gm) ?? []).length;
check(
  "the CI inventory sees every `run` key in the workflow",
  runKeyCount === ciRunSteps.length,
  `${CI_WORKFLOW}: ${runKeyCount} \`run\` key(s) counted in the text but ` +
    `${ciRunSteps.length} parsed as steps — the inventory is incomplete`,
);

// CI `run` values are NOT a shell language. A CI step must be ONE declared
// invocation; anything that needs shell semantics to decide what it does is
// refused by name rather than modelled, because the whole class of findings
// here (mc6, 049) came from guessing what a shell would do.
const CI_SHELL_OPERATORS = ["&&", "||", ";", "|", ">", "<", "&", "`", "$(", "${"];
for (const step of ciRunSteps) {
  const label = `CI step \`${step.name || "(unnamed)"}\` in job \`${step.job}\``;
  const run = typeof step.run === "string" ? squash(step.run) : "";
  if (run === "") {
    check(`${label} declares one command`, false, "the step has no command (empty or bare `run:`)");
    continue;
  }
  const op = CI_SHELL_OPERATORS.find((o) => run.includes(o));
  check(
    `${label} is a single command CI can run`,
    op === undefined,
    op === undefined ? "" : `unsupported syntax \`${op}\` in ${JSON.stringify(run)} — model the ` +
      "step instead of the shell: a CI step is one declared invocation, and shell " +
      "operators are refused rather than interpreted",
  );
}
const ciRuns = ciRunSteps.map((s) => squash(typeof s.run === "string" ? s.run : ""));

// Expand `deno task <name>` references inside a repo task so the returned text
// is the commands that actually run. `seen` stops any task cycle.
// Gate and task text may chain with a flat `&&` ONLY. `||`, `;`, a pipe, a
// redirect, a subshell or any interpolation is refused by name: `a || b && c`
// does not mean "the gate runs a", it means the text is outside the declared
// grammar, so the guard fails instead of deciding which side wins (049). No
// claim of arbitrary shell equivalence is made or needed. The check applies to
// the task text the gate actually expands — not to every task in deno.json, so
// an unrelated task cannot produce a false failure here.
const GATE_TEXT_OPERATOR_RE = /(\|\||;|`|\$\(|\$\{|[<>]|\|(?!\|))/;
function gateText(label, text) {
  if (typeof text !== "string" || text.trim() === "") {
    check(`${label} is a non-empty command`, false, "empty command text");
    return false;
  }
  // A shell comment is not part of the declared grammar. Crediting a command
  // that appears inside one was a false green (finding 74l): `deno task phantom`
  // in a trailing comment made the guard report a task as executed, and a
  // comment's words could even pass as real operands. Nothing in a comment runs,
  // so nothing in one may be credited.
  if (text.includes("#")) {
    check(
      `${label} contains no shell comment`,
      false,
      `\`#\` in ${JSON.stringify(text)} — a comment is unsupported syntax in a gate ` +
        "command: it cannot execute, and a command written inside it is not a step",
    );
    return false;
  }
  const bad = text.match(GATE_TEXT_OPERATOR_RE);
  if (bad) {
    check(
      `${label} uses only a flat && chain`,
      false,
      `unsupported syntax \`${bad[0]}\` in ${JSON.stringify(text)} — only a flat \`&&\` ` +
        "chain is a supported gate command, and nothing is inferred about what a " +
        "shell would do with this text",
    );
    return false;
  }
  const parts = text.split("&&");
  if (parts.some((p) => p.trim() === "")) {
    check(`${label} has no empty && segment`, false, `empty segment in ${JSON.stringify(text)}`);
    return false;
  }
  return true;
}

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

// ── The MIRRORED contract (bead uzc / dvf, finding 6uk)
//
// Every command CI runs must be satisfied by the gate plan, and "satisfied"
// means EXECUTED, not merely named. Two false greens lived here: a plan step
// whose task was `true` still reported `deno task check-routes` mirrored
// because only the task NAME was compared, and `echo deno check server.ts`
// satisfied CI's `deno check server.ts` through an unanchored substring of the
// expanded text. Both claimed a command ran while the gate skipped it. So the
// gate's commands are PARSED, not text-matched: the program must be declared
// with the argument shape it is allowed to take, `deno task <name>` resolves
// recursively through deno.json to the invocation it really runs, and the
// comparison is exact argv identity — never a substring, and never a guess about
// what a shell would do.
//
// A CI command that is not mirrored fails; there is no exemption list, because
// the escape hatch is to mirror the step or to take a workflow out of scope on
// purpose.
const GATE_PROGRAMS = new Map([
  // deno subcommands a gate step may use.
  ["deno", (argv) => ["check", "fmt", "run", "test", "lint", "task"].includes(argv[1])],
  // the one non-deno invocation on the plan (audit-strict): a repo script by
  // path, never `-c` and never an arbitrary binary.
  [
    "python3",
    (argv) => /^(\.claude|scripts)\/[A-Za-z0-9._\/-]+\.py$/.test(argv[1] ?? ""),
  ],
]);

// Parse text the grammar already accepted into the invocations it runs, or fail
// the label: a no-op (`true`), an `echo`, `sh -c` or any undeclared binary must
// never read as a step that ran a check.
function parseInvocations(label, text) {
  const argv = [];
  for (const part of squash(text).split("&&").map((p) => squash(p)).filter((p) => p !== "")) {
    if (!gateText(`${label} segment`, part)) return null;
    const tokens = part.split(/\s+/);
    const declared = GATE_PROGRAMS.get(tokens[0]);
    if (!declared || !declared(tokens)) {
      check(
        `${label} runs a declared gate command`,
        false,
        `\`${part}\` is not a declared invocation — a gate step runs ${
          [...GATE_PROGRAMS.keys()].join("/")
        } with the argument shapes declared in this guard, so a no-op or an echo ` +
          "cannot stand in for a check",
      );
      return null;
    }
    argv.push(tokens);
  }
  return argv.length > 0 ? argv : null;
}
// The same vocabulary applies to CI's own commands: a workflow file is not a
// shell script, and the contract only holds if both sides are invocations.
const parseCiInvocation = (cmd) => {
  const argv = squash(cmd).split(/\s+/);
  const declared = GATE_PROGRAMS.get(argv[0]);
  return declared && declared(argv) ? argv : null;
};
const flagsOf = (argv) => argv.filter((a) => a.startsWith("-"));
const operandsOf = (argv) => argv.filter((a) => !a.startsWith("-")).slice(2);
// Exact argv identity, with the one declared tolerance: the gate may check the
// same files PLUS more (`deno check server.ts scripts/…` satisfies CI's
// `deno check server.ts`). Identical flags, and every CI operand present.
const sameInvocation = (ci, gate) =>
  ci[0] === gate[0] && ci[1] === gate[1] &&
  flagsOf(ci).join(" ") === flagsOf(gate).join(" ") &&
  operandsOf(ci).every((f) => operandsOf(gate).includes(f));

// Every task the plan reaches, resolved through deno.json (nested `deno task`
// references included), parsed into the commands it really runs.
// Recursion is driven by the PARSED argv of each task — never by a regex over
// its raw text — so a `deno task <id>` written inside a comment, a string or any
// other unsupported syntax cannot pull a task into the reachable set (finding
// 74l: a phantom task credited through a trailing comment was a false green).
// A task the grammar refuses contributes no invocations at all.
const planReachable = new Set();
const gateCommands = [];
const walkPlan = (name) => {
  if (planReachable.has(name) || typeof tasks[name] !== "string") return;
  planReachable.add(name);
  const argv = parseInvocations(`task \`${name}\``, tasks[name]);
  if (argv === null) return;
  gateCommands.push({ name, argv });
  for (const tokens of argv) {
    if (tokens[0] === "deno" && tokens[1] === "task" && tokens[2]) walkPlan(tokens[2]);
  }
};
for (const step of GATE_STEPS) walkPlan(step.task);

const planTasks = new Map(GATE_STEPS.map((s) => [s.task, s]));
const mirrors = (cmd) => {
  const task = cmd.match(/^deno task ([a-z0-9:-]+)(?:\s+(.*))?$/);
  if (task) {
    const step = planTasks.get(task[1]);
    if (!step) return false;
    if (squash(task[2] ?? "") !== squash((step.args ?? []).join(" "))) return false;
    // …and that task must resolve to a declared invocation that runs it.
    return gateCommands.some((g) => g.name === task[1]);
  }
  const ci = parseCiInvocation(cmd);
  if (!ci) return false;
  return gateCommands.some((g) => g.argv.some((argv) => sameInvocation(ci, argv)));
};
for (const cmd of ciRuns.filter((c) => c !== "")) {
  check(
    `the gate mirrors CI's \`${cmd}\``,
    mirrors(cmd),
    `CI runs \`${cmd}\` but no gate plan step EXECUTES it — add a step to ` +
      "scripts/gate-steps.mjs that runs this command (and a rule in " +
      "scripts/affected-tests.mjs) or the command runs in CI and nowhere locally",
  );
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
