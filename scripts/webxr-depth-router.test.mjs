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
//
// Migrated in place to ONE synchronous native Deno.test case (Stage 23 of the
// dty proposal, bead chrome_platform_showcase-dty.30), under the dty.19 policy
// for this class of suite: the body, the labels, the `failures` counter and the
// exact order are unchanged, so every failing subject still reports and no check
// became a throwing assert. What moved is when it runs - the demo page read that
// used to happen before the first check, the `scriptBodies` extraction, the fake
// DOM render and the stylesheet token read now all happen inside the case, in
// the same order, and `renderRouter` still installs its fake `document` through
// `Object.getOwnPropertyDescriptor`/`defineProperty` and restores the original
// property (or deletes it) in its own per-call `finally`, with the demo's inline
// script still evaluated by `new Function(scriptBodies)()`. The trailing
// `Deno.exit(1)` became a named throw because exiting inside a case kills the
// test process before Deno can report it; the legacy success line still prints.

const REPO = new URL("..", import.meta.url).pathname;
const PAGE = "v139/webxr-depth-sensing-performance-improvements/raw-vs-smooth-router/index.html";
Deno.test("the raw-vs-smooth router renders the repaired recipe table and readable recommendations", () => {
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
  // failure rather than a silently different demo. Snippet fragments and table
  // cells are asserted SEPARATELY (bead kz8 review, P1): an earlier version of this
  // suite accepted a value appearing in "the snippet or any row", which a renderer
  // emitting only `<td>${why}</td>` per row satisfied while the table columns and
  // the recommended-value cells were gone. Bandwidth is device resolution x bytes
  // per depth format, in KB.
  const CASES = [
    {
      caseId: "ar-occlusion",
      device: "phone",
      snippet: [
        "usagePreference: ['gpu-optimized']",
        "dataFormatPreference: ['luminance-alpha']",
        "depthType: 'raw'",
      ],
      rows: [
        ["usagePreference", "gpu-optimized", "sampled inside the shader"],
        ["dataFormatPreference", "luminance-alpha", "compact byte layout"],
        ["depthType (v139)", "raw", "least latency, noisy edges"],
        ["polling rate", "every-frame", "render-loop synced"],
      ],
      bandwidth: "38 KB",
      latency: "real-time",
    },
    {
      caseId: "virtual-shadows",
      device: "quest",
      snippet: [
        "usagePreference: ['gpu-optimized']",
        "dataFormatPreference: ['float32']",
        "depthType: 'smooth'",
      ],
      rows: [
        ["usagePreference", "gpu-optimized", "sampled inside the shader"],
        ["dataFormatPreference", "float32", "precise distance maths"],
        ["depthType (v139)", "smooth", "denoised, frame-coherent"],
        ["polling rate", "every-frame", "render-loop synced"],
      ],
      bandwidth: "300 KB",
      latency: "soft-real-time",
    },
    {
      caseId: "hit-test",
      device: "vision",
      snippet: [
        "usagePreference: ['cpu-optimized']",
        "dataFormatPreference: ['luminance-alpha']",
        "depthType: 'smooth'",
      ],
      rows: [
        ["usagePreference", "cpu-optimized", "cpu reads pixels"],
        ["dataFormatPreference", "luminance-alpha", "compact byte layout"],
        ["depthType (v139)", "smooth", "denoised, frame-coherent"],
        ["polling rate", "on-input", "event-driven"],
      ],
      bandwidth: "600 KB",
      latency: "lazy",
    },
  ];

  function cellsOf(row) {
    return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
      .map((m) => m[1].replace(/<[^>]*>/g, "").trim());
  }

  // Attributes matter as much as text here: the demo's whole point is WHICH cell is
  // marked as the recommendation, and cellsOf() strips tags, so a highlight that
  // moved to the rationale cell (or vanished) would pass a text-only comparison.
  // Bead chrome_platform_showcase-q3p.
  function cellsWithAttrs(row) {
    return [...row.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)]
      .map((m) => ({ attrs: m[1], text: m[2].replace(/<[^>]*>/g, "").trim() }));
  }

  for (const expected of CASES) {
    const label = `${expected.caseId}/${expected.device}`;
    let state;
    try {
      state = renderRouter(expected);
    } catch (error) {
      check(`${label} renders`, false, `render threw: ${error?.message ?? error}`);
      continue;
    }

    const missingFromSnippet = expected.snippet.filter((needle) => !state.snippet.includes(needle));
    check(
      `${label} writes the expected request snippet`,
      missingFromSnippet.length === 0,
      `missing from the snippet: ${missingFromSnippet.join(", ")}`,
    );

    check(
      `${label} renders one recommendation row per knob`,
      state.rows.length === expected.rows.length,
      `got ${state.rows.length} rows: ${JSON.stringify(state.rows)}`,
    );

    // Cell structure, then per-cell content. "Somewhere in the rows" is not enough.
    const malformed = state.rows
      .map((row, index) => ({ index, cells: cellsOf(row) }))
      .filter(({ cells }) => cells.length !== 3)
      .map(({ index, cells }) => `row ${index} has ${cells.length} cells`);
    check(`${label} renders three cells per row`, malformed.length === 0, malformed.join("; "));

    const mismatched = expected.rows
      .map((wanted, index) => ({
        index,
        wanted,
        got: state.rows[index] === undefined ? [] : cellsOf(state.rows[index]),
      }))
      .filter(({ wanted, got }) => got.join("\u0000") !== wanted.join("\u0000"))
      .map(({ index, wanted, got }) =>
        `row ${index}: wanted ${JSON.stringify(wanted)} got ${JSON.stringify(got)}`
      );
    check(
      `${label} renders the expected (knob, value, rationale) cells in order`,
      mismatched.length === 0,
      mismatched.join("; "),
    );

    // The recommended value is the cell the page paints with the emerald "best"
    // style. Assert the highlight is on the VALUE cell and nowhere else, so a
    // renderer that puts it on the rationale (or drops it) fails even though the
    // text is unchanged.
    const wrongHighlights = state.rows
      .map((row, index) => ({
        index,
        best: cellsWithAttrs(row).map((cell) => /\bclass="[^"]*\bbest\b/.test(cell.attrs)),
      }))
      .filter(({ best }) => best.join(",") !== "false,true,false")
      .map(({ index, best }) => `row ${index} best-flags ${JSON.stringify(best)}`);
    check(
      `${label} marks only the recommended value cell as best`,
      wrongHighlights.length === 0,
      wrongHighlights.join("; "),
    );

    check(
      `${label} reports ${expected.bandwidth} and latency ${expected.latency}`,
      state.bandwidth === expected.bandwidth && state.latency === expected.latency,
      `got ${JSON.stringify(state.bandwidth)} / ${JSON.stringify(state.latency)}`,
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
        "recommended values reach a 4.5:1 WCAG AA contrast ratio",
        ratio >= 4.5,
        `computed ${ratio.toFixed(2)}:1 for ${text} on ${background}`,
      );
      console.log(
        `     (best-cell contrast ${
          ratio.toFixed(2)
        }:1 satisfies the 4.5:1 WCAG AA threshold for ` +
          `0.78rem text)`,
      );
    }
  }

  // The legacy tail exited the process on a non-zero counter. `Deno.exit(1)` cannot
  // live inside a case - it kills the test process before Deno can report the case -
  // so the counter is carried into the named failure instead, and the legacy success
  // line below still prints on a clean run.
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    throw new Error(`${failures} check(s) failed`);
  }
  console.log("\nPASS — raw-vs-smooth-router repair holds");
});
