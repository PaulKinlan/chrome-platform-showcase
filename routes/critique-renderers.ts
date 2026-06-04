import type { CritiqueReport } from "../lib/critique.ts";
import { scoreVerdicts } from "../lib/critique.ts";
import { escapeHTML } from "./html.ts";

export async function readCritique(path: string): Promise<CritiqueReport | null> {
  try {
    const text = await Deno.readTextFile(path);
    return JSON.parse(text) as CritiqueReport;
  } catch {
    return null;
  }
}

async function collectCritiques(): Promise<CritiqueReport[]> {
  const out: CritiqueReport[] = [];
  try {
    for await (const entry of Deno.readDir(".")) {
      if (!entry.isDirectory || !/^v\d+$/.test(entry.name)) continue;
      const release = entry.name;
      for await (const fd of Deno.readDir(release)) {
        if (!fd.isDirectory) continue;
        const featureSlug = fd.name;
        const featureCrit = await readCritique(`${release}/${featureSlug}/_questions.json`);
        if (featureCrit) out.push(featureCrit);
        try {
          for await (const cd of Deno.readDir(`${release}/${featureSlug}`)) {
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
  return out;
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

export async function renderCritiquesIndex(): Promise<string> {
  const all = await collectCritiques();
  // Sort by lowest ratio first — most needy at the top.
  const scored = all.map((c) => ({ c, s: scoreVerdicts(c.rubric) }));
  scored.sort((a, b) => a.s.ratio - b.s.ratio);

  let totalQuestions = 0;
  let totalConcepts = 0;
  for (const { c } of scored) {
    totalQuestions += c.openQuestions.length;
    if (c.conceptSlug) totalConcepts++;
  }

  const rows = scored.map(({ c, s }) => {
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
        `<span class="qchip qchip-${q.severity ?? "minor"}">${escapeHTML(q.title)}</span>`
      ).join("")
    }</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>self-critique — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1100px; }
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
    <p class="eyebrow">self-critique</p>
    <h1>open questions</h1>
    <p class="lede">A second pair of eyes on every concept page. A reviewer agent reads each page cold against the rubric (does the demo demonstrate what the spec promises? edge cases? interactive surface? blurb match? references? design system?) and writes the verdict plus follow-up work items here. The list below is sorted weakest first so the next routine fire knows where to focus.</p>
    <p class="updated-line">${scored.length} pages reviewed · ${totalConcepts} concepts · ${totalQuestions} open questions</p>
  </header>

  <table>
    <thead>
      <tr>
        <th>page</th>
        <th>rubric score</th>
        <th>open</th>
        <th>questions</th>
      </tr>
    </thead>
    <tbody>${
    rows ||
    `<tr><td colspan="4">No critiques yet. Run the reviewer pass to populate this page.</td></tr>`
  }</tbody>
  </table>

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
          q.severity ? ` <span class="qchip qchip-${q.severity}">${q.severity}</span>` : ""
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

  <p><a href="https://chromestatus.com/feature/${c.chromestatusId}" target="_blank" rel="noopener">ChromeStatus #${c.chromestatusId}</a> · <a href="/${
    escapeHTML(c.release)
  }/${escapeHTML(c.featureSlug)}/${
    c.conceptSlug ? escapeHTML(c.conceptSlug) + "/" : ""
  }">view the page being critiqued &rarr;</a></p>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}
