// Co-located feature server for v150/responsively-sized-iframe.
// Delegates to the shared responsive-iframe helper (used by v150 and v152).

import { type FeatureServerContext } from "../../lib/feature-servers/http-helpers.ts";
import { handleResponsiveIframeRequest } from "../../lib/feature-servers/responsive-iframe.ts";

export async function handleFeatureRequest(
  req: Request,
  sub: string,
  ctx?: FeatureServerContext,
): Promise<Response | null> {
  return await handleResponsiveIframeRequest(req, sub, ctx);
}
