// Co-located server handler for v158/spec-compliant-xml-mime-type-detection
// Mounted automatically by routes/release.ts for
// /v158/spec-compliant-xml-mime-type-detection/*
//
// The feature (chromestatus 5092584283308032) is about how the BROWSER
// classifies a response's MIME type: per the WHATWG MIME Sniffing Standard,
// any valid MIME type whose subtype ends in "+xml" is an XML MIME type, and
// PerformanceResourceTiming.contentType minimizes such responses to
// "application/xml" (image/svg+xml stays image/svg+xml). The only honest way
// to demonstrate that is to actually SERVE responses under arbitrary +xml
// content types and let the page read the browser's own resource-timing
// classification — so this route exists to emit a tiny inert XML body under
// a caller-chosen, strictly validated content type.

const PREFIX = "/spec-compliant-xml-mime-type-detection";

// Strict token-only MIME pattern: one known top-level type, then a subtype
// limited to RFC 6838 "restricted name" characters at its full 127-char
// length. No spaces, no semicolons (parameters), no control characters — the
// value is embedded in a response header, so validation IS the
// header-injection defence (headers also reject CR/LF themselves; this keeps
// the surface minimal and the demo honest).
const MIME_PATTERN =
  /^(application|audio|font|image|message|model|multipart|text|video)\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/i;

// The body is deliberately inert, valid XML: no doctype, no scripts, no
// stylesheet processing instruction. Served with nosniff so the declared
// content type is exactly what the browser has to classify.
const XML_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<classification-probe xmlns="urn:chrome-platform-showcase:mime-probe">
  <purpose>Serve a caller-chosen +xml content type so the page can read
  PerformanceResourceTiming.contentType — the browser's own minimized
  classification of this response.</purpose>
</classification-probe>
`;

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  const url = new URL(req.url);
  if (!sub.startsWith(`${PREFIX}/serve`)) return null;
  if (req.method !== "GET") {
    return new Response("GET only", { status: 405 });
  }
  const requested = url.searchParams.get("type") ?? "";
  if (!MIME_PATTERN.test(requested)) {
    return new Response(
      JSON.stringify({
        error: "invalid MIME type",
        detail:
          "Expected <known-top-level-type>/<subtype> using RFC 6838 restricted-name characters only (no parameters, no whitespace).",
        received: requested.slice(0, 100),
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  }
  return new Response(XML_BODY, {
    headers: {
      // Lowercased: MIME types are case-insensitive and the parser lowercases
      // them anyway; serving lowercase keeps served-vs-observed comparable.
      "content-type": requested.toLowerCase(),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
