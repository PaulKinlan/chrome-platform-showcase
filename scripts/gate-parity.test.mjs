// Local-gate vs CI parity guard.
//
// Regression it exists for: a change passed the local full gate but failed
// GitHub CI, because CI ran a formatter check the gate did not. The rules:
//
//   1. Every CI `run:` step in .github/workflows/ci.yml is exactly one
//      `npm ci` or `npm run <script> [-- args]`, and every script CI runs is a
//      step of the full gate (scripts/gate-steps.mjs), so the gate is never
//      weaker than CI.
//   2. Every gate step names a script that package.json defines.
//   3. Every scripts/*.test.mjs and tests/unit/*.test.mjs is run by a script
//      the gate reaches, so a suite that exists cannot be one nothing runs.
//
// CI is read with a real YAML parser (the `yaml` package), so the style of the
// YAML cannot hide a step from rule 1.
//
// Run: npm run test-gate-parity

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { GATE_STEPS } from "./gate-steps.mjs";

const REPO = new URL("..", import.meta.url).pathname;
const read = (path) => readFileSync(`${REPO}${path}`, "utf8");
const scripts = JSON.parse(read("package.json")).scripts ?? {};
const gateScripts = new Set(GATE_STEPS.map((s) => s.task));

// Expand `npm run x` references inside a script, so a script that chains other
// scripts credits them too.
function reachable(names) {
  const seen = new Set();
  const queue = [...names];
  while (queue.length) {
    const name = queue.shift();
    if (seen.has(name) || typeof scripts[name] !== "string") continue;
    seen.add(name);
    for (const m of scripts[name].matchAll(/npm run (?:--silent )?([\w:.-]+)/g)) queue.push(m[1]);
  }
  return seen;
}

test("every CI step is one npm script that the full gate also runs", () => {
  const ci = read(".github/workflows/ci.yml");
  const steps = [];
  for (const [job, def] of Object.entries(parse(ci)?.jobs ?? {})) {
    for (const step of def?.steps ?? []) {
      if (step && typeof step === "object" && "run" in step) steps.push({ job, step });
    }
  }
  const runKeys = (ci.match(/(^|[{,\s]-?\s*)("|')?run\2\s*:/gm) ?? []).length;
  assert.equal(runKeys, steps.length, "every `run` key in ci.yml parses as a step");
  assert.ok(steps.length > 0, "ci.yml has run steps");

  for (const { job, step } of steps) {
    const run = String(step.run).replace(/\s+/g, " ").trim();
    const label = `CI step "${step.name ?? "(unnamed)"}" in job ${job}`;
    if (run === "npm ci") continue;
    const m = run.match(/^npm run ([\w:.-]+)(?: -- [\w ./:=-]+)?$/);
    assert.ok(m, `${label} must be one \`npm run <script>\`, got: ${run}`);
    assert.equal(typeof scripts[m[1]], "string", `${label}: package.json has no "${m[1]}" script`);
    assert.ok(
      reachable(gateScripts).has(m[1]),
      `${label}: "${m[1]}" runs in CI but is not a step of the full gate (scripts/gate-steps.mjs)`,
    );
  }
});

test("every gate step names a package.json script", () => {
  for (const step of GATE_STEPS) {
    assert.equal(
      typeof scripts[step.task],
      "string",
      `gate step ${step.id} names script "${step.task}", which package.json does not define`,
    );
  }
});

test("every test suite is run by a script the gate reaches", () => {
  const gate = [...reachable(gateScripts)].map((name) => scripts[name]).join("\n");
  const suites = [
    ...readdirSync(`${REPO}scripts`).filter((f) => f.endsWith(".test.mjs")).map((f) =>
      `scripts/${f}`
    ),
    ...readdirSync(`${REPO}tests/unit`).filter((f) => f.endsWith(".test.mjs")).map((f) =>
      `tests/unit/${f}`
    ),
  ];
  assert.ok(suites.length > 20, `found ${suites.length} suites`);
  for (const suite of suites) {
    const dirGlob = `${suite.slice(0, suite.lastIndexOf("/"))}/*.test.mjs`;
    assert.ok(
      gate.includes(suite) || gate.includes(dirGlob),
      `${suite} is not run by any script the gate reaches`,
    );
  }
});
