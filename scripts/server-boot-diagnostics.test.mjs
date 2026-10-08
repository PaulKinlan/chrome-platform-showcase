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

section("a port that already answers is reported as owned, with no invented child output", () => {
  const message = describeBootFailure({ port: 8399, kind: "port-in-use" });
  assert(message.includes("8399"), `the port must be named, got: ${message}`);
  assert(
    message.includes("already accepts connections") && message.includes("another process owns it"),
    `it must say what was observed, got: ${message}`,
  );
  assert(
    !message.includes("produced no output"),
    "nothing was spawned, so no child output may be described",
  );
});

section("an exited child reports its code and its own stderr, and asserts no cause", () => {
  const message = describeBootFailure({
    port: 8399,
    kind: "child-exited",
    exitCode: 1,
    stderrTail: "error: Uncaught (in promise) AddrInUse: Address already in use (os error 98)",
    waitedMs: 900,
  });
  assert(message.includes("exited with code 1"), `the exit code must be reported, got: ${message}`);
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
  await listener.shutdown();
  return port;
}

await asyncSection("portIsTaken distinguishes a listener from a free port", async () => {
  const listener = Deno.serve({ port: 0, hostname: "127.0.0.1" }, () => new Response("here"));
  const port = listener.addr.port;
  try {
    assert(await portIsTaken(port), "a bound port must read as taken");
  } finally {
    await listener.shutdown();
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
    const occupier = Deno.serve({ port: 0, hostname: "127.0.0.1" }, () => new Response("occupied"));
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
      assert(message.includes("already in use"), "the reported failure carries that explanation");
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
      await occupier.shutdown();
      if (child) {
        try {
          child.kill("SIGKILL");
        } catch {
          // already gone
        }
      }
    }
  },
);

section("the child's own listening line is what proves it owns the port", () => {
  const real = "Listening on http://localhost:4102\n";
  assert(serverReportsListening(real, 4102), "the line the real server prints must be recognised");
  assert(!serverReportsListening(real, 4103), "a different port must not match");
  assert(!serverReportsListening(real, 410), "a port prefix must not match");
  assert(!serverReportsListening("", 4102), "no output means no proof");
  assert(
    !serverReportsListening("error: Uncaught (in promise) AddrInUse: Address already in use", 4102),
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
      assessReadiness({ httpAnswered: false, waitedMs: BOOT_READY_BOUND_MS }) === READINESS.TIMEOUT,
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
        `the real server must report listening on ${port}, got: ${boot.tails.stdout.slice(0, 200)}`,
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
        child.kill("SIGKILL");
      } catch {
        // already gone
      }
    }
  },
);

if (failures > 0) {
  console.error(`\nserver boot tests: ${failures} section(s) failed`);
  Deno.exit(1);
}
console.log("\nserver boot tests: all sections passed");
