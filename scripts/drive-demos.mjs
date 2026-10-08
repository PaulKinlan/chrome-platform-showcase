#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
// Functional acceptance driver for concept demos.
//
// "It serves" is not evidence that a demo works. This launches a real headless
// Chrome, loads each page, exercises interactive controls (buttons, inputs,
// swatches, toggles), observes live DOM mutations and readout changes, asserts
// clean console execution, and captures screenshot proof before and after interaction.
//
// Supports:
//   deno task drive <spec.mjs> [--base URL]              # Run explicit spec
//   deno task drive --milestone v150                     # Drive concepts in milestone
//   deno task drive --feature v150/accentcolor-...       # Drive concepts in feature
//   deno task drive --sample 10                          # Sample interactive concepts
//   deno task drive --url /v150/.../contrast-explorer/   # Drive single concept URL
//   deno task drive --out reports/interactive-proof      # Custom output dir

import { existsSync } from "node:fs";
import { join } from "node:path";
import { cdpConnection, cleanupChrome, launchChrome } from "./lib/cdp.mjs";
import {
  classifyDriveEffect,
  describeActions,
  DRIVE_STATUS,
  EFFECT_KIND,
  gradeEffectOutcome,
  NOT_DEMONSTRATED_STATUSES,
} from "./lib/drive-effect.mjs";
import { buildFromDisk, REPO_ROOT } from "./lib/manifest.mjs";

const args = [...Deno.args];
function flag(name, fallback = null) {
  const at = args.indexOf(name);
  if (at < 0) return fallback;
  const value = args[at + 1];
  args.splice(at, 2);
  return value;
}
function boolFlag(name) {
  const at = args.indexOf(name);
  if (at < 0) return false;
  args.splice(at, 1);
  return true;
}

const noServer = boolFlag("--no-server");
let base = flag("--base");
const milestone = flag("--milestone");
const feature = flag("--feature");
const targetUrl = flag("--url");
const sampleN = Number(flag("--sample") ?? 0);
const limitN = Number(flag("--limit") ?? 0);
const outDir = flag("--out", join(REPO_ROOT, "reports/interactive-proof"));
const positional = args.find((a) => !a.startsWith("--"));

// ── Select test targets ───────────────────────────────────────────────────────
let specCases = null;
let targets = [];

if (
  positional && (positional.endsWith(".mjs") || positional.endsWith(".js")) &&
  existsSync(positional)
) {
  const specPath = positional.startsWith("/") ? positional : `${Deno.cwd()}/${positional}`;
  const imported = await import(`file://${specPath}`);
  specCases = imported.cases ?? [];
} else if (targetUrl) {
  targets = [{
    url: targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}/`,
    name: targetUrl,
    slug: targetUrl.replace(/^\/+|\/+$/g, "").replace(/\//g, "--"),
  }];
} else {
  const manifest = buildFromDisk().filter((m) => m.status === "built");
  let features = manifest;
  if (feature) {
    features = manifest.filter((m) => m.id === feature || m.id.endsWith(feature));
  } else if (milestone) {
    features = manifest.filter((m) => m.id.startsWith(`${milestone}/`));
  }

  // Flatten into concept targets
  const allConcepts = [];
  for (const f of features) {
    for (const c of f.concepts) {
      allConcepts.push({
        url: `/${f.id}/${c}/`,
        name: `${f.id}/${c}`,
        slug: `${f.id.replace(/\//g, "--")}--${c}`,
        featureId: f.id,
        concept: c,
      });
    }
  }

  if (sampleN > 0 && allConcepts.length > 0) {
    const step = Math.max(1, Math.floor(allConcepts.length / sampleN));
    targets = allConcepts.filter((_, i) => i % step === 0).slice(0, sampleN);
  } else if (allConcepts.length > 0) {
    targets = allConcepts;
  }

  if (limitN > 0) {
    targets = targets.slice(0, limitN);
  }
}

if (!specCases && targets.length === 0) {
  console.error(
    "No targets found. Specify a spec file, --milestone, --feature, --url, or --sample.",
  );
  Deno.exit(2);
}

