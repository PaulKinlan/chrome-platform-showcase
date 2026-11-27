import { getMilestoneFeatures } from "../../lib/chromestatus.ts";
import type { Channels } from "../../lib/chromestatus.ts";
import { escapeHTML } from "../html.ts";
import {
  getDemoIndexData,
  knownReleaseMilestones,
  renderProbeAttrs,
  resolveDemo,
} from "./demo-index.ts";
import type { DemoProbe } from "./demo-index.ts";
import { BYLINE_FOOTER, categoryTag, renderSiteHeader } from "./layout.ts";

// ----- /features (flat, filterable catalogue) -----

export interface FeatureCatalogueRow {
  canonicalMstone: number;
  milestones: number[];
  id: number;
  name: string;
  summary: string;
  category: string;
  href: string;
  probe?: DemoProbe;
}

/**
 * Renders the rows of the /features catalogue table. The ChromeStatus-derived
 * fields (id, name, summary, category) arrive from the upstream API, while the
 * demo href and the probe attributes come from locally resolved demo data. All
 * of them are escaped for the context they land in - including the
 * ChromeStatus link, which is built from an upstream-supplied feature id.
 * The id's shape is deliberately not validated: an unexpected value may
 * produce an unintended ChromeStatus path, query or fragment, but it cannot
 * escape the quoted attribute or change its fixed origin, because the escaped
 * value cannot leave the href attribute.
 */
