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
// Run: deno task test-check-routes-changed-demos

import { join } from "node:path";
import { changedFeatureIds, TouchedSetError } from "./lib/support.mjs";

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

Deno.removeSync(f1.root, { recursive: true });
Deno.removeSync(f2.root, { recursive: true });

if (failures.length > 0) {
  console.error(`\nchanged-demos fail-closed tests: ${failures.length} section(s) failed`);
  Deno.exit(1);
}
console.log("\nchanged-demos fail-closed tests: all sections passed");
