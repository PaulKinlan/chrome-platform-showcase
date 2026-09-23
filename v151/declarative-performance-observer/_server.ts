// Co-located server handler for v151/declarative-performance-observer
// Mounted automatically by routes/release.ts for /v151/declarative-performance-observer/*

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload, null, 2), { ...init, headers });
}

// ── Declarative Performance Observer (v151, chromestatus 6594955352080384) ──
// The proposal is a declarative HTTP response header (`Performance-Observer`)
// integrated with the Reporting API. Nothing ships in Chrome yet, so the demo
// exercises the two REAL server-side halves the explainer defines: a route
// that emits a syntactically-valid header pair, and a Reporting-API-shaped
// endpoint that stores anything a (future) browser actually delivers.

const DPO_PREFIX = "/declarative-performance-observer";

// entry-types values mirror PerformanceObserver.supportedEntryTypes, which
// grows over time (element, long-animation-frame, …), so validation is a
// syntax check rather than a fixed allowlist: the client seeds its controls
// from the browser's real supportedEntryTypes and this stays compatible with
// vocabulary this server has never heard of.
const DPO_ENTRY_TYPE = /^[a-z][a-z0-9-]{0,40}$/;

const DPO_MARK_NAME = /^[A-Za-z0-9_.:-]{1,64}$/;
// Reports are scoped by a per-visitor token so one visitor's payload is never
// echoed to another on a shared deployment. Without a valid token the endpoint
// only counts deliveries and never stores or returns bodies.
const DPO_TOKEN = /^[A-Za-z0-9-]{8,64}$/;
const DPO_MAX_TOKENS = 50;
const DPO_MAX_REPORTS_PER_TOKEN = 5;
const DPO_REPORT_TTL_MS = 60 * 60 * 1000;
interface DpoStoredReport {
  receivedAt: string;
  contentType: string | null;
  byteLength: number;
  body: unknown;
}
// Primary store is Deno KV so a deferred POST and a later check can land on
// different Deno Deploy isolates (or survive isolate recycling) and still
// agree. Each report lives under its OWN key — concurrent POSTs for a token
// never read-modify-write a shared bucket (no lost updates) and no single KV
// value can approach the 64 KiB limit. The process-local Map is used ONLY
// when the KV API is entirely absent (local dev without --unstable-kv); when
// KV exists but opening, reading, or writing fails, the caller reports the
// failure honestly instead of shadow-writing somewhere reads won't look.
const dpoReportsByToken = new Map<string, DpoStoredReport[]>();
let dpoUnscopedReportCount = 0;
let dpoReportSeq = 0;
interface DpoMinimalKv {
  get(key: unknown[]): Promise<{ value: unknown }>;
  set(key: unknown[], value: unknown, options?: { expireIn?: number }): Promise<unknown>;
  list(selector: { prefix: unknown[] }): AsyncIterable<{ key: unknown[]; value: unknown }>;
  delete(key: unknown[]): Promise<void>;
}
type DpoKvHandle =
  | { state: "kv"; kv: DpoMinimalKv }
  | { state: "absent" }
  | { state: "open-failed" };
