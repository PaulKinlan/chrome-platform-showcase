import {
  collectFrictionEntries,
  FRICTION_KINDS,
  type FrictionKind,
  type FrictionRecord,
  isSafeHttpUrl,
} from "../lib/experiment.ts";
import { escapeHTML, htmlResponse } from "./html.ts";
import { BYLINE_FOOTER, renderSiteHeader } from "./pages/layout.ts";

const KIND_LABELS: Record<FrictionKind, string> = {
  "browser-bug": "Browser bug",
  "spec-mismatch": "Spec mismatch",
  "platform-limit": "Platform limit",
  "interop-gap": "Interop gap",
  ergonomics: "Ergonomics",
};

const EMPTY_EXAMPLE = JSON.stringify(
  {
    title: "Canvas drawElement focus rings",
    blurb: "Tests keyboard focus outlines when DOM subtrees render inside canvas.",
    kind: "experiment",
    question: "Do focus rings track CSS transforms inside drawElement?",
    result: "Hit-testing tracks transforms, but default focus rings clip at the canvas border.",
    friction: [
      {
        summary: "Default focus ring clips at the canvas edge under CSS scale()",
        kind: "browser-bug",
        repro: "Tab to the inner button at 1.5x scale and inspect the clipped outline.",
        browser: "Chrome 151 Canary",
        issueUrl: "https://issues.chromium.org/issues/000000000",
        workaround: "Draw an inset focus indicator inside the element's own border box.",
      },
    ],
  },
  null,
  2,
);

function kindBadgeClass(kind: FrictionKind): string {
  if (kind === "browser-bug") return "kind-badge kind-browser-bug";
  if (kind === "spec-mismatch") return "kind-badge kind-spec-mismatch";
  if (kind === "platform-limit") return "kind-badge kind-platform-limit";
  if (kind === "interop-gap") return "kind-badge kind-interop-gap";
  return "kind-badge kind-ergonomics";
}

function renderFrictionItem(item: FrictionRecord): string {
  const { entry } = item;
  const kindLabel = KIND_LABELS[entry.kind] ?? entry.kind;
  const searchTokens = [
    entry.summary,
    entry.kind,
    kindLabel,
    entry.repro ?? "",
    entry.browser ?? "",
    entry.workaround ?? "",
    item.pageTitle,
    item.release,
    item.featureSlug,
    item.conceptSlug,
  ].join(" ").toLowerCase();

  const reproHref = `${item.route}#repro`;
  const hasSafeIssue = Boolean(entry.issueUrl && isSafeHttpUrl(entry.issueUrl));
  const issueLink = hasSafeIssue && entry.issueUrl
    ? `<a class="tag tag-chromestatus" href="${
      escapeHTML(entry.issueUrl)
    }" target="_blank" rel="noopener">Issue tracker &nearr;</a>`
    : "";

  const reproBlock = entry.repro
    ? `<div class="friction-detail-row">
        <dt>Repro</dt>
        <dd>${escapeHTML(entry.repro)}</dd>
      </div>`
    : "";

  const workaroundBlock = entry.workaround
    ? `<details class="friction-disclosure">
        <summary>Workaround</summary>
        <p>${escapeHTML(entry.workaround)}</p>
      </details>`
    : "";

  const browserBadge = entry.browser
    ? `<span class="meta-pill">${escapeHTML(entry.browser)}</span>`
    : "";

  return `<li class="friction-card" data-kind="${escapeHTML(entry.kind)}" data-search="${
    escapeHTML(searchTokens)
  }">
      <div class="card-meta">
        <span class="${kindBadgeClass(entry.kind)}">${escapeHTML(kindLabel)}</span>
        <span class="release-status">${escapeHTML(item.release)}</span>
        ${browserBadge}
      </div>
      <h2>${escapeHTML(entry.summary)}</h2>
      <p class="source-line">
        From <a href="${escapeHTML(item.route)}">${escapeHTML(item.pageTitle)}</a>
        <span class="source-path">(${escapeHTML(item.release)}/${escapeHTML(item.featureSlug)}/${
    escapeHTML(item.conceptSlug)
  })</span>
      </p>
      ${reproBlock ? `<dl class="friction-details">${reproBlock}</dl>` : ""}
      ${workaroundBlock}
      <div class="card-actions">
        <a class="tag tag-live" href="${escapeHTML(reproHref)}">Jump to repro &rarr;</a>
        <a class="tag tag-chromestatus" href="${escapeHTML(item.route)}">Open experiment</a>
        ${issueLink}
      </div>
    </li>`;
}

/**
 * Pure HTML renderer for `/friction/`. Uses `/public/styles.css` design tokens
 * exclusively and escapes every dynamic string via `escapeHTML`.
 */
