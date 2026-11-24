// Co-located server handler for v133/atomics-pause:
// serves the SharedArrayBuffer demos with COOP/COEP headers so crossOriginIsolated is enabled.

import { type FeatureServerContext, withHeaders } from "../../lib/feature-servers/http-helpers.ts";

export async function handleFeatureRequest(
  _req: Request,
  sub: string,
  ctx?: FeatureServerContext,
): Promise<Response | null> {
  if (
    ctx &&
    (
      sub === "/atomics-pause/spsc-queue" ||
      sub.startsWith("/atomics-pause/spsc-queue/") ||
      sub === "/atomics-pause/worker-spinlock" ||
      sub.startsWith("/atomics-pause/worker-spinlock/")
    )
  ) {
    const asset = await ctx.readReleaseAsset(ctx.release, sub);
    if (asset) {
      return withHeaders(asset, {
        "cross-origin-opener-policy": "same-origin",
        "cross-origin-embedder-policy": "require-corp",
      });
    }
  }
  return null;
}