let dpoKvPromise: Promise<DpoKvHandle> | null = null;
function getDpoKv(): Promise<DpoKvHandle> {
  if (dpoKvPromise) return dpoKvPromise;
  const attempt = (async (): Promise<DpoKvHandle> => {
    const maybeDeno = Deno as unknown as { openKv?: () => Promise<DpoMinimalKv> };
    if (typeof maybeDeno.openKv !== "function") return { state: "absent" };
    try {
      return { state: "kv", kv: await maybeDeno.openKv() };
    } catch {
      // A rejected open is a transient failure of a PRESENT KV API — never a
      // license to fall back to the isolate-local map (a shadow store would
      // acknowledge writes that reads on other isolates cannot see). Do not
      // cache the failure: the next request re-attempts the open.
      dpoKvPromise = null;
      return { state: "open-failed" };
    }
  })();
  dpoKvPromise = attempt;
  return attempt;
}
async function dpoReadReports(token: string): Promise<DpoStoredReport[] | null> {
  const handle = await getDpoKv();
  if (handle.state === "open-failed") {
    return null; // KV exists but would not open — surfaced as a 503, not stale memory
  }
  if (handle.state === "kv") {
    const kv = handle.kv;
    try {
      const reports: DpoStoredReport[] = [];
      // Keys sort lexicographically by [timestamp, seq] parts, so iteration
      // order is delivery order; keep the newest DPO_MAX_REPORTS_PER_TOKEN.
      for await (const entry of kv.list({ prefix: ["dpo-report", token] })) {
        if (entry.value && typeof entry.value === "object") {
          reports.push(entry.value as DpoStoredReport);
        }
      }
      return reports.slice(-DPO_MAX_REPORTS_PER_TOKEN);
    } catch {
      return null; // KV present but unreadable — report the failure, not stale memory
    }
  }
  return (dpoReportsByToken.get(token) ?? []).slice(-DPO_MAX_REPORTS_PER_TOKEN);
}
const DPO_MAX_TOTAL_KV_KEYS = 500;
async function dpoStoreReport(
  token: string,
  report: DpoStoredReport,
): Promise<"stored" | "kv-error" | "at-capacity"> {
  const handle = await getDpoKv();
  if (handle.state === "open-failed") {
    return "kv-error"; // KV exists but would not open — refuse, never shadow-store
  }
  if (handle.state === "kv") {
    const kv = handle.kv;
    try {
      // Bound token cardinality deployment-wide: any caller can mint tokens,
      // so cap the TOTAL number of stored report keys. Existing tokens keep
      // working (their own five-key trim frees space); brand-new tokens are
      // refused once the store is at capacity. TTL expiry drains it.
      // This is deliberately a SOFT cap: the scan-then-write is not atomic
      // across isolates, so a concurrent burst of first-time tokens can
      // overshoot by at most the number of in-flight requests — every value
      // still expires within DPO_REPORT_TTL_MS and is <= 32 KiB. A strict
      // registry would need an atomic counter that cannot observe TTL expiry
      // (permanent lock-out on drift) or a background sweep; for a demo store
      // the bounded overshoot is the better trade.
      let totalKeys = 0;
      let tokenHasKeys = false;
      for await (const entry of kv.list({ prefix: ["dpo-report"] })) {
        totalKeys++;
        if ((entry.key as unknown[])[1] === token) tokenHasKeys = true;
      }
      if (totalKeys >= DPO_MAX_TOTAL_KV_KEYS && !tokenHasKeys) {
        return "at-capacity";
      }
      // timestamp + per-process seq keep delivery order; the random UUID
      // component makes keys globally unique even when two isolates write the
      // same token in the same millisecond with equal seq counters.
      const key = [
        "dpo-report",
        token,
        Date.now().toString().padStart(16, "0"),
        (dpoReportSeq++).toString().padStart(6, "0"),
        crypto.randomUUID(),
      ];
      await kv.set(key, report, { expireIn: DPO_REPORT_TTL_MS });
      // Enforce retention at STORAGE time, not just in the response: delete
      // everything older than the newest DPO_MAX_REPORTS_PER_TOKEN keys so a
      // flood of POSTs cannot accumulate unbounded 32 KiB values per token
      // or make later reads increasingly expensive.
      const keys: unknown[][] = [];
      for await (const entry of kv.list({ prefix: ["dpo-report", token] })) {
        keys.push(entry.key);
      }
      const excess = keys.slice(0, Math.max(0, keys.length - DPO_MAX_REPORTS_PER_TOKEN));
      let trimFailed = false;
      for (const staleKey of excess) {
        try {
          await kv.delete(staleKey);
        } catch {
          trimFailed = true;
        }
      }
      if (trimFailed) {
        // Retention could not be enforced: a token whose deletes keep failing
        // while writes succeed would otherwise grow past the per-token cap —
        // and, being exempt from the new-token capacity refusal, past the
        // deployment-wide cap — with every POST still reporting success.
        // Roll the new write back (best-effort; the TTL drains it even if
        // this delete also fails) and surface the KV failure instead.
        await kv.delete(key).catch(() => {});
        return "kv-error";
      }
      return "stored";
    } catch {
      return "kv-error"; // surfaced to the caller as stored:false
    }
  }
  let bucket = dpoReportsByToken.get(token);
  if (!bucket) {
    if (dpoReportsByToken.size >= DPO_MAX_TOKENS) {
      const oldest = dpoReportsByToken.keys().next().value;
      if (oldest !== undefined) dpoReportsByToken.delete(oldest);
    }
    bucket = [];
    dpoReportsByToken.set(token, bucket);
  }
  bucket.push(report);
  while (bucket.length > DPO_MAX_REPORTS_PER_TOKEN) bucket.shift();
  return "stored";
}

