import { test } from "node:test";
import assert from "node:assert/strict";

import { checkWritingText, stripNonProseHtml } from "../../scripts/check-writing.mjs";

test("stripNonProseHtml strips scripts, styles, code, pre, comments, tags; keeps lines", () => {
  const html = [
    "<!doctype html>",
    "<html>",
    "<head>",
    "  <style>.delve { color: red; /* seamless tapestry */ }</style>",
    "</head>",
    "<body>",
    "  <!-- delve into cutting-edge tapestry -->",
    "  <p>Visible engineering prose.</p>",
    "  <pre><code>const seamless = 'unlock the power';</code></pre>",
    "  <p>Inline <code>supercharge()</code> stays ignored.</p>",
    "  <script>",
    "    const msg = 'game-changer dive into';",
    "  </script>",
    "</body>",
    "</html>",
  ].join("\n");

  const stripped = stripNonProseHtml(html);
  assert.equal(stripped.split("\n").length, html.split("\n").length);
  assert.match(stripped, /Visible engineering prose\./);
  assert.doesNotMatch(
    stripped,
    /delve|tapestry|seamless|unlock the power|supercharge|game-changer/,
  );
});

test("checkWritingText flags banned AI-slop phrases in HTML prose with exact line numbers", () => {
  const html = [
    "<!doctype html>",
    "<html><body>",
    "  <h1>Direct Title</h1>",
    "  <p>In today's fast-paced web, let's delve into this cutting-edge API.</p>",
    "  <p>It's worth noting that it seamlessly empowers developers to unlock the power.</p>",
    "  <p>This game-changer will revolutionize and supercharge rendering.</p>",
    "  <p>Harness the power to elevate your app and dive into a rich tapestry.</p>",
    "</body></html>",
  ].join("\n");

  const findings = checkWritingText(html, "v160/example/index.html");
  const rules = findings.map((f) => f.rule);

  assert.ok(rules.includes("in-todays-world"));
  assert.ok(rules.includes("delve"));
  assert.ok(rules.includes("cutting-edge"));
  assert.ok(rules.includes("worth-noting"));
  assert.ok(rules.includes("seamless"));
  assert.ok(rules.includes("empower-developers"));
  assert.ok(rules.includes("unlock-the-power"));
  assert.ok(rules.includes("game-changer"));
  assert.ok(rules.includes("revolutionize"));
  assert.ok(rules.includes("supercharge"));
  assert.ok(rules.includes("harness-the-power"));
  assert.ok(rules.includes("elevate-your"));
  assert.ok(rules.includes("dive-into"));
  assert.ok(rules.includes("tapestry"));

  const delveFinding = findings.find((f) => f.rule === "delve");
  assert.equal(delveFinding.file, "v160/example/index.html");
  assert.equal(delveFinding.line, 4);
  assert.ok(delveFinding.suggestion.length > 0);
});

test("checkWritingText ignores banned words inside code, pre, script, and style blocks", () => {
  const html = [
    "<!doctype html>",
    "<html><head><style>.seamless { display: block; }</style></head><body>",
    "  <p>Read the <code>seamless</code> flag from <code>options</code>.</p>",
    "  <pre><code>// delve into the cutting-edge tapestry\nconst gameChanger = true;</code></pre>",
    "  <script>console.log('unlock the power, supercharge, dive into');</script>",
    "</body></html>",
  ].join("\n");

  const findings = checkWritingText(html, "v160/code-only/index.html");
  assert.deepEqual(findings, []);
});

test("checkWritingText passes clean direct engineering prose", () => {
  const html = [
    "<!doctype html>",
    "<html><body>",
    "  <h1>Blob URL canvas readback</h1>",
    "  <p>Chrome 156 stops tainting the 2D canvas for same-origin blob: SVG foreignObject.</p>",
    "  <p>getImageData() succeeds instead of throwing SecurityError; http: SVGs still taint.</p>",
    "</body></html>",
  ].join("\n");

  const findings = checkWritingText(html, "v156/clean/index.html");
  assert.deepEqual(findings, []);
});

test("checkWritingText scans page.json/findings prose; ignores code spans and metadata keys", () => {
  const json = JSON.stringify(
    {
      id: "seamless-demo",
      url: "https://example.com/delve",
      summary: "This cutting-edge demo lets you `supercharge()` calls cleanly.",
      findings: [
        {
          title: "It's worth noting that fallback text is missing",
          evidence: "delve screenshot path",
        },
      ],
    },
    null,
    2,
  );

  const findings = checkWritingText(json, "v160/demo/page.json");
  assert.deepEqual(
    findings.map((f) => f.rule),
    ["cutting-edge", "worth-noting"],
  );
  assert.ok(findings.every((f) => f.line >= 1));
});
