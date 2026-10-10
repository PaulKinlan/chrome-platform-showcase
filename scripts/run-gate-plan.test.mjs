#!/usr/bin/env -S deno run --allow-read --allow-run=deno,git --allow-write
// Does `scripts/run-gate.mjs` actually execute the plan it declares?
//
// The static guard (`scripts/gate-parity.test.mjs`) proves DECLARATION parity: the
// entrypoints, the gate plan and CI declare the same commands, and every credit is
// a parsed, reachable invocation. It cannot show that the runner executes those
// commands, or that the affected tier excludes only what it should. This suite
// closes that dynamic edge (bead chrome_platform_showcase-z4u) and deliberately
// claims no more than that:
//
//   * it proves STRUCTURE — declaration -> selection -> execution. It does not
//     prove that the real suites assert what their names say, and it does not
//     replace the merger's real full gate.
//   * the real suites are NEVER executed here. Every task command in the scratch
//     tree is replaced by a stub, and that substitution is asserted to be total.
//   * the real `run-gate.mjs`, `gate-steps.mjs` and `affected-tests.mjs` are copied
//     UNMODIFIED into a scratch tree. The plan and the selection logic under test
//     are therefore the real ones; only the work is stubbed.
//   * mutation-applied controls A/B/C prove this harness can detect a skipped step,
//     an unawaited failure and a wrong selection. A control that cannot fail is not
//     evidence, and each control asserts that its own mutation actually applied.
//
// Everything is written under the OS temp dir and removed in a `finally`; nothing
// is ever written inside the repository.
//
// Run: deno task test-run-gate-plan

import { ALL_STEP_IDS, GATE_STEPS } from "./gate-steps.mjs";

const REPO = new URL("../", import.meta.url).pathname;
const PLAN_TASKS = GATE_STEPS.map((s) => s.task);
const STATIC_IDS = GATE_STEPS.filter((s) => s.tier === "static").map((s) => s.id);
const STUB = "scripts/_stub.mjs";
const STUB_COMMAND = `deno run --allow-read --allow-write ${STUB}`;
const HARNESS_CANCEL = ".harness-cancel";
// A child copy runs the selection and execution layers only. It exists so the
// harness can prove that ITS OWN PROCESS EXITS, measured from outside itself.
const CHILD_MODE = Deno.args.includes("--child");
/** Thrown when a child outlives the deadline — named so the hung-stub fixture can
 * assert on the type, not on a message. */
class HarnessTimeout extends Error {
  constructor(label, ms) {
    super(`${label} did not finish within ${ms}ms — the harness deadline fired`);
    this.name = "HarnessTimeout";
  }
}

/** Run a child under a real watchdog and report what happened, clearing EVERY timer.
 * `timedOut` means the watchdog fired and the child was killed; the caller decides
 * whether that is a failure. */
async function runBoundedChild(args, { cwd, deadlineMs = 20_000 } = {}) {
  const started = performance.now();
  // stdout/stderr are discarded rather than piped. A pipe held by a child that will not
  // exit is a live file descriptor with a pending read, which keeps THIS process alive —
  // measured here after a kill that silently failed (see killError below).
  const child = new Deno.Command("deno", { args, cwd, stdout: "null", stderr: "null" }).spawn();
  const timers = [];
  const boundedRace = (promise, ms, fallback) => {
    let handle;
    const timer = new Promise((resolve) => {
      handle = setTimeout(() => resolve(fallback), ms);
    });
    timers.push(handle);
    try {
      Deno.unrefTimer(handle);
    } catch { /* runtime without unrefTimer: the finally still clears it */ }
    return Promise.race([promise, timer]);
  };
  try {
    const exit = await boundedRace(child.status.then((status) => status.code), deadlineMs, null);
    let killError = null;
    if (exit === null) {
      try {
        Deno.kill(child.pid, "SIGKILL");
      } catch (error) {
        // Never swallow this: a silent no-op here is exactly how the harness once
        // kept a killed-looking child alive. `Deno.kill` needs --allow-run with no
        // path restriction; a path-restricted allowlist reports NotCapable.
        killError = error;
      }
    }
    return {
      exit,
      timedOut: exit === null,
      killError,
      elapsedMs: Math.round(performance.now() - started),
      error: exit === null ? new HarnessTimeout(`child ${args.join(" ")}`, deadlineMs) : null,
    };
  } finally {
    for (const handle of timers) clearTimeout(handle);
  }
}