export function renderFeatureCatalogueRows(rows: FeatureCatalogueRow[]): string {
  return rows.map((r) => {
    const cat = categoryTag(r.category);
    const otherMstones = r.milestones
      .filter((m) => m !== r.canonicalMstone)
      .sort((a, b) => b - a);
    const lineageBadge = otherMstones.length > 0
      ? ` <span class="tag" title="Also listed in Chrome ${otherMstones.join(", ")}">+${
        otherMstones.map((m) => `v${m}`).join(", ")
      }</span>`
      : "";
    const mstoneTokens = r.milestones.map((m) => `v${m}`).join(" ");
    const search = `${r.name} ${r.summary} ${cat} ${mstoneTokens}`.toLowerCase();
    const probeAttrs = renderProbeAttrs(r.probe);
    return `<tr data-search="${
      escapeHTML(search)
    }" data-mstone="${r.canonicalMstone}" data-mstones="${r.milestones.join(",")}" data-status="${
      escapeHTML(cat)
    }" data-built="true"${probeAttrs}>
      <td><a href="${escapeHTML(r.href)}">${escapeHTML(r.name)}</a></td>
      <td><span class="release-status">v${r.canonicalMstone}</span>${lineageBadge}</td>
      <td><span class="tag">${escapeHTML(cat)}</span> ${
      r.probe ? `<span class="tag tag-compat" data-compat-badge hidden>…</span>` : ""
    }</td>
      <td>
        <a class="tag tag-chromestatus" href="${
      escapeHTML(`https://chromestatus.com/feature/${r.id}`)
    }" target="_blank" rel="noopener">ChromeStatus &nearr;</a>
        <a class="tag tag-live" href="${escapeHTML(r.href)}">demo &rarr;</a>
      </td>
    </tr>`;
  }).join("");
}

export async function renderFeaturesCatalogue(channels: Channels): Promise<string> {
  const known = [...await knownReleaseMilestones(channels)].sort((a, b) => b - a);
  const { probes } = await getDemoIndexData();

  type Row = FeatureCatalogueRow;

  // Fetch all milestones concurrently rather than blocking on a 28-request
  // serial waterfall.
  const milestoneResults = await Promise.all(
    known.map(async (m) => {
      try {
        return { mstone: m, feats: await getMilestoneFeatures(m) };
      } catch {
        return null;
      }
    }),
  );

  // Deduplicate by ChromeStatus feature ID (`f.id`), honoring the
  // "One demo folder per feature" rule while recording every milestone the
  // feature appears in so filtering by milestone works across re-listings.
  const byId = new Map<number, Row>();
  for (const item of milestoneResults) {
    if (!item) continue;
    const { mstone: m, feats } = item;
    for (const g of feats.groups) {
      for (const f of g.features) {
        const demo = await resolveDemo(`v${m}`, f);
        if (!demo) continue;
        const canonicalMstone = Number(demo.release.replace(/^v/, "")) || m;
        const existing = byId.get(f.id);
        if (existing) {
          if (!existing.milestones.includes(m)) existing.milestones.push(m);
          if (demo.sameRelease) {
            existing.canonicalMstone = canonicalMstone;
            existing.href = demo.href;
            existing.category = g.category;
          }
          continue;
        }
        const milestones = [canonicalMstone];
        if (!milestones.includes(m)) milestones.push(m);
        byId.set(f.id, {
          canonicalMstone,
          milestones,
          id: f.id,
          name: f.name,
          summary: f.summary ?? "",
          category: g.category,
          href: demo.href,
          probe: probes[String(f.id)],
        });
      }
    }
  }

  const rows = [...byId.values()].sort(
    (a, b) => b.canonicalMstone - a.canonicalMstone || a.name.localeCompare(b.name),
  );

  const tableRows = renderFeatureCatalogueRows(rows);

  const mstoneOptions = known.map((m) =>
    `<option value="${escapeHTML(String(m))}">v${escapeHTML(String(m))}</option>`
  ).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>all features — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    .filters {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin: 0 0 1.25rem;
      padding: 0.9rem 1rem;
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
    }
    .filters input, .filters select {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      min-height: 44px;
      padding: 0.45rem 0.65rem;
      background: var(--bg-ivory);
      color: var(--text-black);
      border: 2px solid var(--border-black);
      outline: none;
    }
    .filters input:focus, .filters select:focus { box-shadow: var(--thin-shadow); background: var(--bg-paper); }
    .filters input[type=search] { flex: 1; min-width: 180px; }
    .features-table { width: 100%; border-collapse: collapse; font-size: 0.92rem; background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); }
    .features-table th, .features-table td { padding: 0.7rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border-hairline); vertical-align: middle; }
    .features-table tbody tr:hover { background: var(--surface-warm); }
    .features-table th {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-black);
      background: var(--surface-warm);
      border-bottom: 2px solid var(--border-black);
    }
    /* Defer off-screen rendering for rows below the fold (modern-web-guidance: defer-rendering-heavy-content) */
    .features-table tbody tr:nth-child(n+25) {
      content-visibility: auto;
      contain-intrinsic-size: auto none auto 52px;
    }
    .features-table tr.hidden { display: none; }
    .features-table td a { color: var(--text-black); text-decoration: underline; text-decoration-color: var(--border-subtle); text-underline-offset: 3px; }
    .features-table td a:hover { color: var(--accent-blue); text-decoration-color: var(--accent-blue); }
    .features-table td .tag, .features-table td .release-status { font-family: var(--font-mono); white-space: nowrap; }
    .features-table td .tag {
      display: inline-block;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 0.16rem 0.5rem;
      border: 1px solid var(--border-black);
      background: var(--bg-paper);
      color: var(--text-black);
      margin: 0.12rem 0.25rem 0.12rem 0;
    }
    .features-table td .tag-live {
      background: var(--text-black);
      color: var(--bg-ivory);
      border-color: var(--text-black);
      text-decoration: none;
    }
    .features-table td .tag-live:hover {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
      color: var(--bg-paper);
    }
    .features-table td .release-status { background: var(--text-black); color: var(--bg-ivory); padding: 0.18rem 0.55rem; font-size: 0.74rem; }
    .features-table td .tag-compat-yes {
      background: color-mix(in srgb, var(--accent-emerald) 15%, var(--bg-paper));
      color: var(--accent-emerald-dark);
      border-color: var(--accent-emerald-dark);
    }
    .features-table td .tag-compat-no {
      background: color-mix(in srgb, var(--accent-amber) 16%, var(--bg-paper));
      color: var(--text-black);
      border-color: var(--accent-amber);
    }
    .stats { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem; display: flex; justify-content: space-between; gap: var(--space-3); flex-wrap: wrap; }

    @media (max-width: 640px) {
      .features-table { background: transparent; border: none; box-shadow: none; }
      .features-table thead { display: none; }
      .features-table, .features-table tbody, .features-table tr, .features-table td {
        display: block;
        width: 100%;
      }
      .features-table tr {
        border: 2px solid var(--border-black);
        background: var(--bg-paper);
        margin-bottom: var(--space-3);
        padding: var(--space-3);
        box-shadow: var(--thin-shadow);
      }
      .features-table tbody tr:hover { background: var(--bg-paper); }
      .features-table td {
        border: none;
        padding: 0.25rem 0;
      }
      .features-table td:first-child { font-weight: 600; padding-bottom: var(--space-2); }
      .features-table td:not(:first-child) {
        display: inline-block;
        margin-right: var(--space-2);
      }
      .filters { padding: var(--space-3); gap: var(--space-2); }
      .filters input, .filters select { flex: 1 1 100%; min-width: 0; }
    }
  </style>
</head>
<body class="shell-page">
${renderSiteHeader("features")}
<main id="main-content">
  <header class="lede-block">
    <p class="eyebrow">catalogue</p>
    <h1>All features</h1>
    <p class="lede">Every feature with a demo available, deduplicated to its canonical demo across every milestone. Filter by name, milestone, status, or whether the feature works live in your current browser.</p>
  </header>

  <div class="filters" role="search" aria-label="Filter features catalogue">
    <input type="search" id="q" aria-label="Search by name, summary, or category" placeholder="search by name, summary, category">
    <select id="mstone" aria-label="Filter by Chrome milestone">
      <option value="">all milestones</option>
      ${mstoneOptions}
    </select>
    <select id="status" aria-label="Filter by shipping status">
      <option value="">any status</option>
      <option value="Shipped">Shipped</option>
      <option value="Origin Trial">Origin Trial</option>
      <option value="Dev Trial">Dev Trial</option>
      <option value="Stepped rollout">Stepped rollout</option>
    </select>
    <select id="compat" aria-label="Filter by live support in your browser">
      <option value="">any browser support</option>
      <option value="yes">supported in my browser</option>
      <option value="no">flag / canary required</option>
    </select>
  </div>

  <p class="stats" role="status" aria-live="polite">
    <span><span id="visible">${rows.length}</span> / ${rows.length} unique feature demos</span>
    <span id="compat-stats">probing browser support…</span>
  </p>

  <table class="features-table">
    <thead>
      <tr><th>feature</th><th>milestone</th><th>status &amp; support</th><th>demo</th></tr>
    </thead>
    <tbody id="rows">${tableRows}</tbody>
  </table>

  <script type="module">
    import { runConformanceAssertion, withProbeRejectionsCaptured } from '/public/conformance-runner.js';

    const q = document.getElementById('q');
    const mstone = document.getElementById('mstone');
    const status = document.getElementById('status');
    const compat = document.getElementById('compat');
    const rows = Array.from(document.querySelectorAll('#rows tr'));
    const visible = document.getElementById('visible');
    const compatStats = document.getElementById('compat-stats');

    function applyFilter() {
      const qv = q.value.toLowerCase().trim();
      const mv = mstone.value;
      const sv = status.value;
      const cv = compat.value;
      let count = 0;
      for (const row of rows) {
        const search = row.dataset.search;
        const mstones = (row.dataset.mstones || row.dataset.mstone || '').split(',');
        const okq = !qv || search.includes(qv);
        const okm = !mv || mstones.includes(mv);
        const oks = !sv || row.dataset.status === sv;
        const okc = !cv || row.dataset.compatState === cv;
        const show = okq && okm && oks && okc;
        row.classList.toggle('hidden', !show);
        if (show) count++;
      }
      visible.textContent = count;
    }

    q.addEventListener('input', applyFilter);
    mstone.addEventListener('change', applyFilter);
    status.addEventListener('change', applyFilter);
    compat.addEventListener('change', applyFilter);

    // Evaluate probes in non-blocking chunks to keep INP low (modern-web-guidance: interactions-in-complex-layouts)
    await withProbeRejectionsCaptured(async () => {
      let supported = 0;
      let probed = 0;
      const CHUNK = 40;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        for (const row of slice) {
          const kind = row.dataset.probeKind;
          const test = row.dataset.probeTest;
          const expect = row.dataset.probeExpect;
          const badge = row.querySelector('[data-compat-badge]');
          if (!kind || !test || !badge) continue;
          probed++;
          const res = await runConformanceAssertion(kind, test, expect);
          row.dataset.compatState = res.ok ? 'yes' : 'no';
          badge.hidden = false;
          if (res.ok) {
            supported++;
            badge.textContent = 'supported';
            badge.classList.add('tag-compat-yes');
          } else {
            badge.textContent = 'flag / canary';
            badge.classList.add('tag-compat-no');
          }
        }
        await new Promise((r) => setTimeout(r, 0));
      }
      compatStats.textContent = \`\${supported} / \${probed} probed features active in your browser\`;
      if (compat.value) applyFilter();
    });
  </script>

  ${BYLINE_FOOTER}
</main>
</body>
</html>`;
}
