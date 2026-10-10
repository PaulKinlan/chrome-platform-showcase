// Fail-closed "touched demo" set (bead chrome_platform_showcase-3rg).
//
// `changedFeatureIds()` used to swallow every git failure into an empty set
// (`catch { return "" }`). `check-routes` rule (C) iterates that set, so when
// git could not answer — a corrupt index, a missing tree, a bad ref — the rule
// went vacuous and a touched demo could sit untested/needs-review with the gate
// green. Reproduced at 3fb49ba7 on an identical tree: a working git exited 1
// with `touched demo left desktop = "untested"`, and the same tree with a
// corrupted index exited 0 PASS.
//
// The contract this suite pins:
//   - a genuinely unchanged tree returns an EMPTY set (legitimate, no throw);
//   - staged, unstaged and untracked demo files are all reported;
//   - non-demo paths add no id;
//   - a git failure throws TouchedSetError naming the ref and what git said, so
//     "git could not answer" can never read as "nothing was touched".
//
// It also runs the REAL gate against a local clone, because the fixture repos
// below are too small to reach the baseline stage: that is where the gate's own
// policy for an unusable baseline is pinned (bead chrome_platform_showcase-jj7).
//
// Run: deno task test-check-routes-changed-demos

import { join } from "node:path";
import { changedFeatureIds, TouchedSetError } from "./lib/support.mjs";
import { REPO_ROOT } from "./lib/manifest.mjs";

const failures = [];
function check(label, fn) {
  try {
    fn();
    console.log(`ok   ${label}`);
  } catch (err) {
    failures.push(label);
    console.log(`FAIL ${label}: ${err?.message ?? err}`);
  }
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}
function assertThrows(fn, match) {
  let threw = null;
  try {
    fn();
  } catch (err) {
    threw = err;
  }
  assert(threw, "expected a throw, got a value");
  assert(
    threw instanceof TouchedSetError,
    `expected TouchedSetError, got ${threw?.name}: ${threw?.message}`,
  );
  assert(match.test(threw.message), `message did not match ${match}: ${threw.message}`);
  return threw;
}

// ── fixture repos ───────────────────────────────────────────────────────────
function makeFixture(prefix) {
  const root = Deno.makeTempDirSync({ prefix });
  function git(args) {
    const out = new Deno.Command("git", {
      args,
      cwd: root,
      stdout: "piped",
      stderr: "piped",
    }).outputSync();
    return {
      code: out.code,
      stdout: new TextDecoder().decode(out.stdout),
      stderr: new TextDecoder().decode(out.stderr),
    };
  }
  function commit(message) {
    assert(git(["add", "-A"]).code === 0, "git add failed");
    const res = git([
      "-c",
      "user.email=fixture@example.com",
      "-c",
      "user.name=fixture",
      "-c",
      "commit.gpgsign=false",
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "-q",
      "-m",
      message,
    ]);
    assert(res.code === 0, `git commit failed: ${res.stderr}`);
    return git(["rev-parse", "HEAD"]).stdout.trim();
  }
  git(["init", "-q"]);
  return { root, git, commit };
}
const sorted = (set) => [...set].sort();
// Deno.writeTextFileSync does not create parent directories.
function writeFile(root, relPath, content) {
  const full = join(root, relPath);
  Deno.mkdirSync(join(root, relPath.split("/").slice(0, -1).join("/")), { recursive: true });
  Deno.writeTextFileSync(full, content);
}

// ── working cases ───────────────────────────────────────────────────────────
const f1 = makeFixture("3rg-changed-");
writeFile(f1.root, "README.md", "fixture\n");
writeFile(f1.root, "v1/alpha/one/index.html", "alpha\n");
const BASE = f1.commit("base");

check("a genuinely unchanged tree is an EMPTY set, not a throw", () => {
  const ids = changedFeatureIds(BASE, f1.root);
  assert(ids instanceof Set, `expected a Set, got ${typeof ids}`);
  assert(ids.size === 0, `expected no touched demos, got ${sorted(ids)}`);
});

writeFile(f1.root, "v1/alpha/one/index.html", "alpha changed\n");
check("an UNSTAGED change to a tracked demo is reported", () => {
  assert(sorted(changedFeatureIds(BASE, f1.root)).includes("v1/alpha"), "missing v1/alpha");
});

writeFile(f1.root, "v1/beta/one/index.html", "beta\n");
f1.git(["add", "v1/beta/one/index.html"]);
check("a STAGED change to another demo is reported", () => {
  assert(sorted(changedFeatureIds(BASE, f1.root)).includes("v1/beta"), "missing v1/beta");
});

writeFile(f1.root, "v2/gamma/one/index.html", "gamma\n");
check("an UNTRACKED demo directory is reported", () => {
  assert(sorted(changedFeatureIds(BASE, f1.root)).includes("v2/gamma"), "missing v2/gamma");
});

writeFile(f1.root, "README.md", "fixture changed\n");
check("a changed non-demo path adds no id", () => {
  assert(
    sorted(changedFeatureIds(BASE, f1.root)).join(",") === "v1/alpha,v1/beta,v2/gamma",
    `unexpected set: ${sorted(changedFeatureIds(BASE, f1.root))}`,
  );
});

