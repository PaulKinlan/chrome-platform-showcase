// Fail-closed baseline support snapshot (bead chrome_platform_showcase-6tg).
//
// `loadSidecarFromRef()` used to return `{}` for a missing ref, a missing path,
// a git error or an unparseable map. `check-routes` iterates that map in its
// monotonicity loop, so an empty snapshot made the invariant VACUOUSLY pass:
// with a resolved class downgraded at HEAD and an unreadable baseline, the gate
// exited 0 (reproduced in the bead's evidence: no-map-base, malformed-base and
// a bogus ref all exited 0 while the same downgrade exited 1 against a readable
// base). This suite pins the contract that replaced it:
//
//   - a readable map is returned as-is;
//   - an existing but empty map is `{}`, NOT the "absent" signal;
//   - a ref that PROVABLY predates the map returns `null` (documented skip);
//   - every other failure throws SupportSnapshotError naming the ref and reason.
//
// The fixture is a throwaway repo: A pre-support -> B introduces the map ->
// C malformed -> D deleted -> E empty object.
//
// Run: deno task test-support-ref-fail-closed

import { join } from "node:path";
import {
  loadSidecarFromRef,
  SUPPORT_MAP_INTRODUCED_IN,
  SupportSnapshotError,
} from "./lib/support.mjs";
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
    threw instanceof SupportSnapshotError,
    `expected SupportSnapshotError, got ${threw?.name}`,
  );
  assert(
    match.test(threw.message),
    `message did not match ${match}: ${threw.message}`,
  );
  return threw;
}

// ── fixture repo ────────────────────────────────────────────────────────────
const root = await Deno.makeTempDir({ prefix: "6tg-support-ref-" });
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
  const add = git(["add", "-A"]);
  assert(add.code === 0, `git add failed: ${add.stderr}`);
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
const MAP = "responsive-support.json";
const record = { "v1/demo": { desktop: "ok", mobile: "ok" } };

git(["init", "-q"]);
Deno.writeTextFileSync(join(root, "README.md"), "fixture\n");
const A = commit("pre-support");
Deno.writeTextFileSync(join(root, MAP), `${JSON.stringify(record, null, 2)}\n`);
const B = commit("introduces the map");
Deno.writeTextFileSync(join(root, MAP), "{ this is not json\n");
const C = commit("malformed map");
Deno.removeSync(join(root, MAP));
const D = commit("map deleted after introduction");
Deno.writeTextFileSync(join(root, MAP), "{}\n");
const E = commit("empty but existing map");
Deno.writeTextFileSync(join(root, MAP), "null\n");
const F = commit("JSON null");
Deno.writeTextFileSync(join(root, MAP), '["v1/demo"]\n');
const G = commit("JSON array");
Deno.writeTextFileSync(join(root, MAP), '"a string"\n');
const H = commit("JSON string");
Deno.writeTextFileSync(join(root, MAP), "42\n");
const I = commit("JSON number");
// An unrelated history: orphan branch, no map, no common ancestor with B.
git(["checkout", "--orphan", "unrelated"]);
git(["rm", "-rf", "--cached", "."]);
Deno.removeSync(join(root, MAP));
Deno.writeTextFileSync(join(root, "README.md"), "unrelated\n");
git(["add", "-A"]);
const UNRELATED = commit("unrelated orphan");
git(["checkout", "-q", "master"]);

const opts = { introducedIn: B };

// ── the contract ────────────────────────────────────────────────────────────
check("a readable map at a ref is returned", () => {
  const got = loadSidecarFromRef(B, root, opts);
  assert(got && got["v1/demo"]?.desktop === "ok", `unexpected value ${JSON.stringify(got)}`);
});

check("an existing but EMPTY map is {}, not the absent signal", () => {
  const got = loadSidecarFromRef(E, root, opts);
  assert(got !== null, "empty map must not be reported as absent");
  assert(
    typeof got === "object" && Object.keys(got).length === 0,
    `expected {}, got ${JSON.stringify(got)}`,
  );
});

check("a ref that predates the map returns null (documented skip)", () => {
  assert(loadSidecarFromRef(A, root, opts) === null, "expected null for a pre-support ref");
});

check("OPEN: a map deleted after its introduction throws (was: silently empty)", () => {
  assertThrows(() => loadSidecarFromRef(D, root, opts), /absent/);
});

check("OPEN: a malformed map throws (was: silently empty)", () => {
  assertThrows(() => loadSidecarFromRef(C, root, opts), /not valid JSON/);
});

check("OPEN: an unresolvable ref throws (was: silently empty)", () => {
  const badRef = assertThrows(
    () => loadSidecarFromRef("refs/heads/does-not-exist", root, opts),
    /could not be resolved as a commit/,
  );
  assert(
    /does-not-exist/.test(badRef.message),
    `the diagnostic must carry what git said: ${badRef.message}`,
  );
});

check("OPEN: a clone that cannot adjudicate throws and says how to fix it", () => {
  assertThrows(
    () => loadSidecarFromRef(A, root, { introducedIn: "0".repeat(40) }),
    /unshallow/,
  );
});

check("OPEN (e8x): a present JSON null fails closed, not an empty map", () => {
  assertThrows(() => loadSidecarFromRef(F, root, opts), /is null, not a JSON object/);
});

check("OPEN (e8x): a present JSON array fails closed", () => {
  assertThrows(() => loadSidecarFromRef(G, root, opts), /is an array, not a JSON object/);
});

check("OPEN (e8x): a present JSON string fails closed", () => {
  assertThrows(() => loadSidecarFromRef(H, root, opts), /is a string, not a JSON object/);
});

check("OPEN (e8x): a present JSON number fails closed", () => {
  assertThrows(() => loadSidecarFromRef(I, root, opts), /is a number, not a JSON object/);
});

check("OPEN (7kr): an unrelated history fails closed, not 'predates the map'", () => {
  assertThrows(() => loadSidecarFromRef(UNRELATED, root, opts), /shares no ancestry/);
});

check("pre-support means the REF is an ancestor of the introduction", () => {
  // A is the parent of B (which introduced the map), so this is the genuine
  // pre-support case; an unrelated history must not reach the same branch.
  assert(loadSidecarFromRef(A, root, opts) === null, "A must be classified pre-support");
});

check("the diagnostics name the ref they are about", () => {
  const err = assertThrows(() => loadSidecarFromRef(D, root, opts), /absent/);
  assert(err.message.includes(D), `message must name ${D}: ${err.message}`);
});

// ── the recorded evidence must still be true in the real repo ───────────────
check("SUPPORT_MAP_INTRODUCED_IN matches the commit that added the map", () => {
  const out = new Deno.Command("git", {
    args: ["log", "--diff-filter=A", "--format=%H", "-1", "--", MAP],
    cwd: REPO_ROOT,
    stdout: "piped",
    stderr: "piped",
  }).outputSync();
  const actual = new TextDecoder().decode(out.stdout).trim();
  assert(
    actual === SUPPORT_MAP_INTRODUCED_IN,
    `recorded ${SUPPORT_MAP_INTRODUCED_IN.slice(0, 12)} but git says ${actual.slice(0, 12)}`,
  );
});

Deno.removeSync(root, { recursive: true });

if (failures.length > 0) {
  console.error(`\nsupport-ref fail-closed tests: ${failures.length} section(s) failed`);
  Deno.exit(1);
}
console.log("\nsupport-ref fail-closed tests: all sections passed");
