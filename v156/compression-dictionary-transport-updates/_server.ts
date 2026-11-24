// Co-located feature server for v156/compression-dictionary-transport-updates:
// the v156 demos read what only the server can see: the request headers a
// <link rel="compression-dictionary"> fetch carries (Sec-Fetch-Dest et al)
// and the Available-Dictionary/Dictionary-ID offer on a matching target.

import { jsonResponse } from "../../lib/feature-servers/http-helpers.ts";
import { allowlistedCorsOrigin } from "../../lib/request-guards.ts";

interface DictEchoEvent {
  token: string;
  receivedAt: string;
  request: Record<string, string | null>;
}

const dictEchoEvents: DictEchoEvent[] = [];

const DICT_ECHO_BASE = "/compression-dictionary-transport-updates/dict-echo";
const DICT_ECHO_BODY = "chrome-platform-showcase compression dictionary demo payload. " +
  "This small fixed body stands in for a shared template resource that a real " +
  "deployment would delta-compress against the stored dictionary.";

function dictEchoRequestRecord(req: Request): Record<string, string | null> {
  return {
    secFetchDest: req.headers.get("sec-fetch-dest"),
    secFetchMode: req.headers.get("sec-fetch-mode"),
    secFetchSite: req.headers.get("sec-fetch-site"),
    referer: req.headers.get("referer"),
    origin: req.headers.get("origin"),
    acceptEncoding: req.headers.get("accept-encoding"),
    availableDictionary: req.headers.get("available-dictionary"),
    dictionaryId: req.headers.get("dictionary-id"),
  };
}

function renderCompressionDictionaryEchoRoute(req: Request, sub: string): Response | null {
  if (!sub.startsWith(`${DICT_ECHO_BASE}/`)) return null;
  const route = sub.slice(DICT_ECHO_BASE.length);
  const url = new URL(req.url);
  // The echoed origin is an allowlist decision, never the raw request header:
  // only the site's own origin (the loopback host pair counting as the site)
  // is echoed, and any other explicit Origin gets no access-control-allow-origin
  // at all so the browser blocks the read. This is the same guard the other
  // CORS paths in this repo use (see allowlistedCorsOrigin).
  const allowedOrigin = allowlistedCorsOrigin(req, url);
  const cors: Record<string, string> = {
    "timing-allow-origin": "*",
  };
  if (allowedOrigin) cors["access-control-allow-origin"] = allowedOrigin;

  if (route === "/reflect") {
    const token = url.searchParams.get("token") ?? "";
    dictEchoEvents.unshift({
      token,
      receivedAt: new Date().toISOString(),
      request: dictEchoRequestRecord(req),
    });
    dictEchoEvents.splice(200);
    return new Response(DICT_ECHO_BODY, {
      headers: {
        ...cors,
        "content-type": "application/octet-stream",
        "cache-control": "no-store",
      },
    });
  }

  if (route === "/events") {
    const token = url.searchParams.get("token") ?? "";
    const event = dictEchoEvents.find((item) => item.token === token) ?? null;
    return jsonResponse({ event }, { headers: { ...cors, "cache-control": "no-store" } });
  }

  if (route === "/dictionary") {
    return new Response(DICT_ECHO_BODY, {
      headers: {
        ...cors,
        "content-type": "application/octet-stream",
        "use-as-dictionary":
          `match="/v156${DICT_ECHO_BASE}/target*", id="demo-dict-v1", type="raw"`,
        "cache-control": "max-age=3600",
      },
    });
  }

  if (route === "/target") {
    return jsonResponse({ request: dictEchoRequestRecord(req) }, {
      headers: { ...cors, "cache-control": "no-store" },
    });
  }

  return null;
}

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  return renderCompressionDictionaryEchoRoute(req, sub);
}
