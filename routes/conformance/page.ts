import type { ConformanceSuite } from "../../lib/conformance.ts";
import { escapeHTML } from "../html.ts";

export function renderConformancePage(s: ConformanceSuite): string {
  const label = s.conceptSlug
    ? `${s.release} · ${s.featureSlug} / ${s.conceptSlug}`
    : `${s.release} · ${s.featureSlug}`;
  const back = s.conceptSlug
    ? `/${s.release}/${s.featureSlug}/${s.conceptSlug}/`
    : `/${s.release}/${s.featureSlug}/`;

  const rows = s.assertions.map((a) => {
    return `<tr data-id="${escapeHTML(a.id)}" data-kind="${escapeHTML(a.kind)}" data-test="${
      escapeHTML(a.test)
    }"${a.expect ? ` data-expect="${escapeHTML(a.expect)}"` : ""}>
      <td><code>${escapeHTML(a.id)}</code></td>
      <td>${escapeHTML(a.description)}${
      a.specSection
        ? ` <a class="spec-link" href="${
          escapeHTML(a.specSection)
        }" target="_blank" rel="noopener">spec ↗</a>`
        : ""
    }</td>
      <td><span class="kind">${escapeHTML(a.kind)}</span></td>
      <td class="verdict-cell"><span class="verdict verdict-na" data-verdict>…</span></td>
      <td class="detail-cell" data-detail></td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>conformance — ${escapeHTML(label)}</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1000px; overflow-x: clip; }
    .table-scroll { width: 100%; min-width: 0; max-width: 100%; overflow-x: auto; contain: inline-size; box-sizing: border-box; }
    .meta { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); display: flex; gap: var(--space-3); flex-wrap: wrap; margin: var(--space-3) 0; }
    .summary { display: flex; gap: var(--space-4); flex-wrap: wrap; margin: var(--space-3) 0 var(--space-5); }
    .stat { background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); padding: var(--space-3) var(--space-4); min-width: 120px; }
    .stat .n { font-family: var(--font-display); font-size: 2.2rem; color: var(--text-black); font-variant-numeric: tabular-nums; line-height: 1; }
    .stat .label { font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; }
    th, td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--border-black); text-align: left; vertical-align: top; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-stone); }
    .kind { font-size: 0.72rem; color: var(--text-muted); padding: 0.1rem 0.4rem; border: 1px solid var(--border-black); background: var(--bg-stone); }
    .verdict { padding: 0.15rem 0.55rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--border-black); }
    .verdict-pass { background: color-mix(in srgb, var(--accent-emerald) 14%, var(--bg-paper)); color: var(--accent-emerald); border-color: var(--accent-emerald); }
    .verdict-fail { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .verdict-blocked { background: color-mix(in srgb, var(--accent-amber) 16%, var(--bg-paper)); color: var(--text-black); border-color: var(--accent-amber); }
    .verdict-na { background: var(--bg-stone); color: var(--text-muted); }
    .detail-cell { font-size: 0.78rem; color: var(--text-muted); max-width: 260px; word-break: break-word; }
    .spec-link { font-size: 0.78rem; color: var(--accent-blue); }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="${escapeHTML(back)}">&larr; back to ${escapeHTML(label)}</a></p>

  <header class="lede-block">
    <p class="eyebrow">conformance · ${escapeHTML(s.release)}</p>
    <h1>${escapeHTML(label)} — conformance probe</h1>
    <p class="lede">${s.assertions.length} assertion${
    s.assertions.length === 1 ? "" : "s"
  } drawn from the spec. Each is a single contract the spec text makes. Pass/fail reflects what this browser executed; blocked means the contract was not run because it needs user mediation, hardware, or another unavailable precondition. Open the page in Chrome stable / canary / Firefox / Safari to compare.</p>
    <div class="meta">
      <span>browser: <strong id="ua">…</strong></span>
      ${
    s.specUrl
      ? `<span>spec: <a href="${escapeHTML(s.specUrl)}" target="_blank" rel="noopener">${
        escapeHTML(s.specUrl)
      }</a></span>`
      : ""
  }
      <span>chromestatus: <a href="${
    escapeHTML(`https://chromestatus.com/feature/${s.chromestatusId}`)
  }" target="_blank" rel="noopener">#${escapeHTML(String(s.chromestatusId))}</a></span>
      <span>generated ${escapeHTML(s.generatedAt)} by ${escapeHTML(s.author)}</span>
    </div>
  </header>

  <div class="summary">
    <div class="stat"><div class="n" id="n-pass">0</div><div class="label">pass</div></div>
    <div class="stat"><div class="n" id="n-fail">0</div><div class="label">fail</div></div>
    <div class="stat"><div class="n" id="n-blocked">0</div><div class="label">blocked</div></div>
    <div class="stat"><div class="n">${s.assertions.length}</div><div class="label">total</div></div>
  </div>

  <div class="table-scroll" tabindex="0" role="region" aria-label="Conformance assertion results">
  <table>
    <thead>
      <tr>
        <th>id</th>
        <th>contract</th>
        <th>kind</th>
        <th>verdict</th>
        <th>detail</th>
      </tr>
    </thead>
    <tbody id="rows">${rows}</tbody>
  </table>
  </div>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>

