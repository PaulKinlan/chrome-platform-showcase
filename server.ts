// chrome-platform-showcase
// Deno HTTP entry. Route implementations live in ./routes so each URL group
// can evolve independently while this file stays as the dispatcher.

import { handleCategoriesRoute } from "./routes/categories.ts";
import { handleConformanceRoute } from "./routes/conformance.ts";
import { handleCritiquesRoute } from "./routes/critiques.ts";
import { handleFeaturesRoute } from "./routes/features.ts";
import { handleFedCmWellKnownRoute } from "./routes/fedcm-well-known.ts";
import { handleIndexRoute } from "./routes/index.ts";
import { handleProfileTelemetryRoute } from "./routes/profile-telemetry.ts";
import { handlePublicRoute } from "./routes/public.ts";
import { handleReleaseRoute } from "./routes/release.ts";

const PORT = Number(Deno.env.get("PORT") ?? 3000);

type RouteHandler = (req: Request) => Response | Promise<Response | null> | null;

const routes: RouteHandler[] = [
  handleIndexRoute,
  handleFeaturesRoute,
  handleConformanceRoute,
  handleCritiquesRoute,
  handleCategoriesRoute,
  handlePublicRoute,
  handleProfileTelemetryRoute,
  handleFedCmWellKnownRoute,
  handleReleaseRoute,
];

Deno.serve({ port: PORT }, async (req) => {
  for (const route of routes) {
    const response = await route(req);
    if (response) return response;
  }

  return new Response("Not found", { status: 404 });
});

console.log(`Listening on http://localhost:${PORT}`);
