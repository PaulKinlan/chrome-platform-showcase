import { test } from "node:test";
import assert from "node:assert/strict";

import { injectExperimentShell, renderExperimentBox } from "../../lib/experiment-shell.ts";
import { dedent, extractMarkedRegions } from "../../public/show-code.js";

test("renderExperimentBox renders structured experiment metadata", () => {
  const html = renderExperimentBox({
    title: "Canvas text layout",
    blurb: "Measures live DOM drawing inside canvas.",
    kind: "stress",
    question: "Does drawElementImage stay under 16ms at 60fps?",
    result: "Median frame time 4.2ms across 120 frames.",
    testedIn: "Chrome 150 Canary (2026-11-20)",
    api: ["ctx.drawElementImage()", "canvas[layoutsubtree]"],
    composesWith: ["css-anchor-positioning", "view transitions"],
    friction: [
      "ResizeObserver does not fire inside detached subtree.",
      {
        severity: "high",
        title: "Hit testing",
        summary: "Pointer coordinates need explicit transform inversion.",
      },
    ],
  });

  assert.match(html, /<aside class="experiment-box" aria-label="About this experiment">/);
  assert.match(html, /<span class="experiment-kind experiment-kind-stress">stress<\/span>/);
  assert.match(
    html,
    /<dt>Question<\/dt><dd>Does drawElementImage stay under 16ms at 60fps\?<\/dd>/,
  );
  assert.match(html, /Median frame time 4\.2ms across 120 frames\./);
  assert.match(
    html,
    /<span class="experiment-tested">Tested in Chrome 150 Canary \(2026-11-20\)<\/span>/,
  );
  assert.match(html, /<li><code>ctx\.drawElementImage\(\)<\/code><\/li>/);
  assert.match(html, /<li><code>canvas\[layoutsubtree\]<\/code><\/li>/);
  assert.match(
    html,
    /href="\/experiments\/\?compose=css-anchor-positioning">css-anchor-positioning<\/a>/,
  );
  assert.match(
    html,
    /href="\/experiments\/\?compose=view%20transitions">view transitions<\/a>/,
  );
  assert.match(html, /href="\/friction\/">All friction notes<\/a>/);
  assert.match(html, /<ul class="friction-list">/);
  assert.match(html, /ResizeObserver does not fire inside detached subtree\./);
  assert.match(html, /<span class="friction-severity">high<\/span>/);
  assert.match(
    html,
    /<strong>Hit testing<\/strong>: Pointer coordinates need explicit transform inversion\./,
  );
});

test("renderExperimentBox escapes HTML tags and attribute-breaking quotes in every field", () => {
  const xss = `<script>alert("x")</script>'&"`;
  const html = renderExperimentBox(
    {
      title: xss,
      blurb: xss,
      kind: xss,
      question: xss,
      result: xss,
      testedIn: xss,
      api: [xss],
      composesWith: [`tag" onclick='alert(1)'`],
      friction: [
        xss,
        { severity: xss, title: xss, summary: xss },
      ],
    },
    {
      frictionUrl: `/friction/?q="><script>alert(1)</script>'`,
      experimentsUrl: `/experiments/?x="><script>'`,
    },
  );

  assert.equal(html.includes("<script>"), false, "raw <script> must never appear");
  assert.equal(html.includes("onclick='alert(1)'"), false, "unencoded attribute breakout");
  assert.ok(html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&#39;&amp;&quot;"));
  assert.ok(html.includes("&#39;"));
  assert.ok(html.includes("&quot;"));
});

test("renderExperimentBox falls back to escaped blurb when optional fields are omitted", () => {
  const html = renderExperimentBox({
    title: "Minimal",
    blurb: "Plain <blurb> & 'quotes'",
    kind: "starter",
  });

  assert.match(html, /<p class="experiment-blurb">Plain &lt;blurb&gt; &amp; &#39;quotes&#39;<\/p>/);
  assert.equal(html.includes("<dl"), false);
  assert.equal(html.includes("friction-list"), false);
});

test("injectExperimentShell inserts box after </header> and is idempotent", () => {
  const meta = {
    title: "Demo",
    blurb: "Blurb",
    kind: "experiment",
    question: "Can it handle $& and $$ safely?",
  };
  const doc = `<!DOCTYPE html>
<html lang="en">
<head><title>Demo</title></head>
<body>
  <main>
    <header>
      <h1>Demo</h1>
      <p class="lede">Short intro.</p>
    </header>
    <section>Body</section>
  </main>
</body>
</html>`;

  const once = injectExperimentShell(doc, meta);
  assert.match(once, /<\/header>\n<aside class="experiment-box"/);
  assert.ok(once.includes("Can it handle $&amp; and $$ safely?"));
  assert.equal(once.includes("/public/show-code.js"), false);

  const twice = injectExperimentShell(once, meta);
  assert.equal(twice, once, "second call must not duplicate experiment-box");
  assert.equal((twice.match(/class="experiment-box"/g) || []).length, 1);
});

test('injectExperimentShell falls back to <p class="lede"> when no </header>', () => {
  const meta = {
    title: "Demo",
    blurb: "Blurb",
    kind: "composition",
    question: "Does it compose?",
  };
  const doc = `<!DOCTYPE html>
<html>
<head><title>No Header</title></head>
<body>
  <main>
    <h1>Demo</h1>
    <p class="lede">Introductory sentence.</p>
    <section>Work</section>
  </main>
</body>
</html>`;

  const out = injectExperimentShell(doc, meta);
  assert.match(out, /<p class="lede">Introductory sentence\.<\/p>\n<aside class="experiment-box"/);
});

test('injectExperimentShell injects show-code.js only when class="show-code" is present', () => {
  const withoutShowCode = `<!DOCTYPE html>
<html>
<head>
  <style>.show-code { display: block; }</style>
</head>
<body><main><header><h1>A</h1></header></main></body>
</html>`;
  const untouched = injectExperimentShell(withoutShowCode, null);
  assert.equal(untouched.includes("/public/show-code.js"), false);

  const withDoubleQuotes = `<!DOCTYPE html>
<html>
<head><title>B</title></head>
<body><main><details class="show-code"><summary>Show code</summary></details></main></body>
</html>`;
  const injectedDouble = injectExperimentShell(withDoubleQuotes, null);
  assert.match(
    injectedDouble,
    /<script type="module" src="\/public\/show-code\.js"><\/script>\n<\/head>/,
  );
  assert.equal(
    injectExperimentShell(injectedDouble, null),
    injectedDouble,
    "script injection must be idempotent",
  );

  const withSingleQuotesNoHead =
    `<details class='extra show-code'><summary>Code</summary></details>`;
  const injectedSingle = injectExperimentShell(withSingleQuotesNoHead, null);
  assert.ok(
    injectedSingle.endsWith('<script type="module" src="/public/show-code.js"></script>'),
    "appends at end of document when </head> is absent",
  );
});

test("show-code helpers dedent and slice marked demo regions", () => {
  const raw = `
    const setup = true;
    // --- demo ---
      const x = 1;
      if (x) {
        console.log(x);
      }
    // --- /demo ---
    const teardown = false;
  `;

  assert.equal(extractMarkedRegions(raw), "const x = 1;\nif (x) {\n  console.log(x);\n}");
  assert.equal(extractMarkedRegions("const a = 1;"), null);
  assert.equal(
    dedent("\n\n    function f() {\n      return 42;\n    }\n\n"),
    "function f() {\n  return 42;\n}",
  );
});
