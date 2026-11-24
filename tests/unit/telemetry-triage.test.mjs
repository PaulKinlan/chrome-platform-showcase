// Telemetry triage + digest: the signals the build routine consumes. Pure data checks, so they
// run under the pilot's zero permissions.
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildTriage } from "../../routes/demo-telemetry.ts";
import { renderDigest } from "../../scripts/telemetry-digest.mjs";

const UA_142 = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/142.0.0.0 Safari/537.36";

function batch(page, events, { env = {}, userAgent = UA_142 } = {}) {
  return {
    id: crypto.randomUUID(),
    receivedAt: "2026-11-24T08:00:00.000Z",
    kind: "demo.batch",
    page,
    release: null,
    featureSlug: null,
    conceptSlug: null,
    severity: "info",
    userAgent,
    bodyBytes: 0,
    payload: { kind: "demo.batch", page, env, events: events.map((e) => ({ page, ...e })) },
  };
}

const stored = [
  batch("/v150/ai-api/summarize/", [
    {
      kind: "runtime.unhandledrejection",
      severity: "error",
      errorName: "NotAllowedError",
      message: "Permission denied",
    },
    { kind: "api.support", id: "Summarizer", state: "unsupported" },
    {
      kind: "report.deprecation",
      id: "UnloadHandler",
      message: "Unload event listeners are deprecated",
    },
  ], { env: { chrome: 141 } }),
  batch("/v150/ai-api/summarize/", [
    { kind: "api.support", id: "Summarizer", state: "supported" },
  ], { env: { chrome: 144 } }),
  batch("/v151/other/basic/", [
    { kind: "runtime.unhandledrejection", severity: "error", message: "Permission denied" },
    {
      kind: "report.deprecation",
      id: "UnloadHandler",
      message: "Unload event listeners are deprecated",
    },
  ]),
];

test("triage breaks failures down by Chrome major (env first, UA fallback)", () => {
  const triage = buildTriage(stored);
  const summarize = triage.demos.find((d) => d.key === "v150/ai-api/summarize");
  assert.ok(summarize, "summarize demo is ranked");
  assert.deepEqual(summarize.chrome, { "141": 1 });
  const other = triage.demos.find((d) => d.key === "v151/other/basic");
  assert.deepEqual(other.chrome, { "142": 1 }, "falls back to the stored user agent");
});

test("triage aggregates api.support outcomes per API and per Chrome version", () => {
  const { support } = buildTriage(stored);
  const s = support.find((x) => x.api === "Summarizer");
  assert.deepEqual(s.states, { unsupported: 1, supported: 1 });
  assert.deepEqual(s.byChrome, { "141": { unsupported: 1 }, "144": { supported: 1 } });
  assert.deepEqual(s.demos, ["v150/ai-api/summarize"]);
});

test("triage groups deprecation reports across demos and never counts them as failures", () => {
  const triage = buildTriage(stored);
  assert.equal(triage.deprecations.length, 1);
  assert.equal(triage.deprecations[0].count, 2);
  assert.equal(triage.deprecations[0].demos.length, 2);
  assert.equal(triage.failures, 2, "only the two rejections are failures");
});

test("digest lists failing demos, cross-demo patterns, support and deprecations", () => {
  const out = renderDigest({ window: 3, ...buildTriage(stored) }, "2026-11-24T08:00:00Z");
  assert.match(out, /\[v150\/ai-api\/summarize\]\(\/v150\/ai-api\/summarize\/\)/);
  assert.match(out, /Permission denied\*\*: 2x on 2 demos/);
  assert.match(
    out,
    /`Summarizer` \| unsupported 1, supported 1 \| C141 unsupported:1; C144 supported:1/,
  );
  assert.match(out, /deprecation \*\*UnloadHandler\*\* 2x on 2 demos/);
});

test("digest renders an empty window without crashing", () => {
  const out = renderDigest({ window: 0, scanned: 0, failures: 0, demos: [], signatures: [] });
  assert.match(out, /No failures in this window/);
});
