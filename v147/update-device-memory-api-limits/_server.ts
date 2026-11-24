// Co-located feature server for v147/update-device-memory-api-limits:
// handles the Device Memory Client Hint echo endpoints and adds Accept-CH /
// Vary response headers to the compatibility-lab and memory-inspector demos.

import {
  type FeatureServerContext,
  jsonResponse,
  withHeaders,
} from "../../lib/feature-servers/http-helpers.ts";

const DEVICE_MEMORY_CLIENT_HINT_ECHO_ROUTES = new Set([
  "/update-device-memory-api-limits/compatibility-lab/client-hint-echo",
  "/update-device-memory-api-limits/memory-inspector/client-hint-echo",
]);

const DEVICE_MEMORY_OPT_IN_ROUTES = new Set([
  "/update-device-memory-api-limits/compatibility-lab",
  "/update-device-memory-api-limits/compatibility-lab/",
  "/update-device-memory-api-limits/compatibility-lab/index.html",
  "/update-device-memory-api-limits/memory-inspector",
  "/update-device-memory-api-limits/memory-inspector/",
  "/update-device-memory-api-limits/memory-inspector/index.html",
]);

function renderDeviceMemoryClientHintRoute(req: Request, sub: string): Response | null {
  if (!DEVICE_MEMORY_CLIENT_HINT_ECHO_ROUTES.has(sub)) {
    return null;
  }

  const url = new URL(req.url);
  const secCHDeviceMemory = req.headers.get("sec-ch-device-memory");
  const legacyDeviceMemory = req.headers.get("device-memory");
  const payload = {
    endpoint: url.pathname,
    round: url.searchParams.get("round"),
    optInResponseHeader: "Accept-CH: Sec-CH-Device-Memory",
    expectedRequestHeader: "Sec-CH-Device-Memory",
    received: {
      secCHDeviceMemory,
      legacyDeviceMemory,
      accept: req.headers.get("accept"),
      userAgent: req.headers.get("user-agent"),
    },
    note: secCHDeviceMemory
      ? "The browser sent the Device Memory client hint after this origin opted in."
      : "No Device Memory client hint was received. That is the failure mode for unsupported browsers, first requests before opt-in, or clients that do not expose this Chromium-only hint.",
  };

  return jsonResponse(payload, {
    headers: {
      "accept-ch": "Sec-CH-Device-Memory",
      "vary": "Sec-CH-Device-Memory",
      "cache-control": "no-store",
    },
  });
}

export async function handleFeatureRequest(
  req: Request,
  sub: string,
  ctx?: FeatureServerContext,
): Promise<Response | null> {
  const deviceMemoryHintResponse = renderDeviceMemoryClientHintRoute(req, sub);
  if (deviceMemoryHintResponse) return deviceMemoryHintResponse;

  if (DEVICE_MEMORY_OPT_IN_ROUTES.has(sub) && ctx) {
    const asset = await ctx.readReleaseAsset(ctx.release, sub);
    if (asset) {
      return withHeaders(asset, {
        "accept-ch": "Sec-CH-Device-Memory",
        "vary": "Sec-CH-Device-Memory",
      });
    }
  }

  return null;
}
