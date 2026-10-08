// Local-server boot diagnostics for the interactive demo driver
// (bead chrome_platform_showcase-dan, follow-up from c3p).
//
// The driver started its own `server.ts` on a random port with `stdout: "null"`
// and `stderr: "null"`, then judged readiness by polling `GET /` for 10 seconds
// and throwing one generic error. Three defects followed, all reproduced:
//
//   * the child's diagnostic was thrown away. Spawning the same command on an
//     occupied port exits 1 with `AddrInUse: Address already in use (os error
//     98)` on stderr; the driver discarded that and reported only "local server
//     did not become ready";
//   * exit and timeout were indistinguishable, so a crashed child and a slow boot
//     read the same;
//   * worst, a port that was ALREADY owned by another process made the readiness
//     poll succeed on the stranger's response. Reproduced by holding a port with a
//     listener that answers 200 to anything: the child died with EADDRINUSE, the
//     poll accepted the stranger as "ready", and the driver went on to drive the
//     wrong server and report ordinary-looking statuses with exit 0 — silent wrong
//     results rather than a visible failure.
//
// So: ports that already accept connections are never spawned onto, the child's
// output is captured, and a failure says which of the observed things happened.
// Nothing here infers a cause it did not see; it reports the port, the exit code
// and the child's own output.

export const BOOT_TAIL_MAX_CHARS = 2000;
export const BOOT_MAX_PORT_ATTEMPTS = 5;
export const BOOT_POLL_MS = 250;
export const BOOT_POLL_ATTEMPTS = 40;
export const BOOT_READY_BOUND_MS = BOOT_POLL_MS * BOOT_POLL_ATTEMPTS;

/**
 * Readiness outcomes. `READY` is the only one that lets the driver proceed.
 */
export const READINESS = {
  READY: "ready",
  WAIT: "wait",
  CHILD_EXITED: "child-exited",
  /** Something answered on the port, but not the server we started. */
  STRANGER: "stranger",
  TIMEOUT: "timeout",
};

/**
 * Does the child itself say it is listening on this port?
 *
 * `server.ts` prints `Listening on http://localhost:<port>` once it has bound, so
 * the child's OWN output is proof that it owns the port — which is what makes
 * readiness decidable rather than inferred. Nothing else can produce that line
 * for that port: a process that failed to bind prints the bind error instead and
 * exits.
 */
export function serverReportsListening(stdout, port) {
  if (!stdout || !port) return false;
  const escaped = String(port).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`Listening on https?://[^\\s]*:${escaped}(?![0-9])`).test(stdout);
}

/**
 * Decide whether a driver may treat the server as ready. Pure, so the timing
 * window that cannot be forced in real time can still be tested exactly.
 *
 * Fail-closed on purpose:
 *   - a child that has exited is never ready, even if something answers the port;
 *   - an answered port is NOT readiness unless the child reported listening on
 *     it, so a process that took the port after the preflight cannot be accepted;
 *   - a port that answers while the child stays silent is only called a stranger
 *     once the bound elapses, so a slow flush of the child's own line is given
 *     the whole window rather than failing early.
 */
export function assessReadiness({
  httpAnswered = false,
  childExited = false,
  listeningReported = false,
  waitedMs = 0,
  boundMs = BOOT_READY_BOUND_MS,
} = {}) {
  if (childExited) return READINESS.CHILD_EXITED;
  if (httpAnswered && listeningReported) return READINESS.READY;
  if (waitedMs >= boundMs) return httpAnswered ? READINESS.STRANGER : READINESS.TIMEOUT;
  return READINESS.WAIT;
}

/** Keep the last `maxChars` of a growing capture. */
export function appendTail(current, chunk, maxChars = BOOT_TAIL_MAX_CHARS) {
  const text = (current ?? "") +
    (typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
  return text.length > maxChars ? text.slice(text.length - maxChars) : text;
}

/**
 * Capture a spawned server's output and notice when it exits.
 *
 * Both streams are drained continuously: a full pipe blocks the child, and the
 * tail is the only thing that can explain a failure.
 */
export function trackBootChild(child, { maxChars = BOOT_TAIL_MAX_CHARS } = {}) {
  const tails = { stdout: "", stderr: "" };
  const exit = { exited: false, code: null };
  child.status.then((status) => {
    exit.exited = true;
    exit.code = status.code;
  }).catch(() => {
    exit.exited = true;
  });
  for (const [name, stream] of [["stdout", child.stdout], ["stderr", child.stderr]]) {
    if (!stream) continue;
    (async () => {
      try {
        for await (const chunk of stream) {
          tails[name] = appendTail(tails[name], chunk, maxChars);
        }
      } catch {
        // stream closed, or the child died mid-read: the tail is best-effort
      }
    })();
  }
  return { tails, exit };
}

/**
 * Is something already listening on this port?
 *
 * A refused connection means free; an accepted one means owned. A timeout counts
 * as free, which is the one case this cannot distinguish — a listener that accepts
 * very slowly — and it is reported as such by `describeBootFailure` rather than
 * guessed at.
 */
export async function portIsTaken(port, { hostname = "127.0.0.1", timeoutMs = 400 } = {}) {
  try {
    const connection = await Promise.race([
      Deno.connect({ hostname, port }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    try {
      connection.close();
    } catch {
      // already closed
    }
    return true;
  } catch {
    return false;
  }
}

function collapse(text, max = 600) {
  const oneLine = (text ?? "").replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

function describeOutput({ stderrTail, stdoutTail }) {
  const parts = [];
  if (stderrTail) parts.push(`stderr: ${collapse(stderrTail)}`);
  if (stdoutTail) parts.push(`stdout: ${collapse(stdoutTail)}`);
  return parts.length ? ` — ${parts.join(" | ")}` : " — it produced no output";
}

/**
 * Say what was observed, and only that.
 *
 * @param {object} input
 * @param {number} input.port
 * @param {"port-in-use"|"child-exited"|"timeout"} input.kind
 * @param {number|null} input.exitCode
 * @param {string} input.stderrTail
 * @param {string} input.stdoutTail
 * @param {number} input.waitedMs
 */
export function describeBootFailure({
  port,
  kind,
  exitCode = null,
  stderrTail = "",
  stdoutTail = "",
  waitedMs = 0,
}) {
  if (kind === "port-in-use") {
    // Nothing was spawned, so there is no child output to report.
    return `port ${port} already accepts connections, so another process owns it — no server was started on it`;
  }
  const output = describeOutput({ stderrTail, stdoutTail });
  if (kind === "child-exited") {
    return `the local server process exited with code ${
      exitCode ?? "unknown"
    } and never became ready on port ${port}${output}`;
  }
  if (kind === "stranger") {
    return `port ${port} answers HTTP, but the local server never reported listening on it, so another process is serving that port${output}`;
  }
  return `the local server did not answer on port ${port} within ${
    Math.round(waitedMs)
  }ms; the process was still running, so this is a slow or wedged boot rather than a crash${output}`;
}
