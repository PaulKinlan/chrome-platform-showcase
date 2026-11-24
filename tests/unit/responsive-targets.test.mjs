// Unit tests for responsive-check target expansion and per-feature rollup.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  expandResponsiveTargets,
  rollupFeatureSupport,
  toSidecarUpdates,
} from "../../scripts/lib/responsive-targets.mjs";

const SAMPLE_ENTRIES = [
  {
    id: "v149/image-rendering-crisp-edges",
    route: "/v149/image-rendering-crisp-edges/",
    concepts: ["icon-set-comparison", "pixel-art-gallery"],
  },
  {
    id: "v153/standalone-demo",
    route: "/v153/standalone-demo/",
    concepts: [],
  },
];

test("expandResponsiveTargets returns only feature indexes when includeConcepts is false", () => {
  const withFalse = expandResponsiveTargets(SAMPLE_ENTRIES, { includeConcepts: false });
  const withDefault = expandResponsiveTargets(SAMPLE_ENTRIES);

  const expected = [
    {
      featureId: "v149/image-rendering-crisp-edges",
      pageId: "v149/image-rendering-crisp-edges",
      route: "/v149/image-rendering-crisp-edges/",
      isConcept: false,
    },
    {
      featureId: "v153/standalone-demo",
      pageId: "v153/standalone-demo",
      route: "/v153/standalone-demo/",
      isConcept: false,
    },
  ];
  assert.deepEqual(withFalse, expected);
  assert.deepEqual(withDefault, expected);
});

test("expandResponsiveTargets includes index and concepts when includeConcepts is true", () => {
  const expanded = expandResponsiveTargets(SAMPLE_ENTRIES, { includeConcepts: true });

  assert.deepEqual(expanded, [
    {
      featureId: "v149/image-rendering-crisp-edges",
      pageId: "v149/image-rendering-crisp-edges",
      route: "/v149/image-rendering-crisp-edges/",
      isConcept: false,
    },
    {
      featureId: "v149/image-rendering-crisp-edges",
      pageId: "v149/image-rendering-crisp-edges/icon-set-comparison",
      route: "/v149/image-rendering-crisp-edges/icon-set-comparison/",
      isConcept: true,
    },
    {
      featureId: "v149/image-rendering-crisp-edges",
      pageId: "v149/image-rendering-crisp-edges/pixel-art-gallery",
      route: "/v149/image-rendering-crisp-edges/pixel-art-gallery/",
      isConcept: true,
    },
    {
      featureId: "v153/standalone-demo",
      pageId: "v153/standalone-demo",
      route: "/v153/standalone-demo/",
      isConcept: false,
    },
  ]);
});

test("rollupFeatureSupport marks feature ok only when index and all concepts pass", () => {
  const rolled = rollupFeatureSupport(
    [
      {
        featureId: "v149/image-rendering-crisp-edges",
        pageId: "v149/image-rendering-crisp-edges",
        isConcept: false,
        desktop: "ok",
        mobile: "ok",
        lastChecked: "2026-11-24",
        source: "harness",
      },
      {
        featureId: "v149/image-rendering-crisp-edges",
        pageId: "v149/image-rendering-crisp-edges/icon-set-comparison",
        isConcept: true,
        desktop: "ok",
        mobile: "ok",
        lastChecked: "2026-11-24",
        source: "harness",
      },
      {
        featureId: "v149/image-rendering-crisp-edges",
        pageId: "v149/image-rendering-crisp-edges/pixel-art-gallery",
        isConcept: true,
        desktop: "ok",
        mobile: "ok",
        lastChecked: "2026-11-24",
        source: "harness",
      },
    ],
  );

  assert.deepEqual(rolled["v149/image-rendering-crisp-edges"], {
    desktop: "ok",
    mobile: "ok",
    conceptCount: 2,
    conceptsChecked: 2,
    failedConcepts: [],
    lastChecked: "2026-11-24",
    source: "harness",
  });
});

test("rollupFeatureSupport marks broken and lists failed concept when one concept fails", () => {
  const rolled = rollupFeatureSupport(
    [
      {
        featureId: "v149/image-rendering-crisp-edges",
        pageId: "v149/image-rendering-crisp-edges",
        isConcept: false,
        desktop: "ok",
        mobile: "ok",
      },
      {
        featureId: "v149/image-rendering-crisp-edges",
        pageId: "v149/image-rendering-crisp-edges/icon-set-comparison",
        isConcept: true,
        desktop: "ok",
        mobile: "broken",
      },
      {
        featureId: "v149/image-rendering-crisp-edges",
        pageId: "v149/image-rendering-crisp-edges/pixel-art-gallery",
        isConcept: true,
        desktop: "ok",
        mobile: "ok",
      },
    ],
    { lastChecked: "2026-11-24", source: "harness" },
  );

  assert.deepEqual(rolled["v149/image-rendering-crisp-edges"], {
    desktop: "ok",
    mobile: "broken",
    conceptCount: 2,
    conceptsChecked: 2,
    failedConcepts: ["icon-set-comparison"],
    lastChecked: "2026-11-24",
    source: "harness",
  });
});

