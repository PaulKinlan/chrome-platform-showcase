type JsonRecord = Record<string, unknown>;

interface DemoTelemetryEvent {
  id: string;
  receivedAt: string;
  kind: string;
  page: string;
  release: string | null;
  featureSlug: string | null;
  conceptSlug: string | null;
  severity: string | null;
  userAgent: string;
  bodyBytes: number;
  payload: JsonRecord;
}

interface MinimalKv {
  set(key: unknown[], value: unknown, options?: { expireIn?: number }): Promise<unknown>;
  list<T = unknown>(
    options: { prefix: unknown[]; reverse?: boolean; limit?: number },
  ): AsyncIterable<{
    key: unknown[];
    value: T;
  }>;
}

// KV events self-expire so the store does not grow unbounded (there is no reader that would
// otherwise prune it). 90 days is plenty for weekly triage while keeping a month-plus of trend.
const TELEMETRY_TTL_MS = 90 * 24 * 60 * 60 * 1000;

const recentDemoTelemetry: DemoTelemetryEvent[] = [];
const allowedSeverities = new Set(["info", "warning", "error"]);
const allowedKinds = new Set([
  "demo.batch",
  "page.load",
  "console.error",
  "console.warn",
  "runtime.error",
  "runtime.unhandledrejection",
  "resource.error",
  "interaction.click",
  "interaction.submit",
  "perf.lcp",
  "perf.cls-shift",
  "perf.slow-interaction",
  "perf.long-animation-frame",
  "assert.pass",
  "assert.fail",
  "browser.report",
]);
let kvPromise: Promise<MinimalKv | null> | null = null;

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(value, null, 2), { ...init, headers });
}

function htmlResponse(value: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(value, { ...init, headers });
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function stringValue(value: unknown, max = 500): string | null {
  if (typeof value !== "string") return null;
  return value.slice(0, max);
}

function randomId(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function configuredPassword(): string | null {
  return Deno.env.get("showcase_password") || Deno.env.get("SHOWCASE_PASSWORD") || null;
}

function unauthorizedResponse(): Response {
  return jsonResponse({
    error: "Telemetry events require the showcase_password environment variable.",
  }, {
    status: 401,
    headers: {
      "www-authenticate": 'Basic realm="chrome-platform-showcase telemetry", charset="UTF-8"',
    },
  });
}

function forbiddenResponse(reason: string): Response {
  return jsonResponse({ error: reason }, { status: 403 });
}

function isAuthorized(req: Request): boolean {
  const password = configuredPassword();
  if (!password) return false;
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("basic ")) return false;
  try {
    const decoded = atob(auth.slice(6).trim());
    const separator = decoded.indexOf(":");
    const supplied = separator === -1 ? decoded : decoded.slice(separator + 1);
    return supplied === password;
  } catch {
    return false;
  }
}

function getDemoKv(): Promise<MinimalKv | null> {
  if (kvPromise) return kvPromise;
  kvPromise = (async () => {
    const maybeDeno = Deno as unknown as { openKv?: () => Promise<MinimalKv> };
    if (typeof maybeDeno.openKv !== "function") return null;
    try {
      return await maybeDeno.openKv();
    } catch {
      return null;
    }
  })();
  return kvPromise;
}

function parsePageParts(page: string): {
  release: string | null;
  featureSlug: string | null;
  conceptSlug: string | null;
} {
  const parts = page.split("/").filter(Boolean);
  if (!/^v\d+$/.test(parts[0] ?? "")) {
    return { release: null, featureSlug: null, conceptSlug: null };
  }
  return {
    release: parts[0] ?? null,
    featureSlug: parts[1] ?? null,
    conceptSlug: parts[2] && !parts[2].includes(".") ? parts[2] : null,
  };
}

function sanitizePayload(payload: JsonRecord): JsonRecord {
  const sanitized: JsonRecord = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") sanitized[key] = value.slice(0, 2000);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.slice(0, 100).map((item) => objectValue(item));
    } else if (value && typeof value === "object") {
      sanitized[key] = objectValue(value);
    }
  }
  return sanitized;
}

