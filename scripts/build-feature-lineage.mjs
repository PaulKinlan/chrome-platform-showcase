#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net --allow-env
// Build feature-lineage.json — the map from a ChromeStatus feature id to every
// milestone folder that hosts it.
//
// ChromeStatus lists a feature in the milestone listing for EVERY milestone its
// shipping estimate passed through. A feature that slipped from 138 to 147 is
// in six listings, so six milestone folders were built for one feature and the
// same API was demonstrated six times, each page claiming "Chrome N introduces
// this". That is the duplication this file exists to record and stop.
//
// The lineage names one CANONICAL folder per feature id — the milestone the
// feature actually shipped in, per `browsers.chrome.desktop` — and marks the
// rest as re-listings that must point at it rather than carry their own demo
// portfolio. `scripts/check-duplicate-features.mjs` reads this file and fails
// on any duplication that is not already recorded here.
//
// Usage: deno task feature-lineage

import { getFeature } from "../lib/chromestatus.ts";

const ROOT = new URL("../", import.meta.url).pathname.replace(/\/$/, "");

/** Every `v<N>/<slug>` folder that has an index.html, with its feature id. */
async function scanFolders() {
  const out = [];
  for await (const rel of Deno.readDir(ROOT)) {
    if (!rel.isDirectory || !/^v\d+$/.test(rel.name)) continue;
    const milestone = Number(rel.name.slice(1));
    for await (const feat of Deno.readDir(`${ROOT}/${rel.name}`)) {
      if (!feat.isDirectory) continue;
      const dir = `${rel.name}/${feat.name}`;
      let html;
      try {
        html = await Deno.readTextFile(`${ROOT}/${dir}/index.html`);
      } catch {
        continue;
      }
      const id = html.match(/chromestatus\.com\/feature\/(\d+)/)?.[1];
      if (!id) continue;
      let concepts = 0;
      for await (const c of Deno.readDir(`${ROOT}/${dir}`)) {
        if (!c.isDirectory) continue;
        try {
          await Deno.stat(`${ROOT}/${dir}/${c.name}/index.html`);
          concepts++;
        } catch { /* not a concept page */ }
      }
      const title = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]
        ?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() ?? feat.name;
      out.push({ id, milestone, dir, slug: feat.name, concepts, title });
    }
  }
  return out;
}

/** Resolve details for the duplicated ids only, a few at a time. */
async function fetchDetails(ids) {
  const details = new Map();
  const queue = [...ids];
  const worker = async () => {
    for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
      try {
        details.set(id, await getFeature(Number(id)));
      } catch (error) {
        console.error(`  ! ${id}: ${error.message}`);
        details.set(id, null);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return details;
}

/**
 * The canonical folder is the one whose milestone matches where the feature
 * actually shipped on desktop. When ChromeStatus has no shipping milestone, or
 * has one no folder was built for, fall back to the folder that carries the
 * most demo work — deleting the richest portfolio to satisfy a bookkeeping
 * rule would lose real pages.
 */
function pickCanonical(folders, detail) {
  const shipped = detail?.browsers?.chrome?.desktop ?? null;
  const exact = shipped === null ? undefined : folders.find((f) => f.milestone === shipped);
  if (exact) return { canonical: exact, basis: "shipped-milestone", shipped };
  const richest = [...folders].sort(
    (a, b) => b.concepts - a.concepts || b.milestone - a.milestone,
  )[0];
  return {
    canonical: richest,
    basis: shipped === null ? "no-shipping-milestone" : "shipping-milestone-not-built",
    shipped,
  };
}

const folders = await scanFolders();
const byId = new Map();
for (const f of folders) {
  if (!byId.has(f.id)) byId.set(f.id, []);
  byId.get(f.id).push(f);
}
const duplicated = [...byId].filter(([, list]) => list.length > 1);
console.log(
  `${folders.length} feature folders · ${byId.size} distinct features · ` +
    `${duplicated.length} appear in more than one milestone`,
);

console.log(`fetching ChromeStatus detail for ${duplicated.length} features…`);
const details = await fetchDetails(duplicated.map(([id]) => id));

const features = {};
for (const [id, list] of duplicated) {
  list.sort((a, b) => a.milestone - b.milestone);
  const detail = details.get(id);
  const { canonical, basis, shipped } = pickCanonical(list, detail);
  features[id] = {
    name: detail?.name ?? list[0].title,
    shippedDesktop: shipped,
    canonical: canonical.dir,
    canonicalBasis: basis,
    folders: list.map((f) => ({
      dir: f.dir,
      milestone: f.milestone,
      concepts: f.concepts,
      role: f.dir === canonical.dir ? "canonical" : "relisting",
    })),
  };
}

const payload = {
  // Regenerate with `deno task feature-lineage`. Hand edits are allowed for the
  // `canonical` field only — the rest is derived.
  generated: new Date().toISOString().slice(0, 10),
  totalFolders: folders.length,
  distinctFeatures: byId.size,
  duplicatedFeatures: duplicated.length,
  features: Object.fromEntries(Object.entries(features).sort()),
};
await Deno.writeTextFile(`${ROOT}/feature-lineage.json`, JSON.stringify(payload, null, 2) + "\n");

const relistings = Object.values(features).reduce(
  (n, f) => n + f.folders.filter((x) => x.role === "relisting").length,
  0,
);
console.log(
  `wrote feature-lineage.json — ${duplicated.length} features, ${relistings} re-listings`,
);
