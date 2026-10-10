// Unit tests for the native-test harness's fail-closed decisions (bead 0a0).
//
// These live in the opt-in pilot directory on purpose: they are pure string and
// entry classification checks, so they run under the pilot's ZERO permissions and
// pin the rule that makes the harness trustworthy — a report with no executed test
// must never be read as a pass, and a summary-shaped line printed by a suite must
// not be mistaken for Deno's own summary.
//
// The process-level controls (a real 0-test file, a real summary spoof, a child
// that dies on a permission, a first failing assertion) are run as measured
// evidence on the bead, because they need processes, a temp dir and permissions
// that this directory deliberately does not grant.
import assert from "node:assert/strict";

import {
  childArgs,
  childFlagError,
  classifySuiteEntries,
  DEFAULT_TIMEOUT_MS,
  parseNativeTestArgs,
  parseReporterSummary,
  relayText,
  signalExitCode,
} from "../../scripts/lib/native-test.mjs";

Deno.test("the child invocation is validated flags then exactly one file (finding 2yh)", async (t) => {
  await t.step("a `--` separator is stripped, never forwarded", () => {
    const parsed = parseNativeTestArgs(["scripts/x.test.mjs", "--", "--allow-read"]);
    assert.equal(parsed.error, undefined);
    assert.equal(parsed.childFlags.includes("--"), false, "the separator must not reach deno test");
    assert.deepEqual(parsed.childFlags, ["--allow-read"]);
    assert.deepEqual(childArgs("scripts/x.test.mjs", parsed.childFlags), [
      "test",
      "--allow-read",
      "scripts/x.test.mjs",
    ]);
  });

  await t.step("the old shape handed deno paths that were not the target", () => {
    // The counterexample, pinned: with the separator kept, `--` ends flag parsing
    // and what follows is read as paths, so `deno test` discovered the repository
    // (measured: 37 suites, 22 failures) instead of the one file.
    const broken = childArgs("scripts/x.test.mjs", ["--", "--allow-read", "scripts/x.test.mjs"]);
    assert.notDeepEqual(broken, ["test", "--allow-read", "scripts/x.test.mjs"]);
    assert.deepEqual(broken.slice(0, 2), ["test", "--"]);
  });

  await t.step(
    "flags may come before or after the target, and the child still gets one file",
    () => {
      for (
        const argv of [
          ["scripts/x.test.mjs", "--", "--allow-read"],
          ["--", "--allow-read", "scripts/x.test.mjs"],
          ["scripts/x.test.mjs", "--", "--v8-flags=--expose-gc", "--allow-read"],
        ]
      ) {
        const parsed = parseNativeTestArgs(argv);
        assert.equal(parsed.error, undefined, `argv ${JSON.stringify(argv)}`);
        assert.deepEqual(parsed.files, ["scripts/x.test.mjs"]);
        const args = childArgs(parsed.files[0], parsed.childFlags);
        assert.equal(args.filter((argument) => argument.endsWith(".test.mjs")).length, 1);
        assert.equal(args.includes("--"), false);
      }
    },
  );

  await t.step("only permission, v8-flags and no-check flags are forwarded", () => {
    for (
      const flag of [
        "--allow-read",
        "--allow-run=deno",
        "--deny-net",
        "--v8-flags=--expose-gc",
        "--no-check",
      ]
    ) {
      assert.equal(childFlagError(flag), null, flag);
    }
    for (
      const flag of [
        "--",
        "--permit-no-files",
        "--filter=x",
        "-A",
        "--allow-all",
        "scripts/y.test.mjs",
      ]
    ) {
      assert.notEqual(childFlagError(flag), null, `${flag} must be refused`);
    }
    // --allow-all is refused on purpose: one deliberate flag per privilege keeps a
    // child's privileges reviewable.
    assert.match(
      parseNativeTestArgs(["scripts/x.test.mjs", "--", "--permit-no-files"]).error,
      /refused child flag/,
    );
  });

  await t.step(
    "a target that is not a *.test.mjs file is refused, so discovery cannot start",
    () => {
      assert.match(parseNativeTestArgs(["."]).error, /refused target/);
      assert.match(parseNativeTestArgs(["scripts"]).error, /refused target/);
      assert.match(
        parseNativeTestArgs(["scripts/conformance-runner.test.mjs", "scripts/check-routes.mjs"])
          .error,
        /refused target/,
      );
      assert.match(parseNativeTestArgs([]).error, /no target/);
    },
  );

  await t.step("the per-file bound defaults to a real bound and can be set or disabled", () => {
    assert.equal(parseNativeTestArgs(["scripts/x.test.mjs"]).timeoutMs, DEFAULT_TIMEOUT_MS);
    assert.equal(
      parseNativeTestArgs(["scripts/x.test.mjs", "--timeout-ms", "1500"]).timeoutMs,
      1500,
    );
    assert.equal(parseNativeTestArgs(["scripts/x.test.mjs", "--timeout-ms", "0"]).timeoutMs, 0);
    assert.match(
      parseNativeTestArgs(["scripts/x.test.mjs", "--timeout-ms", "-5"]).error,
      /non-negative/,
    );
  });

  await t.step("--dir is collected, and unknown options are refused", () => {
    const parsed = parseNativeTestArgs(["--dir", "tests/unit", "--", "--allow-read"]);
    assert.deepEqual(parsed.dirs, ["tests/unit"]);
    assert.deepEqual(parsed.childFlags, ["--allow-read"]);
    assert.match(parseNativeTestArgs(["--nope"]).error, /unknown option/);
  });
});