// ── Server lifecycle ─────────────────────────────────────────────────────────
let serverChild = null;
async function bootServer() {
  if (noServer) {
    base = base ?? "http://localhost:3000";
    return;
  }
  const port = base ? Number(new URL(base).port) || 3000 : 3800 + Math.floor(Math.random() * 400);
  base = `http://localhost:${port}`;
  serverChild = new Deno.Command("deno", {
    args: ["run", "--allow-net", "--allow-read", "--allow-env", "server.ts"],
    env: { PORT: String(port) },
    stdout: "null",
    stderr: "null",
  }).spawn();

  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${base}/`, { signal: AbortSignal.timeout(1000) });
      await r.body?.cancel();
      if (r.ok) return;
    } catch {
      // waiting
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("local server did not become ready");
}

// ── Screenshot settle and pair hashing ──────────────────────────────────────
// The in-page driver resolves once it has exercised the controls, but that
// promise can settle before the frame carrying the change has been painted, so
// an immediate capture lands on the pre-interaction surface. Two animation
// frames is the cheapest honest settle: the second callback is queued behind a
// frame that already includes the mutation. This is not a sleep: a sleep either
// under-waits or wastes time, while a frame callback is ordered against the very
// work it is waiting for.
async function settleFrames(conn, sessionId, frames = 2) {
  const raf = (n) => n === 0 ? "resolve(true)" : `requestAnimationFrame(() => { ${raf(n - 1)} })`;
  await conn.send("Runtime.evaluate", {
    expression: `new Promise((resolve) => { ${raf(frames)} })`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId).catch(() => {
    // A page that refuses to paint a frame is not a driver failure; the pair
    // hashing records what was actually captured either way.
  });
}

// Short content hash for a captured PNG, so a before/after pair can be compared
// byte-for-byte instead of being presented as proof by assumption.
async function shortHash(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest).slice(0, 8)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── In-page interactive driver script ───────────────────────────────────────
const IN_PAGE_DRIVER = `(async () => {
  const result = {
    controlsFound: 0,
    controlsExercised: 0,
    actions: [],
    interactions: [],
    readoutsBefore: [],
    readoutsAfter: [],
    mutations: 0,
    domMutated: false,
    stateChanged: false,
  };

  // 1. Gather initial readout values
  const readouts = Array.from(document.querySelectorAll(
    '.readout, .output, #output, #result, #readout, pre, code, .status-val, .contrast-val, .runtime-probe-value, .badge, [role="status"], [aria-live]'
  ));
  const snapshotReadouts = () => readouts.slice(0, 10).map(el => (el.innerText || el.textContent || '').trim().slice(0, 120));
  result.readoutsBefore = snapshotReadouts();

  // 2. Set up mutation observer
  let mutationCount = 0;
  const observer = new MutationObserver((mutations) => {
    mutationCount += mutations.length;
  });
  observer.observe(document.body, { childList: true, attributes: true, characterData: true, subtree: true });

  // 3. Discover interactive controls
  const buttons = Array.from(document.querySelectorAll(
    'button:not([disabled]):not([aria-hidden="true"]), [role="button"]:not([aria-disabled="true"]), .tab:not([disabled]), .preset-swatch, .mode-toggle, .toggle-btn'
  )).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !el.closest('header') && !el.closest('nav') && el.id !== 'theme-toggle';
  });

  const inputs = Array.from(document.querySelectorAll(
    'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
  )).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  result.controlsFound = buttons.length + inputs.length;

  // 4. Exercise buttons (up to 4 distinct interactive controls)
  for (const btn of buttons.slice(0, 4)) {
    const label = (btn.innerText || btn.getAttribute('aria-label') || btn.id || btn.className || 'button').trim().replace(/\\s+/g, ' ').slice(0, 40);
    try {
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const mutationsBeforeAction = mutationCount;
      btn.click();
      result.controlsExercised++;
      result.actions.push('click: ' + label);
      await new Promise(r => setTimeout(r, 200));
      // Record what THIS action did, so a later reset cannot be mistaken for the
      // whole run having done nothing, and so an effect can be attributed.
      result.interactions.push({
        action: 'click: ' + label,
        mutations: mutationCount - mutationsBeforeAction,
        readoutsAfter: snapshotReadouts(),
      });
    } catch (e) {
      result.actions.push('click error: ' + e.message);
    }
  }

  // 5. Exercise inputs (sliders, checkboxes, color, select)
  for (const input of inputs.slice(0, 3)) {
    const id = input.id || input.name || input.type || input.tagName.toLowerCase();
    const mutationsBeforeAction = mutationCount;
    try {
      if (input.type === 'checkbox' || input.type === 'radio') {
        input.click();
        input.dispatchEvent(new Event('change', { bubbles: true }));
        result.controlsExercised++;
        result.actions.push('toggle: ' + id);
      } else if (input.type === 'range') {
        const min = Number(input.min || 0);
        const max = Number(input.max || 100);
        const step = Number(input.step || 1);
        const current = Number(input.value || (min + max) / 2);
        const next = current + step <= max ? current + step : min;
        input.value = String(next);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        result.controlsExercised++;
        result.actions.push('slider ' + id + ': ' + current + ' -> ' + next);
      } else if (input.type === 'color') {
        const nextColor = input.value === '#000000' ? '#1a73e8' : '#00aa55';
        input.value = nextColor;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        result.controlsExercised++;
        result.actions.push('color ' + id + ': ' + nextColor);
      } else if (input.tagName === 'SELECT') {
        if (input.options.length > 1) {
          input.selectedIndex = (input.selectedIndex + 1) % input.options.length;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          result.controlsExercised++;
          result.actions.push('select ' + id + ': ' + input.value);
        }
      }
      await new Promise(r => setTimeout(r, 200));
      result.interactions.push({
        action: result.actions[result.actions.length - 1] || 'input',
        mutations: mutationCount - mutationsBeforeAction,
        readoutsAfter: snapshotReadouts(),
      });
    } catch (e) {
      result.actions.push('input error: ' + e.message);
    }
  }

  // 6. Settle animation frames
  await new Promise(r => setTimeout(r, 350));
  observer.disconnect();

  result.mutations = mutationCount;
  result.domMutated = mutationCount > 0;
  result.readoutsAfter = snapshotReadouts();
  result.stateChanged = result.domMutated || JSON.stringify(result.readoutsBefore) !== JSON.stringify(result.readoutsAfter);

  return result;
})()`;

// ── Verdict ─────────────────────────────────────────────────────────────────
// A page that loads cleanly and is never touched is NOT the same result as one
// driven through its controls, and a spec's own assertions must be able to fail
// the case it belongs to.
//
// The previous verdict was `!driveError && errors.length === 0`. That recorded
// `controlsExercised`, `mutations` and `stateChanged` and then graded none of
// them, and never read `driveData.assert` at all — so a spec written specifically
// to detect a missing Blink feature reported PASS identically with and without
// the flag, and an untouched reference page scored the same as a demo driven
// through seven controls (beads chrome-platform-showcase-6s3 and -aa5).
//
// Only FAIL means "something is broken". The not-demonstrated statuses mean
// "this run is not evidence that the demo works" — a different claim, which must
// not be reported as a pass.
function gradeRun({
  isSpecCase,
  driveData,
  driveError,
  errors,
  visualDelta = null,
  beforeHash = null,
  afterHash = null,
}) {
  if (driveError) return { status: "FAIL", reason: driveError };
  if (errors.length) return { status: "FAIL", reason: errors.join("; ") };

  // A spec case carries its own contract, so grade that and nothing else: spec
  // scripts return their own shape and have no controlsFound/controlsExercised.
  const assertMap = driveData && typeof driveData.assert === "object" && driveData.assert;
  if (assertMap) {
    const failed = Object.entries(assertMap).filter(([, ok]) => !ok).map(([name]) => name);
    if (failed.length) {
      return {
        status: "FAIL",
        reason: `assertion(s) failed: ${failed.join("; ")}`,
        failedAssertions: failed,
      };
    }
    return { status: "PASS" };
  }
  if (isSpecCase) {
    return {
      status: "NOT-ASSERTED",
      reason: "spec case returned no `assert` map, so it asserted nothing",
    };
  }

  // Generic driver: grade the interaction evidence it already collects.
  const found = driveData?.controlsFound ?? 0;
  const exercised = driveData?.controlsExercised ?? 0;
  const effect = classifyDriveEffect({
    interactions: driveData?.interactions ?? [],
    readoutsBefore: driveData?.readoutsBefore ?? [],
    visualDelta,
  });
  if (found === 0) {
    return {
      status: "NO-CONTROLS",
      reason: "no interactive controls found — reference page, not a driven demo",
    };
  }
  if (exercised === 0) {
    return {
      status: "NOT-DRIVEABLE",
      reason:
        `${found} control(s) found, none exercisable by the driver (gesture- or selection-dependent?)`,
    };
  }
  // "No DOM mutation or readout change" is NOT "nothing happened": a control can
  // only paint (canvas, WebGL), and the before/after screenshots are then the only
  // evidence there is. Discarding a differing pair because the DOM was quiet
  // reported NO-EFFECT for demos that plainly responded (bead c3p).
  //
  // But a differing pair is NON-CAUSAL — an animation, clock or autoplay produces
  // one identically — so it is NOT an ordinary pass either. It is reported as
  // VISUAL-ONLY, a not-demonstrated status carrying both hashes and that limit.
  const outcome = gradeEffectOutcome({ effect, exercised, beforeHash, afterHash });
  return outcome.status === DRIVE_STATUS.PASS ? { status: DRIVE_STATUS.PASS, effect } : outcome;
}

// The not-demonstrated status list (including VISUAL-ONLY) lives in
// ./lib/drive-effect.mjs, where the test can assert that a visual-only effect is
// not counted as a pass.

// ── Main Execution ──────────────────────────────────────────────────────────
await bootServer();
console.log(`Server ready at ${base}`);

let chrome = null;
let conn = null;
const results = [];
let passedCount = 0;
let failedCount = 0;
let notDemonstratedCount = 0;
let noVisualDeltaCount = 0;
let visualOnlyCount = 0;

try {
  chrome = await launchChrome();
  conn = await cdpConnection(chrome.wsUrl);

  const sessions = new Map();
  conn.onEvent((message) => {
    const state = sessions.get(message.sessionId);
    if (!state) return;
    if (message.method === "Page.loadEventFired") {
      state.onLoad?.();
    } else if (message.method === "Page.javascriptDialogOpening") {
      conn.send("Page.handleJavaScriptDialog", { accept: true }, message.sessionId).catch(() => {});
    } else if (message.method === "Runtime.exceptionThrown") {
      state.errors.push(
        message.params?.exceptionDetails?.exception?.description ??
          message.params?.exceptionDetails?.text ?? "exception",
      );
    } else if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
      state.errors.push(
        (message.params.args ?? []).map((a) => a.value ?? a.description ?? "").join(" "),
      );
    }
  });

  const runList = specCases
    ? specCases.map((c) => ({
      url: c.url,
      name: c.name,
      slug: c.url.replace(/^\/+|\/+$/g, "").replace(/\//g, "--"),
      specScript: c.script,
    }))
    : targets;

  console.log(`Driving ${runList.length} showcase demo(s) in headless Chrome...`);
  await Deno.mkdir(outDir, { recursive: true });

  for (const item of runList) {
    const fullUrl = item.url.startsWith("http") ? item.url : `${base}${item.url}`;
    const itemDir = join(outDir, item.slug);
    await Deno.mkdir(itemDir, { recursive: true });

    const { targetId } = await conn.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await conn.send("Target.attachToTarget", { targetId, flatten: true });
    const state = { errors: [], onLoad: null };
    sessions.set(sessionId, state);

    await conn.send("Runtime.enable", {}, sessionId);
    await conn.send("Page.enable", {}, sessionId);
    await conn.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        if (navigator.clipboard) {
          const origWrite = navigator.clipboard.writeText?.bind(navigator.clipboard);
          navigator.clipboard.writeText = async (text) => {
            try {
              if (origWrite) return await origWrite(text);
            } catch {
              // headless automated context fallback
            }
          };
        }
      `,
    }, sessionId).catch(() => {});
    await conn.send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);

    const loaded = new Promise((resolve) => {
      state.onLoad = resolve;
    });

    await conn.send("Page.navigate", { url: fullUrl }, sessionId);
    await Promise.race([loaded, new Promise((r) => setTimeout(r, 10000))]);
    await new Promise((r) => setTimeout(r, 500)); // settle initial scripts

    // Capture initial screenshot
    let initialShotPath = null;
    let initialShotBytes = null;
    try {
      const shot = await conn.send("Page.captureScreenshot", { format: "png" }, sessionId);
      if (shot?.data) {
        initialShotPath = join(itemDir, "01-initial.png");
        initialShotBytes = Uint8Array.from(atob(shot.data), (c) => c.charCodeAt(0));
        await Deno.writeFile(initialShotPath, initialShotBytes);
      }
    } catch {
      // non-fatal
    }

    let driveData = null;
    let driveError = null;

    try {
      const scriptToRun = item.specScript
        ? `(async () => { ${item.specScript} })()`
        : IN_PAGE_DRIVER;

      const evalRes = await conn.send("Runtime.evaluate", {
        expression: scriptToRun,
        awaitPromise: true,
        returnByValue: true,
      }, sessionId);

      if (evalRes.exceptionDetails) {
        driveError = evalRes.exceptionDetails.exception?.description ??
          evalRes.exceptionDetails.text;
      } else {
        driveData = evalRes.result?.value ?? {};
      }
    } catch (e) {
      driveError = e.message;
    }

    // Capture after-interaction screenshot. Settle a frame first: without it the
    // capture races the paint of the change the driver just made, which produced
    // byte-identical before/after pairs that were then presented as proof.
    await settleFrames(conn, sessionId);
    let afterShotPath = null;
    let afterShotBytes = null;
    try {
      const shot = await conn.send("Page.captureScreenshot", { format: "png" }, sessionId);
      if (shot?.data) {
        afterShotPath = join(itemDir, "02-interactive.png");
        afterShotBytes = Uint8Array.from(atob(shot.data), (c) => c.charCodeAt(0));
        await Deno.writeFile(afterShotPath, afterShotBytes);
      }
    } catch {
      // non-fatal
    }

    // A pair that hashes the same is not evidence that anything happened. Two
    // causes are possible and the images cannot distinguish them: the paint had
    // not landed (the settle above addresses this) or the interaction legitimately
    // returned the page to its starting state (two clicks that cancel out). Either
    // way the pair must not be presented as proof, so it is labelled instead.
    const beforeHash = initialShotBytes ? await shortHash(initialShotBytes) : null;
    const afterHash = afterShotBytes ? await shortHash(afterShotBytes) : null;
    const visualDelta = beforeHash && afterHash ? beforeHash !== afterHash : null;

    sessions.delete(sessionId);
    await conn.send("Target.closeTarget", { targetId }).catch(() => {});

    // Filter out expected benign browser notices if any, retain real errors
    const errors = state.errors.filter((err) => !err.includes("favicon.ico"));
    const verdict = gradeRun({
      isSpecCase: Boolean(item.specScript),
      driveData,
      driveError,
      errors,
      visualDelta,
      beforeHash,
      afterHash,
    });
    const effect = verdict.effect ?? classifyDriveEffect({
      interactions: driveData?.interactions ?? [],
      readoutsBefore: driveData?.readoutsBefore ?? [],
      visualDelta,
    });

    const record = {
      url: item.url,
      name: item.name,
      slug: item.slug,
      status: verdict.status,
      verdictReason: verdict.reason ?? null,
      assertions: (driveData && typeof driveData.assert === "object" && driveData.assert) || null,
      failedAssertions: verdict.failedAssertions ?? null,
      controlsFound: driveData?.controlsFound ?? 0,
      controlsExercised: driveData?.controlsExercised ?? 0,
      actions: driveData?.actions ?? [],
      interactions: (driveData?.interactions ?? []).map((step) => ({
        action: step?.action ?? null,
        mutations: step?.mutations ?? 0,
      })),
      domMutated: driveData?.domMutated ?? false,
      mutations: driveData?.mutations ?? 0,
      stateChanged: driveData?.stateChanged ?? false,
      effectKind: effect.kind,
      effectiveActions: effect.effectiveActions.map((step) => step.action),
      resetBy: effect.resetBy,
      effectNote: effect.note,
      consoleErrors: errors,
      driveError,
      screenshots: {
        initial: initialShotPath ? `${item.slug}/01-initial.png` : null,
        interactive: afterShotPath ? `${item.slug}/02-interactive.png` : null,
        beforeHash,
        afterHash,
      },
      visualDelta,
      visualDeltaNote: visualDelta === false
        ? (effect.note ??
          "NO-VISUAL-DELTA — before/after screenshots are byte-identical, so the pair is not proof of the interaction")
        : null,
    };

    results.push(record);

    // A driven row with a byte-identical pair is the surprising case worth counting
    // loudly: the report would otherwise present the pair as evidence. Undriven rows
    // (NO-CONTROLS / NO-EFFECT / NOT-DRIVEABLE) are already labelled not-proof by
    // their status, so they get the per-row note but do not inflate this tally.
    const wasDriven = record.controlsExercised > 0 || record.mutations > 0;
    if (record.visualDelta === false && wasDriven) {
      noVisualDeltaCount++;
      console.warn(
        `  NO-VISUAL-DELTA  ${item.url} — ${
          effect.resetBy
            ? `the pair is byte-identical because the effect observed on ${
              effect.effectiveActions[0]?.action ?? "a control"
            } was returned to its initial state by ${effect.resetBy}; the earlier effect was real, but the pair is not proof of it`
            : `before/after screenshots are byte-identical (${record.screenshots.beforeHash}) after ${record.controlsExercised} control(s) and ${record.mutations} mutation(s); the pair is not proof of the interaction`
        }`,
      );
    }

    if (verdict.status === "PASS") {
      passedCount++;
      const actionSummary = record.actions.length
        ? describeActions(
          record.interactions,
          record.actions.slice(0, 3).join(", "),
        )
        : `${Object.keys(record.assertions ?? {}).length} assertion(s) held`;
      const caveat = "";
      console.log(
        `PASS  ${item.url} — ${actionSummary} (${record.mutations} mutations)${caveat}`,
      );
    } else if (verdict.status === DRIVE_STATUS.VISUAL_ONLY) {
      // Not a pass and not a failure: the pair differs but cannot be attributed, so
      // the row is counted apart and flagged for review.
      visualOnlyCount++;
      console.warn(
        `  VISUAL-ONLY  ${item.url} — screenshots differ (${record.screenshots.beforeHash} -> ${record.screenshots.afterHash}) with no DOM mutation or readout change; a differing pair is non-causal, so this needs review rather than a pass`,
      );
    } else if (verdict.status === "FAIL") {
      failedCount++;
      console.error(`FAIL  ${item.url} — ${verdict.reason}`);
    } else {
      // Not broken, but not demonstrated either. Say so rather than calling it a pass.
      notDemonstratedCount++;
      console.warn(`${verdict.status}  ${item.url} — ${verdict.reason}`);
    }
  }
} finally {
  if (conn) conn.close?.();
  if (chrome) await cleanupChrome(chrome);
  if (serverChild) {
    try {
      serverChild.kill("SIGKILL");
      await serverChild.status;
    } catch {
      // ignore
    }
  }
}

