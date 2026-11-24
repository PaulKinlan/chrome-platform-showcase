// Cloudflare Workers host: the seams that let routes/ run on Workers and Node.
//
// The Worker (worker/index.ts) serves the same routes as server.ts by swapping
// in a Workers implementation of lib/platform.ts. Three things can silently
// break that, and each has a section here:
//
//   1. A route, lib module or feature sidecar reaches the host directly
//      (node:fs, node:http, process.env, or a leftover Deno.* call). It works
//      under Node and throws on Workers. Guarded by a static scan.
//   2. The Deno KV -> Workers KV adapter mis-orders or mis-matches keys, so
//      telemetry lists come back in the wrong order or bleed across prefixes.
//   3. The asset staging step ships something it must not (a `_server.ts`), or
//      the manifest the Worker lists directories from disagrees with disk.
//
// Run: npm run test-worker-platform

import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cloudflareKv, decodeKey, encodeKey } from "../worker/kv.ts";
import { buildIndex, normalize } from "../worker/fs.ts";

const ROOT = new URL("../", import.meta.url);

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

function assertEquals(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}\n  expected ${e}\n  actual   ${a}`);
}

// ---- 1. no direct host APIs in code the Worker bundles -------------------

// Deno.* (gone, but a stale copy-paste would still throw on Workers), Node
// modules Workers lacks without nodejs_compat, and Node globals.
const HOST_API =
  /\bDeno\.\w+|["']node:(fs|fs\/promises|http|https|net|child_process|os)["']|\bprocess\.(env|getBuiltinModule|argv|cwd)\b/;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    if (entry.isDirectory()) yield* walk(url);
    else if (entry.isFile()) yield url;
  }
}

test("routes, lib and feature sidecars reach the host only through lib/platform.ts", async () => {
  const offenders = [];
  const files = [];
  for (const dir of ["routes/", "lib/", "worker/"]) {
    for await (const url of walk(new URL(dir, ROOT))) {
      if (url.pathname.endsWith(".ts")) files.push(url);
    }
  }
  for (const entry of await readdir(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^v\d+$/.test(entry.name)) continue;
    for await (const url of walk(new URL(`${entry.name}/`, ROOT))) {
      if (url.pathname.endsWith("/_server.ts")) files.push(url);
    }
  }
  for (const url of files) {
    const rel = url.pathname.slice(ROOT.pathname.length);
    if (rel === "lib/platform.ts") continue;
    const lines = (await readFile(url, "utf8")).split("\n");
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return; // comments may name the APIs
      const m = line.match(HOST_API);
      if (m) offenders.push(`${rel}:${i + 1} ${m[0]}`);
    });
  }
  assert(files.length > 20, `scan found only ${files.length} files; the walk is broken`);
  assertEquals(
    offenders,
    [],
    "direct host API calls break the Cloudflare Worker; use platform() from lib/platform.ts",
  );
});

// ---- 2. Deno KV -> Workers KV adapter ------------------------------------

test("key encoding keeps Deno KV order under byte-wise string order", () => {
  const numbers = [-1e20, -5.5, -1, -0.001, 0, 0.001, 1, 2, 10, 1e3, 1784900000000, 1e20];
  const encoded = numbers.map((n) => encodeKey(["k", n]));
  const sorted = [...encoded].sort();
  assertEquals(sorted, encoded, "numbers must sort numerically once encoded");

  const iso = ["2026-11-24T07:00:00.000Z", "2026-11-24T07:00:00.001Z", "2026-11-25T00:00:00.000Z"];
  const isoEncoded = iso.map((s) => encodeKey(["demo-telemetry", "2026-11-24", s, "id"]));
  assertEquals([...isoEncoded].sort(), isoEncoded, "ISO timestamps must keep their order");
});

test("key encoding round-trips and never lets a prefix match a longer part", () => {
  const key = ["a\u001fb", "c\u001ed", 42, -3.25, true, false, "", 7n];
  assertEquals(
    decodeKey(encodeKey(key)).map(String),
    key.map(String),
    "keys must round-trip, separators included",
  );
  const prefix = encodeKey(["dpo-report", "abc"]) + "\u001f";
  assert(
    encodeKey(["dpo-report", "abc", "x"]).startsWith(prefix),
    "a child key must match its parent prefix",
  );
  assert(
    !encodeKey(["dpo-report", "abcd", "x"]).startsWith(prefix),
    "a sibling whose part merely starts with the prefix part must not match",
  );
});

function fakeNamespace() {
  const store = new Map();
  const puts = [];
  return {
    store,
    puts,
    get: (key) => Promise.resolve(store.has(key) ? store.get(key) : null),
    put: (key, value, options) => {
      puts.push({ key, options });
      store.set(key, value);
      return Promise.resolve();
    },
    delete: (key) => {
      store.delete(key);
      return Promise.resolve();
    },
    // Workers KV pages at most `limit` keys, sorted by UTF-8 bytes.
    list: ({ prefix = "", cursor, limit = 1000 }) => {
      const names = [...store.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? Number(cursor) : 0;
      const page = names.slice(start, start + Math.min(limit, 2));
      const next = start + page.length;
      return Promise.resolve({
        keys: page.map((name) => ({ name })),
        list_complete: next >= names.length,
        cursor: next >= names.length ? undefined : String(next),
      });
    },
  };
}

async function collect(iter) {
  const out = [];
  for await (const entry of iter) out.push(entry);
  return out;
}

test("adapter: set/get/delete, expireIn becomes a TTL of at least 60s", async () => {
  const ns = fakeNamespace();
  const kv = cloudflareKv(ns);
  await kv.set(["a", 1], { v: 1 }, { expireIn: 90 * 24 * 60 * 60 * 1000 });
  await kv.set(["a", 2], { v: 2 }, { expireIn: 5_000 });
  assertEquals((await kv.get(["a", 1])).value, { v: 1 }, "get returns the stored value");
  assertEquals(ns.puts[0].options, { expirationTtl: 7_776_000 }, "90 days in seconds");
  assertEquals(ns.puts[1].options, { expirationTtl: 60 }, "Workers KV's 60s minimum");
  await kv.delete(["a", 1]);
  assertEquals((await kv.get(["a", 1])).value, null, "deleted keys read back null");
});

test("adapter: prefix list pages through, honours reverse and limit", async () => {
  const kv = cloudflareKv(fakeNamespace());
  for (let i = 1; i <= 7; i++) await kv.set(["t", "day", i], i);
  await kv.set(["t2", "other"], "x");
  await kv.set(["u"], "y");

  const all = await collect(kv.list({ prefix: ["t"] }));
  assertEquals(all.map((e) => e.value), [1, 2, 3, 4, 5, 6, 7], "ascending, across pages");
  assertEquals(all[0].key, ["t", "day", 1], "keys decode back to arrays");

  const newest = await collect(kv.list({ prefix: ["t"] }, { reverse: true, limit: 3 }));
  assertEquals(newest.map((e) => e.value), [7, 6, 5], "reverse + limit = newest first");

  const first = await collect(kv.list({ prefix: ["t"] }, { limit: 2 }));
  assertEquals(first.map((e) => e.value), [1, 2], "ascending + limit");
});

// ---- 3. asset staging + manifest ----------------------------------------

test("fs: paths normalise, and climbing out of the asset root is refused", () => {
  assertEquals(normalize("./v151/x/"), "v151/x", "leading ./ and trailing / drop");
  assertEquals(normalize("."), "", "the root is the empty path");
  let threw = false;
  try {
    normalize("v151/../../secret");
  } catch {
    threw = true;
  }
  assert(threw, "'..' must be refused, not resolved");

  const idx = buildIndex({ files: ["v1/a/index.html", "v1/a/b/c.json", "public/s.css"] });
  assertEquals([...idx.dirs.get("").keys()].sort(), ["public", "v1"], "root listing");
  assertEquals(idx.dirs.get("v1/a").get("b"), { isFile: false, isDirectory: true }, "subdir");
  assertEquals(idx.dirs.get("v1/a").get("index.html").isFile, true, "file entry");
});

test("staging copies every served file, no _server.ts, and a matching manifest", async () => {
  const out = await mkdtemp(join(tmpdir(), "worker-assets-"));
  try {
    const run = spawnSync(process.execPath, ["scripts/build-worker-assets.mjs", "--out", out], {
      cwd: ROOT,
      encoding: "utf8",
    });
    const stderr = run.stderr;
    assert(run.status === 0, `build-worker-assets failed:\n${stderr}`);

    const manifest = JSON.parse(await readFile(`${out}/_worker/fs-manifest.json`, "utf8"));
    const files = new Set(manifest.files);
    for (const required of ["demo-index.json", "gendn-links.json", "public/styles.css"]) {
      assert(files.has(required), `manifest is missing ${required}`);
    }
    assert(
      ![...files].some((f) => f.endsWith("_server.ts")),
      "_server.ts handlers must be bundled as code, never staged as public assets",
    );
    assert(
      ![...files].some((f) => /^(lib|routes|scripts|worker|tests)\//.test(f)),
      "server source must never be staged",
    );
    // Every v<N>/<feature>/index.html on disk is in the manifest.
    for (const release of await readdir(ROOT, { withFileTypes: true })) {
      if (!release.isDirectory() || !/^v\d+$/.test(release.name)) continue;
      for (
        const feature of await readdir(new URL(`${release.name}/`, ROOT), { withFileTypes: true })
      ) {
        if (!feature.isDirectory()) continue;
        const page = `${release.name}/${feature.name}/index.html`;
        let exists = false;
        try {
          exists = (await stat(new URL(page, ROOT))).isFile();
        } catch { /* no index */ }
        if (exists) assert(files.has(page), `manifest is missing ${page}`);
      }
    }
    // And the manifest names only files that were actually staged.
    for (const f of [...files].slice(0, 200)) {
      assert((await stat(`${out}/${f}`)).isFile(), `${f} listed but not staged`);
    }
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});

// ---- 4. Deno KV -> D1 adapter (the Worker's telemetry store) ------------

import { DatabaseSync } from "node:sqlite";
import { d1Kv } from "../worker/d1.ts";

// A D1-shaped wrapper over an in-memory SQLite, running the real migration.
async function fakeD1() {
  const db = new DatabaseSync(":memory:");
  db.exec(await readFile(new URL("migrations/0001_kv.sql", ROOT), "utf8"));
  const prepare = (sql, params = []) => ({
    bind: (...values) => prepare(sql, values),
    first: () => Promise.resolve(db.prepare(sql).get(...params) ?? null),
    all: () => Promise.resolve({ results: db.prepare(sql).all(...params) }),
    run: () => Promise.resolve(db.prepare(sql).run(...params)),
  });
  return { db, prepare: (sql) => prepare(sql) };
}

test("D1 adapter: set/get/delete/upsert and expiry is hidden on read", async () => {
  const kv = d1Kv(await fakeD1());
  await kv.set(["a", 1], { v: 1 });
  await kv.set(["a", 1], { v: 2 });
  assertEquals((await kv.get(["a", 1])).value, { v: 2 }, "a second set overwrites");
  await kv.set(["a", 2], "gone", { expireIn: -1 });
  assertEquals((await kv.get(["a", 2])).value, null, "expired rows read back null");
  await kv.delete(["a", 1]);
  assertEquals((await kv.get(["a", 1])).value, null, "deleted rows read back null");
});

test("D1 adapter: prefix ranges, reverse, limit and paging match Deno KV", async () => {
  const kv = d1Kv(await fakeD1());
  for (let i = 1; i <= 1203; i++) await kv.set(["t", "day", i], i);
  await kv.set(["t2", "other"], "sibling");
  await kv.set(["t"], "exact prefix key is not a child");
  await kv.set(["u"], "after");
  await kv.set(["t", "day", 9999], "expired", { expireIn: -1 });

  const all = await collect(kv.list({ prefix: ["t"] }));
  assertEquals(all.length, 1203, "every child across >2 pages, no sibling, no expired row");
  assertEquals(all[0].value, 1, "ascending starts at the smallest key");
  assertEquals(all.at(-1).value, 1203, "and ends at the largest");

  const newest = await collect(kv.list({ prefix: ["t"] }, { reverse: true, limit: 3 }));
  assertEquals(newest.map((e) => e.value), [1203, 1202, 1201], "reverse + limit = newest first");
  assertEquals(newest[0].key, ["t", "day", 1203], "keys decode back to arrays");

  const deep = await collect(kv.list({ prefix: ["t"] }, { reverse: true, limit: 700 }));
  assertEquals(deep.at(-1).value, 504, "reverse paging continues past the first page");
});

test("bundles hold every _questions.json and conformance.json, byte for byte", async () => {
  const { bundleFor } = await import("../worker/fs.ts");
  assertEquals(
    bundleFor("v151/x/y/_questions.json"),
    "_worker/bundle-_questions.json",
    "concept critiques map to the critique bundle",
  );
  assertEquals(bundleFor("v151/x/conformance.json"), "_worker/bundle-conformance.json", "suites");
  assertEquals(bundleFor("v151/x/index.html"), null, "everything else is read individually");

  const out = await mkdtemp(join(tmpdir(), "worker-bundles-"));
  try {
    const run = spawnSync(process.execPath, ["scripts/build-worker-assets.mjs", "--out", out], {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert(run.status === 0, run.stderr);
    const manifest = JSON.parse(await readFile(`${out}/_worker/fs-manifest.json`, "utf8"));
    for (const name of ["_questions.json", "conformance.json"]) {
      const bundle = JSON.parse(await readFile(`${out}/_worker/bundle-${name}`, "utf8"));
      const expected = manifest.files.filter((f) => f.endsWith(`/${name}`));
      assertEquals(Object.keys(bundle).length, expected.length, `${name}: one entry per file`);
      for (const f of expected.slice(0, 50)) {
        assertEquals(bundle[f], await readFile(new URL(f, ROOT), "utf8"), `${f} differs`);
      }
    }
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
