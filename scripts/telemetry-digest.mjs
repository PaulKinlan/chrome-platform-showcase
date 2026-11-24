#!/usr/bin/env node
// Telemetry digest: turns real-visitor telemetry into a short brief the build routine reads
// before it picks work. Fixes for broken demos come first; recurring error patterns become
// build rules for new demos.
//
//   npm run telemetry-digest                       # live site, needs SHOWCASE_PASSWORD
//   npm run telemetry-digest -- --base http://localhost:3000
//   npm run telemetry-digest -- --input triage.json   # offline, from a saved triage response
//   npm run telemetry-digest -- --stdout              # print the markdown, write nothing
//
// Writes reports/telemetry/latest.md (for agents and humans) and reports/telemetry/latest.json
// (the raw triage window it was built from). Both are overwritten on each run.

import { mkdir, readFile, writeFile } from "node:fs/promises";

const DEFAULT_BASE = "https://chrome-platform-showcase.kinlan-test.workers.dev";
const OUT_DIR = "reports/telemetry";

function arg(name) {
  const i = process.argv.slice(2).indexOf(name);
  return i === -1 ? null : process.argv.slice(2)[i + 1] ?? null;
}

async function loadTriage() {
  const input = arg("--input");
  if (input) return JSON.parse(await readFile(input, "utf8"));
  const base = (arg("--base") ?? process.env["SHOWCASE_BASE_URL"] ?? DEFAULT_BASE).replace(
    /\/$/,
    "",
  );
  const password = process.env["SHOWCASE_PASSWORD"] ?? process.env["showcase_password"];
  if (!password) {
    throw new Error("Set SHOWCASE_PASSWORD (Basic auth for /telemetry/demo/triage).");
  }
  const scan = arg("--scan") ?? "5000";
  const res = await fetch(`${base}/telemetry/demo/triage?scan=${encodeURIComponent(scan)}`, {
    headers: { authorization: `Basic ${btoa(`digest:${password}`)}` },
  });
  if (res.status === 429) {
    throw new Error(
      `Throttled (429, retry after ${res.headers.get("retry-after")}s). Wait; do not retry.`,
    );
  }
  if (!res.ok) throw new Error(`Triage request failed: HTTP ${res.status}`);
  return await res.json();
}

const md = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

function demoLink(key) {
  return key.startsWith("v") ? `/${key.replace(/\/$/, "")}/` : key;
}

function chromeSpread(byChrome) {
  return Object.entries(byChrome ?? {})
    .sort(([a], [b]) => (Number(a) || 0) - (Number(b) || 0))
    .map(([v, n]) => `${v === "unknown" ? "?" : `C${v}`}:${n}`)
    .join(" ");
}

export function renderDigest(triage, generatedAt = new Date().toISOString()) {
  const lines = [];
  lines.push("# Telemetry digest");
  lines.push("");
  lines.push(
    `Generated ${generatedAt} from the last ${triage.window ?? triage.scanned ?? 0} stored ` +
      `events (${triage.scanned ?? 0} signals, ${triage.failures ?? 0} failures).`,
  );
  lines.push("");
  lines.push("How the build uses this: fix the top failing demos before building new ones,");
  lines.push("and treat each recurring pattern below as a rule for every new demo.");

  const demos = (triage.demos ?? []).slice(0, 15);
  lines.push("", "## Top failing demos", "");
  if (!demos.length) lines.push("No failures in this window.");
  else {
    lines.push("| Demo | Failures | Chrome | Top error |", "| --- | ---: | --- | --- |");
    for (const d of demos) {
      lines.push(
        `| [${md(d.key)}](${demoLink(d.key)}) | ${d.failures} | ${md(chromeSpread(d.chrome))} | ${
          md(d.topSignatures?.[0]?.signature ?? "")
        } |`,
      );
    }
  }

  const patterns = (triage.signatures ?? []).filter((s) => (s.demos ?? []).length > 1).slice(
    0,
    15,
  );
  lines.push("", "## Recurring patterns (seen on more than one demo)", "");
  if (!patterns.length) lines.push("None yet.");
  for (const p of patterns) {
    lines.push(`- **${md(p.signature)}**: ${p.count}x on ${p.demos.length} demos`);
  }

  const support = (triage.support ?? []).slice(0, 20);
  lines.push("", "## API support seen by real visitors", "");
  if (!support.length) {
    lines.push("No `showcaseTelemetry.support()` calls recorded yet.");
  } else {
    lines.push("| API | Outcomes | By Chrome version |", "| --- | --- | --- |");
    for (const s of support) {
      const outcomes = Object.entries(s.states).map(([k, v]) => `${k} ${v}`).join(", ");
      const byChrome = Object.entries(s.byChrome ?? {})
        .sort(([a], [b]) => (Number(a) || 0) - (Number(b) || 0))
        .map(([v, st]) =>
          `${v === "unknown" ? "?" : `C${v}`} ${
            Object.entries(st).map(([k, n]) => `${k}:${n}`).join("/")
          }`
        )
        .join("; ");
      lines.push(`| \`${md(s.api)}\` | ${md(outcomes)} | ${md(byChrome)} |`);
    }
  }

  const deps = (triage.deprecations ?? []).slice(0, 15);
  lines.push("", "## Deprecation and intervention reports", "");
  if (!deps.length) lines.push("None in this window.");
  for (const d of deps) {
    lines.push(
      `- ${d.type} **${md(d.id || "(no id)")}** ${d.count}x on ${d.demos.length} demos: ${
        md(d.message)
      }`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

if (import.meta.main) {
  try {
    const triage = await loadTriage();
    const digest = renderDigest(triage);
    if (process.argv.slice(2).includes("--stdout")) {
      console.log(digest);
    } else {
      await mkdir(OUT_DIR, { recursive: true });
      await writeFile(`${OUT_DIR}/latest.md`, digest);
      await writeFile(`${OUT_DIR}/latest.json`, JSON.stringify(triage, null, 2) + "\n");
      console.log(
        `Wrote ${OUT_DIR}/latest.md (${triage.demos?.length ?? 0} failing demos, ` +
          `${triage.support?.length ?? 0} APIs with support data).`,
      );
    }
  } catch (error) {
    console.error(`telemetry-digest: ${error.message}`);
    process.exit(1);
  }
}
