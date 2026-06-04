import { renderProfileTelemetryRoute } from "./release.ts";

export async function handleProfileTelemetryRoute(req: Request): Promise<Response | null> {
  return await renderProfileTelemetryRoute(req, new URL(req.url).pathname);
}
