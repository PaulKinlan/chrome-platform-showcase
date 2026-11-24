// Shared responsive-support helpers (mobile + desktop parity invariant).
//
// Side-effect-free: safe to import from both the responsive-support CLI and the
// route regression gate. Reads per-feature `v<N>/<feature-slug>/_support.json`
// sidecars keyed by feature-demo id (`v<N>/<feature-slug>`), falling back to /
// overlaying over a legacy root `responsive-support.json` when present.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(new URL(".", import.meta.url).pathname, "..", "..");
const FEATURE_SUPPORT_RE = /^(v\d+)\/([^/]+)\/_support\.json$/;

export const SUPPORT_CLASSES = ["desktop", "mobile"];
const STATES = ["ok", "unsupported", "untested", "needs-review", "broken"];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function jsonKind(value) {
  return value === null ? "null" : Array.isArray(value) ? "an array" : `a ${typeof value}`;
}

export function loadSidecar(root = REPO_ROOT) {
  const out = {};
  const legacyFile = join(root, "responsive-support.json");
  if (existsSync(legacyFile)) {
    try {
      const parsed = JSON.parse(readFileSync(legacyFile, "utf8"));
      if (isPlainObject(parsed)) Object.assign(out, parsed);
    } catch {
      // ignore malformed legacy file
    }
  }
  let topEntries;
  try {
    topEntries = readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const rel of topEntries) {
    if (!rel.isDirectory() || !/^v\d+$/.test(rel.name)) continue;
    const relDir = join(root, rel.name);
    let features;
    try {
      features = readdirSync(relDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const feat of features) {
      if (!feat.isDirectory()) continue;
      const supportFile = join(relDir, feat.name, "_support.json");
      if (!existsSync(supportFile)) continue;
      try {
        const parsed = JSON.parse(readFileSync(supportFile, "utf8"));
        if (isPlainObject(parsed)) {
          out[`${rel.name}/${feat.name}`] = parsed;
        }
      } catch {
        // ignore malformed per-feature file on disk load
      }
    }
  }
  return out;
}

// The git-tracked support map was introduced here (the commit that added it).
// A baseline ref that predates this commit legitimately has no records, so the
// parity monotonicity check has nothing to compare; every other reason for a
// missing or unreadable snapshot must fail the gate instead of silently
// skipping the invariant (bead chrome_platform_showcase-6tg).
export const SUPPORT_MAP_INTRODUCED_IN = "19255c927233b15d44e8c7cbdef5c8adc9249365";

// Raised when a baseline support snapshot cannot be used and must NOT be
// treated as empty: an empty map makes `check-routes`' monotonicity loop
// vacuous, so the gate would pass while a resolved class was quietly
// downgraded.
export class SupportSnapshotError extends Error {
  constructor(ref, reason) {
    super(`baseline responsive-support snapshot at ${ref}: ${reason}`);
    this.name = "SupportSnapshotError";
    this.ref = ref;
    this.reason = reason;
  }
}

// Raised when the touched-demo set cannot be determined. It is deliberately
// fatal rather than empty: `check-routes` rule (C) iterates this set, so
// treating a git failure as "nothing was touched" silently skips every touched
// demo (bead chrome_platform_showcase-3rg).
export class TouchedSetError extends Error {
  constructor(ref, reason) {
    super(`touched demo set at ${ref}: ${reason}`);
    this.name = "TouchedSetError";
    this.ref = ref;
    this.reason = reason;
  }
}

function gitIn(root, args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    if (typeof err?.status === "number") {
      const stderr = typeof err.stderr === "string"
        ? err.stderr
        : err.stderr
        ? String(err.stderr)
        : "";
      const cause = stderr.trim().split("\n")[0] ?? "";
      const customErr = new Error(
        `git ${args.join(" ")} exited ${err.status}${cause ? `: ${cause}` : ""}`,
      );
      customErr.status = err.status;
      throw customErr;
    }
    throw err;
  }
}

