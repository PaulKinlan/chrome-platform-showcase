// Boot diagnostics for the demo driver's local server
// (bead chrome_platform_showcase-dan, follow-up from c3p).
//
// The driver started `server.ts` on a random port with stdout and stderr set to
// "null", judged readiness by polling `GET /` for 10 seconds, and threw one
// generic error. Reproduced on the base commit:
//
//   - the child's diagnostic was discarded. The same command on an occupied port
//     exits 1 with `AddrInUse: Address already in use (os error 98)` on stderr,
//     and the driver reported only "local server did not become ready";
//   - a crash and a slow boot were indistinguishable;
//   - and a port already owned by another process made the poll succeed on the
//     STRANGER's 200. Reproduced by holding a port with a listener that answers
//     anything: the child died with EADDRINUSE, the driver accepted the stranger,
//     drove the wrong server, and reported ordinary-looking statuses with exit 0.
//
// These sections cover the pieces that fix it: bounded capture of the child's
// output, noticing that it exited, refusing a port that already answers, and
// saying which of the observed things happened without inventing a cause.
//
// Run: deno task test-server-boot
//
// Migrated in place to ONE native Deno.test case (Stage 29 of the dty proposal,
// bead chrome_platform_showcase-dty.36), under the dty.19 policy that this class
// of suite is one aggregate case and not one case per section. The fourteen
// existing top-level sections still run, in their original order, through the
// same `section`/`asyncSection` helpers, so every label, every inline `FAIL`
// line, the failing-section counter and both legacy tail lines are unchanged;
// only the final `Deno.exit(1)` became a named throw, because exiting inside a
// case kills the test process before Deno can report it.
//
// The other change is teardown. A SIGKILL is a request rather than a fact: the
// port is only free once the child has actually been reaped, and a listener is
// only closed once its `finished` promise settles. Both are now awaited with a
// bound before the next section proceeds, and a teardown that does not complete
// is reported as a failure instead of passing silently. The deadline for a
// listener close starts BEFORE the graceful shutdown is awaited, because Deno's
// `shutdown()` waits for in-flight requests: a request that never answers used to
// hold that await open forever, with the bound applied only afterwards (review
// finding smw), and in the taken-port section that stalled the teardown before
// the killed child had been reaped - the child reap is now guaranteed by its own
// guarded step in that `finally`. This makes no claim about a hard kill - a fleet
// timeout, the reaper or a SIGKILL of this process cannot run a `finally` - and
// every bounded wait lives well inside the suite's own 20s child deadlines.

import {
  appendTail,
  assessReadiness,
  BOOT_READY_BOUND_MS,
  BOOT_TAIL_MAX_CHARS,
  describeBootFailure,
  portIsTaken,
  READINESS,
  serverReportsListening,
  trackBootChild,
} from "./lib/server-boot.mjs";