Deno.test("the child's report is relayed whether it passed or failed (finding i43)", async (t) => {
  await t.step("a passing run's per-test names are relayed", () => {
    const relay = relayText({
      ok: true,
      output: "./x.test.mjs => ok — named case ... ok (1ms)\nok | 1 passed | 0 failed (5ms)\n",
    });
    assert.match(relay, /named case/, "a green run must still show its test names");
    assert.equal(relay.endsWith("\n"), false, "relayed once, trimmed");
  });

  await t.step("a failing run's output is relayed too, and empty output relays nothing", () => {
    assert.match(relayText({ ok: false, output: "error: boom\n" }), /boom/);
    assert.equal(relayText({ ok: true, output: "" }), "");
  });
});

Deno.test("parseReporterSummary reads a real Deno summary", async (t) => {
  await t.step("passing run with steps", () => {
    const parsed = parseReporterSummary("ok | 4 passed (16 steps) | 0 failed (25ms)");
    assert.equal(parsed.ok, true);
    assert.equal(parsed.tests, 4);
    assert.equal(parsed.failed, 0);
    assert.equal(parsed.steps, 16);
  });

  await t.step("failing run", () => {
    const parsed = parseReporterSummary("FAILED | 1 passed | 1 failed (130ms)");
    assert.equal(parsed.ok, true);
    assert.equal(parsed.tests, 2);
    assert.equal(parsed.failed, 1);
    assert.equal(parsed.status, "FAILED");
  });

  await t.step(
    "ignored and filtered-out segments are tolerated, and ignored tests do not count",
    () => {
      assert.equal(parseReporterSummary("ok | 1 passed | 0 failed | 1 ignored (8ms)").tests, 1);
      const onlyIgnored = parseReporterSummary("ok | 0 passed | 0 failed | 2 ignored (8ms)");
      assert.equal(onlyIgnored.ok, true);
      assert.equal(onlyIgnored.tests, 0);
      assert.equal(onlyIgnored.ignored, 2);
      assert.equal(
        parseReporterSummary("ok | 0 passed | 0 failed | 1 filtered out (5ms)").tests,
        0,
      );
    },
  );

  await t.step("seconds and no-steps variants parse", () => {
    assert.equal(parseReporterSummary("ok | 1 passed | 0 failed (1.5s)").durationMs, 1500);
    assert.equal(parseReporterSummary("ok | 2 passed | 0 failed (9ms)").tests, 2);
  });
});

