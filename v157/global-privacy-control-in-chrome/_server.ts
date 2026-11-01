// Co-located server handler for v157/global-privacy-control-in-chrome
// Mounted by routes/release.ts for /v157/global-privacy-control-in-chrome/*
//
// Serves REAL request/response behaviour for the GPC demos:
//  - /echo-gpc            JSON-echoes whether THIS request carried the
//                         `Sec-GPC` request header and with what exact value.
//                         Nothing is simulated: the browser either attached
//                         the header to this fetch or it did not.
//  - /support-resource    a spec-shaped GPC support resource
//                         (/.well-known/gpc.json on a real origin), selected
//                         by ?variant=supports|refuses|invalid-last-update|
//                         wrong-type|missing so the client-side validator can
//                         exercise every "unknown" branch the spec defines.
//
// Spec: https://w3c.github.io/gpc/ (§ The Sec-GPC Header Field,
// § GPC Support Representation). The header ABNF is `Sec-GPC-field-value =
// "1"` and a UA MUST NOT generate the field when the preference is off, so
// the echo distinguishes "header absent" from "header present with value X".

const PREFIX = "/global-privacy-control-in-chrome";

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

function echoGpc(req: Request): Response {
  // Header names are case-insensitive; Headers.get normalises.
  const raw = req.headers.get("sec-gpc");
  return jsonResponse({
    route: "echo-gpc",
    received: raw !== null,
    // The exact value as received. Spec ABNF allows only "1"; anything else
    // is reported verbatim so the page can call it out as non-conforming.
    value: raw,
    specConformant: raw === null || raw === "1",
    requestedAt: new Date().toISOString(),
  });
}

function supportResource(req: Request): Response {
  const variant = new URL(req.url).searchParams.get("variant") ?? "supports";
  switch (variant) {
    case "supports":
      return jsonResponse({ gpc: true, lastUpdate: "2026-10-01" });
    case "refuses":
      return jsonResponse({ gpc: false, lastUpdate: "2026-10-01" });
    case "invalid-last-update":
      // lastUpdate MUST be RFC3339 full-date or date-time; "yesterday" makes
      // the last-update time unknown while gpc stays interpretable.
      return jsonResponse({ gpc: true, lastUpdate: "yesterday" });
    case "wrong-type":
      // Any non-boolean gpc member means the origin's support is UNKNOWN.
      return jsonResponse({ gpc: "yes", lastUpdate: "2026-10-01" });
    case "missing":
      return new Response("Not Found", {
        status: 404,
        headers: { "cache-control": "no-store" },
      });
    default:
      return jsonResponse({ error: "unknown variant", variant }, { status: 400 });
  }
}

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  if (!sub.startsWith(PREFIX + "/")) return null;
  const rest = sub.slice(PREFIX.length).split("?")[0];
  if (rest === "/echo-gpc") return echoGpc(req);
  if (rest === "/support-resource") return supportResource(req);
  return null;
}
