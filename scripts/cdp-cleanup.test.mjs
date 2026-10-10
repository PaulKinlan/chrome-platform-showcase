// Strict CDP teardown contract (bead chrome_platform_showcase-1w1, Stage 1 of 3gt).
//
// `launchChrome` used to leak its temp profile on both of its own failure paths —
// the spawn that throws after `Deno.makeTempDir`, and the branch that kills the
// child and throws when the devtools endpoint never comes up — and
// `cleanupChrome` swallowed both the kill and the removal, so a profile that
// survived left no trace anywhere in the evidence. The pre-existing
// /tmp/cps-cdp-* population is what that looks like after enough runs.
//
// This suite pins the STRICT counterpart, `teardownChrome`, and the two
// self-clean paths in `launchChrome`. It is Chrome-free and cheap on purpose: it
// will become a static gate step, so every invocation pays for it, and it uses
// fake children plus real temp directories rather than a browser.
//
// What this suite does NOT claim, and the code must not either:
//   * `Deno.remove` has no cancellation, so the timeout path reports an
//     UNCONFIRMED deletion instead of a failure it cannot distinguish from a
//     slow success, and nothing here pretends the IO stopped;
//   * a SIGKILL is a request, so a child unresolved after the second bound is
//     reported, never counted as reaped;
//   * nothing runs after a hard parent SIGKILL, so `finally` is not a guarantee.
//
// `cleanupChrome` is deliberately still the old swallow-everything wrapper: the
// four unconverted harnesses keep today's behaviour and their interim
// cleanup-only false-green is tracked on the parent bead until their own stages
// migrate them. Nothing in this file asserts anything about that wrapper.
//
// The suite owns every directory it touches. It points TMPDIR at its own root,
// so it never reads, counts or deletes the pre-existing /tmp/cps-cdp-* profiles,
// and a leak shows up as a leftover entry in its own root instead.
//
// Run: deno task test-cdp-cleanup

import assert from "node:assert/strict";

import {
  CDP_TEARDOWN_BOUND_MS,
  CdpTeardownError,
  launchChrome,
  teardownChrome,
} from "./lib/cdp.mjs";
import {
  main as conformanceSweepMain,
  parseArgs as conformanceSweepParseArgs,
  reapServerChild as conformanceSweepReap,
} from "./conformance-sweep.mjs";
import {
  main as driveDemosMain,
  parseArgs as driveDemosParseArgs,
  reapServerChild as driveDemosReap,
  retireServerChild as driveDemosRetire,
} from "./drive-demos.mjs";

const root = await Deno.makeTempDir({ prefix: "dty1w1-cdp-root-" });
Deno.env.set("TMPDIR", root);

// A stand-in for a Chrome child: the strict teardown only ever calls `kill` and
// reads `status`, so a double is honest here in a way it would not be for a
// browser behaviour test.
function fakeChild({ status = Promise.resolve(0), kill } = {}) {
  const signals = [];
  return {
    signals,
    child: {
      kill(signal) {
        signals.push(signal ?? "SIGTERM");
        if (kill) return kill(signal);
        return true;
      },
      status,
    },
  };
}

const entriesInRoot = () => [...Deno.readDirSync(root)].map((e) => e.name).sort();

// Whether the mode actually blocks a recursive removal is MEASURED rather than
// assumed: for root (and for filesystems that ignore modes) it does not, and
// `Deno.uid()` would need a sys permission this task deliberately does not
// grant. The probe owns and removes its own directory either way.
async function modeBlocksRemoval() {
  const probe = await Deno.makeTempDir({ prefix: "cps-cdp-probe-" });
  await Deno.writeTextFile(`${probe}/held-open`, "content");
  await Deno.chmod(probe, 0o500);
  try {
    await Deno.remove(probe, { recursive: true });
    return false;
  } catch {
    await Deno.chmod(probe, 0o700);
    await Deno.remove(probe, { recursive: true });
    return true;
  }
}

Deno.test("teardownChrome reaps a live child and removes the profile it owns", async () => {
  const dir = await Deno.makeTempDir({ prefix: "cps-cdp-" });
  await Deno.writeTextFile(`${dir}/marker`, "profile content");
  const { child, signals } = fakeChild();

  const result = await teardownChrome({ child, userDataDir: dir });

  assert.deepEqual(result, { childReaped: true, profileRemoved: true, failures: [] });
  assert.deepEqual(signals, ["SIGTERM"], "a child that exits must not be SIGKILLed");
  await assert.rejects(
    Deno.stat(dir),
    (err) => err instanceof Deno.errors.NotFound,
    "the profile must be gone",
  );
});

Deno.test("teardownChrome escalates SIGTERM to SIGKILL and reports a child that never exits", async () => {
  const { child, signals } = fakeChild({ status: new Promise(() => {}) });

  const started = Date.now();
  await assert.rejects(
    teardownChrome({ child, userDataDir: null }, { boundMs: 150 }),
    (err) =>
      err instanceof CdpTeardownError &&
      /child was still running 150ms after SIGKILL/.test(err.message) &&
      /not confirmed reaped/.test(err.message),
  );
  const elapsed = Date.now() - started;

  assert.deepEqual(signals, ["SIGTERM", "SIGKILL"], "escalation must be observed, not assumed");
  assert.ok(
    elapsed < 150 * 2 + 500,
    `teardown must stop at its own bound rather than hanging the run (took ${elapsed}ms)`,
  );
});

