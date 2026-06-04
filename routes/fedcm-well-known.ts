import { renderFedCmWellKnown } from "./release.ts";

export function handleFedCmWellKnownRoute(req: Request): Response | null {
  const path = new URL(req.url).pathname;
  return path === "/.well-known/web-identity" ? renderFedCmWellKnown(req) : null;
}