test("rollupFeatureSupport keeps class blocked (never false ok) when a concept is blocked", () => {
  const rolled = rollupFeatureSupport(
    [
      {
        featureId: "v150/ai-demo",
        pageId: "v150/ai-demo",
        isConcept: false,
        desktop: "ok",
        mobile: "ok",
      },
      {
        featureId: "v150/ai-demo",
        pageId: "v150/ai-demo/prompt-playground",
        isConcept: true,
        desktop: "ok",
        mobile: "blocked",
      },
    ],
    { lastChecked: "2026-11-24", source: "harness" },
  );

  assert.deepEqual(rolled["v150/ai-demo"], {
    desktop: "ok",
    mobile: "blocked",
    conceptCount: 1,
    conceptsChecked: 1,
    failedConcepts: [],
    lastChecked: "2026-11-24",
    source: "harness",
  });

  // Sidecar update omits blocked mobile class so existing state stays untouched.
  assert.deepEqual(toSidecarUpdates(rolled), {
    "v150/ai-demo": {
      source: "harness",
      lastChecked: "2026-11-24",
      desktop: "ok",
    },
  });
});

test("rollupFeatureSupport keeps classes independent: desktop broken + mobile ok", () => {
  const rolled = rollupFeatureSupport(
    [
      {
        featureId: "v130/storage-access-headers",
        pageId: "v130/storage-access-headers",
        isConcept: false,
        desktop: "ok",
        mobile: "ok",
      },
      {
        featureId: "v130/storage-access-headers",
        pageId: "v130/storage-access-headers/sah",
        isConcept: true,
        desktop: "broken",
        mobile: "ok",
      },
    ],
    { lastChecked: "2026-11-24", source: "harness" },
  );

  assert.equal(rolled["v130/storage-access-headers"].desktop, "broken");
  assert.equal(rolled["v130/storage-access-headers"].mobile, "ok");
  assert.deepEqual(rolled["v130/storage-access-headers"].failedConcepts, ["sah"]);
  assert.deepEqual(toSidecarUpdates(rolled), {
    "v130/storage-access-headers": {
      source: "harness",
      lastChecked: "2026-11-24",
      desktop: "broken",
      mobile: "ok",
    },
  });
});

test("rollupFeatureSupport prefers broken over blocked and deduplicates failedConcepts", () => {
  const rolled = rollupFeatureSupport(
    [
      {
        featureId: "v143/intl-locale",
        pageId: "v143/intl-locale",
        isConcept: false,
        desktop: "ok",
        mobile: "ok",
      },
      {
        featureId: "v143/intl-locale",
        pageId: "v143/intl-locale/intl-getters",
        isConcept: true,
        desktop: "broken",
        mobile: "broken",
      },
      {
        featureId: "v143/intl-locale",
        pageId: "v143/intl-locale/other-concept",
        isConcept: true,
        desktop: "blocked",
        mobile: "ok",
      },
    ],
    { lastChecked: "2026-11-24", source: "harness" },
  );

  assert.equal(rolled["v143/intl-locale"].desktop, "broken");
  assert.equal(rolled["v143/intl-locale"].mobile, "broken");
  assert.deepEqual(rolled["v143/intl-locale"].failedConcepts, ["intl-getters"]);
});

test("rollupFeatureSupport preserves manifest conceptCount when concepts are not checked", () => {
  const rolled = rollupFeatureSupport(
    [
      {
        featureId: "v149/image-rendering-crisp-edges",
        pageId: "v149/image-rendering-crisp-edges",
        isConcept: false,
        desktop: "ok",
        mobile: "ok",
      },
    ],
    {
      conceptCounts: { "v149/image-rendering-crisp-edges": 4 },
      lastChecked: "2026-11-24",
      source: "harness",
    },
  );

  assert.equal(rolled["v149/image-rendering-crisp-edges"].conceptCount, 4);
  assert.equal(rolled["v149/image-rendering-crisp-edges"].conceptsChecked, 0);
  assert.equal(rolled["v149/image-rendering-crisp-edges"].desktop, "ok");
  assert.equal(rolled["v149/image-rendering-crisp-edges"].mobile, "ok");
});
