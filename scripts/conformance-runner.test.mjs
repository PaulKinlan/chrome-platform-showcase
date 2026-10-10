// Conformance assertion runner — migrated in place to native Deno.test (Stage 1 of
// the dty proposal, bead 0a0).
//
// Same file path, same task id (`test-conformance-runner`), same ordered gate step,
// same subject: the browser-shared runConformanceAssertion. What changed is the
// wrapper around the assertions — eight top-level awaits with a hand-rolled
// `assert()` that threw became eight named Deno.test cases, so a failure now names
// the case that failed and the run reports a real count.
//
// The legacy output contract (`PASS — shared conformance assertion runner` as the
// last line) is printed by the task through scripts/native-test.mjs --summary, not
// by this module: under `deno test`, module-level output runs before Deno's own
// summary, so printing it here would put the line in a misleading position. The
// task output keeps the same final line; raw `deno test` output intentionally does
// not (that is the documented rebaseline).
//
// Nothing here needs a permission: it imports a local module and compares values,
// so the task grants the child process none (proven by running it with no flags).
import { runConformanceAssertion } from "../public/conformance-runner.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const environment = {
  CSS: { supports: (value) => value === "animation-trigger: --demo play" },
  ExactFeature: { method() {} },
};

Deno.test("ok — exact CSS syntax passes", async () => {
  const cssPass = await runConformanceAssertion(
    "css-supports",
    "animation-trigger: --demo play",
    undefined,
    environment,
  );
  assert(cssPass.ok && !cssPass.blocked, "exact CSS syntax should pass");
});

Deno.test("ok — invalid CSS syntax fails without blocking", async () => {
  const cssFail = await runConformanceAssertion(
    "css-supports",
    "animation-trigger: view() play",
    undefined,
    environment,
  );
  assert(!cssFail.ok && !cssFail.blocked, "invalid CSS syntax should fail");
});

Deno.test("ok — dotted existence check passes", async () => {
  const exists = await runConformanceAssertion(
    "exists",
    "ExactFeature.method",
    undefined,
    environment,
  );
  assert(exists.ok, "dotted existence check should pass");
});

Deno.test("ok — typeof check reports its result", async () => {
  const type = await runConformanceAssertion(
    "typeof",
    "ExactFeature.method",
    "function",
    environment,
  );
  assert(type.ok && type.detail === "typeof = function", "typeof check should report its result");
});

Deno.test("ok — manual checks stay blocked", async () => {
  const manual = await runConformanceAssertion("manual", "Requires Chrome 151 on device");
  assert(!manual.ok && manual.blocked, "manual checks must remain blocked");
});

Deno.test("ok — truthy scripts pass", async () => {
  const script = await runConformanceAssertion("script", "1 + 1 === 2");
  assert(script.ok, "truthy scripts should pass");
});

Deno.test("ok — throws checks report the thrown type", async () => {
  const throws = await runConformanceAssertion(
    "throws",
    "(() => { throw new TypeError('expected') })()",
  );
  assert(throws.ok && throws.detail === "TypeError", "throws checks should report the thrown type");
});