Deno.test("teardownChrome names an unremovable profile instead of swallowing it", async () => {
  const { child } = fakeChild();

  await assert.rejects(
    teardownChrome({ child, userDataDir: "/dev/null/dty1w1-unremovable" }, { boundMs: 400 }),
    (err) =>
      err instanceof CdpTeardownError &&
      /could not be removed after \d+ attempts/.test(err.message) &&
      /Not a directory/.test(err.message),
  );
});

Deno.test("a removal that never settles is reported UNCONFIRMED, never as deleted", async () => {
  const { child } = fakeChild();
  const never = () => new Promise(() => {});

  const started = Date.now();
  await assert.rejects(
    teardownChrome({ child, userDataDir: "/tmp/dty1w1-never-settles" }, {
      boundMs: 120,
      remove: never,
    }),
    (err) =>
      err instanceof CdpTeardownError &&
      /UNCONFIRMED/.test(err.message) &&
      /cannot be cancelled/.test(err.message) &&
      !/could not be removed after/.test(err.message),
  );
  const elapsed = Date.now() - started;

  assert.ok(
    elapsed < 120 * 2 + 500,
    `the deadline must fire before the caller waits (took ${elapsed}ms)`,
  );
});

Deno.test("an already-reaped child and an already-absent profile are success", async () => {
  const dir = await Deno.makeTempDir({ prefix: "cps-cdp-" });
  await Deno.remove(dir, { recursive: true });
  await assert.rejects(Deno.stat(dir), (err) => err instanceof Deno.errors.NotFound);
  const { child } = fakeChild({
    status: Promise.resolve(0),
    kill: () => {
      throw new Deno.errors.BadResource("child already reaped");
    },
  });

  const result = await teardownChrome({ child, userDataDir: dir });

  assert.deepEqual(
    result,
    { childReaped: true, profileRemoved: true, failures: [] },
    "a race lost to the normal end of the process is not a cleanup failure",
  );
});

Deno.test("a child whose exit cannot be read is reported, not counted as reaped", async () => {
  const { child, signals } = fakeChild({ status: Promise.reject(new Error("status poll failed")) });

  await assert.rejects(
    teardownChrome({ child, userDataDir: null }, { boundMs: 150 }),
    (err) =>
      err instanceof CdpTeardownError &&
      /child status could not be read after SIGKILL: status poll failed/.test(err.message),
    "an unreadable exit is not evidence of a clean reap",
  );
  assert.deepEqual(
    signals,
    ["SIGTERM", "SIGKILL"],
    "an unreadable exit must still be pursued with a kill",
  );
});

