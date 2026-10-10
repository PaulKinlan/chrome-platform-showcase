// CSS URL request modifiers: referrer-echo request-only endpoint, co-located
// feature sidecar (bead chrome_platform_showcase-mm5.4). The handler moved
// verbatim out of routes/release-endpoints.ts and is registered in
// STATIC_FEATURE_SERVERS (routes/release.ts) under this feature id. The
// legacy dispatcher retains the rest of the v150 css-url-request-modifiers
// family (crossorigin-integrity demo, streaming routes); this sidecar answers
// only the echo route and returns null for every sibling path, so nothing
// here can shadow the asset-reader demo routes.

const PREFIX = "/css-url-request-modifiers";
const ROUTE = `${PREFIX}/referrer-echo`;

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

export function handleFeatureRequest(
  req: Request,
  sub: string,
): Response | null {
  if (sub !== ROUTE) return null;

  const url = new URL(req.url);
  const payload = {
    policy: url.searchParams.get("policy") ?? "default",
    method: req.method,
    referer: req.headers.get("referer") ?? "",
    origin: req.headers.get("origin") ?? "",
    secFetchSite: req.headers.get("sec-fetch-site") ?? "",
    note:
      "This endpoint echoes request metadata so CSS URL request modifier demos can compare per-request referrer behavior.",
  };
  return jsonResponse(payload);
}
