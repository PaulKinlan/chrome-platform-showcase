#!/usr/bin/env -S deno run --allow-read --allow-net --allow-env
// "I never want to be in a state where there is no demo." — Paul, 2026-08-25
//
// Every feature listed on a milestone page must resolve to a demo somewhere:
// either that milestone's own folder, or — under the one-folder-per-feature
// rule — the folder for the milestone the feature shipped in. This gate fails
// if any listing would render "demo pending", so the site cannot regress into
// advertising a feature it does not demonstrate.
//
// Network-dependent (it reads the live ChromeStatus milestone listings), so it
// runs alongside `check-routes` before a push rather than inside `deno task
// check`. A fetch failure fails the gate: an unverifiable claim is not a pass.

import { getChannels, getMilestoneFeatures, slugify } from "../lib/chromestatus.ts";
import { buildIndex } from "./build-demo-index.mjs";

const index = (await buildIndex()).demos;

const milestones = new Set();
const channels = await getChannels();
milestones.add(channels.stable.mstone - 1);
milestones.add(channels.stable.mstone);
milestones.add(channels.beta.mstone);
milestones.add(channels.dev.mstone);
for await (const entry of Deno.readDir(".")) {
  if (entry.isDirectory && /^v\d+$/.test(entry.name)) milestones.add(Number(entry.name.slice(1)));
}

const missing = [];
let listed = 0;
let sameMilestone = 0;
let elsewhere = 0;

for (const m of [...milestones].sort((a, b) => b - a)) {
  let feats;
  try {
    feats = await getMilestoneFeatures(m);
  } catch (err) {
    console.error(`FAIL — could not read the Chrome ${m} listing: ${err.message}`);
    console.error("  Coverage is unverified, which this gate treats as a failure.");
    Deno.exit(1);
  }
  const seen = new Set();
  for (const group of feats.groups) {
    for (const f of group.features) {
      const slug = slugify(f.name);
      if (seen.has(slug)) continue;
      seen.add(slug);
      listed++;
      let own = false;
      try {
        await Deno.stat(`./v${m}/${slug}/index.html`);
        own = true;
      } catch { /* not built here */ }
      if (own) sameMilestone++;
      else if (index[String(f.id)]) elsewhere++;
      else missing.push({ mstone: m, id: f.id, name: f.name, slug });
    }
  }
}

console.log(
  `demo coverage — ${listed} listed feature(s): ${sameMilestone} demonstrated in their own ` +
    `milestone, ${elsewhere} in the milestone they shipped in, ${missing.length} with no demo`,
);

if (missing.length) {
  console.error('\nFAIL — these listings would render "demo pending":');
  for (const m of missing) {
    console.error(`  v${m.mstone}/${m.slug}  (feature ${m.id}) — ${m.name}`);
  }
  console.error(
    "\nBuild a demo for each, or — if the feature is already covered under another " +
      "name — link its folder to the feature id so demo-index.json can find it.",
  );
  Deno.exit(1);
}

console.log("PASS — every listed feature resolves to a demo.");
