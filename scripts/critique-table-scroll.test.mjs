// Structural guard for the /critiques table's horizontal-scroll region.
//
// The bug: at 390px the four-column summary table (min content ~733px) had no
// scroll wrapper, so the DOCUMENT overflowed - scrollWidth 757 against a
// clientWidth of 390 - and there was no way to reach the cut-off columns.
//
// What this file checks: the emitted markup and the inline CSS of the rendered
// page - that the table sits inside a .table-scroll region which can scroll
// horizontally, that the region is reachable by keyboard (tabindex, role,
// aria-label), and that the page-level rule stops the document itself from
// overflowing. It does NOT measure the rendered geometry: the browser evidence
// for that is the chrome-devtools-mcp run recorded on the bead.
import { renderCritiquesIndex } from "../routes/critique-renderers.ts";

const html = await renderCritiquesIndex();
let passed = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) passed++;
  else failures.push(`${name}: ${detail}`);
}

// The page must have rendered real critique rows, or the assertions below would
// pass vacuously against the empty-state fallback.
check(
  "renders real rows, not the empty state",
  html.includes("<tbody>") && !html.includes("No critiques yet"),
  "the index rendered its empty fallback, so this guard would be vacuous",
);
check(
  "table is present",
  html.includes("<table>") && html.includes("</table>"),
  "no table element in the rendered page",
);

// The wrapper, its attributes, and the fact the table is INSIDE it.
const open = html.indexOf('<div class="table-scroll"');
const tableAt = html.indexOf("<table>");
const close = html.indexOf("</table>");
check(
  "scroll region wraps the table",
  open !== -1 && open < tableAt && tableAt < close,
  "the table is not inside the scroll region",
);
const wrapper = open === -1 ? "" : html.slice(open, html.indexOf(">", open) + 1);
check(
  "region is keyboard reachable",
  wrapper.includes('tabindex="0"'),
  "no tabindex on the scroll region",
);
check(
  "region has a region role",
  wrapper.includes('role="region"'),
  "no role=region on the scroll region",
);
check(
  "region is labelled",
  /aria-label="[^"]+"/.test(wrapper),
  "no non-empty aria-label on the scroll region",
);

// The CSS that makes the region scroll and keeps the document from overflowing.
const style = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
check(
  "scroll region can scroll horizontally",
  /\.table-scroll\s*\{[^}]*overflow-x:\s*auto/s.test(style),
  ".table-scroll lacks overflow-x: auto",
);
check(
  "scroll region is size-contained",
  /\.table-scroll\s*\{[^}]*contain:\s*inline-size/s.test(style),
  ".table-scroll lacks contain: inline-size",
);
check(
  "document overflow is clipped at page level",
  /main\s*\{[^}]*overflow-x:\s*clip/s.test(style),
  "main lacks overflow-x: clip",
);

if (failures.length) {
  console.error(`\nFAIL - ${failures.length} of ${failures.length + passed} checks`);
  for (const f of failures) console.error(`  ${f}`);
  Deno.exit(1);
}
console.log(
  `PASS - critiques index table scroll region (${passed} assertions: table wrapped in a labelled, keyboard-reachable .table-scroll region with overflow-x auto, contain inline-size, and page-level overflow-x clip; real rows rendered). Rendered geometry is asserted by the browser run on the bead, not here.`,
);
