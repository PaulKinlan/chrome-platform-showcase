#!/usr/bin/env -S deno run --allow-read
// Duplication gate: one demo portfolio per ChromeStatus feature.
//
// ChromeStatus lists a feature in the milestone listing for every milestone its
// shipping estimate passes through. Building a folder from each listing — the
// letter of the milestone rule — produced 164 features spread over 364 folders,
// a quarter of the catalogue re-demonstrating APIs that were already covered:
// <usermedia> was built four times (v144, v149, v150, v151) and local network
// access restrictions six times, each page claiming its own milestone
// introduced the feature.
//
// The rule from here:
//
//   1. A ChromeStatus feature id gets ONE folder carrying demos. If the id
//      already has a folder anywhere in the catalogue, a later milestone
//      listing does not get a second one.
//   2. The 364 folders that predate this rule are grandfathered — they are
//      recorded in feature-lineage.json and their URLs are durable. They may be
//      improved in place; they may not be joined by new siblings.
//   3. Every folder in a multi-milestone lineage must carry the lineage note
//      (`deno task apply-lineage`) so each page states which milestone the
//      feature actually shipped in and links the others.
//
// FAIL when:
//   A. a feature id has more than one folder and that spread is not already
//      recorded in feature-lineage.json (a NEW duplicate), OR
//   B. a recorded lineage gains a folder it did not have, OR
//   C. a folder in a recorded lineage is missing its lineage note.
//
// Usage: deno task check-duplicates

const ROOT = new URL("../", import.meta.url).pathname.replace(/\/$/, "");

async function scan() {
  const byId = new Map();
  const notes = new Map();
  for await (const rel of Deno.readDir(ROOT)) {
    if (!rel.isDirectory || !/^v\d+$/.test(rel.name)) continue;
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
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(dir);
      notes.set(dir, html.includes(`data-feature-lineage="${id}"`));
    }
  }
  return { byId, notes };
}

const lineage = JSON.parse(await Deno.readTextFile(`${ROOT}/feature-lineage.json`));
const { byId, notes } = await scan();

const failures = [];

for (const [id, dirs] of byId) {
  const recorded = lineage.features[id];
  if (dirs.length < 2) {
    if (recorded) {
      // A lineage shrank — a folder was removed or repointed. Not a duplication
      // failure (check-routes owns deletions), but the record is now wrong.
      failures.push(
        `feature ${id} is recorded in feature-lineage.json with ` +
          `${recorded.folders.length} folders but only ${dirs.length} exists — ` +
          `regenerate with \`deno task feature-lineage\``,
      );
    }
    continue;
  }
  if (!recorded) {
    failures.push(
      `NEW DUPLICATE: feature ${id} now has ${dirs.length} folders ` +
        `(${dirs.sort().join(", ")}). One ChromeStatus feature gets one demo folder. ` +
        `A later milestone listing of an already-built feature does not get a second ` +
        `portfolio — improve the existing folder instead.`,
    );
    continue;
  }
  const known = new Set(recorded.folders.map((f) => f.dir));
  for (const dir of dirs) {
    if (!known.has(dir)) {
      failures.push(
        `NEW DUPLICATE: ${dir} adds another folder for feature ${id}, which is already ` +
          `built at ${[...known].sort().join(", ")}. Improve the existing folder instead.`,
      );
    }
  }
}

for (const [id, feature] of Object.entries(lineage.features)) {
  for (const folder of feature.folders) {
    if (notes.get(folder.dir) === false) {
      failures.push(
        `${folder.dir} shares feature ${id} with ${feature.folders.length - 1} other ` +
          `milestone folder(s) but carries no lineage note — run \`deno task apply-lineage\``,
      );
    }
  }
}

const relistings = Object.values(lineage.features).reduce(
  (n, f) => n + f.folders.filter((x) => x.role === "relisting").length,
  0,
);

if (failures.length) {
  console.error("FAIL — feature duplication gate\n");
  for (const f of failures) console.error(`  · ${f}\n`);
  console.error(
    `${failures.length} problem(s). See the rule in AGENTS.md, "One demo folder per feature".`,
  );
  Deno.exit(1);
}

console.log(
  `PASS — feature duplication gate: ${byId.size} distinct features, ` +
    `${lineage.duplicatedFeatures} grandfathered lineages (${relistings} re-listings), ` +
    `0 new duplicates`,
);
