import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_THRESHOLDS,
  evaluateJankMetrics,
  scanDvhTraps,
} from "../../scripts/check-jank.mjs";

test("scanDvhTraps catches height: 100dvh and min-height: 80dvh in CSS with line numbers", () => {
  const css = [
    ".stage {",
    "  display: grid;",
    "  height: 100dvh;",
    "  min-height: 80dvh;",
    "}",
    ".canvas-wrap {",
    "  height: min(36rem, 75dvh);",
    "}",
  ].join("\n");

  const findings = scanDvhTraps(css, "v160/example/demo.css");
  assert.equal(findings.length, 3);

  assert.equal(findings[0].file, "v160/example/demo.css");
  assert.equal(findings[0].line, 3);
  assert.equal(findings[0].match, "height: 100dvh");
  assert.match(findings[0].advice, /svh/i);

  assert.equal(findings[1].line, 4);
  assert.equal(findings[1].match, "min-height: 80dvh");

  assert.equal(findings[2].line, 7);
  assert.equal(findings[2].match, "height: min(36rem, 75dvh)");
});

test(
  "scanDvhTraps catches <style> and inline style traps in HTML, ignores prose/comments/svh",
  () => {
  const html = [
    "<!doctype html>",
    "<html>",
    "<head>",
    "  <style>",
    "    /* height: 100dvh; ignored inside CSS comment */",
    "    .good-stage { height: 100svh; min-height: 80svh; }",
    "    .bad-stage {",
    "      height: 100dvh;",
    "      min-height: 80dvh;",
    "    }",
    "  </style>",
    "</head>",
    "<body>",
    "  <!-- <div style=\"height: 100dvh\">commented out</div> -->",
    "  <p>Avoid height: 100dvh and min-height: 80dvh; prefer 100svh for canvas stages.</p>",
    "  <pre><code>.example { height: 100dvh; }</code></pre>",
    "  <script>const note = 'height: 100dvh';</script>",
    "  <div class=\"stage\" style=\"min-height: 90dvh;\"></div>",
    "</body>",
    "</html>",
  ].join("\n");

  const findings = scanDvhTraps(html, "v160/example/index.html");
  assert.equal(findings.length, 3);
  assert.deepEqual(
    findings.map((f) => ({ line: f.line, match: f.match })),
    [
      { line: 8, match: "height: 100dvh" },
      { line: 9, match: "min-height: 80dvh" },
      { line: 18, match: "min-height: 90dvh" },
    ],
  );
  assert.ok(findings.every((f) => f.file === "v160/example/index.html"));
  assert.ok(findings.every((f) => /svh/i.test(f.advice)));
});

test("scanDvhTraps ignores svh, vh, lvh, custom properties, and comments", () => {
  const css = [
    "/* Do not use height: 100dvh or min-height: 80dvh */",
    ":root { --stage-height: 100dvh; }",
    ".stage {",
    "  height: 100svh;",
    "  min-height: 80svh;",
    "  max-height: 95lvh;",
    "}",
  ].join("\n");

  assert.deepEqual(scanDvhTraps(css, "clean.css"), []);
});

function cleanMetrics(overrides = {}) {
  return {
    cls: 0,
    scrollX: 0,
    scrollY: 0,
    focusMoved: false,
    activeTag: "BODY",
    urlBarCls: 0,
    pageErrors: [],
    consoleErrors: [],
    blankCanvases: [],
    dvhTraps: [],
    ...overrides,
  };
}

test("evaluateJankMetrics passes a clean zero-CLS run and exact threshold boundaries", () => {
  const clean = evaluateJankMetrics(cleanMetrics());
  assert.equal(clean.ok, true);
  assert.deepEqual(clean.reasons, []);

  const boundary = evaluateJankMetrics(
    cleanMetrics({
      cls: DEFAULT_THRESHOLDS.maxCls,
      urlBarCls: DEFAULT_THRESHOLDS.maxUrlBarCls,
    }),
  );
  assert.equal(boundary.ok, true);
  assert.deepEqual(boundary.reasons, []);
});

test("evaluateJankMetrics fails on CLS > 0.01", () => {
  const res = evaluateJankMetrics(cleanMetrics({ cls: 0.042 }));
  assert.equal(res.ok, false);
  assert.ok(res.reasons.some((r) => /CLS 0\.0420 exceeds threshold 0\.01/.test(r)));
});

test("evaluateJankMetrics fails on unexpected scroll on load", () => {
  const resY = evaluateJankMetrics(cleanMetrics({ scrollY: 140 }));
  assert.equal(resY.ok, false);
  assert.ok(resY.reasons.some((r) => /unexpected scroll/i.test(r)));

  const resX = evaluateJankMetrics(cleanMetrics({ scrollX: 12 }));
  assert.equal(resX.ok, false);
  assert.ok(resX.reasons.some((r) => /unexpected scroll/i.test(r)));
});

test("evaluateJankMetrics fails on focus hijack", () => {
  const res = evaluateJankMetrics(cleanMetrics({ focusMoved: true, activeTag: "INPUT" }));
  assert.equal(res.ok, false);
  assert.ok(res.reasons.some((r) => /focus hijack.*INPUT/i.test(r)));
});

test("evaluateJankMetrics fails on URL-bar CLS spike", () => {
  const res = evaluateJankMetrics(cleanMetrics({ urlBarCls: 0.085 }));
  assert.equal(res.ok, false);
  assert.ok(
    res.reasons.some((r) => /URL-bar resize CLS delta 0\.0850 exceeds threshold 0\.02/.test(r)),
  );
});

test(
  "evaluateJankMetrics fails on uncaught page errors, console errors, blank canvases, dvh traps",
  () => {
  const res = evaluateJankMetrics(
    cleanMetrics({
      pageErrors: ["ReferenceError: stage is not defined"],
      consoleErrors: ["WebGL shader compile failed"],
      blankCanvases: [{ id: "stage", width: 0, height: 0 }],
      dvhTraps: [
        {
          file: "v160/demo/index.html",
          line: 12,
          match: "height: 100dvh",
          advice: "Use svh",
        },
      ],
    }),
  );
  assert.equal(res.ok, false);
  assert.equal(res.reasons.length, 4);
  assert.ok(res.reasons.some((r) => /uncaught page error/i.test(r)));
  assert.ok(res.reasons.some((r) => /console error/i.test(r)));
  assert.ok(res.reasons.some((r) => /blank or lost-context canvas/i.test(r)));
  assert.ok(res.reasons.some((r) => /dvh height trap/i.test(r)));
});

test("evaluateJankMetrics honors custom threshold overrides", () => {
  const res = evaluateJankMetrics(
    cleanMetrics({ cls: 0.03, urlBarCls: 0.04, focusMoved: true, activeTag: "CANVAS" }),
    { maxCls: 0.05, maxUrlBarCls: 0.05, allowFocusMove: true },
  );
  assert.equal(res.ok, true);
  assert.deepEqual(res.reasons, []);
});
