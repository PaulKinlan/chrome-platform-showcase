import { platform } from "../lib/platform.ts";
import type { CritiqueReport } from "../lib/critique.ts";
import { scoreVerdicts } from "../lib/critique.ts";
import { escapeHTML } from "./html.ts";

export async function readCritique(path: string): Promise<CritiqueReport | null> {
  try {
    const text = await platform().readTextFile(path);
    return JSON.parse(text) as CritiqueReport;
  } catch {
    return null;
  }
}

const CRITIQUES_CACHE_TTL_MS = 60 * 1000;
let critiquesCache: { at: number; critiques: CritiqueReport[] } | null = null;
let critiquesInFlight: Promise<CritiqueReport[]> | null = null;

async function scanCritiques(): Promise<CritiqueReport[]> {
  if (critiquesInFlight) return critiquesInFlight;
  critiquesInFlight = (async () => {
    const out: CritiqueReport[] = [];
    try {
      for await (const entry of platform().readDir(".")) {
        if (!entry.isDirectory || !/^v\d+$/.test(entry.name)) continue;
        const release = entry.name;
        for await (const fd of platform().readDir(release)) {
          if (!fd.isDirectory) continue;
          const featureSlug = fd.name;
          const featureCrit = await readCritique(`${release}/${featureSlug}/_questions.json`);
          if (featureCrit) out.push(featureCrit);
          try {
            for await (const cd of platform().readDir(`${release}/${featureSlug}`)) {
              if (!cd.isDirectory) continue;
              const conceptCrit = await readCritique(
                `${release}/${featureSlug}/${cd.name}/_questions.json`,
              );
              if (conceptCrit) out.push(conceptCrit);
            }
          } catch {
            // ignore — feature folder may not be readable in this isolate.
          }
        }
      }
    } catch {
      // ignore — root may not be readable.
    }
    critiquesCache = { at: Date.now(), critiques: out };
    critiquesInFlight = null;
    return out;
  })();
  return critiquesInFlight;
}

async function collectCritiques(): Promise<CritiqueReport[]> {
  if (critiquesCache) {
    if (Date.now() - critiquesCache.at >= CRITIQUES_CACHE_TTL_MS) {
      scanCritiques().catch(() => {});
    }
    return critiquesCache.critiques;
  }
  return await scanCritiques();
}

function verdictBadge(state: string): string {
  const cls = state === "pass"
    ? "ok"
    : state === "fail"
    ? "bad"
    : state === "partial"
    ? "warn"
    : "na";
  return `<span class="verdict verdict-${cls}">${escapeHTML(state)}</span>`;
}

const DEFAULT_CRITIQUES_LIMIT = 100;
const MIN_CRITIQUES_LIMIT = 1;
const MAX_CRITIQUES_LIMIT = 500;

export interface CritiquesIndexOptions {
  release?: string;
  page?: number;
  limit?: number;
  all?: boolean;
  /** Optional preloaded critiques list (useful for deterministic unit tests). */
  critiques?: CritiqueReport[];
}

function sortMilestonesDesc(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort((a, b) => {
    const na = Number(a.replace(/^v/, ""));
    const nb = Number(b.replace(/^v/, ""));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) {
      return nb - na;
    }
    return b.localeCompare(a);
  });
}

function buildCritiquesHref(params: {
  release?: string;
  page?: number;
  limit?: number;
  all?: boolean;
}): string {
  const sp = new URLSearchParams();
  if (params.release) sp.set("release", params.release);
  if (params.all) {
    sp.set("all", "1");
  } else {
    if (params.page && params.page > 1) sp.set("page", String(params.page));
    if (params.limit && params.limit !== DEFAULT_CRITIQUES_LIMIT) {
      sp.set("limit", String(params.limit));
    }
  }
  const qs = sp.toString();
  return qs ? `/critiques/?${qs}` : "/critiques/";
}

function paginationPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export async function renderCritiquesIndex(opts: CritiquesIndexOptions = {}): Promise<string> {
  const allCritiques = opts.critiques ?? await collectCritiques();
  const rawRelease = opts.release?.trim();
  const releaseFilter = rawRelease && rawRelease !== "all" ? rawRelease : undefined;
  const showAll = Boolean(opts.all);

  const rawLimit = typeof opts.limit === "number" && Number.isFinite(opts.limit)
    ? Math.trunc(opts.limit)
    : DEFAULT_CRITIQUES_LIMIT;
  const limit = Math.min(MAX_CRITIQUES_LIMIT, Math.max(MIN_CRITIQUES_LIMIT, rawLimit));

  const milestones = sortMilestonesDesc(allCritiques.map((c) => c.release));
  const filtered = releaseFilter
    ? allCritiques.filter((c) => c.release === releaseFilter)
    : allCritiques;

  // Sort by lowest ratio first — most needy at the top, with stable tie-breakers.
  const scored = filtered.map((c) => ({ c, s: scoreVerdicts(c.rubric) }));
  scored.sort((a, b) => {
    if (a.s.ratio !== b.s.ratio) return a.s.ratio - b.s.ratio;
    if (a.c.release !== b.c.release) {
      const na = Number(a.c.release.replace(/^v/, ""));
      const nb = Number(b.c.release.replace(/^v/, ""));
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return nb - na;
      return b.c.release.localeCompare(a.c.release);
    }
    const slugCmp = a.c.featureSlug.localeCompare(b.c.featureSlug);
    if (slugCmp !== 0) return slugCmp;
    return (a.c.conceptSlug ?? "").localeCompare(b.c.conceptSlug ?? "");
  });

  let totalQuestions = 0;
  let totalConcepts = 0;
  for (const { c } of scored) {
    totalQuestions += c.openQuestions.length;
    if (c.conceptSlug) totalConcepts++;
  }

  const totalItems = scored.length;
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(totalItems / limit));
  const rawPage = typeof opts.page === "number" && Number.isFinite(opts.page)
    ? Math.trunc(opts.page)
    : 1;
  const page = showAll ? 1 : Math.min(totalPages, Math.max(1, rawPage));
  const startIndex = showAll ? 0 : (page - 1) * limit;
  const pageItems = showAll ? scored : scored.slice(startIndex, startIndex + limit);

  const milestonePills = [
    `<a class="pill${!releaseFilter ? " pill-active" : ""}" href="${
      escapeHTML(buildCritiquesHref({ limit, all: showAll }))
    }"${!releaseFilter ? ' aria-current="page"' : ""}>All (${allCritiques.length})</a>`,
    ...milestones.map((m) => {
      const active = releaseFilter === m;
      const href = buildCritiquesHref({ release: m, limit, all: showAll });
      return `<a class="pill${active ? " pill-active" : ""}" href="${escapeHTML(href)}"${
        active ? ' aria-current="page"' : ""
      }>${escapeHTML(m)}</a>`;
    }),
  ].join("");

  const startDisplay = totalItems === 0 ? 0 : startIndex + 1;
  const endDisplay = totalItems === 0 ? 0 : startIndex + pageItems.length;
  const rangeSummary = totalItems === 0
    ? "showing 0"
    : showAll
    ? `showing all ${totalItems}`
    : `showing ${startDisplay}–${endDisplay} of ${totalItems} (page ${page} of ${totalPages})`;

  const paginationNav = totalItems > 0
    ? (() => {
      if (showAll) {
        const paginateHref = buildCritiquesHref({ release: releaseFilter, page: 1, limit });
        return `<nav class="pagination" aria-label="Critiques pagination">
    <span class="pagination-status">Showing all ${totalItems} pages</span>
    ${
          totalItems > limit
            ? `<a class="page-btn" href="${escapeHTML(paginateHref)}">Paginate (${limit}/page)</a>`
            : ""
        }
  </nav>`;
      }

      const prevHtml = page > 1
        ? `<a class="page-btn" rel="prev" href="${
          escapeHTML(buildCritiquesHref({ release: releaseFilter, page: page - 1, limit }))
        }">&larr; Prev</a>`
        : `<span class="page-btn is-disabled" aria-disabled="true">&larr; Prev</span>`;

      const nextHtml = page < totalPages
        ? `<a class="page-btn" rel="next" href="${
          escapeHTML(buildCritiquesHref({ release: releaseFilter, page: page + 1, limit }))
        }">Next &rarr;</a>`
        : `<span class="page-btn is-disabled" aria-disabled="true">Next &rarr;</span>`;

      const numbersHtml = paginationPages(page, totalPages).map((entry) => {
        if (entry === "ellipsis") {
          return `<span class="page-ellipsis" aria-hidden="true">&hellip;</span>`;
        }
        const active = entry === page;
        const href = buildCritiquesHref({ release: releaseFilter, page: entry, limit });
        return `<a class="page-btn${active ? " page-btn-active" : ""}" href="${escapeHTML(href)}"${
          active ? ' aria-current="page"' : ""
        }>${entry}</a>`;
      }).join("");

      const allHref = buildCritiquesHref({ release: releaseFilter, all: true });
      const viewAllHtml = totalPages > 1
        ? `<a class="page-btn" href="${escapeHTML(allHref)}">View all (${totalItems})</a>`
        : "";

      return `<nav class="pagination" aria-label="Critiques pagination">
    <span class="pagination-status">Showing ${startDisplay}&ndash;${endDisplay} of ${totalItems} (page ${page} of ${totalPages})</span>
    <div class="pagination-controls">${prevHtml}${numbersHtml}${nextHtml}${viewAllHtml}</div>
  </nav>`;
    })()
    : "";

  const rows = pageItems.map(({ c, s }) => {
    const href = c.conceptSlug
      ? `/${c.release}/${c.featureSlug}/${c.conceptSlug}/`
      : `/${c.release}/${c.featureSlug}/`;
    const label = c.conceptSlug
      ? `${c.release} ${c.featureSlug} / ${c.conceptSlug}`
      : `${c.release} ${c.featureSlug}`;
    return `<tr>
      <td><a href="${escapeHTML(href)}">${escapeHTML(label)}</a></td>
      <td class="num">${(s.ratio * 100).toFixed(0)}%</td>
      <td class="num">${c.openQuestions.length}</td>
      <td>${
      c.openQuestions.map((q) =>
        `<span class="qchip qchip-${escapeHTML(String(q.severity ?? "minor"))}">${
          escapeHTML(q.title)
        }</span>`
      ).join("")
    }</td>
    </tr>`;
  }).join("");

  const emptyMessage = releaseFilter
    ? `No critiques found for ${escapeHTML(releaseFilter)}.`
    : "No critiques yet. Run the reviewer pass to populate this page.";

  const titleSuffix = releaseFilter ? ` (${escapeHTML(releaseFilter)})` : "";
  const eyebrow = releaseFilter ? `self-critique · ${escapeHTML(releaseFilter)}` : "self-critique";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>self-critique${titleSuffix} — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1100px; overflow-x: clip; }
    .table-scroll { width: 100%; min-width: 0; max-width: 100%; overflow-x: auto; contain: inline-size; box-sizing: border-box; }
    .milestone-pills { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 var(--space-4); }
    .pill { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; min-width: 44px; padding: 0.35rem 0.7rem; font-family: var(--font-mono); font-size: 0.78rem; text-decoration: none; border: 2px solid var(--border-black); background: var(--bg-paper); color: var(--text-black); box-sizing: border-box; }
    .pill:hover { background: var(--bg-stone); color: var(--text-black); }
    .pill-active { background: var(--border-black); color: var(--bg-paper); font-weight: 700; }
    .pill-active:hover { background: var(--text-charcoal); color: var(--bg-paper); }
    .pill:focus-visible, .page-btn:focus-visible { outline: 2px solid var(--accent-blue); outline-offset: 2px; }
    .pagination { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); margin: var(--space-4) 0; font-family: var(--font-mono); font-size: 0.8rem; }
    .pagination-status { color: var(--text-muted); }
    .pagination-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; }
    .page-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; min-width: 44px; padding: 0.35rem 0.7rem; border: 2px solid var(--border-black); background: var(--bg-paper); color: var(--text-black); text-decoration: none; box-sizing: border-box; }
    .page-btn:hover { background: var(--bg-stone); color: var(--text-black); }
    .page-btn-active { background: var(--border-black); color: var(--bg-paper); font-weight: 700; }
    .page-btn-active:hover { background: var(--text-charcoal); color: var(--bg-paper); }
    .page-btn.is-disabled { background: var(--bg-stone); color: var(--text-muted); border-color: var(--text-muted); cursor: not-allowed; }
    .page-ellipsis { padding: 0 0.25rem; color: var(--text-muted); }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; }
    th, td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--border-black); text-align: left; vertical-align: top; }
    th { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-stone); }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .verdict { padding: 0.15rem 0.5rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--border-black); }
    .verdict-ok { background: color-mix(in srgb, var(--accent-emerald) 14%, var(--bg-paper)); color: var(--accent-emerald); border-color: var(--accent-emerald); }
    .verdict-warn { background: color-mix(in srgb, var(--accent-amber) 14%, var(--bg-paper)); color: var(--accent-amber); border-color: var(--accent-amber); }
    .verdict-bad { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .verdict-na { background: var(--bg-stone); color: var(--text-muted); }
    .qchip { display: inline-block; padding: 0.15rem 0.5rem; margin: 0.1rem 0.2rem 0.1rem 0; font-size: 0.7rem; border: 1px solid var(--border-black); background: var(--bg-stone); color: var(--text-charcoal); }
    .qchip-major { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .qchip-moderate { background: color-mix(in srgb, var(--accent-amber) 14%, var(--bg-paper)); color: var(--accent-amber); border-color: var(--accent-amber); }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>
  <header class="lede-block">
    <p class="eyebrow">${eyebrow}</p>
    <h1>open questions${titleSuffix}</h1>
    <p class="lede">A second pair of eyes on every concept page. A reviewer agent reads each page cold against the rubric (does the demo demonstrate what the spec promises? edge cases? interactive surface? blurb match? references? design system?) and writes the verdict plus follow-up work items here. The list below is sorted weakest first so the next routine fire knows where to focus.</p>
    <p class="updated-line">${totalItems} pages reviewed · ${totalConcepts} concepts · ${totalQuestions} open questions · ${rangeSummary}</p>
  </header>

  <nav class="milestone-pills" aria-label="Filter critiques by Chrome milestone">
    ${milestonePills}
  </nav>

  <div class="table-scroll" tabindex="0" role="region" aria-label="Open questions per page">
  <table>
    <thead>
      <tr>
        <th>page</th>
        <th>rubric score</th>
        <th>open</th>
        <th>questions</th>
      </tr>
    </thead>
    <tbody>${rows || `<tr><td colspan="4">${emptyMessage}</td></tr>`}</tbody>
  </table>
  </div>

  ${paginationNav}

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

export function renderCritiqueDetail(c: CritiqueReport): string {
  const s = scoreVerdicts(c.rubric);
  const rows = Object.entries(c.rubric).map(([k, v]) =>
    `<tr><th>${escapeHTML(k.replace(/_/g, " "))}</th><td>${verdictBadge(v.state)}</td><td>${
      escapeHTML(v.rationale)
    }</td></tr>`
  ).join("");
  const questions = c.openQuestions.length
    ? `<ol class="open-questions">${
      c.openQuestions.map((q) =>
        `<li>
      <h3>${escapeHTML(q.title)}${
          q.severity
            ? ` <span class="qchip qchip-${escapeHTML(String(q.severity))}">${
              escapeHTML(String(q.severity))
            }</span>`
            : ""
        }</h3>
      <p>${escapeHTML(q.detail)}</p>
      ${
          q.suggestedSlug
            ? `<p class="updated-line">suggested concept slug: <code>${
              escapeHTML(q.suggestedSlug)
            }</code></p>`
            : ""
        }
    </li>`
      ).join("")
    }</ol>`
    : `<p class="updated-line">No open questions. The reviewer signed off.</p>`;

  const label = c.conceptSlug
    ? `${c.release} · ${c.featureSlug} / ${c.conceptSlug}`
    : `${c.release} · ${c.featureSlug}`;

  const guidance = Array.isArray(c.guidanceConsulted) && c.guidanceConsulted.length
    ? `<section>
    <h2>modern-web-guidance consulted (${c.guidanceConsulted.length})</h2>
    <table><thead><tr><th>id / query</th><th>recommendation</th><th>applied / exception</th></tr></thead><tbody>${
      c.guidanceConsulted.map((g) =>
        `<tr><th>${escapeHTML(g.id ?? g.query ?? "—")}</th><td>${
          escapeHTML(g.recommendation)
        }</td><td>${escapeHTML(g.appliedOrException)}${
          g.evidence ? ` <span class="updated-line">(${escapeHTML(g.evidence)})</span>` : ""
        }</td></tr>`
      ).join("")
    }</tbody></table>
  </section>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>critique — ${escapeHTML(label)}</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 920px; }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; margin: var(--space-3) 0; }
    th, td { padding: 0.5rem 0.7rem; border-bottom: 1px solid var(--border-black); text-align: left; vertical-align: top; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-stone); width: 180px; }
    .verdict { padding: 0.15rem 0.5rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--border-black); }
    .verdict-ok { background: color-mix(in srgb, var(--accent-emerald) 14%, var(--bg-paper)); color: var(--accent-emerald); border-color: var(--accent-emerald); }
    .verdict-warn { background: color-mix(in srgb, var(--accent-amber) 14%, var(--bg-paper)); color: var(--accent-amber); border-color: var(--accent-amber); }
    .verdict-bad { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .verdict-na { background: var(--bg-stone); color: var(--text-muted); }
    .open-questions { padding-left: 1.2rem; }
    .open-questions li { margin-bottom: var(--space-4); }
    .open-questions h3 { margin: 0 0 var(--space-2); font-family: var(--font-display); font-size: 1.1rem; }
    .qchip { display: inline-block; padding: 0.1rem 0.5rem; font-size: 0.7rem; font-family: var(--font-mono); border: 1px solid var(--border-black); margin-left: 0.4rem; }
    .qchip-major { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .qchip-moderate { background: color-mix(in srgb, var(--accent-amber) 14%, var(--bg-paper)); color: var(--accent-amber); border-color: var(--accent-amber); }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/critiques/">&larr; all critiques</a></p>
  <header class="lede-block">
    <p class="eyebrow">critique · ${escapeHTML(c.release)}</p>
    <h1>${escapeHTML(label)}</h1>
    ${c.summary ? `<p class="lede">${escapeHTML(c.summary)}</p>` : ""}
    <p class="updated-line">reviewed ${escapeHTML(c.reviewedAt)} by ${
    escapeHTML(c.reviewer)
  } · rubric ${(s.ratio * 100).toFixed(0)}%</p>
  </header>

  <section>
    <h2>rubric</h2>
    <table><tbody>${rows}</tbody></table>
  </section>

  <section>
    <h2>open questions (${c.openQuestions.length})</h2>
    ${questions}
  </section>

  ${guidance}

  <p><a href="${
    escapeHTML(`https://chromestatus.com/feature/${c.chromestatusId}`)
  }" target="_blank" rel="noopener">ChromeStatus #${
    escapeHTML(String(c.chromestatusId))
  }</a> · <a href="/${escapeHTML(c.release)}/${escapeHTML(c.featureSlug)}/${
    c.conceptSlug ? escapeHTML(c.conceptSlug) + "/" : ""
  }">view the page being critiqued &rarr;</a></p>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}
