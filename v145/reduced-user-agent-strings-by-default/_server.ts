// Co-located server handler for v145/reduced-user-agent-strings-by-default
// Mounted automatically by routes/release.ts for
// /v145/reduced-user-agent-strings-by-default/*
//
// Moved verbatim out of routes/release-endpoints.ts (bead
// chrome_platform_showcase-mm5.3): the same handler, the same headers, the
// same status codes — only the module that serves them changed. The legacy
// dispatch entry was removed in the same commit, so nothing else can answer
// this path.
//
// The sidecar receives the path after the release prefix as `sub`, and only
// answers its own route; anything else returns null so the normal
// asset/HTML pipeline continues.

const PREFIX = "/reduced-user-agent-strings-by-default";
const UA_CH_MIGRATION_ECHO_ROUTE = `${PREFIX}/ua-ch-migration/client-hints-echo`;

const UA_CH_LOW_ENTROPY_HEADERS = [
  "Sec-CH-UA",
  "Sec-CH-UA-Mobile",
  "Sec-CH-UA-Platform",
];

const UA_CH_HIGH_ENTROPY_HEADERS = [
  "Sec-CH-UA-Platform-Version",
  "Sec-CH-UA-Full-Version-List",
  "Sec-CH-UA-Arch",
  "Sec-CH-UA-Bitness",
  "Sec-CH-UA-Model",
  "Sec-CH-UA-WoW64",
];

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  return new Response(JSON.stringify(payload, null, 2), { ...init, headers });
}

export function handleFeatureRequest(
  req: Request,
  sub: string,
): Response | null {
  if (sub !== UA_CH_MIGRATION_ECHO_ROUTE) return null;
  return renderUaChMigrationEcho(req);
}

function renderUaChMigrationEcho(req: Request): Response {
  const url = new URL(req.url);
  const requestedHighEntropyHints = url.searchParams.getAll("hint").flatMap((
    value,
  ) =>
    value.split(",").map((hint) => hint.trim()).filter((hint) =>
      UA_CH_HIGH_ENTROPY_HEADERS.includes(hint)
    )
  );
  const suppressHighEntropyOptIn = url.searchParams.get("hints") === "none";
  const optInHints = suppressHighEntropyOptIn
    ? []
    : requestedHighEntropyHints.length
    ? [...new Set(requestedHighEntropyHints)]
    : ["Sec-CH-UA-Platform-Version", "Sec-CH-UA-Full-Version-List"];
  const varyHeaders = [
    "User-Agent",
    ...UA_CH_LOW_ENTROPY_HEADERS,
    ...optInHints,
  ];
  const responseHeaders: Record<string, string> = {
    "vary": [...new Set(varyHeaders)].join(", "),
    "cache-control": "no-store",
  };
  if (optInHints.length) responseHeaders["accept-ch"] = optInHints.join(", ");
  const observedHeaderNames = [
    "User-Agent",
    ...UA_CH_LOW_ENTROPY_HEADERS,
    ...UA_CH_HIGH_ENTROPY_HEADERS,
  ];
  const requestHeaders = Object.fromEntries(
    observedHeaderNames.map((name) => [name, req.headers.get(name)]),
  );
  const missingOptedInHints = optInHints.filter((name) => !req.headers.has(name));

  return jsonResponse({
    endpoint: url.pathname,
    status: 200,
    method: req.method,
    receivedAt: new Date().toISOString(),
    requestHeaders,
    responseHeaders: {
      "accept-ch": responseHeaders["accept-ch"] ?? "<omitted>",
      "vary": responseHeaders["vary"],
      "cache-control": responseHeaders["cache-control"],
    },
    optInHints,
    missingOptedInHints,
    note: optInHints.length === 0
      ? "This response deliberately omits Accept-CH because the selected migration path does not need high-entropy UA-CH headers."
      : missingOptedInHints.length
      ? "High-entropy UA-CH headers were not present on this request. That is expected on first requests, unsupported browsers, or clients that decline these hints."
      : "The browser sent every high-entropy UA-CH header this route opted in to receive.",
  }, { headers: responseHeaders });
}
