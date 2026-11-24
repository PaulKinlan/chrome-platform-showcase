// Co-located server handler for v135/device-bound-session-credentials.
// Delegates to the shared DBSC demo backend.

import { handleDbscRequest } from "../../lib/feature-servers/dbsc.ts";

export function handleFeatureRequest(req: Request, sub: string): Promise<Response | null> {
  return handleDbscRequest(req, sub);
}
