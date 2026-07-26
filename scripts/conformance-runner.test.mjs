import { runConformanceAssertion } from "../public/conformance-runner.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const environment = {
  CSS: { supports: (value) => value === "animation-trigger: --demo play" },
  ExactFeature: { method() {} },
};

const cssPass = await runConformanceAssertion(
  "css-supports",
  "animation-trigger: --demo play",
  undefined,
  environment,
);
assert(cssPass.ok && !cssPass.blocked, "exact CSS syntax should pass");

const cssFail = await runConformanceAssertion(
  "css-supports",
  "animation-trigger: view() play",
  undefined,
  environment,
);
assert(!cssFail.ok && !cssFail.blocked, "invalid CSS syntax should fail");

const exists = await runConformanceAssertion(
  "exists",
  "ExactFeature.method",
  undefined,
  environment,
);
assert(exists.ok, "dotted existence check should pass");

const type = await runConformanceAssertion(
  "typeof",
  "ExactFeature.method",
  "function",
  environment,
);
assert(type.ok && type.detail === "typeof = function", "typeof check should report its result");

const manual = await runConformanceAssertion("manual", "Requires Chrome 151 on device");
assert(!manual.ok && manual.blocked, "manual checks must remain blocked");

const script = await runConformanceAssertion("script", "1 + 1 === 2");
assert(script.ok, "truthy scripts should pass");

const throws = await runConformanceAssertion(
  "throws",
  "(() => { throw new TypeError('expected') })()",
);
assert(throws.ok && throws.detail === "TypeError", "throws checks should report the thrown type");

console.log("PASS — shared conformance assertion runner");