<script>
(async () => {
  document.getElementById("ua").textContent = navigator.userAgent;
  const rows = document.querySelectorAll("#rows tr");
  let pass = 0, fail = 0, blocked = 0;

  async function runAssertion(kind, test, expect) {
    try {
      function propertyDescriptor(target, property) {
        let cur = Object(target);
        while (cur) {
          const descriptor = Object.getOwnPropertyDescriptor(cur, property);
          if (descriptor) return descriptor;
          cur = Object.getPrototypeOf(cur);
        }
        return undefined;
      }

      if (kind === "css-supports") {
        // CSS.supports accepts either ("prop: value") or ("prop", "value");
        // we pass the raw declaration form.
        return { ok: !!CSS.supports(test), detail: "" };
      }
      if (kind === "exists") {
        // Walk a dotted path against the global.
        const parts = test.split(".");
        let cur = globalThis;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (cur == null) return { ok: false, detail: "missing at " + p };
          if (i === parts.length - 1) {
            const ok = p in Object(cur);
            return { ok, detail: ok ? "" : "undefined" };
          }
          cur = cur[p];
        }
        return { ok: false, detail: "empty path" };
      }
      if (kind === "typeof") {
        const parts = test.split(".");
        let cur = globalThis;
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
          if (cur == null) return { ok: false, detail: "missing at " + p };
          if (i === parts.length - 1) {
            let actual;
            try {
              actual = typeof cur[p];
            } catch (e) {
              const descriptor = propertyDescriptor(cur, p);
              if (!descriptor) throw e;
              actual = "value" in descriptor ? typeof descriptor.value : "accessor";
            }
            return { ok: actual === expect, detail: "typeof = " + actual };
          }
          cur = cur[p];
        }
        return { ok: false, detail: "empty path" };
      }
      if (kind === "script") {
        // eslint-disable-next-line no-new-func
        const result = new Function("return (" + test + ")")();
        const resolved = (result instanceof Promise) ? await result : result;
        return { ok: !!resolved, blocked: false, detail: String(resolved) };
      }
      if (kind === "manual") {
        return { ok: false, blocked: true, detail: test };
      }
      if (kind === "throws") {
        try {
          // eslint-disable-next-line no-new-func
          const result = new Function("return (" + test + ")")();
          const resolved = (result instanceof Promise) ? await result : result;
          return { ok: false, detail: "no throw (resolved to " + resolved + ")" };
        } catch (e) {
          return { ok: true, detail: e && e.name ? e.name : "threw" };
        }
      }
      return { ok: false, detail: "unknown kind" };
    } catch (e) {
      return { ok: false, detail: (e && e.message) ? e.message : String(e) };
    }
  }

  for (const row of rows) {
    const kind = row.dataset.kind;
    const test = row.dataset.test;
    const expect = row.dataset.expect;
    const { ok, blocked: isBlocked = false, detail } = await runAssertion(kind, test, expect);
    const cell = row.querySelector("[data-verdict]");
    cell.classList.remove("verdict-na");
    cell.classList.add(isBlocked ? "verdict-blocked" : ok ? "verdict-pass" : "verdict-fail");
    cell.textContent = isBlocked ? "blocked" : ok ? "pass" : "fail";
    if (detail) row.querySelector("[data-detail]").textContent = detail;
    if (isBlocked) blocked++; else if (ok) pass++; else fail++;
  }
  document.getElementById("n-pass").textContent = pass;
  document.getElementById("n-fail").textContent = fail;
  document.getElementById("n-blocked").textContent = blocked;
})();
</script>
</body>
</html>`;
}
