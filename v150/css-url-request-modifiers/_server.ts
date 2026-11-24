// Co-located feature server for v150/css-url-request-modifiers:
// serves the `referrer-echo` request-metadata endpoint and the
// `crossorigin-integrity-demo` (`/asset-meta` and `/resource.svg`) endpoints.
// Returns null for every sibling/asset path so static files are never shadowed.

import { appendVary, jsonResponse, sha384Sri } from "../../lib/feature-servers/http-helpers.ts";
import { allowlistedCorsOrigin } from "../../lib/request-guards.ts";

const PREFIX = "/css-url-request-modifiers";
const REFERRER_ECHO_ROUTE = `${PREFIX}/referrer-echo`;
const CSS_URL_MODIFIER_DEMO_PREFIX = `${PREFIX}/crossorigin-integrity-demo`;

const CSS_URL_MODIFIER_CLEAN_SVG =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" role="img" aria-label="Verified CSS resource">
  <rect width="320" height="180" fill="ivory"/>
  <path d="M40 130 L118 58 L170 100 L214 72 L280 130 Z" fill="teal"/>
  <circle cx="238" cy="52" r="20" fill="royalblue"/>
  <text x="34" y="34" font-family="monospace" font-size="16" fill="black">verified CSS resource</text>
</svg>`;

const CSS_URL_MODIFIER_TAMPERED_SVG = CSS_URL_MODIFIER_CLEAN_SVG
  .replace("verified CSS resource", "tampered CSS resource")
  .replace('fill="teal"', 'fill="crimson"');

function applyCssUrlModifierDemoCors(headers: Headers, req: Request, mode: string): void {
  appendVary(headers, "Origin");
  headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set(
    "access-control-expose-headers",
    "x-demo-cors-mode, x-demo-sha384, x-demo-variant, x-demo-resource-bytes",
  );
  headers.set("timing-allow-origin", "*");

  if (mode === "public") {
    headers.set("access-control-allow-origin", "*");
    return;
  }

  if (mode === "credentialed") {
    const allowedOrigin = allowlistedCorsOrigin(req, new URL(req.url));
    if (allowedOrigin) {
      headers.set("access-control-allow-origin", allowedOrigin);
      headers.set("access-control-allow-credentials", "true");
    }
  }
}

async function renderCssUrlModifierDemoRoute(
  req: Request,
  sub: string,
): Promise<Response | null> {
  if (!sub.startsWith(`${CSS_URL_MODIFIER_DEMO_PREFIX}/`)) return null;

  const route = sub.slice(CSS_URL_MODIFIER_DEMO_PREFIX.length);
  if (route !== "/asset-meta" && route !== "/resource.svg") return null;

  const url = new URL(req.url);
  const cleanHash = await sha384Sri(CSS_URL_MODIFIER_CLEAN_SVG);
  const tamperedHash = await sha384Sri(CSS_URL_MODIFIER_TAMPERED_SVG);
  const variant = url.searchParams.get("variant") === "tampered" ||
      url.searchParams.get("tamper") === "1"
    ? "tampered"
    : "clean";
  const body = variant === "tampered" ? CSS_URL_MODIFIER_TAMPERED_SVG : CSS_URL_MODIFIER_CLEAN_SVG;
  const hash = variant === "tampered" ? tamperedHash : cleanHash;
  const corsMode = ["public", "credentialed", "blocked"].includes(
      url.searchParams.get("cors") ?? "",
    )
    ? url.searchParams.get("cors")!
    : "public";
  const headers = new Headers({
    "cache-control": "no-store",
    "x-demo-cors-mode": corsMode,
  });
  applyCssUrlModifierDemoCors(headers, req, corsMode);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (route === "/asset-meta") {
    return jsonResponse({
      cleanUrl: `/v150${CSS_URL_MODIFIER_DEMO_PREFIX}/resource.svg?variant=clean`,
      tamperedUrl: `/v150${CSS_URL_MODIFIER_DEMO_PREFIX}/resource.svg?variant=tampered`,
      cleanSha384: cleanHash,
      tamperedSha384: tamperedHash,
      corsModes: {
        public: "Access-Control-Allow-Origin: *",
        credentialed:
          "Access-Control-Allow-Origin: <request Origin>, Access-Control-Allow-Credentials: true",
        blocked: "No Access-Control-Allow-Origin response header",
      },
    }, { headers });
  }

  headers.set("content-type", "image/svg+xml; charset=utf-8");
  headers.set("x-demo-variant", variant);
  headers.set("x-demo-sha384", hash);
  headers.set("x-demo-resource-bytes", String(new TextEncoder().encode(body).byteLength));

  if (req.method === "HEAD") {
    return new Response(null, { headers });
  }

  return new Response(body, { headers });
}

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  if (sub === REFERRER_ECHO_ROUTE) {
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

  return await renderCssUrlModifierDemoRoute(req, sub);
}
