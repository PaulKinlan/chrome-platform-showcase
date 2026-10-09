import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Vocabulary from https://drafts.csswg.org/css-borders-4/#typedef-corner-shape-value.
//
// Two layers here, and bead chrome_platform_showcase-dxk is about the second:
//   1. the vocabulary guard — the gallery and builder must offer exactly the
//      keywords the spec defines (plus the functional form the gallery
//      demonstrates). This is the real regression guard for the 8vh 'straight'
//      bug, and it stays.
//   2. what the page RENDERS — this suite used to assert the gallery's copy by
//      regex (`/all six boxes|six shapes/`, `/\$\{built\.length\} example/`,
//      `/not the newer <code>corner<\/code> shorthands/`), which measured wording
//      rather than behaviour: it passed and failed with copy edits. The gallery's
//      own script now runs against a minimal fake DOM, and the assertions are on
//      the DOM it built and the strings it wrote. Browser parsing/rendering of
//      `corner-shape` itself is what the chrome-devtools-mcp run in the kz8
//      evidence covers; this suite is deterministic and offline (two file reads).
const feature = new URL("../v155/css-corner-shorthand-properties/", import.meta.url);
const keywords = ["round", "bevel", "scoop", "notch", "squircle", "square"];

const galleryHtml = readFileSync(new URL("shape-gallery/index.html", feature), "utf8");
const builderHtml = readFileSync(new URL("corner-builder/index.html", feature), "utf8");

