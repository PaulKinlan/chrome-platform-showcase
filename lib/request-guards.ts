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
