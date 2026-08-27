#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Functional acceptance driver for concept demos.
//
// "It serves" is not evidence that a demo works. This launches a real Chrome,
// loads each page, runs a per-page script that CLICKS the controls and reads
// the resulting DOM, and fails when the assertions the page's own author wrote
// do not hold. It is the automated half of the functional verification the
// project requires; screenshots and human judgement remain the other half.
//
// A spec file is a JS module exporting `cases`:
//
//   export const cases = [{
//     url: "/v155/some-feature/some-concept/",
//     name: "clicking Run fills the table",
//     // Body of an async function, evaluated in the page. Return an object.
//     // Anything on `.assert` is checked: every value must be truthy.
//     script: `
//       document.getElementById("run").click();
//       await new Promise((r) => setTimeout(r, 500));
//       const rows = document.querySelectorAll("#out tr").length;
//       return { rows, assert: { "table filled": rows > 0 } };
//     `,
//   }];
//
// Usage: deno task drive <spec.mjs> [--base http://localhost:8123]

import { cdpConnection, cleanupChrome, launchChrome } from "./lib/cdp.mjs";

const args = [...Deno.args];
function flag(name, fallback = null) {
  const at = args.indexOf(name);
  if (at < 0) return fallback;
  const value = args[at + 1];
  args.splice(at, 2);
  return value;
}
const base = flag("--base", "http://localhost:8123");
const specPath = args[0];
if (!specPath) {
  console.error("usage: deno task drive <spec.mjs> [--base URL]");
  Deno.exit(2);
}

const { cases } = await import(
  specPath.startsWith("/") ? `file://${specPath}` : `file://${Deno.cwd()}/${specPath}`
);

const chrome = await launchChrome();
const conn = await cdpConnection(chrome.wsUrl);
let failures = 0;
let checks = 0;

// cdp.mjs's onEvent has no unsubscribe (it returns the listener Set), so one
// listener is registered for the whole run and fans out by session id.
const sessions = new Map();
conn.onEvent((message) => {
  const state = sessions.get(message.sessionId);
  if (!state) return;
  if (message.method === "Page.loadEventFired") {
    state.onLoad?.();
  } else if (message.method === "Runtime.exceptionThrown") {
    state.errors.push(
      message.params?.exceptionDetails?.exception?.description ?? "exception",
    );
  } else if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
    state.errors.push(
      (message.params.args ?? []).map((a) => a.value ?? a.description ?? "").join(" "),
    );
  }
});

try {
  for (const testCase of cases) {
    const url = testCase.url.startsWith("http") ? testCase.url : base + testCase.url;
    const { targetId } = await conn.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await conn.send("Target.attachToTarget", { targetId, flatten: true });
    const state = { errors: [], onLoad: null };
    sessions.set(sessionId, state);

    await conn.send("Runtime.enable", {}, sessionId);
    await conn.send("Page.enable", {}, sessionId);
    const loaded = new Promise((resolve) => {
      state.onLoad = resolve;
    });
    await conn.send("Page.navigate", { url }, sessionId);
    await Promise.race([loaded, new Promise((r) => setTimeout(r, 10000))]);
    await new Promise((r) => setTimeout(r, 400));

    let result;
    try {
      const evaluated = await conn.send("Runtime.evaluate", {
        expression: `(async () => { ${testCase.script} })()`,
        awaitPromise: true,
        returnByValue: true,
      }, sessionId);
      if (evaluated.exceptionDetails) {
        throw new Error(
          evaluated.exceptionDetails.exception?.description ??
            evaluated.exceptionDetails.text,
        );
      }
      result = evaluated.result?.value ?? {};
    } catch (error) {
      failures += 1;
      console.error(`FAIL  ${testCase.url} — ${testCase.name}`);
      console.error(`      script threw: ${error.message}`);
      sessions.delete(sessionId);
      await conn.send("Target.closeTarget", { targetId });
      continue;
    }

    const assertions = result.assert ?? {};
    const failed = Object.entries(assertions).filter(([, value]) => !value);
    checks += Object.keys(assertions).length;
    const detail = Object.fromEntries(
      Object.entries(result).filter(([key]) => key !== "assert"),
    );

    if (failed.length || state.errors.length) {
      failures += 1;
      console.error(`FAIL  ${testCase.url} — ${testCase.name}`);
      for (const [label] of failed) console.error(`      assertion failed: ${label}`);
      for (const message of state.errors.slice(0, 3)) {
        console.error(`      console error: ${message}`);
      }
      console.error(`      observed: ${JSON.stringify(detail)}`);
    } else {
      console.log(
        `PASS  ${testCase.url} — ${testCase.name} ` +
          `(${Object.keys(assertions).length} assertions) ${JSON.stringify(detail)}`,
      );
    }
    sessions.delete(sessionId);
    await conn.send("Target.closeTarget", { targetId });
  }
} finally {
  conn.close?.();
  await cleanupChrome(chrome);
}

console.log(
  `\n${cases.length - failures}/${cases.length} pages passed, ${checks} assertions checked`,
);
Deno.exit(failures ? 1 : 0);
