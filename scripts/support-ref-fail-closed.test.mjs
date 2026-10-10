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
// Migrated in place to ONE asynchronous native Deno.test case (Stage 25 of the
// dty proposal, bead chrome_platform_showcase-dty.32), under the dty.19 policy
// for this class of suite: the non-throwing `check(label, fn)` helper, the
// `failures` counter, all thirty bodies in their original order and the legacy
// failure and success wording all survive, so a run still reports EVERY
// failing subject rather than the first, and no check became a throwing assert.
// What moved is when the body runs: the temp fixture-repo build that used to
// run at module top level now runs inside the case — still awaited, still
// before the first check in the same order — so a fixture failure fails the
// case loudly instead of aborting the module before any check could report.
// The trailing `Deno.exit(1)` became the counter's failure message because
// exiting inside a case kills the test process before Deno can report it.
// Fixture cleanup lives in the case's finally and covers normal throws only;
// the dty.23 scratch-clone isolation of the check-routes negative (it never
// writes the real tracked responsive-support.json) is preserved unchanged.
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

Deno.test("support-ref fail-closed snapshot and gate contract", async () => {
  // ── fixture repo ────────────────────────────────────────────────────────────
  const root = await Deno.makeTempDir({ prefix: "6tg-support-ref-" });
  try {
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

    // ── Node runtime contract (bead chrome_platform_showcase-ay4) ───────────────
    function nodeEvalSidecar(ref, targetRoot = root, extraOpts = opts) {
      const code = `
        import { loadSidecarFromRef, SupportSnapshotError } from "./scripts/lib/support.mjs";
        try {
          const res = loadSidecarFromRef(${JSON.stringify(ref)}, ${JSON.stringify(targetRoot)}, ${
        JSON.stringify(extraOpts)
      });
          console.log(JSON.stringify({ ok: true, value: res }));
        } catch (err) {
          console.log(JSON.stringify({
            ok: false,
            name: err?.name,
            isSupportSnapshotError: err instanceof SupportSnapshotError,
            message: err?.message,
            ref: err?.ref,
            reason: err?.reason
          }));
        }
      `;
      const out = new Deno.Command("node", {
        args: ["--input-type=module", "-e", code],
        cwd: REPO_ROOT,
        stdout: "piped",
        stderr: "piped",
      }).outputSync();
      assert(out.code === 0, `node invocation failed: ${new TextDecoder().decode(out.stderr)}`);
      return JSON.parse(new TextDecoder().decode(out.stdout).trim());
    }

    check("Node: a readable map at a ref is returned", () => {
      const res = nodeEvalSidecar(B);
      assert(res.ok === true, `expected ok, got ${JSON.stringify(res)}`);
      assert(
        res.value && res.value["v1/demo"]?.desktop === "ok",
        `unexpected value ${JSON.stringify(res.value)}`,
      );
    });

    check("Node: an existing but EMPTY map is {}, not the absent signal", () => {
      const res = nodeEvalSidecar(E);
      assert(res.ok === true, `expected ok, got ${JSON.stringify(res)}`);
      assert(res.value !== null, "empty map must not be reported as absent");
      assert(
        typeof res.value === "object" && Object.keys(res.value).length === 0,
        `expected {}, got ${JSON.stringify(res.value)}`,
      );
    });

    check("Node: a ref that predates the map returns null (documented skip)", () => {
      const res = nodeEvalSidecar(A);
      assert(res.ok === true, `expected ok, got ${JSON.stringify(res)}`);
      assert(res.value === null, `expected null, got ${JSON.stringify(res.value)}`);
    });

    check("Node: a map deleted after its introduction throws SupportSnapshotError", () => {
      const res = nodeEvalSidecar(D);
      assert(res.ok === false && res.isSupportSnapshotError, "expected SupportSnapshotError");
      assert(/absent/.test(res.message), `unexpected message ${res.message}`);
    });

    check("Node: a malformed map throws SupportSnapshotError", () => {
      const res = nodeEvalSidecar(C);
      assert(res.ok === false && res.isSupportSnapshotError, "expected SupportSnapshotError");
      assert(/not valid JSON/.test(res.message), `unexpected message ${res.message}`);
    });

    check("Node: an unresolvable ref throws SupportSnapshotError naming git error", () => {
      const res = nodeEvalSidecar("refs/heads/does-not-exist");
      assert(res.ok === false && res.isSupportSnapshotError, "expected SupportSnapshotError");
      assert(
        /could not be resolved as a commit/.test(res.message),
        `unexpected message ${res.message}`,
      );
      assert(/does-not-exist/.test(res.message), `message must name bad ref: ${res.message}`);
    });

    check("Node: a clone that cannot adjudicate throws with unshallow hint", () => {
      const res = nodeEvalSidecar(A, root, { introducedIn: "0".repeat(40) });
      assert(res.ok === false && res.isSupportSnapshotError, "expected SupportSnapshotError");
      assert(/unshallow/.test(res.message), `unexpected message ${res.message}`);
    });

    check("Node (e8x): JSON null fails closed", () => {
      const res = nodeEvalSidecar(F);
      assert(res.ok === false && res.isSupportSnapshotError, "expected SupportSnapshotError");
      assert(/is null, not a JSON object/.test(res.message), `unexpected message ${res.message}`);
    });

    check("Node (e8x): JSON array fails closed", () => {
      const res = nodeEvalSidecar(G);
      assert(res.ok === false && res.isSupportSnapshotError, "expected SupportSnapshotError");
      assert(
        /is an array, not a JSON object/.test(res.message),
        `unexpected message ${res.message}`,
      );
    });

    check("Node (e8x): JSON string fails closed", () => {
      const res = nodeEvalSidecar(H);
      assert(res.ok === false && res.isSupportSnapshotError, "expected SupportSnapshotError");
      assert(
        /is a string, not a JSON object/.test(res.message),
        `unexpected message ${res.message}`,
      );
    });

    check("Node (e8x): JSON number fails closed", () => {
      const res = nodeEvalSidecar(I);
      assert(res.ok === false && res.isSupportSnapshotError, "expected SupportSnapshotError");
      assert(
        /is a number, not a JSON object/.test(res.message),
        `unexpected message ${res.message}`,
      );
    });

    check("Node (7kr): an unrelated history fails closed", () => {
      const res = nodeEvalSidecar(UNRELATED);
      assert(res.ok === false && res.isSupportSnapshotError, "expected SupportSnapshotError");
      assert(/shares no ancestry/.test(res.message), `unexpected message ${res.message}`);
    });

    // ── check-routes gate integration (Node and Deno) ───────────────────────────
    check("node scripts/check-routes.mjs passes on valid baseline", () => {
      const out = new Deno.Command("node", {
        args: ["scripts/check-routes.mjs"],
        cwd: REPO_ROOT,
        stdout: "piped",
        stderr: "piped",
      }).outputSync();
      const stdout = new TextDecoder().decode(out.stdout);
      const stderr = new TextDecoder().decode(out.stderr);
      assert(out.code === 0, `expected exit code 0, got ${out.code}: ${stderr || stdout}`);
      assert(
        stdout.includes("PASS: no published demo route or identity was destructively changed."),
        `unexpected output: ${stdout}`,
      );
    });

    check("deno task check-routes passes on valid baseline", () => {
      const out = new Deno.Command("deno", {
        args: ["run", "--allow-read", "--allow-run", "--allow-env", "scripts/check-routes.mjs"],
        cwd: REPO_ROOT,
        stdout: "piped",
        stderr: "piped",
      }).outputSync();
      const stdout = new TextDecoder().decode(out.stdout);
      const stderr = new TextDecoder().decode(out.stderr);
      assert(out.code === 0, `expected exit code 0, got ${out.code}: ${stderr || stdout}`);
      assert(
        stdout.includes("PASS: no published demo route or identity was destructively changed."),
        `unexpected output: ${stdout}`,
      );
    });

    check("check-routes gate fails on support downgrade under both Node and Deno", () => {
      // Isolation (bead chrome_platform_showcase-dty.23, ADR dty.23.1 + errata):
      // the downgrade is applied ONLY inside a throwaway `git clone --local` of
      // the executing checkout. A finally-restore of the real tracked sidecar is
      // NOT kill-safe — SIGKILL, a parent timeout or the reaper bypasses finally
      // and traps — so kill safety here is STRUCTURAL: this process never writes
      // the real responsive-support.json at all, and a hard kill can only orphan
      // a temp dir. An orphaned scratch is bounded residue (~185MB) named
      // support-ref-scratch-* under the OS temp dir; do NOT assume the OS cleans
      // it promptly — operators may remove support-ref-scratch-* by hand.
      const realSidecar = join(REPO_ROOT, "responsive-support.json");
      const realBefore = Deno.readFileSync(realSidecar);
      const scratch = Deno.makeTempDirSync({ prefix: "support-ref-scratch-" });
      const gitIn = (cwd, args) => {
        const out = new Deno.Command("git", {
          args,
          cwd,
          stdout: "piped",
          stderr: "piped",
        }).outputSync();
        return {
          code: out.code,
          stdout: new TextDecoder().decode(out.stdout).trim(),
          stderr: new TextDecoder().decode(out.stderr),
        };
      };
      try {
        // Structural guard BEFORE any write: the scratch root must resolve
        // strictly OUTSIDE the real REPO_ROOT, and the scratch sidecar must not
        // be the real tracked file.
        const realRoot = Deno.realPathSync(REPO_ROOT);
        const scratchRoot = Deno.realPathSync(scratch);
        assert(
          scratchRoot !== realRoot && !scratchRoot.startsWith(realRoot + "/"),
          `scratch ${scratchRoot} is not outside REPO_ROOT ${realRoot}`,
        );

        // Clone the COMMITTED executing HEAD (uncommitted working-tree edits are
        // deliberately not under test in the negative; the read-only baseline
        // checks above still exercise the live tree).
        const srcHead = gitIn(REPO_ROOT, ["rev-parse", "HEAD"]);
        assert(srcHead.code === 0, `source HEAD unreadable: ${srcHead.stderr}`);
        const clone = gitIn(REPO_ROOT, ["clone", "--local", "--quiet", REPO_ROOT, scratch]);
        assert(clone.code === 0, `scratch clone failed: ${clone.stderr}`);
        const cloneHead = gitIn(scratch, ["rev-parse", "HEAD"]);
        assert(
          cloneHead.code === 0 && cloneHead.stdout === srcHead.stdout,
          `scratch HEAD ${cloneHead.stdout} != executing HEAD ${srcHead.stdout}`,
        );

        // Base-ref parity: the gate's baseline is the merge-base of origin/main
        // and HEAD, but a --local clone maps the source's local heads onto
        // origin/* — NOT the fetched refs/remotes/origin/*. Pin the scratch's
        // origin/main to the executing checkout's real origin/main and verify,
        // rather than assuming the clone's remotes match the source's.
        const srcMain = gitIn(REPO_ROOT, ["rev-parse", "origin/main"]);
        assert(
          srcMain.code === 0 && srcMain.stdout,
          `source origin/main unreadable: ${srcMain.stderr}`,
        );
        const pin = gitIn(scratch, [
          "update-ref",
          "refs/remotes/origin/main",
          srcMain.stdout,
        ]);
        assert(pin.code === 0, `could not pin scratch origin/main: ${pin.stderr}`);
        const scratchMain = gitIn(scratch, ["rev-parse", "origin/main"]);
        assert(
          scratchMain.stdout === srcMain.stdout,
          `scratch origin/main ${scratchMain.stdout} != source ${srcMain.stdout}`,
        );

        const scratchSidecar = join(scratchRoot, "responsive-support.json");
        assert(
          Deno.realPathSync(scratchSidecar) !== Deno.realPathSync(realSidecar),
          "scratch sidecar resolves to the real tracked file",
        );

        const data = JSON.parse(Deno.readTextFileSync(scratchSidecar));
        const targetKey = Object.keys(data).find((k) => data[k]?.mobile === "ok");
        assert(targetKey, "could not find key with mobile=ok");
        data[targetKey].mobile = "needs-review";
        Deno.writeTextFileSync(scratchSidecar, JSON.stringify(data, null, 2) + "\n");

        // Node gate run (cwd: scratch)
        const nodeOut = new Deno.Command("node", {
          args: ["scripts/check-routes.mjs"],
          cwd: scratchRoot,
          stdout: "piped",
          stderr: "piped",
        }).outputSync();
        assert(nodeOut.code === 1, `Node expected exit code 1, got ${nodeOut.code}`);
        const nodeText = new TextDecoder().decode(nodeOut.stdout) +
          new TextDecoder().decode(nodeOut.stderr);
        assert(
          nodeText.includes("FAIL: 1 contract violation(s):"),
          "Node output missing violation header",
        );
        assert(
          nodeText.includes(`${targetKey}: mobile support regressed ok -> needs-review`),
          `Node output missing regression notice: ${nodeText}`,
        );

        // Deno gate run (cwd: scratch)
        const denoOut = new Deno.Command("deno", {
          args: ["run", "--allow-read", "--allow-run", "--allow-env", "scripts/check-routes.mjs"],
          cwd: scratchRoot,
          stdout: "piped",
          stderr: "piped",
        }).outputSync();
        assert(denoOut.code === 1, `Deno expected exit code 1, got ${denoOut.code}`);
        const denoText = new TextDecoder().decode(denoOut.stdout) +
          new TextDecoder().decode(denoOut.stderr);
        assert(
          denoText.includes("FAIL: 1 contract violation(s):"),
          "Deno output missing violation header",
        );
        assert(
          denoText.includes(`${targetKey}: mobile support regressed ok -> needs-review`),
          `Deno output missing regression notice: ${denoText}`,
        );
      } finally {
        // Normal-path detectors, NOT kill safety (SIGKILL skips this block):
        // the real tracked sidecar must be byte-for-byte unchanged...
        const realAfter = Deno.readFileSync(realSidecar);
        assert(
          realBefore.length === realAfter.length &&
            realBefore.every((b, i) => b === realAfter[i]),
          "REAL responsive-support.json changed during the isolated run",
        );
        // ...and scratch cleanup failure is a visible failure, never swallowed.
        Deno.removeSync(scratch, { recursive: true });
      }
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
  } finally {
    // Outer fixture cleanup: runs on NORMAL throws only (a failing check never
    // throws - the counter handles those). SIGKILL runs none of this and can
    // only orphan a bounded prefix-named temp dir under the OS temp dir; do
    // NOT assume the OS cleans it promptly - remove 6tg-support-ref-* by hand.
    Deno.removeSync(root, { recursive: true });
  }

  // The legacy tail exited the process on a non-zero counter. `Deno.exit(1)` cannot
  // live inside a case - it kills the test process before Deno can report the case -
  // so the counter is carried into the failure message instead: every failing label
  // above has already printed, and this makes the case fail loudly with the same
  // wording the guard used before the migration.
  if (failures.length > 0) {
    throw new Error(`support-ref fail-closed tests: ${failures.length} section(s) failed`);
  }
  console.log("\nsupport-ref fail-closed tests: all sections passed");
});