/** The property finding 5v8 broke is that the process EXITS. Elapsed time is advisory
 * only: a correctness-green child can exceed any fixed performance budget on a loaded
 * VM, and a hard wall-clock assertion here would be a false red in the very gate this
 * guards — the same reasoning behind adopting no runtime threshold for the gate itself.
 * No such failure has been observed, and the 11.53s the review measured was this
 * check's own PARENT process exiting externally, not this child's elapsed time; the
 * risk is therefore prospective rather than demonstrated, which is precisely why a
 * fixed budget here would be quiet until the day a loaded VM tripped it. The 20s
 * watchdog, not the 12s design target, is what bounds a hang. */
function childExitVerdict(exit, elapsedMs) {
  return { ok: exit === 0, advisory: elapsedMs >= 12_000, elapsedMs };
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

function stubSource(failTask = null, failCode = 7, hangTask = null) {
  const head = `const task = Deno.args[0];\nconsole.log(\`RUN \${task}\`);\n`;
  const fail = failTask
    ? `if (task === ${JSON.stringify(failTask)}) Deno.exit(${failCode});\n`
    : "";
  // A child that will never exit on its own. It exits only when the harness
  // cancels the tree, which is how "no orphan left behind" is asserted rather
  // than assumed.
  const hang = hangTask
    ? `if (task === ${JSON.stringify(hangTask)}) {
  const cancel = new URL(${JSON.stringify("../" + HARNESS_CANCEL)}, import.meta.url);
  const done = new URL(${JSON.stringify("../" + HARNESS_CANCEL + ".exited")}, import.meta.url);
  const exists = (u) => { try { Deno.statSync(u); return true; } catch { return false; } };
  while (!exists(cancel)) await new Promise((r) => setTimeout(r, 20));
  await Deno.writeTextFile(done, task);
  Deno.exit(0);
}\n`
    : "";
  return head + fail + hang;
}

/** Spawn the scratch tree's real runner. Parses the JSON payload after its human prefix. */
async function readStream(stream) {
  if (!stream) return "";
  const parts = [];
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }
  } catch {
    // the deadline cancelled this read; whatever arrived is still useful
  }
  const total = parts.reduce((n, part) => n + part.length, 0);
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    buffer.set(part, offset);
    offset += part.length;
  }
  return new TextDecoder().decode(buffer);
}

/** A deadline that actually fires. `Deno.Command.output({ timeout })` is IGNORED
 * in Deno 2.9.7: measured on this VM, a 200ms child given `timeout: 1` still ran
 * to completion in 239ms and returned rc 0. A harness built on that option can
 * hang the gate forever, and `elapsed > 30_000` after the await is not a bound.
 *
 * So: spawn, keep an explicit deadline, and on expiry (a) write the cancel file
 * the stubbed tasks poll, (b) SIGKILL the child, (c) cancel our pipe reads — a
 * surviving grandchild holds the inherited stdio, and without (c) the read never
 * ends (measured: the pipe stayed open 3s after killing the child). */
