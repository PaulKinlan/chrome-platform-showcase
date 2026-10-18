// Co-located server handler for v157/connection-allowlists-embedded-enforcement
// Mounted automatically by routes/release.ts for
// /v157/connection-allowlists-embedded-enforcement/*
//
// Serves REAL header behaviour for the embedded-enforcement demos:
//  - /echo-required        echoes whether the request carried the
//                          `Sec-Required-Connection-Allowlist` request header
//                          (the UA-only header an enforcing browser adds to a
//                          framed navigation when the embedder sets the
//                          connectionallowlist attribute). HTML when framed
//                          (?format=html), JSON otherwise.
//  - /widget               a framable page served WITH real response headers
//                          chosen by ?optin=satisfy|allow-from|none
//                          (+ ?variant=report-only, +?allowlist=<serialized>).
//                          The widget reports its own request/response reality
//                          and runs two real same-origin fetches.
//  - /allowed/ping,
//    /blocked/ping         fetch targets for the widget: path-distinguished so
//                          a path-scoped allowlist pattern could allow one and
//                          block the other in an enforcing browser.
//
// Spec: https://wicg.github.io/connection-allowlists/ (§3 header grammar,
// §4 embedded enforcement). Nothing here simulates enforcement — the headers
// are genuinely sent, and the pages report what the visiting browser really
// did with them.

const PREFIX = "/connection-allowlists-embedded-enforcement";

const DEFAULT_ALLOWLIST = '("https://good.example" response-origin)';

function escapeHTML(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// JSON destined for an inline <script>. Bare JSON.stringify is NOT safe there:
// a literal "</script>" inside a string value terminates the script element and
// whatever follows parses as attacker-controlled markup. Escape the characters
// that can change HTML or JS parsing; the result is still valid JSON.
function scriptJSON(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll(" ", "\\u2028")
    .replaceAll(" ", "\\u2029");
}

// Spec §4.4: a valid connectionAllowlist attribute value is ≤ 4096 chars.
// We additionally refuse header-breaking characters outright.
function sanitizeAllowlist(raw: string | null): string {
  if (!raw) return DEFAULT_ALLOWLIST;
  if (raw.length > 4096) return DEFAULT_ALLOWLIST;
  // deno-lint-ignore no-control-regex
  if (/[\x00-\x1f\x7f]/.test(raw)) return DEFAULT_ALLOWLIST;
  return raw;
}

function secHeaders(req: Request): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of req.headers) {
    if (k.toLowerCase().startsWith("sec-")) out[k] = v;
  }
  return out;
}

function jsonResponse(payload: unknown, extra: HeadersInit = {}): Response {
  const headers = new Headers(extra);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload, null, 2), { headers });
}

function renderEchoRequired(req: Request): Response {
  const url = new URL(req.url);
  const required = req.headers.get("sec-required-connection-allowlist");
  const payload = {
    route: "echo-required",
    requiredConnectionAllowlistHeader: required,
    requiredHeaderPresent: required !== null,
    allSecRequestHeaders: secHeaders(req),
    note: required === null
      ? "No Sec-Required-Connection-Allowlist arrived on this request. The header is Sec--prefixed (forbidden to script) and only an ENFORCING user agent adds it to a framed navigation whose embedder set the connectionallowlist attribute — its absence is this browser's real, honest behaviour."
      : "An enforcing user agent forwarded the embedder's requirement with this navigation request.",
  };
  if (url.searchParams.get("format") !== "html") return jsonResponse(payload);
  const body = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>echo-required</title>
<link rel="stylesheet" href="/public/styles.css">
<style>
  body { font-family: ui-monospace, monospace; font-size: 0.78rem; margin: 0.5rem; color: var(--text-charcoal); background: var(--bg-ivory); }
  strong.yes { color: var(--accent-emerald-dark); } strong.no { color: var(--accent-rose); }
</style></head><body>
<p>framed navigation request · <strong class="${
    required !== null ? "yes" : "no"
  }">Sec-Required-Connection-Allowlist ${
    required !== null ? "RECEIVED: " + escapeHTML(required) : "NOT received"
  }</strong></p>
