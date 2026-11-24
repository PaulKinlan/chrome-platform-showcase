// Co-located feature server for v147/js-profiling-in-dedicated-workers:
// serves every page and worker script under this feature with
// `Document-Policy: js-profiling` so Profiler construction is permitted.

import { type FeatureServerContext, withHeaders } from "../../lib/feature-servers/http-helpers.ts";

export async function handleFeatureRequest(
  _req: Request,
  sub: string,
  ctx?: FeatureServerContext,
): Promise<Response | null> {
  if (
    ctx &&
    (sub === "/js-profiling-in-dedicated-workers" ||
      sub.startsWith("/js-profiling-in-dedicated-workers/"))
  ) {
    const asset = await ctx.readReleaseAsset(ctx.release, sub);
    if (asset) {
      return withHeaders(asset, {
        "document-policy": "js-profiling",
      });
    }
  }
  return null;
}