const builderList = builderHtml.match(/const SHAPES = \[([^\]]+)\];/);
assert.ok(builderList, "Builder must expose its shape vocabulary");
const builderValues = [...builderList[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
assert.deepEqual(
  builderValues,
  keywords,
  "builder vocabulary must be the CSS Borders 4 keyword list",
);

// The page's own inline script — everything except the deferred telemetry <script src>.
const galleryScript = [
  ...galleryHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi),
]
  .map((match) => match[1]).join("\n");
assert.ok(
  galleryScript.includes("const SHAPES = ["),
  "gallery script did not parse out of the page",
);

function makeStyle() {
  const props = {};
  const target = { props, setProperty: (name, value) => (props[name] = String(value)) };
  return new Proxy(target, {
    set(object, key, value) {
      object[key] = value;
      if (typeof key === "string" && key !== "props") props[key] = String(value);
      return true;
    },
  });
}

function makeElement(tag) {
  return {
    tagName: tag,
    className: "",
    textContent: "",
    innerHTML: "",
    dataset: {},
    style: makeStyle(),
    children: [],
    append(...nodes) {
      this.children.push(...nodes);
    },
    addEventListener() {},
  };
}

// Run the gallery's script and report what it produced. `supported(value)` decides
// what the stubbed CSS.supports answers, so both branches of the page's feature
// detection can be exercised without a browser.
function runGallery({ supported, radius = "12" }) {
  const byId = {
    gallery: makeElement("div"),
    detail: makeElement("p"),
    support: makeElement("div"),
    radius: Object.assign(makeElement("input"), { value: radius }),
    "radius-label": makeElement("span"),
  };
  const probes = [];
  const telemetry = [];
  const document = {
    getElementById: (id) => byId[id] ?? null,
    createElement: (tag) => makeElement(tag),
  };
  const CSS = {
    supports: (property, value) => (probes.push({ property, value }), supported(value)),
  };
  const window = { showcaseTelemetry: { assert: (...args) => telemetry.push(args) } };

  new Function("document", "CSS", "window", "console", galleryScript)(
    document,
    CSS,
    window,
    { log: () => {} },
  );

  const swatches = byId.gallery.children.map((wrap) => ({
    shape: wrap.dataset.shape,
    className: wrap.className,
    boxProps: wrap.children[0]?.style?.props ?? {},
    label: wrap.children[2]?.textContent,
  }));
  return {
    swatches,
    support: byId.support.innerHTML.replace(/<[^>]*>/g, "").trim(),
    detail: byId.detail.textContent,
    radiusLabel: byId["radius-label"].textContent,
    probes,
    telemetry,
  };
}

// ── the rendered gallery ─────────────────────────────────────────────────────
const allSupported = runGallery({ supported: () => true });
const renderedShapes = allSupported.swatches.map((swatch) => swatch.shape);

// The vocabulary claim is now read off the RENDERED page, not off a regex over the
// source: order and membership both have to match the spec list plus the functional
// form the gallery exists to demonstrate.
assert.deepEqual(
  renderedShapes,
  [...keywords, "superellipse(2)"],
  `gallery rendered ${
    JSON.stringify(renderedShapes)
  }, expected the keyword list plus superellipse(2)`,
);

// Every value the page feature-detects must be corner-shape. This replaces the old
// "not the newer <code>corner</code> shorthands" copy check: the page's own calls
// are inspected, so probing the wrong property (or a `corner` shorthand) fails.
assert.deepEqual(
  allSupported.probes.map((probe) => probe.property),
  renderedShapes.map(() => "corner-shape"),
  `gallery probed ${
    JSON.stringify(allSupported.probes.map((p) => p.property))
  } instead of corner-shape`,
);
assert.deepEqual(
  allSupported.probes.map((probe) => probe.value),
  renderedShapes,
  "probed the wrong values",
);

// Supported branch: the label, the class and the applied custom property all agree.
assert.deepEqual(
  allSupported.swatches.map((swatch) => swatch.label),
  renderedShapes.map(() => "supported"),
  "each supported example must be labelled 'supported'",
);
assert.deepEqual(
  allSupported.swatches.map((swatch) => /\bunsupported\b/.test(swatch.className)),
  renderedShapes.map(() => false),
  "a supported example must not carry the unsupported class",
);
assert.deepEqual(
  allSupported.swatches.map((swatch) => swatch.boxProps["corner-shape"]),
  renderedShapes,
  "each supported box must be given its own corner-shape value",
);
assert.deepEqual(
  allSupported.swatches.map((swatch) => swatch.boxProps.borderRadius),
  renderedShapes.map(() => "12px"),
  "every box must take the radius from the control",
);

// The count in the page's own summary must agree with what it rendered — the
// rendered counterpart of the old `${built.length} example` source check. The
// expected number is read from the DOM, so a hardcoded count fails.
const renderedCount = allSupported.swatches.length;
assert.equal(renderedCount, 7, `expected 7 examples rendered, got ${renderedCount}`);
assert.equal(
  allSupported.support,
  `${renderedCount} of ${renderedCount} example values are supported for corner-shape`,
  `summary text does not agree with the ${renderedCount} rendered examples: ${allSupported.support}`,
);
assert.equal(
  allSupported.detail,
  `Radius 12px across ${renderedCount} example values. Unsupported values use border-radius alone.`,
  `detail copy does not agree with the ${renderedCount} rendered examples: ${allSupported.detail}`,
);
assert.equal(allSupported.radiusLabel, "12px", "the radius label must echo the control");

// The demo's own instrumentation has to describe the same render.
assert.deepEqual(
  allSupported.telemetry,
  [["gallery-rendered", true, { radius: 12, supported: renderedCount, total: renderedCount }]],
  `telemetry payload disagrees with the render: ${JSON.stringify(allSupported.telemetry)}`,
);

// ── the fallback branch, when nothing is supported ───────────────────────────
const noneSupported = runGallery({ supported: () => false });
assert.equal(
  noneSupported.swatches.length,
  renderedCount,
  "the fallback must render the same examples",
);
assert.deepEqual(
  noneSupported.swatches.map((swatch) => swatch.label),
  noneSupported.swatches.map(() => "not supported here"),
  "an unsupported example must say so",
);
assert.deepEqual(
  noneSupported.swatches.map((swatch) => /\bunsupported\b/.test(swatch.className)),
  noneSupported.swatches.map(() => true),
  "an unsupported example must carry the unsupported class",
);
assert.deepEqual(
  noneSupported.swatches.map((swatch) => swatch.boxProps["corner-shape"]),
  noneSupported.swatches.map(() => undefined),
  "no box may be given a corner-shape value when the feature is unsupported",
);
assert.deepEqual(
  noneSupported.swatches.map((swatch) => swatch.boxProps.borderRadius),
  noneSupported.swatches.map(() => "12px"),
  "the border-radius fallback must still be applied to every box",
);
assert.equal(
  noneSupported.support,
  `0 of ${renderedCount} example values are supported for corner-shape; all boxes use border-radius alone`,
  `fallback summary disagrees with the render: ${noneSupported.support}`,
);
assert.equal(
  noneSupported.detail,
  `Radius 12px applied to all ${renderedCount} examples. Without corner-shape, every box uses border-radius alone.`,
  `fallback detail disagrees with the render: ${noneSupported.detail}`,
);
assert.deepEqual(
  noneSupported.telemetry,
  [["gallery-rendered", true, { radius: 12, supported: 0, total: renderedCount }]],
  `fallback telemetry disagrees with the render: ${JSON.stringify(noneSupported.telemetry)}`,
);

// ── the radius-zero branch ───────────────────────────────────────────────────
const zeroRadius = runGallery({ supported: () => true, radius: "0" });
assert.equal(
  zeroRadius.detail,
  `At radius zero, all ${renderedCount} examples have square corners.`,
  `radius-zero copy disagrees with the render: ${zeroRadius.detail}`,
);
assert.equal(zeroRadius.radiusLabel, "0px", "the radius label must follow the control to zero");

console.log(
  `PASS — corner-shape vocabulary and rendered gallery (${renderedCount} examples, supported and ` +
    `fallback branches, radius 12 and 0: labels, applied corner-shape/border-radius, summary counts, ` +
    `detail copy and telemetry all agree with the DOM the page built)`,
);