// ── fail-closed cases ───────────────────────────────────────────────────────
const f2 = makeFixture("3rg-fail-");
writeFile(f2.root, "v1/alpha/one/index.html", "alpha\n");
const BASE2 = f2.commit("base");

check("control: the same fixture is healthy before it is broken", () => {
  assert(changedFeatureIds(BASE2, f2.root).size === 0, "expected an empty set");
});

check("an UNRESOLVABLE ref throws instead of returning an empty set", () => {
  const ref = "refs/heads/does-not-exist";
  const err = assertThrows(
    () => changedFeatureIds(ref, f2.root),
    /could not be determined/,
  );
  assert(err.ref === ref, `error should name the ref, got ${err.ref}`);
  assert(/touched demo set at/.test(err.message), `missing context: ${err.message}`);
});

Deno.writeTextFileSync(join(f2.root, ".git/index"), "garbage\n");
check("a GIT FAILURE (corrupt index) throws instead of returning an empty set", () => {
  const err = assertThrows(
    () => changedFeatureIds(BASE2, f2.root),
    /could not be determined/,
  );
  assert(/index/i.test(err.message), `should carry what git said: ${err.message}`);
});

check("the helper still answers in the real repository", () => {
  const ids = changedFeatureIds("HEAD");
  assert(ids instanceof Set, `expected a Set, got ${typeof ids}`);
});

// ── the gate's own policy for a resolved-but-route-less baseline (jj7) ─────
// A local clone of this worktree, so the gate under test is THIS branch's
// check-routes.mjs, and origin/main can be repointed at an immovable route-less
// commit (the repository root) without touching the shared refs of the real
// checkout.
function cloneGit(cwd, args) {
  const out = new Deno.Command("git", {
    args: ["-C", cwd, ...args],
    stdout: "piped",
    stderr: "piped",
  }).outputSync();
  return {
    code: out.code,
    stdout: new TextDecoder().decode(out.stdout).trim(),
    stderr: new TextDecoder().decode(out.stderr).trim(),
  };
}
function runRealGate(cwd) {
  const out = new Deno.Command("deno", {
    args: ["run", "--allow-read", "--allow-run", "--allow-env", "scripts/check-routes.mjs"],
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).outputSync();
  const strip = (b) => new TextDecoder().decode(b).replace(/\x1b\[[0-9;]*m/g, "");
  return { code: out.code, text: strip(out.stdout) + strip(out.stderr) };
}
const gateClone = Deno.makeTempDirSync({ prefix: "3rg-gate-" });
const clone = cloneGit("/tmp", ["clone", "--quiet", "--local", REPO_ROOT, gateClone]);
assert(clone.code === 0, `git clone failed: ${clone.stderr}`);
// A clone carries COMMITTED state; copy the file under test so this suite
// validates the working tree (committed or not) rather than whatever HEAD holds.
Deno.copyFileSync(
  join(REPO_ROOT, "scripts/check-routes.mjs"),
  join(gateClone, "scripts/check-routes.mjs"),
);
const realMain = cloneGit(gateClone, ["rev-parse", "refs/remotes/origin/main"]).stdout;
const routeLess = cloneGit(gateClone, ["rev-list", "--max-parents=0", "HEAD"]).stdout.split("\n")
  .pop();

check("a normal baseline still gates normally (control)", () => {
  const res = runRealGate(gateClone);
  assert(
    !/resolves but its tree contains no published routes/.test(res.text),
    "the route-less diagnostic fired on a normal baseline",
  );
  assert(res.code === 0, `expected a clean gate, got exit ${res.code}: ${res.text.slice(-400)}`);
});

check("a ref that resolves but publishes no routes FAILS CLOSED with one diagnostic", () => {
  assert(
    cloneGit(gateClone, ["update-ref", "refs/remotes/origin/main", routeLess]).code === 0,
    "could not repoint origin/main in the clone",
  );
  const res = runRealGate(gateClone);
  assert(res.code === 1, `expected exit 1, got ${res.code}`);
  assert(
    /resolves but its tree contains no published routes/.test(res.text),
    "missing the actionable diagnostic",
  );
  assert(/FAIL: 1 contract violation\(s\)/.test(res.text), "should be exactly one violation");
  assert(!/touched demo left/.test(res.text), "must not charge one violation per demo any more");
  assert(/git fetch --unshallow/.test(res.text), "the diagnostic should say how to fix it");
});

check("the same clone with a real baseline is clean again (control)", () => {
  assert(
    cloneGit(gateClone, ["update-ref", "refs/remotes/origin/main", realMain]).code === 0,
    "could not restore origin/main in the clone",
  );
  const res = runRealGate(gateClone);
  assert(res.code === 0, `expected a clean gate after restoring the baseline, got ${res.code}`);
});
Deno.removeSync(gateClone, { recursive: true });

Deno.removeSync(f1.root, { recursive: true });
Deno.removeSync(f2.root, { recursive: true });

if (failures.length > 0) {
  console.error(`\nchanged-demos fail-closed tests: ${failures.length} section(s) failed`);
  Deno.exit(1);
}
console.log("\nchanged-demos fail-closed tests: all sections passed");