async function renderDeclarativePerformanceObserverRoute(
  req: Request,
  sub: string,
): Promise<Response | null> {
  if (sub === `${DPO_PREFIX}/header-echo` || sub === `${DPO_PREFIX}/navigate`) {
    const url = new URL(req.url);
    const requestedEntryTypes = url.searchParams.getAll("entry").flatMap((v) =>
      v.split(",").map((t) => t.trim()).filter(Boolean)
    );
    const validEntryTypes = [
      ...new Set(requestedEntryTypes.filter((t) => DPO_ENTRY_TYPE.test(t))),
    ];
    const acceptedEntryTypes = validEntryTypes.slice(0, 32);
    // Never silently drop a valid selection: anything over the cap is
    // reported back explicitly so the emitted header always matches what the
    // client can see was negotiated.
    const overCapEntryTypes = validEntryTypes.slice(32);
    const rejectedEntryTypes = [
      ...new Set(requestedEntryTypes.filter((t) => !DPO_ENTRY_TYPE.test(t))),
    ];
    const requestedMarks = url.searchParams.getAll("mark").flatMap((v) =>
      v.split(",").map((t) => t.trim()).filter(Boolean)
    );
    const acceptedMarks = [...new Set(requestedMarks.filter((m) => DPO_MARK_NAME.test(m)))]
      .slice(0, 8);
    const rejectedMarks = [...new Set(requestedMarks.filter((m) => !DPO_MARK_NAME.test(m)))];
    const captureEarlyFailures = url.searchParams.get("early") === "1";

    const directives = ['report-to="telemetry"'];
    if (acceptedEntryTypes.length) {
      directives.push(`entry-types=(${acceptedEntryTypes.map((t) => `"${t}"`).join(" ")})`);
    }
    if (acceptedMarks.length) {
      directives.push(`include-user-timing=(${acceptedMarks.map((m) => `"${m}"`).join(" ")})`);
    }
    if (captureEarlyFailures) directives.push("capture-early-failures=?1");
    const headerValue = directives.join(", ");
    const token = url.searchParams.get("t");
    const reportUrl = `${url.origin}/v151${DPO_PREFIX}/report` +
      (token && DPO_TOKEN.test(token) ? `?t=${token}` : "");
    const reportingEndpoints = `telemetry="${reportUrl}"`;

    if (sub === `${DPO_PREFIX}/navigate`) {
      // A real DOCUMENT NAVIGATION response carrying the configured header
      // pair — the activation model the explainer defines. In a browser that
      // implements the proposal, loading this page starts browser-side
      // recording for this session; its report would land at the token-scoped
      // /report endpoint.
      const esc = (s: string) =>
        s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
      const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Navigation response — Declarative Performance Observer — chrome platform showcase</title><link rel="stylesheet" href="/public/styles.css"></head>
<body><main>
  <p class="crumbs"><a href="/v151${DPO_PREFIX}/header-anatomy/">&larr; Header anatomy</a></p>
  <header class="lede-block"><p class="eyebrow">v151 · performance · navigation response</p><h1>This navigation carried the header</h1><p class="lede">The document you are reading arrived with the <code>Performance-Observer</code> and <code>Reporting-Endpoints</code> response headers below — the navigation-time activation the explainer describes, not a post-load subresource fetch.</p></header>
  <div class="note">In a browser that implements the proposal, loading this page has just activated browser-side recording for this session; the consolidated report will be delivered to the (token-scoped) report endpoint when the session ends. In today's browsers nothing is recorded — that absence is the honest current state.</div>
  <section><h2>headers on this navigation response</h2><pre tabindex="0"><code>Performance-Observer: ${
        esc(headerValue)
      }
Reporting-Endpoints: ${esc(reportingEndpoints)}</code></pre></section>
  <section><h2>check for a delivered report</h2><p>${
        token && DPO_TOKEN.test(token)
          ? (url.searchParams.get("ephemeral") === "1"
            // The token was minted in a storage-blocked page: it exists only
            // there, so the journey-recorder page (which mints its own token)
            // could never find a report delivered under it.
            ? "The visitor token in this URL was minted in a storage-blocked page and exists only there. A browser-delivered report would be retained under it, but no other page can read it back — the journey-recorder page will mint a different token. Cross-page readback is unavailable in this browser."
            : "After leaving this page, use the journey-recorder page&#39;s &quot;Check what the endpoint has stored&quot; button (same visitor token) to look for a browser-delivered report.")
          : "No visitor token was included, so any browser-delivered report will be counted but not stored. Re-open this page from the header-anatomy builder to include your token."
      }</p></section>
  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main></body></html>`;
      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "performance-observer": headerValue,
          "reporting-endpoints": reportingEndpoints,
          "cache-control": "no-store",
        },
      });
    }

    return jsonResponse({
      endpoint: url.pathname,
      status: 200,
      receivedAt: new Date().toISOString(),
      responseHeaders: {
        "performance-observer": headerValue,
        "reporting-endpoints": reportingEndpoints,
      },
      accepted: {
        entryTypes: acceptedEntryTypes,
        includeUserTiming: acceptedMarks,
        captureEarlyFailures,
      },
      rejected: {
        entryTypes: rejectedEntryTypes,
        entryTypesOverCap: overCapEntryTypes,
        includeUserTiming: rejectedMarks,
      },
      note: "The Performance-Observer header on this response is real and follows the " +
        "explainer's structured-field syntax, but no shipping Chrome processes it yet — " +
        "the proposal is pre-incubation. If a browser ever acts on it, its report will " +
        "surface at the /report endpoint below.",
    }, {
      headers: {
        "performance-observer": headerValue,
        "reporting-endpoints": reportingEndpoints,
        "cache-control": "no-store",
      },
    });
  }

  if (sub === `${DPO_PREFIX}/report`) {
    const url = new URL(req.url);
    const rawToken = url.searchParams.get("t");
    const token = rawToken && DPO_TOKEN.test(rawToken) ? rawToken : null;
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type");
      const REPORT_LIMIT = 32 * 1024;
      // Enforce the limit BEFORE buffering: reject an oversized declared
      // length up front, then read the stream bounded so a chunked or lying
      // client can never make this public endpoint buffer more than the cap.
      const declaredLength = Number(req.headers.get("content-length") ?? "");
      if (Number.isFinite(declaredLength) && declaredLength > REPORT_LIMIT) {
        await req.body?.cancel().catch(() => {});
        return jsonResponse({ error: "Report payload too large." }, { status: 413 });
      }
      let body: unknown = null;
      let byteLength = 0;
      try {
        const chunks: Uint8Array[] = [];
        if (req.body) {
          const reader = req.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            byteLength += value.byteLength;
            if (byteLength > REPORT_LIMIT) {
              await reader.cancel().catch(() => {});
              return jsonResponse({ error: "Report payload too large." }, { status: 413 });
            }
            chunks.push(value);
          }
        }
        const raw = new Uint8Array(byteLength);
        let offset = 0;
        for (const chunk of chunks) {
          raw.set(chunk, offset);
          offset += chunk.byteLength;
        }
        body = JSON.parse(new TextDecoder().decode(raw));
      } catch {
        return jsonResponse({ error: "Report payload was not valid JSON." }, { status: 400 });
      }
      if (!token) {
        // No visitor token: acknowledge but never store the body, so an
        // unscoped delivery can't be read back by anyone else.
        dpoUnscopedReportCount++;
        return jsonResponse({
          stored: false,
          scoped: false,
          note: "Accepted but not stored: no ?t=<token> scope was provided, so the body " +
            "is discarded rather than risk echoing it to another visitor.",
        });
      }
      const stored = await dpoStoreReport(token, {
        receivedAt: new Date().toISOString(),
        contentType,
        byteLength,
        body,
      });
      if (stored === "at-capacity") {
        return jsonResponse({
          stored: false,
          scoped: true,
          error: "The demo report store is at capacity for new visitor tokens. " +
            "Stored reports expire after an hour — retry later.",
        }, { status: 429 });
      }
      if (stored === "kv-error") {
        return jsonResponse({
          stored: false,
          scoped: true,
          error: "The report store rejected this write (transient KV failure). " +
            "The delivery was not retained (rolled back where necessary) — retry, " +
            "or check back without relying on it.",
        }, { status: 503 });
      }
      const current = await dpoReadReports(token);
      return jsonResponse({ stored: true, scoped: true, totalStored: current?.length ?? 1 });
    }
    if (!token) {
      let total = dpoUnscopedReportCount;
      for (const bucket of dpoReportsByToken.values()) total += bucket.length;
      return jsonResponse({
        count: total,
        note: "Report bodies are scoped per visitor token. Pass the ?t=<token> your demo " +
          "page generated to read back your own deliveries; without it only this " +
          "process's delivery count is exposed.",
        reports: [],
      });
    }
    const bucket = await dpoReadReports(token);
    if (bucket === null) {
      return jsonResponse({
        error: "The report store is temporarily unreadable (KV failure). Retry shortly.",
      }, { status: 503 });
    }
    return jsonResponse({
      count: bucket.length,
      note: bucket.length === 0
        ? "No reports have been delivered for this token. That is the expected state " +
          "until a browser implements the Performance-Observer header (or the " +
          "journey-recorder demo POSTs a Reporting-API-shaped payload with this token)."
        : "Reports below were delivered with your token to this Reporting-API-shaped endpoint.",
      reports: bucket,
    });
  }

  return null;
}

export async function handleFeatureRequest(req: Request, sub: string): Promise<Response | null> {
  return await renderDeclarativePerformanceObserverRoute(req, sub);
}
