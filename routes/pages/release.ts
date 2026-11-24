import { renderBreadcrumbs } from "../../lib/breadcrumbs.ts";
import { getMilestoneFeatures } from "../../lib/chromestatus.ts";
import type { Channels, MilestoneFeatures } from "../../lib/chromestatus.ts";
import { escapeHTML } from "../html.ts";
import { getDemoIndexData, renderDemoCard, resolveDemo } from "./demo-index.ts";
import { BYLINE_FOOTER, categoryTag, statusBadgeFor } from "./layout.ts";

export async function renderReleasePage(
  release: string,
  milestone: number,
  channels: Channels,
  origin: string,
): Promise<string> {
  let features: MilestoneFeatures;
  try {
    features = await getMilestoneFeatures(milestone);
  } catch (err) {
    return `<!doctype html><html><body><main><h1>Chrome ${milestone}</h1><p>Could not load features: ${
      escapeHTML(String(err))
    }</p></main></body></html>`;
  }

  const { probes } = await getDemoIndexData();
  const status = statusBadgeFor(channels, milestone);
  const breadcrumbs = renderBreadcrumbs([
    { name: "Chrome platform showcase", path: "/" },
    { name: `Chrome ${milestone}`, path: `/${release}/` },
  ], origin);
  const sections = await Promise.all(features.groups.map(async (group) => {
    const cards = await Promise.all(group.features.map(async (f) => {
      const demo = await resolveDemo(release, f);
      return renderDemoCard(f, demo, probes[String(f.id)], group);
    }));
    return `<section data-release-group>
      <h3 class="group-title">${
      escapeHTML(categoryTag(group.category))
    } <span class="group-count">(${group.features.length})</span></h3>
      <ol class="demo-list">${cards.join("")}</ol>
    </section>`;
  }));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>chrome ${milestone} demos — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  ${breadcrumbs.canonical}
  ${breadcrumbs.structuredData}
  <style>
    .release-toolbar {
      display: flex;
      gap: var(--space-3);
      align-items: center;
      flex-wrap: wrap;
      margin: var(--space-3) 0 var(--space-4);
      padding: var(--space-3);
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
    }
    .release-toolbar label {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }
    .release-toolbar select {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      padding: 0.4rem 0.6rem;
      background: var(--bg-paper);
      color: var(--text-black);
      border: 2px solid var(--border-black);
    }
    .release-toolbar .compat-summary {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .tag-compat-yes {
      background: color-mix(in srgb, var(--accent-emerald) 15%, var(--bg-paper));
      color: var(--accent-emerald);
      border-color: var(--accent-emerald);
    }
    .tag-compat-no {
      background: color-mix(in srgb, var(--accent-amber) 16%, var(--bg-paper));
      color: var(--text-black);
      border-color: var(--accent-amber);
    }
    .demo-card[hidden] { display: none; }
  </style>
</head>
<body>
<main>
  ${breadcrumbs.navigation}

  <header class="lede-block">
    <p class="eyebrow">chrome ${milestone} · ${escapeHTML(status.toLowerCase())}</p>
    <h1>chrome ${milestone} platform demos</h1>
    <p class="lede">${features.total} features tracked for Chrome ${milestone}. Click a feature's title to open its demo; each card also links to its ChromeStatus entry.</p>
  </header>

  <section>
    <p>Per-feature demos below are built automatically, one feature per commit, and every distinct use case should become an interactive concept page.</p>
    <div class="release-toolbar">
      <label for="release-compat">Browser support:</label>
      <select id="release-compat" aria-label="Filter features by live support in your browser">
        <option value="">All features (${features.total})</option>
        <option value="yes">Supported in my browser</option>
        <option value="no">Flag / Canary / unsupported here</option>
      </select>
      <span id="release-compat-summary" class="compat-summary" role="status" aria-live="polite">Probing browser capabilities…</span>
    </div>
  </section>

  <section>
    <h2>features (${features.total})</h2>
    ${sections.join("\n")}
  </section>

  <script type="module">
    import { runConformanceAssertion, withProbeRejectionsCaptured } from '/public/conformance-runner.js';

    const cards = Array.from(document.querySelectorAll('.demo-card'));
    const select = document.getElementById('release-compat');
    const summary = document.getElementById('release-compat-summary');

    function applyCompatFilter() {
      const mode = select.value;
      for (const card of cards) {
        const state = card.dataset.compatState || 'unknown';
        const show = !mode || state === mode;
        card.hidden = !show;
      }
      for (const section of document.querySelectorAll('[data-release-group]')) {
        const visibleInGroup = section.querySelectorAll('.demo-card:not([hidden])').length;
        section.hidden = visibleInGroup === 0;
      }
    }

    select.addEventListener('change', applyCompatFilter);

    await withProbeRejectionsCaptured(async () => {
      let supported = 0;
      let probed = 0;
      for (const card of cards) {
        const kind = card.dataset.probeKind;
        const test = card.dataset.probeTest;
        const expect = card.dataset.probeExpect;
        const badge = card.querySelector('[data-compat-badge]');
        if (!kind || !test || !badge) continue;
        probed++;
        const res = await runConformanceAssertion(kind, test, expect);
        card.dataset.compatState = res.ok ? 'yes' : 'no';
        badge.hidden = false;
        if (res.ok) {
          supported++;
          badge.textContent = 'supported here';
          badge.classList.add('tag-compat-yes');
        } else {
          badge.textContent = 'flag / canary';
          badge.classList.add('tag-compat-no');
        }
      }
      summary.textContent = probed > 0
        ? \`\${supported} / \${probed} probed features active in this browser\`
        : 'Live capability check complete';
      applyCompatFilter();
    });
  </script>

  ${BYLINE_FOOTER}
</main>
</body>
</html>`;
}
