// Co-located server handler for v145/secure-payment-confirmation-browser-bound-keys.
// Delegates to the shared SPC browser-bound key verifier backend.

import { type FeatureServerContext } from "../../lib/feature-servers/http-helpers.ts";
import { handleSpcBbkRequest } from "../../lib/feature-servers/spc-bbk.ts";

export function handleFeatureRequest(
  req: Request,
  sub: string,
  ctx?: FeatureServerContext,
): Promise<Response | null> {
  return handleSpcBbkRequest(req, ctx?.release ?? "v145", sub);
}