async function runGate(root, args, timeoutMs = 45_000) {
  const command = new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-run", "scripts/run-gate.mjs", ...args],
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();
  const cancelPath = new URL(HARNESS_CANCEL, `file://${root}/`);
  const io = (async () => (await readStream(child.stdout)) + (await readStream(child.stderr)))();
  const exited = child.status.then((status) => status.code);
  const timers = new Set();

  /** A timer that loses its race must never keep the event loop alive. Finding 5v8:
   * the uncleared race timers below made this harness print 24 green checks and then
   * sit for ~47s until an external timeout killed it with rc 124, stalling the very
   * static gate it guards. Every timer is retained, unref'd, and cleared in `finally`. */
  const bounded = (ms, fallback) => {
    let handle;
    const timer = new Promise((resolve) => {
      handle = setTimeout(() => resolve(fallback), ms);
    });
    timers.add(handle);
    try {
      Deno.unrefTimer(handle);
    } catch { /* runtime without unrefTimer: `finally` still clears it */ }
    return timer;
  };

  let timedOut = false;
  const deadline = setTimeout(async () => {
    timedOut = true;
    try {
      await Deno.writeTextFile(cancelPath, "cancel");
    } catch { /* the tree may already be gone */ }
    try {
      Deno.kill(child.pid, "SIGKILL");
    } catch { /* already exited */ }
    for (const stream of [child.stdout, child.stderr]) {
      try {
        await stream?.cancel();
      } catch { /* already closed */ }
    }
  }, timeoutMs);
  timers.add(deadline);
  try {
    Deno.unrefTimer(deadline);
  } catch { /* see above */ }

  try {
    const code = await Promise.race([exited, bounded(timeoutMs + 2000, 137)]);
    // A surviving grandchild holds the inherited stdio, so this read is bounded too.
    const text = await Promise.race([io, bounded(500, "")]);
    if (timedOut) {
      throw new HarnessTimeout(`run-gate.mjs ${args.join(" ") || "(full plan)"}`, timeoutMs);
    }
    // Fail-closed runs print `gate: FAIL-CLOSED …` BEFORE the JSON object, so the
    // payload has to be taken from the first brace rather than from the whole output.
    let payload = null;
    if (text.includes("{")) {
      try {
        payload = JSON.parse(text.slice(text.indexOf("{")));
      } catch {
        payload = null;
      }
    }
    return { code, text, payload };
  } finally {
    // Every outcome — success, timeout, or a thrown check — ends here, and no timer
    // survives to hold the process open.
    for (const handle of timers) clearTimeout(handle);
    timers.clear();
  }
}

const markers = (text) =>
  text.split("\n").filter((l) => l.startsWith("RUN ")).map((l) => l.slice(4));

/** One scratch tree: real runner/plan/selector, every task stubbed to the same program. */
async function buildScratch(root, { withGit = true, failTask = null } = {}) {
  await Deno.mkdir(`${root}/scripts`, { recursive: true });
  for (const file of ["run-gate.mjs", "gate-steps.mjs", "affected-tests.mjs"]) {
    await Deno.copyFile(`${REPO}scripts/${file}`, `${root}/scripts/${file}`);
  }
  await Deno.writeTextFile(`${root}/${STUB}`, stubSource(failTask));
  const tasks = JSON.parse(await Deno.readTextFile(`${REPO}deno.json`)).tasks ?? {};
  const stubTasks = {};
  for (const name of Object.keys(tasks)) stubTasks[name] = `${STUB_COMMAND} ${name}`;
  await Deno.writeTextFile(`${root}/deno.json`, JSON.stringify({ tasks: stubTasks }, null, 2));
  // The mechanical guarantee behind "the real suites never run here": no task may
  // escape the stub program. This is an assertion, not a promise in a comment, and
  // it also makes the harness immune to whatever shape deno.json takes next.
  const escaped = Object.entries(stubTasks).filter(([, cmd]) =>
    !cmd.startsWith(`${STUB_COMMAND} `)
  );
  check(
    "stub substitution is total — no task in the scratch tree can run a real suite",
    escaped.length === 0,
    `tasks escaping the stub: ${escaped.map(([t]) => t).join(", ")}`,
  );
  if (!withGit) return;
  await Deno.mkdir(`${root}/routes`, { recursive: true });
  await Deno.writeTextFile(`${root}/routes/release-endpoints.ts`, "export const x = 1;\n");
  const git = async (...args) =>
    await new Deno.Command("git", { args, cwd: root, stdout: "null", stderr: "null" }).output();
  await git("init", "-q", ".");
  await git("add", "-A");
  await git(
    "-c",
    "user.email=gate@example.invalid",
    "-c",
    "user.name=gate-harness",
    "commit",
    "-qm",
    "scratch base",
  );
  const head = await new Deno.Command("git", {
    args: ["rev-parse", "HEAD"],
    cwd: root,
    stdout: "piped",
  }).output();
  return new TextDecoder().decode(head.stdout).trim();
}

