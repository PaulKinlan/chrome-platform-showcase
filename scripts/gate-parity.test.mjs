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
// The second rule: every scripts/*.test.mjs is named by a task on that same
// chain (bead 86v), so a suite that exists cannot be one nothing ever runs.
//
// Run: deno task test-gate-parity

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
    /deno task ([a-z0-9-]+)/g,
    (m, n) => (tasks[n] != null ? expand(n, seen) : m),
  );
}

const fullGate = squash(expand("check"));

// The full gate exists and is what the fleet wrapper invokes.
check("deno.json defines the `check` full gate", typeof tasks.check === "string");
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
const scriptTests = [...Deno.readDirSync(`${REPO}scripts`)]
  .filter((entry) => entry.isFile && entry.name.endsWith(".test.mjs"))
  .map((entry) => entry.name)
  .sort();
// Tasks reachable from `check`, following nested `deno task <name>` references.
const gateTasks = new Set();
(function walk(name) {
  if (gateTasks.has(name) || tasks[name] == null) return;
  gateTasks.add(name);
  for (const m of tasks[name].matchAll(/deno task ([a-z0-9-]+)/g)) walk(m[1]);
})("check");
const tasksRunning = (file) =>
  Object.entries(tasks).filter(([, cmd]) => cmd.includes(file)).map(([name]) => name);
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

if (failures) {
  console.error(`\n${failures} local-gate/CI parity check(s) failed`);
  Deno.exit(1);
}
console.log("\nlocal-gate/CI parity: all checks passed");