// ── Merge & Write Summary Reports ───────────────────────────────────────────
const reportPath = join(outDir, "verification-report.json");
const mergedMap = new Map();

// 1. Recover and load existing results from verification-report.json
if (existsSync(reportPath)) {
  try {
    const raw = await Deno.readTextFile(reportPath);
    const existing = JSON.parse(raw);
    for (const r of existing.results ?? []) {
      if (r?.url) mergedMap.set(r.url, r);
    }
  } catch (e) {
    console.warn(`Warning: failed to read existing ${reportPath}: ${e.message}`);
  }
}

// 2. Discover any valid screenshot directories on disk that may have been orphaned
try {
  for (const entry of Deno.readDirSync(outDir)) {
    if (!entry.isDirectory) continue;
    const initialShot = join(outDir, entry.name, "01-initial.png");
    const afterShot = join(outDir, entry.name, "02-interactive.png");
    if (existsSync(initialShot) && existsSync(afterShot)) {
      const parts = entry.name.split("--");
      if (parts.length >= 3) {
        const milestone = parts[0];
        const concept = parts[parts.length - 1];
        const feature = parts.slice(1, -1).join("--");
        const url = `/${milestone}/${feature}/${concept}/`;
        if (!mergedMap.has(url)) {
          mergedMap.set(url, {
            url,
            name: `${milestone}/${feature}/${concept}`,
            slug: entry.name,
            status: "UNVERIFIED",
            controlsFound: 0,
            controlsExercised: 0,
            actions: ["recovered from disk screenshot artifacts"],
            domMutated: false,
            mutations: 0,
            stateChanged: false,
            consoleErrors: [],
            driveError: null,
            screenshots: {
              initial: `${entry.name}/01-initial.png`,
              interactive: `${entry.name}/02-interactive.png`,
            },
          });
        }
      }
    }
  }
} catch {
  // non-fatal
}