function sameOriginTelemetry(req: Request, url: URL): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite && !["same-origin", "none"].includes(secFetchSite)) return false;
  const origin = req.headers.get("origin");
  return !origin || origin === url.origin;
}

function validPagePath(page: string): boolean {
  return /^\/v\d+\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)?\/?$/.test(page) ||
    page === "/" || page === "";
}

function normalizeTelemetryPayload(payload: JsonRecord): JsonRecord | null {
  const kind = stringValue(payload.kind, 80) ?? "demo.telemetry";
  if (!allowedKinds.has(kind)) return null;
  const severity = stringValue(payload.severity, 40);
  if (severity && !allowedSeverities.has(severity)) return null;
  const page = stringValue(payload.page, 1000) ?? "";
  if (!validPagePath(page)) return null;

  if (kind === "demo.batch") {
    const events = Array.isArray(payload.events) ? payload.events.slice(0, 80) : [];
    const validEvents = events
      .map((event) => normalizeTelemetryPayload(objectValue(event)))
      .filter((event): event is JsonRecord => Boolean(event));
    return sanitizePayload({
      ...payload,
      kind,
      severity: severity ?? "info",
      page,
      events: validEvents,
    });
  }

  return sanitizePayload({ ...payload, kind, severity: severity ?? "info", page });
}

function normalizeBrowserReportPayload(payload: unknown): JsonRecord {
  const reports = Array.isArray(payload) ? payload : [payload];
  return sanitizePayload({
    kind: "browser.report",
    severity: "warning",
    page: "",
    reports: reports.slice(0, 20).map((report) => objectValue(report)),
  });
}

async function storeTelemetryEvent(event: DemoTelemetryEvent): Promise<void> {
  recentDemoTelemetry.unshift(event);
  recentDemoTelemetry.splice(100);

  const kv = await getDemoKv();
  if (!kv) return;
  const day = event.receivedAt.slice(0, 10);
  await kv.set(["demo-telemetry", day, event.receivedAt, event.id], event, {
    expireIn: TELEMETRY_TTL_MS,
  });
}

async function readRecentEvents(
  limit: number,
): Promise<{ storage: "kv" | "memory"; events: DemoTelemetryEvent[] }> {
  const kv = await getDemoKv();
  if (!kv) return { storage: "memory", events: recentDemoTelemetry.slice(0, limit) };
  const events: DemoTelemetryEvent[] = [];
  for await (
    const entry of kv.list<DemoTelemetryEvent>({ prefix: ["demo-telemetry"], reverse: true, limit })
  ) {
    events.push(entry.value);
  }
  return { storage: "kv", events };
}

function summarize(events: DemoTelemetryEvent[]): {
  total: number;
  errors: number;
  assertions: number;
  pages: number;
} {
  const pages = new Set(events.map((event) => event.page));
  return {
    total: events.length,
    errors: events.filter((event) => event.severity === "error" || event.kind.includes("error"))
      .length,
    assertions: events.filter((event) => event.kind.startsWith("assert.")).length,
    pages: pages.size,
  };
}

interface FlatEvent {
  receivedAt: string;
  kind: string;
  severity: string | null;
  page: string;
  release: string | null;
  featureSlug: string | null;
  conceptSlug: string | null;
  signature: string;
}

// Client telemetry arrives batched: a stored `demo.batch` event carries the real console/runtime/
// assert events in `payload.events[]`. Flatten so triage sees the individual signals, not the wrapper.
function flattenEvents(stored: DemoTelemetryEvent[]): FlatEvent[] {
  const flat: FlatEvent[] = [];
  const push = (
    kind: string,
    severity: string | null,
    page: string,
    receivedAt: string,
    payload: JsonRecord,
  ) => {
    const parts = parsePageParts(page);
    flat.push({
      receivedAt,
      kind,
      severity,
      page,
      release: parts.release,
      featureSlug: parts.featureSlug,
      conceptSlug: parts.conceptSlug,
      signature: eventSignature(kind, payload),
    });
  };
  for (const event of stored) {
    if (event.kind === "demo.batch" && Array.isArray(event.payload.events)) {
      for (const raw of event.payload.events as unknown[]) {
        const inner = objectValue(raw);
        const kind = stringValue(inner.kind, 80) ?? "demo.telemetry";
        const page = stringValue(inner.page, 1000) || event.page;
        push(kind, stringValue(inner.severity, 40), page, event.receivedAt, inner);
      }
    } else {
      push(event.kind, event.severity, event.page, event.receivedAt, event.payload);
    }
  }
  return flat;
}

