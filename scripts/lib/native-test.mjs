// Native Deno.test harness helpers (Stage 1 of the dty proposal; beads 0a0 / 9th / 08a).
//
// Why this exists: a discovered test-shaped file that registers no tests exits 0
// and reports `0 passed | 0 failed`, so neither the exit code nor a green gate
// notices it (measured on Deno 2.9.7: pretty and dot reporters both exit 0, and a
// directory holding only that file also exits 0). Running one file per child
// process makes that process's own summary authoritative, so the rule can be
// exact and fail-closed: the child must exit 0 AND its report must show at least
// one registered test (passed + failed).
//
// The summary is read from the LAST summary-shaped line of the child's **stdout**.
// Stdout-only is the second half of the anti-spoofing: Deno writes its own summary
// there after every test has run, so a suite-printed fake on stdout is always
// overridden by the real summary that follows, and a fake printed to stderr is not
// parsed at all. Anything unexpected fails: no summary line, a crash, an import
// error, a signal, or a summary reporting zero executed tests.
//
// Nothing here grants permissions. The child is spawned with exactly the flags the
// caller passes in, so a migrated suite keeps its own least privilege and there is
// no union-of-permissions runner.

/** Strip ANSI SGR sequences so the summary line can be matched from a piped child. */
const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

// Verified against Deno 2.9.7 output, including the optional segments:
//   ok | 4 passed (16 steps) | 0 failed (25ms)
//   FAILED | 1 passed | 1 failed (130ms)
//   ok | 1 passed | 0 failed | 1 ignored (8ms)
//   ok | 0 passed | 0 failed | 1 filtered out (5ms)
export const SUMMARY_RE =
  /^(ok|FAILED) \| (\d+) passed(?: \((\d+) steps?\))? \| (\d+) failed(?: \| (\d+) ignored)?(?: \| (\d+) filtered out)? \((\d+(?:\.\d+)?)(ms|s)\)$/;

/**
 * Read the fail-closed verdict out of a single child's reporter output.
 *
 * Returns `{ ok: true, tests, passed, failed, ignored, filteredOut, steps, line }`
 * when the report is shaped as expected, or `{ ok: false, reason }` when it is
 * not. `tests` is what was actually executed (passed + failed): a file whose only
 * registrations are ignored is still "zero tests ran" and must fail the rule.
 */
export function parseReporterSummary(output) {
  const lines = String(output ?? "")
    .replace(ANSI, "")
    .split("\n")
    .map((line) => line.trimEnd());
  let match = null;
  let line = null;
  for (let index = lines.length - 1; index >= 0; index--) {
    match = SUMMARY_RE.exec(lines[index].trim());
    if (match) {
      line = lines[index].trim();
      break;
    }
  }
  if (!match) {
    const nonEmpty = lines.filter((line) => line.trim().length > 0);
    return {
      ok: false,
      reason: nonEmpty.length === 0
        ? "the child produced no output to read a summary from"
        : `the child's report contains no Deno test summary line; last output was ${
          JSON.stringify(nonEmpty[nonEmpty.length - 1].slice(0, 200))
        }`,
    };
  }
  const [, status, passed, steps, failed, ignored, filteredOut, duration, unit] = match;
  const seconds = unit === "s" ? Number(duration) * 1000 : Number(duration);
  return {
    ok: true,
    status,
    passed: Number(passed),
    failed: Number(failed),
    ignored: Number(ignored ?? 0),
    filteredOut: Number(filteredOut ?? 0),
    steps: steps == null ? 0 : Number(steps),
    tests: Number(passed) + Number(failed),
    durationMs: Math.round(seconds),
    line,
  };
}

/**
 * The pilot directory rule, shared with the guard in scripts/gate-parity.test.mjs:
 * every entry must be a REGULAR *.test.mjs file. `deno test <dir>` recurses,
 * imports `*_test.mjs`, and can follow a symlink, so a subdirectory, a symlink or
 * a non-suite file must be refused here rather than silently joining the run.
 */
