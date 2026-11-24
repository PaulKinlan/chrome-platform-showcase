import { platform } from "../../lib/platform.ts";
import { chromeStatusUrl, slugify } from "../../lib/chromestatus.ts";
import type { Channels, FeatureSummary } from "../../lib/chromestatus.ts";
import { escapeHTML } from "../html.ts";
import { categoryTag } from "./layout.ts";

export interface DemoProbe {
  kind: string;
  test: string;
  expect?: string;
}

export interface DemoIndexData {
  demos: Record<string, string>;
  probes: Record<string, DemoProbe>;
}

const BUILT_DIRS_TTL_MS = 60 * 1000;
let builtDirsCache: { at: number; dirs: Set<string> } | null = null;

async function getBuiltDirs(): Promise<Set<string>> {
  if (builtDirsCache && Date.now() - builtDirsCache.at < BUILT_DIRS_TTL_MS) {
    return builtDirsCache.dirs;
  }
  const dirs = new Set<string>();
  try {
    for await (const entry of platform().readDir(".")) {
      if (!entry.isDirectory || !/^v\d+$/.test(entry.name)) continue;
      const release = entry.name;
      for await (const fd of platform().readDir(release)) {
        if (!fd.isDirectory) continue;
        try {
          const st = await platform().stat(`./${release}/${fd.name}/index.html`);
          if (st.isFile) dirs.add(`${release}/${fd.name}`);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // Fallback if root readDir is restricted
  }
  builtDirsCache = { at: Date.now(), dirs };
  return dirs;
}

async function featureHasDemo(release: string, feature: FeatureSummary): Promise<boolean> {
  const slug = slugify(feature.name);
  const dirs = await getBuiltDirs();
  if (dirs.size > 0) return dirs.has(`${release}/${slug}`);
  try {
    await platform().stat(`./${release}/${slug}/index.html`);
    return true;
  } catch {
    return false;
  }
}

// Feature id → the folder that demonstrates it + primary conformance probe,
// built by `npm run demo-index` and kept honest by `npm run check-demo-index`.
let demoIndexCache: { at: number; data: DemoIndexData } | null = null;

export async function getDemoIndexData(): Promise<DemoIndexData> {
  if (demoIndexCache && Date.now() - demoIndexCache.at < BUILT_DIRS_TTL_MS) {
    return demoIndexCache.data;
  }
  try {
    const parsed = JSON.parse(await platform().readTextFile("./demo-index.json"));
    const data: DemoIndexData = {
      demos: (parsed?.demos ?? {}) as Record<string, string>,
      probes: (parsed?.probes ?? {}) as Record<string, DemoProbe>,
    };
    demoIndexCache = { at: Date.now(), data };
  } catch {
    demoIndexCache = { at: Date.now(), data: { demos: {}, probes: {} } };
  }
  return demoIndexCache.data;
}

async function getDemoIndex(): Promise<Record<string, string>> {
  return (await getDemoIndexData()).demos;
}

export interface ResolvedDemo {
  href: string;
  /** The milestone the demo actually lives in, e.g. "v152". */
  release: string;
  /** False when the demo is in a different milestone's folder. */
  sameRelease: boolean;
}

/**
 * Where to send someone who wants to try this feature.
 *
 * One folder per feature means a feature listed against several milestones is
 * demonstrated in exactly one of them — usually the one it shipped in. Looking
 * only in the current release's folder reports "demo pending" for a demo that
 * exists, which is both false and the most annoying thing a listing page can
 * do. Returns null only when nothing anywhere covers the feature.
 */
export async function resolveDemo(
  release: string,
  feature: FeatureSummary,
): Promise<ResolvedDemo | null> {
  const slug = slugify(feature.name);
  if (await featureHasDemo(release, feature)) {
    return { href: `/${release}/${slug}/`, release, sameRelease: true };
  }
  const index = await getDemoIndex();
  const dir = index[String(feature.id)];
  if (!dir) return null;
  const [elsewhere] = dir.split("/");
  return { href: `/${dir}/`, release: elsewhere, sameRelease: false };
}

export function renderProbeAttrs(probe: DemoProbe | undefined): string {
  if (!probe) return "";
  return ` data-probe-kind="${escapeHTML(probe.kind)}" data-probe-test="${
    escapeHTML(probe.test)
  }"${probe.expect ? ` data-probe-expect="${escapeHTML(probe.expect)}"` : ""}`;
}

/**
 * One feature card on a milestone page. All interpolated values — including
 * the hrefs — are escaped for their HTML attribute context.
 */
export function renderDemoCard(
  f: FeatureSummary,
  demo: ResolvedDemo | null,
  probe: DemoProbe | undefined,
  group: { category: string },
): string {
  const summary = (f.summary ?? "").slice(0, 220);
  const titleHref = demo ? demo.href : chromeStatusUrl(f.id);
  const titleHrefAttr = escapeHTML(titleHref);
  const chromeStatusHrefAttr = escapeHTML(chromeStatusUrl(f.id));
  const probeAttrs = renderProbeAttrs(probe);
  return `<li class="demo-card"${probeAttrs}>
        <h3><a href="${titleHrefAttr}"${demo ? "" : ' target="_blank" rel="noopener"'}>${
    escapeHTML(f.name)
  }</a></h3>
        <p>${escapeHTML(summary)}${summary.length === 220 ? "..." : ""}</p>
        <div class="demo-tags">
          <span class="tag">${escapeHTML(categoryTag(group.category))}</span>
          ${probe ? `<span class="tag tag-compat" data-compat-badge hidden>checking…</span>` : ""}
          <a class="tag tag-chromestatus" href="${chromeStatusHrefAttr}" target="_blank" rel="noopener">ChromeStatus &nearr;</a>
          ${
    demo
      ? demo.sameRelease
        ? `<a class="tag tag-live" href="${escapeHTML(demo.href)}">demo &rarr;</a>`
        : `<a class="tag tag-live" href="${
          escapeHTML(demo.href)
        }" title="This feature is demonstrated in the milestone it shipped in">demo in ${
          escapeHTML(demo.release)
        } &rarr;</a>`
      : `<span class="tag tag-pending">demo pending</span>`
  }
        </div>
      </li>`;
}

export async function knownReleaseMilestones(channels: Channels): Promise<Set<number>> {
  // Always accept the three live channels plus the previous stable (since
  // chromestatus's "stable" is the next cut, the previous mstone is what most
  // users actually have installed). Also accept any v<N>/ directory in the
  // repo, which covers archived older releases.
  const set = new Set<number>([
    channels.stable.mstone - 1,
    channels.stable.mstone,
    channels.beta.mstone,
    channels.dev.mstone,
  ]);
  try {
    for await (const entry of platform().readDir(".")) {
      if (entry.isDirectory && /^v\d+$/.test(entry.name)) {
        set.add(Number(entry.name.slice(1)));
      }
    }
  } catch {
    // ignore — some runtimes may not allow readDir at the root.
  }
  return set;
}
