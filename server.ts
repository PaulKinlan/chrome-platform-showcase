// chrome-platform-showcase
// Deno HTTP entry (local dev, tests, `deno task start`). The route table lives
// in routes/dispatch.ts, shared with the Cloudflare Worker entry
// (worker/index.ts), so this file only binds a port.

import { dispatch, type RouteContext } from "./routes/dispatch.ts";

const PORT = Number(Deno.env.get("PORT") ?? 3000);

Deno.serve({ port: PORT }, (req, info) => {
  // The socket peer, which a client cannot forge (see lib/auth-throttle.ts).
  const context: RouteContext = { remoteAddr: info?.remoteAddr?.hostname ?? null };
  return dispatch(req, context);
});

console.log(`Listening on http://localhost:${PORT}`);
