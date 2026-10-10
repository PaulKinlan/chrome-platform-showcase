// STATIC keyboard-accessibility checks for the v150 focus/roles fixes
// (bead chrome_platform_showcase-dm5).
//
// These assertions encode the accessibility contract the demos must meet:
//   - a global :focus-visible ring in the shared design system;
//   - no control removes the focus outline without a visible replacement;
//   - click-driven card controls are reachable and operable by keyboard
//     (role + tabindex + Enter/Space handlers + exposed state);
//   - visually-hidden radio inputs reveal focus through :focus-within;
//   - inert preview swatches are not in the tab order.
//
// WHAT THIS SUITE IS, after bead kz8: a STATIC guard. Every assertion reads CSS
// or HTML text, because the task runs with --allow-read only and Deno has no DOM
// and no cascade engine. It therefore cannot see a later or higher-specificity
// rule that wins the cascade, a rule reachable only through @media/@supports
// (see the note on ruleBlock below), whether an element is ever rendered, or
// whether a shadow root is reachable from the document-level ring. Those are
// real properties of the contract, so the static half is not the whole claim.
//
// WHERE THE BEHAVIOUR LIVES: scripts/server-hardening.test.mjs (task
// test-hardening, already permitted to launch Chrome) measures the rendered
// article — computed outline on a really focused control, and the roving
// keydown contract on the use-case-sampler cards — and loud-skips when no Chrome
// binary is present. The role/tabindex half below is also covered in the gate by
// `python3 .claude/audit-demos.py --strict`. What is unique to this file is the
// shared design-system ring and the per-page "did you delete the outline"
// inventory, which stay as static guards on purpose: they are cheap, they name
// the page, and the browser run is the expensive backstop.
//
// Migrated in place to ONE synchronous native Deno.test case (Stage 21 of the dty
// proposal, bead chrome_platform_showcase-dty.28), under the dty.19 policy for
// this class of suite: the non-throwing `check(label, ok, detail)` helper, the
// `failures` counter, all thirty-two bodies in their original order and the
// legacy failure and success wording all survive, so a run still reports EVERY
// failing subject rather than the first, and no check became a throwing assert.
// What moved is when the body runs: the shared `public/styles.css` read that
// used to happen before the first check, and the demo-page reads that follow
// it, now happen inside the case in the same order — ten read sites yielding
// twelve runtime reads over eleven distinct pages (two sites are the loop
// bodies below, each walking two pages, and responsive-tags appears in both
// loops) — so a read failure fails the case loudly instead of aborting the
// module before any check could report. Two of the thirty-two sites are template labels inside two loops that
// each walk two page/selector pairs, so a full run prints thirty-four labels.
// The trailing `Deno.exit(1)` became the counter's failure message because
// exiting inside a case kills the test process before Deno can report it.
//
// Run: deno task test-a11y-focus

const REPO = new URL("..", import.meta.url).pathname;

