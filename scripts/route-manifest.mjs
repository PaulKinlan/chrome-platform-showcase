#!/usr/bin/env -S deno run --allow-read --allow-run --allow-env
// Route manifest emitter for the durable demo compatibility contract.
//
// Emits the normalized published-demo manifest for the CURRENT working tree:
//   [{ id, route, identity, status, aliases[], concepts[] }, ...]
// where `id` is `<release>/<feature-slug>`, `route` is the live URL, and
// `identity` is the stable descriptor (the ChromeStatus feature id, i.e. the
// feature/spec id). `built` and `blocked` entries are published; there is no
// `pending` placeholder in this repo (a feature is only in the tree once built).
//
// Usage:
//   deno run --allow-read --allow-run --allow-env scripts/route-manifest.mjs        # print to stdout
//   deno run --allow-read --allow-run --allow-env scripts/route-manifest.mjs --ref origin/main
//   deno run --allow-read --allow-run --allow-env scripts/route-manifest.mjs --write # refresh baseline
//
// (also runnable with `node scripts/route-manifest.mjs`)

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { buildFromDisk, buildFromGitRef, REPO_ROOT, serialize } from "./lib/manifest.mjs";

const args = process.argv.slice(2);
const refIdx = args.indexOf("--ref");
const ref = refIdx >= 0 ? args[refIdx + 1] : null;
const write = args.includes("--write");

const manifest = ref ? buildFromGitRef(ref) : buildFromDisk();
const output = serialize(manifest);

if (write) {
  const target = join(REPO_ROOT, ".route-manifest.baseline.json");
  writeFileSync(target, output);
  const built = manifest.filter((m) => m.status === "built").length;
  const blocked = manifest.filter((m) => m.status === "blocked").length;
  process.stderr.write(
    `Wrote ${target}: ${manifest.length} published (${built} built, ${blocked} blocked)\n`,
  );
} else {
  process.stdout.write(output);
}
