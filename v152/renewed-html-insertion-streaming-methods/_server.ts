// Co-located feature server for v152/renewed-html-insertion-streaming-methods.
// Delegates to the shared html-stream helper (used by v151 and v152).

import { handleHtmlStreamRequest } from "../../lib/feature-servers/html-stream.ts";

export function handleFeatureRequest(req: Request, sub: string): Response | null {
  return handleHtmlStreamRequest(req, sub);
}
