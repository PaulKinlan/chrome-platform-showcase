import { escapeHTML } from "../html.ts";
import { summarize } from "./store.ts";
import { buildTriage } from "./triage.ts";
import type { DemoTelemetryEvent } from "./types.ts";

export { escapeHTML };

export function htmlResponse(value: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(value, { ...init, headers });
}

export function renderAdminDashboard(
  events: DemoTelemetryEvent[],
  storage: "kv" | "memory",
  limit: number,
): string {
  const summary = summarize(events);
  const triage = buildTriage(events);
  const triageRows = triage.demos.slice(0, 15).map((d) => {
    const label = d.release
      ? `${d.release}/${d.featureSlug ?? ""}${d.conceptSlug ? "/" + d.conceptSlug : ""}`
      : d.key;
    const href = d.release
      ? `/${d.release}/${d.featureSlug ?? ""}${d.conceptSlug ? "/" + d.conceptSlug : ""}/`
      : "#";
    const sigs = d.topSignatures.map((s) => `${escapeHTML(s.signature)} ×${s.count}`).join("<br>");
    return `<tr>
      <td><a href="${escapeHTML(href)}">${escapeHTML(label)}</a></td>
      <td>${d.failures}</td>
      <td>${sigs || "&mdash;"}</td>
    </tr>`;
  }).join("");
  const triagePanel = triage.failures === 0
    ? '<p class="lede">No failures in this window. 🎉</p>'
    : `<table aria-label="Top failing demos">
    <thead><tr><th>demo (worst first)</th><th>failures</th><th>top signatures</th></tr></thead>
    <tbody>${triageRows}</tbody>
  </table>`;
  const rows = events.map((event) => {
    const payload = JSON.stringify(event.payload, null, 2);
    const severityClass = event.severity === "error"
      ? "bad"
      : event.severity === "warning"
      ? "warn"
      : "ok";
    return `<tr>
      <td>${escapeHTML(event.receivedAt)}</td>
      <td><span class="badge ${severityClass}">${escapeHTML(event.severity ?? "info")}</span></td>
      <td><code>${escapeHTML(event.kind)}</code></td>
      <td><a href="${escapeHTML(event.page || "#")}">${escapeHTML(event.page || "unknown")}</a></td>
      <td>${escapeHTML(event.userAgent.slice(0, 90))}</td>
      <td><details><summary>${event.bodyBytes} bytes</summary><pre>${
      escapeHTML(payload)
    }</pre></details></td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>demo telemetry admin — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1280px; }
    .summary { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); margin: var(--space-4) 0; }
    .card { border:2px solid var(--border-black); background:var(--bg-paper); padding:var(--space-3); box-shadow:var(--thin-shadow); }
    .card strong { display:block; font-family:var(--font-display); font-size:1.8rem; }
    table { width:100%; border-collapse:collapse; font-family:var(--font-mono); font-size:0.76rem; }
    th, td { border-bottom:1px solid var(--border-black); padding:0.45rem 0.55rem; text-align:left; vertical-align:top; }
    th { background:var(--bg-stone); text-transform:uppercase; letter-spacing:0.05em; font-size:0.66rem; color:var(--text-muted); }
    pre { white-space:pre-wrap; max-width:680px; overflow:auto; background:var(--bg-stone); padding:var(--space-2); }
    .badge { border:1px solid var(--border-black); padding:0.1rem 0.4rem; font-weight:700; }
    .badge.bad { color:var(--accent-rose); border-color:var(--accent-rose); }
    .badge.warn { color:var(--accent-amber); border-color:var(--accent-amber); }
    .badge.ok { color:var(--accent-emerald); border-color:var(--accent-emerald); }
    .tools { display:flex; gap:var(--space-2); flex-wrap:wrap; align-items:center; }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>
  <header class="lede-block">
    <p class="eyebrow">admin · protected</p>
    <h1>Demo telemetry events</h1>
    <p class="lede">Runtime evidence from demo pages: errors, assertions, interactions, resource failures, and selected performance signals. Event retrieval is protected by <code>showcase_password</code>.</p>
    <p class="updated-line">storage: ${
    escapeHTML(storage)
  } · showing latest ${limit} requested / ${events.length} returned</p>
  </header>
  <div class="summary">
    <div class="card"><strong>${summary.total}</strong>Total events</div>
    <div class="card"><strong>${summary.errors}</strong>Errors / failures</div>
    <div class="card"><strong>${summary.assertions}</strong>Assertions</div>
    <div class="card"><strong>${summary.pages}</strong>Pages</div>
  </div>
  <div class="tools">
    <a class="button-like" href="/telemetry/demo/events?limit=${limit}">JSON events</a>
    <a class="button-like" href="/telemetry/demo/triage">JSON triage</a>
    <a class="button-like" href="/telemetry/demo/admin?limit=50">50</a>
    <a class="button-like" href="/telemetry/demo/admin?limit=200">200</a>
  </div>
  <section>
    <h2>Triage — failing demos (worst first)</h2>
    <p class="updated-line">${triage.failures} failure signals across ${triage.scanned} flattened events in this window. Full ranking + error-signature clusters: <code>/telemetry/demo/triage?scan=2000</code>.</p>
    ${triagePanel}
  </section>
  <table aria-label="Demo telemetry events">
    <thead><tr><th>received</th><th>severity</th><th>kind</th><th>page</th><th>user agent</th><th>payload</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">No telemetry events recorded yet.</td></tr>'}</tbody>
  </table>
</main>
</body>
</html>`;
}
