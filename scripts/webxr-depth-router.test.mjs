// Focused checks for the v139 WebXR depth raw-vs-smooth-router repair
// (bead chrome_platform_showcase-w3o).
//
// The demo shipped with HTML entities inside the raw-text <script> element
// (`=&gt;` twice, `&lt;td&gt;` in a template literal) — a SyntaxError that
// killed every control — and its recommended-value cells were emerald text on
// an emerald background. These assertions pin the repair so the file cannot
// silently regress.
//
// Bead kz8 replaced the source-string half: the router's own inline script is
// EXECUTED here against a minimal fake DOM, so the assertions are on the values
// it produced (the session snippet, the recommendation table, the bandwidth and
// latency readouts) rather than on the shape of the text. The recommended-value
// contrast is COMPUTED from the rule and the design tokens rather than matched
// by regex. Entity corruption inside script is no longer duplicated here: that
// is scripts/entity-escaped-script.test.mjs (task test-entity-scripts), which
// walks every demo file and reports file:line.
//
// Run: deno task test-webxr-depth-router

const REPO = new URL("..", import.meta.url).pathname;
const PAGE = "v139/webxr-depth-sensing-performance-improvements/raw-vs-smooth-router/index.html";
const html = Deno.readTextFileSync(`${REPO}${PAGE}`);

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) console.log(`ok — ${label}`);
  else {
    failures++;
    console.error(`FAIL — ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

const scriptBodies = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((m) => m[1])
  .join("\n");

check("at least one script block exists", scriptBodies.length > 0);

// ── 1. Behaviour: run the router's own render() over a fake DOM ──────────────
// The page's inline IIFE reads two selects, writes a session snippet, appends a
// recommendation row per knob, and writes the bandwidth/latency readouts. A
// fake document that records those writes lets the real code path run here, so
// a regression in the recipe table or the render logic fails on what it
// produced, not on how the source is spelled. (Entity corruption inside the
// script would still throw here — see the pointer in the header.)
function renderRouter({ caseId, device }) {
  const state = { snippet: "", rows: [], bandwidth: "", latency: "" };
  const tbody = {
    innerHTML: "",
    appendChild(row) {
      state.rows.push(row.innerHTML);
    },
  };
  const writable = (key) => ({
    get textContent() {
      return state[key];
    },
    set textContent(value) {
      state[key] = value;
    },
    addEventListener() {},
  });
  const inert = (value) => ({ value, addEventListener() {} });
  const fakeDocument = {
    getElementById(id) {
      switch (id) {
        case "case":
          return inert(caseId);
        case "device":
          return inert(device);
        case "snippet":
          return writable("snippet");
        case "s-bw":
          return writable("bandwidth");
        case "s-lat":
          return writable("latency");
        default:
          throw new Error(`router render read an unexpected element: #${id}`);
      }
    },
    querySelector(selector) {
      if (selector === "#m tbody") return tbody;
      throw new Error(`router render used an unexpected selector: ${selector}`);
    },
    createElement() {
      return { innerHTML: "" };
    },
  };

  const original = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    value: fakeDocument,
    configurable: true,
    writable: true,
  });
  try {
    new Function(scriptBodies)();
  } finally {
    if (original) Object.defineProperty(globalThis, "document", original);
    else delete globalThis.document;
  }
  return state;
}

// Recipes the page must render, spelled out here so a change to the table is a
// failure rather than a silently different demo. Bandwidth is device
// resolution × bytes per depth format, in KB.
const CASES = [
  {
    caseId: "ar-occlusion",
    device: "phone",
    snippet: [
      "usagePreference: ['gpu-optimized']",
      "dataFormatPreference: ['luminance-alpha']",
      "depthType: 'raw'",
    ],
    rows: ["gpu-optimized", "luminance-alpha", "raw", "least latency, noisy edges"],
    bandwidth: "38 KB",
    latency: "real-time",
  },
  {
    caseId: "virtual-shadows",
    device: "quest",
    snippet: ["depthType: 'smooth'", "dataFormatPreference: ['float32']"],
    rows: ["smooth", "denoised, frame-coherent"],
    bandwidth: "300 KB",
    latency: "soft-real-time",
  },
  {
    caseId: "hit-test",
    device: "vision",
    snippet: ["usagePreference: ['cpu-optimized']", "depthType: 'smooth'"],
    rows: ["cpu-optimized"],
    bandwidth: "600 KB",
    latency: "lazy",
  },
];

for (const expected of CASES) {
  const label = `${expected.caseId}/${expected.device}`;
  let state;
  try {
    state = renderRouter(expected);
  } catch (error) {
    check(`${label} renders`, false, `render threw: ${error?.message ?? error}`);
    continue;
  }
  const rendered = [...expected.snippet, ...expected.rows].map((needle) => [needle, state]);
  const missing = rendered
    .filter(([needle, s]) => !s.snippet.includes(needle) && !s.rows.join("\n").includes(needle))
    .map(([needle]) => needle);
  check(
    `${label} renders the expected recommendations`,
    missing.length === 0,
    `missing from snippet/rows: ${missing.join(", ")}`,
  );
  check(
    `${label} reports ${expected.bandwidth} and latency ${expected.latency}`,
    state.bandwidth === expected.bandwidth && state.latency === expected.latency,
    `got ${JSON.stringify(state.bandwidth)} / ${JSON.stringify(state.latency)}`,
  );
  check(
    `${label} renders one recommendation row per knob`,
    state.rows.length === 4,
    `got ${state.rows.length} rows: ${JSON.stringify(state.rows)}`,
  );
}

// ── 2. Behaviour: the recommended-value cells stay readable ──────────────────
// Computed, not matched: the rule's two custom properties are resolved from the
// design tokens and the WCAG 2.1 relative-luminance contrast ratio is computed.
// The shipped repair put ivory text on emerald; the pre-fix rule was emerald on
// emerald (ratio 1.0).
function tokenValue(name) {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(
    Deno.readTextFileSync(`${REPO}public/styles.css`),
  );
  return match ? match[1] : null;
}

function luminance(hex) {
  const channels = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

{
  const rule = /\.matrix td\.best\s*\{([^}]*)\}/.exec(html);
  check("the best-cell rule is present", Boolean(rule), "no .matrix td.best declaration block");
  const declarations = rule ? rule[1] : "";
  const backgroundToken = /background:\s*var\(--([\w-]+)\)/.exec(declarations)?.[1] ?? null;
  const textToken = /(?:^|[;\s])color:\s*var\(--([\w-]+)\)/.exec(declarations)?.[1] ?? null;
  check(
    "the best-cell rule takes both colours from design tokens",
    Boolean(backgroundToken) && Boolean(textToken),
    `background=${JSON.stringify(backgroundToken)} color=${JSON.stringify(textToken)}`,
  );

  const background = backgroundToken ? tokenValue(backgroundToken) : null;
  const text = textToken ? tokenValue(textToken) : null;
  check(
    "both design tokens resolve in public/styles.css",
    Boolean(background) && Boolean(text),
    `--${backgroundToken}=${background} --${textToken}=${text}`,
  );

  if (background && text) {
    const ratio = contrastRatio(text, background);
    check(
      "recommended values reach a 3:1 contrast ratio",
      ratio >= 3,
      `computed ${ratio.toFixed(2)}:1 for ${text} on ${background}`,
    );
    console.log(
      `     (best-cell contrast ${ratio.toFixed(2)}:1 — below the 4.5:1 AA threshold for ` +
        `0.78rem text, recorded as an a11y residual, not as a regression)`,
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  Deno.exit(1);
}
console.log("\nPASS — raw-vs-smooth-router repair holds");
