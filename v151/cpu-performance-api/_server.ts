// Co-located feature server for v151/cpu-performance-api.
// Delegates to the shared capability-echo helper (used by v151 and v152).

import { handleCapabilityEchoRequest } from "../../lib/feature-servers/capability-echo.ts";

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  return await handleCapabilityEchoRequest(req, sub);
}
