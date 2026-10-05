// Static keyboard-accessibility checks for the v150 focus/roles fixes
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
// Run: deno task test-a11y-focus

const REPO = new URL("..", import.meta.url).pathname;

function read(path) {
  return Deno.readTextFileSync(`${REPO}${path}`);
}

let failures = 0;
function check(label, ok) {
  if (ok) {
    console.log(`ok — ${label}`);
  } else {
    failures++;
    console.error(`FAIL — ${label}`);
  }
}

// Extract the declaration block of the first rule whose selector contains
// `selectorFragment` (e.g. ".filter-btn" matches ".filter-btn { ... }").
function ruleBlock(css, selectorFragment) {
  const re = new RegExp(
    `[^{}]*${selectorFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^{}]*\\{([^{}]*)\\}`,
  );
  const m = css.match(re);
  return m ? m[1] : null;
}

// ── 1 · Global :focus-visible ring in the shared design system ───────────────
{
  const css = read("public/styles.css");
  const block = ruleBlock(css, ":focus-visible");
  check(
    "public/styles.css defines a global :focus-visible rule",
    block !== null,
  );
  check(
    "global :focus-visible rule draws a visible outline",
    block !== null && /outline\s*:\s*[^;]*solid/.test(block) &&
      !/outline\s*:\s*none/.test(block),
  );
}

// ── 2 · deprecation-timeline filter buttons keep a visible focus ring ────────
{
  const html = read(
    "v150/deprecate-and-remove-related-website-sets-rws/deprecation-timeline/index.html",
  );
  const base = ruleBlock(html, ".filter-btn");
  check(
    ".filter-btn base rule does not strip the outline without a replacement",
    base === null || !/outline\s*:\s*none/.test(base) ||
      /:focus-visible/.test(html),
  );
}

// ── 3 · use-case-sampler cards are keyboard-operable ─────────────────────────
{
  const html = read(
    "v150/web-speech-api-on-device-recognition-quality/use-case-sampler/index.html",
  );
  const cards = [...html.matchAll(/<div class="uc-card"[^>]*>/g)].map((m) => m[0]);
  check("use-case-sampler renders .uc-card controls", cards.length > 0);
  check(
    "every .uc-card exposes a button role",
    cards.length > 0 && cards.every((c) => /role="button"/.test(c)),
  );
  check(
    "every .uc-card is in the tab order",
    cards.length > 0 && cards.every((c) => /tabindex="0"/.test(c)),
  );
  check(
    "every .uc-card exposes pressed state",
    cards.length > 0 && cards.every((c) => /aria-pressed="(true|false)"/.test(c)),
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
    "every .tier-card is in the tab order",
    cards.length > 0 && cards.every((c) => /tabindex="0"/.test(c)),
  );
  check(
    "every .tier-card exposes checked state",
    cards.length > 0 && cards.every((c) => /aria-checked="(true|false)"/.test(c)),
  );
  check(
    "tier-grid has a keyboard handler",
    /tier-grid[^;]*addEventListener\(["']key(down|up)["']/.test(html.replace(/\n/g, " ")),
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
  );
  check(
    ".quality-card:focus-within draws a visible indicator",
    block !== null && /outline|box-shadow|border/.test(block),
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
  );
}

if (failures > 0) {
  console.error(`\n${failures} a11y focus check(s) failed`);
  Deno.exit(1);
}
console.log("\nAll a11y focus checks passed");
