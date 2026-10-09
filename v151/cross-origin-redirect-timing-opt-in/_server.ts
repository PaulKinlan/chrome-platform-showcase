// Co-located server handler for v151/cross-origin-redirect-timing-opt-in
// Mounted automatically by routes/release.ts for
// /v151/cross-origin-redirect-timing-opt-in/*
//
// Moved verbatim out of routes/release-endpoints.ts (bead
// chrome_platform_showcase-czw): the same handler, the same headers, the same
// status codes — only the module that serves them changed. The legacy dispatch
// entry was removed in the same commit, so nothing else can answer this path.
//
// The sidecar receives the path after the release prefix as `sub`, and only
// answers its own route; anything else returns null so the normal
// asset/HTML pipeline continues.

const PREFIX = "/cross-origin-redirect-timing-opt-in";
const REDIRECT_CHAIN_ROUTE = `${PREFIX}/redirect-chain`;

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload, null, 2), { ...init, headers });
}

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  if (sub !== REDIRECT_CHAIN_ROUTE) return null;
  return renderV151RedirectChain(req);
}

// v151: cross-origin redirect timing opt-in.
// Issues a real redirect chain so PerformanceResourceTiming.redirectStart/
// redirectEnd/redirectCount are populated by an actual navigation, and lets the
// demo toggle the `Timing-Allow-Origin` opt-in header that gates that timing for
// cross-origin hops. Same-origin hops always expose redirect timing; the header
// (surfaced on the final response) is what unlocks it across origins.
function renderV151RedirectChain(req: Request): Response {
  const url = new URL(req.url);
  const tao = url.searchParams.get("tao") === "1";
  const hops = Math.min(Math.max(Number(url.searchParams.get("hops") ?? 2), 0), 5);
  const taoHeader: Record<string, string> = tao ? { "timing-allow-origin": "*" } : {};

  if (hops > 0) {
    const next = new URL(url.href);
    next.searchParams.set("hops", String(hops - 1));
    return new Response(null, {
      status: 302,
      headers: {
        location: next.pathname + next.search,
        "cache-control": "no-store",
        ...taoHeader,
      },
    });
  }

  return jsonResponse({
    finalHop: true,
    timingAllowOrigin: tao ? "*" : "(absent)",
    note: tao
      ? "Every hop in this chain sent Timing-Allow-Origin: *, so a cross-origin caller would see redirectStart/redirectEnd in its PerformanceResourceTiming entry."
      : "No Timing-Allow-Origin header was sent, so a cross-origin caller would see redirectStart/redirectEnd zeroed. Same-origin callers still see them.",
  }, {
    headers: { "cache-control": "no-store", ...taoHeader },
  });
}
