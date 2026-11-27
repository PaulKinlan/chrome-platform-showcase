import { escapeHTML } from "../html.ts";
import { BYLINE_FOOTER, renderSiteHeader } from "../pages/layout.ts";
import { collectConformanceSuites } from "./loader.ts";

export async function renderConformanceIndex(): Promise<string> {
  const all = await collectConformanceSuites();
  all.sort((a, b) => {
    const am = Number(a.release.slice(1));
    const bm = Number(b.release.slice(1));
    if (am !== bm) return bm - am;
    return a.featureSlug.localeCompare(b.featureSlug);
  });
  const totalAssertions = all.reduce((n, s) => n + s.assertions.length, 0);
  const rows = all.map((s) => {
    const label = s.conceptSlug
      ? `${s.release} · ${s.featureSlug} / ${s.conceptSlug}`
      : `${s.release} · ${s.featureSlug}`;
    const href = s.conceptSlug
      ? `/${s.release}/${s.featureSlug}/${s.conceptSlug}/conformance/`
      : `/${s.release}/${s.featureSlug}/conformance/`;
    return `<tr>
      <td><a href="${escapeHTML(href)}">${escapeHTML(label)}</a></td>
      <td class="num">${s.assertions.length}</td>
      <td>${
      s.assertions.map((a) => `<code class="kind">${escapeHTML(a.kind)}</code>`).join(" ")
    }</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>conformance — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    .table-scroll { width: 100%; min-width: 0; max-width: 100%; overflow-x: auto; contain: inline-size; }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); }
    th, td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border-hairline); text-align: left; vertical-align: top; }
    tbody tr:hover { background: var(--surface-warm); }
    th { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-black); background: var(--surface-warm); border-bottom: 2px solid var(--border-black); }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .kind { font-size: 0.72rem; color: var(--text-charcoal); padding: 0.08rem 0.38rem; border: 1px solid var(--border-black); background: var(--bg-stone); margin-right: 0.2rem; display: inline-block; margin-bottom: 0.2rem; }
  </style>
</head>
<body class="shell-page">
${renderSiteHeader("conformance")}
<main id="main-content">
  <header class="lede-block">
    <p class="eyebrow">conformance</p>
    <h1>Spec-vs-implementation probes</h1>
    <p class="lede">Each suite is a list of assertions drawn from the spec text. Click into one and your browser runs the assertions live — Chrome stable, Chrome canary, Firefox, and Safari each give their own verdict. This is the live "does it actually work the way the spec says" matrix.</p>
    <p class="updated-line">${all.length} suite${
    all.length === 1 ? "" : "s"
  } · ${totalAssertions} total assertion${totalAssertions === 1 ? "" : "s"}</p>
    <div class="home-actions">
      <a class="action-btn action-btn-primary" href="/conformance/run-all/">Run all suites in browser &rarr;</a>
    </div>
  </header>

  <div class="table-scroll" tabindex="0" role="region" aria-label="Conformance suites">
  <table>
    <thead><tr><th>page</th><th>assertions</th><th>kinds</th></tr></thead>
    <tbody>${
    rows ||
    `<tr><td colspan="3">No conformance suites yet. Generate them with the conformance-author subagent.</td></tr>`
  }</tbody>
  </table>
  </div>

  ${BYLINE_FOOTER}
</main>
</body>
</html>`;
}
