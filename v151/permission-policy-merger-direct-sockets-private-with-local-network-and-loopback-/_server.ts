// Co-located server handler for v151/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-
// Mounted automatically by routes/release.ts for
// /v151/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-/*
//
// Moved verbatim out of routes/release-endpoints.ts (bead
// chrome_platform_showcase-mm5.1): the same handler, the same headers, the same
// status codes — only the module that serves them changed. The legacy dispatch
// entry was removed in the same commit, so nothing else can answer this path.
//
// The sidecar receives the path after the release prefix as `sub`, and only
// answers its own route; anything else returns null so the normal
// asset/HTML pipeline continues.

const PREFIX = "/permission-policy-merger-direct-sockets-private-with-local-network-and-loopback-";
const POLICY_ECHO_ROUTE = `${PREFIX}/policy-echo`;

const PERMISSIONS_POLICY_SOURCE_RE = /^(self|\*|)$/;

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload, null, 2), { ...init, headers });
}

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  if (sub !== POLICY_ECHO_ROUTE) return null;
  return renderV151PolicyEcho(req);
}

function renderV151PolicyEcho(req: Request): Response {
  const url = new URL(req.url);
  const local = url.searchParams.get("local") ?? "self";
  const loopback = url.searchParams.get("loopback") ?? "self";
  const allow = url.searchParams.get("allow") ?? "none";
  if (!PERMISSIONS_POLICY_SOURCE_RE.test(local) || !PERMISSIONS_POLICY_SOURCE_RE.test(loopback)) {
    return jsonResponse({
      error:
        "local and loopback must each be self, * or empty (none) — the allowlist sources this fixture demonstrates.",
    }, { status: 400 });
  }
  const policy = `local-network=(${local}), loopback-network=(${loopback})`;
  return jsonResponse({
    permissionsPolicy: policy,
    iframeAllow: allow === "trusted" ? "local-network; loopback-network" : "",
    request: {
      origin: req.headers.get("origin") ?? "",
      referer: req.headers.get("referer") ?? "",
      secFetchSite: req.headers.get("sec-fetch-site") ?? "",
    },
    migration: {
      chrome150:
        `Permissions-Policy: direct-sockets-private=(${local}), local-network=(${local}), loopback-network=(${loopback})`,
      chrome151: `Permissions-Policy: ${policy}`,
    },
  }, {
    headers: { "permissions-policy": policy },
  });
}
