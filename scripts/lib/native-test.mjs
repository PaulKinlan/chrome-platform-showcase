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

/** Default per-file bound: a hung child must fail the step, not hang the gate. */
export const DEFAULT_TIMEOUT_MS = 300_000;

// Child flags are an allowlist, not "whatever the caller typed" (finding 2yh).
// Permission flags adjust the child deliberately, --v8-flags carries the GC suites'
// --expose-gc, and --no-check only skips type-checking. Everything else is refused,
// because flags like --permit-no-files, --filter or a second path change WHICH tests
// run — the one thing this runner must control for the >=1-test rule to mean anything.
const ALLOWED_CHILD_FLAG =
  /^--(?:allow-(?:read|write|net|env|run|ffi|sys|hrtime)|deny-(?:read|write|net|env|run|ffi|sys|hrtime)|v8-flags|no-check)(?:=.*)?$/;

/** Validate one forwarded child flag; returns null when it is acceptable. */
export function childFlagError(flag) {
  if (flag === "--") {
    return "the `--` separator is not forwarded to the child: flags are positioned before the single file path";
  }
  if (ALLOWED_CHILD_FLAG.test(flag)) return null;
  return `refused child flag ${
    JSON.stringify(flag)
  } — only permission flags, --v8-flags and --no-check are forwarded, ` +
    "so a forwarded flag can never change which tests run";
}

/**
 * Parse the runner's own argv (pure, so a regression test can pin the 2yh shape).
 *
 * Returns `{ files, dirs, childFlags, summaryLabel, concurrency, serial, timeoutMs }`
 * or `{ error }`. Everything after `--` is a candidate child flag, the separator
 * itself is stripped, and every candidate must pass the allowlist, so the child is
 * always invoked as `deno test <validated flags> <exactly one file>`. A positional
 * target must be a `*.test.mjs` file: anything else is refused rather than handed
 * to Deno, which would discover the whole repository (the reported 37-suite run).
 */
export function parseNativeTestArgs(argv) {
  const rest = [...argv];
  const files = [];
  const dirs = [];
  const childFlags = [];
  const serial = [];
  let summaryLabel = null;
  let concurrency = null;
  let timeoutMs = DEFAULT_TIMEOUT_MS;

  const take = (
    name,
  ) => (rest.length === 0 ? { error: `${name} needs a value` } : { value: rest.shift() });

  while (rest.length > 0) {
    const arg = rest.shift();
    if (arg === "--") {
      // Everything after the separator is a child flag, except a *.test.mjs path,
      // which is a target. Both orders (`<file> -- <flags>` and
      // `-- <flags> <file>`) therefore give the child validated flags and exactly
      // one file path, and a non-suite path is still refused as a flag.
      for (const restArg of rest.splice(0, rest.length)) {
        if (restArg.endsWith(".test.mjs")) {
          files.push(restArg);
          continue;
        }
        const error = childFlagError(restArg);
        if (error) return { error };
        childFlags.push(restArg);
      }
    } else if (arg === "--dir") {
      const taken = take("--dir");
      if (taken.error) return { error: taken.error };
      dirs.push(taken.value);
    } else if (arg === "--summary") {
      const taken = take("--summary");
      if (taken.error) return { error: taken.error };
      summaryLabel = taken.value;
    } else if (arg === "--concurrency") {
      const taken = take("--concurrency");
      if (taken.error) return { error: taken.error };
      const value = Number(taken.value);
      if (!Number.isInteger(value) || value < 1) {
        return { error: `--concurrency must be a positive integer, got ${taken.value}` };
      }
      concurrency = value;
    } else if (arg === "--timeout-ms") {
      const taken = take("--timeout-ms");
      if (taken.error) return { error: taken.error };
      const value = Number(taken.value);
      if (!Number.isInteger(value) || value < 0) {
        return {
          error:
            `--timeout-ms must be a non-negative integer (0 disables the bound), got ${taken.value}`,
        };
      }
      timeoutMs = value;
    } else if (arg === "--serial") {
      const taken = take("--serial");
      if (taken.error) return { error: taken.error };
      for (const name of taken.value.split(",")) {
        if (name.trim().length > 0) serial.push(name.trim());
      }
    } else if (arg.startsWith("-")) {
      return { error: `unknown option ${arg}` };
    } else if (arg.endsWith(".test.mjs")) {
      files.push(arg);
    } else {
      return {
        error:
          `refused target ${JSON.stringify(arg)} — a target must be a single *.test.mjs file ` +
          "(or a directory through --dir), so the runner can never start a repo-wide discovery",
      };
    }
  }

  if (files.length === 0 && dirs.length === 0) {
    return { error: "no target: pass a file, or --dir <path>" };
  }
  return { files, dirs, childFlags, summaryLabel, concurrency, serial, timeoutMs };
}

/**
 * The text of a child's report to relay — always, and exactly once (finding i43).
 * Relaying only on failure hid the per-test names of a passing run, which is the
 * main reason a suite was migrated to native tests at all.
 */
export function relayText(result) {
  return result.output.trimEnd();
}

/**
 * The exact child invocation: validated flags first, then exactly one file path.
 * Exported and used by the runner so the 2yh shape is pinned by a test, not just by
 * a comment — a `--` separator or a stray path here is what made Deno discover the
 * whole repository instead of the one target file.
 */
export function childArgs(file, childFlags) {
  return ["test", ...childFlags, file];
}

/**
 * Run one file in its own `deno test` process with exactly `childFlags`.
 *
 * Returns `{ file, ok, code, reason, output, parsed }`. `ok` is true only when the
 * child exited 0 and its own summary reported at least one executed test. A child
 * that outlives `timeoutMs` is killed and reported as code 124 (the fleet's "the
 * bound killed it" code).
 */
export async function runNativeFile(
  { file, childFlags = [], denoPath = Deno.execPath(), timeoutMs = DEFAULT_TIMEOUT_MS },
) {
  const started = performance.now();
  // Flags first, exactly one file path last: `deno test <flags> <file>`.
  const args = childArgs(file, childFlags);
  const command = new Deno.Command(denoPath, {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const child = command.spawn();
  let timedOut = false;
  const timer = timeoutMs > 0
    ? setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // Already exited; the status below is authoritative.
      }
    }, timeoutMs)
    : null;
  const [status, stdout, stderr] = await Promise.all([
    child.status,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  if (timer !== null) clearTimeout(timer);
  const output = stdout + (stderr.length > 0 ? (stdout.endsWith("\n") ? "" : "\n") + stderr : "");
  const elapsedMs = Math.round(performance.now() - started);
  // stdout only: that is where the reporter writes its summary, and parsing a
  // single stream keeps a suite's stderr chatter from being mistaken for one.
  const parsed = parseReporterSummary(stdout);
  const signalCode = status.signal ? signalExitCode(status.signal) : null;

  if (timedOut) {
    return {
      file,
      ok: false,
      code: 124,
      elapsedMs,
      output,
      parsed,
      reason: `the test process exceeded the ${timeoutMs}ms bound and was killed`,
    };
  }
  if (status.signal) {
    return {
      file,
      ok: false,
      code: signalCode,
      elapsedMs,
      output,
      parsed,
      reason: `the test process was killed by ${status.signal}`,
    };
  }
  if (status.code !== 0) {
    return {
      file,
      ok: false,
      code: status.code,
      elapsedMs,
      output,
      parsed,
      reason: parsed.ok
        ? `the test process exited ${status.code} (${parsed.passed} passed, ${parsed.failed} failed)`
        : `the test process exited ${status.code}`,
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