<p>${escapeHTML(payload.note)}</p>
<script>parent.postMessage({ type: "ca-echo-report", requiredHeaderPresent: ${
    scriptJSON(required !== null)
  }, requiredHeader: ${scriptJSON(required)} }, location.origin);</script>
</body></html>`;
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function renderWidget(req: Request): Response {
  const url = new URL(req.url);
  const rawOptin = url.searchParams.get("optin") ?? "none";
  // The mode is a closed enum; anything else behaves (and is reported) as "none".
  const optin = ["satisfy", "allow-from", "none"].includes(rawOptin) ? rawOptin : "none";
  const variant = url.searchParams.get("variant");
  const allowlist = sanitizeAllowlist(url.searchParams.get("allowlist"));
  const required = req.headers.get("sec-required-connection-allowlist");

  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  const sent: Record<string, string> = {};
  try {
    if (optin === "satisfy") {
      const name = variant === "report-only"
        ? "Connection-Allowlist-Report-Only"
        : "Connection-Allowlist";
      headers.set(name, allowlist);
      sent[name] = allowlist;
    } else if (optin === "allow-from") {
      headers.set("Allow-Connection-Allowlist-From", url.origin);
      sent["Allow-Connection-Allowlist-From"] = url.origin;
    }
  } catch {
    // An unserialisable header value: fall through, sending none, and say so.
  }

  // Browser-facing URLs include the release segment the handler never sees.
  const base = `/v157${PREFIX}`;
  const body = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>allowlist widget</title>
<link rel="stylesheet" href="/public/styles.css">
<style>
  body { font-family: ui-monospace, monospace; font-size: 0.76rem; margin: 0.5rem; color: var(--text-charcoal); background: var(--bg-stone); }
  p { margin: 0.25rem 0; overflow-wrap: anywhere; }
  .yes { color: var(--accent-emerald-dark); font-weight: 700; } .no { color: var(--accent-rose); font-weight: 700; }
</style></head><body>
<p><strong>widget</strong> · opt-in mode: ${escapeHTML(optin)}${
    variant ? " · " + escapeHTML(variant) : ""
  }</p>
<p>response headers actually sent with this document: ${
    Object.keys(sent).length
      ? Object.entries(sent).map(([k, v]) => `<br>&nbsp;&nbsp;${escapeHTML(k)}: ${escapeHTML(v)}`)
        .join("")
      : "(none of the opt-in headers)"
  }</p>
<p>Sec-Required-Connection-Allowlist on my navigation request: <span class="${
    required !== null ? "yes" : "no"
  }">${required !== null ? escapeHTML(required) : "not received"}</span></p>
<p id="fetches">running two real same-origin fetches…</p>
<script>
(async () => {
  const results = [];
  for (const path of ["${base}/allowed/ping", "${base}/blocked/ping"]) {
    try {
      const r = await fetch(path, { cache: "no-store" });
      results.push({ path, ok: r.ok, status: r.status });
    } catch (error) {
      results.push({ path, ok: false, error: String(error && error.name || error) });
    }
  }
  const el = document.getElementById("fetches");
  el.innerHTML = results.map((r) =>
    'fetch ' + r.path.split('/').slice(-2).join('/') + ' → ' +
    (r.ok ? '<span class="yes">succeeded (' + r.status + ')</span>'
          : '<span class="no">' + (r.error ? 'threw ' + r.error : 'failed (' + r.status + ')') + '</span>')
  ).join("<br>");
  parent.postMessage({ type: "ca-widget-report", optin: ${scriptJSON(optin)},
    sentHeaders: ${scriptJSON(sent)}, requiredHeader: ${scriptJSON(required)},
    fetches: results }, location.origin);
})();
</script>
</body></html>`;
  return new Response(body, { headers });
}

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  if (!sub.startsWith(PREFIX + "/")) return null;
  const rest = sub.slice(PREFIX.length);
  if (rest === "/echo-required") return renderEchoRequired(req);
  if (rest === "/widget") return renderWidget(req);
  if (rest === "/allowed/ping" || rest === "/blocked/ping") {
    return jsonResponse({
      ok: true,
      path: rest,
      note:
        "Real same-origin fetch target. A path-scoped Connection-Allowlist pattern can distinguish these two in an enforcing browser.",
    });
  }
  return null;
}
