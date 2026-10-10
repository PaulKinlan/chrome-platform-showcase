// Co-located server handler for v151/resource-timing-add-spec-compliant-service-worker-router-timing-fields
// Mounted automatically by routes/release.ts for
// /v151/resource-timing-add-spec-compliant-service-worker-router-timing-fields/*
//
// Moved verbatim out of routes/release-endpoints.ts (bead
// chrome_platform_showcase-mm5.2): the same handler, the same headers, the same
// status codes — only the module that serves them changed. The legacy dispatch
// entry was removed in the same commit, so nothing else can answer this path.
//
// The sidecar receives the path after the release prefix as `sub`, and only
// answers its own route; anything else returns null so the normal
// asset/HTML pipeline continues.

const PREFIX = "/resource-timing-add-spec-compliant-service-worker-router-timing-fields";
const DELAYED_ECHO_ROUTE = `${PREFIX}/delayed-echo`;

// A Server-Timing `desc="…"` is a quoted-string (no quote, backslash or
// control character). A value outside the grammar either silently rewrites the
// header the demo is showing or makes the Headers constructor throw on a
// CR/LF, answering the request with a 500; both are now a 400 with an
// explanation.
const SERVER_TIMING_LABEL_RE = /^[A-Za-z0-9 ._:-]{1,64}$/;

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload, null, 2), { ...init, headers });
}

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  if (sub !== DELAYED_ECHO_ROUTE) return null;
  return await renderV151DelayedEcho(req);
}

async function renderV151DelayedEcho(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const delay = Math.min(
    Math.max(Number(url.searchParams.get("delay") ?? 80), 0),
    2000,
  );
  const label = url.searchParams.get("label") ?? "resource";
  if (!SERVER_TIMING_LABEL_RE.test(label)) {
    return jsonResponse({
      error:
        "label must be 1-64 characters from A-Z a-z 0-9 space . _ : - so it can be carried in a Server-Timing desc quoted-string.",
    }, { status: 400 });
  }
  await new Promise((resolve) => setTimeout(resolve, delay));
  return jsonResponse({
    label,
    delay,
    time: new Date().toISOString(),
    request: {
      destination: req.headers.get("sec-fetch-dest") ?? "",
      mode: req.headers.get("sec-fetch-mode") ?? "",
      site: req.headers.get("sec-fetch-site") ?? "",
    },
    note:
      "Use PerformanceResourceTiming to inspect duration, transfer size, Server-Timing, and Chrome 151 service-worker router fields when a static router is active.",
  }, {
    headers: { "server-timing": `edge;dur=${delay};desc="${label}"` },
  });
}
