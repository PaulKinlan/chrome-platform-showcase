import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCritiquesIndex } from "../../routes/critique-renderers.ts";
import { handleCritiquesRoute } from "../../routes/critiques.ts";

function makeCritique({
  release = "v153",
  featureSlug = "feat",
  conceptSlug,
  passCount = 2,
  failCount = 0,
  questions = [],
}) {
  const rubric = {};
  for (let i = 0; i < passCount; i++) {
    rubric[`pass_${i}`] = { state: "pass", rationale: "ok" };
  }
  for (let i = 0; i < failCount; i++) {
    rubric[`fail_${i}`] = { state: "fail", rationale: "needs work" };
  }
  return {
    release,
    featureSlug,
    conceptSlug,
    chromestatusId: 5000000000000000,
    reviewedAt: "2026-10-01T00:00:00Z",
    reviewer: "test",
    rubric,
    openQuestions: questions,
  };
}

function countTableRows(html) {
  const bodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
  assert.ok(bodyMatch, "expected <tbody> in rendered HTML");
  return [...bodyMatch[1].matchAll(/<tr\b[^>]*>/g)].length;
}

test(
  "renderCritiquesIndex paginates by default and clamps out-of-range page and limit bounds",
  async () => {
  const critiques = Array.from({ length: 25 }, (_, i) =>
    makeCritique({
      release: i < 15 ? "v153" : "v152",
      featureSlug: `feature-${String(i).padStart(2, "0")}`,
      conceptSlug: i % 2 === 0 ? "starter" : undefined,
      passCount: i % 5,
      failCount: 5 - (i % 5),
      questions: [{ title: `q-${i}`, detail: "d", severity: "minor" }],
    })
  );

  // Custom limit=10 on 25 items => 3 pages (10, 10, 5)
  const page1 = await renderCritiquesIndex({ critiques, page: 1, limit: 10 });
  assert.equal(countTableRows(page1), 10);
  assert.ok(page1.includes('<nav class="pagination" aria-label="Critiques pagination">'));
  assert.ok(page1.includes("Showing 1&ndash;10 of 25 (page 1 of 3)"));
  assert.ok(page1.includes("25 pages reviewed"));
  assert.ok(page1.includes('rel="next"'));
  assert.ok(page1.includes("page=2&amp;limit=10"));

  const page2 = await renderCritiquesIndex({ critiques, page: 2, limit: 10 });
  assert.equal(countTableRows(page2), 10);
  assert.ok(page2.includes("Showing 11&ndash;20 of 25 (page 2 of 3)"));
  assert.ok(page2.includes('rel="prev"'));
  assert.ok(page2.includes('rel="next"'));

  const page3 = await renderCritiquesIndex({ critiques, page: 3, limit: 10 });
  assert.equal(countTableRows(page3), 5);
  assert.ok(page3.includes("Showing 21&ndash;25 of 25 (page 3 of 3)"));

  // Out-of-bounds page numbers clamp cleanly
  const clampedLow = await renderCritiquesIndex({ critiques, page: -4, limit: 10 });
  assert.equal(countTableRows(clampedLow), 10);
  assert.ok(clampedLow.includes("Showing 1&ndash;10 of 25 (page 1 of 3)"));

  const clampedZero = await renderCritiquesIndex({ critiques, page: 0, limit: 10 });
  assert.ok(clampedZero.includes("Showing 1&ndash;10 of 25 (page 1 of 3)"));

  const clampedHigh = await renderCritiquesIndex({ critiques, page: 999, limit: 10 });
  assert.equal(countTableRows(clampedHigh), 5);
  assert.ok(clampedHigh.includes("Showing 21&ndash;25 of 25 (page 3 of 3)"));

  // Out-of-bounds limit clamps to [1, 500]
  const clampedMinLimit = await renderCritiquesIndex({ critiques, page: 1, limit: 0 });
  assert.equal(countTableRows(clampedMinLimit), 1);
  assert.ok(clampedMinLimit.includes("Showing 1&ndash;1 of 25 (page 1 of 25)"));
});

test("renderCritiquesIndex supports release filtering and all=true", async () => {
  const critiques = [
    ...Array.from({ length: 12 }, (_, i) =>
      makeCritique({ release: "v153", featureSlug: `a-${i}` })
    ),
    ...Array.from({ length: 4 }, (_, i) =>
      makeCritique({ release: "v152", featureSlug: `b-${i}` })
    ),
  ];

  const v152Only = await renderCritiquesIndex({ critiques, release: "v152", limit: 10 });
  assert.equal(countTableRows(v152Only), 4);
  assert.ok(v152Only.includes("4 pages reviewed"));
  assert.ok(
    v152Only.includes(
      'href="/critiques/?release=v152&amp;limit=10" aria-current="page">v152</a>',
    ),
  );
  assert.equal(v152Only.includes("v153 a-0"), false);

  const allRows = await renderCritiquesIndex({ critiques, limit: 5, all: true });
  assert.equal(countTableRows(allRows), 16);
  assert.ok(allRows.includes("Showing all 16 pages"));
  assert.ok(allRows.includes("Paginate (5/page)"));
});

test(
  "renderCritiquesIndex strictly escapes hostile release, slug, and question metadata",
  async () => {
  const hostileRelease = 'v153" onmouseover="alert(1)<script>';
  const critiques = [
    makeCritique({
      release: hostileRelease,
      featureSlug: 'bad"slug<img src=x>',
      conceptSlug: "sub'concept",
      questions: [
        {
          title: '<script>alert("q")</script>',
          detail: "details",
          severity: 'major" onclick="evil()',
        },
      ],
    }),
  ];

  const html = await renderCritiquesIndex({ critiques, release: hostileRelease });
  assert.equal(html.includes('onmouseover="alert'), false);
  assert.equal(html.includes('onclick="evil'), false);
  assert.equal(html.includes('<script>alert("q")</script>'), false);
  assert.ok(html.includes("&lt;script&gt;alert(&quot;q&quot;)&lt;/script&gt;"));
  assert.ok(html.includes("v153&quot; onmouseover=&quot;alert(1)&lt;script&gt;"));
});

test(
  "handleCritiquesRoute defaults to 100 rows and honours release, page, limit, and all query params",
  async () => {
  const defaultRes = await handleCritiquesRoute(
    new Request("http://localhost:3000/critiques/"),
  );
  assert.ok(defaultRes);
  assert.equal(defaultRes.status, 200);
  const defaultHtml = await defaultRes.text();
  assert.ok(countTableRows(defaultHtml) <= 100, "default /critiques/ should cap at 100 rows");
  assert.ok(defaultHtml.includes('aria-label="Critiques pagination"'));

  const page2Res = await handleCritiquesRoute(
    new Request("http://localhost:3000/critiques/?page=2&limit=15"),
  );
  assert.equal(page2Res.status, 200);
  const page2Html = await page2Res.text();
  assert.equal(countTableRows(page2Html), 15);
  assert.ok(page2Html.includes("page 2 of"));

  const allRes = await handleCritiquesRoute(
    new Request("http://localhost:3000/critiques/?all=1"),
  );
  assert.equal(allRes.status, 200);
  const allHtml = await allRes.text();
  assert.ok(countTableRows(allHtml) > 100, "?all=1 should render more than the default 100 rows");
  assert.ok(allHtml.includes("Showing all "));
});