// Read many git blobs in a single `git cat-file --batch` invocation using raw
// Buffer byte offsets so multibyte UTF-8 payloads are sliced accurately.
function gitBatchRead(root, specs) {
  const input = `${specs.join("\n")}\n`;
  let buf;
  try {
    buf = execFileSync("git", ["cat-file", "--batch"], {
      cwd: root,
      input,
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (err) {
    if (typeof err?.status === "number") {
      const stderr = err.stderr ? String(err.stderr) : "";
      const cause = stderr.trim().split("\n")[0] ?? "";
      const customErr = new Error(
        `git cat-file --batch exited ${err.status}${cause ? `: ${cause}` : ""}`,
      );
      customErr.status = err.status;
      throw customErr;
    }
    throw err;
  }

  const results = [];
  let offset = 0;
  for (let i = 0; i < specs.length; i++) {
    const nl = buf.indexOf(0x0a, offset);
    if (nl === -1) {
      throw new Error(`unexpected EOF in git cat-file --batch output for ${specs[i]}`);
    }
    const header = buf.subarray(offset, nl).toString("utf8");
    offset = nl + 1;
    if (header.endsWith(" missing")) {
      throw new Error(`git object ${specs[i]} is missing`);
    }
    const parts = header.split(" ");
    if (parts.length !== 3) {
      throw new Error(`unexpected git cat-file header for ${specs[i]}: ${header}`);
    }
    const [, type, sizeStr] = parts;
    const size = Number(sizeStr);
    if (!Number.isFinite(size) || size < 0 || offset + size > buf.length) {
      throw new Error(`invalid object size in git cat-file output for ${specs[i]}: ${header}`);
    }
    const content = buf.subarray(offset, offset + size).toString("utf8");
    offset += size + 1; // trailing LF after object payload
    results.push({ spec: specs[i], type, content });
  }
  return results;
}

// Returns the support map at `ref`, `null` when the ref provably predates the
// map (documented, visible policy), and throws SupportSnapshotError for every
// other failure — a missing ref, a map deleted after it was introduced, an
// unreadable or unparseable map, or a clone that cannot adjudicate because the
// introduction commit is not present locally. Every diagnostic carries what git
// actually said, so a permission or transport problem can never be reported as
// an absent object.
export function loadSidecarFromRef(ref, root = REPO_ROOT, opts = {}) {
  const introducedIn = opts.introducedIn ?? SUPPORT_MAP_INTRODUCED_IN;
  const cause = (err) => (err?.message ? ` (${err.message})` : "");
  try {
    gitIn(root, ["cat-file", "-e", `${ref}^{commit}`]);
  } catch (err) {
    throw new SupportSnapshotError(
      ref,
      `the ref could not be resolved as a commit in this clone${cause(err)}`,
    );
  }

  let treeRaw;
  try {
    treeRaw = gitIn(root, ["ls-tree", "-r", "-z", "--name-only", ref]);
  } catch (err) {
    throw new SupportSnapshotError(
      ref,
      `the tree at that ref could not be listed${cause(err)}`,
    );
  }

  const supportFiles = [];
  let hasLegacyMap = false;
  for (const path of treeRaw.split("\0")) {
    if (!path) continue;
    if (path === "responsive-support.json") {
      hasLegacyMap = true;
      continue;
    }
    const m = path.match(FEATURE_SUPPORT_RE);
    if (m) {
      supportFiles.push({ path, id: `${m[1]}/${m[2]}` });
    }
  }

  if (supportFiles.length > 0) {
    const specs = supportFiles.map((f) => `${ref}:${f.path}`);
    let objects;
    try {
      objects = gitBatchRead(root, specs);
    } catch (err) {
      throw new SupportSnapshotError(
        ref,
        `per-feature support sidecars exist at that ref but could not be read${cause(err)}`,
      );
    }
    const out = {};
    for (let i = 0; i < supportFiles.length; i++) {
      const { path, id } = supportFiles[i];
      const obj = objects[i];
      if (obj.type !== "blob") {
        throw new SupportSnapshotError(
          ref,
          `${path} at that ref is a git ${obj.type}, not a blob`,
        );
      }
      let parsed;
      try {
        parsed = JSON.parse(obj.content);
      } catch (err) {
        throw new SupportSnapshotError(
          ref,
          `${path} exists at that ref but is not valid JSON — a malformed baseline must not read as empty${
            cause(err)
          }`,
        );
      }
      if (!isPlainObject(parsed)) {
        throw new SupportSnapshotError(
          ref,
          `${path} at that ref is ${
            jsonKind(parsed)
          }, not a JSON object — a non-object baseline must not read as an empty map`,
        );
      }
      out[id] = parsed;
    }
    return out;
  }

  if (hasLegacyMap) {
    let raw;
    try {
      raw = gitIn(root, ["show", `${ref}:responsive-support.json`]);
    } catch (err) {
      throw new SupportSnapshotError(
        ref,
        `the map exists at that ref but could not be read${cause(err)}`,
      );
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new SupportSnapshotError(
        ref,
        `the map exists at that ref but is not valid JSON — a malformed baseline must not read as empty${
          cause(err)
        }`,
      );
    }
    // A map is a plain JSON object. `{}` is a legitimate empty map; null, an
    // array, a string or a number is not a map at all, and reading any of them as
    // empty made the monotonicity loop vacuous (bead chrome_platform_showcase-e8x).
    if (!isPlainObject(parsed)) {
      throw new SupportSnapshotError(
        ref,
        `the map at that ref is ${
          jsonKind(parsed)
        }, not a JSON object — a non-map baseline must not read as an empty map`,
      );
    }
    return parsed;
  }

  // Neither per-feature _support.json files nor legacy responsive-support.json
  // exist at `ref`. Ancestry decides the policy, and it must be asked in BOTH
  // directions: `--is-ancestor intro ref` exiting 1 means "not an ancestor",
  // which covers both "ref predates the map" and "unrelated histories" — only
  // the former is a legitimate skip (bead chrome_platform_showcase-7kr).
  const isAncestor = (a, b) => {
    try {
      gitIn(root, ["merge-base", "--is-ancestor", a, b]);
      return true;
    } catch (err) {
      if (err?.status === 1) return false;
      throw err;
    }
  };
  let introIsAncestorOfRef, refIsAncestorOfIntro;
  try {
    introIsAncestorOfRef = isAncestor(introducedIn, ref);
    refIsAncestorOfIntro = introIsAncestorOfRef ? false : isAncestor(ref, introducedIn);
  } catch (err) {
    throw new SupportSnapshotError(
      ref,
      `the map is absent and this clone cannot determine the ancestry of ${ref} against the ` +
        `introduction (${
          introducedIn.slice(0, 12)
        } did not resolve — fetch more history, e.g. git fetch --unshallow)${cause(err)}`,
    );
  }
  if (introIsAncestorOfRef) {
    throw new SupportSnapshotError(
      ref,
      `support sidecars (v*/*/_support.json or responsive-support.json) are absent although ${ref} contains the map introduction ` +
        `(${introducedIn.slice(0, 12)}) — the monotonicity check cannot run vacuously`,
    );
  }
  if (refIsAncestorOfIntro) return null; // provably predates the map: nothing to compare
  throw new SupportSnapshotError(
    ref,
    `the map is absent and ${ref} shares no ancestry with the introduction ` +
      `(${introducedIn.slice(0, 12)}) — unrelated histories fail closed rather than ` +
      `skipping the monotonicity check`,
  );
}

// A class is acceptable for a TOUCHED demo only when it is ok, or unsupported
// WITH evidence. untested / needs-review / broken are unresolved.
export function classResolved(record, cls) {
  const state = record?.[cls];
  if (state === "ok") return true;
  if (state === "unsupported") return Boolean(record.evidence);
  return false;
}

// The demo claims to support a class unless it is honestly recorded unsupported.
export function classClaimsSupport(record, cls) {
  return record?.[cls] !== "unsupported";
}

// Coverage denominators for the rollup line.
export function coverage(data) {
  const ids = Object.keys(data);
  const total = ids.length;
  const tally = (cls) => {
    const t = Object.fromEntries(STATES.map((s) => [s, 0]));
    for (const id of ids) {
      const s = data[id]?.[cls] ?? "untested";
      t[s] = (t[s] ?? 0) + 1;
    }
    return t;
  };
  const desktop = tally("desktop");
  const mobile = tally("mobile");
  return {
    total,
    desktop,
    mobile,
    testedD: desktop.ok + desktop.unsupported + desktop.broken,
    testedM: mobile.ok + mobile.unsupported + mobile.broken,
  };
}

// Feature-demo ids (`v<N>/<feature-slug>`) with any frontend change vs a
// baseline ref: committed + staged + unstaged + untracked. Per-feature support
// metadata (`_support.json`) and server-route handlers (`_server.ts`) are
// excluded so metadata/server-only edits do not trigger rule (C) of check-routes.
//
// Fail closed: a git failure is reported as a TouchedSetError, never as an empty
// set. An empty set is a legitimate answer (nothing changed, including a truly
// clean tree) and is the only other way to get one, so a caller can never
// mistake "git could not answer" for "nothing was touched" (bead
// chrome_platform_showcase-3rg).
export function changedFeatureIds(ref, root = REPO_ROOT) {
  const ids = new Set();
  const add = (path) => {
    const m = String(path).match(/^(v\d+)\/([^/]+)\/(.+)$/);
    if (!m) return;
    const rel = m[3];
    if (rel === "_support.json" || rel === "_server.ts") return;
    ids.add(`${m[1]}/${m[2]}`);
  };
  let changed;
  let untracked;
  try {
    changed = gitIn(root, ["diff", "--name-only", ref]);
    untracked = gitIn(root, ["ls-files", "--others", "--exclude-standard"]);
  } catch (err) {
    throw new TouchedSetError(
      ref,
      `${err?.message ?? err} — the touched-demo set could not be determined, ` +
        `so it must not read as "no demos were touched"`,
    );
  }
  for (const line of changed.split("\n")) if (line) add(line);
  for (const line of untracked.split("\n")) if (line) add(line);
  return ids;
}
