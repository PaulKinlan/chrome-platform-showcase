#!/usr/bin/env -S deno run --allow-read --allow-run
// Per-file native Deno.test runner (Stage 1 of the dty proposal; bead 0a0).
//
// One file per `deno test` process, fail-closed on zero registered tests. The
// rule, the parse, the argument validation and the flat-directory rule live in
// scripts/lib/native-test.mjs so the guard and the unit tests read the same code.
//
//   deno run --allow-read --allow-run scripts/native-test.mjs [options] <file>... [-- <child flags>]
//
//   --dir <path>        run every regular *.test.mjs in <path> (flat; refuses
//                       subdirectories, symlinks and non-suite files)
//   --summary <label>   print the legacy `PASS — <label>` / `FAIL — <label>` line
//                       as the final line, so drills that grep suite output keep
//                       working after a suite moves to Deno.test
//   --concurrency <n>   child processes at once (default min(2, cpus))
//   --serial <a,b>      basenames that must run alone (browser/port/GC suites)
//   --timeout-ms <n>    per-file bound (default 300000; 0 disables it)
//   --                  the rest must be child flags: permission flags,
//                       --v8-flags=… or --no-check. They are validated, the
//                       separator is stripped, and they are positioned before the
//                       single file path (`deno test <flags> <file>`). Anything
//                       else is refused, because a forwarded flag or extra path
//                       must never change WHICH tests run (finding 2yh).
//
// No `--permit-no-files` is ever passed: a directory with no suite must fail, not
// pass quietly. Nothing here widens the tests' permissions — the child gets
// exactly the validated flags, and nothing when there are none. Every child's
// stdout/stderr is relayed exactly once, pass or fail (finding i43).
//
// Exit codes: 0 all files passed; 1 any file failed; 124 a file exceeded the
// bound; 128+signal for a killed child (so 137/143 stay visible in the gate);
// 2 misuse.

import {
  enumerateSuiteDir,
  mapWithConcurrency,
  parseNativeTestArgs,
  relayText,
  runNativeFile,
} from "./lib/native-test.mjs";

const USAGE =
  `usage: deno run --allow-read --allow-run scripts/native-test.mjs [options] <file>... [-- <child flags>]
  --dir <path>        run every regular *.test.mjs in <path> (flat)
  --summary <label>   print the legacy "PASS — <label>" / "FAIL — <label>" line last
  --concurrency <n>   child processes at once (default min(2, cpus))
  --serial <a,b>      basenames that must run alone
  --timeout-ms <n>    per-file bound (default 300000; 0 disables it)
  --                  forwarded child flags: permission flags, --v8-flags=…, --no-check`;

function usageError(message) {
  console.error(`native-test: ${message}\n\n${USAGE}`);
  Deno.exit(2);
}

const parsed = parseNativeTestArgs(Deno.args);
if (parsed.error) usageError(parsed.error);

const targets = [...parsed.files];
for (const dir of parsed.dirs) {
  const enumerated = enumerateSuiteDir(dir);
  if (enumerated.error) usageError(enumerated.error);
  targets.push(...enumerated.files.map((name) => `${dir.replace(/\/+$/, "")}/${name}`));
}

if (targets.length > 1 && (parsed.summaryLabel != null || parsed.serial.length > 0)) {
  usageError(
    "--summary and --serial are for a single target; a multi-file run aggregates its own result",
  );
}

const unique = [...new Set(targets)];
const cpus = globalThis.navigator?.hardwareConcurrency ?? 2;
const limit = parsed.concurrency ?? Math.max(1, Math.min(2, cpus));
const serialNames = new Set(parsed.serial);
const serialTargets = unique.filter((file) => serialNames.has(file.split("/").pop()));
const parallelTargets = unique.filter((file) => !serialNames.has(file.split("/").pop()));

const runOne = async (file) => {
  const result = await runNativeFile({
    file,
    childFlags: parsed.childFlags,
    timeoutMs: parsed.timeoutMs,
  });
  // Relay the child's report exactly once — its per-test names are the point of
  // migrating a suite, so they are shown for passing runs too.
  if (relayText(result).length > 0) console.log(relayText(result));
  const reported = result.parsed.ok ? `${result.parsed.tests} test(s)` : "unparsed report";
  console.log(
    `native-test: ${result.ok ? "ok" : "FAIL"} — ${file} (${reported}, ${result.elapsedMs}ms)` +
      (result.ok ? "" : `: ${result.reason}`),
  );
  return result;
};

const results = [];
// Serial targets first, one at a time: browser, port-binding and GC suites share
// machine state and must never overlap on this box.
for (const file of serialTargets) results.push(await runOne(file));
results.push(...await mapWithConcurrency(parallelTargets, limit, runOne));

const failed = results.filter((result) => !result.ok);
const tests = results.reduce(
  (total, result) => total + (result.parsed.ok ? result.parsed.tests : 0),
  0,
);
const slowest = [...results].sort((a, b) => b.elapsedMs - a.elapsedMs)[0];

console.log(
  `native-test: ${results.length} file(s), ${tests} test(s), ` +
    `${failed.length} failing file(s), slowest ${slowest?.elapsedMs ?? 0}ms`,
);
if (parsed.summaryLabel != null) {
  console.log(
    failed.length === 0
      ? `PASS — ${parsed.summaryLabel}`
      : `FAIL — ${parsed.summaryLabel} (${failed.length} file(s) failed)`,
  );
}

if (failed.length > 0) {
  // 124 (bounded) wins over a plain failure, then a signal code, then 1.
  if (failed.some((result) => result.code === 124)) Deno.exit(124);
  const signalCode = failed.map((result) => result.code).find((code) => code != null && code > 128);
  Deno.exit(signalCode ?? 1);
}
