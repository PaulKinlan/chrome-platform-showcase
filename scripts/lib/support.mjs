// Shared responsive-support helpers (mobile + desktop parity invariant).
//
// Side-effect-free: safe to import from both the responsive-support CLI and the
// route regression gate. Reads the git-tracked `responsive-support.json` sidecar
// keyed by feature-demo id (`v<N>/<feature-slug>`).

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./manifest.mjs";

export const SUPPORT_CLASSES = ["desktop", "mobile"];
const STATES = ["ok", "unsupported", "untested", "needs-review", "broken"];

export function loadSidecar(root = REPO_ROOT) {
  const file = join(root, "responsive-support.json");
  if (!existsSync(file)) return {};
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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

function gitIn(root, args) {
  // Deno.Command rather than node's execFileSync: the latter needs --allow-env
  // merely to spawn, so a caller that did not grant it got a permission error
  // that looked like a missing git object. A read-only git query should need
  // only --allow-run.
  const out = new Deno.Command("git", {
    args,
    cwd: root,
    stdout: "piped",
    stderr: "piped",
  }).outputSync();
  if (out.code !== 0) {
    const cause = new TextDecoder().decode(out.stderr).trim().split("\n")[0] ?? "";
    const err = new Error(
      `git ${args.join(" ")} exited ${out.code}${cause ? `: ${cause}` : ""}`,
    );
    err.status = out.code;
    throw err;
  }
  return new TextDecoder().decode(out.stdout);
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
  let present = true;
  try {
    gitIn(root, ["cat-file", "-e", `${ref}:responsive-support.json`]);
  } catch {
    present = false;
  }
  if (!present) {
    let ancestor;
    try {
      // exit 0 = the ref contains the introduction, so the map should exist
      gitIn(root, ["merge-base", "--is-ancestor", introducedIn, ref]);
      ancestor = true;
    } catch (err) {
      if (err?.status === 1) {
        ancestor = false; // exit 1 = the ref predates the map
      } else {
        throw new SupportSnapshotError(
          ref,
          `the map is absent and this clone cannot tell whether ${ref} predates its introduction ` +
            `(${
              introducedIn.slice(0, 12)
            } did not resolve — fetch more history, e.g. git fetch --unshallow)${cause(err)}`,
        );
      }
    }
    if (!ancestor) return null;
    throw new SupportSnapshotError(
      ref,
      `responsive-support.json is absent although ${ref} contains its introduction ` +
        `(${introducedIn.slice(0, 12)}) — the monotonicity check cannot run vacuously`,
    );
  }
  let raw;
  try {
    raw = gitIn(root, ["show", `${ref}:responsive-support.json`]);
  } catch (err) {
    throw new SupportSnapshotError(
      ref,
      `the map exists at that ref but could not be read${cause(err)}`,
    );
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    throw new SupportSnapshotError(
      ref,
      `the map exists at that ref but is not valid JSON — a malformed baseline must not read as empty${
        cause(err)
      }`,
    );
  }
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

// Feature-demo ids (`v<N>/<feature-slug>`) with any change vs a baseline ref:
// committed + staged + unstaged + untracked. Used to enforce the "touched demo
// must be tested on every supported class" rule without failing the whole
// backlog of untested demos.
export function changedFeatureIds(ref, root = REPO_ROOT) {
  const ids = new Set();
  const add = (path) => {
    const m = String(path).match(/^(v\d+)\/([^/]+)\//);
    if (m) ids.add(`${m[1]}/${m[2]}`);
  };
  const run = (args) => {
    try {
      return execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
    } catch {
      return "";
    }
  };
  for (const line of run(["diff", "--name-only", ref]).split("\n")) if (line) add(line);
  for (const line of run(["ls-files", "--others", "--exclude-standard"]).split("\n")) {
    if (line) add(line);
  }
  return ids;
}
