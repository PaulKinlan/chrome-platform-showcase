// Co-located server handler for v130/protected-audience-bidding-auction-services.

import { readBoundedBody } from "../../lib/request-body.ts";
import { DEMO_BODY_LIMIT, jsonResponse } from "../../lib/feature-servers/http-helpers.ts";

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  const prefix = "/protected-audience-bidding-auction-services/pa-bas";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);
  if (route !== "/auction") return null;

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST an encrypted B&A payload to this endpoint." }, {
      status: 405,
    });
  }

  const bounded = await readBoundedBody(req, DEMO_BODY_LIMIT);
  if (!bounded.ok) return bounded.response;
  const bytes = bounded.bytes;
  return jsonResponse({
    received: true,
    receivedBytes: bytes.byteLength,
    contentType: req.headers.get("content-type") ?? "",
    requestId: req.headers.get("x-pa-request-id") ?? "",
    status: "encrypted-payload-received",
    nextStep:
      "A real seller Bidding & Auction service running in a trusted execution environment must decrypt and score this request. The local showcase server does not fabricate a winning ad response.",
  }, { status: 501 });
}