// 3. Merge new run results (monotonic update)
for (const r of results) {
  mergedMap.set(r.url, r);
}

const allResults = Array.from(mergedMap.values()).sort((a, b) => a.url.localeCompare(b.url));
const totalPassed = allResults.filter((r) => r.status === "PASS").length;
const totalUnverified = allResults.filter((r) => r.status === "UNVERIFIED").length;
const totalFailed = allResults.filter((r) => r.status === "FAIL").length;
const notDemonstrated = allResults.filter((r) => NOT_DEMONSTRATED_STATUSES.includes(r.status));

// Total catalogue concepts denominator (per bead cix and mox)
let totalCatalogueConcepts = 3893;
try {
  const manifest = buildFromDisk().filter((m) => m.status === "built");
  const count = manifest.reduce((acc, f) => acc + f.concepts.length, 0);
  if (count > 0) totalCatalogueConcepts = count;
} catch {}

const summaryJson = {
  timestamp: new Date().toISOString(),
  lastRunBase: base,
  catalogueConceptsTotal: totalCatalogueConcepts,
  totalIndexed: allResults.length,
  passed: totalPassed,
  notDemonstrated: notDemonstrated.length,
  unverified: totalUnverified,
  failed: totalFailed,
  lastRunTested: results.length,
  lastRunPassed: passedCount,
  lastRunNotDemonstrated: notDemonstratedCount,
  lastRunNoVisualDelta: noVisualDeltaCount,
  lastRunVisualOnly: visualOnlyCount,
  lastRunFailed: failedCount,
  results: allResults,
};

