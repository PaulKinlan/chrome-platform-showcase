import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertionNeedsRouteContext as runnerNeedsContext,
} from "../../public/conformance-runner.js";
import {
  assertionNeedsRouteContext as serverNeedsContext,
  renderConformancePage,
  renderConformanceRunAllPage,
} from "../../routes/conformance-renderers.ts";
import { handleConformanceRoute } from "../../routes/conformance.ts";

const sampleSuites = [
  {
    release: "v153",
    featureSlug: "js-self-profiling-markers",
    chromestatusId: 5201297767792640,
    generatedAt: "2026-08-28T00:00:00Z",
    author: "test",
    assertions: [
      {
        id: "profiler-exists",
        description: "Profiler exists",
        kind: "typeof",
        test: "Profiler",
        expect: "function",
      },
      {
        id: "profiler-constructs",
        description: "Profiler constructs under Document-Policy",
        kind: "script",
        test:
          "(()=>{const p=new Profiler({sampleInterval:10,maxBufferSize:10});p.stop();return true;})()",
      },
    ],
  },
  {
    release: "v134",
    featureSlug: "attribution-reporting-feature",
    chromestatusId: 5079048977645568,
    generatedAt: "2026-06-06T08:26:00Z",
    author: "test",
    assertions: [
      {
        id: "relative-fetch",
        description: "Fetches relative concept route",
        kind: "script",
        test: "(async()=>{const r=await fetch('../builder/register');return r.ok;})()",
      },
    ],
  },
];

test(
  "assertionNeedsRouteContext flags route-dependent assertions identically in runner and server",
  () => {
    const positiveCases = [
      {
        kind: "script",
        test:
          "(async()=>{const r=await fetch('../trigger-context-id-builder/register-trigger');return r.ok;})()",
      },
      {
        kind: "script",
        test: '(async()=>{const r=await fetch("./endpoint");return r.ok;})()',
      },
      {
        kind: "script",
        test: '(async()=>{const r=await fetch(location.href,{method:"HEAD"});return r.ok;})()',
      },
      {
        kind: "script",
        test: "(()=>{const u=new URL('../worker.js',location.href);return Boolean(u);})()",
      },
      {
        kind: "script",
        test:
          "document.featurePolicy && document.featurePolicy.features().includes('attribution-reporting')",
      },
      {
        kind: "script",
        test: "document.permissionsPolicy.features().includes('web-share')",
      },
      {
        kind: "script",
        test:
          "(()=>{const p=new Profiler({sampleInterval:10,maxBufferSize:100});return Boolean(p);})()",
      },
      {
        kind: "throws",
        test: "(()=>{new self.Profiler({sampleInterval:-1,maxBufferSize:100});})()",
      },
      {
        kind: "script",
        test: "typeof self.Profiler === 'function'",
      },
    ];

    for (const assertion of positiveCases) {
      assert.equal(
        runnerNeedsContext(assertion),
        true,
        `public runner should flag: ${assertion.test}`,
      );
      assert.equal(
        serverNeedsContext(assertion),
        true,
        `server helper should flag: ${assertion.test}`,
      );
    }
  },
);

test(
  "assertionNeedsRouteContext does not flag plain CSS, exists, typeof, manual, or pure JS assertions",
  () => {
    const negativeCases = [
      { kind: "css-supports", test: "display: grid" },
      { kind: "exists", test: "Profiler" },
      { kind: "typeof", test: "Profiler", expect: "function" },
      { kind: "manual", test: "Requires new Profiler and document.featurePolicy" },
      { kind: "script", test: "1 + 1 === 2" },
      {
        kind: "script",
        test: "(async()=>{const r=await fetch('/public/styles.css');return r.ok;})()",
      },
      {
        kind: "script",
        test: "(async()=>{const r=await fetch('data:text/plain,hi');return r.ok;})()",
      },
      { kind: "throws", test: "(()=>{throw new TypeError('x');})()" },
      null,
      undefined,
    ];

    for (const assertion of negativeCases) {
      assert.equal(
        runnerNeedsContext(assertion),
        false,
        `public runner should not flag: ${JSON.stringify(assertion)}`,
      );
      assert.equal(
        serverNeedsContext(assertion),
        false,
        `server helper should not flag: ${JSON.stringify(assertion)}`,
      );
    }
  },
);