let failures = 0;
function section(name, fn) {
  try {
    fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
async function asyncSection(name, fn) {
  try {
    await fn();
    console.log(`ok   ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// Teardown, made observable. Both waits are bounded so a wedged child or a
// half-closed listener cannot hang the case, and a teardown that overruns the
// bound is counted as a failure rather than ignored.
const TEARDOWN_BOUND_MS = 2000;

let teardownFailures = 0;

function teardownFailed(what) {
  failures++;
  teardownFailures++;
  console.error(`FAIL ${what}`);
}

async function reapChild(child, what) {
  try {
    child.kill("SIGKILL");
  } catch {
    // already gone
  }
  const reaped = await Promise.race([
    child.status.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), TEARDOWN_BOUND_MS)),
  ]);
  if (!reaped) teardownFailed(`${what} was still running ${TEARDOWN_BOUND_MS}ms after SIGKILL`);
}

async function closeListener(listener, what) {
  // The deadline starts BEFORE the graceful close. The first version of this helper
  // awaited `listener.shutdown()` and only then applied its bound, so a request
  // that never answered held that await open and the deadline never started at all
  // (review finding smw); in the taken-port section that also stalled the `finally`
  // before the killed child had been reaped.
  //
  // Measured on Deno 2.9.7, so this is not assumed:
  //   - `shutdown()` with a held-open request never settles, and `finished` does not
  //     settle either; the listening socket is already closed by then (a rebind on
  //     the same port succeeds immediately), so what is pending is the client;
  //   - `controller.abort()` with no prior shutdown returns instantly, settles
  //     `finished`, fails the in-flight request and frees the port;
  //   - `controller.abort()` AFTER `shutdown()` has been called throws an UNCAUGHT
  //     `BadResource` out of Deno's own signal listener, whether or not `shutdown()`
  //     had settled, so a graceful-then-force sequence is not available and calling
  //     it would trade a bounded stall for an unhandled error;
  //   - the value `Deno.serve` returns exposes `addr`, `finished`, `shutdown`, `ref`,
  //     `unref` and `Symbol.asyncDispose` (enumerated at runtime) - there is no
  //     other force-close to use instead.
  // A stall is therefore reported rather than waited on or force-aborted: the port
  // is already free by the time this reports, and a child that could own it is
  // force-killed and reaped by `reapChild`.
  const graceful = listener.shutdown().then(() => true, () => false);
  const settled = listener.finished.then(() => true, () => true);
  const closedInTime = await Promise.race([
    Promise.all([graceful, settled]).then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), TEARDOWN_BOUND_MS)),
  ]);
  if (closedInTime) return;
  teardownFailed(
    `${what} had not finished closing ${TEARDOWN_BOUND_MS}ms after it was asked to shut ` +
      `down (a request is still in flight; the listening socket is already closed, and ` +
      `Deno 2.9.7 throws an uncaught BadResource if the owned aborter fires after shutdown)`,
  );
  await Promise.race([
    settled,
    new Promise((resolve) => setTimeout(resolve, TEARDOWN_BOUND_MS)),
  ]);
}

// ONE aggregate case, by the dty.19 policy for this class of suite. The
// sections below are the original fourteen, in their original order, and they
// keep printing the same three-space `ok   ` labels and inline `FAIL` lines.
Deno.test(
  "the server boot diagnostic contract holds for a real child on a real port",
  async () => {
    section("the captured tail keeps the END of the output, up to the bound", () => {
      assert(appendTail("", "hello") === "hello", "short output is kept whole");
      assert(appendTail("abc", "def") === "abcdef", "output accumulates");
      const long = appendTail("", "x".repeat(BOOT_TAIL_MAX_CHARS + 500));
      assert(long.length === BOOT_TAIL_MAX_CHARS, `the tail is bounded, got ${long.length}`);
      // A distinct start marker, so "the oldest output was dropped" is decidable: a
      // uniform filler would survive in the tail and make the assertion meaningless.
      const tail = appendTail("", `START-MARKER${"filler-".repeat(1000)}LAST LINE`);
      assert(tail.endsWith("LAST LINE"), "the most recent output is what survives");
      assert(!tail.includes("START-MARKER"), "the oldest output is dropped first");
    });

    section(
      "a port that already answers is reported as owned, with no invented child output",
      () => {
        const message = describeBootFailure({ port: 8399, kind: "port-in-use" });
        assert(message.includes("8399"), `the port must be named, got: ${message}`);
        assert(
          message.includes("already accepts connections") &&
            message.includes("another process owns it"),
          `it must say what was observed, got: ${message}`,
        );
        assert(
          !message.includes("produced no output"),
          "nothing was spawned, so no child output may be described",
        );
      },
    );

    section("an exited child reports its code and its own stderr, and asserts no cause", () => {
      const message = describeBootFailure({
        port: 8399,
        kind: "child-exited",
        exitCode: 1,
        stderrTail: "error: Uncaught (in promise) AddrInUse: Address already in use (os error 98)",
        waitedMs: 900,
      });
      assert(
        message.includes("exited with code 1"),
        `the exit code must be reported, got: ${message}`,
      );
      assert(message.includes("8399"), "the port must be named");
      assert(
        message.includes("AddrInUse: Address already in use"),
        `the child's own stderr must be carried, got: ${message}`,
      );
      assert(
        !message.includes("already accepts connections"),
        "only the preflight may claim the port was already owned; the child's stderr is reported, not re-stated as fact",
      );
    });

    section("a still-running child is reported as a slow boot, not a crash", () => {
      const message = describeBootFailure({
        port: 4001,
        kind: "timeout",
        waitedMs: 10000,
        stdoutTail: "Listening on http://localhost:4001/",
      });
      assert(
        message.includes("still running") && message.includes("slow or wedged boot"),
        `a timeout must not read as a crash, got: ${message}`,
      );
      assert(message.includes("10000ms"), "the waited time must be reported");
      assert(!message.includes("exited with code"), "it must not claim the child exited");
      assert(message.includes("Listening on"), "captured stdout is carried too");
    });

    section("a silent child says so rather than implying it exited cleanly", () => {
      const message = describeBootFailure({ port: 4002, kind: "child-exited", exitCode: null });
      assert(
        message.includes("exited with code unknown"),
        `a missing exit code must be stated as unknown, got: ${message}`,
      );
      assert(message.includes("produced no output"), `silence must be stated, got: ${message}`);
    });

    // Ports come from the OS (port 0), not a guessed range: a hard-coded or random
    // port can belong to another lane on this box and make the suite flaky for a
    // reason that has nothing to do with the code under test.
    async function ephemeralPort() {
      const listener = Deno.serve({ port: 0, hostname: "127.0.0.1" }, () => new Response("probe"));
      const port = listener.addr.port;
      await closeListener(listener, "the ephemeral probe listener");
      return port;
    }

    await asyncSection("portIsTaken distinguishes a listener from a free port", async () => {
      const listener = Deno.serve({ port: 0, hostname: "127.0.0.1" }, () => new Response("here"));
      const port = listener.addr.port;
      try {
        assert(await portIsTaken(port), "a bound port must read as taken");
      } finally {
        await closeListener(listener, "the portIsTaken listener");
      }
      assert(!(await portIsTaken(port)), "after shutdown the port must read as free");
    });

    await asyncSection("portIsTaken does not throw when nothing is listening", async () => {
      const free = await portIsTaken(await ephemeralPort());
      assert(free === false, "an unbound port returns false rather than rejecting");
    });

    await asyncSection("trackBootChild captures output and the exit of a real child", async () => {
      const child = new Deno.Command("deno", {
        args: ["eval", 'console.error("boom: child failed"); Deno.exit(3);'],
        stdout: "piped",
        stderr: "piped",
      }).spawn();
      const boot = trackBootChild(child);
      await child.status;
      await new Promise((r) => setTimeout(r, 100)); // let the drains flush
      assert(boot.exit.exited, "the exit must be noticed");
      assert(boot.exit.code === 3, `the exit code must be captured, got ${boot.exit.code}`);
      assert(boot.tails.stderr.includes("boom: child failed"), "stderr must be captured");
    });

    await asyncSection(
      "the diagnostic the old driver discarded is captured from the real server",
      async () => {
        // The bead's mechanism, end to end: hold a port, then start the real server on
        // it exactly as the driver does. Before this change the stderr was thrown away
        // and only "local server did not become ready" survived.
        const occupier = Deno.serve(
          { port: 0, hostname: "127.0.0.1" },
          () => new Response("occupied"),
        );
        const port = occupier.addr.port;
        let child = null;
        try {
          assert(await portIsTaken(port), "the occupier must be visible to the preflight");
          child = new Deno.Command("deno", {
            args: ["run", "--allow-net", "--allow-read", "--allow-env", "server.ts"],
            env: { PORT: String(port) },
            stdout: "piped",
            stderr: "piped",
          }).spawn();
          const boot = trackBootChild(child);
          await Promise.race([child.status, new Promise((r) => setTimeout(r, 20000))]);
          assert(boot.exit.exited, "the real server must exit rather than hang on a taken port");
          assert(
            boot.exit.code !== 0,
            `a bind failure must be a non-zero exit, got ${boot.exit.code}`,
          );
          const captured = `${boot.tails.stderr}${boot.tails.stdout}`;
          assert(
            captured.includes("AddrInUse") || captured.includes("Address already in use"),
            `the child's own explanation must be captured, got: ${captured.slice(0, 200)}`,
          );
          const message = describeBootFailure({
            port,
            kind: "child-exited",
            exitCode: boot.exit.code,
            stderrTail: boot.tails.stderr,
          });
          assert(
            message.includes("already in use"),
            "the reported failure carries that explanation",
          );
          // The stranger was answering the whole time; readiness must still refuse.
          assert(
            assessReadiness({
              httpAnswered: true,
              childExited: boot.exit.exited,
              listeningReported: serverReportsListening(boot.tails.stdout, port),
            }) !== READINESS.READY,
            "a port held by another process must never be accepted as ready",
          );
          assert(
            !serverReportsListening(boot.tails.stdout, port),
            "the real child must never claim it is listening on a port it could not bind",
          );
        } finally {
          // Both teardowns are attempted even if one of them throws or stalls: a
          // listener that will not close must never stop the killed child from
          // being reaped, and each failure is reported rather than swallowed.
          try {
            await closeListener(occupier, "the occupier listener");
          } catch (error) {
            teardownFailed(`closing the occupier listener threw: ${error.message}`);
          }
          try {
            if (child) await reapChild(child, "the real server on a taken port");
          } catch (error) {
            teardownFailed(`reaping the real server on a taken port threw: ${error.message}`);
          }
        }
      },
    );

    section("the child's own listening line is what proves it owns the port", () => {
      const real = "Listening on http://localhost:4102\n";
      assert(
        serverReportsListening(real, 4102),
        "the line the real server prints must be recognised",
      );
      assert(!serverReportsListening(real, 4103), "a different port must not match");
      assert(!serverReportsListening(real, 410), "a port prefix must not match");
      assert(!serverReportsListening("", 4102), "no output means no proof");
      assert(
        !serverReportsListening(
          "error: Uncaught (in promise) AddrInUse: Address already in use",
          4102,
        ),
        "a bind failure is not a listening report",
      );
    });

    section("TOCTOU: a port taken after the preflight can never be accepted as ready", () => {
      // The window the preflight cannot close: something else takes the port after we
      // checked it and before the child binds. These are exactly the inputs that occur
      // then — the stranger answers, the child has not reported listening — and the
      // decision must never be READY, at any point in the window.
      const at = (waitedMs) =>
        assessReadiness({
          httpAnswered: true,
          childExited: false,
          listeningReported: false,
          waitedMs,
          boundMs: BOOT_READY_BOUND_MS,
        });
      assert(at(0) === READINESS.WAIT, "early in the window it waits rather than accepting");
      assert(at(BOOT_READY_BOUND_MS / 2) === READINESS.WAIT, "it still waits mid-window");
      assert(
        at(BOOT_READY_BOUND_MS) === READINESS.STRANGER,
        "once the bound elapses it reports a stranger, not readiness",
      );
      assert(
        at(BOOT_READY_BOUND_MS * 10) === READINESS.STRANGER,
        "and it stays a stranger however long it waits",
      );
    });

    section(
      "fail-closed precedence: a dead child is never ready, and readiness needs both facts",
      () => {
        assert(
          assessReadiness({
            httpAnswered: true,
            listeningReported: true,
            childExited: true,
          }) === READINESS.CHILD_EXITED,
          "a child that exited is not ready even if the port answers and once reported listening",
        );
        assert(
          assessReadiness({ httpAnswered: true, listeningReported: true }) === READINESS.READY,
          "the child's own report plus an answer IS readiness",
        );
        assert(
          assessReadiness({ httpAnswered: false, listeningReported: true }) === READINESS.WAIT,
          "listening without an answer is not readiness yet",
        );
        assert(
          assessReadiness({ httpAnswered: false, waitedMs: BOOT_READY_BOUND_MS }) ===
            READINESS.TIMEOUT,
          "a silent port is a slow boot, not a stranger",
        );
      },
    );

    section("a stranger on the port is described without blaming the child", () => {
      const message = describeBootFailure({ port: 4104, kind: "stranger" });
      assert(message.includes("4104"), `the port must be named, got: ${message}`);
      assert(
        message.includes("another process is serving that port"),
        `it must name the observed situation, got: ${message}`,
      );
      assert(
        !message.includes("exited with code"),
        "the child has not exited in this case, so it must not be described as exiting",
      );
    });

    await asyncSection(
      "the real server reports listening on the port it bound (so the proof is real)",
      async () => {
        // If server.ts ever stops printing that line, readiness would fail closed and
        // every drive would break — so the dependency is asserted here rather than
        // discovered in the field.
        const port = await ephemeralPort();
        const child = new Deno.Command("deno", {
          args: ["run", "--allow-net", "--allow-read", "--allow-env", "server.ts"],
          env: { PORT: String(port) },
          stdout: "piped",
          stderr: "piped",
        }).spawn();
        const boot = trackBootChild(child);
        try {
          const deadline = Date.now() + 20000;
          while (Date.now() < deadline && !serverReportsListening(boot.tails.stdout, port)) {
            await new Promise((r) => setTimeout(r, 100));
          }
          assert(
            serverReportsListening(boot.tails.stdout, port),
            `the real server must report listening on ${port}, got: ${
              boot.tails.stdout.slice(0, 200)
            }`,
          );
          assert(!boot.exit.exited, "and it must still be running");
          assert(
            assessReadiness({
              httpAnswered: true,
              childExited: boot.exit.exited,
              listeningReported: serverReportsListening(boot.tails.stdout, port),
            }) === READINESS.READY,
            "the real child's own report satisfies readiness",
          );
        } finally {
          try {
            await reapChild(child, "the real server on a free port");
          } catch (error) {
            teardownFailed(`reaping the real server on a free port threw: ${error.message}`);
          }
        }
      },
    );

    if (failures > 0) {
      console.error(`\nserver boot tests: ${failures} section(s) failed`);
      if (teardownFailures > 0) {
        // The counter keeps its legacy wording, so say separately when part of it
        // came from a teardown rather than from a section's own assertion.
        console.error(
          `server boot tests: ${teardownFailures} of those failures came from teardown; see the FAIL lines above`,
        );
      }
      throw new Error(`${failures} server boot section(s) failed`);
    }
    console.log("\nserver boot tests: all sections passed");
  },
);