await Deno.writeTextFile(
  reportPath,
  JSON.stringify(summaryJson, null, 2) + "\n",
);

let md = `# Interactive Demo Verification Report\n\n`;
md += `- **Last Updated:** ${new Date().toISOString()}\n`;
md +=
  `- **Catalogue Coverage:** ${allResults.length} / ${totalCatalogueConcepts} concepts indexed (${
    ((allResults.length / totalCatalogueConcepts) * 100).toFixed(1)
  }%)\n`;
md +=
  `- **Overall Status:** ${totalPassed} passed, ${notDemonstrated.length} not demonstrated, ${totalUnverified} unverified (recovered artifacts), ${totalFailed} failed\n`;
md +=
  `- **Latest Run:** ${results.length} tested (${passedCount} passed, ${notDemonstratedCount} not demonstrated, ${failedCount} failed)\n\n`;
md +=
  `Only **PASS** means the demo was driven and observably responded. **NO-CONTROLS**, **NOT-DRIVEABLE**, **NO-EFFECT**, **NOT-ASSERTED** and **VISUAL-ONLY** mean this run is not evidence that the demo works — they are neither failures nor passes. **UNVERIFIED** rows were recovered from screenshot artifacts and were never driven.\n\n`;
md +=
  `**NO-VISUAL-DELTA** is a caveat on a row, not a status: the before/after screenshots hash the same, so the pair is not proof of the interaction. When the run's per-action evidence identifies the cause it is named — a control whose effect was returned to its initial state by a later reset control — otherwise the pair is simply not claimed: the paint may not have landed.\n\n`;
