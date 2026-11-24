// Co-located feature server for v153/js-self-profiling-markers:
// JS Self-Profiling needs a Document-Policy to construct a Profiler at all,
// so the markers demos are served with it — otherwise every page there would
// be a description of an API it could not call.

import { type FeatureServerContext, withHeaders } from "../../lib/feature-servers/http-helpers.ts";

export async function handleFeatureRequest(
  _req: Request,
  sub: string,
  ctx?: FeatureServerContext,
): Promise<Response | null> {
  if (
    ctx &&
    (sub === "/js-self-profiling-markers" ||
      sub.startsWith("/js-self-profiling-markers/"))
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
