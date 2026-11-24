import { test } from "node:test";
import assert from "node:assert/strict";

import {
  collectExperiments,
  collectFrictionEntries,
  parseConceptPageMeta,
  readConceptPageMeta,
} from "../../lib/experiment.ts";
import { installPlatform, platform } from "../../lib/platform.ts";
import { handleExperimentsRoute, renderExperimentsPage } from "../../routes/experiments.ts";
import { handleFrictionRoute, renderFrictionPage } from "../../routes/friction.ts";

function memoryPlatform(files) {
  const dirs = new Map([[".", new Map()]]);
  const ensureDir = (dirPath) => {
    if (!dirs.has(dirPath)) dirs.set(dirPath, new Map());
    return dirs.get(dirPath);
  };

  for (const fullPath of Object.keys(files)) {
    const parts = fullPath.split("/");
    for (let i = 0; i < parts.length; i++) {
      const parent = i === 0 ? "." : parts.slice(0, i).join("/");
      const isFile = i === parts.length - 1;
      ensureDir(parent).set(parts[i], {
        name: parts[i],
        isFile,
        isDirectory: !isFile,
      });
      if (!isFile) ensureDir(parts.slice(0, i + 1).join("/"));
    }
  }

  return {
    name: "memory-test",
    readFile: async (path) => {
      const key = path.replace(/^\.\//, "");
      if (!(key in files)) throw new Error(`ENOENT: ${path}`);
      return new TextEncoder().encode(files[key]);
    },
    readTextFile: async (path) => {
      const key = path.replace(/^\.\//, "");
      if (!(key in files)) throw new Error(`ENOENT: ${path}`);
      return files[key];
    },
    stat: async (path) => {
      const key = path.replace(/^\.\//, "");
      if (key in files) return { isFile: true, isDirectory: false };
      if (dirs.has(key || ".")) return { isFile: false, isDirectory: true };
      throw new Error(`ENOENT: ${path}`);
    },
    readDir: (path) => ({
      async *[Symbol.asyncIterator]() {
        const key = path === "" || path === "." ? "." : path.replace(/^\.\//, "");
        const entries = dirs.get(key);
        if (!entries) throw new Error(`ENOENT: ${path}`);
        for (const entry of entries.values()) yield entry;
      },
    }),
    realPath: () => Promise.resolve(null),
    env: () => undefined,
    openKv: () => Promise.resolve(null),
    upgradeWebSocket: () => {
      throw new Error("not implemented");
    },
  };
}

test("parseConceptPageMeta validates valid, minimal, and invalid shapes", async (t) => {
  await t.test("accepts a full valid metadata payload", () => {
    const parsed = parseConceptPageMeta({
      title: "  Anchor inside Subgrid  ",
      blurb: "Tests anchor resolution across nested subgrid tracks.",
      kind: "composition",
      question: "Does anchor-name cross subgrid boundaries?",
      result: "Works inside the same containing block.",
      testedIn: "Chrome 151 Canary",
      api: ["CSS Anchor Positioning", "CSS Subgrid"],
      composesWith: ["popover", "css-grid"],
      friction: [
        {
          summary: "Focus ring clips under CSS scale()",
          kind: "browser-bug",
          repro: "Tab to the inner button at 1.5x scale.",
          browser: "Chrome 151 Canary",
          issueUrl: "https://issues.chromium.org/issues/42",
          workaround: "Draw an inset outline.",
        },
      ],
      unknownField: "should be stripped",
    });

    assert.deepEqual(parsed, {
      title: "Anchor inside Subgrid",
      blurb: "Tests anchor resolution across nested subgrid tracks.",
      kind: "composition",
      question: "Does anchor-name cross subgrid boundaries?",
      result: "Works inside the same containing block.",
      testedIn: "Chrome 151 Canary",
      api: ["CSS Anchor Positioning", "CSS Subgrid"],
      composesWith: ["popover", "css-grid"],
      friction: [
        {
          summary: "Focus ring clips under CSS scale()",
          kind: "browser-bug",
          repro: "Tab to the inner button at 1.5x scale.",
          browser: "Chrome 151 Canary",
          issueUrl: "https://issues.chromium.org/issues/42",
          workaround: "Draw an inset outline.",
        },
      ],
    });
  });

  await t.test("accepts a minimal metadata payload with required fields only", () => {
    const parsed = parseConceptPageMeta({
      title: "Minimal starter",
      blurb: "Basic usage of the API.",
      kind: "starter",
    });

    assert.deepEqual(parsed, {
      title: "Minimal starter",
      blurb: "Basic usage of the API.",
      kind: "starter",
    });
  });

  await t.test("strips invalid optional fields, unsafe URLs, and malformed friction items", () => {
    const parsed = parseConceptPageMeta({
      title: "Stress harness",
      blurb: "Exercises 10k nodes.",
      kind: "stress",
      question: "   ",
      result: 42,
      api: ["GoodAPI", "", 123, null],
      composesWith: ["", "   "],
      friction: [
        null,
        { summary: "Missing kind" },
        { summary: "Bad kind", kind: "not-a-kind" },
        {
          summary: "Valid friction with bad issueUrl",
          kind: "ergonomics",
          issueUrl: "javascript:alert(1)",
          browser: 99,
          extra: true,
        },
      ],
    });

    assert.deepEqual(parsed, {
      title: "Stress harness",
      blurb: "Exercises 10k nodes.",
      kind: "stress",
      api: ["GoodAPI"],
      friction: [
        {
          summary: "Valid friction with bad issueUrl",
          kind: "ergonomics",
        },
      ],
    });
  });

  await t.test("rejects non-objects and missing or invalid required fields", () => {
    for (
      const bad of [
        null,
        undefined,
        "string",
        42,
        [],
        {},
        { title: "Only title" },
        { title: "A", blurb: "B" },
        { title: "A", blurb: "B", kind: "unknown-kind" },
        { title: "   ", blurb: "B", kind: "starter" },
        { title: "A", blurb: "", kind: "experiment" },
      ]
    ) {
      assert.equal(parseConceptPageMeta(bad), null);
    }
  });
});

test("renderFrictionPage escapes hostile payloads and renders empty state safely", async (t) => {
  await t.test("escapes <script> and quoted payloads in summary and issueUrl", () => {
    const hostileSummary = '<script>alert("summary")</script> & "quoted"';
    const hostileIssueUrl = 'https://issues.chromium.org/issues/1"><script>alert(1)</script>';
    const html = renderFrictionPage([
      {
        release: "v151",
        featureSlug: "html-in-canvas",
        conceptSlug: "focus-ring",
        route: "/v151/html-in-canvas/focus-ring/",
        pageTitle: 'Focus <script>alert("title")</script>',
        entry: {
          summary: hostileSummary,
          kind: "browser-bug",
          repro: 'Click "go" <img src=x onerror=alert(1)>',
          browser: 'Chrome "151" <canary>',
          issueUrl: hostileIssueUrl,
          workaround: 'Use <style>body{}</style> "inset"',
        },
      },
      {
        release: "v151",
        featureSlug: "html-in-canvas",
        conceptSlug: "js-url",
        route: "/v151/html-in-canvas/js-url/",
        pageTitle: "Unsafe URL test",
        entry: {
          summary: "Non-http issueUrl must not render as a link",
          kind: "spec-mismatch",
          issueUrl: "javascript:alert(1)",
        },
      },
    ]);

    assert.equal(html.includes("<script>alert("), false, "must never render raw <script> payload");
    assert.equal(
      html.includes("<img src=x"),
      false,
      "must never render raw HTML tag from repro",
    );
    assert.equal(
      html.includes('href="javascript:'),
      false,
      "must never render javascript: href",
    );
    assert.ok(
      html.includes("&lt;script&gt;alert(&quot;summary&quot;)&lt;/script&gt;"),
      "escaped summary should be present",
    );
    assert.ok(
      html.includes(
        'href="https://issues.chromium.org/issues/1&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"',
      ),
      "escaped https issueUrl should stay contained in href attribute",
    );
    assert.ok(
      html.includes('href="/v151/html-in-canvas/focus-ring/#repro"'),
      "should link directly to #repro anchor",
    );
  });

  await t.test("renders helpful empty-state instructions when no entries exist", () => {
    const html = renderFrictionPage([]);
    assert.ok(html.includes("No friction entries recorded yet"));
    assert.ok(html.includes("page.json"));
    assert.ok(html.includes("#repro"));
  });
});

test("renderExperimentsPage escapes hostile payloads in question and composesWith", async (t) => {
  await t.test("escapes <script> and quoted payloads across all fields", () => {
    const html = renderExperimentsPage([
      {
        release: "v152",
        featureSlug: "popover-anchor",
        conceptSlug: "subgrid-case",
        route: "/v152/popover-anchor/subgrid-case/",
        meta: {
          title: 'Subgrid "Anchor" <script>alert("t")</script>',
          blurb: 'Tests <script>alert("b")</script> interactions.',
          kind: "composition",
          question: 'Does <script>alert("q")</script> "survive" anchoring?',
          result: 'Observed <b>"clipped"</b> edge.',
          testedIn: 'Chrome "152" <dev>',
          api: ['CSS.supports("<script>")'],
          composesWith: ['popover" onclick="alert(1)', "<script>alert('c')</script>"],
          friction: [
            {
              summary: "Edge clip",
              kind: "platform-limit",
            },
          ],
        },
      },
    ]);

    assert.equal(html.includes("<script>alert("), false, "must never render raw <script> payload");
    assert.equal(
      html.includes('" onclick="alert(1)'),
      false,
      "must never allow attribute breakout in composesWith",
    );
    assert.ok(
      html.includes("Does &lt;script&gt;alert(&quot;q&quot;)&lt;/script&gt; &quot;survive&quot;"),
      "escaped question should be rendered",
    );
    assert.ok(
      html.includes("popover&quot; onclick=&quot;alert(1)"),
      "escaped composesWith label should be rendered",
    );
    assert.ok(html.includes('data-kind="starter"'));
    assert.ok(html.includes('data-kind="experiment"'));
    assert.ok(html.includes('data-kind="stress"'));
    assert.ok(html.includes('data-kind="composition"'));
    assert.ok(html.includes('data-kind="migration"'));
  });

  await t.test("renders empty-state explanation when no experiments exist", () => {
    const html = renderExperimentsPage([]);
    assert.ok(html.includes("No experiment metadata indexed yet"));
    assert.ok(html.includes("page.json"));
  });
});

test("handleFrictionRoute and handleExperimentsRoute serve HTML and JSON from platform()", async () => {
  const prev = platform();
  const mock = memoryPlatform({
    "v151/css-anchor/grid-test/page.json": JSON.stringify({
      title: "Anchor + Grid",
      blurb: "Tests anchor positioning inside CSS Grid.",
      kind: "composition",
      question: "Does anchor positioning track grid tracks?",
      result: "Yes, within the same containing block.",
      api: ["CSS Anchor Positioning"],
      composesWith: ["css-grid", "popover"],
      friction: [
        {
          summary: "Clipped under overflow: clip",
          kind: "platform-limit",
          repro: "Toggle overflow: clip on the grid container.",
          browser: "Chrome 151",
          issueUrl: "https://issues.chromium.org/issues/12345",
          workaround: "Use overflow: visible on the grid wrapper.",
        },
      ],
    }),
    "v150/view-transitions/basic/page.json": JSON.stringify({
      title: "Basic View Transition",
      blurb: "Starter transition between two states.",
      kind: "starter",
    }),
    "v150/broken/bad/page.json": "{not valid json",
  });

  installPlatform(mock);
  try {
    const single = await readConceptPageMeta("v151", "css-anchor", "grid-test");
    assert.equal(single?.title, "Anchor + Grid");
    assert.equal(await readConceptPageMeta("v150", "broken", "bad"), null);

    const experiments = await collectExperiments();
    assert.equal(experiments.length, 2);
    assert.equal(experiments[0].release, "v151");
    assert.equal(experiments[1].release, "v150");

    const friction = await collectFrictionEntries();
    assert.equal(friction.length, 1);
    assert.equal(friction[0].route, "/v151/css-anchor/grid-test/");

    // Non-matching routes return null.
    assert.equal(
      await handleExperimentsRoute(new Request("https://showcase.example/features")),
      null,
    );
    assert.equal(
      await handleFrictionRoute(new Request("https://showcase.example/features")),
      null,
    );

    // Non-GET returns 405.
    const badMethod = await handleFrictionRoute(
      new Request("https://showcase.example/friction", { method: "POST" }),
    );
    assert.equal(badMethod?.status, 405);

    // /experiments and /experiments/ return HTML.
    for (
      const url of ["https://showcase.example/experiments", "https://showcase.example/experiments/"]
    ) {
      const res = await handleExperimentsRoute(new Request(url));
      assert.ok(res);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
      const body = await res.text();
      assert.ok(body.includes("Anchor + Grid"));
      assert.ok(body.includes("Basic View Transition"));
    }

    // /experiments.json returns JSON.
    const expJsonRes = await handleExperimentsRoute(
      new Request("https://showcase.example/experiments.json"),
    );
    assert.ok(expJsonRes);
    assert.equal(expJsonRes.status, 200);
    assert.equal(expJsonRes.headers.get("content-type"), "application/json; charset=utf-8");
    const expJson = await expJsonRes.json();
    assert.equal(expJson.count, 2);
    assert.equal(expJson.experiments[0].meta.title, "Anchor + Grid");

    // /friction and /friction/ return HTML.
    for (const url of ["https://showcase.example/friction", "https://showcase.example/friction/"]) {
      const res = await handleFrictionRoute(new Request(url));
      assert.ok(res);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
      const body = await res.text();
      assert.ok(body.includes("Clipped under overflow: clip"));
      assert.ok(body.includes("/v151/css-anchor/grid-test/#repro"));
    }

    // /friction.json returns JSON.
    const fricJsonRes = await handleFrictionRoute(
      new Request("https://showcase.example/friction.json"),
    );
    assert.ok(fricJsonRes);
    assert.equal(fricJsonRes.status, 200);
    assert.equal(fricJsonRes.headers.get("content-type"), "application/json; charset=utf-8");
    const fricJson = await fricJsonRes.json();
    assert.equal(fricJson.count, 1);
    assert.equal(fricJson.entries[0].entry.summary, "Clipped under overflow: clip");
  } finally {
    installPlatform(prev);
  }
});