md +=
  `**Per-action evidence.** The driver records what each control did, so a mutation total is never presented without attribution, and a later reset cannot be mistaken for the whole run having done nothing.\n\n`;
md +=
  `**VISUAL-ONLY** covers the case where the only signal is that the screenshots differ — a control that paints without touching the DOM, or ambient motion. A differing pair is **non-causal**: an animation, a clock or an autoplay produces one identically, so it is not evidence that the control did anything, and the row is reported for review with both hashes rather than counted as a pass.\n\n`;
// Heading says what the table actually contains: driven passes, failures,
// not-demonstrated rows and recovered artifacts all appear here.
md += `## Indexed Demos\n\n`;
md += `| Demo URL | Controls Found / Tested | Mutations | Status | Screenshot Proof |\n`;
md += `| :--- | :---: | :---: | :---: | :--- |\n`;

for (const r of allResults) {
  const proofLinks = [
    r.screenshots?.initial ? `[Initial](${r.screenshots.initial})` : "",
    r.status === DRIVE_STATUS.VISUAL_ONLY
      ? `pair differs (${r.screenshots?.beforeHash} -> ${r.screenshots?.afterHash}) — non-causal, needs review`
      : r.visualDelta === false
      ? (r.resetBy
        ? `NO-VISUAL-DELTA (effect on ${
          r.effectiveActions?.[0] ?? "a control"
        } reset by ${r.resetBy})`
        : "NO-VISUAL-DELTA (pair byte-identical)")
      : r.screenshots?.interactive
      ? `[Interactive](${r.screenshots.interactive})`
      : "",
  ].filter(Boolean).join(" · ");
  md +=
    `| \`${r.url}\` | ${r.controlsFound} / ${r.controlsExercised} | ${r.mutations} | **${r.status}** | ${proofLinks} |\n`;
}

