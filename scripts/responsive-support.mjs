#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env
// Responsive support-record tooling for the mobile + desktop parity invariant.
//
// The per-demo support record is a git-tracked sidecar `responsive-support.json`
// keyed by feature-demo id (`v<N>/<feature-slug>`, the durable-contract unit).
// This CLI seeds it, merges harness/scan results, and prints the coverage
// rollup (mobile/desktop tested/total/ok/needs-review/blocked denominators) —
// the reporting the parity policy requires "before every push".
//
//   deno task responsive-support seed     # add any new demos as {desktop,mobile:untested}
//   deno task responsive-support report   # print coverage denominators (default)
//   deno task responsive-support merge <results.json>  # fold a harness run in
//
// Also runnable with `node scripts/responsive-support.mjs`.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { buildFromDisk, REPO_ROOT } from "./lib/manifest.mjs";
import { coverage, loadSidecar, SUPPORT_CLASSES as CLASSES } from "./lib/support.mjs";

const SIDECAR = join(REPO_ROOT, "responsive-support.json");

function saveSidecar(data) {
  const ordered = {};
  for (const key of Object.keys(data).sort()) ordered[key] = data[key];
  writeFileSync(SIDECAR, JSON.stringify(ordered, null, 2) + "\n");
}

// Seed: every published (built) demo id gets a record; new ones default to
// untested. Existing records are never downgraded (monotonic — the parity
// policy forbids a class silently dropping back from ok).
function seed() {
  const manifest = buildFromDisk();
  const data = loadSidecar();
  let added = 0;
  for (const entry of manifest) {
    if (entry.status !== "built") continue;
    if (!data[entry.id]) {
      data[entry.id] = { desktop: "untested", mobile: "untested", source: "seed" };
      added++;
    }
  }
  saveSidecar(data);
  process.stderr.write(
    `seeded responsive-support.json: +${added} new, ${Object.keys(data).length} total\n`,
  );
}

// Merge a harness results file: { "<id>": { desktop, mobile, evidence?, ... } }.
// A real harness pass may set ok/broken; an overflow scan may only set
// needs-review (never ok). We refuse to overwrite a stronger state with a
// weaker automated-only one.
const STRENGTH = { ok: 4, unsupported: 4, broken: 3, "needs-review": 2, untested: 1 };
function merge(file) {
  const incoming = JSON.parse(readFileSync(file, "utf8"));
  const data = loadSidecar();
  let changed = 0;
  for (const [id, rec] of Object.entries(incoming)) {
    const cur = data[id] ?? { desktop: "untested", mobile: "untested" };
    const next = { ...cur };
    for (const cls of CLASSES) {
      if (!rec[cls]) continue;
      // overflow-scan may only downgrade to needs-review from untested, never
      // clobber ok/unsupported/broken.
      if (rec.source === "overflow-scan" && STRENGTH[cur[cls]] > STRENGTH["needs-review"]) continue;
      if (next[cls] !== rec[cls]) changed++;
      next[cls] = rec[cls];
    }
    for (const k of ["unsupportedClass", "evidence", "lastChecked", "source"]) {
      if (rec[k] !== undefined) next[k] = rec[k];
    }
    data[id] = next;
  }
  saveSidecar(data);
  process.stderr.write(`merged ${file}: ${changed} class state change(s)\n`);
}

function report() {
  const c = coverage(loadSidecar());
  const line = (label, t, tested) =>
    `  ${label}: ${t.ok}/${c.total} ok, ${t.unsupported} unsupported, ${tested}/${c.total} tested, ` +
    `${t["needs-review"]} needs-review, ${t.untested} untested, ${t.broken} broken`;
  process.stdout.write(
    `responsive support coverage (${c.total} published demos)\n` +
      line("desktop", c.desktop, c.testedD) + "\n" +
      line("mobile ", c.mobile, c.testedM) + "\n",
  );
  if (c.desktop.broken + c.mobile.broken > 0) {
    process.stdout.write(
      `  WARNING: ${
        c.desktop.broken + c.mobile.broken
      } class(es) recorded broken — the route gate will fail.\n`,
    );
  }
}

const cmd = process.argv[2] ?? "report";
if (cmd === "seed") seed();
else if (cmd === "merge") merge(process.argv[3]);
else if (cmd === "report") report();
else {
  process.stderr.write(
    `unknown command: ${cmd}\nusage: responsive-support seed|report|merge <file>\n`,
  );
  process.exit(2);
}
