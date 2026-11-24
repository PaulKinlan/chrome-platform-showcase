#!/usr/bin/env node
// Stage the files the Cloudflare Worker serves into dist/worker-assets/.
//
// The Deno server reads demo files straight from the repository. A Worker has
// no filesystem, so wrangler uploads this staged copy as static assets and the
// Worker reads it back through the ASSETS binding (see worker/index.ts and
// lib/platform.ts). Directory listings are answered from
// dist/worker-assets/_worker/fs-manifest.json, written here.
//
// What is staged mirrors what the routes read from disk:
//   v<N>/**            demo pages, concept folders, conformance.json, _questions.json
//   public/**          shared design system + client scripts
//   demo-index.json    feature id -> demo folder
//   gendn-links.json   reference-doc cross links
// Never staged: `_server.ts` handlers (bundled into the Worker as code instead).
//
// Every request goes to the Worker first (run_worker_first in wrangler.jsonc),
// so nothing here is reachable except through the same routes as on Deno.
//
// Runs under Node (Cloudflare's build image, `wrangler` build hook) and Deno.
// Usage: node scripts/build-worker-assets.mjs [--out dist/worker-assets]

import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outArg = process.argv.indexOf("--out");
const OUT = resolve(ROOT, outArg !== -1 ? process.argv[outArg + 1] : "dist/worker-assets");

// Cloudflare Workers static-assets limits (free plan file count, per-file size).
const MAX_FILES = 20_000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const ROOT_FILES = ["demo-index.json", "gendn-links.json"];
const SKIP_NAMES = new Set(["_server.ts", ".DS_Store"]);
// Must match BUNDLED_NAMES in worker/fs.ts.
const BUNDLED_NAMES = ["_questions.json", "conformance.json"];

function walk(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_NAMES.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
    // Symlinks are deliberately not followed: the asset store must only hold
    // files that live inside the repository.
  }
}

const sources = [];
for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
  if (entry.isDirectory() && (/^v\d+$/.test(entry.name) || entry.name === "public")) {
    walk(join(ROOT, entry.name), sources);
  }
}
for (const name of ROOT_FILES) sources.push(join(ROOT, name));

const files = sources.map((full) => relative(ROOT, full).split("\\").join("/")).sort();

const problems = [];
if (files.length + 1 + BUNDLED_NAMES.length > MAX_FILES) {
  problems.push(`${files.length} files exceeds the ${MAX_FILES}-file static-assets limit`);
}
for (const file of files) {
  const size = statSync(join(ROOT, file)).size;
  if (size > MAX_FILE_BYTES) problems.push(`${file} is ${size} bytes (limit ${MAX_FILE_BYTES})`);
}
if (problems.length) {
  console.error(`build-worker-assets: FAIL\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
for (const file of files) {
  const dest = join(OUT, file);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(ROOT, file), dest);
}

mkdirSync(join(OUT, "_worker"), { recursive: true });

// The /critiques and /conformance listings read every _questions.json and
// conformance.json (about 3,200 files). One ASSETS fetch per file would blow
// through the Worker's subrequest limit, so each kind is also bundled into a
// single JSON object { path: text } that the Worker loads once per isolate.
for (const name of BUNDLED_NAMES) {
  const bundle = {};
  for (const file of files) {
    if (file.endsWith(`/${name}`)) bundle[file] = readFileSync(join(ROOT, file), "utf8");
  }
  writeFileSync(join(OUT, "_worker", `bundle-${name}`), JSON.stringify(bundle));
}

writeFileSync(
  join(OUT, "_worker", "fs-manifest.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), files }),
);

console.log(`build-worker-assets: staged ${files.length} files into ${relative(ROOT, OUT)}/`);
