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

const CHROMESTATUS_RE = /chromestatus\.com\/feature\/(\d+)/g;
const UNSAFE_SCRIPT_RE =
  /\basync\b|\bawait\b|\bPromise\b|\bimport\s*\(|\bfetch\s*\(|\bWebSocket\b|\bXMLHttpRequest\b|\bWorker\b|\biframe\b|\bsetTimeout\b|\brequestAnimationFrame\b|\bshowOpenFilePicker\b|\bgetUserMedia\b|\brequestDevice\b|\bcredentials\b|\.src\s*=|\blocation\b/;

// Compute the feature id → demo folder + primary conformance probe index
// directly via platform() when ./demo-index.json is absent (the default in
// local Node checkouts, where demo-index.json is gitignored and only
// synthesized into dist/worker-assets/ at Worker build time).
async function computeDemoIndexFromPlatform(): Promise<DemoIndexData> {
  const fs = platform();
  let canonicalById = new Map<number, string>();
  try {
    const lineage = JSON.parse(await fs.readTextFile("./feature-lineage.json")) as {
      features?: Record<string, { canonical?: string }>;
    };
    for (const [id, record] of Object.entries(lineage.features ?? {})) {
      if (record?.canonical) canonicalById.set(Number(id), record.canonical);
    }
  } catch {
    canonicalById = new Map();
  }

  const folders = new Map<number, string[]>();
  try {
    for await (const release of fs.readDir(".")) {
      if (!release.isDirectory || !/^v\d+$/.test(release.name)) continue;
      for await (const feature of fs.readDir(release.name)) {
        if (!feature.isDirectory) continue;
        let html: string;
        try {
          html = await fs.readTextFile(`./${release.name}/${feature.name}/index.html`);
        } catch {
          continue;
        }
        const dir = `${release.name}/${feature.name}`;
        for (const match of html.matchAll(CHROMESTATUS_RE)) {
          const id = Number(match[1]);
          const list = folders.get(id) ?? [];
          if (!list.includes(dir)) list.push(dir);
          folders.set(id, list);
        }
      }
    }
  } catch {
    // Fallback if root readDir is restricted
  }

  const demos: Record<string, string> = {};
  const probes: Record<string, DemoProbe> = {};
  for (const [id, dirs] of [...folders.entries()].sort((a, b) => a[0] - b[0])) {
    const canonical = canonicalById.get(id);
    const sorted = [...dirs].sort((a, b) =>
      Number(b.slice(1).split("/")[0]) - Number(a.slice(1).split("/")[0])
    );
    const dir = canonical && dirs.includes(canonical) ? canonical : sorted[0];
    demos[String(id)] = dir;

    try {
      const suite = JSON.parse(await fs.readTextFile(`./${dir}/conformance.json`)) as {
        assertions?: Array<{ kind?: string; test?: string; expect?: string }>;
      };
      const assertions = (suite?.assertions ?? []).filter(
        (a): a is { kind: string; test: string; expect?: string } =>
          Boolean(a && a.kind && a.kind !== "manual" && typeof a.test === "string"),
      );
      const declarative = assertions.find((a) =>
        a.kind === "css-supports" || a.kind === "exists" || a.kind === "typeof"
      );
      const safeScript = assertions.find((a) =>
        (a.kind === "script" || a.kind === "throws") && !UNSAFE_SCRIPT_RE.test(a.test)
      );
      const autoAssertion = declarative ?? safeScript;
      if (autoAssertion) {
        const probe: DemoProbe = { kind: autoAssertion.kind, test: autoAssertion.test };
        if (autoAssertion.expect) probe.expect = autoAssertion.expect;
        probes[String(id)] = probe;
      }
    } catch {
      // No conformance.json or unreadable
    }
  }

  return { demos, probes };
}

// Feature id → the folder that demonstrates it + primary conformance probe.
// On Cloudflare Workers ./demo-index.json is staged at build time; locally it
// is computed in-memory once per process when absent on disk.
let demoIndexPromise: Promise<DemoIndexData> | null = null;

async function loadDemoIndexData(): Promise<DemoIndexData> {
  try {
    const parsed = JSON.parse(await platform().readTextFile("./demo-index.json"));
    return {
      demos: (parsed?.demos ?? {}) as Record<string, string>,
      probes: (parsed?.probes ?? {}) as Record<string, DemoProbe>,
    };
  } catch {
    return await computeDemoIndexFromPlatform();
  }
}

export function getDemoIndexData(): Promise<DemoIndexData> {
  if (!demoIndexPromise) {
    demoIndexPromise = loadDemoIndexData().catch((err) => {
      demoIndexPromise = null;
      throw err;
    });
  }
  return demoIndexPromise;
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
  return ` data-probe-kind="${escapeHTML(probe.kind)}" data-probe-test="${escapeHTML(probe.test)}"${
    probe.expect ? ` data-probe-expect="${escapeHTML(probe.expect)}"` : ""
  }`;
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