export function renderFrictionPage(entries: FrictionRecord[]): string {
  const counts = new Map<FrictionKind, number>();
  for (const kind of FRICTION_KINDS) counts.set(kind, 0);
  for (const item of entries) {
    counts.set(item.entry.kind, (counts.get(item.entry.kind) ?? 0) + 1);
  }

  const kindChips = FRICTION_KINDS.map((kind) => {
    const count = counts.get(kind) ?? 0;
    return `<button type="button" class="filter-chip" data-kind="${
      escapeHTML(kind)
    }" aria-pressed="false">${escapeHTML(KIND_LABELS[kind])} <span class="chip-count">(${
      escapeHTML(String(count))
    })</span></button>`;
  }).join("");

  const listMarkup = entries.length > 0
    ? `<ul class="friction-list" id="friction-list" role="list">${
      entries.map(renderFrictionItem).join("")
    }</ul>
    <p id="friction-empty-filter" class="empty-state" hidden>No friction entries match the current filters. Try clearing a category chip or shortening your search query.</p>`
    : `<section class="empty-state" aria-labelledby="empty-heading">
      <h2 id="empty-heading">No friction entries recorded yet</h2>
      <p>This ledger aggregates every <code>friction</code> note declared inside concept-level <code>page.json</code> files under <code>v&lt;N&gt;/&lt;feature&gt;/&lt;concept&gt;/page.json</code>. Each entry links straight back to its live experiment and <code>#repro</code> anchor.</p>
      <p>To add an entry, place a <code>page.json</code> file beside any concept's <code>index.html</code> with a <code>friction</code> array:</p>
      <pre><code>${escapeHTML(EMPTY_EXAMPLE)}</code></pre>
    </section>`;

  const entryLabel = entries.length === 1 ? "entry" : "entries";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>friction ledger — chrome platform showcase</title>
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
    .search-field {
      display: grid;
      gap: var(--space-2);
    }
    .search-field label,
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
      align-items: stretch;
    }
    .search-row input[type="search"] {
      flex: 1 1 14rem;
      min-width: 0;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      font-family: var(--font-mono);
      font-size: 0.9rem;
      background: var(--bg-paper);
      color: var(--text-black);
      border: 2px solid var(--border-black);
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
    .friction-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: var(--space-4);
    }
    .friction-card {
      min-width: 0;
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--shadow-card);
      padding: var(--space-5);
      overflow-wrap: anywhere;
    }
    .friction-card[hidden] { display: none; }
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
    .kind-browser-bug {
      background: color-mix(in srgb, var(--accent-rose) 12%, var(--bg-paper));
      color: var(--demo-color-881320);
      border-color: var(--accent-rose);
    }
    .kind-spec-mismatch {
      background: color-mix(in srgb, var(--accent-amber) 18%, var(--bg-paper));
      color: var(--text-black);
      border-color: var(--accent-amber);
    }
    .kind-platform-limit {
      background: color-mix(in srgb, var(--accent-blue) 10%, var(--bg-paper));
      color: var(--accent-blue);
      border-color: var(--accent-blue);
    }
    .kind-interop-gap {
      background: color-mix(in srgb, var(--accent-emerald) 14%, var(--bg-paper));
      color: var(--accent-emerald-dark);
      border-color: var(--accent-emerald-dark);
    }
    .kind-ergonomics {
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
      overflow-wrap: anywhere;
    }
    .friction-card h2 {
      font-size: 1.35rem;
      margin: 0 0 var(--space-2);
      padding-bottom: 0;
      border-bottom: none;
      overflow-wrap: anywhere;
    }
    .source-line {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      color: var(--text-charcoal);
      margin: 0 0 var(--space-3);
    }
    .source-path {
      color: var(--text-muted);
      overflow-wrap: anywhere;
    }
    .friction-details {
      margin: 0 0 var(--space-3);
      padding: var(--space-3);
      background: var(--bg-stone);
      border: 1px solid var(--border-black);
    }
    .friction-detail-row dt {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-black);
      margin-bottom: var(--space-1);
    }
    .friction-detail-row dd {
      font-family: var(--font-serif);
      font-size: 0.98rem;
      color: var(--text-charcoal);
      margin: 0;
      max-width: 72ch;
    }
    .friction-disclosure {
      margin: 0 0 var(--space-3);
      border: 1px solid var(--border-black);
      background: var(--bg-ivory);
    }
    .friction-disclosure summary {
      cursor: pointer;
      min-height: 44px;
      display: flex;
      align-items: center;
      padding: var(--space-2) var(--space-3);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-black);
    }
    .friction-disclosure p {
      margin: 0;
      padding: 0 var(--space-3) var(--space-3);
      font-size: 0.95rem;
      max-width: 72ch;
    }
    .card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-top: var(--space-3);
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
    .card-actions .tag-chromestatus {
      background: var(--bg-paper);
      color: var(--text-black);
    }
    .card-actions .tag-chromestatus:hover {
      background: var(--bg-stone);
      color: var(--accent-blue);
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
    @media (max-width: 640px) {
      main { padding: var(--space-5) var(--space-4) var(--space-7); }
      .filters,
      .friction-card,
      .empty-state { padding: var(--space-4); }
    }
    @media (prefers-reduced-motion: reduce) {
      button.filter-chip,
      button.reset-btn,
      .card-actions .tag { transition: none !important; }
    }
  </style>
</head>
<body class="shell-page">
${renderSiteHeader("friction")}
<main id="main-content" tabindex="-1">
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      <li><a href="/">Home</a></li>
      <li aria-current="page"><span>Friction ledger</span></li>
    </ol>
  </nav>

  <header class="lede-block">
    <p class="eyebrow">friction ledger</p>
    <h1>Friction</h1>
    <p class="lede">Browser bugs, spec mismatches, platform limits, interop gaps, and ergonomics rough edges surfaced while building showcase experiments. Every row links back to its live repro.</p>
    <div class="header-links">
      <a href="/experiments/">Browse experiments &rarr;</a>
      <a href="/friction.json">JSON feed</a>
    </div>
  </header>

  <section class="filters" role="search" aria-label="Filter friction ledger">
    <div class="search-field">
      <label for="friction-search">Search friction entries</label>
      <div class="search-row">
        <input id="friction-search" type="search" autocomplete="off" placeholder="Search summary, API, browser, release, or workaround">
        <button type="button" id="friction-reset" class="reset-btn" hidden>Clear filters</button>
      </div>
    </div>
    <fieldset class="chip-group">
      <legend>Filter by kind</legend>
      <div class="chip-row">
        <button type="button" class="filter-chip" data-kind="" aria-pressed="true">All <span class="chip-count">(${
    escapeHTML(String(entries.length))
  })</span></button>
        ${kindChips}
      </div>
    </fieldset>
  </section>

  <p class="stats" id="friction-status" role="status" aria-live="polite" aria-atomic="true">Showing ${
    escapeHTML(String(entries.length))
  } of ${escapeHTML(String(entries.length))} friction ${entryLabel}.</p>

  ${listMarkup}

  <script>
    (() => {
      const searchInput = document.getElementById("friction-search");
      const resetBtn = document.getElementById("friction-reset");
      const statusEl = document.getElementById("friction-status");
      const emptyEl = document.getElementById("friction-empty-filter");
      const chips = Array.from(document.querySelectorAll(".filter-chip"));
      const items = Array.from(document.querySelectorAll("#friction-list > li"));
      let activeKind = "";
      let announceTimer = 0;

      function updateStatus(visible, total) {
        if (!statusEl) return;
        const noun = total === 1 ? "entry" : "entries";
        statusEl.textContent = "Showing " + visible + " of " + total + " friction " + noun + ".";
      }

      function applyFilters(immediate) {
        const q = (searchInput ? searchInput.value : "").trim().toLowerCase();
        let visible = 0;
        for (const item of items) {
          const matchesKind = !activeKind || item.dataset.kind === activeKind;
          const matchesQuery = !q || (item.dataset.search || "").includes(q);
          const show = matchesKind && matchesQuery;
          item.hidden = !show;
          if (show) visible++;
        }
        if (resetBtn) resetBtn.hidden = !activeKind && !q;
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

      if (searchInput) {
        searchInput.addEventListener("input", () => applyFilters(false));
      }

      if (resetBtn) {
        resetBtn.addEventListener("click", () => {
          activeKind = "";
          if (searchInput) searchInput.value = "";
          for (const chip of chips) {
            chip.setAttribute("aria-pressed", String((chip.dataset.kind || "") === ""));
          }
          applyFilters(true);
          if (searchInput) searchInput.focus();
        });
      }

      const params = new URLSearchParams(window.location.search);
      const initialKind = params.get("kind") || "";
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
      if (initialQuery && searchInput) {
        searchInput.value = initialQuery;
      }
      if (initialKind || initialQuery) applyFilters(true);
    })();
  </script>

  ${BYLINE_FOOTER}
</main>
</body>
</html>`;
}

export async function handleFrictionRoute(req: Request): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  const isHtml = path === "/friction" || path === "/friction/";
  const isJson = path === "/friction.json";
  if (!isHtml && !isJson) return null;

  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { allow: "GET, HEAD" },
    });
  }

  try {
    const entries = await collectFrictionEntries();
    if (isJson) {
      return new Response(JSON.stringify({ count: entries.length, entries }, null, 2), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=60",
        },
      });
    }
    return htmlResponse(renderFrictionPage(entries));
  } catch (err) {
    return new Response(`Failed to render friction ledger: ${err}`, { status: 502 });
  }
}
