import { getChannels, getMilestoneFeatures, slugify } from "../lib/chromestatus.ts";

const args = new Map();
for (let index = 0; index < Deno.args.length; index++) {
  const value = Deno.args[index];
  if (value.startsWith("--")) {
    args.set(value.slice(2), Deno.args[index + 1]?.startsWith("--") ? true : Deno.args[++index]);
  }
}

const ROOT = new URL("../", import.meta.url);
const JSON_OUTPUT = new URL(String(args.get("json") || "reports/demo-worklist.json"), ROOT);
const MARKDOWN_OUTPUT = new URL(String(args.get("markdown") || "reports/demo-worklist.md"), ROOT);
const ID_RE = /chromestatus\.com\/feature\/(\d+)/;
const PORTFOLIO = {
  basic: /(^|[-])(basic|quickstart|starter|minimal|hello|feature-detect|playground)([-]|$)/,
  tool:
    /(^|[-])(builder|inspector|explorer|visualizer|lab|studio|config|tester|debug|matrix|calculator|generator|editor|monitor|profiler|tracer|controller)([-]|$)/,
  practical:
    /(^|[-])(checkout|gallery|map|dashboard|meeting|caption|workflow|upload|chat|reader|recorder|player|navigation|form|print|session|payment|camera|microphone|timeline|chart|game|search|zoom)([-]|$)/,
  edge:
    /(^|[-])(fallback|compat|migration|error|failure|threat|security|privacy|denied|unsupported|edge|stress|race|conflict|recovery)([-]|$)/,
  novel: /(^|[-])(advanced|wild|composition|creative|experiment|art|synth|mashup)([-]|$)/,
};

async function exists(url) {
  try {
    return (await Deno.stat(url)).isFile;
  } catch {
    return false;
  }
}

async function releaseNumbers() {
  const values = [];
  for await (const entry of Deno.readDir(ROOT)) {
    if (entry.isDirectory && /^v\d+$/.test(entry.name)) values.push(Number(entry.name.slice(1)));
  }
  return values.sort((a, b) => a - b);
}

async function readJson(url, fallback) {
  try {
    return JSON.parse(await Deno.readTextFile(url));
  } catch {
    return fallback;
  }
}

async function critiqueCounts(featureUrl) {
  let major = 0;
  let moderate = 0;
  const files = [];
  if (await exists(new URL("_questions.json", featureUrl))) {
    files.push(new URL("_questions.json", featureUrl));
  }
  try {
    for await (const entry of Deno.readDir(featureUrl)) {
      if (!entry.isDirectory) continue;
      const path = new URL(`${entry.name}/_questions.json`, featureUrl);
      if (await exists(path)) files.push(path);
    }
  } catch {
    // No feature directory.
  }
  for (const file of files) {
    const report = await readJson(file, {});
    for (const question of report.openQuestions || []) {
      if (question.severity === "major") major++;
      if (question.severity === "moderate") moderate++;
    }
  }
  return { major, moderate, critiqueFiles: files.length };
}

