// Co-located server handler for v157/connection-allowlists-embedded-enforcement
// Mounted by routes/release.ts for /v157/connection-allowlists-embedded-enforcement/*
//
// Embedded enforcement is a request/response-header handshake, so the demo
// needs real endpoints:
//   /echo-required        — a frameable page that reports whether the browser
//                           sent Sec-Required-Connection-Allowlist (and its
//                           exact value) for this navigation.
//   /framed/optin         — frameable page answering with a
//                           Connection-Allowlist: (response-origin) header —
//                           the "at least as strict" opt-in path.
//   /framed/optin-from    — frameable page answering with
//                           Allow-Connection-Allowlist-From: * — the
//                           delegate-to-embedder opt-in path.
//   /framed/noheader      — frameable page with neither header — the frame an
//                           enforcing embedder must block.
//   /framed/ping          — same-origin JSON the framed pages fetch to show
//                           what an enforced allowlist does to connections.
//
// Every framed page reads its own Sec-Required-Connection-Allowlist request
// header, runs one same-origin fetch probe, and posts the whole result to its
// parent via postMessage (same-origin targetOrigin).

const PREFIX = "/connection-allowlists-embedded-enforcement";

function escapeHTML(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function htmlResponse(body: string, extraHeaders: Record<string, string> = {}): Response {
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
  });
  for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, value);
  return new Response(body, { headers });
}

function framedPage(
  req: Request,
  title: string,
  kind: string,
  servedHeaderLine: string,
): string {
  const required = req.headers.get("sec-required-connection-allowlist");
  const requiredDisplay = required === null ? null : required;
  // The header value is echoed into both HTML and the postMessage payload;
  // the HTML path is escaped, the script path goes through JSON.stringify.
  const payloadSeed = JSON.stringify({
    type: "caee-frame-report",
    kind,
    requiredHeader: requiredDisplay,
  });
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${
    escapeHTML(title)
  }</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 12px; background: #faf8f2; color: #1c1c1c; }
  h1 { font-size: 0.95rem; margin: 0 0 8px; }
  p { font-size: 0.8rem; margin: 4px 0; overflow-wrap: anywhere; }
  code { background: #eceae2; padding: 1px 4px; }
</style></head>
<body>
<h1>${escapeHTML(title)}</h1>
<p>served with: <code>${escapeHTML(servedHeaderLine)}</code></p>
<p>Sec-Required-Connection-Allowlist received: <code>${
    requiredDisplay === null ? "(absent)" : escapeHTML(requiredDisplay)
  }</code></p>
<p id="probe">same-origin fetch probe: running…</p>
<script>
(() => {
  'use strict';
  const report = ${payloadSeed};
  const probeEl = document.getElementById('probe');
  const prefix = '${PREFIX}';
  const base = location.pathname.slice(0, location.pathname.indexOf(prefix) + prefix.length);
  fetch(base + '/framed/ping')
    .then((r) => r.json())
    .then(() => { report.sameOriginFetch = 'ok'; })
    .catch((e) => { report.sameOriginFetch = 'blocked: ' + (e && e.name ? e.name : String(e)); })
    .finally(() => {
      probeEl.textContent = 'same-origin fetch probe: ' + report.sameOriginFetch;
      try { window.parent.postMessage(report, location.origin); } catch { /* not framed */ }
    });
})();
</script>
</body>
</html>`;
}

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  if (!sub.startsWith(PREFIX + "/")) return null;
  const rest = sub.slice(PREFIX.length);

  if (rest === "/echo-required") {
    return htmlResponse(
      framedPage(req, "Requirement echo frame", "echo", "(no opt-in headers on this response)"),
    );
  }
  if (rest === "/framed/optin") {
    return htmlResponse(
      framedPage(
        req,
        "Opted-in frame (Connection-Allowlist)",
        "optin",
        "Connection-Allowlist: (response-origin)",
      ),
      { "connection-allowlist": "(response-origin)" },
    );
  }
  if (rest === "/framed/optin-from") {
    return htmlResponse(
      framedPage(
        req,
        "Delegating frame (Allow-Connection-Allowlist-From)",
        "optin-from",
        "Allow-Connection-Allowlist-From: *",
      ),
      { "allow-connection-allowlist-from": "*" },
    );
  }
  if (rest === "/framed/noheader") {
    return htmlResponse(
      framedPage(req, "Non-opting frame (no headers)", "noheader", "(no opt-in headers)"),
    );
  }
  if (rest === "/framed/ping") {
    return new Response(JSON.stringify({ ok: true, at: new Date().toISOString() }), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
  return null;
}