const failedItems = allResults.filter((x) => x.status === "FAIL");
if (failedItems.length > 0) {
  md += `\n## Failures\n\n`;
  for (const r of failedItems) {
    md += `### \`${r.url}\`\n`;
    if (r.failedAssertions?.length) {
      md += `- **Failed assertion(s):** ${r.failedAssertions.map((a) => `\`${a}\``).join(", ")}\n`;
    }
    if (r.driveError) md += `- **Drive Error:** \`${r.driveError}\`\n`;
    for (const err of r.consoleErrors ?? []) {
      md += `- **Console Error:** \`${err}\`\n`;
    }
  }
}

// Listed separately and never folded into the pass count: the showcase
// auto-research SKILL requires zero-control reference pages and blocked routes
// to be reported apart from exercised demos.
if (notDemonstrated.length > 0) {
  md += `\n## Not demonstrated (indexed, not evidence of working behaviour)\n\n`;
  for (const r of notDemonstrated) {
    md += `- \`${r.url}\` — **${r.status}**: ${r.verdictReason ?? "no reason recorded"}\n`;
  }
}

await Deno.writeTextFile(join(outDir, "REPORT.md"), md);

console.log(
  `\nVerification complete this run: ${passedCount} passed, ${notDemonstratedCount} not demonstrated, ${failedCount} failed (of ${results.length} tested).`,
  ...(noVisualDeltaCount
    ? [
      `\nNO-VISUAL-DELTA: ${noVisualDeltaCount} driven row(s) produced byte-identical before/after screenshots — not proof of the interaction; see the table.`,
    ]
    : []),
  ...(visualOnlyCount
    ? [
      `\nVISUAL-ONLY: ${visualOnlyCount} row(s) produced a differing screenshot pair with no DOM mutation or readout change — a differing pair is NON-CAUSAL, so these are NOT passes and need review; see the row notes.`,
    ]
    : []),
);
console.log(
  `Cumulative index: ${totalPassed} passed, ${notDemonstrated.length} not demonstrated, ${totalUnverified} unverified (${allResults.length}/${totalCatalogueConcepts} catalogue concepts indexed).`,
);
console.log(`Reports merged into ${outDir}/REPORT.md and ${outDir}/verification-report.json`);

// A spec case that asserted nothing is a broken spec, not a quiet pass — exit
// non-zero so it cannot be cited as evidence (bead chrome-platform-showcase-6s3).
const notAssertedCount = results.filter((r) => r.status === "NOT-ASSERTED").length;
Deno.exit(failedCount || notAssertedCount ? 1 : 0);