test(
  "renderConformanceRunAllPage filters suites by release while keeping milestone navigation",
  () => {
    const html = renderConformanceRunAllPage(sampleSuites, { release: "v153" });

    assert.match(html, /conformance run-all \(v153\)/);
    assert.match(
      html,
      /href="\/conformance\/run-all\/\?release=v153" aria-current="page">v153<\/a>/,
    );
    assert.match(html, /href="\/conformance\/run-all\/\?release=v134">v134<\/a>/);
    assert.match(html, /href="\/conformance\/suites\.json\?release=v153"/);

    // Embedded SUITES JSON must contain only v153, not v134.
    const match = html.match(/const SUITES = (\[[\s\S]*?\]);/);
    assert.ok(match, "expected embedded SUITES JSON array");
    const embedded = JSON.parse(match[1]);
    assert.equal(embedded.length, 1);
    assert.equal(embedded[0].release, "v153");
    assert.equal(embedded[0].featureSlug, "js-self-profiling-markers");
  },
);

test(
  "renderConformanceRunAllPage strictly escapes hostile release query and suite metadata",
  () => {
    const hostileRelease = 'v9" onmouseover="alert(1)<script>';
    const html = renderConformanceRunAllPage(
      [
        {
          release: hostileRelease,
          featureSlug: "feature",
          chromestatusId: 1,
          generatedAt: "2026-08-28T00:00:00Z",
          author: "test",
          assertions: [
            { id: "a1", description: "desc", kind: "exists", test: "Window" },
          ],
        },
      ],
      { release: hostileRelease },
    );

    assert.equal(
      html.includes('onmouseover="alert'),
      false,
      "raw attribute injection must not appear",
    );
    assert.equal(
      html.includes("<script>alert"),
      false,
      "raw script tag injection must not appear",
    );
    assert.ok(
      html.includes("v9&quot; onmouseover=&quot;alert(1)&lt;script&gt;"),
      "escaped release should appear in HTML output",
    );
    assert.ok(
      html.includes('data-milestone="${escapeHTML(suite.release)}"'),
      "client row template must escape suite.release",
    );
  },
);

test("run-all and conformance page ship the same-origin iframe postMessage bridge", () => {
  const runAllHtml = renderConformanceRunAllPage(sampleSuites);
  assert.ok(runAllHtml.includes("assertionNeedsRouteContext"));
  assert.ok(runAllHtml.includes("conformance-embed-ready"));
  assert.ok(runAllHtml.includes("conformance-run-assertion"));
  assert.ok(runAllHtml.includes("conformance-assertion-result"));
  assert.ok(runAllHtml.includes("embed=1"));

  const pageHtml = renderConformancePage(sampleSuites[0]);
  assert.ok(pageHtml.includes("event.origin !== location.origin"));
  assert.ok(pageHtml.includes("conformance-run-assertion"));
  assert.ok(pageHtml.includes("conformance-assertion-result"));
  assert.ok(pageHtml.includes("conformance-embed-ready"));
  assert.ok(pageHtml.includes("/public/conformance-runner.js"));
});

test("GET /conformance/suites.json supports optional release filtering", async () => {
  const res = await handleConformanceRoute(
    new Request("http://localhost:3000/conformance/suites.json?release=v153"),
  );
  assert.ok(res, "expected route to handle /conformance/suites.json");
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type") ?? "", /application\/json/);
  const data = await res.json();
  assert.equal(data.release, "v153");
  assert.ok(Array.isArray(data.milestones) && data.milestones.includes("v153"));
  assert.ok(Array.isArray(data.suites) && data.suites.length > 0);
  assert.ok(data.suites.every((s) => s.release === "v153"));
  assert.equal(data.suiteCount, data.suites.length);
  assert.equal(
    data.assertionCount,
    data.suites.reduce((n, s) => n + s.assertions.length, 0),
  );
});
