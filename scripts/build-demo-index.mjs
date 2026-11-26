#!/usr/bin/env node
// Feature id → the demo folder that covers it.
//
// The one-folder-per-feature rule means a feature listed against Chrome 155 is
// very often demonstrated in the folder for the milestone it shipped in. The
// release and category pages need to link there rather than reporting "demo
// pending", which is false and was the reason a reader could land on a
// milestone page and find nothing to open.
//
// This builds the demo index in memory (used directly by
// `scripts/build-worker-assets.mjs` to synthesize `demo-index.json` into
// `dist/worker-assets/` at Worker build time, and on demand via
// `npm run demo-index` for local debugging). `npm run check-demo-index`
// verifies that the index builds cleanly from disk (and matches any local
// `demo-index.json` if one is present).

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "demo-index.json");

const CHROMESTATUS = /chromestatus\.com\/feature\/(\d+)/g;

export async function buildDemoIndex(root = ROOT) {
  // Duplicated features record which folder is canonical — the milestone the
  // feature actually shipped in. Prefer that one when a feature has several.
  let canonicalById = new Map();
  try {
    const raw = await readFile(join(root, "feature-lineage.json"), "utf8");
    const lineage = JSON.parse(raw);
    for (const [id, record] of Object.entries(lineage.features ?? {})) {
      if (record?.canonical) canonicalById.set(Number(id), record.canonical);
    }
  } catch (err) {
    if (err?.code !== "ENOENT") {
      throw new Error(`failed to read feature-lineage.json: ${err.message}`, { cause: err });
    }
    canonicalById = new Map();
  }

  const folders = new Map(); // id → [dir]
  for (const release of await readdir(root, { withFileTypes: true })) {
    if (!release.isDirectory() || !/^v\d+$/.test(release.name)) continue;
    for (const feature of await readdir(join(root, release.name), { withFileTypes: true })) {
      if (!feature.isDirectory()) continue;
      let html;
      try {
        html = await readFile(join(root, release.name, feature.name, "index.html"), "utf8");
      } catch {
        continue;
      }
      const dir = `${release.name}/${feature.name}`;
      for (const match of html.matchAll(CHROMESTATUS)) {
        const id = Number(match[1]);
        const list = folders.get(id) ?? [];
        if (!list.includes(dir)) list.push(dir);
        folders.set(id, list);
      }
    }
  }

  const demos = {};
  const probes = {};
  for (const [id, dirs] of [...folders.entries()].sort((a, b) => a[0] - b[0])) {
    const canonical = canonicalById.get(id);
    // Highest milestone as the fallback: for a feature listed in several
    // milestones and built once, the built folder is the answer whatever it is,
    // and for anything else the latest is the one still being improved.
    const sorted = [...dirs].sort((a, b) =>
      Number(b.slice(1).split("/")[0]) - Number(a.slice(1).split("/")[0])
    );
    const dir = canonical && dirs.includes(canonical) ? canonical : sorted[0];
    demos[id] = dir;

    try {
      const suite = JSON.parse(await readFile(join(root, dir, "conformance.json"), "utf8"));
      const assertions = (suite?.assertions ?? []).filter((a) =>
        a && a.kind && a.kind !== "manual" && typeof a.test === "string"
      );
      const declarative = assertions.find((a) =>
        a.kind === "css-supports" || a.kind === "exists" || a.kind === "typeof"
      );
      const safeScript = assertions.find((a) =>
        (a.kind === "script" || a.kind === "throws") &&
        !/\basync\b|\bawait\b|\bPromise\b|\bimport\s*\(|\bfetch\s*\(|\bWebSocket\b|\bXMLHttpRequest\b|\bWorker\b|\biframe\b|\bsetTimeout\b|\brequestAnimationFrame\b|\bshowOpenFilePicker\b|\bgetUserMedia\b|\brequestDevice\b|\bcredentials\b|\.src\s*=|\blocation\b/
          .test(a.test)
      );
      const autoAssertion = declarative ?? safeScript;
      if (autoAssertion) {
        const probe = { kind: autoAssertion.kind, test: autoAssertion.test };
        if (autoAssertion.expect) probe.expect = autoAssertion.expect;
        probes[id] = probe;
      }
    } catch {
      // No conformance.json or unreadable
    }
  }

  return {
    count: Object.keys(demos).length,
    demos,
    probes,
  };
}

export { buildDemoIndex as buildIndex };

if (import.meta.main) {
  const check = process.argv.slice(2).includes("--check");
  let built;
  try {
    built = await buildDemoIndex();
  } catch (err) {
    console.error(`FAIL — ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
  if (check) {
    if (built.count <= 0) {
      console.error("FAIL — demo index built 0 features from disk.");
      process.exit(1);
    }
    let rawExisting;
    try {
      rawExisting = await readFile(OUTPUT, "utf8");
    } catch (err) {
      if (err?.code === "ENOENT") {
        console.log(
          `PASS — demo index builds cleanly from disk (${built.count} features covered)`,
        );
        process.exit(0);
      }
      console.error(`FAIL — could not read demo-index.json: ${err.message}`);
      process.exit(1);
    }
    let existing;
    try {
      existing = JSON.parse(rawExisting);
    } catch (err) {
      console.error(`FAIL — demo-index.json is malformed JSON: ${err.message}`);
      process.exit(1);
    }
    const before = JSON.stringify(existing.demos ?? {});
    const after = JSON.stringify(built.demos);
    const probesBefore = JSON.stringify(existing.probes ?? {});
    const probesAfter = JSON.stringify(built.probes);
    const stale = [];
    if (before !== after) {
      stale.push("demos");
      const oldKeys = new Set(Object.keys(existing.demos ?? {}));
      const newKeys = new Set(Object.keys(built.demos));
      const added = [...newKeys].filter((k) => !oldKeys.has(k));
      const removed = [...oldKeys].filter((k) => !newKeys.has(k));
      const moved = [...newKeys].filter((k) =>
        oldKeys.has(k) && existing.demos[k] !== built.demos[k]
      );
      console.error("  demos:");
      if (added.length) {
        console.error(
          `    ${added.length} feature(s) newly covered: ${added.slice(0, 5).join(", ")}`,
        );
      }
      if (removed.length) {
        console.error(
          `    ${removed.length} feature(s) no longer covered: ${removed.slice(0, 5).join(", ")}`,
        );
      }
      if (moved.length) {
        console.error(
          `    ${moved.length} feature(s) moved folder: ${moved.slice(0, 5).join(", ")}`,
        );
      }
    }
    // `probes` is derived from the same `conformance.json` files, but was not
    // compared here, so a probes-only change passed this gate while the served
    // index stayed stale (bead chrome_platform_showcase-92w).
    if (probesBefore !== probesAfter) {
      stale.push("probes");
      const oldKeys = new Set(Object.keys(existing.probes ?? {}));
      const newKeys = new Set(Object.keys(built.probes));
      const added = [...newKeys].filter((k) => !oldKeys.has(k));
      const removed = [...oldKeys].filter((k) => !newKeys.has(k));
      const changed = [...newKeys].filter((k) =>
        oldKeys.has(k) && JSON.stringify(existing.probes[k]) !== JSON.stringify(built.probes[k])
      );
      console.error("  probes:");
      if (added.length) {
        console.error(
          `    ${added.length} probe(s) newly derivable: ${added.slice(0, 5).join(", ")}`,
        );
      }
      if (removed.length) {
        console.error(
          `    ${removed.length} probe(s) no longer derivable: ${removed.slice(0, 5).join(", ")}`,
        );
      }
      if (changed.length) {
        console.error(
          `    ${changed.length} probe(s) changed: ${changed.slice(0, 5).join(", ")}`,
        );
      }
    }
    if (stale.length) {
      console.error(
        `FAIL — demo-index.json is stale (${stale.join(" + ")}). Run \`npm run demo-index\`.`,
      );
      process.exit(1);
    }
    console.log(`PASS — demo-index.json matches disk (${built.count} features covered)`);
    process.exit(0);
  }

  await writeFile(OUTPUT, `${JSON.stringify(built, null, 2)}\n`);
  console.log(`wrote demo-index.json — ${built.count} features covered`);
}
