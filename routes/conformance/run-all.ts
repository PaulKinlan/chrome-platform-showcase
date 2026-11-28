import type { ConformanceAssertion, ConformanceSuite } from "../../lib/conformance.ts";
import { escapeHTML } from "../html.ts";
import { BYLINE_FOOTER, renderSiteHeader } from "../pages/layout.ts";

const ROUTE_CONTEXT_PATTERN =
  /\bfetch\s*\(\s*(?:['"`]\.\.?\/|location\.href\b)|\bnew\s+URL\s*\(\s*['"`]\.\.?\/|\bdocument\.(?:featurePolicy|permissionsPolicy)\b|\bnew\s+(?:(?:globalThis|window|self)\.)?Profiler\b|\bself\.Profiler\b/;

/**
 * Pure predicate identifying assertions that rely on their own route's URL,
 * Document-Policy / Permissions-Policy headers, or page-scoped policy state
 * and must execute inside that suite's conformance page context.
 */
export function assertionNeedsRouteContext(
  assertion: Pick<ConformanceAssertion, "kind" | "test"> | null | undefined,
): boolean {
  if (!assertion || (assertion.kind !== "script" && assertion.kind !== "throws")) {
    return false;
  }
  if (typeof assertion.test !== "string" || !assertion.test) {
    return false;
  }
  return ROUTE_CONTEXT_PATTERN.test(assertion.test);
}

export interface ConformanceRunAllOptions {
  release?: string;
  allMilestones?: string[];
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

export function renderConformanceRunAllPage(
  all: ConformanceSuite[],
  opts: ConformanceRunAllOptions = {},
): string {
  const rawRelease = opts.release?.trim();
  const selectedRelease = rawRelease && rawRelease !== "all" ? rawRelease : undefined;
  const suites = selectedRelease ? all.filter((s) => s.release === selectedRelease) : all;
  const totalAssertions = suites.reduce((n, s) => n + s.assertions.length, 0);

  // Unique milestones for both the server-side filter pills and the client dropdown.
  const milestones = sortMilestonesDesc(
    opts.allMilestones ?? all.map((s) => s.release),
  );
  const loadedMilestones = sortMilestonesDesc(suites.map((s) => s.release));

  const milestonePills = [
    `<a class="pill${!selectedRelease ? " pill-active" : ""}" href="/conformance/run-all/"${
      !selectedRelease ? ' aria-current="page"' : ""
    }>All</a>`,
    ...milestones.map((m) => {
      const active = selectedRelease === m;
      const href = `/conformance/run-all/?release=${encodeURIComponent(m)}`;
      return `<a class="pill${active ? " pill-active" : ""}" href="${escapeHTML(href)}"${
        active ? ' aria-current="page"' : ""
      }>${escapeHTML(m)}</a>`;
    }),
  ].join("");

  const milestoneOptions = loadedMilestones.map((m) =>
    `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`
  ).join("");

  const jsonHref = selectedRelease
    ? `/conformance/suites.json?release=${encodeURIComponent(selectedRelease)}`
    : "/conformance/suites.json";

  const titleScope = selectedRelease ? ` (${escapeHTML(selectedRelease)})` : "";
  const eyebrowScope = selectedRelease
    ? `conformance · run all · ${escapeHTML(selectedRelease)}`
    : "conformance · run all";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>conformance run-all${titleScope} — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1200px; overflow-x: clip; }
    .table-scroll { width: 100%; min-width: 0; max-width: 100%; overflow-x: auto; contain: inline-size; box-sizing: border-box; }
    .meta { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); margin: var(--space-3) 0; display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; }
    .summary { display: flex; gap: var(--space-4); flex-wrap: wrap; margin: var(--space-3) 0 var(--space-5); }
    .stat { background: var(--bg-paper); border: 2px solid var(--border-black); box-shadow: var(--thin-shadow); padding: var(--space-3) var(--space-4); min-width: 140px; }
    .stat .n { font-family: var(--font-display); font-size: 2.2rem; color: var(--text-black); font-variant-numeric: tabular-nums; line-height: 1; }
    .stat .label { font-family: var(--font-mono); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }

    /* Milestone Filter Pills */
    .milestone-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin: 0 0 var(--space-4);
    }
    .pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      min-width: 44px;
      padding: 0.35rem 0.7rem;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      text-decoration: none;
      border: 2px solid var(--border-black);
      background: var(--bg-paper);
      color: var(--text-black);
      box-sizing: border-box;
    }
    .pill:hover {
      background: var(--bg-stone);
      color: var(--text-black);
    }
    .pill-active {
      background: var(--border-black);
      color: var(--bg-paper);
      font-weight: 700;
    }
    .pill-active:hover {
      background: var(--text-charcoal);
      color: var(--bg-paper);
    }
    .pill:focus-visible {
      outline: 2px solid var(--accent-blue);
      outline-offset: 2px;
    }

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
      color: var(--text-black);
      font-size: 0.85rem;
      min-height: 44px;
      box-sizing: border-box;
    }
    .filter-group input:focus-visible, .filter-group select:focus-visible {
      outline: 2px solid var(--accent-blue);
      outline-offset: 2px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
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
    .verdict-blocked { background: color-mix(in srgb, var(--accent-amber) 16%, var(--bg-paper)); color: var(--text-black); border-color: var(--accent-amber); }
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
<body class="shell-page">
${renderSiteHeader("conformance")}
<main id="main-content">
  <p class="crumbs"><a href="/conformance">&larr; all conformance suites</a></p>

  <header class="lede-block">
    <p class="eyebrow">${eyebrowScope}</p>
    <h1>Conformance dashboard${titleScope}</h1>
    <p class="lede">Run spec-vs-implementation probes directly in your browser context to check which contracts pass or fail. Filter by Chrome milestone for a fast focused run, or run the full catalogue. Assertions that depend on relative routes or Document-Policy headers automatically execute inside their own suite iframe.</p>
    <div class="meta">
      <span>browser: <strong id="ua">…</strong></span>
      <span>json: <a href="${escapeHTML(jsonHref)}">suites.json</a></span>
    </div>
  </header>

  <nav class="milestone-pills" aria-label="Filter suites by Chrome milestone">
    ${milestonePills}
  </nav>

  <div class="summary">
    <div class="stat"><div class="n" id="n-pass">0</div><div class="label">pass</div></div>
    <div class="stat"><div class="n" id="n-fail">0</div><div class="label">fail</div></div>
    <div class="stat"><div class="n" id="n-blocked">0</div><div class="label">blocked</div></div>
    <div class="stat"><div class="n" id="n-pct">0%</div><div class="label">pass rate (executed)</div></div>
    <div class="stat"><div class="n">${totalAssertions}</div><div class="label">total probes</div></div>
    <div class="stat"><div class="n">${suites.length}</div><div class="label">suites</div></div>
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
        <option value="all">All Loaded Milestones</option>
        ${milestoneOptions}
      </select>
    </div>
    <div class="filter-group">
      <label for="filter-verdict">Status</label>
      <select id="filter-verdict">
        <option value="all">All statuses</option>
        <option value="pass">Pass Only</option>
        <option value="fail">Fail Only</option>
        <option value="blocked">Blocked Only</option>
      </select>
    </div>
    <div class="actions">
      <button id="btn-run" class="btn">Run All Probes</button>
      <button id="btn-copy-json" class="btn">Copy JSON Report</button>
      <button id="btn-copy-failures" class="btn">Copy Failures Only</button>
    </div>
  </div>

  <div class="table-scroll" tabindex="0" role="region" aria-label="Conformance probe results">
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
  </div>

  ${BYLINE_FOOTER}
</main>

<script type="module">
import {
  assertionNeedsRouteContext,
  runConformanceAssertion,
  withProbeRejectionsCaptured,
} from "/public/conformance-runner.js";

const SUITES = ${JSON.stringify(suites).replace(/</g, "\\u003c")};

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
    const suiteUrl = suite.conceptSlug
      ? "/" + suite.release + "/" + suite.featureSlug + "/" + suite.conceptSlug + "/conformance/"
      : "/" + suite.release + "/" + suite.featureSlug + "/conformance/";

    for (const assertion of suite.assertions) {
      const specLink = assertion.specSection
        ? \` <a class="spec-link" href="\${escapeHTML(assertion.specSection)}" target="_blank" rel="noopener">spec ↗</a>\`
        : "";
      html.push(\`<tr data-index="\${index}" data-milestone="\${escapeHTML(suite.release)}" data-verdict="na">
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
        suiteUrl,
        id: assertion.id,
        description: assertion.description,
        kind: assertion.kind,
        test: assertion.test,
        expect: assertion.expect,
        ok: null,
        detail: "",
      });

      index++;
    }
  }
  if (!html.length) {
    rowsContainer.innerHTML = '<tr><td colspan="6">No conformance suites matched this filter.</td></tr>';
    return;
  }
  rowsContainer.innerHTML = html.join("");
}

populateTable();

const IFRAME_READY_TIMEOUT_MS = 10000;
const IFRAME_ASSERTION_TIMEOUT_MS = 15000;
let activeFrame = null;
let activeFrameUrl = null;
let nextRequestId = 1;

function teardownContextFrame() {
  if (activeFrame) {
    activeFrame.remove();
    activeFrame = null;
    activeFrameUrl = null;
  }
}

function ensureContextFrame(suiteUrl) {
  if (activeFrame && activeFrameUrl === suiteUrl && activeFrame.contentWindow) {
    return Promise.resolve(activeFrame);
  }
  teardownContextFrame();
  const embedUrl = suiteUrl + (suiteUrl.includes("?") ? "&embed=1" : "?embed=1");
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.tabIndex = -1;
    iframe.style.cssText =
      "position:fixed;width:1px;height:1px;top:-9999px;left:-9999px;border:0;visibility:hidden;pointer-events:none;";

    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", onReady);
    };
    const onReady = (event) => {
      if (event.origin !== location.origin) return;
      if (event.source !== iframe.contentWindow) return;
      if (!event.data || event.data.type !== "conformance-embed-ready") return;
      if (settled) return;
      settled = true;
      cleanup();
      activeFrame = iframe;
      activeFrameUrl = suiteUrl;
      resolve(iframe);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      iframe.remove();
      reject(new Error("route context iframe timed out loading " + suiteUrl));
    }, IFRAME_READY_TIMEOUT_MS);

    iframe.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      cleanup();
      iframe.remove();
      reject(new Error("route context iframe failed to load " + suiteUrl));
    });

    window.addEventListener("message", onReady);
    iframe.src = embedUrl;
    document.body.appendChild(iframe);
  });
}

async function runAssertionInRouteContext(suiteUrl, assertion) {
  let iframe;
  try {
    iframe = await ensureContextFrame(suiteUrl);
  } catch (error) {
    return {
      ok: false,
      blocked: false,
      detail: error && error.message ? error.message : String(error),
    };
  }

  const requestId = "req-" + (nextRequestId++);
  return await new Promise((resolve) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener("message", onResult);
    };
    const onResult = (event) => {
      if (event.origin !== location.origin) return;
      if (event.source !== iframe.contentWindow) return;
      const msg = event.data;
      if (!msg || msg.type !== "conformance-assertion-result" || msg.requestId !== requestId) {
        return;
      }
      if (settled) return;
      settled = true;
      cleanup();
      resolve(msg.result || { ok: false, blocked: false, detail: "empty iframe result" });
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        ok: false,
        blocked: false,
        detail: "route context assertion timed out in " + suiteUrl,
      });
    }, IFRAME_ASSERTION_TIMEOUT_MS);

    window.addEventListener("message", onResult);
    iframe.contentWindow.postMessage(
      {
        type: "conformance-run-assertion",
        requestId,
        kind: assertion.kind,
        test: assertion.test,
        expect: assertion.expect,
      },
      location.origin,
    );
  });
}

async function runAll() {
  progressContainer.style.display = "block";
  document.getElementById("btn-run").disabled = true;
  document.getElementById("btn-run").textContent = "Running...";

  let passed = 0;
  let failed = 0;
  let blocked = 0;
  const total = results.length;

  console.group("🚀 Starting Platform Showcase Conformance Probes Run");

  try {
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
          await new Promise((r) => requestAnimationFrame(r));
        }
        continue;
      }

      const outcome = assertionNeedsRouteContext(res)
        ? await runAssertionInRouteContext(res.suiteUrl, res)
        : (await withProbeRejectionsCaptured(() =>
            runConformanceAssertion(res.kind, res.test, res.expect)
          )).value;
      const { ok, blocked: isBlocked = false, detail } = outcome;
      res.ok = isBlocked ? null : ok;
      res.blocked = isBlocked;
      res.detail = detail;

      // Update UI
      const badge = row.querySelector("[data-verdict-badge]");
      badge.className = \`verdict \${isBlocked ? "verdict-blocked" : ok ? "verdict-pass" : "verdict-fail"}\`;
      badge.textContent = isBlocked ? "blocked" : ok ? "pass" : "fail";
      row.dataset.verdict = isBlocked ? "blocked" : ok ? "pass" : "fail";

      const detailCell = row.querySelector("[data-detail-cell]");
      detailCell.textContent = detail || "—";

      if (isBlocked) blocked++; else if (ok) passed++; else failed++;

      // Stats
      document.getElementById("n-pass").textContent = passed;
      document.getElementById("n-fail").textContent = failed;
      document.getElementById("n-blocked").textContent = blocked;
      const executed = passed + failed;
      document.getElementById("n-pct").textContent = executed ? (passed / executed * 100).toFixed(0) + "%" : "—";

      // Progress
      progressBar.style.width = ((i + 1) / total * 100) + "%";

      if (isBlocked) {
        console.info(\`⏸ [\${res.release}] \${res.featureSlug} / \${res.id} (\${res.kind}): \${detail}\`);
      } else if (!ok) {
        console.warn(\`❌ [\${res.release}] \${res.featureSlug} / \${res.id} (\${res.kind}): \${detail || "failed"}\`);
      }

      // Yield to avoid freezing UI
      if (i % 20 === 0) {
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
  } finally {
    teardownContextFrame();
  }

  console.groupEnd();
  const executed = passed + failed;
  console.log(\`✅ Done! Passed: \${passed}, Failed: \${failed}, Blocked: \${blocked}, Executed Pass Rate: \${executed ? ((passed / executed) * 100).toFixed(1) + "%" : "n/a"}\`);

  progressContainer.style.display = "none";
  document.getElementById("btn-run").disabled = false;
  document.getElementById("btn-run").textContent = "Run All Probes";

  applyFilters();
}

function applyFilters() {
  const q = filterSearch.value.toLowerCase();
  const milestone = filterMilestone.value;
  const verdict = filterVerdict.value;

  const rows = rowsContainer.querySelectorAll("tr[data-index]");
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
  const data = results.map((r) => ({
    release: r.release,
    feature: r.featureSlug,
    concept: r.conceptSlug,
    assertion: r.id,
    kind: r.kind,
    ok: r.ok,
    blocked: !!r.blocked,
    detail: r.detail,
  }));
  navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  alert("JSON report copied to clipboard!");
});

document.getElementById("btn-copy-failures").addEventListener("click", () => {
  const failures = results.filter((r) => r.ok === false).map((r) => ({
    release: r.release,
    feature: r.featureSlug,
    concept: r.conceptSlug,
    assertion: r.id,
    kind: r.kind,
    detail: r.detail,
  }));
  navigator.clipboard.writeText(JSON.stringify(failures, null, 2));
  alert(\`Copied \${failures.length} failures to clipboard!\`);
});

// Auto-run on load
await runAll();
</script>
</body>
</html>`;
}
