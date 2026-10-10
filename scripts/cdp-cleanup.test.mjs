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

Deno.test("the primary error survives a teardown it cannot be annotated with", async () => {
  const { child } = fakeChild();
  const primary = Object.freeze(new Error("original failure"));
  const reported = [];
  const realError = console.error;
  console.error = (...args) => reported.push(args.join(" "));
  try {
    await assert.rejects(
      teardownChrome(
        { child, userDataDir: "/dev/null/dty1w1-unremovable" },
        { primaryError: primary, boundMs: 400 },
      ),
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