async function localInventory() {
  const records = [];
  for (const milestone of await releaseNumbers()) {
    const release = `v${milestone}`;
    for await (const feature of Deno.readDir(new URL(`${release}/`, ROOT))) {
      if (!feature.isDirectory) continue;
      const featureUrl = new URL(`${release}/${feature.name}/`, ROOT);
      const indexUrl = new URL("index.html", featureUrl);
      if (!(await exists(indexUrl))) continue;
      const html = await Deno.readTextFile(indexUrl);
      // Identity comes from the EXPLICIT "ChromeStatus entry" reference links
      // (the skeleton's convention), not from any ID that happens to appear in
      // prose — pages legitimately mention related features' IDs in context
      // (e.g. interest-invokers discusses Popover Hint before its own entry).
      // Multiple labeled links are the original identity plus "current
      // listing" links added when ChromeStatus refiles a feature; index them
      // all so a refiled ID matches the existing demo. Pages without a
      // labeled link (uber demos) fall back to the first bare ID, matching
      // the previous behavior.
      const labeled = [
        ...new Set(
          [...html.matchAll(/chromestatus\.com\/feature\/(\d+)"[^>]*>\s*ChromeStatus entry/g)]
            .map((m) => Number(m[1])),
        ),
      ];
      const identities = labeled.length ? labeled : [
        ...new Set([...html.matchAll(new RegExp(ID_RE, "g"))].map((m) => Number(m[1]))),
      ].slice(0, 1);
      const identity = identities[0] ?? 0;
      const concepts = [];
      for await (const concept of Deno.readDir(featureUrl)) {
        if (
          concept.isDirectory && await exists(new URL(`${concept.name}/index.html`, featureUrl))
        ) concepts.push(concept.name);
      }
      const portfolio = Object.fromEntries(
        Object.entries(PORTFOLIO).map(([name, pattern]) => [
          name,
          concepts.some((slug) => pattern.test(slug)),
        ]),
      );
      records.push({
        milestone,
        release,
        slug: feature.name,
        route: `/${release}/${feature.name}/`,
        identity,
        identities,
        concepts: concepts.sort(),
        conceptCount: concepts.length,
        portfolio,
        portfolioGaps: Object.entries(portfolio).filter(([, found]) => !found).map(([name]) =>
          name
        ),
        ...(await critiqueCounts(featureUrl)),
      });
    }
  }
  return records;
}

const localReleases = await releaseNumbers();
const channels = await getChannels();
const minMilestone = Number(args.get("min") || localReleases[0]);
const maxMilestone = Number(
  args.get("max") || Math.max(localReleases.at(-1), channels.dev.mstone + 2),
);
const responsive = await readJson(new URL("responsive-support.json", ROOT), {});
const gendn = await readJson(new URL("gendn-links.json", ROOT), { routes: [] });
const gendnRoutes = new Set(gendn.routes || []);
const inventory = await localInventory();
const byMilestoneAndId = new Map();
// Primary identities (the first ID in each index) always win, deterministically.
// Aggregate pages are excluded here too: an uber demo carries no labeled
// identity link, so its fallback "identity" is just the first feature ID it
// happens to mention — inserting it would collide with that feature's real
// demo record, with the winner decided by directory iteration order.
for (const record of inventory) {
  if (/^uber-demo/.test(record.slug)) continue;
  byMilestoneAndId.set(`${record.milestone}:${record.identity}`, record);
}
// Secondary IDs only fill remaining gaps, and never from aggregate pages:
// an uber demo intentionally links many unrelated features' ChromeStatus IDs,
// which must not become identity aliases for those features.
for (const record of inventory) {
  if (/^uber-demo/.test(record.slug)) continue;
  for (const id of record.identities ?? []) {
    const key = `${record.milestone}:${id}`;
    if (!byMilestoneAndId.has(key)) byMilestoneAndId.set(key, record);
  }
}
// Every feature id built ANYWHERE, so a later milestone re-listing of an
// already-built feature is reported as covered rather than missing. ChromeStatus
// re-lists a feature in each milestone its shipping estimate passes through, and
// rebuilding it there is duplicate work the one-folder-per-feature rule forbids
// (AGENTS.md, "One demo folder per feature").
const builtAnywhere = new Map();
for (const record of inventory) {
  if (/^uber-demo/.test(record.slug)) continue;
  for (const id of record.identities ?? []) {
    if (!builtAnywhere.has(id)) builtAnywhere.set(id, []);
    builtAnywhere.get(id).push(record.route);
  }
}

const expected = [];

for (let milestone = minMilestone; milestone <= maxMilestone; milestone++) {
  const listing = await getMilestoneFeatures(milestone);
  const seen = new Set();
  for (const group of listing.groups) {
    if (/^(Deprecated|Removed)$/i.test(group.category)) continue;
    for (const feature of group.features) {
      if (seen.has(feature.id)) continue;
      seen.add(feature.id);
      expected.push({
        milestone,
        category: group.category,
        id: feature.id,
        name: feature.name,
        expectedSlug: slugify(feature.name),
      });
    }
  }
}

const work = expected.map((feature) => {
  const local = byMilestoneAndId.get(`${feature.milestone}:${feature.id}`);
  const route = local?.route || `/v${feature.milestone}/${feature.expectedSlug}/`;
  const support = responsive[route.replace(/^\//, "").replace(/\/$/, "")] || {};
  const reasons = [];
  let priority = 0;
  const coveredAt = local ? [] : (builtAnywhere.get(feature.id) ?? []);
  if (!local && coveredAt.length) {
    // Built under another milestone. Not work: regenerate the lineage so this
    // listing shows up in the note, and spend the time on an uncovered feature.
    reasons.push(`covered-elsewhere:${coveredAt.join(",")}`);
  } else if (!local) {
    reasons.push("missing-demo");
    priority += 100;
  } else {
    if (local.conceptCount < 2) {
      reasons.push(`thin:${local.conceptCount}-concepts`);
      priority += 70;
    }
    if (local.major) {
      reasons.push(`major-open-questions:${local.major}`);
      priority += 30 * local.major;
    }
    if (local.moderate) {
      reasons.push(`moderate-open-questions:${local.moderate}`);
      priority += 15 * local.moderate;
    }
    if (local.portfolioGaps.length) {
      reasons.push(`portfolio-heuristic-gaps:${local.portfolioGaps.join(",")}`);
      priority += 4 * local.portfolioGaps.length;
    }
    if (local.slug !== feature.expectedSlug) {
      reasons.push(`listing-slug-diff:${feature.expectedSlug}`);
    }
  }
  if (support.desktop !== "ok" || support.mobile !== "ok") {
    reasons.push(`responsive:${support.desktop || "untested"}/${support.mobile || "untested"}`);
    priority += 10;
  }
  const gendnAvailable = gendnRoutes.has(route);
  return {
    ...feature,
    route,
    built: !!local,
    coveredElsewhere: coveredAt.length ? coveredAt : undefined,
    gendnAvailable,
    priority,
    reasons,
    local,
  };
}).sort((a, b) =>
  b.priority - a.priority || b.milestone - a.milestone || a.name.localeCompare(b.name)
);

const built = work.filter((item) => item.built).length;
const coveredElsewhere = work.filter((item) => !item.built && item.coveredElsewhere).length;
const missing = work.length - built - coveredElsewhere;
const thin =
  work.filter((item) => item.reasons.some((reason) => reason.startsWith("thin:"))).length;
const portfolioUnassessed =
  work.filter((item) => item.built && item.local.portfolioGaps.length).length;
const responsiveComplete =
  work.filter((item) => !item.reasons.some((reason) => reason.startsWith("responsive:"))).length;
const actionable = work.filter((item) => item.reasons.length);
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  range: { minMilestone, maxMilestone },
  denominators: {
    expectedFeatures: work.length,
    built,
    coveredElsewhere,
    missing,
    thin,
    portfolioHeuristicUnassessed: portfolioUnassessed,
    responsiveComplete,
    actionable: actionable.length,
    gendnReferencesAvailable: work.filter((item) => item.gendnAvailable).length,
  },
  notes: [
    "ChromeStatus IDs are deduplicated within each milestone; Deprecated and Removed groups are excluded from expected build coverage.",
    "Portfolio categories are filename heuristics and remain unknown until source-backed feature research records the five-angle assessment.",
    "Unknown, untested, blocked, and missing states are never counted as complete.",
    "`coveredElsewhere` is a ChromeStatus re-listing of a feature already built under another milestone. It is not missing work — one feature gets one demo folder (AGENTS.md).",
  ],
  milestones: Object.fromEntries(
    Array.from({ length: maxMilestone - minMilestone + 1 }, (_, offset) => {
      const milestone = minMilestone + offset;
      const rows = work.filter((item) => item.milestone === milestone);
      return [`v${milestone}`, {
        expected: rows.length,
        built: rows.filter((item) => item.built).length,
        coveredElsewhere: rows.filter((item) => !item.built && item.coveredElsewhere).length,
        missing: rows.filter((item) => !item.built && !item.coveredElsewhere).length,
        actionable: rows.filter((item) => item.reasons.length).length,
      }];
    }),
  ),
  work: actionable,
};

await Deno.mkdir(new URL("./", JSON_OUTPUT), { recursive: true });
await Deno.mkdir(new URL("./", MARKDOWN_OUTPUT), { recursive: true });
await Deno.writeTextFile(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  "# Chrome Platform Showcase work-list",
  "",
  `Generated: ${report.generatedAt}`,
  `Milestones: v${minMilestone}–v${maxMilestone}`,
  "",
  "## Exact denominators",
  "",
  `- Expected ChromeStatus features: **${work.length}**`,
  `- Built: **${built}**`,
  `- Missing: **${missing}**`,
  `- Covered under another milestone (re-listings, do not rebuild): **${coveredElsewhere}**`,
  `- Thin (<2 concepts): **${thin}**`,
  `- Portfolio heuristic unassessed/gapped: **${portfolioUnassessed}**`,
  `- Responsive complete: **${responsiveComplete}/${work.length}**`,
  `- Matching gendn references available: **${report.denominators.gendnReferencesAvailable}**`,
  `- Actionable records: **${actionable.length}**`,
  "",
  "## Milestones",
  "",
  "| milestone | expected | built | re-listed | missing | actionable |",
  "|---|---:|---:|---:|---:|---:|",
  ...Object.entries(report.milestones).map(([milestone, value]) =>
    `| ${milestone} | ${value.expected} | ${value.built} | ${value.coveredElsewhere} | ${value.missing} | ${value.actionable} |`
  ),
  "",
  "## Highest-priority work",
  "",
  ...actionable.slice(0, 150).map((item) =>
    `- **${item.priority} · v${item.milestone} · ${item.name}** — ${
      item.reasons.join("; ")
    } — \`${item.route}\``
  ),
  "",
  "Portfolio gaps above are heuristic leads, not factual failures; close them only after primary-source research.",
];
await Deno.writeTextFile(MARKDOWN_OUTPUT, `${lines.join("\n")}\n`);
console.log(
  `worklist: ${built}/${work.length} built · ${coveredElsewhere} re-listed · ${missing} missing · ${thin} thin · ${actionable.length} actionable`,
);
console.log(`wrote ${JSON_OUTPUT.pathname} and ${MARKDOWN_OUTPUT.pathname}`);
