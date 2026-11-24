// Co-located server handler for v130/storage-access-headers.

import { validatedHeaderOrigin } from "../../lib/request-guards.ts";
import { jsonResponse, randomBase64Url } from "../../lib/feature-servers/http-helpers.ts";

interface StorageAccessHeaderEvent {
  id: string;
  session: string;
  receivedAt: string;
  request: Record<string, string | null>;
  config: Record<string, string>;
  responseHeaders: Record<string, string>;
}

const storageAccessHeaderEvents: StorageAccessHeaderEvent[] = [];

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  if (!sub.startsWith("/storage-access-headers/")) return null;
  const route = sub.slice("/storage-access-headers".length);
  if (route !== "/probe" && route !== "/events" && route !== "/reset") return null;

  const url = new URL(req.url);
  const session = url.searchParams.get("session") ?? "default";

  if (route === "/events") {
    return jsonResponse({
      events: storageAccessHeaderEvents.filter((event) => event.session === session).slice(0, 20),
    });
  }

  if (route === "/reset" && req.method === "POST") {
    for (let i = storageAccessHeaderEvents.length - 1; i >= 0; i--) {
      if (storageAccessHeaderEvents[i].session === session) storageAccessHeaderEvents.splice(i, 1);
    }
    return jsonResponse({ reset: true, session });
  }

  const activate = url.searchParams.get("activate") ?? "retry";
  const grant = url.searchParams.get("grant") === "1";
  const resource = url.searchParams.get("resource") ?? "fetch";
  const phase = url.searchParams.get("phase") ?? "initial";
  const origin = validatedHeaderOrigin(req.headers.get("origin"), url.origin);
  const responseHeaders: Record<string, string> = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    "vary": "Sec-Fetch-Storage-Access, Origin, Cookie",
  };
  if (grant && activate === "retry") {
    responseHeaders["activate-storage-access"] = `retry; allowed-origin="${origin}"`;
  } else if (grant && activate === "load") {
    responseHeaders["activate-storage-access"] = "load";
  }

  const event: StorageAccessHeaderEvent = {
    id: randomBase64Url(9),
    session,
    receivedAt: new Date().toISOString(),
    request: {
      method: req.method,
      url: url.pathname + url.search,
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
      cookie: req.headers.get("cookie"),
      secFetchSite: req.headers.get("sec-fetch-site"),
      secFetchMode: req.headers.get("sec-fetch-mode"),
      secFetchDest: req.headers.get("sec-fetch-dest"),
      secFetchStorageAccess: req.headers.get("sec-fetch-storage-access"),
    },
    config: { activate, grant: String(grant), resource, phase },
    responseHeaders,
  };
  storageAccessHeaderEvents.unshift(event);
  storageAccessHeaderEvents.splice(100);

  return new Response(
    JSON.stringify(
      {
        accepted: true,
        event,
        observed: storageAccessHeaderEvents.filter((item) => item.session === session).slice(0, 10),
        note:
          "This endpoint emits real Storage Access Headers response headers and records the request headers that the browser actually sent.",
      },
      null,
      2,
    ),
    {
      status: grant && activate === "retry" && phase === "initial" ? 401 : 200,
      headers: responseHeaders,
    },
  );
}