/** Run `mutate` against a copy in the scratch tree, then restore the original file. */
async function withMutation(root, relative, mutate, args = []) {
  const target = `${root}/${relative}`;
  const original = await Deno.readTextFile(target);
  const mutated = mutate(original);
  if (mutated === original) return null;
  await Deno.writeTextFile(target, mutated);
  try {
    return await runGate(root, args);
  } finally {
    await Deno.writeTextFile(target, original);
  }
}

const started = performance.now();
const root = await Deno.makeTempDir({ prefix: "gate-plan-harness-" });
const shrunk = await Deno.makeTempDir({ prefix: "gate-plan-shrunk-" });
try {
  // The property that matters is that nothing of ours is ever written inside the
  // repository — asserted portably, without assuming a POSIX absolute-path shape,
  // because this step also runs on a developer's machine (the gate itself is
  // deliberately cross-platform). Cleanliness is asserted at the end of the run.
  check(
    "the scratch tree is outside the repository",
    !root.startsWith(REPO) && Deno.realPathSync(root) !== REPO,
    `scratch root ${root} vs repo ${REPO}`,
  );

  const base = await buildScratch(root);
  const full = await runGate(root, ["--json"]);
  const allIds = full.payload?.selection?.allIds ?? [];
  const staticIds = full.payload?.selection?.staticIds ?? [];

  // ── L1: selection, with nothing executed ────────────────────────────────────
  check(
    "the full tier selects every declared step, in plan order",
    full.code === 0 &&
      JSON.stringify(full.payload?.selection?.steps) === JSON.stringify(ALL_STEP_IDS),
    `selection.steps vs the plan's ${ALL_STEP_IDS.length} ids (${allIds.length} reported)`,
  );
  check(
    "the full tier's allIds is exactly the plan",
    JSON.stringify(allIds) === JSON.stringify(ALL_STEP_IDS),
    `allIds ${allIds.length} vs plan ${ALL_STEP_IDS.length}`,
  );
  const staticRun = await runGate(root, ["--affected", "--json"]);
  check(
    "with no change the affected tier selects exactly the static steps",
    staticRun.payload?.selection?.tier === "static" &&
      JSON.stringify(staticRun.payload?.selection?.steps) === JSON.stringify(STATIC_IDS),
    `tier ${staticRun.payload?.selection?.tier} steps ${
      JSON.stringify(staticRun.payload?.selection?.steps)
    }`,
  );
  // The pin below is deliberate: it is the one place this suite asserts a literal
  // selection set. If a selection rule changes, update it here AND cite the change
  // on bead chrome_platform_showcase-z4u — do not loosen the assertion to survive it.
  const explicit = await runGate(root, [
    "--affected",
    "--paths",
    "routes/release-endpoints.ts",
    "--json",
  ]);
  // The rule-side ids are the one literal selection pin in this suite. The static
  // side is derived from the plan, so adding or removing a static step cannot break
  // this — only a change to the `routes/release-endpoints.ts` rule can, and then the
  // diff is named in the failure. If a rule changes, update this list AND cite the
  // change on bead chrome_platform_showcase-z4u; do not loosen the assertion to
  // survive it.
  const RELEASE_ENDPOINT_RULE_IDS = [
    "test-session-bounds",
    "test-header-grammar",
    "test-spc-bbk-device-name",
    "test-spc-bbk-jwk-shape",
    "test-dbsc-jwk-shape",
    "test-evp-nonce-replay",
    "test-speculation-probe-store",
    "test-speculation-probe-docs",
    "test-server-boot",
    "test-hardening",
  ];
  const expectedAffected = [...STATIC_IDS, ...RELEASE_ENDPOINT_RULE_IDS];
  const explicitSteps = explicit.payload?.selection?.steps ?? [];
  check(
    "the affected tier selects the static floor plus that path's rule and nothing else",
    explicit.payload?.selection?.tier === "affected" &&
      explicitSteps.length === expectedAffected.length &&
      expectedAffected.every((id) => explicitSteps.includes(id)),
    `tier ${explicit.payload?.selection?.tier}, ${explicitSteps.length} selected vs ${expectedAffected.length} expected (` +
      `missing ${
        expectedAffected.filter((id) => !explicitSteps.includes(id)).join(", ") || "none"
      }, ` +
      `extra ${explicitSteps.filter((id) => !expectedAffected.includes(id)).join(", ") || "none"})`,
  );
  const noChange = await runGate(root, ["--affected", "--base", base, "--json"]);
  check(
    "git: a clean tree against the base selects only the static floor",
    noChange.code === 0 &&
      JSON.stringify(noChange.payload?.selection?.steps) === JSON.stringify(STATIC_IDS),
    `tier ${noChange.payload?.selection?.tier}, ${noChange.payload?.selection?.steps?.length} selected`,
  );
  await Deno.writeTextFile(`${root}/routes/release-endpoints.ts`, "export const x = 2;\n");
  const changed = await runGate(root, ["--affected", "--base", base, "--json"]);
  check(
    "git: a changed path selects that path's rule on top of the static floor",
    changed.payload?.selection?.tier === "affected" &&
      changed.payload?.selection?.steps?.includes("test-session-bounds") &&
      STATIC_IDS.every((id) => changed.payload.selection.steps.includes(id)),
    `tier ${changed.payload?.selection?.tier}, ${changed.payload?.selection?.steps?.length} selected`,
  );

  // ── L1: fail-closed paths assert the reason, never a non-zero exit ──────────
  const bogus = await runGate(root, [
    "--affected",
    "--base",
    "refs/heads/does-not-exist",
    "--json",
  ]);
  check(
    "an unresolvable base fails CLOSED to the full gate, with rc 0 and a reason",
    bogus.code === 0 && bogus.payload?.selection?.tier === "full" &&
      String(bogus.payload?.source ?? "").startsWith("UNKNOWN change set") &&
      bogus.text.includes("FAIL-CLOSED"),
    `rc ${bogus.code}, tier ${bogus.payload?.selection?.tier}, source ${
      JSON.stringify(bogus.payload?.source)?.slice(0, 60)
    }`,
  );
  const index = `${root}/.git/index`;
  const indexBackup = await Deno.readFile(index);
  await Deno.writeFile(index, new Uint8Array(40).fill(0x7f));
  const corrupt = await runGate(root, ["--affected", "--base", base, "--json"]);
  await Deno.writeFile(index, indexBackup);
  check(
    "an unreadable change set fails CLOSED to the full gate, with rc 0 and a reason",
    corrupt.code === 0 && corrupt.payload?.selection?.tier === "full" &&
      String(corrupt.payload?.source ?? "").includes("index file corrupt"),
    `rc ${corrupt.code}, tier ${corrupt.payload?.selection?.tier}, source ${
      JSON.stringify(corrupt.payload?.source)?.slice(0, 80)
    }`,
  );
  const restored = await runGate(root, ["--affected", "--base", base, "--json"]);
  check(
    "the harness restores the scratch repository after the corrupt-index case",
    restored.code === 0 && restored.payload !== null,
    `rc ${restored.code}`,
  );

  // ── L2: execution — exact task names, order, and rc propagation ─────────────
  const green = await runGate(root, []);
  const greenMarkers = markers(green.text);
  check(
    "every declared step executes, in plan order",
    green.code === 0 && JSON.stringify(greenMarkers) === JSON.stringify(PLAN_TASKS),
    `ran ${greenMarkers.length} of ${PLAN_TASKS.length}; first divergence at ${
      greenMarkers.findIndex((m, i) => m !== PLAN_TASKS[i])
    }, rc ${green.code}`,
  );
  const failAt = GATE_STEPS[Math.min(10, GATE_STEPS.length - 1)].task;
  await Deno.writeTextFile(`${root}/${STUB}`, stubSource(failAt, 7));
  const failing = await runGate(root, []);
  const failMarkers = markers(failing.text);
  await Deno.writeTextFile(`${root}/${STUB}`, stubSource());
  check(
    "a failing step stops the run and its exit code becomes the gate's",
    failing.code === 7 && failMarkers.at(-1) === failAt,
    `rc ${failing.code} (expected 7), last marker ${failMarkers.at(-1)} (expected ${failAt})`,
  );
  check(
    "no step after the failure is executed",
    failMarkers.length < PLAN_TASKS.length && !failMarkers.includes(PLAN_TASKS.at(-1)),
    `ran ${failMarkers.length} of ${PLAN_TASKS.length} markers`,
  );

  // ── the process must exit on its own, measured from OUTSIDE this harness ────
  //
  // Finding 5v8 is not detectable from performance.now(): the harness printed green
  // and then never exited. This spawns a real child copy through the registered task
  // and bounds it externally, so a leaked timer or an unclosed pipe fails the gate
  // instead of stalling it.
  if (!CHILD_MODE) {
    // Bounded from OUTSIDE, because performance.now() inside this process cannot see a
    // failure to exit (finding 5v8). Spawn by NAME, not Deno.execPath(): the task's
    // `--allow-run=deno` allowlist matches the literal path, and execPath is absolute.
    const self = await runBoundedChild(["task", "test-run-gate-plan", "--child"], {
      cwd: REPO,
      deadlineMs: 20_000,
    });
    const verdict = childExitVerdict(self.exit, self.elapsedMs);
    if (verdict.advisory) {
      console.log(
        `advisory — the child copy took ${self.elapsedMs}ms, past the ${12_000}ms design target; not a failure`,
      );
    }
    check(
      "the harness process exits on its own (20s watchdog bounds a hang; elapsed is advisory)",
      verdict.ok,
      self.timedOut
        ? `${self.error.name}: ${self.error.message}${
          self.killError ? ` (kill failed: ${self.killError.message})` : ""
        }`
        : `child copy exited rc ${self.exit} after ${self.elapsedMs}ms`,
    );

    // Focused proofs of the two properties that check rests on, so neither is assumed:
    // the watchdog really stops a hung child with a named failure, and a green child is
    // not failed for being slow.
    const hung = await runBoundedChild(["eval", "setInterval(() => {}, 1000);"], {
      deadlineMs: 700,
    });
    // Note what does NOT hang: `deno eval "await new Promise(() => {})"` fails fast with
    // "Top-level await promise never resolved" (rc 1 in ~40ms) — the first version of
    // this proof used exactly that, and the check caught it.
    check(
      "focused proof: the watchdog stops a hanging child and reports a named failure",
      hung.timedOut && hung.exit === null && hung.error instanceof HarnessTimeout &&
        hung.elapsedMs >= 700 && hung.elapsedMs < 5000,
      `timedOut=${hung.timedOut} exit=${hung.exit} error=${hung.error?.name} after ${hung.elapsedMs}ms (watchdog 700ms)`,
    );
    const green = childExitVerdict(0, 20_000);
    const failed = childExitVerdict(1, 10);
    const noExit = childExitVerdict(null, 20_000);
    check(
      "focused proof: a green child is not failed merely for exceeding the 12s target",
      green.ok && green.advisory && !failed.ok && !noExit.ok,
      `green(exit 0, 20s) ok=${green.ok} advisory=${green.advisory}; rc 1 ok=${failed.ok}; no exit ok=${noExit.ok}`,
    );

    // ── Controls A and C: mutate the runner on a short plan ─────────────────────
    // A 3-step plan exercises the loop completely, so these controls stay cheap
    // without weakening what they prove.
    const shortPlan = [
      { id: "one", task: "one", tier: "static", what: "control step one" },
      { id: "two", task: "two", tier: "static", what: "control step two" },
      { id: "three", task: "three", tier: "affected", what: "control step three" },
    ];
    await Deno.mkdir(`${shrunk}/scripts`, { recursive: true });
    for (const file of ["run-gate.mjs"]) {
      await Deno.copyFile(`${REPO}scripts/${file}`, `${shrunk}/scripts/${file}`);
    }
    await Deno.writeTextFile(
      `${shrunk}/scripts/gate-steps.mjs`,
      `export const GATE_STEPS = ${JSON.stringify(shortPlan, null, 2)};\n` +
        `export const ALL_STEP_IDS = GATE_STEPS.map((s) => s.id);\n` +
        `export const STATIC_STEP_IDS = GATE_STEPS.filter((s) => s.tier === "static").map((s) => s.id);\n`,
    );
    await Deno.writeTextFile(
      `${shrunk}/scripts/affected-tests.mjs`,
      `const staticIds = ["one", "two"];\n` +
        `export function selectSteps(paths) {\n` +
        `  const all = ${JSON.stringify(shortPlan.map((s) => s.id))};\n` +
        `  if (!paths || paths.length === 0) return { tier: "full", steps: all, staticIds, skipped: [], reasons: [], unmatched: [], allIds: all };\n` +
        `  const extra = paths.includes("src/three.ts") ? ["three"] : [];\n` +
        `  return { tier: "affected", steps: [...staticIds, ...extra], staticIds, skipped: all.filter((i) => !staticIds.includes(i) && !extra.includes(i)), reasons: [], unmatched: [], allIds: all };\n` +
        `}\n` +
        `export function changedPaths() { return { paths: [] }; }\n`,
    );
    await Deno.writeTextFile(
      `${shrunk}/deno.json`,
      JSON.stringify(
        {
          tasks: Object.fromEntries(
            shortPlan.map((s) => [s.task, `deno run --allow-read ${STUB} ${s.task}`]),
          ),
        },
        null,
        2,
      ),
    );
    await Deno.writeTextFile(`${shrunk}/${STUB}`, stubSource());
    const shortTasks = shortPlan.map((s) => s.task);
    const shortGreen = await runGate(shrunk, []);
    check(
      "control baseline: the short plan runs all three steps",
      shortGreen.code === 0 &&
        JSON.stringify(markers(shortGreen.text)) === JSON.stringify(shortTasks),
      `markers ${JSON.stringify(markers(shortGreen.text))}, rc ${shortGreen.code}`,
    );

    // Control A — a step the loop skips entirely, before the spawn.
    const skipped = await withMutation(shrunk, "scripts/run-gate.mjs", (source) =>
      source.replace(
        '  const child = new Deno.Command("deno", {',
        '  if (step.id === "two") continue;\n  const child = new Deno.Command("deno", {',
      ));
    const skippedMarkers = skipped === null ? [] : markers(skipped.text);
    check(
      "control A applied (control A is only evidence if it could fail)",
      skipped !== null && skippedMarkers.length === 2,
      `mutation ${skipped === null ? "did not apply" : "applied"}, markers ${
        JSON.stringify(skippedMarkers)
      }`,
    );
    check(
      "control A: the expected-set assertion detects a skipped step",
      JSON.stringify(skippedMarkers) !== JSON.stringify(shortTasks) &&
        !skippedMarkers.includes("two"),
      `markers ${JSON.stringify(skippedMarkers)} would have passed an expected-set assertion`,
    );

    // Control C — a failing step whose status is never awaited, so the failure cannot
    // reach the exit code. Markers alone would look fine: this is why the rc/ordering
    // assertion exists as a control of its own.
    await Deno.writeTextFile(`${shrunk}/${STUB}`, stubSource("two", 7));
    const unawaited = await withMutation(shrunk, "scripts/run-gate.mjs", (source) =>
      source.replace(
        "  const status = await child.status;",
        '  if (step.id === "two") continue;\n  const status = await child.status;',
      ));
    await Deno.writeTextFile(`${shrunk}/${STUB}`, stubSource());
    check(
      "control C applied (the unawaited failure must be a real mutation)",
      unawaited !== null && unawaited.code === 0,
      `mutation ${unawaited === null ? "did not apply" : "applied"}, rc ${unawaited?.code}`,
    );
    check(
      "control C: the rc assertion detects a failure the runner never awaited",
      unawaited !== null && unawaited.code === 0 && markers(unawaited.text).includes("three"),
      `rc ${unawaited?.code} while step \`two\` exited 7 — a markers-only harness would call this green`,
    );

    // ── the deadline is a real bound, and cancelling leaves nothing behind ──────
    //
    // With `output({ timeout })` this harness could hang the gate forever. The stub
    // below never exits on its own; the only way this check passes is the deadline
    // firing, the child being killed, and the stubbed tree observing cancellation
    // and reporting its own exit. Note the honest limit: the exit proof shows the
    // *stubbed* child stopped. A hostile uncooperative process is bounded by the
    // SIGKILL of the child and by the harness never waiting on it again, and the
    // review evidence additionally checks the process table.
    const hangTask = PLAN_TASKS[Math.min(3, PLAN_TASKS.length - 1)];
    const cancelFile = new URL(HARNESS_CANCEL, `file://${root}/`);
    const exitProof = new URL(`${HARNESS_CANCEL}.exited`, `file://${root}/`);
    for (const url of [cancelFile, exitProof]) {
      try {
        await Deno.remove(url);
      } catch { /* not there */ }
    }
    await Deno.writeTextFile(`${root}/${STUB}`, stubSource(null, 7, hangTask));
    const hangStart = performance.now();
    let hangError = null;
    try {
      await runGate(root, [], 800);
    } catch (error) {
      hangError = error;
    }
    const hangMs = Math.round(performance.now() - hangStart);
    await Deno.writeTextFile(`${root}/${STUB}`, stubSource());
    check(
      "a child that never exits is stopped by the deadline, and reported as a named error",
      hangError instanceof HarnessTimeout && hangMs >= 800 && hangMs < 5000,
      `${
        hangError
          ? `${hangError.name}: ${hangError.message}`
          : "no error — the child was NOT bounded"
      } (deadline 800ms, elapsed ${hangMs}ms)`,
    );
    let stopped = false;
    for (let i = 0; i < 150 && !stopped; i++) {
      try {
        await Deno.stat(exitProof);
        stopped = true;
      } catch {
        await new Promise((r) => setTimeout(r, 20));
      }
    }
    check(
      "cancelling the hung child leaves no orphan behind",
      stopped,
      "the hung stub never reported its own exit after cancellation — it may still be running",
    );
    try {
      await Deno.remove(exitProof);
    } catch { /* fine */ }

    // Control B — a valid but WRONG selection. It runs on the explicit `--paths` seam:
    // mutating a file inside the scratch repository would make that path itself a
    // changed, unmatched path, and the runner would correctly fail closed to the full
    // tier, so the control would appear to work for entirely the wrong reason.
    const affectedArgs = ["--affected", "--paths", "routes/release-endpoints.ts", "--json"];
    const beforeB = await runGate(root, affectedArgs);
    const afterB = await withMutation(
      root,
      "scripts/affected-tests.mjs",
      (source) => source.replace('"test-spc-bbk-device-name",', ""),
      affectedArgs,
    );
    const beforeSteps = beforeB.payload?.selection?.steps ?? [];
    const afterSteps = afterB?.payload?.selection?.steps ?? [];
    check(
      "control B applied on the affected tier, not by failing closed",
      afterB?.payload?.selection?.tier === "affected" && afterSteps.length !== beforeSteps.length,
      `tier ${afterB?.payload?.selection?.tier}, ${beforeSteps.length} -> ${afterSteps.length} selected`,
    );
    check(
      "control B: the expected-set assertion detects a wrong exclusion",
      beforeSteps.includes("test-spc-bbk-device-name") &&
        !afterSteps.includes("test-spc-bbk-device-name"),
      `${beforeSteps.length} -> ${afterSteps.length}; excluded id present before: ${
        beforeSteps.includes("test-spc-bbk-device-name")
      }`,
    );
    check(
      "the scratch selector was restored after control B",
      JSON.stringify(
        (await runGate(root, ["--affected", "--paths", "routes/release-endpoints.ts", "--json"]))
          .payload?.selection?.steps,
      ) === JSON.stringify(beforeSteps),
      "selection after restore differs from the baseline",
    );
  }
} finally {
  await Deno.remove(root, { recursive: true }).catch(() => {});
  await Deno.remove(shrunk, { recursive: true }).catch(() => {});
}

// Wall-clock: the design budget is ~1.5s with a 12s ceiling, measured in review.
// The primary bound is the per-child deadline in runGate, which actually fires;
// this end-of-run assertion is only a secondary pathology guard, deliberately
// loose (30s) because this runs on a shared VM where a heavy job can starve it.
// A wall-clock flake must never fail the gate; exceeding the 12s ceiling on a
// healthy machine means split this step, not raise the number.
const elapsed = Math.round(performance.now() - started);
console.log(`\ngate plan harness: ${elapsed}ms (design budget ~1500ms, ceiling 12000ms)`);
if (elapsed > 30_000) {
  console.error(`FAIL — the harness took ${elapsed}ms, which is a pathology on any machine`);
  failures++;
}

if (failures) {
  console.error(`\n${failures} gate plan execution check(s) failed`);
  Deno.exit(1);
}
console.log("gate plan execution: the declared plan is the plan that is selected and executed");
