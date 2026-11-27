import {
  collectExperiments,
  EXPERIMENT_KINDS,
  type ExperimentKind,
  type ExperimentRecord,
} from "../lib/experiment.ts";
import { escapeHTML, htmlResponse } from "./html.ts";
import { BYLINE_FOOTER, renderSiteHeader } from "./pages/layout.ts";

const KIND_LABELS: Record<ExperimentKind, string> = {
  starter: "Starter",
  experiment: "Experiment",
  stress: "Stress",
  composition: "Composition",
  migration: "Migration",
};

const EMPTY_EXAMPLE = JSON.stringify(
  {
    title: "Anchor positioning inside CSS Grid subgrid",
    blurb: "Tests anchor-name resolution across nested subgrid tracks.",
    kind: "composition",
    question: "Can a popover anchor to a grid item placed inside a subgrid?",
    result:
      "Anchoring succeeds within the same containing block; clipped when overflow: hidden is set on the subgrid wrapper.",
    testedIn: "Chrome 151 Canary",
    api: ["CSS Anchor Positioning", "CSS Subgrid"],
    composesWith: ["popover", "css-grid"],
  },
  null,
  2,
);

function kindBadgeClass(kind: ExperimentKind): string {
  if (kind === "starter") return "kind-badge kind-starter";
  if (kind === "experiment") return "kind-badge kind-experiment";
  if (kind === "stress") return "kind-badge kind-stress";
  if (kind === "composition") return "kind-badge kind-composition";
  return "kind-badge kind-migration";
}

function renderExperimentItem(item: ExperimentRecord): string {
  const { meta } = item;
  const kindLabel = KIND_LABELS[meta.kind] ?? meta.kind;
  const apis = meta.api ?? [];
  const composes = meta.composesWith ?? [];
  const composesLower = composes.map((tag) => tag.toLowerCase());
  const frictionCount = meta.friction?.length ?? 0;

  const searchTokens = [
    meta.title,
    meta.blurb,
    meta.kind,
    kindLabel,
    meta.question ?? "",
    meta.result ?? "",
    meta.testedIn ?? "",
    ...apis,
    ...composes,
    item.release,
    item.featureSlug,
    item.conceptSlug,
  ].join(" ").toLowerCase();

  const testedPill = meta.testedIn
    ? `<span class="meta-pill">${escapeHTML(meta.testedIn)}</span>`
    : "";

  const qrRows: string[] = [];
  if (meta.question) {
    qrRows.push(
      `<div class="qr-row"><dt>Question</dt><dd>${escapeHTML(meta.question)}</dd></div>`,
    );
  }
  if (meta.result) {
    qrRows.push(
      `<div class="qr-row"><dt>Result</dt><dd>${escapeHTML(meta.result)}</dd></div>`,
    );
  }
  const qrBlock = qrRows.length > 0 ? `<dl class="qr-list">${qrRows.join("")}</dl>` : "";

  const apiBlock = apis.length > 0
    ? `<div class="tag-section">
        <span class="tag-label">APIs</span>
        <div class="tag-list">${
      apis.map((name) => `<code class="api-pill">${escapeHTML(name)}</code>`).join("")
    }</div>
      </div>`
    : "";

  const composesBlock = composes.length > 0
    ? `<div class="tag-section">
        <span class="tag-label">Composes with</span>
        <div class="tag-list">${
      composes.map((tag) =>
        `<button type="button" class="compose-tag" data-compose-tag="${
          escapeHTML(tag.toLowerCase())
        }">${escapeHTML(tag)}</button>`
      ).join("")
    }</div>
      </div>`
    : "";

  const frictionLink = frictionCount > 0
    ? `<a class="tag tag-friction" href="/friction/?q=${
      escapeHTML(encodeURIComponent(item.conceptSlug))
    }">Friction (${escapeHTML(String(frictionCount))}) &rarr;</a>`
    : "";

  return `<li class="experiment-card" data-kind="${escapeHTML(meta.kind)}" data-composes="${
    escapeHTML(JSON.stringify(composesLower))
  }" data-search="${escapeHTML(searchTokens)}">
      <div class="card-meta">
        <span class="${kindBadgeClass(meta.kind)}">${escapeHTML(kindLabel)}</span>
        <span class="release-status">${escapeHTML(item.release)}</span>
        ${testedPill}
      </div>
      <h2><a href="${escapeHTML(item.route)}">${escapeHTML(meta.title)}</a></h2>
      <p class="source-path">${escapeHTML(item.release)}/${escapeHTML(item.featureSlug)}/${
    escapeHTML(item.conceptSlug)
  }</p>
      <p class="card-blurb">${escapeHTML(meta.blurb)}</p>
      ${qrBlock}
      ${apiBlock}
      ${composesBlock}
      <div class="card-actions">
        <a class="tag tag-live" href="${escapeHTML(item.route)}">Open experiment &rarr;</a>
        ${frictionLink}
      </div>
    </li>`;
}

