// Run a command to completion and capture its output, for scripts and tests.
//
//   const out = runSync("git", { args: ["status"], cwd });
//   out.code, out.success, out.stdout (bytes), out.stderr (bytes)
//
// `env` is merged over the parent environment (pass `clearEnv: true` to start
// empty). stdout/stderr are Uint8Arrays, so `new TextDecoder().decode(...)`
// and `.toString()` both work.

import { spawn, spawnSync } from "node:child_process";

function spawnOptions({ cwd, env, clearEnv = false, stdin } = {}) {
  return {
    cwd: cwd instanceof URL ? cwd.pathname : cwd,
    env: clearEnv ? { ...env } : { ...process.env, ...env },
    stdio: [stdin === "inherit" ? "inherit" : "ignore", "pipe", "pipe"],
    maxBuffer: 256 * 1024 * 1024,
  };
}

export function runSync(cmd, options = {}) {
  const r = spawnSync(cmd, options.args ?? [], spawnOptions(options));
  if (r.error) throw r.error;
  const code = r.status ?? 128 + (r.signal === "SIGKILL" ? 9 : 15);
  return { code, signal: r.signal, success: code === 0, stdout: r.stdout, stderr: r.stderr };
}

export function run(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, options.args ?? [], spawnOptions(options));
    const out = [];
    const err = [];
    child.stdout.on("data", (c) => out.push(c));
    child.stderr.on("data", (c) => err.push(c));
    child.once("error", reject);
    child.once("close", (status, signal) => {
      const code = status ?? 128 + (signal === "SIGKILL" ? 9 : 15);
      resolve({
        code,
        signal,
        success: code === 0,
        stdout: Buffer.concat(out),
        stderr: Buffer.concat(err),
      });
    });
  });
}
