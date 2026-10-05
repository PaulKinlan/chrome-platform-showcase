// Shared request guards for state-changing public endpoints.
//
// sameOriginRequest accepts only a genuine same-origin signal: the browser's
// Sec-Fetch-Site must be same-origin/none (or absent, for non-browser
// clients), and an explicit Origin header, when present, must equal the
// request's own origin. Cross-site signals are refused by the caller.

export function sameOriginRequest(req: Request, url: URL): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite && !["same-origin", "none"].includes(secFetchSite)) return false;
  const origin = req.headers.get("origin");
  return !origin || origin === url.origin;
}

export function forbiddenResponse(reason: string): Response {
  return new Response(JSON.stringify({ error: reason }, null, 2), {
    status: 403,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/**
 * The origin allowed to make credentialed CORS requests to showcase
 * endpoints: the site's own origin. When the request carries no Origin
 * header the site origin is returned (same-origin requests). An explicit
 * foreign Origin disables credentialed CORS for that response — the caller
 * gets no access-control-allow-origin at all and the browser blocks the
 * credentialed read.
 */
export function allowlistedCorsOrigin(req: Request, url: URL): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return url.origin;
  return origin === url.origin ? origin : null;
}
