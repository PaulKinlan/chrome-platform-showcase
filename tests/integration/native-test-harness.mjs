// End-to-end regression harness for scripts/native-test.mjs (bead 0a0).
//
// This is a plain assert-and-exit script rather than a Deno.test module, and it is
// deliberately NOT named *.test.mjs: it must spawn child processes and build
// fixtures in a temp directory, so it needs permissions the opt-in pilot directory
// never grants, and the repo's `test-font-loading` task shows the pattern of a
// non-suite script owned by its own task. Run it with `deno task test:harness`.
//
// It is opt-in and off the gate plan on purpose: it is the regression net for the
// runner that migrates suites, not part of `deno task check`. It pins the two
// findings that nearly landed, at the level they actually broke:
//   i43 — a passing child's report (its per-test names) must be relayed, not only
//         a failing child's;
//   2yh — forwarded child flags must be validated and positioned before exactly one
//         file path, so `deno test` can never be pointed at the repository.
// plus the rules the runner exists for: zero tests fail, a summary spoof does not
// count, the pilot directory must be flat, and a hung child is bounded.
const runner = new URL("../../scripts/native-test.mjs", import.meta.url).pathname;
const repoRoot = new URL("../../", import.meta.url).pathname.replace(/\/$/, "");

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`ok — ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL — ${label}${detail ? `: ${detail}` : ""}`);
  }
}

const work = await Deno.makeTempDir({ prefix: "native-test-harness-" });
const write = (name, body) => Deno.writeTextFileSync(`${work}/${name}`, body);

/** Run the runner itself, capturing its output and exit code. */
async function runRunner(args) {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-read", "--allow-run", runner, ...args],
    stdout: "piped",
    stderr: "piped",
  });
  const output = await command.output();
  const decoder = new TextDecoder();
  return {
    code: output.code,
    stdout: decoder.decode(output.stdout),
    stderr: decoder.decode(output.stderr),
    text: decoder.decode(output.stdout) + decoder.decode(output.stderr),
  };
}

try {
  // ---------------------------------------------------------------- fixtures
  write("one.test.mjs", 'Deno.test("ok — a named case", () => {});\n');
  write("zero.test.mjs", 'console.log("ZERO_TEST_FIXTURE_IMPORTED");\n');
  write(
    "spoof.test.mjs",
    'console.log("ok | 99 passed | 0 failed (9ms)");\nconsole.error("ok | 42 passed | 0 failed (1ms)");\n',
  );
  write("io.test.mjs", 'Deno.test("needs read", () => Deno.readTextFileSync("deno.json"));\n');
  write(
    "fail.test.mjs",
    'Deno.test("ok — fails on purpose", () => { throw new Error("BOOM_FIXTURE"); });\n',
  );
  write(
    "hang.test.mjs",
    'Deno.test("hangs", async () => { await new Promise((resolve) => setTimeout(resolve, 30_000)); });\n',
  );

  // ------------------------------------------- i43: relay on success AND failure
  const green = await runRunner([`${work}/one.test.mjs`]);
  check(
    "i43 — a passing run relays the child's per-test names",
    green.code === 0 && green.text.includes("ok — a named case") && green.text.includes("1 passed"),
    `code=${green.code} output=${JSON.stringify(green.text.slice(0, 300))}`,
  );
  check(
    "i43 — the child's output is relayed exactly once",
    green.text.split("ok — a named case").length - 1 === 1,
    `occurrences=${green.text.split("ok — a named case").length - 1}`,
  );
  const red = await runRunner([`${work}/fail.test.mjs`]);
  check(
    "i43 — a failing run relays the child's failing case and its error",
    red.code !== 0 && red.text.includes("fails on purpose") && red.text.includes("BOOM_FIXTURE"),
    `code=${red.code}`,
  );

  // --------------------------------- 2yh: flags are validated and positioned first
  const withFlags = await runRunner([`${work}/io.test.mjs`, "--", "--allow-read"]);
  check(
    "2yh — forwarded flags reach the child, one file runs, no repo-wide discovery",
    withFlags.code === 0 &&
      /1 file\(s\), 1 test\(s\)/.test(withFlags.text) &&
      !/2 file\(s\)|3 file\(s\)/.test(withFlags.text),
    `code=${withFlags.code} tail=${
      JSON.stringify(withFlags.text.trim().split("\n").slice(-2).join(" | "))
    }`,
  );
  const flagsFirst = await runRunner(["--", "--allow-read", `${work}/one.test.mjs`]);
  check(
    "2yh — flags before the target behave the same as flags after it",
    flagsFirst.code === 0 && /1 file\(s\), 1 test\(s\)/.test(flagsFirst.text),
    `code=${flagsFirst.code}`,
  );
  const refusedFlag = await runRunner([`${work}/one.test.mjs`, "--", "--permit-no-files"]);
  check(
    "2yh — an unsafe child flag is refused instead of forwarded",
    refusedFlag.code === 2 && /refused child flag/.test(refusedFlag.text),
    `code=${refusedFlag.code}`,
  );
  const refusedTarget = await runRunner([repoRoot]);
  check(
    "2yh — a directory target is refused rather than handed to deno test",
    refusedTarget.code === 2 && /refused target/.test(refusedTarget.text),
    `code=${refusedTarget.code}`,
  );

  // ------------------------------------------- the rules the runner exists for
  const zero = await runRunner([`${work}/zero.test.mjs`]);
  check(
    "zero tests fail the runner, and the reason names the file (the silent pass this runner removes)",
    zero.code === 1 && zero.text.includes("registered no tests"),
    `code=${zero.code}`,
  );
  const spoof = await runRunner([`${work}/spoof.test.mjs`]);
  check(
    "a summary spoof does not supply the count (the verdict comes from the real summary)",
    spoof.code === 1 && /native-test: FAIL — .*\(0 test\(s\)[,)]/.test(spoof.text),
    `code=${spoof.code} status=${
      JSON.stringify(
        spoof.text.trim().split("\n").find((line) => line.startsWith("native-test: FAIL")) ?? "",
      )
    }`,
  );
  const noPermission = await runRunner([`${work}/io.test.mjs`]);
  check(
    "with no child flags the test's filesystem read fails NotCapable (no widening, ever)",
    noPermission.code === 1 && noPermission.text.includes("NotCapable"),
    `code=${noPermission.code}`,
  );
  await Deno.mkdir(`${work}/nested`, { recursive: true });
  await Deno.writeTextFile(`${work}/nested/deep.test.mjs`, 'Deno.test("nested", () => {});\n');
  const nested = await runRunner(["--dir", work]);
  check(
    "the directory form refuses nested/extra entries (the runner's own flatness rule)",
    nested.code === 2 && /must be flat/.test(nested.text),
    `code=${nested.code} output=${JSON.stringify(nested.text.trim().split("\n")[0])}`,
  );

  // ------------------------------------------- bounded timeout
  const bounded = await runRunner([`${work}/hang.test.mjs`, "--timeout-ms", "700"]);
  check(
    "a hung child is killed and the runner exits 124 with the bound named",
    bounded.code === 124 && /exceeded the 700ms bound/.test(bounded.text),
    `code=${bounded.code} output=${JSON.stringify(bounded.text.slice(-200))}`,
  );
} finally {
  await Deno.remove(work, { recursive: true });
}

if (failures > 0) {
  console.error(`\nnative-test harness: ${failures} check(s) failed`);
  Deno.exit(1);
}
console.log("\nnative-test harness: all checks passed");