Deno.test("a profile the suite OWNS that cannot be removed is a named failure", async () => {
  // A real failure inside the suite's own root rather than a path trick: a
  // non-empty directory whose mode denies writing cannot be emptied, so the
  // recursive removal genuinely fails with PermissionDenied. Run as root that is
  // not true, so the case says so loudly instead of reporting a false green.
  if (!await modeBlocksRemoval()) {
    console.warn(
      "skip: this platform does not let a mode-0500 directory block removal (running as root?)",
    );
    return;
  }
  const dir = await Deno.makeTempDir({ prefix: "cps-cdp-" });
  await Deno.writeTextFile(`${dir}/held-open`, "content");
  await Deno.chmod(dir, 0o500);
  const { child } = fakeChild();

  try {
    await assert.rejects(
      teardownChrome({ child, userDataDir: dir }, { boundMs: 400 }),
      (err) =>
        err instanceof CdpTeardownError &&
        /could not be removed after \d+ attempts/.test(err.message) &&
        /Permission denied/.test(err.message),
      "a removal that really fails must be named, with the reason it failed",
    );
  } finally {
    await Deno.chmod(dir, 0o700);
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("the primary error survives a teardown it cannot be annotated with", async () => {
  if (!await modeBlocksRemoval()) {
    console.warn(
      "skip: this platform does not let a mode-0500 directory block removal (running as root?)",
    );
    return;
  }
  const { child } = fakeChild();
  const primary = Object.freeze(new Error("original failure"));
  const locked = await Deno.makeTempDir({ prefix: "cps-cdp-" });
  await Deno.writeTextFile(`${locked}/held-open`, "content");
  await Deno.chmod(locked, 0o500);
  const reported = [];
  const realError = console.error;
  console.error = (...args) => reported.push(args.join(" "));
  try {
    await assert.rejects(
      teardownChrome({ child, userDataDir: locked }, { primaryError: primary, boundMs: 400 }),
      (err) => {
        assert.equal(err, primary, "the frozen primary is still the thrown error");
        assert.equal(err.message, "original failure", "the primary message is untouched");
        assert.equal(
          err.teardownFailure,
          undefined,
          "an annotation that cannot be attached must not be faked or reported as attached",
        );
        return true;
      },
    );
  } finally {
    console.error = realError;
    await Deno.chmod(locked, 0o700);
    await Deno.remove(locked, { recursive: true });
  }
  assert.ok(
    reported.some((line) =>
      /could not be removed/.test(line) && /primary error is still thrown unchanged/.test(line)
    ),
    `the cleanup failure must be reported rather than lost (stderr said ${
      JSON.stringify(reported)
    })`,
  );
});

Deno.test("the error that caused a teardown stays the error the caller sees", async () => {
  const { child } = fakeChild();
  const primary = new Error("primary failure: the sweep could not finish");

  await assert.rejects(
    teardownChrome(
      { child, userDataDir: "/dev/null/dty1w1-unremovable" },
      { primaryError: primary, boundMs: 400 },
    ),
    (err) => {
      assert.equal(err, primary, "the primary error object is rethrown, not wrapped");
      assert.match(err.teardownFailure, /could not be removed after \d+ attempts/);
      assert.ok(err.cause instanceof CdpTeardownError);
      return true;
    },
  );
  assert.equal(
    primary.message,
    "primary failure: the sweep could not finish",
    "the primary message must survive the cleanup failure",
  );
});

Deno.test("launchChrome removes the profile it created when the binary cannot start", async () => {
  const before = entriesInRoot();

  await assert.rejects(
    launchChrome({ bin: `${root}/no-such-chrome`, tries: 1, intervalMs: 1, boundMs: 200 }),
    (err) =>
      !(err instanceof CdpTeardownError) &&
      /No such file|NotFound/.test(err.message),
    "an unspawnable binary must surface as its own error, not a teardown error",
  );

  assert.deepEqual(
    entriesInRoot(),
    before,
    "the temp profile created before the spawn threw must not be left behind",
  );
});

Deno.test("launchChrome removes the profile it created when Chrome never answers", async () => {
  const fake = `${root}/fake-chrome`;
  await Deno.writeTextFile(fake, "#!/bin/sh\nexit 0\n");
  await Deno.chmod(fake, 0o755);
  const before = entriesInRoot();

  try {
    await assert.rejects(
      launchChrome({ bin: fake, tries: 1, intervalMs: 1, boundMs: 300 }),
      (err) =>
        !(err instanceof CdpTeardownError) &&
        err.message === "chrome devtools endpoint never came up",
      "the endpoint failure must stay the error the caller sees",
    );
    assert.deepEqual(
      entriesInRoot(),
      before,
      "the profile of a Chrome that never answered must not be left behind",
    );
  } finally {
    await Deno.remove(fake);
  }
});

// ── Stage 2 caller-level controls (bead chrome_platform_showcase-pka) ────────
//
// Stage 1 pinned the library. These cases pin the two real CALLERS through their
// own exported `main(deps)`, because the failure contract that matters lives in
// the caller's tail: the run phase, both artefact writers, the strict teardown
// and the exit are injected, so each failure mode is driven exactly and observed
// rather than inferred from a source read. No browser, no server, no gate.
//
// The point of pinning the caller and not a helper: a fault introduced into the
// CALLER's own tail - a swallowed cleanup error, a skipped sibling write, a lost
// non-zero exit - must turn this suite red. That is what the disposable-clone
// negative run at hand-off demonstrates.

const CALLER_REPORT = {
  generatedAt: "2026-10-10T00:00:00.000Z",
  base: "http://localhost:3000",
  chrome: "fake/1.0",
  method: "test",
  totals: {
    assertions: 1,
    pass: 1,
    fail: 0,
    blocked: 0,
    future: 0,
    byVerdict: { pass: 1 },
    realFailures: 0,
    realBlocked: 0,
    instrumentFalsePositives: 0,
  },
  passRateExecuted: "100%",
  realFeaturesWithIssues: 0,
  recheckErrors: [],
  issues: [],
  instrumentFalsePositives: [],
};

// One harness for both callers. It records every attempt separately from every
// successful write, so "the sibling was still attempted" stays assertable even
// when the sibling is the thing that throws.
function callerHarness(
  {
    primary = null,
    failJson = null,
    failMd = null,
    failTeardown = null,
    result = CALLER_REPORT,
    resources = false,
    serverKill = "ok",
    serverStatus = "resolve",
    connClose = "ok",
    retiredChildren = null,
  } = {},
) {
  const attempts = [];
  const writes = [];
  const log = [];
  const errors = [];
  const codes = [];
  const teardownArgs = [];
  const connCloses = [];
  const serverKills = [];
  const chrome = { tag: "chrome-handle" };
  const deps = {
    argv: [],
    run: async (_opts, _io, holder) => {
      holder.chrome = chrome;
      if (resources) {
        if (retiredChildren) {
          // What a server child that boot recovery could not retire looks like to
          // the caller: the HANDLE is retained, never dropped with the failure.
          holder.retiredChildren = [
            {
              kill: (signal) => serverKills.push(signal ?? "SIGTERM"),
              get status() {
                return retiredChildren === "resolves" ? Promise.resolve(0) : new Promise(() => {});
              },
            },
          ];
        }
        holder.conn = {
          close: () => {
            if (connClose === "throws") throw new Error("socket already gone (BadResource)");
            if (connClose === "pending") return new Promise(() => {});
            return connCloses.push("closed");
          },
        };
        holder.serverChild = {
          kill: (signal) => {
            if (serverKill === "refuse") {
              // What the reviewer injected: a real EPERM from an owned child.
              throw new Error("Operation not permitted (os error 1)");
            }
            serverKills.push(signal ?? "SIGTERM");
          },
          // A getter, so a rejecting status is only created when it is awaited.
          get status() {
            if (serverStatus === "reject") {
              return Promise.reject(new Error("status could not be read"));
            }
            if (serverStatus === "pending") return new Promise(() => {});
            return Promise.resolve(0);
          },
        };
      }
      if (primary) throw primary;
      return result;
    },
    writeJson: async (path, text) => {
      attempts.push({ kind: "json", path });
      if (failJson) throw new Error(failJson);
      writes.push({ kind: "json", path, text });
    },
    writeMd: async (path, text) => {
      attempts.push({ kind: "md", path });
      if (failMd) throw new Error(failMd);
      writes.push({ kind: "md", path, text });
    },
    teardown: async (handle) => {
      teardownArgs.push(handle);
      if (failTeardown) throw new Error(failTeardown);
    },
    exit: (code) => codes.push(code),
    log: (line) => log.push(String(line)),
    error: (line) => errors.push(String(line)),
  };
  return {
    deps,
    chrome,
    attempts,
    writes,
    log,
    errors,
    codes,
    teardownArgs,
    connCloses,
    serverKills,
  };
}

const reported = (errors, needle) => errors.some((line) => line.includes(needle));

Deno.test("conformance-sweep main: a clean run writes both artefacts, cleans up and never calls exit", async () => {
  const t = callerHarness();
  await conformanceSweepMain({ ...t.deps, argv: ["--out", "reports/scratch-sweep.json"] });
  assert.deepEqual(t.attempts.map((a) => a.kind), ["json", "md"], "both artefacts, JSON first");
  assert.deepEqual(t.writes.map((w) => w.kind), ["json", "md"], "both writes must succeed");
  assert.equal(t.writes[0].path, "reports/scratch-sweep.json", "--out still selects the JSON path");
  assert.equal(t.writes[1].path, "reports/conformance-sweep.md", "the markdown path is unchanged");
  assert.deepEqual(
    t.teardownArgs,
    [t.chrome],
    "teardown must receive the handle the run phase published",
  );
  assert.deepEqual(t.codes, [], "success is an implicit 0: exit must not be called at all");
  assert.deepEqual(t.errors, [], "a clean run prints no failure line");
});

Deno.test("conformance-sweep main: a JSON write failure still attempts the markdown and is named non-zero", async () => {
  const t = callerHarness({ failJson: "no space left on device (json)" });
  await conformanceSweepMain({ ...t.deps, argv: ["--out", "reports/scratch-sweep.json"] });
  assert.deepEqual(
    t.attempts.map((a) => a.kind),
    ["json", "md"],
    "the sibling artefact must still be attempted",
  );
  assert.deepEqual(t.writes.map((w) => w.kind), ["md"], "the markdown must still be written");
  assert.ok(
    reported(t.errors, "reports/scratch-sweep.json"),
    "the failed artefact must be named by path",
  );
  assert.ok(
    reported(t.errors, "no space left on device (json)"),
    "the cause must be carried, not discarded",
  );
  assert.deepEqual(t.codes, [1], "an unconfirmed report write must not be a green run");
});

Deno.test("conformance-sweep main: a markdown write failure still attempts the JSON and is named non-zero", async () => {
  const t = callerHarness({ failMd: "no space left on device (md)" });
  await conformanceSweepMain({ ...t.deps, argv: ["--out", "reports/scratch-sweep.json"] });
  assert.deepEqual(
    t.attempts.map((a) => a.kind),
    ["json", "md"],
    "the sibling artefact must still be attempted",
  );
  assert.deepEqual(t.writes.map((w) => w.kind), ["json"], "the JSON must still be written");
  assert.ok(
    reported(t.errors, "reports/conformance-sweep.md"),
    "the failed artefact must be named by path",
  );
  assert.deepEqual(t.codes, [1], "an unconfirmed report write must not be a green run");
});

Deno.test("conformance-sweep main: a cleanup-only failure is named non-zero only after the artefacts exist", async () => {
  const t = callerHarness({ failTeardown: "profile dbx was not confirmed removed" });
  await conformanceSweepMain(t.deps);
  assert.deepEqual(
    t.writes.map((w) => w.kind),
    ["json", "md"],
    "cleanup must not suppress the artefacts",
  );
  assert.ok(
    reported(t.errors, "profile dbx was not confirmed removed"),
    "the cleanup failure must be named",
  );
  assert.deepEqual(t.codes, [1], "a run that cannot confirm cleanup is not a green run");
});

Deno.test("conformance-sweep main: three simultaneous failures are reported with breadth, not just the first", async () => {
  const t = callerHarness({
    failJson: "json write exploded",
    failMd: "md write exploded",
    failTeardown: "teardown exploded",
  });
  await conformanceSweepMain(t.deps);
  assert.deepEqual(
    t.attempts.map((a) => a.kind),
    ["json", "md"],
    "both writes are attempted even when both fail",
  );
  assert.ok(reported(t.errors, "json write exploded"), "the JSON failure must be reported");
  assert.ok(reported(t.errors, "md write exploded"), "the markdown failure must be reported");
  assert.ok(reported(t.errors, "teardown exploded"), "the cleanup failure must be reported");
  assert.deepEqual(t.codes, [1], "the run is reported non-zero exactly once");
});

Deno.test("conformance-sweep main: the run's own error keeps its identity and is reported first", async () => {
  const primary = new Error("run-all never completed");
  const t = callerHarness({ primary, failTeardown: "teardown exploded" });
  const thrown = await conformanceSweepMain(t.deps).then(() => null, (err) => err);
  assert.equal(thrown, primary, "the caller must rethrow the SAME error, not a wrapper");
  assert.ok(
    t.errors[0]?.includes("run-all never completed"),
    "the run's error must be reported before the cleanup",
  );
  assert.ok(
    reported(t.errors, "teardown exploded"),
    "the cleanup failure must still be reported, separately",
  );
  assert.deepEqual(t.codes, [], "a rethrown error is the failure signal: exit must not be called");
});

Deno.test("conformance-sweep main: a frozen primary is not replaced by an annotation TypeError", async () => {
  const primary = Object.freeze(new Error("frozen primary"));
  const t = callerHarness({ primary, failTeardown: "teardown exploded" });
  const thrown = await conformanceSweepMain(t.deps).then(() => null, (err) => err);
  assert.equal(
    thrown,
    primary,
    "identity must survive even when the error object cannot carry anything",
  );
  assert.equal(thrown.message, "frozen primary", "the original message must be intact");
  assert.ok(
    !t.errors.some((line) => line.includes("TypeError") || line.includes("not extensible")),
    "no annotation failure may be reported in place of the real one",
  );
  assert.ok(
    reported(t.errors, "teardown exploded"),
    "the cleanup failure must be reported on stderr instead",
  );
});

Deno.test("conformance-sweep is import-safe: importing it exports a caller and runs nothing", () => {
  assert.equal(typeof conformanceSweepMain, "function", "main(deps) must be exported");
  assert.equal(
    typeof conformanceSweepParseArgs,
    "function",
    "parseArgs must stay a pure exported function",
  );
  assert.deepEqual(
    conformanceSweepParseArgs([]),
    {
      base: "http://localhost:3000",
      noServer: false,
      skipRecheck: false,
      outJson: "reports/conformance-sweep.json",
      timeoutMin: 60,
    },
    "the CLI defaults must not drift when the module is imported rather than run",
  );
});

// ── drive-demos caller-level controls (same Stage 2 contract) ────────────────
//
// The second migrated caller, driven the same way: the real main(deps) with an
// injected drive phase, injected writers, the strict teardown and a recorded
// exit. Two of these cases exist only here - the pre-acquisition `exit(2)` for an
// empty selection, and the long-standing failedCount / NOT-ASSERTED exit
// semantics - because they are behaviour this caller must keep, not gain.

const DRIVE_RESULT = {
  base: "http://localhost:3999",
  results: [{ url: "/v150/accentcolor-explorer/contrast-explorer/", status: "PASS" }],
  passedCount: 1,
  failedCount: 0,
  notDemonstratedCount: 0,
  noVisualDeltaCount: 0,
  visualOnlyCount: 0,
  delayedChangeCount: 0,
};

// Every drive case needs a drive-shaped run result and the resource handles the
// cleanup contract walks, so they all start from the same harness.
const driveHarness = (over = {}) =>
  callerHarness({ resources: true, result: DRIVE_RESULT, ...over });

const driveArgv = (outDir) => [
  "--url",
  "/v150/accentcolor-explorer/contrast-explorer/",
  "--out",
  outDir,
];

// The report phase reads the output directory, so give it a real one this suite
// owns and removes again - never a tracked reports/ directory.
async function withScratchOut(label, fn) {
  const dir = await Deno.makeTempDir({ prefix: `dty2-${label}-`, dir: root });
  try {
    return await fn(dir);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
}

Deno.test("drive-demos main: an empty selection is the pre-acquisition exit 2", async () => {
  const t = driveHarness();
  let ran = 0;
  t.deps.run = async () => {
    ran++;
    return DRIVE_RESULT;
  };
  await driveDemosMain({ ...t.deps, argv: ["--feature", "no-such-feature-dty2"] });
  assert.deepEqual(t.codes, [2], "an empty selection must still exit 2");
  assert.equal(ran, 0, "the validation must run BEFORE the drive phase acquires anything");
  assert.deepEqual(t.teardownArgs, [], "nothing was acquired, so nothing may be torn down");
});

Deno.test("drive-demos main: a clean run states exit 0 and cleans up connection, Chrome and server", async () => {
  await withScratchOut("clean", async (out) => {
    const t = driveHarness();
    await driveDemosMain({ ...t.deps, argv: driveArgv(out) });
    assert.deepEqual(t.codes, [0], "this caller always states its exit code");
    assert.deepEqual(t.attempts.map((a) => a.kind), ["json", "md"], "both artefacts, JSON first");
    assert.deepEqual(t.connCloses, ["closed"], "the CDP connection must be closed");
    assert.deepEqual(
      t.teardownArgs,
      [t.chrome],
      "teardown must receive the handle the run published",
    );
    assert.deepEqual(t.serverKills, ["SIGKILL"], "the server child must be killed");
    assert.deepEqual(t.errors, [], "a clean run prints no failure line");
  });
});

Deno.test("drive-demos main: a failed demo still exits 1 when nothing else failed", async () => {
  await withScratchOut("failed", async (out) => {
    const t = driveHarness({ result: { ...DRIVE_RESULT, failedCount: 1 } });
    await driveDemosMain({ ...t.deps, argv: driveArgv(out) });
    assert.deepEqual(t.codes, [1], "the pre-existing failedCount semantics must be preserved");
  });
});

Deno.test("drive-demos main: a NOT-ASSERTED spec case is non-zero, not a quiet pass", async () => {
  await withScratchOut("notasserted", async (out) => {
    const t = driveHarness({
      result: {
        ...DRIVE_RESULT,
        results: [{ ...DRIVE_RESULT.results[0], status: "NOT-ASSERTED" }],
      },
    });
    await driveDemosMain({ ...t.deps, argv: driveArgv(out) });
    assert.deepEqual(t.codes, [1], "a spec that asserted nothing must not exit 0");
  });
});

Deno.test("drive-demos main: a report-write failure is named non-zero and still attempts the sibling", async () => {
  await withScratchOut("writefail", async (out) => {
    const t = driveHarness({ failJson: "disk full (drive json)" });
    await driveDemosMain({ ...t.deps, argv: driveArgv(out) });
    assert.deepEqual(
      t.attempts.map((a) => a.kind),
      ["json", "md"],
      "the markdown must still be attempted",
    );
    assert.ok(reported(t.errors, "disk full (drive json)"), "the cause must be carried");
    assert.ok(
      reported(t.errors, "could not be written"),
      "the failure must be named as a write failure",
    );
    assert.deepEqual(t.codes, [1], "an unconfirmed report write must not be a green run");
  });
});

Deno.test("drive-demos main: a cleanup-only failure is named non-zero after the report was written", async () => {
  await withScratchOut("cleanfail", async (out) => {
    const t = driveHarness({
      failTeardown: "profile dty2 was not confirmed removed",
    });
    await driveDemosMain({ ...t.deps, argv: driveArgv(out) });
    assert.deepEqual(
      t.writes.map((w) => w.kind),
      ["json", "md"],
      "cleanup must not suppress the report",
    );
    assert.ok(
      reported(t.errors, "profile dty2 was not confirmed removed"),
      "the failure must be named",
    );
    assert.deepEqual(
      t.codes,
      [1],
      "a run that cannot confirm cleanup is not green even when every assertion passed",
    );
  });
});

Deno.test("drive-demos main: a frozen drive-phase error keeps its identity and is reported first", async () => {
  await withScratchOut("primary", async (out) => {
    const primary = Object.freeze(new Error("chrome never answered"));
    const t = driveHarness({ primary, failTeardown: "teardown exploded" });
    const thrown = await driveDemosMain({ ...t.deps, argv: driveArgv(out) }).then(
      () => null,
      (err) => err,
    );
    assert.equal(thrown, primary, "the caller must rethrow the SAME error");
    assert.equal(thrown.message, "chrome never answered", "the original message must be intact");
    assert.ok(t.errors[0]?.includes("chrome never answered"), "the drive error is reported first");
    assert.ok(
      reported(t.errors, "teardown exploded"),
      "the cleanup failure is still reported separately",
    );
    assert.ok(
      !t.errors.some((line) => line.includes("TypeError") || line.includes("not extensible")),
      "no annotation failure may be reported in place of the real one",
    );
    assert.deepEqual(t.codes, [], "a rethrown error is the signal: exit must not be called");
  });
});

Deno.test("drive-demos is import-safe: importing it exports a caller and runs nothing", () => {
  assert.equal(typeof driveDemosMain, "function", "main(deps) must be exported");
  assert.equal(
    typeof driveDemosParseArgs,
    "function",
    "parseArgs must stay a pure exported function",
  );
  const defaults = driveDemosParseArgs([]);
  assert.equal(defaults.noServer, false);
  assert.equal(defaults.base, null);
  assert.equal(defaults.limitN, 0);
  assert.ok(
    defaults.outDir.endsWith("reports/interactive-proof"),
    "the default report directory must not drift",
  );
  assert.deepEqual(
    driveDemosParseArgs(["--url", "/a/b/", "--no-server", "--limit", "2", "--out", "/tmp/x"]),
    {
      noServer: true,
      base: null,
      milestone: null,
      feature: null,
      targetUrl: "/a/b/",
      sampleN: 0,
      limitN: 2,
      outDir: "/tmp/x",
      positional: undefined,
    },
    "an injected argv must be parsed exactly like the process argv used to be",
  );
});

// ── server-child reap, both callers (review finding 8ab) ─────────────────────
//
// The reviewer's reproduction was real. An injected conformance main(deps) whose
// serverChild.kill threw `Operation not permitted` still reported SUCCESS,
// because that step was wrapped in a blanket ignore that never looked at the
// child again. A SIGKILL is a request, so the contract is explicit in BOTH
// callers: a refused signal is moot once the child's exit is positively
// confirmed, and every other outcome is a NAMED failure - an exit that never
// arrives (bounded, never awaited forever) or a status that cannot be read at
// all. These pin the four shapes so a regression cannot quietly restore the
// swallow.

Deno.test("conformance-sweep main: a refused server signal is moot once the child's exit is confirmed", async () => {
  const t = callerHarness({ resources: true, serverKill: "refuse", serverStatus: "resolve" });
  await conformanceSweepMain({ ...t.deps, serverReapBoundMs: 25 });
  assert.deepEqual(t.codes, [], "a confirmed exit means nothing leaked: success stays implicit 0");
  assert.deepEqual(t.errors, [], "and no failure line is printed");
});

Deno.test("conformance-sweep main: a server exit that never arrives is bounded and named non-zero", async () => {
  const t = callerHarness({ resources: true, serverStatus: "pending" });
  await conformanceSweepMain({ ...t.deps, serverReapBoundMs: 25 });
  assert.ok(reported(t.errors, "server child exit"), "the unconfirmed exit must be named");
  assert.ok(
    reported(t.errors, "not confirmed"),
    "and named as unconfirmed rather than silently assumed",
  );
  assert.deepEqual(t.codes, [1], "an unconfirmed reap is not a green sweep");
});

Deno.test("conformance-sweep main: a refused signal AND an unconfirmed exit are both named", async () => {
  const t = callerHarness({ resources: true, serverKill: "refuse", serverStatus: "pending" });
  await conformanceSweepMain({ ...t.deps, serverReapBoundMs: 25 });
  assert.ok(reported(t.errors, "could not be signalled"), "the refused signal must be named");
  assert.ok(reported(t.errors, "not confirmed"), "so must the unconfirmed exit");
  assert.deepEqual(t.codes, [1], "the reviewer's exact shape must not be a false green");
});

Deno.test("conformance-sweep main: a status that cannot be read is a named failure", async () => {
  const t = callerHarness({ resources: true, serverStatus: "reject" });
  await conformanceSweepMain({ ...t.deps, serverReapBoundMs: 25 });
  assert.ok(
    reported(t.errors, "server child exit could not be confirmed"),
    "the unreadable status must be named",
  );
  assert.deepEqual(t.codes, [1]);
});

Deno.test("drive-demos main: a refused server signal is moot once the child's exit is confirmed", async () => {
  await withScratchOut("reap-moot", async (out) => {
    const t = driveHarness({ serverKill: "refuse", serverStatus: "resolve" });
    await driveDemosMain({ ...t.deps, serverReapBoundMs: 25, argv: driveArgv(out) });
    assert.deepEqual(t.codes, [0], "the run still states exit 0 when the exit is confirmed");
    assert.deepEqual(t.errors, [], "and prints no failure line");
  });
});

Deno.test("drive-demos main: a server exit that never arrives is bounded and named non-zero", async () => {
  await withScratchOut("reap-pending", async (out) => {
    const t = driveHarness({ serverStatus: "pending" });
    await driveDemosMain({ ...t.deps, serverReapBoundMs: 25, argv: driveArgv(out) });
    assert.ok(reported(t.errors, "server child exit"), "the unconfirmed exit must be named");
    assert.ok(reported(t.errors, "not confirmed"), "and named as unconfirmed");
    assert.deepEqual(t.codes, [1], "an unconfirmed reap must not exit 0");
  });
});

Deno.test("drive-demos main: a refused signal AND an unconfirmed exit are both named", async () => {
  await withScratchOut("reap-refused", async (out) => {
    const t = driveHarness({ serverKill: "refuse", serverStatus: "pending" });
    await driveDemosMain({ ...t.deps, serverReapBoundMs: 25, argv: driveArgv(out) });
    assert.ok(reported(t.errors, "could not be signalled"), "the refused signal must be named");
    assert.ok(reported(t.errors, "not confirmed"), "so must the unconfirmed exit");
    assert.deepEqual(t.codes, [1]);
  });
});

Deno.test("drive-demos main: a status that cannot be read is a named failure", async () => {
  await withScratchOut("reap-reject", async (out) => {
    const t = driveHarness({ serverStatus: "reject" });
    await driveDemosMain({ ...t.deps, serverReapBoundMs: 25, argv: driveArgv(out) });
    assert.ok(
      reported(t.errors, "server child exit could not be confirmed"),
      "the unreadable status must be named",
    );
    assert.deepEqual(t.codes, [1]);
  });
});

// ── connection close and boot-recovery signals (same class as 8ab) ───────────
//
// A self-audit found the same two shapes of false green in this caller that the
// review found in the server child: a cleanup step that could hang forever, and
// a refused signal that was swallowed while the handle was dropped. Closing a
// socket is a request too, so a close that never settles is bounded and named,
// and a signal refused during boot recovery is reported rather than forgotten.

Deno.test("drive-demos main: a connection that cannot be closed is named non-zero", async () => {
  await withScratchOut("conn-throw", async (out) => {
    const t = driveHarness({ connClose: "throws" });
    await driveDemosMain({ ...t.deps, argv: driveArgv(out) });
    assert.ok(
      reported(t.errors, "the connection could not be closed"),
      "a close that failed must be named, not mistaken for a clean shutdown",
    );
    assert.deepEqual(t.codes, [1], "an unclosed connection must not be a green run");
  });
});

Deno.test("drive-demos main: a connection that never closes is bounded and named non-zero", async () => {
  await withScratchOut("conn-pending", async (out) => {
    const t = driveHarness({ connClose: "pending" });
    await driveDemosMain({ ...t.deps, connectionCloseBoundMs: 25, argv: driveArgv(out) });
    assert.ok(
      reported(t.errors, "did not close within"),
      "the unclosed connection must be bounded",
    );
    assert.deepEqual(t.codes, [1], "a close that never settles must not hold the run open");
  });
});

// ── retained server children and the exported reap helper ────────────────────
//
// The reviewer's reading of the boot-recovery path was right: the helper nulled
// the handle even when the signal was refused, so that child's exit was never
// confirmed and the handle was gone, leaving nothing for the caller to re-attempt
// or report. A child that cannot be retired now keeps its HANDLE, and the caller
// gives every retained child one authoritative bounded re-attempt. These cases pin
// both halves: the wiring through main, and the rule inside the helper itself,
// which is exported so the shapes are driven natively instead of read.

const fakeServerChild = ({ killThrows = null, status }) => ({
  kill: () => {
    if (killThrows) throw new Error(killThrows);
  },
  get status() {
    return status();
  },
});

const bothReaps = [
  ["conformance-sweep", conformanceSweepReap],
  ["drive-demos", driveDemosReap],
];

Deno.test("drive-demos main: a child boot recovery could not retire is re-attempted and reported", async () => {
  await withScratchOut("retired-pending", async (out) => {
    const t = driveHarness({ retiredChildren: "pending" });
    await driveDemosMain({ ...t.deps, serverReapBoundMs: 25, argv: driveArgv(out) });
    assert.ok(
      reported(t.errors, "boot recovery could not retire"),
      "a retained child must be re-attempted and named, not dropped with its failure",
    );
    assert.deepEqual(t.codes, [1], "a child that may still be alive must not be a green run");
  });
});

Deno.test("drive-demos main: a retained child whose exit is confirmed is not a failure", async () => {
  await withScratchOut("retired-resolves", async (out) => {
    const t = driveHarness({ retiredChildren: "resolves" });
    await driveDemosMain({ ...t.deps, serverReapBoundMs: 25, argv: driveArgv(out) });
    assert.deepEqual(t.errors, [], "an exit confirmed on the re-attempt leaves nothing behind");
    assert.deepEqual(t.codes, [0], "so the run stays green rather than inventing a failure");
  });
});

Deno.test("reapServerChild: a refused signal with a confirmed exit is not a failure", async () => {
  for (const [name, reap] of bothReaps) {
    const err = await reap(
      fakeServerChild({
        killThrows: "Operation not permitted (os error 1)",
        status: () => Promise.resolve(0),
      }),
      { boundMs: 25 },
    );
    assert.equal(err, null, `${name}: a confirmed exit must make a refused signal moot`);
  }
});

Deno.test("reapServerChild: a refused signal with an unconfirmed exit names both", async () => {
  for (const [name, reap] of bothReaps) {
    const err = await reap(
      fakeServerChild({
        killThrows: "Operation not permitted (os error 1)",
        status: () => new Promise(() => {}),
      }),
      { boundMs: 25 },
    );
    assert.ok(err instanceof Error, `${name}: an unconfirmed reap must be a failure`);
    assert.ok(err.message.includes("could not be signalled"), `${name}: the refusal must be named`);
    assert.ok(err.message.includes("not confirmed"), `${name}: the unconfirmed exit must be named`);
  }
});

Deno.test("reapServerChild: a status that cannot be read is a named failure", async () => {
  for (const [name, reap] of bothReaps) {
    const err = await reap(
      fakeServerChild({ status: () => Promise.reject(new Error("status could not be read")) }),
      { boundMs: 25 },
    );
    assert.ok(
      err instanceof Error && err.message.includes("could not be confirmed"),
      `${name}: an unreadable status must be named`,
    );
  }
});

Deno.test("reapServerChild: a status that never settles is bounded, not awaited forever", async () => {
  const started = Date.now();
  for (const [name, reap] of bothReaps) {
    const err = await reap(fakeServerChild({ status: () => new Promise(() => {}) }), {
      boundMs: 25,
    });
    assert.ok(
      err instanceof Error && err.message.includes("within 25ms"),
      `${name}: the timeout must be reported with the bound that produced it`,
    );
  }
  assert.ok(Date.now() - started < 1000, "the bound must be the bound, not a longer wait");
});

Deno.test("retireServerChild: a child that cannot be retired keeps its handle for the caller", async () => {
  const shapes = [
    fakeServerChild({
      killThrows: "Operation not permitted (os error 1)",
      status: () => Promise.resolve(0),
    }),
    fakeServerChild({ status: () => new Promise(() => {}) }),
    fakeServerChild({ status: () => Promise.reject(new Error("status could not be read")) }),
  ];
  for (const child of shapes) {
    const holder = { serverChild: child, retiredChildren: [] };
    await driveDemosRetire(holder, 25);
    assert.equal(holder.serverChild, null, "the live slot must be cleared");
    if (child === shapes[0]) {
      assert.deepEqual(
        holder.retiredChildren,
        [],
        "an exit confirmed on the first attempt needs no re-attempt",
      );
    } else {
      assert.deepEqual(
        holder.retiredChildren,
        [child],
        "an unconfirmed child must keep its HANDLE so the caller can re-attempt it",
      );
    }
  }
});

Deno.test("retireServerChild: nothing to retire is a no-op", async () => {
  const holder = { serverChild: null, retiredChildren: [] };
  await driveDemosRetire(holder, 25);
  assert.deepEqual(holder.retiredChildren, [], "no child means nothing to retain");
});

// The bound is part of the contract, so a silent change to it is a finding.
Deno.test("the published teardown bound is the one the suite measured against", () => {
  assert.equal(typeof CDP_TEARDOWN_BOUND_MS, "number");
  assert.ok(CDP_TEARDOWN_BOUND_MS > 0 && CDP_TEARDOWN_BOUND_MS <= 10000);
});

Deno.test("the suite left no profile behind in the temp root it owns", async () => {
  assert.deepEqual(
    entriesInRoot(),
    [],
    "a leftover entry here is exactly the leak this suite exists to catch",
  );
  await Deno.remove(root, { recursive: true });
});