// A stable, human-readable label for grouping like errors across many visitors.
function eventSignature(kind: string, payload: JsonRecord): string {
  const candidate = stringValue(payload.message, 300) ??
    stringValue(payload.reason, 300) ??
    stringValue(payload.id, 300) ??
    stringValue(payload.detail, 300) ??
    stringValue(payload.text, 300) ??
    stringValue(payload.url, 300) ??
    "";
  // Collapse volatile bits (numbers, hex ids, urls' query) so the same error clusters together.
  const normalized = candidate
    .replace(/https?:\/\/[^\s)]+/g, (u) => u.split("?")[0])
    .replace(/0x[0-9a-f]+/gi, "0x…")
    .replace(/\b\d[\d.,:]*\b/g, "#")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? `${kind}: ${normalized}`.slice(0, 200) : kind;
}

function isFailure(event: FlatEvent): boolean {
  return event.severity === "error" ||
    event.kind.includes("error") ||
    event.kind === "assert.fail" ||
    event.kind === "runtime.unhandledrejection" ||
    event.kind === "resource.error";
}

interface TriageGroup {
  key: string;
  release: string | null;
  featureSlug: string | null;
  conceptSlug: string | null;
  failures: number;
  kinds: Record<string, number>;
  topSignatures: { signature: string; count: number }[];
}

