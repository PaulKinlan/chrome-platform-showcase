#!/usr/bin/env -S deno run --allow-read --allow-write
// Feature id → the demo folder that covers it.
//
// The one-folder-per-feature rule means a feature listed against Chrome 155 is
// very often demonstrated in the folder for the milestone it shipped in. The
// release and category pages need to link there rather than reporting "demo
// pending", which is false and was the reason a reader could land on a
// milestone page and find nothing to open.
//
// This writes demo-index.json so the server reads one small file instead of
// scanning every feature folder on each isolate start. Rebuild with
// `deno task demo-index`; `deno task check-demo-index` fails if it is stale.

import { dirname, fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";

const ROOT = join(dirname(fromFileUrl(import.meta.url)), "..");
const OUTPUT = join(ROOT, "demo-index.json");

const CHROMESTATUS = /chromestatus\.com\/feature\/(\d+)/g;

export async function buildIndex(root = ROOT) {
  // Duplicated features record which folder is canonical — the milestone the
  // feature actually shipped in. Prefer that one when a feature has several.
  let canonicalById = new Map();
  try {
    const lineage = JSON.parse(await Deno.readTextFile(join(root, "feature-lineage.json")));
    for (const [id, record] of Object.entries(lineage.features ?? {})) {
      if (record?.canonical) canonicalById.set(Number(id), record.canonical);
    }
  } catch {
    canonicalById = new Map();
  }

  const folders = new Map(); // id → [dir]
  for await (const release of Deno.readDir(root)) {
    if (!release.isDirectory || !/^v\d+$/.test(release.name)) continue;
    for await (const feature of Deno.readDir(join(root, release.name))) {
      if (!feature.isDirectory) continue;
      let html;
      try {
        html = await Deno.readTextFile(join(root, release.name, feature.name, "index.html"));
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
      const suite = JSON.parse(await Deno.readTextFile(join(root, dir, "conformance.json")));
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
    generated: new Date().toISOString().slice(0, 10),
    count: Object.keys(demos).length,
    demos,
    probes,
  };
}

if (import.meta.main) {
  const check = Deno.args.includes("--check");
  const built = await buildIndex();
  if (check) {
    let existing;
    try {
      existing = JSON.parse(await Deno.readTextFile(OUTPUT));
    } catch {
      console.error("FAIL — demo-index.json is missing. Run `deno task demo-index`.");
      Deno.exit(1);
    }
    const before = JSON.stringify(existing.demos ?? {});
    const after = JSON.stringify(built.demos);
    if (before !== after) {
      const oldKeys = new Set(Object.keys(existing.demos ?? {}));
      const newKeys = new Set(Object.keys(built.demos));
      const added = [...newKeys].filter((k) => !oldKeys.has(k));
      const removed = [...oldKeys].filter((k) => !newKeys.has(k));
      const moved = [...newKeys].filter((k) =>
        oldKeys.has(k) && existing.demos[k] !== built.demos[k]
      );
      console.error("FAIL — demo-index.json is stale. Run `deno task demo-index`.");
      if (added.length) {
        console.error(
          `  ${added.length} feature(s) newly covered: ${added.slice(0, 5).join(", ")}`,
        );
      }
      if (removed.length) {
        console.error(
          `  ${removed.length} feature(s) no longer covered: ${removed.slice(0, 5).join(", ")}`,
        );
      }
      if (moved.length) {
        console.error(`  ${moved.length} feature(s) moved folder: ${moved.slice(0, 5).join(", ")}`);
      }
      Deno.exit(1);
    }
    console.log(`PASS — demo-index.json matches disk (${built.count} features covered)`);
    Deno.exit(0);
  }

  await Deno.writeTextFile(OUTPUT, `${JSON.stringify(built, null, 2)}\n`);
  console.log(`wrote demo-index.json — ${built.count} features covered`);
}
