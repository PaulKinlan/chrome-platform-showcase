import type { ConformanceSuite } from "../../lib/conformance.ts";
import { platform } from "../../lib/platform.ts";

export async function readConformance(path: string): Promise<ConformanceSuite | null> {
  try {
    const text = await platform().readTextFile(path);
    return JSON.parse(text) as ConformanceSuite;
  } catch {
    return null;
  }
}

const SUITES_CACHE_TTL_MS = 60 * 1000;
let suitesCache: { at: number; suites: ConformanceSuite[] } | null = null;
let suitesInFlight: Promise<ConformanceSuite[]> | null = null;

export async function scanConformanceSuites(): Promise<ConformanceSuite[]> {
  if (suitesInFlight) return suitesInFlight;
  suitesInFlight = (async () => {
    const out: ConformanceSuite[] = [];
    try {
      for await (const entry of platform().readDir(".")) {
        if (!entry.isDirectory || !/^v\d+$/.test(entry.name)) continue;
        const release = entry.name;
        for await (const fd of platform().readDir(release)) {
          if (!fd.isDirectory) continue;
          const featureSuite = await readConformance(
            `${release}/${fd.name}/conformance.json`,
          );
          if (featureSuite) out.push(featureSuite);
          try {
            for await (const cd of platform().readDir(`${release}/${fd.name}`)) {
              if (!cd.isDirectory) continue;
              const conceptSuite = await readConformance(
                `${release}/${fd.name}/${cd.name}/conformance.json`,
              );
              if (conceptSuite) out.push(conceptSuite);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }
    suitesCache = { at: Date.now(), suites: out };
    suitesInFlight = null;
    return out;
  })();
  return suitesInFlight;
}

export async function collectConformanceSuites(): Promise<ConformanceSuite[]> {
  if (suitesCache) {
    if (Date.now() - suitesCache.at >= SUITES_CACHE_TTL_MS) {
      scanConformanceSuites().catch(() => {});
    }
    return suitesCache.suites;
  }
  return await scanConformanceSuites();
}
