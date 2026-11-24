#!/usr/bin/env node
// Stage the files the Cloudflare Worker serves into dist/worker-assets/.
//
// The Node server reads demo files straight from the repository. A Worker has
// no filesystem, so wrangler uploads this staged copy as static assets and the
// Worker reads it back through the ASSETS binding (see worker/index.ts and
// lib/platform.ts). Directory listings are answered from
// dist/worker-assets/_worker/fs-manifest.json, written here.
//
// What is staged mirrors what the routes read from disk:
//   v<N>/**            demo pages, concept folders (conformance.json,
//                      _questions.json, and page.json are bundled under
//                      _worker/ instead of staged individually, while
//                      remaining in fs-manifest.json)
//   public/**          shared design system + client scripts
//   demo-index.json    feature id -> demo folder
//   gendn-links.json   reference-doc cross links
// Never staged: `_server.ts` handlers (bundled into the Worker as code instead),
// `_support.json` (build/audit responsive-support metadata), and `.DS_Store`.
//
// Every request goes to the Worker first (run_worker_first in wrangler.jsonc),
// so nothing here is reachable except through the same routes as on the Node server.
//
// Runs under Node (Cloudflare's build image, `wrangler` build hook, `npm run worker-assets`).
// Usage: node scripts/build-worker-assets.mjs [--root .] [--out dist/worker-assets]

import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rootArg = process.argv.indexOf("--root");
const ROOT = rootArg !== -1 ? resolve(process.argv[rootArg + 1]) : DEFAULT_ROOT;
const outArg = process.argv.indexOf("--out");
const OUT = resolve(ROOT, outArg !== -1 ? process.argv[outArg + 1] : "dist/worker-assets");

// Cloudflare Workers static-assets limits (free plan file count, per-file size).
const MAX_FILES = 20_000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const ROOT_FILES = ["demo-index.json", "gendn-links.json"];
const SKIP_NAMES = new Set(["_server.ts", "_support.json", ".DS_Store"]);
// Must match BUNDLED_NAMES in worker/fs.ts.
const BUNDLED_NAMES = ["_questions.json", "conformance.json", "page.json"];
const BUNDLED_SET = new Set(BUNDLED_NAMES);

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

// Partition into files staged individually vs files served exclusively from
// _worker/bundle-<name>. Both remain in fs-manifest.json so platform().stat()
// and platform().readDir() on the Worker see every file identically.
const individualFiles = [];
const bundledFiles = [];
for (const file of files) {
  if (BUNDLED_SET.has(basename(file))) bundledFiles.push(file);
  else individualFiles.push(file);
}

// The /critiques, /conformance, /experiments, and /friction listings read
// every _questions.json, conformance.json, and page.json (thousands of files).
// One ASSETS fetch per file would blow through the Worker's subrequest limit,
// and staging them individually wastes static-assets file slots, so each kind
// is bundled into a single JSON object { path: text } that the Worker loads
// once per isolate.
const bundles = new Map();
for (const name of BUNDLED_NAMES) {
  const bundle = {};
  for (const file of bundledFiles) {
    if (basename(file) === name) bundle[file] = readFileSync(join(ROOT, file), "utf8");
  }
  bundles.set(`_worker/bundle-${name}`, JSON.stringify(bundle));
}

const manifestJson = JSON.stringify({ generatedAt: new Date().toISOString(), files });
const workerMetaCount = 1 + BUNDLED_NAMES.length;
const stagedCount = individualFiles.length + workerMetaCount;

const problems = [];
if (stagedCount > MAX_FILES) {
  problems.push(
    `${stagedCount} staged files (${individualFiles.length} individual + ${workerMetaCount} _worker) exceeds the ${MAX_FILES}-file static-assets limit`,
  );
}
for (const file of individualFiles) {
  const size = statSync(join(ROOT, file)).size;
  if (size > MAX_FILE_BYTES) problems.push(`${file} is ${size} bytes (limit ${MAX_FILE_BYTES})`);
}
for (const [bundlePath, json] of bundles) {
  const size = Buffer.byteLength(json, "utf8");
  if (size > MAX_FILE_BYTES) {
    problems.push(`${bundlePath} is ${size} bytes (limit ${MAX_FILE_BYTES})`);
  }
}
const manifestBytes = Buffer.byteLength(manifestJson, "utf8");
if (manifestBytes > MAX_FILE_BYTES) {
  problems.push(`_worker/fs-manifest.json is ${manifestBytes} bytes (limit ${MAX_FILE_BYTES})`);
}
if (problems.length) {
  console.error(`build-worker-assets: FAIL\n  ${problems.join("\n  ")}`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
for (const file of individualFiles) {
  const dest = join(OUT, file);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(ROOT, file), dest);
}

mkdirSync(join(OUT, "_worker"), { recursive: true });
for (const [bundlePath, json] of bundles) {
  writeFileSync(join(OUT, bundlePath), json);
}
writeFileSync(join(OUT, "_worker", "fs-manifest.json"), manifestJson);

console.log(
  `build-worker-assets: staged ${stagedCount} files (${individualFiles.length} individual + ${workerMetaCount} _worker; ${bundledFiles.length} bundled, ${files.length} total in manifest) into ${
    relative(ROOT, OUT)
  }/`,
);