export function classifySuiteEntries(entries) {
  const isRegularSuite = (entry) =>
    entry.isFile && !entry.isSymlink && entry.name.endsWith(".test.mjs");
  const files = entries.filter(isRegularSuite).map((entry) => entry.name).sort();
  const refused = entries
    .filter((entry) => !isRegularSuite(entry))
    .map((entry) => `${entry.name}${entry.isDirectory ? "/" : entry.isSymlink ? " (symlink)" : ""}`)
    .sort();
  return { files, refused };
}

/** Enumerate an opted-in directory under the shared rule, failing closed. */
export function enumerateSuiteDir(dir) {
  let entries = [];
  try {
    entries = [...Deno.readDirSync(dir)];
  } catch (error) {
    return { files: [], refused: [], error: `cannot read ${dir}: ${error.message}` };
  }
  const { files, refused } = classifySuiteEntries(entries);
  if (refused.length > 0) {
    return {
      files,
      refused,
      error: `${dir} must be flat and hold only regular *.test.mjs files: ${refused.join(", ")}`,
    };
  }
  if (files.length === 0) return { files, refused, error: `${dir} holds no *.test.mjs suite` };
  return { files, refused, error: null };
}

/** A signal-killed child has no exit code; keep the gate's 128+signal convention. */
const SIGNAL_NUMBERS = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGQUIT: 3,
  SIGKILL: 9,
  SIGTERM: 15,
  SIGPIPE: 13,
  SIGABRT: 6,
};
export function signalExitCode(signal) {
  const number = SIGNAL_NUMBERS[signal];
  return number == null ? null : 128 + number;
}

/**
 * Run one file in its own `deno test` process with exactly `childFlags`.
 *
 * Returns `{ file, ok, code, reason, output, parsed }`. `ok` is true only when the
 * child exited 0 and its own summary reported at least one executed test.
 */
export async function runNativeFile({ file, childFlags = [], denoPath = Deno.execPath() }) {
  const started = performance.now();
  const command = new Deno.Command(denoPath, {
    args: ["test", ...childFlags, file],
    stdout: "piped",
    stderr: "piped",
  });
  const result = await command.output();
  const decoder = new TextDecoder();
  const stdout = decoder.decode(result.stdout);
  const stderr = decoder.decode(result.stderr);
  const output = stdout + (stderr.length > 0 ? (stdout.endsWith("\n") ? "" : "\n") + stderr : "");
  const elapsedMs = Math.round(performance.now() - started);
  // stdout only: that is where the reporter writes its summary, and parsing a
  // single stream keeps a suite's stderr chatter from being mistaken for one.
  const parsed = parseReporterSummary(stdout);
  const signalCode = result.signal ? signalExitCode(result.signal) : null;

  if (result.signal) {
    return {
      file,
      ok: false,
      code: signalCode,
      elapsedMs,
      output,
      parsed,
      reason: `the test process was killed by ${result.signal}`,
    };
  }
  if (result.code !== 0) {
    return {
      file,
      ok: false,
      code: result.code,
      elapsedMs,
      output,
      parsed,
      reason: parsed.ok
        ? `the test process exited ${result.code} (${parsed.passed} passed, ${parsed.failed} failed)`
        : `the test process exited ${result.code}`,
    };
  }
  if (!parsed.ok) {
    return { file, ok: false, code: 1, elapsedMs, output, parsed, reason: parsed.reason };
  }
  if (parsed.tests < 1) {
    return {
      file,
      ok: false,
      code: 1,
      elapsedMs,
      output,
      parsed,
      reason: parsed.ignored > 0
        ? `${parsed.ignored} test(s) registered but none executed — a file whose tests are all ignored is still zero tests`
        : "the file registered no tests (0 passed | 0 failed) — this is the failure mode this runner exists to catch",
    };
  }
  return { file, ok: true, code: 0, elapsedMs, output, parsed, reason: null };
}

/** Minimal bounded-concurrency map (the 2-vCPU box wants a cap, not unbounded fan-out). */
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