function buildTriage(stored: DemoTelemetryEvent[]): {
  scanned: number;
  failures: number;
  demos: TriageGroup[];
  signatures: { signature: string; count: number; demos: string[] }[];
} {
  const flat = flattenEvents(stored);
  const failures = flat.filter(isFailure);
  const byDemo = new Map<string, {
    group: TriageGroup;
    sigs: Map<string, number>;
  }>();
  const bySignature = new Map<string, { count: number; demos: Set<string> }>();

  for (const f of failures) {
    const demoKey = f.release
      ? [f.release, f.featureSlug ?? "", f.conceptSlug ?? ""].join("/")
      : f.page || "(unknown)";
    let entry = byDemo.get(demoKey);
    if (!entry) {
      entry = {
        group: {
          key: demoKey,
          release: f.release,
          featureSlug: f.featureSlug,
          conceptSlug: f.conceptSlug,
          failures: 0,
          kinds: {},
          topSignatures: [],
        },
        sigs: new Map(),
      };
      byDemo.set(demoKey, entry);
    }
    entry.group.failures++;
    entry.group.kinds[f.kind] = (entry.group.kinds[f.kind] ?? 0) + 1;
    entry.sigs.set(f.signature, (entry.sigs.get(f.signature) ?? 0) + 1);

    const sig = bySignature.get(f.signature) ?? { count: 0, demos: new Set<string>() };
    sig.count++;
    sig.demos.add(demoKey);
    bySignature.set(f.signature, sig);
  }

  const demos = [...byDemo.values()]
    .map(({ group, sigs }) => {
      group.topSignatures = [...sigs.entries()]
        .map(([signature, count]) => ({ signature, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      return group;
    })
    .sort((a, b) => b.failures - a.failures);

  const signatures = [...bySignature.entries()]
    .map(([signature, v]) => ({ signature, count: v.count, demos: [...v.demos].slice(0, 10) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return { scanned: flat.length, failures: failures.length, demos, signatures };
}

function renderAdminDashboard(
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

export async function handleDemoTelemetryRoute(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  if (!url.pathname.startsWith("/telemetry/demo")) return null;

  if (url.pathname === "/telemetry/demo/events" && req.method === "GET") {
    if (!isAuthorized(req)) return unauthorizedResponse();
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 1000);
    return jsonResponse(await readRecentEvents(limit));
  }

  if (url.pathname === "/telemetry/demo/admin" && req.method === "GET") {
    if (!isAuthorized(req)) return unauthorizedResponse();
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 1000);
    const { storage, events } = await readRecentEvents(limit);
    return htmlResponse(renderAdminDashboard(events, storage, limit));
  }

  if (url.pathname === "/telemetry/demo/triage" && req.method === "GET") {
    if (!isAuthorized(req)) return unauthorizedResponse();
    const scan = Math.min(Number(url.searchParams.get("scan") ?? 2000), 5000);
    const { storage, events } = await readRecentEvents(scan);
    const triage = buildTriage(events);
    return jsonResponse({ storage, window: events.length, ...triage });
  }

  if (url.pathname === "/telemetry/demo/reset" && req.method === "POST") {
    if (!isAuthorized(req)) return unauthorizedResponse();
    recentDemoTelemetry.splice(0);
    return jsonResponse({
      reset: true,
      note: "In-memory telemetry cleared. KV history is retained.",
    });
  }

  if (url.pathname === "/telemetry/demo/report" && req.method === "POST") {
    if (!sameOriginTelemetry(req, url)) {
      return forbiddenResponse("Cross-site reports are not accepted.");
    }
    const text = await req.text();
    const bodyBytes = new TextEncoder().encode(text).byteLength;
    if (bodyBytes > 128 * 1024) {
      return jsonResponse({ error: "Report payload too large." }, { status: 413 });
    }
    let payload: JsonRecord = { kind: "browser.report", severity: "warning", page: "" };
    try {
      payload = normalizeBrowserReportPayload(JSON.parse(text || "[]"));
    } catch {
      payload = normalizeBrowserReportPayload({ type: "unparseable-report" });
    }
    const event: DemoTelemetryEvent = {
      id: randomId(),
      receivedAt: new Date().toISOString(),
      kind: "browser.report",
      page: "",
      release: null,
      featureSlug: null,
      conceptSlug: null,
      severity: "warning",
      userAgent: req.headers.get("user-agent") ?? "",
      bodyBytes,
      payload,
    };
    await storeTelemetryEvent(event);
    return jsonResponse({ accepted: true }, { status: 202 });
  }

  if (url.pathname !== "/telemetry/demo") return null;

  if (req.method === "GET") {
    return jsonResponse({
      endpoint: "/telemetry/demo",
      post: "POST a JSON telemetry payload from /public/demo-telemetry.js.",
      admin: "/telemetry/demo/admin",
      events: "GET /telemetry/demo/events with HTTP Basic auth using showcase_password.",
      triage:
        "GET /telemetry/demo/triage (Basic auth) — flattens batched events, ranks failing demos and error-signature clusters. ?scan=<n> sets the window (default 2000, max 5000).",
      passwordConfigured: Boolean(configuredPassword()),
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST a JSON demo telemetry payload to this endpoint." }, {
      status: 405,
      headers: { allow: "GET, POST" },
    });
  }

  if (!sameOriginTelemetry(req, url)) {
    return forbiddenResponse("Cross-site telemetry is not accepted.");
  }
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
    return jsonResponse({ error: "Telemetry must be JSON." }, { status: 415 });
  }

  const text = await req.text();
  const bodyBytes = new TextEncoder().encode(text).byteLength;
  if (bodyBytes > 128 * 1024) {
    return jsonResponse({ error: "Telemetry payload too large." }, { status: 413 });
  }

  let payload: JsonRecord | null = null;
  try {
    payload = normalizeTelemetryPayload(objectValue(JSON.parse(text || "{}")));
  } catch {
    payload = null;
  }
  if (!payload) {
    return jsonResponse({ error: "Telemetry payload did not match the accepted schema." }, {
      status: 400,
    });
  }

  const page = stringValue(payload.page, 1000) ?? url.searchParams.get("page") ?? "";
  const parts = parsePageParts(page);
  const event: DemoTelemetryEvent = {
    id: randomId(),
    receivedAt: new Date().toISOString(),
    kind: stringValue(payload.kind, 80) ?? "demo.telemetry",
    page,
    ...parts,
    severity: stringValue(payload.severity, 40),
    userAgent: req.headers.get("user-agent") ?? "",
    bodyBytes,
    payload,
  };

  await storeTelemetryEvent(event);
  return jsonResponse({ accepted: true, event }, { status: 202 });
}