Deno.test("parseReporterSummary fails closed on anything unexpected", async (t) => {
  await t.step("A ZERO-TEST RUN IS NOT A PASS", () => {
    const parsed = parseReporterSummary("ok | 0 passed | 0 failed (3ms)");
    assert.equal(parsed.ok, true);
    assert.equal(parsed.tests, 0, "the caller must treat tests === 0 as a failure");
  });

  await t.step("empty output fails", () => {
    assert.equal(parseReporterSummary("").ok, false);
    assert.equal(parseReporterSummary("   \n\n").ok, false);
  });

  await t.step("output that contains no summary fails", () => {
    assert.equal(parseReporterSummary("running tests...\nno summary here").ok, false);
    assert.equal(
      parseReporterSummary("error: No test modules found\n").ok,
      false,
      "deno's no-modules error must not be read as a summary",
    );
  });

  await t.step(
    "the LAST summary line wins, so a suite-printed spoof cannot supply the count",
    () => {
      // The real shape of a spoof: the module prints a passing-looking line, then
      // Deno prints its own (zero-test) summary afterwards.
      const spoofed = [
        "ok | 7 passed | 0 failed (9ms)",
        "ok | 0 passed | 0 failed (4ms)",
      ].join("\n");
      const parsed = parseReporterSummary(spoofed);
      assert.equal(parsed.ok, true);
      assert.equal(parsed.tests, 0, "the spoof must not supply the count");
      assert.equal(parsed.line, "ok | 0 passed | 0 failed (4ms)");
    },
  );

  await t.step("trailing non-summary text does not hide the real count", () => {
    // A child's stdout can carry text after the reporter's summary (observed with
    // the type-check line); the count must still come from the summary.
    const parsed = parseReporterSummary(
      "ok | 0 passed | 0 failed (3ms)\nCheck tests/unit/x.test.mjs",
    );
    assert.equal(parsed.ok, true);
    assert.equal(parsed.tests, 0, "the caller must still treat this as zero tests");
  });

  // Boundary worth stating, and proven at process level in the bead evidence: the
  // runner parses stdout only, and Deno writes its own summary there last, so a
  // fake printed by a suite (before it, or on stderr) never supplies the count. A
  // fabrication that came *after* Deno's own summary on stdout would win here —
  // nothing a running suite can do, which is why the process-level spoof control
  // is the evidence for this rule rather than a fabricated string.

  await t.step("ANSI colour codes are stripped before matching", () => {
    const parsed = parseReporterSummary("\u001b[32mok\u001b[0m | 1 passed | 0 failed (5ms)");
    assert.equal(parsed.ok, true);
    assert.equal(parsed.tests, 1);
  });
});

Deno.test("classifySuiteEntries refuses everything a flat scan would otherwise miss", async (t) => {
  const entry = (name, kind) => ({
    name,
    isFile: kind === "file",
    isDirectory: kind === "dir",
    isSymlink: kind === "link",
  });

  await t.step("regular suites are accepted and sorted", () => {
    const { files, refused } = classifySuiteEntries([
      entry("b.test.mjs", "file"),
      entry("a.test.mjs", "file"),
    ]);
    assert.deepEqual(files, ["a.test.mjs", "b.test.mjs"]);
    assert.deepEqual(refused, []);
  });

  await t.step(
    "nested dirs, symlinks, underscore-shaped and plain files are refused by name",
    () => {
      const { files, refused } = classifySuiteEntries([
        entry("a.test.mjs", "file"),
        entry("nested", "dir"),
        entry("linked.test.mjs", "link"),
        entry("helper_test.mjs", "file"),
        entry("README.md", "file"),
      ]);
      assert.deepEqual(files, ["a.test.mjs"]);
      assert.deepEqual(refused, [
        "README.md",
        "helper_test.mjs",
        "linked.test.mjs (symlink)",
        "nested/",
      ]);
    },
  );
});

Deno.test("signalExitCode keeps the gate's 128+signal convention", () => {
  assert.equal(signalExitCode("SIGTERM"), 143);
  assert.equal(signalExitCode("SIGKILL"), 137);
  assert.equal(signalExitCode("SIGINT"), 130);
  assert.equal(signalExitCode("SIGWEIRD"), null);
});