/**
 * Pure HTML renderer for `/experiments/`. Uses `/public/styles.css` design
 * tokens exclusively and escapes every dynamic string via `escapeHTML`.
 */
export function renderExperimentsPage(records: ExperimentRecord[]): string {
  const counts = new Map<ExperimentKind, number>();
  for (const kind of EXPERIMENT_KINDS) counts.set(kind, 0);

  const composesMap = new Map<string, string>();
  for (const item of records) {
    counts.set(item.meta.kind, (counts.get(item.meta.kind) ?? 0) + 1);
    for (const tag of item.meta.composesWith ?? []) {
      const key = tag.toLowerCase();
      if (!composesMap.has(key)) composesMap.set(key, tag);
    }
  }

  const composesOptions = [...composesMap.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([key, label]) => `<option value="${escapeHTML(key)}">${escapeHTML(label)}</option>`)
    .join("");

  const kindChips = EXPERIMENT_KINDS.map((kind) => {
    const count = counts.get(kind) ?? 0;
    return `<button type="button" class="filter-chip" data-kind="${
      escapeHTML(kind)
    }" aria-pressed="false">${escapeHTML(KIND_LABELS[kind])} <span class="chip-count">(${
      escapeHTML(String(count))
    })</span></button>`;
  }).join("");

  const listMarkup = records.length > 0
    ? `<ul class="experiment-list" id="exp-list" role="list">${
      records.map(renderExperimentItem).join("")
    }</ul>
    <p id="exp-empty-filter" class="empty-state" hidden>No experiments match the current filters. Try clearing a kind chip, composition filter, or search query.</p>`
    : `<section class="empty-state" aria-labelledby="empty-heading">
      <h2 id="empty-heading">No experiment metadata indexed yet</h2>
      <p>This index reads every concept-level <code>page.json</code> under <code>v&lt;N&gt;/&lt;feature&gt;/&lt;concept&gt;/page.json</code>, surfacing each experiment's kind, question, observed result, APIs, and cross-feature compositions.</p>
      <p>To publish an experiment here, add a <code>page.json</code> file next to its <code>index.html</code>:</p>
      <pre><code>${escapeHTML(EMPTY_EXAMPLE)}</code></pre>
    </section>`;

  const expLabel = records.length === 1 ? "experiment" : "experiments";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>experiments — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    .header-links {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      font-family: var(--font-mono);
      font-size: 0.82rem;
      margin-top: var(--space-3);
    }
    .filters {
      display: grid;
      gap: var(--space-4);
      margin: var(--space-5) 0 var(--space-4);
      padding: var(--space-4);
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
    }
    .filter-controls {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 16rem);
      gap: var(--space-3);
      align-items: end;
    }
    .field {
      display: grid;
      gap: var(--space-2);
      min-width: 0;
    }
    .field label,
    .chip-group legend {
      font-family: var(--font-mono);
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-black);
    }
    .search-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .field input[type="search"],
    .field select {
      width: 100%;
      min-width: 0;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      font-family: var(--font-mono);
      font-size: 0.9rem;
      background: var(--bg-paper);
      color: var(--text-black);
      border: 2px solid var(--border-black);
    }
    .search-row input[type="search"] {
      flex: 1 1 12rem;
    }
    .chip-group {
      border: 0;
      padding: 0;
      margin: 0;
      min-width: 0;
    }
    .chip-group legend {
      margin-bottom: var(--space-2);
    }
    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    button.filter-chip {
      min-height: 44px;
      padding: 0.45rem 0.85rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 600;
      background: var(--bg-paper);
      color: var(--text-black);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
    }
    button.filter-chip:hover {
      background: var(--bg-stone);
      color: var(--text-black);
    }
    button.filter-chip[aria-pressed="true"] {
      background: var(--text-black);
      color: var(--bg-ivory);
    }
    button.filter-chip[aria-pressed="true"]::before {
      content: "✓ ";
    }
    button.reset-btn {
      min-height: 44px;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      background: var(--bg-stone);
      color: var(--text-black);
      box-shadow: var(--thin-shadow);
    }
    button.reset-btn:hover {
      background: var(--text-black);
      color: var(--bg-ivory);
    }
    .chip-count {
      opacity: 0.8;
      font-variant-numeric: tabular-nums;
    }
    .stats {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      color: var(--text-charcoal);
      margin: 0 0 var(--space-4);
    }
    .experiment-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 26rem), 1fr));
      gap: var(--space-5);
    }
    .experiment-card {
      min-width: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--shadow-card);
      padding: var(--space-5);
      overflow-wrap: anywhere;
    }
    .experiment-card[hidden] { display: none; }
    .card-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }
    .kind-badge {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 0.18rem 0.55rem;
      border: 2px solid var(--border-black);
      background: var(--bg-stone);
      color: var(--text-black);
    }
    .kind-starter {
      background: color-mix(in srgb, var(--accent-emerald) 14%, var(--bg-paper));
      color: var(--accent-emerald-dark);
      border-color: var(--accent-emerald-dark);
    }
    .kind-experiment {
      background: color-mix(in srgb, var(--accent-blue) 10%, var(--bg-paper));
      color: var(--accent-blue);
      border-color: var(--accent-blue);
    }
    .kind-stress {
      background: color-mix(in srgb, var(--accent-rose) 12%, var(--bg-paper));
      color: var(--demo-color-881320);
      border-color: var(--accent-rose);
    }
    .kind-composition {
      background: color-mix(in srgb, var(--accent-amber) 18%, var(--bg-paper));
      color: var(--text-black);
      border-color: var(--accent-amber);
    }
    .kind-migration {
      background: var(--bg-stone);
      color: var(--text-black);
      border-color: var(--border-black);
    }
    .meta-pill {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      padding: 0.18rem 0.5rem;
      border: 1px solid var(--border-black);
      background: var(--bg-stone);
      color: var(--text-charcoal);
    }
    .experiment-card h2 {
      font-size: 1.35rem;
      margin: 0 0 var(--space-1);
      padding-bottom: 0;
      border-bottom: none;
    }
    .experiment-card h2 a {
      color: var(--text-black);
    }
    .experiment-card h2 a:hover {
      color: var(--accent-blue);
    }
    .source-path {
      font-family: var(--font-mono);
      font-size: 0.76rem;
      color: var(--text-muted);
      margin: 0 0 var(--space-3);
      overflow-wrap: anywhere;
    }
    .card-blurb {
      font-size: 1rem;
      margin: 0 0 var(--space-3);
      max-width: 72ch;
    }
    .qr-list {
      margin: 0 0 var(--space-3);
      padding: var(--space-3);
      background: var(--bg-stone);
      border: 1px solid var(--border-black);
      display: grid;
      gap: var(--space-2);
    }
    .qr-row dt {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-black);
    }
    .qr-row dd {
      font-family: var(--font-serif);
      font-size: 0.95rem;
      color: var(--text-charcoal);
      margin: var(--space-1) 0 0;
    }
    .tag-section {
      margin: 0 0 var(--space-3);
      display: grid;
      gap: var(--space-1);
    }
    .tag-label {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }
    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }
    .api-pill {
      font-size: 0.78rem;
      background: var(--bg-ivory);
      color: var(--text-black);
    }
    button.compose-tag {
      min-height: 36px;
      padding: 0.25rem 0.65rem;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 600;
      background: var(--bg-paper);
      color: var(--accent-blue);
      border: 1px solid var(--border-black);
      box-shadow: var(--thin-shadow);
    }
    button.compose-tag:hover {
      background: var(--text-black);
      color: var(--bg-ivory);
    }
    .card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-top: auto;
      padding-top: var(--space-2);
    }
    .card-actions .tag {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0.35rem 0.75rem;
      font-family: var(--font-mono);
      font-size: 0.76rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 2px solid var(--border-black);
      text-decoration: none;
    }
    .card-actions .tag-live {
      background: var(--text-black);
      color: var(--bg-ivory);
    }
    .card-actions .tag-live:hover {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
      color: var(--bg-ivory);
    }
    .card-actions .tag-friction {
      background: color-mix(in srgb, var(--accent-rose) 10%, var(--bg-paper));
      color: var(--demo-color-881320);
      border-color: var(--accent-rose);
    }
    .card-actions .tag-friction:hover {
      background: var(--demo-color-881320);
      color: var(--bg-ivory);
    }
    .empty-state {
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--flat-shadow);
      padding: var(--space-5);
    }
    .empty-state h2 {
      margin-top: 0;
      border-bottom: none;
      padding-bottom: 0;
      font-size: 1.4rem;
    }
    .empty-state pre {
      font-size: 0.8rem;
      max-width: 100%;
    }
    @media (max-width: 720px) {
      .filter-controls {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 640px) {
      main { padding: var(--space-5) var(--space-4) var(--space-7); }
      .filters,
      .experiment-card,
      .empty-state { padding: var(--space-4); }
      button.compose-tag { min-height: 44px; }
    }
    @media (prefers-reduced-motion: reduce) {
      button.filter-chip,
      button.reset-btn,
      button.compose-tag,
      .card-actions .tag { transition: none !important; }
    }
  </style>
</head>
<body class="shell-page">
${renderSiteHeader("experiments")}
<main id="main-content" tabindex="-1">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li aria-current="page"><span>Experiments</span></li>
    </ol>
  </nav>

  <header class="lede-block">
    <p class="eyebrow">experiment index</p>
    <h1>Experiments</h1>
    <p class="lede">Every structured showcase concept page indexed by its experiment kind, driving question, observed result, APIs, and cross-feature compositions.</p>
    <div class="header-links">
      <a href="/friction/">View friction ledger &rarr;</a>
      <a href="/experiments.json">JSON feed</a>
    </div>
  </header>

  <section class="filters" role="search" aria-label="Filter experiments">
    <div class="filter-controls">
      <div class="field">
        <label for="exp-search">Search experiments</label>
        <div class="search-row">
          <input id="exp-search" type="search" autocomplete="off" placeholder="Search title, question, result, API, or tag">
          <button type="button" id="exp-reset" class="reset-btn" hidden>Clear filters</button>
        </div>
      </div>
      <div class="field">
        <label for="exp-composes">Composes with</label>
        <select id="exp-composes">
          <option value="">All compositions</option>
          ${composesOptions}
        </select>
      </div>
    </div>
    <fieldset class="chip-group">
      <legend>Filter by kind</legend>
      <div class="chip-row">
        <button type="button" class="filter-chip" data-kind="" aria-pressed="true">All <span class="chip-count">(${
    escapeHTML(String(records.length))
  })</span></button>
        ${kindChips}
      </div>
    </fieldset>
  </section>

  <p class="stats" id="exp-status" role="status" aria-live="polite" aria-atomic="true">Showing ${
    escapeHTML(String(records.length))
  } of ${escapeHTML(String(records.length))} ${expLabel}.</p>

  ${listMarkup}

  <script>
    (() => {
      const searchInput = document.getElementById("exp-search");
      const composesSelect = document.getElementById("exp-composes");
      const resetBtn = document.getElementById("exp-reset");
      const statusEl = document.getElementById("exp-status");
      const emptyEl = document.getElementById("exp-empty-filter");
      const chips = Array.from(document.querySelectorAll(".filter-chip"));
      const items = Array.from(document.querySelectorAll("#exp-list > li"));
      const composeButtons = Array.from(document.querySelectorAll(".compose-tag"));
      let activeKind = "";
      let announceTimer = 0;

      function parseComposes(item) {
        try {
          const parsed = JSON.parse(item.dataset.composes || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }

      function updateStatus(visible, total) {
        if (!statusEl) return;
        const noun = total === 1 ? "experiment" : "experiments";
        statusEl.textContent = "Showing " + visible + " of " + total + " " + noun + ".";
      }

      function applyFilters(immediate) {
        const q = (searchInput ? searchInput.value : "").trim().toLowerCase();
        const comp = composesSelect ? composesSelect.value.toLowerCase() : "";
        let visible = 0;
        for (const item of items) {
          const matchesKind = !activeKind || item.dataset.kind === activeKind;
          const matchesComposes = !comp || parseComposes(item).includes(comp);
          const matchesQuery = !q || (item.dataset.search || "").includes(q);
          const show = matchesKind && matchesComposes && matchesQuery;
          item.hidden = !show;
          if (show) visible++;
        }
        if (resetBtn) resetBtn.hidden = !activeKind && !comp && !q;
        if (emptyEl) emptyEl.hidden = items.length === 0 || visible > 0;
        window.clearTimeout(announceTimer);
        if (immediate) {
          updateStatus(visible, items.length);
        } else {
          announceTimer = window.setTimeout(() => updateStatus(visible, items.length), 150);
        }
      }

      for (const chip of chips) {
        chip.addEventListener("click", () => {
          activeKind = chip.dataset.kind || "";
          for (const other of chips) {
            other.setAttribute("aria-pressed", String(other === chip));
          }
          applyFilters(true);
        });
      }

      if (composesSelect) {
        composesSelect.addEventListener("change", () => applyFilters(true));
      }

      if (searchInput) {
        searchInput.addEventListener("input", () => applyFilters(false));
      }

      for (const btn of composeButtons) {
        btn.addEventListener("click", () => {
          const tag = btn.dataset.composeTag || "";
          if (composesSelect) {
            composesSelect.value = composesSelect.value === tag ? "" : tag;
          }
          applyFilters(true);
        });
      }

      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          activeKind = "";
          if (searchInput) searchInput.value = "";
          if (composesSelect) composesSelect.value = "";
          for (const chip of chips) {
            chip.setAttribute("aria-pressed", String((chip.dataset.kind || "") === ""));
          }
          applyFilters(true);
          if (searchInput) searchInput.focus();
        });
      }

      const params = new URLSearchParams(window.location.search);
      const initialKind = params.get("kind") || "";
      const initialComposes = (params.get("composes") || "").toLowerCase();
      const initialQuery = params.get("q") || "";
      if (initialKind) {
        const matchChip = chips.find((c) => c.dataset.kind === initialKind);
        if (matchChip) {
          activeKind = initialKind;
          for (const chip of chips) {
            chip.setAttribute("aria-pressed", String(chip === matchChip));
          }
        }
      }
      if (initialComposes && composesSelect) {
        composesSelect.value = initialComposes;
      }
      if (initialQuery && searchInput) {
        searchInput.value = initialQuery;
      }
      if (initialKind || initialComposes || initialQuery) applyFilters(true);
    })();
  </script>

  ${BYLINE_FOOTER}
</main>
</body>
</html>`;
}

export async function handleExperimentsRoute(req: Request): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  const isHtml = path === "/experiments" || path === "/experiments/";
  const isJson = path === "/experiments.json";
  if (!isHtml && !isJson) return null;

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }

  try {
    const records = await collectExperiments();
    if (isJson) {
      return new Response(
        JSON.stringify({ count: records.length, experiments: records }, null, 2),
        {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "public, max-age=60",
          },
        },
      );
    }
    return htmlResponse(renderExperimentsPage(records));
  } catch (err) {
    return new Response(`Failed to render experiments index: ${err}`, { status: 502 });
  }
}
