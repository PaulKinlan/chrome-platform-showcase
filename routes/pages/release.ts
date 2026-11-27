import { renderBreadcrumbs } from "../../lib/breadcrumbs.ts";
import { getMilestoneFeatures, slugify } from "../../lib/chromestatus.ts";
import type { Channels, MilestoneFeatures } from "../../lib/chromestatus.ts";
import { escapeHTML } from "../html.ts";
import {
  getDemoIndexData,
  knownReleaseMilestones,
  renderDemoCard,
  resolveDemo,
} from "./demo-index.ts";
import {
  categoryTag,
  channelTone,
  getMilestoneSchedule,
  renderSiteFooter,
  renderSiteHeader,
  stableDateRange,
  statusBadgeFor,
} from "./layout.ts";

export async function renderReleasePage(
  release: string,
  milestone: number,
  channels: Channels,
  origin: string,
): Promise<string> {
  const [featuresResult, indexData, schedule, knownMilestones] = await Promise.all([
    getMilestoneFeatures(milestone).catch((err) => ({ err })),
    getDemoIndexData(),
    getMilestoneSchedule(milestone),
    knownReleaseMilestones(channels),
  ]);

  if ("err" in featuresResult) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Chrome ${milestone} — Chrome Platform Showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body class="shell-page">
  ${renderSiteHeader("releases")}
  <main id="main-content">
    <h1>Chrome ${milestone}</h1>
    <p>Could not load features: ${escapeHTML(String(featuresResult.err))}</p>
    ${renderSiteFooter()}
  </main>
</body>
</html>`;
  }

  const features: MilestoneFeatures = featuresResult;
  const { probes } = indexData;
  const status = statusBadgeFor(channels, milestone);
  const tone = channelTone(status);
  const dateRange = schedule ? stableDateRange(schedule) : "";

  const sortedKnown = [...knownMilestones].sort((a, b) => a - b);
  const idx = sortedKnown.indexOf(milestone);
  const prevMstone = idx > 0 ? sortedKnown[idx - 1] : null;
  const nextMstone = idx !== -1 && idx < sortedKnown.length - 1 ? sortedKnown[idx + 1] : null;

  const pagerLinks = [
    prevMstone !== null
      ? `<a class="release-pager-link" rel="prev" href="/v${prevMstone}/">&larr; Chrome ${prevMstone}</a>`
      : "",
    nextMstone !== null
      ? `<a class="release-pager-link" rel="next" href="/v${nextMstone}/">Chrome ${nextMstone} &rarr;</a>`
      : "",
  ].filter(Boolean).join("");

  const breadcrumbs = renderBreadcrumbs([
    { name: "Chrome platform showcase", path: "/" },
    { name: `Chrome ${milestone}`, path: `/${release}/` },
  ], origin);

  let builtCount = 0;
  const groupJumps: { id: string; label: string; count: number }[] = [];

  const sections = await Promise.all(features.groups.map(async (group) => {
    const label = categoryTag(group.category);
    const groupId = `group-${slugify(label) || "features"}`;
    groupJumps.push({ id: groupId, label, count: group.features.length });

    const cards = await Promise.all(group.features.map(async (f) => {
      const demo = await resolveDemo(release, f);
      if (demo) builtCount++;
      return renderDemoCard(f, demo, probes[String(f.id)], group);
    }));

    return `<section data-release-group>
      <h2 class="group-title" id="${escapeHTML(groupId)}">${
      escapeHTML(label)
    } <span class="group-count">(${group.features.length})</span></h2>
      <ol class="demo-list">${cards.join("")}</ol>
    </section>`;
  }));

  const jumpStrip = groupJumps.length > 1
    ? `<nav class="group-jumps" aria-label="Jump to feature category">${
      groupJumps.map((g) =>
        `<a class="group-jump-link" href="#${escapeHTML(g.id)}">${
          escapeHTML(g.label)
        } <span class="group-jump-count">${g.count}</span></a>`
      ).join("")
    }</nav>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Chrome ${milestone} demos — Chrome Platform Showcase</title>
  <meta name="description" content="${features.total} web platform features tracked for Chrome ${milestone}, with interactive demos and live browser support checks.">
  <link rel="stylesheet" href="/public/styles.css">
  ${breadcrumbs.canonical}
  ${breadcrumbs.structuredData}
  <style>
    .release-toolbar {
      display: flex;
      gap: var(--space-3);
      align-items: center;
      flex-wrap: wrap;
      margin: 0 0 var(--space-5);
      padding: var(--space-3) var(--space-4);
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
    }
    .release-toolbar .toolbar-field {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 0;
    }
    .release-toolbar .toolbar-search {
      flex: 1 1 260px;
    }
    .release-toolbar label {
      font-family: var(--font-mono);
      font-size: 0.74rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .release-toolbar input[type="search"],
    .release-toolbar select {
      font-family: var(--font-mono);
      font-size: 0.84rem;
      min-height: 44px;
      padding: 0.45rem 0.7rem;
      background: var(--bg-ivory);
      color: var(--text-black);
      border: 2px solid var(--border-black);
      min-width: 0;
    }
    .release-toolbar input[type="search"] {
      width: 100%;
    }
    .release-toolbar .compat-summary {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .tag-compat-yes {
      background: color-mix(in srgb, var(--accent-emerald) 15%, var(--bg-paper));
      color: var(--accent-emerald-dark);
      border-color: var(--accent-emerald-dark);
    }
    .tag-compat-no {
      background: color-mix(in srgb, var(--accent-amber) 16%, var(--bg-paper));
      color: var(--text-black);
      border-color: var(--accent-amber);
    }
    .demo-card[hidden] { display: none; }
    .release-empty {
      padding: var(--space-5);
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
      font-family: var(--font-serif);
      color: var(--text-charcoal);
    }
    @media (max-width: 640px) {
      .release-toolbar {
        padding: var(--space-3);
      }
      .release-toolbar .toolbar-field {
        flex: 1 1 100%;
        flex-wrap: wrap;
      }
      .release-toolbar select {
        width: 100%;
      }
      .release-toolbar .compat-summary {
        margin-left: 0;
        width: 100%;
      }
    }
  </style>
</head>
<body class="shell-page">
  ${renderSiteHeader("releases")}
  <main id="main-content">
    <div class="release-nav-bar">
      ${breadcrumbs.navigation}
      ${
    pagerLinks
      ? `<nav class="release-pager" aria-label="Adjacent Chrome milestones">${pagerLinks}</nav>`
      : ""
  }
    </div>

    <header class="lede-block">
      <div class="release-meta-strip">
        <span class="channel-pill channel-pill-${escapeHTML(tone)}">${escapeHTML(status)}</span>
        <span>${features.total} feature${features.total === 1 ? "" : "s"} &middot; ${builtCount} demo${
    builtCount === 1 ? "" : "s"
  } live</span>
        ${dateRange ? `<span>Stable window: ${escapeHTML(dateRange)}</span>` : ""}
      </div>
      <h1>Chrome ${milestone} platform demos</h1>
      <p class="lede">Interactive demos and live capability probes for the ${features.total} web platform features tracked in Chrome ${milestone}. Open any feature title for its demo portfolio, or inspect its upstream ChromeStatus entry.</p>
      ${jumpStrip}
    </header>

    <div class="release-toolbar" role="search" aria-label="Filter Chrome ${milestone} features">
      <div class="toolbar-field toolbar-search">
        <label for="release-search">Filter</label>
        <input id="release-search" type="search" placeholder="Search features…" autocomplete="off">
      </div>
      <div class="toolbar-field">
        <label for="release-compat">Support</label>
        <select id="release-compat" aria-label="Filter features by live support in your browser">
          <option value="">All features (${features.total})</option>
          <option value="yes">Supported in my browser</option>
          <option value="no">Flag / Canary / unsupported here</option>
        </select>
      </div>
      <span id="release-compat-summary" class="compat-summary" role="status" aria-live="polite">Probing browser capabilities…</span>
    </div>

    <div id="release-groups">
      ${sections.join("\n")}
    </div>
    <p id="release-empty" class="release-empty" hidden>No features in Chrome ${milestone} match that filter. Clear the search box or switch browser support back to All.</p>

    <script type="module">
      import { runConformanceAssertion, withProbeRejectionsCaptured } from '/public/conformance-runner.js';

      const cards = Array.from(document.querySelectorAll('.demo-card'));
      const searchInput = document.getElementById('release-search');
      const select = document.getElementById('release-compat');
      const summary = document.getElementById('release-compat-summary');
      const emptyEl = document.getElementById('release-empty');
      let probeSummaryText = 'Probing browser capabilities…';

      function applyFilters() {
        const query = (searchInput.value || '').trim().toLowerCase();
        const mode = select.value;
        let visibleTotal = 0;

        for (const card of cards) {
          const state = card.dataset.compatState || 'unknown';
          const matchesCompat = !mode || state === mode;
          const haystack = card.dataset.search || card.textContent.toLowerCase();
          const matchesQuery = !query || haystack.includes(query);
          const show = matchesCompat && matchesQuery;
          card.hidden = !show;
          if (show) visibleTotal++;
        }

        for (const section of document.querySelectorAll('[data-release-group]')) {
          const visibleInGroup = section.querySelectorAll('.demo-card:not([hidden])').length;
          section.hidden = visibleInGroup === 0;
        }

        emptyEl.hidden = visibleTotal > 0;
        if (query || mode) {
          summary.textContent = \`Showing \${visibleTotal} of \${cards.length} · \${probeSummaryText}\`;
        } else {
          summary.textContent = probeSummaryText;
        }
      }

      searchInput.addEventListener('input', applyFilters);
      select.addEventListener('change', applyFilters);

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
            badge.textContent = '✓ supported here';
            badge.classList.add('tag-compat-yes');
          } else {
            badge.textContent = '✗ not in this browser';
            badge.classList.add('tag-compat-no');
          }
        }
        probeSummaryText = probed
          ? \`\${supported} / \${probed} supported here\`
          : 'No live probes indexed yet';
        applyFilters();
      });
    </script>

    ${renderSiteFooter()}
  </main>
</body>
</html>`;
}
