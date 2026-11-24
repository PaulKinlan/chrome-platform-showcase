// Host-independent request dispatcher. server.ts (Node) and worker/index.ts
// (Cloudflare Workers) both hand every request to `dispatch`, so the route
// table lives in exactly one place. Route implementations live alongside this
// file so each URL group can evolve independently.

import { handleAliasRoute } from "./aliases.ts";
import { handleCategoriesRoute } from "./categories.ts";
import { handleConformanceRoute } from "./conformance.ts";
import { handleCritiquesRoute } from "./critiques.ts";
import { handleFeaturesRoute } from "./features.ts";
import { handleFaviconRoute } from "./favicon.ts";
import { handleDemoTelemetryRoute } from "./demo-telemetry.ts";
import { handleFedCmWellKnownRoute } from "./fedcm-well-known.ts";
import { handleIndexRoute } from "./index.ts";
import { handleProfileTelemetryRoute } from "./profile-telemetry.ts";
import { handlePublicRoute } from "./public.ts";
import { handleEchoSocketRoute } from "./echo-socket.ts";
import { handleReleaseRoute } from "./release.ts";

// The connection context a route may use for per-source decisions. `remoteAddr`
// is the client address as the host saw it, which a client cannot forge: the
// socket peer under Node, Cloudflare's CF-Connecting-IP on Workers (see
// lib/auth-throttle.ts).
export type RouteContext = { remoteAddr?: string | null };
type RouteHandler = (
  req: Request,
  context?: RouteContext,
) => Response | Promise<Response | null> | null;

const routes: RouteHandler[] = [
  handleAliasRoute,
  handleIndexRoute,
  handleFeaturesRoute,
  handleConformanceRoute,
  handleCritiquesRoute,
  handleCategoriesRoute,
  handleFaviconRoute,
  handleEchoSocketRoute,
  handlePublicRoute,
  handleProfileTelemetryRoute,
  handleDemoTelemetryRoute,
  handleFedCmWellKnownRoute,
  handleReleaseRoute,
];

export async function dispatch(req: Request, context: RouteContext): Promise<Response> {
  for (const route of routes) {
    const response = await route(req, context);
    if (response) return response;
  }
  return new Response("Not found", { status: 404 });
}