function read(path) {
  return Deno.readTextFileSync(`${REPO}${path}`);
}

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) {
    console.log(`ok — ${label}`);
  } else {
    failures++;
    console.error(`FAIL — ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

// Extract the declaration block of the first rule whose selector contains
// `selectorFragment` (e.g. ".filter-btn" matches ".filter-btn { ... }").
// Limitation: only works for flat CSS — a selector that appears ONLY inside a
// nested block (@media/@supports) is not reachable, and that is deliberate:
// these checks target base rules, and an unseen nested match fails closed.
function ruleBlock(css, selectorFragment) {
  const re = new RegExp(
    `[^{}]*${selectorFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^{}]*\\{([^{}]*)\\}`,
  );
  const m = css.match(re);
  return m ? m[1] : null;
}

// ── 1 · Global :focus-visible ring in the shared design system ───────────────
Deno.test("every keyboard-reachable control keeps a visible focus ring and a sound tab order", () => {
  {
    const css = read("public/styles.css");
    const block = ruleBlock(css, ":focus-visible");
    check(
      "public/styles.css defines a global :focus-visible rule",
      block !== null,
      "no :focus-visible declaration block found in public/styles.css",
    );
    check(
      "global :focus-visible rule draws a visible outline",
      block !== null && /outline\s*:\s*[^;]*solid/.test(block) &&
        !/outline\s*:\s*none/.test(block),
      block === null ? "rule absent" : `declarations: ${block.trim()}`,
    );
  }

  // ── 2 · deprecation-timeline filter buttons keep a visible focus ring ────────
  {
    const html = read(
      "v150/deprecate-and-remove-related-website-sets-rws/deprecation-timeline/index.html",
    );
    const base = ruleBlock(html, ".filter-btn");
    check(
      ".filter-btn base rule exists and does not strip the outline",
      base !== null && !/outline\s*:\s*none/.test(base),
      base === null ? "no .filter-btn base rule" : `declarations: ${base.trim()}`,
    );
  }

  // ── 3 · use-case-sampler cards are keyboard-operable ─────────────────────────
  {
    const html = read(
      "v150/web-speech-api-on-device-recognition-quality/use-case-sampler/index.html",
    );
    const cards = [...html.matchAll(/<div class="uc-card"[^>]*>/g)].map((m) => m[0]);
    check("use-case-sampler renders .uc-card controls", cards.length > 0);
    // The cards are mutually exclusive (selecting one deselects the others),
    // so they are radios inside a radiogroup, not independent toggle buttons.
    check(
      ".uc-card group exposes a labelled radiogroup role",
      /<div class="use-case-grid" role="radiogroup" aria-label="[^"]+">/.test(html),
    );
    check(
      "every .uc-card exposes a radio role",
      cards.length > 0 && cards.every((c) => /role="radio"/.test(c)),
    );
    check(
      "every .uc-card exposes checked state",
      cards.length > 0 && cards.every((c) => /aria-checked="(true|false)"/.test(c)),
    );
    // APG roving tabindex: exactly one radio per group is tabbable (with no
    // initial selection that is the first card); arrows move focus+selection.
    check(
      ".uc-card group uses roving tabindex (exactly one tab stop)",
      cards.length > 0 &&
        cards.filter((c) => /tabindex="0"/.test(c)).length === 1 &&
        cards.every((c) => /tabindex="(0|-1)"/.test(c)),
    );
    check(
      ".uc-card group moves focus and selection with arrow keys",
      /["']Arrow(Right|Down|Left|Up)["']/.test(html),
    );
    check(
      ".uc-card selection roves the tab stop",
      /setAttribute\(["']tabindex["']/.test(html),
    );
    check(
      ".uc-card selection has a keyboard handler",
      /addEventListener\(["']key(down|up)["']/.test(html),
    );
  }

  // ── 4 · quality-latency-tradeoff tier cards are keyboard-operable ────────────
  {
    const html = read(
      "v150/web-speech-api-on-device-recognition-quality/quality-latency-tradeoff/index.html",
    );
    const cards = [...html.matchAll(/<div class="tier-card[^"]*"[^>]*>/g)].map((m) => m[0]);
    check("quality-latency-tradeoff renders .tier-card controls", cards.length > 0);
    check(
      "every .tier-card exposes a radio role",
      cards.length > 0 && cards.every((c) => /role="radio"/.test(c)),
    );
    check(
      "every .tier-card exposes checked state",
      cards.length > 0 && cards.every((c) => /aria-checked="(true|false)"/.test(c)),
    );
    // APG roving tabindex: the checked card is the group's only tab stop.
    check(
      ".tier-card group uses roving tabindex (checked card is the one tab stop)",
      cards.length > 0 &&
        cards.every((c) => /tabindex="(0|-1)"/.test(c)) &&
        cards.filter((c) => /tabindex="0"/.test(c)).length === 1 &&
        cards.every((c) => /aria-checked="true"/.test(c) === /tabindex="0"/.test(c)),
    );
    check(
      "tier-grid moves focus and selection with arrow keys",
      /["']Arrow(Right|Down|Left|Up)["']/.test(html),
    );
    check(
      "tier-grid selection roves the tab stop",
      /setAttribute\(["']tabindex["']/.test(html),
    );
    check(
      "tier-grid has a keyboard handler",
      /getElementById\(["']tier-grid["']\)\s*\.addEventListener\(["']key(down|up)["']/.test(html),
    );

    // The decision-wizard options in the same file are mutually exclusive per
    // question: radios inside labelled radiogroups, keyboard-operable.
    const opts = [...html.matchAll(/<div class="dec-opt[ "][^>]*>/g)].map((m) => m[0]);
    check("decision wizard renders .dec-opt controls", opts.length === 12);
    check(
      "every .dec-opt exposes a radio role and checked state",
      opts.length > 0 &&
        opts.every((o) =>
          /role="radio"/.test(o) && /tabindex="(0|-1)"/.test(o) &&
          /aria-checked="(true|false)"/.test(o)
        ),
    );
    check(
      "each .dec-options group has exactly one tab stop, on its checked option",
      opts.length > 0 &&
        opts.filter((o) => /tabindex="0"/.test(o)).length === 4 &&
        opts.every((o) => /aria-checked="true"/.test(o) === /tabindex="0"/.test(o)),
    );
    check(
      "every .dec-options group is a labelled radiogroup",
      (html.match(/<div class="dec-options"[^>]*role="radiogroup" aria-label="[^"]+"[^>]*>/g) || [])
        .length === 4,
    );
  }

  // ── 5 · quality-level-explorer reveals focus on hidden radios ────────────────
  {
    const html = read(
      "v150/web-speech-api-on-device-recognition-quality/quality-level-explorer/index.html",
    );
    const block = ruleBlock(html, ".quality-card:focus-within");
    check(
      ".quality-card:focus-within rule exists for the visually-hidden radios",
      block !== null,
      "no .quality-card:focus-within rule found in the demo",
    );
    check(
      ".quality-card:focus-within draws a visible indicator",
      block !== null && /outline|box-shadow|border/.test(block),
      block === null ? "rule absent" : `declarations: ${block.trim()}`,
    );
  }

  // ── 6 · voice-memo-editor language select keeps a visible focus ring ─────────
  {
    const html = read("v150/on-device-web-speech-api/voice-memo-editor/index.html");
    const base = ruleBlock(html, ".lang-select-wrap select");
    check(
      "language select does not strip the outline without a replacement",
      base === null || !/outline\s*:\s*none/.test(base) ||
        ruleBlock(html, ".lang-select-wrap select:focus-visible") !== null,
      base === null
        ? "no .lang-select-wrap select base rule"
        : `declarations: ${base.trim()} (no :focus-visible replacement)`,
    );
  }

  // ── 7 · design-system-builder inert previews leave the tab order ─────────────
  {
    const html = read(
      "v150/relative-alpha-colors-css-color-5-alpha-function/design-system-builder/index.html",
    );
    const previews = [...html.matchAll(/<button class="demo-btn"[^>]*>/g)].map((m) => m[0]);
    check("design-system-builder renders .demo-btn previews", previews.length > 0);
    check(
      "inert .demo-btn previews are not in the tab order",
      previews.length > 0 && previews.every((b) => /tabindex="-1"/.test(b)),
    );
  }

  // ── 8 · focusgroup toolbar buttons use :focus-visible ────────────────────────
  {
    const html = read("v150/focusgroup/toolbar-demo/index.html");
    check(
      ".toolbar-btn shows its ring on :focus-visible (not plain :focus)",
      ruleBlock(html, ".toolbar-btn:focus-visible") !== null,
      "no .toolbar-btn:focus-visible rule in v150/focusgroup/toolbar-demo/index.html",
    );
  }

  // ── 9 · no input strips the focus outline without a visible replacement ─────
  // (bead chrome_platform_showcase-0f2). These base rules used to carry
  // `outline: none`, which ties the global `:focus-visible` ring on specificity
  // and wins by source order — keyboard focus computed to outline-style: none.
  for (
    const [page, selector] of [
      [
        "v150/expose-the-autocorrect-global-html-attribute/inheritance-tester/index.html",
        ".node-input",
      ],
      [
        "v150/css-fit-content-function-for-sizing-properties/responsive-tags/index.html",
        ".ctrl-input",
      ],
    ]
  ) {
    const html = read(page);
    const base = ruleBlock(html, selector);
    check(
      `${page} ${selector} does not strip the outline without a replacement`,
      base === null || !/outline\s*:\s*none/.test(base) ||
        ruleBlock(html, `${selector}:focus-visible`) !== null,
    );
  }

  // ── 10 · the remaining outline:none class (bead chrome_platform_showcase-qpo) ──
  // Mechanism differs per file even though the fix (delete outline:none) is
  // identical — recorded accurately so a future missing-ring regression is
  // diagnosed against the right model (corrected under
  // chrome_platform_showcase-9ie):
  //   - responsive-tags .tag-editor-input: base rule at (0,1,0) TIES the
  //     global :focus-visible ring and wins by SOURCE ORDER (styles.css is
  //     linked before the inline <style>).
  //   - min-max-compare .ctrl input[type="text"]: (0,2,1) — BEATS the global
  //     ring outright, no tie involved.
  //   - shadow-dom-scope .demo-input:focus: (0,2,0) also beats the global ring
  //     outright; the outline:none was on the :focus rule itself.
  //   - shadow-dom-scope .shadow-input: unreachable by the document-level
  //     global rule (shadow root), so it carries its own visible focus
  //     outline.
  for (
    const [page, selector] of [
      [
        "v150/css-fit-content-function-for-sizing-properties/responsive-tags/index.html",
        ".tag-editor-input",
      ],
      [
        "v150/css-fit-content-function-for-sizing-properties/min-max-compare/index.html",
        '.ctrl input[type="text"]',
      ],
      // js-api-inspector's .elem-input outline:none is deliberately absent:
      // it is DEAD CSS (the class is defined but never applied to any
      // element — verified by grep and by a browser probe finding no match in
      // the live DOM), so it has no a11y impact and is a recorded negative,
      // not a pinned rule.
    ]
  ) {
    const html = read(page);
    const base = ruleBlock(html, selector);
    check(
      `${page} ${selector} does not strip the outline without a replacement`,
      base === null || !/outline\s*:\s*none/.test(base) ||
        ruleBlock(html, `${selector}:focus-visible`) !== null,
    );
  }
  {
    const html = read(
      "v150/expose-the-autocorrect-global-html-attribute/shadow-dom-scope/index.html",
    );
    const lightFocus = ruleBlock(html, ".demo-input:focus");
    check(
      "shadow-dom-scope .demo-input:focus does not cancel the global ring",
      lightFocus !== null && !/outline\s*:\s*none/.test(lightFocus),
      lightFocus === null ? "no .demo-input:focus rule" : `declarations: ${lightFocus.trim()}`,
    );
    // The in-shadow control is unreachable by the document-level global rule,
    // so its focus style must carry a visible outline of its own.
    const shadowFocus = ruleBlock(html, ".shadow-input:focus");
    check(
      "shadow-dom-scope .shadow-input:focus has its own visible outline (shadow root)",
      shadowFocus !== null && /outline\s*:\s*\d+px\s+solid/.test(shadowFocus),
      shadowFocus === null ? "no .shadow-input:focus rule" : `declarations: ${shadowFocus.trim()}`,
    );
  }

  // The legacy tail exited the process on a non-zero counter. `Deno.exit(1)` cannot
  // live inside a case - it kills the test process before Deno can report the case -
  // so the counter is carried into the failure message instead: every failing label
  // above has already printed, and this makes the case fail loudly with the same
  // wording the guard used before the migration.
  if (failures > 0) throw new Error(`${failures} a11y focus check(s) failed`);
  console.log("\nAll a11y focus checks passed");
});
