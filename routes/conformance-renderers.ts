import type { ConformanceSuite } from "../lib/conformance.ts";
import { escapeHTML } from "./html.ts";

export async function readConformance(path: string): Promise<ConformanceSuite | null> {
  try {
    const text = await Deno.readTextFile(path);
    return JSON.parse(text) as ConformanceSuite;
  } catch {
    return null;
  }
}

export async function collectConformanceSuites(): Promise<ConformanceSuite[]> {
  const out: ConformanceSuite[] = [];
  try {
    for await (const entry of Deno.readDir(".")) {
      if (!entry.isDirectory || !/^v\d+$/.test(entry.name)) continue;
      const release = entry.name;
      for await (const fd of Deno.readDir(release)) {
        if (!fd.isDirectory) continue;
        const featureSuite = await readConformance(
          `${release}/${fd.name}/conformance.json`,
        );
        if (featureSuite) out.push(featureSuite);
        try {
          for await (const cd of Deno.readDir(`${release}/${fd.name}`)) {
            if (!cd.isDirectory) continue;
            const conceptSuite = await readConformance(
              `${release}/${fd.name}/${cd.name}/conformance.json`,
            );
            if (conceptSuite) out.push(conceptSuite);
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
  return out;
}

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
    main { max-width: 1000px; }
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
  } drawn from the spec. Each is a single contract the spec text makes; the verdict reflects what THIS browser does right now. Open the page in Chrome stable / canary / Firefox / Safari to see the matrix manually.</p>
    <div class="meta">
      <span>browser: <strong id="ua">…</strong></span>
      ${
    s.specUrl
      ? `<span>spec: <a href="${escapeHTML(s.specUrl)}" target="_blank" rel="noopener">${
        escapeHTML(s.specUrl)
      }</a></span>`
      : ""
  }
      <span>chromestatus: <a href="https://chromestatus.com/feature/${s.chromestatusId}" target="_blank" rel="noopener">#${s.chromestatusId}</a></span>
      <span>generated ${escapeHTML(s.generatedAt)} by ${escapeHTML(s.author)}</span>
    </div>
  </header>

  <div class="summary">
    <div class="stat"><div class="n" id="n-pass">0</div><div class="label">pass</div></div>
    <div class="stat"><div class="n" id="n-fail">0</div><div class="label">fail</div></div>
    <div class="stat"><div class="n">${s.assertions.length}</div><div class="label">total</div></div>
  </div>

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

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>

<script>
(async () => {
  document.getElementById("ua").textContent = navigator.userAgent;
  const rows = document.querySelectorAll("#rows tr");
  let pass = 0, fail = 0;

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
        return { ok: !!resolved, detail: String(resolved) };
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
    const { ok, detail } = await runAssertion(kind, test, expect);
    const cell = row.querySelector("[data-verdict]");
    cell.classList.remove("verdict-na");
    cell.classList.add(ok ? "verdict-pass" : "verdict-fail");
    cell.textContent = ok ? "pass" : "fail";
    if (detail) row.querySelector("[data-detail]").textContent = detail;
    if (ok) pass++; else fail++;
  }
  document.getElementById("n-pass").textContent = pass;
  document.getElementById("n-fail").textContent = fail;
})();
</script>
</body>
</html>`;
}

export function renderConformanceRunAllPage(all: ConformanceSuite[]): string {
  const totalAssertions = all.reduce((n, s) => n + s.assertions.length, 0);

  // Unique milestones for the filter dropdown
  const milestones = Array.from(new Set(all.map((s) => s.release))).sort((a, b) => {
    return Number(b.slice(1)) - Number(a.slice(1));
  });

  const milestoneOptions = milestones.map((m) =>
    `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`
  ).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>conformance run-all — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1200px; }
    .meta { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); margin: var(--space-3) 0; }
    .summary { display: flex; gap: var(--space-4); flex-wrap: wrap; margin: var(--space-3) 0 var(--space-5); }
    .stat { background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); padding: var(--space-3) var(--space-4); min-width: 140px; }
    .stat .n { font-family: var(--font-display); font-size: 2.2rem; color: var(--text-black); font-variant-numeric: tabular-nums; line-height: 1; }
    .stat .label { font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
    
    /* Filter Bar Styling */
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-3);
      margin-bottom: var(--space-5);
      padding: var(--space-4);
      background: var(--bg-stone);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
      align-items: center;
    }
    .filter-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }
    .filter-group label {
      font-family: var(--font-mono);
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .filter-group input, .filter-group select {
      font-family: var(--font-sans);
      padding: 0.4rem 0.8rem;
      border: 2px solid var(--border-black);
      background: var(--bg-paper);
      font-size: 0.85rem;
    }
    .filter-group input:focus, .filter-group select:focus {
      outline: 2px solid var(--accent-blue);
    }
    .actions {
      display: flex;
      gap: var(--space-2);
      margin-left: auto;
      align-self: flex-end;
    }
    
    /* High-performance Table */
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; }
    th, td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--border-black); text-align: left; vertical-align: top; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-stone); }
    .kind { font-size: 0.72rem; color: var(--text-muted); padding: 0.1rem 0.4rem; border: 1px solid var(--border-black); background: var(--bg-stone); }
    
    /* Verdict Badges */
    .verdict { padding: 0.15rem 0.55rem; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; border: 1px solid var(--border-black); display: inline-block; }
    .verdict-pass { background: color-mix(in srgb, var(--accent-emerald) 14%, var(--bg-paper)); color: var(--accent-emerald); border-color: var(--accent-emerald); }
    .verdict-fail { background: color-mix(in srgb, var(--accent-rose) 14%, var(--bg-paper)); color: var(--accent-rose); border-color: var(--accent-rose); }
    .verdict-na { background: var(--bg-stone); color: var(--text-muted); }
    
    .detail-cell { font-size: 0.78rem; color: var(--text-muted); max-width: 320px; word-break: break-all; }
    .spec-link { font-size: 0.78rem; color: var(--accent-blue); }
    
    /* Loader */
    .progress-container {
      width: 100%;
      height: 6px;
      background: var(--bg-stone);
      border: 1px solid var(--border-black);
      margin-bottom: var(--space-5);
      overflow: hidden;
      display: none;
    }
    .progress-bar {
      height: 100%;
      background: var(--accent-blue);
      width: 0%;
      transition: width 0.1s ease-out;
    }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/conformance">&larr; all conformance suites</a></p>

  <header class="lede-block">
    <p class="eyebrow">conformance · run all</p>
    <h1>conformance dashboard</h1>
    <p class="lede">Run all spec-vs-implementation probes in this Deno instance simultaneously. Running directly in your browser context, this verifies which contracts actually pass or fail in Chrome, Firefox, Safari, or Edge instantly.</p>
    <div class="meta">
      <span>browser: <strong id="ua">…</strong></span>
    </div>
  </header>

  <div class="summary">
    <div class="stat"><div class="n" id="n-pass">0</div><div class="label">pass</div></div>
    <div class="stat"><div class="n" id="n-fail">0</div><div class="label">fail</div></div>
    <div class="stat"><div class="n" id="n-pct">0%</div><div class="label">pass rate</div></div>
    <div class="stat"><div class="n">${totalAssertions}</div><div class="label">total probes</div></div>
    <div class="stat"><div class="n">${all.length}</div><div class="label">suites</div></div>
  </div>

  <div class="progress-container" id="progress-container">
    <div class="progress-bar" id="progress-bar"></div>
  </div>

  <div class="filter-bar">
    <div class="filter-group">
      <label for="filter-search">Search Probes</label>
      <input type="text" id="filter-search" placeholder="e.g., gpu, css-gap...">
    </div>
    <div class="filter-group">
      <label for="filter-milestone">Milestone</label>
      <select id="filter-milestone">
        <option value="all">All Milestones</option>
        ${milestoneOptions}
      </select>
    </div>
    <div class="filter-group">
      <label for="filter-verdict">Status</label>
      <select id="filter-verdict">
        <option value="all">All (Pass & Fail)</option>
        <option value="pass">Pass Only</option>
        <option value="fail">Fail Only</option>
      </select>
    </div>
    <div class="actions">
      <button id="btn-run" class="btn">Run All Probes</button>
      <button id="btn-copy-json" class="btn">Copy JSON Report</button>
      <button id="btn-copy-failures" class="btn">Copy Failures Only</button>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>feature / suite</th>
        <th>probe id</th>
        <th>contract assertion</th>
        <th>kind</th>
        <th>verdict</th>
        <th>detail</th>
      </tr>
    </thead>
    <tbody id="rows">
      <!-- Rows dynamically populated in JS -->
    </tbody>
  </table>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>

<script>
(async () => {
  const SUITES = ${JSON.stringify(all).replace(/</g, "\\u003c")};
  
  document.getElementById("ua").textContent = navigator.userAgent;
  const chromeMajor = Number(
    (navigator.userAgent.match(/(?:Chrome|HeadlessChrome)\\/(\\d+)/) || [])[1] || 0
  );
  
  const rowsContainer = document.getElementById("rows");
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  
  const filterSearch = document.getElementById("filter-search");
  const filterMilestone = document.getElementById("filter-milestone");
  const filterVerdict = document.getElementById("filter-verdict");
  
  let results = []; // holds flat assertion results

  function escapeHTML(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  
  // Populate Table Rows Initially
  function populateTable() {
    let index = 0;
    const html = [];
    for (const suite of SUITES) {
      const suiteLabel = suite.conceptSlug 
        ? suite.release + " · " + suite.featureSlug + " / " + suite.conceptSlug
        : suite.release + " · " + suite.featureSlug;
      
      const suiteUrl = suite.conceptSlug 
        ? "/" + suite.release + "/" + suite.featureSlug + "/" + suite.conceptSlug + "/conformance/"
        : "/" + suite.release + "/" + suite.featureSlug + "/conformance/";
      
      for (const assertion of suite.assertions) {
        const specLink = assertion.specSection
          ? \` <a class="spec-link" href="\${escapeHTML(assertion.specSection)}" target="_blank" rel="noopener">spec ↗</a>\`
          : "";
        html.push(\`<tr data-index="\${index}" data-milestone="\${suite.release}" data-verdict="na">
          <td><a href="\${escapeHTML(suiteUrl)}" target="_blank" rel="noopener"><strong>\${escapeHTML(suite.release)}</strong> · \${escapeHTML(suite.featureSlug)}</a></td>
          <td><code>\${escapeHTML(assertion.id)}</code></td>
          <td>\${escapeHTML(assertion.description)}\${specLink}</td>
          <td><span class="kind">\${escapeHTML(assertion.kind)}</span></td>
          <td class="verdict-cell"><span class="verdict verdict-na" data-verdict-badge>pending</span></td>
          <td class="detail-cell" data-detail-cell>—</td>
        </tr>\`);
        
        results.push({
          release: suite.release,
          featureSlug: suite.featureSlug,
          conceptSlug: suite.conceptSlug,
          id: assertion.id,
          description: assertion.description,
          kind: assertion.kind,
          test: assertion.test,
          expect: assertion.expect,
          ok: null,
          detail: ""
        });
        
        index++;
      }
    }
    rowsContainer.innerHTML = html.join("");
  }
  
  populateTable();
  
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
        return { ok: !!CSS.supports(test), detail: "" };
      }
      if (kind === "exists") {
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
        const result = new Function("return (" + test + ")")();
        const resolved = (result instanceof Promise) ? await result : result;
        return { ok: !!resolved, detail: String(resolved) };
      }
      if (kind === "throws") {
        try {
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
  
  async function runAll() {
    progressContainer.style.display = "block";
    document.getElementById("btn-run").disabled = true;
    document.getElementById("btn-run").textContent = "Running...";
    
    let passed = 0;
    let failed = 0;
    const total = results.length;
    
    console.group("🚀 Starting Platform Showcase Conformance Probes Run");
    
    for (let i = 0; i < total; i++) {
      const res = results[i];
      const row = rowsContainer.querySelector(\`tr[data-index="\${i}"]\`);
      const releaseNumber = Number(String(res.release).replace(/^v/, ""));

      if (chromeMajor && releaseNumber > chromeMajor) {
        res.ok = null;
        res.detail = \`future milestone for Chrome \${chromeMajor}\`;

        const badge = row.querySelector("[data-verdict-badge]");
        badge.className = "verdict verdict-na";
        badge.textContent = "future";
        row.dataset.verdict = "na";

        const detailCell = row.querySelector("[data-detail-cell]");
        detailCell.textContent = res.detail;

        progressBar.style.width = ((i + 1) / total * 100) + "%";
        if (i % 20 === 0) {
          await new Promise(r => requestAnimationFrame(r));
        }
        continue;
      }
      
      const { ok, detail } = await runAssertion(res.kind, res.test, res.expect);
      res.ok = ok;
      res.detail = detail;
      
      // Update UI
      const badge = row.querySelector("[data-verdict-badge]");
      badge.className = \`verdict \${ok ? 'verdict-pass' : 'verdict-fail'}\`;
      badge.textContent = ok ? "pass" : "fail";
      row.dataset.verdict = ok ? "pass" : "fail";
      
      const detailCell = row.querySelector("[data-detail-cell]");
      detailCell.textContent = detail || "—";
      
      if (ok) passed++; else failed++;
      
      // Stats
      document.getElementById("n-pass").textContent = passed;
      document.getElementById("n-fail").textContent = failed;
      document.getElementById("n-pct").textContent = ((passed / (passed + failed)) * 100).toFixed(0) + "%";
      
      // Progress
      progressBar.style.width = ((i + 1) / total * 100) + "%";
      
      if (!ok) {
        console.warn(\`❌ [\${res.release}] \${res.featureSlug} / \${res.id} (\${res.kind}): \${detail || "failed"}\`);
      }
      
      // Yield to avoid freezing UI
      if (i % 20 === 0) {
        await new Promise(r => requestAnimationFrame(r));
      }
    }
    
    console.groupEnd();
    console.log(\`✅ Done! Passed: \${passed}, Failed: \${failed}, Pass Rate: \${((passed / total) * 100).toFixed(1)}%\`);
    
    progressContainer.style.display = "none";
    document.getElementById("btn-run").disabled = false;
    document.getElementById("btn-run").textContent = "Run All Probes";
    
    applyFilters();
  }
  
  function applyFilters() {
    const q = filterSearch.value.toLowerCase();
    const milestone = filterMilestone.value;
    const verdict = filterVerdict.value;
    
    const rows = rowsContainer.querySelectorAll("tr");
    for (const row of rows) {
      const index = Number(row.dataset.index);
      const res = results[index];
      
      const matchesSearch = !q || 
        res.featureSlug.toLowerCase().includes(q) ||
        res.id.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q);
      
      const matchesMilestone = milestone === "all" || res.release === milestone;
      const matchesVerdict = verdict === "all" || row.dataset.verdict === verdict;
      
      if (matchesSearch && matchesMilestone && matchesVerdict) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    }
  }
  
  // Filters & Search Listeners
  filterSearch.addEventListener("input", applyFilters);
  filterMilestone.addEventListener("change", applyFilters);
  filterVerdict.addEventListener("change", applyFilters);
  
  document.getElementById("btn-run").addEventListener("click", runAll);
  
  document.getElementById("btn-copy-json").addEventListener("click", () => {
    const data = results.map(r => ({
      release: r.release,
      feature: r.featureSlug,
      concept: r.conceptSlug,
      assertion: r.id,
      kind: r.kind,
      ok: r.ok,
      detail: r.detail
    }));
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert("JSON report copied to clipboard!");
  });
  
  document.getElementById("btn-copy-failures").addEventListener("click", () => {
    const failures = results.filter(r => r.ok === false).map(r => ({
      release: r.release,
      feature: r.featureSlug,
      concept: r.conceptSlug,
      assertion: r.id,
      kind: r.kind,
      detail: r.detail
    }));
    navigator.clipboard.writeText(JSON.stringify(failures, null, 2));
    alert(\`Copied \${failures.length} failures to clipboard!\`);
  });
  
  // Auto-run on load
  await runAll();
})();
</script>
</body>
</html>`;
}

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
    main { max-width: 1000px; }
    table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.85rem; }
    th, td { padding: 0.55rem 0.7rem; border-bottom: 1px solid var(--border-black); text-align: left; vertical-align: top; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); background: var(--bg-stone); }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .kind { font-size: 0.72rem; color: var(--text-muted); padding: 0.05rem 0.35rem; border: 1px solid var(--border-black); background: var(--bg-stone); margin-right: 0.2rem; }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>
  <header class="lede-block">
    <p class="eyebrow">conformance</p>
    <h1>spec-vs-implementation probes</h1>
    <p class="lede">Each suite is a list of assertions drawn from the spec text. Click into one and your browser runs the assertions live — Chrome stable, Chrome canary, Firefox, and Safari each give their own verdict. This is the live "does it actually work the way the spec says" matrix.</p>
    <p class="updated-line">${all.length} suite${
    all.length === 1 ? "" : "s"
  } · ${totalAssertions} total assertion${totalAssertions === 1 ? "" : "s"}</p>
  </header>

  <table>
    <thead><tr><th>page</th><th>assertions</th><th>kinds</th></tr></thead>
    <tbody>${
    rows ||
    `<tr><td colspan="3">No conformance suites yet. Generate them with the conformance-author subagent.</td></tr>`
  }</tbody>
  </table>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}
