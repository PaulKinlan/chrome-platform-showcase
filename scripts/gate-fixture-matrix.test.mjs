// Permanent gate fixture matrix (bead chrome_platform_showcase-hg3, from the
// uzc/rev-uzc review-time probe harness that was never committed).
//
// The guards in scripts/gate-parity.test.mjs are only as strong as their
// parsing rules, and a future WEAKENING of those rules (e.g. the entrypoint
// check reverting from exact-argv to a substring) would leave every check
// green. This suite is the tripwire: each row copies deno.json, the CI
// workflow and scripts/ into a temp dir, applies ONE fixture mutation, and
// runs the REAL parity guard there as a child process — the guard under test
// executes, nothing here re-implements it, and no tracked file is touched.
//
// Rows:
//   baseline          unmodified copy                          -> exit 0
//   eval-spoof   (140) tasks.check = deno eval 'console.log("scripts/run-gate.mjs")'
//                                                              -> exit 1, entrypoint named
//   flag-injection    tasks.check = deno run … run-gate.mjs --dry-run
//                                                              -> exit 1, entrypoint named
//   echo-masking      tasks.check = echo deno run … run-gate.mjs
//                                                              -> exit 1, entrypoint named
//   operand-superset  (GREEN) gate typechecks server.ts + MORE than CI requires
//                                                              -> exit 0
//   flat-and          (GREEN) gate task splits into cmd1 && cmd2, both declared
//                                                              -> exit 0
//
// Children run `deno test --allow-read` only. The parity guard imports the
// pinned jsr:@std/yaml from the shared DENO_DIR cache: on a COLD cache the
// child fails loudly with a fetch/permission error — never a silent green.
//
// Run: deno task test-gate-fixture-matrix

import { join } from "node:path";

const REPO = new URL("..", import.meta.url).pathname;

const failures = [];
function check(label, fn) {
  try {
    fn();
    console.log(`ok   ${label}`);
  } catch (err) {
    failures.push(label);
    console.log(`FAIL ${label}: ${err?.message ?? err}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function copyInto(src, dst) {
  Deno.mkdirSync(dst, { recursive: true });
  for (const entry of Deno.readDirSync(src)) {
    const from = join(src, entry.name);
    const to = join(dst, entry.name);
    if (entry.isDirectory) copyInto(from, to);
    else if (entry.isFile) Deno.copyFileSync(from, to);
  }
}

Deno.test("gate fixture matrix pins the entrypoint and parity boundaries", async () => {
  const dirs = [];
  const tempDir = async (prefix) => {
    const d = await Deno.makeTempDir({ prefix });
    dirs.push(d);
    return d;
  };
  try {
    // One pristine copy every row starts from: the files the parity guard
    // reads (deno.json, the CI workflow, scripts/ it is imported from and
    // scans, tests/unit it pins) — file copies only, never a git clone.
    const base = await tempDir("hg3-matrix-base-");
    Deno.copyFileSync(join(REPO, "deno.json"), join(base, "deno.json"));
    copyInto(join(REPO, ".github"), join(base, ".github"));
    copyInto(join(REPO, "scripts"), join(base, "scripts"));
    copyInto(join(REPO, "tests"), join(base, "tests"));

    const runParity = (dir) => {
      const out = new Deno.Command("deno", {
        args: ["test", "--allow-read", "scripts/gate-parity.test.mjs"],
        cwd: dir,
        stdout: "piped",
        stderr: "piped",
      }).outputSync();
      return {
        code: out.code,
        text: new TextDecoder().decode(out.stdout) +
          new TextDecoder().decode(out.stderr),
      };
    };
    // A row is a fresh copy plus a mutation; the mutation helpers edit only
    // the copy's deno.json / ci.yml.
    const freshCopy = () => {
      const d = Deno.makeTempDirSync({ prefix: "hg3-matrix-row-" });
      dirs.push(d);
      copyInto(base, d);
      return d;
    };
    const setTask = (dir, task, value) => {
      const path = join(dir, "deno.json");
      const config = JSON.parse(Deno.readTextFileSync(path));
      config.tasks[task] = value;
      Deno.writeTextFileSync(path, JSON.stringify(config, null, 2) + "\n");
    };

    check("baseline: an unmodified copy is green and the guard really ran", () => {
      const res = runParity(freshCopy());
      assert(
        res.text.includes("the local gate and CI declare the same commands"),
        `the parity case never ran — the copy is inert: ${res.text.slice(0, 300)}`,
      );
      assert(res.code === 0, `expected exit 0, got ${res.code}: ${res.text.slice(0, 300)}`);
    });

    check("RED: tasks.check = deno eval printing the runner name (140)", () => {
      const dir = freshCopy();
      setTask(dir, "check", `deno eval 'console.log("scripts/run-gate.mjs")'`);
      const res = runParity(dir);
      assert(res.code === 1, `expected exit 1, got ${res.code}`);
      assert(
        res.text.includes("`deno task check` declares exactly the gate entrypoint"),
        `the entrypoint check must be the one that fails: ${res.text.slice(0, 400)}`,
      );
    });

    check("RED: tasks.check with an injected --dry-run flag", () => {
      const dir = freshCopy();
      setTask(
        dir,
        "check",
        "deno run --allow-read --allow-run scripts/run-gate.mjs --dry-run",
      );
      const res = runParity(dir);
      assert(res.code === 1, `expected exit 1, got ${res.code}`);
      assert(
        res.text.includes("`deno task check` declares exactly the gate entrypoint"),
        `the entrypoint check must be the one that fails: ${res.text.slice(0, 400)}`,
      );
    });

    check("RED: tasks.check masked behind an echo", () => {
      const dir = freshCopy();
      setTask(
        dir,
        "check",
        "echo deno run --allow-read --allow-run scripts/run-gate.mjs",
      );
      const res = runParity(dir);
      assert(res.code === 1, `expected exit 1, got ${res.code}`);
      assert(
        res.text.includes("`deno task check` declares exactly the gate entrypoint"),
        `the entrypoint check must be the one that fails: ${res.text.slice(0, 400)}`,
      );
    });

    check("GREEN: the gate may typecheck a SUPERSET of what CI requires", () => {
      const dir = freshCopy();
      // CI requires `deno check server.ts`; add one more operand on the gate
      // side — the declared tolerance (identical flags, CI operands present).
      setTask(
        dir,
        "typecheck",
        "deno check server.ts scripts/build-worklist.mjs scripts/sync-gendn-links.mjs scripts/gate-steps.mjs",
      );
      const res = runParity(dir);
      assert(res.code === 0, `expected exit 0, got ${res.code}: ${res.text.slice(0, 400)}`);
    });

    check("GREEN: a gate task may split into declared cmd1 && cmd2", () => {
      const dir = freshCopy();
      // CI requires `deno fmt --check`; the gate task adds a second DECLARED
      // invocation after && — neither an operator refusal nor a mirror loss.
      setTask(dir, "fmt-check", "deno fmt --check && deno check server.ts");
      const res = runParity(dir);
      assert(res.code === 0, `expected exit 0, got ${res.code}: ${res.text.slice(0, 400)}`);
    });
  } finally {
    for (const d of dirs) Deno.removeSync(d, { recursive: true });
  }
  if (failures.length > 0) {
    throw new Error(`gate fixture matrix: ${failures.length} row(s) failed`);
  }
  console.log("\ngate fixture matrix: all rows passed");
});
