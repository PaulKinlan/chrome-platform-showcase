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

export function loadSidecarFromRef(ref, root = REPO_ROOT) {
  try {
    const raw = execFileSync("git", ["show", `${ref}:responsive-support.json`], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
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
