// Focused checks for the v139 WebXR depth raw-vs-smooth-router repair
// (bead chrome_platform_showcase-w3o).
//
// The demo shipped with HTML entities inside the raw-text <script> element
// (`=&gt;` twice, `&lt;td&gt;` in a template literal) — a SyntaxError that
// killed every control — and its recommended-value cells were emerald text on
// an emerald background. These assertions pin the repair so the file cannot
// silently regress. Run: deno task test-webxr-depth-router

const REPO = new URL("..", import.meta.url).pathname;
const html = Deno.readTextFileSync(
  `${REPO}v139/webxr-depth-sensing-performance-improvements/raw-vs-smooth-router/index.html`,
);

let failures = 0;
function check(label, ok) {
  if (ok) console.log(`ok — ${label}`);
  else {
    failures++;
    console.error(`FAIL — ${label}`);
  }
}

const scriptBodies = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((m) => m[1])
  .join("\n");

check("at least one script block exists", scriptBodies.length > 0);
check(
  "no entity-corrupted arrow (=&gt;) inside executable script",
  !scriptBodies.includes("=&gt;"),
);
check(
  "no entity-escaped tags (&lt;) inside executable script",
  !scriptBodies.includes("&lt;"),
);
check(
  "the best-cell rule does not reuse the same colour for background and text",
  !/\.matrix td\.best\s*\{[^}]*background:\s*var\(--accent-emerald\)[^}]*color:\s*var\(--accent-emerald\)/
    .test(
      html,
    ),
);
check(
  "the best-cell rule sets a contrasting text colour",
  /\.matrix td\.best\s*\{[^}]*color:\s*var\(--bg-ivory\)/.test(html),
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  Deno.exit(1);
}
console.log("\nPASS — raw-vs-smooth-router repair holds");
