#!/usr/bin/env -S deno run --allow-read --allow-run
// Per-file native Deno.test runner (Stage 1 of the dty proposal; bead 0a0).
//
// One file per `deno test` process, fail-closed on zero registered tests. The
// rule, the parse and the flat-directory rule live in scripts/lib/native-test.mjs
// so the guard and the unit tests read the same code.
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
//   --                  everything after this goes to the child `deno test`
//
// No `--permit-no-files` is ever passed: a directory with no suite must fail, not
// pass quietly. Nothing here widens the tests' permissions — the child gets
// exactly the flags after `--`, and nothing when there are none.
//
// Exit codes: 0 all files passed; 1 any file failed (128+signal when the child was
// killed, so 137/143 stay visible in the gate); 2 misuse.

import {
  enumerateSuiteDir,
  mapWithConcurrency,
  runNativeFile,
  signalExitCode,
} from "./lib/native-test.mjs";

const USAGE =
  `usage: deno run --allow-read --allow-run scripts/native-test.mjs [options] <file>... [-- <child flags>]
  --dir <path>        run every regular *.test.mjs in <path> (flat)
  --summary <label>   print the legacy "PASS — <label>" / "FAIL — <label>" line last
  --concurrency <n>   child processes at once (default min(2, cpus))
  --serial <a,b>      basenames that must run alone
  --                  pass the rest to the child \`deno test\``;

function usageError(message) {
  console.error(`native-test: ${message}\n\n${USAGE}`);
  Deno.exit(2);
}

const argv = [...Deno.args];
const childFlags = [];
const separator = argv.indexOf("--");
if (separator !== -1) childFlags.push(...argv.splice(separator));

const targets = [];
let summaryLabel = null;
let concurrency = null;
const serial = new Set();

while (argv.length > 0) {
  const arg = argv.shift();
  if (arg === "--dir") {
    const dir = argv.shift() ?? usageError("--dir needs a path");
    const enumerated = enumerateSuiteDir(dir);
    if (enumerated.error) usageError(enumerated.error);
    targets.push(...enumerated.files.map((name) => `${dir.replace(/\/+$/, "")}/${name}`));
  } else if (arg === "--summary") {
    summaryLabel = argv.shift() ?? usageError("--summary needs a label");
  } else if (arg === "--concurrency") {
    const raw = argv.shift() ?? usageError("--concurrency needs a number");
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) {
      usageError(`--concurrency must be a positive integer, got ${raw}`);
    }
    concurrency = value;
  } else if (arg === "--serial") {
    for (const name of (argv.shift() ?? usageError("--serial needs a comma list")).split(",")) {
      if (name.trim().length > 0) serial.add(name.trim());
    }
  } else if (arg === "--") {
    childFlags.push(...argv.splice(argv.length));
  } else if (arg.startsWith("-")) {
    usageError(`unknown option ${arg}`);
  } else {
    targets.push(arg);
  }
}

if (targets.length === 0) usageError("no target: pass a file, or --dir <path>");
if (targets.length > 1 && (summaryLabel != null || serial.size > 0)) {
  usageError(
    "--summary and --serial are for a single target; a multi-file run aggregates its own result",
  );
}

const unique = [...new Set(targets)];
const cpus = globalThis.navigator?.hardwareConcurrency ?? 2;
const limit = concurrency ?? Math.max(1, Math.min(2, cpus));
const serialTargets = unique.filter((file) => serial.has(file.split("/").pop()));
const parallelTargets = unique.filter((file) => !serial.has(file.split("/").pop()));

const runOne = async (file) => {
  const result = await runNativeFile({ file, childFlags });
  const reported = result.parsed.ok ? `${result.parsed.tests} test(s)` : "unparsed report";
  console.log(
    `native-test: ${result.ok ? "ok" : "FAIL"} — ${file} (${reported}, ${result.elapsedMs}ms)` +
      (result.ok ? "" : `: ${result.reason}`),
  );
  if (!result.ok && result.output.trim().length > 0) console.error(result.output.trimEnd());
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
if (summaryLabel != null) {
  console.log(
    failed.length === 0
      ? `PASS — ${summaryLabel}`
      : `FAIL — ${summaryLabel} (${failed.length} file(s) failed)`,
  );
}

if (failed.length > 0) {
  const signalCode = failed.map((result) => result.code).find((code) => code != null && code > 128);
  Deno.exit(signalCode ?? 1);
}
