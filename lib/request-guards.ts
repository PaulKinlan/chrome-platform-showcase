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

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * http://localhost:3000 and http://127.0.0.1:3000 (and [::1]) name the same
 * local listener. The browser treats the pair as genuinely cross-origin —
 * which is exactly why local demos use it to exercise CORS against this
 * same server — so credentialed CORS for the pair is still same-site.
 */
function loopbackEquivalent(a: string, b: string): boolean {
  try {
    const urlA = new URL(a);
    const urlB = new URL(b);
    return urlA.protocol === urlB.protocol &&
      urlA.port === urlB.port &&
      LOOPBACK_HOSTS.has(urlA.hostname) &&
      LOOPBACK_HOSTS.has(urlB.hostname);
  } catch {
    return false;
  }
}

/**
 * The origin allowed to make credentialed CORS requests to showcase
 * endpoints: the site's own origin. When the request carries no Origin
 * header the site origin is returned (same-origin requests), and the
 * loopback host pair counts as the site itself. Any other explicit Origin
 * disables credentialed CORS for that response — the caller gets no
 * access-control-allow-origin at all and the browser blocks the
 * credentialed read.
 */
export function allowlistedCorsOrigin(req: Request, url: URL): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return url.origin;
  if (origin === url.origin) return origin;
  if (loopbackEquivalent(origin, url.origin)) return origin;
  return null;
}

const headerOriginPattern = /^https?:\/\/[A-Za-z0-9.\-:%\[\]]+$/;

/**
 * A value safe to embed inside a structured response header's quoted-string
 * parameter: a well-formed absolute http(s) origin passes through, and
 * anything else (wrong shape, quotes, controls, over-long) falls back to the
 * site's own origin so a client-supplied header can never alter the
 * structured header's meaning.
 */
export function validatedHeaderOrigin(raw: string | null, fallback: string): string {
  if (raw && raw.length <= 255 && headerOriginPattern.test(raw)) return raw;
  return fallback;
}
