#!/usr/bin/env deno run --allow-run --allow-read --allow-write --allow-net --allow-env

import { delay } from "https://deno.land/std@0.224.0/async/delay.ts";

const REPO_DIR = Deno.cwd();
const PORT = 3000;

console.log(
  "%c🚀 Chrome Platform Showcase - Auto-Research Orchestrator",
  "color: cyan; font-weight: bold",
);
console.log("==========================================================");

// 1. Find all features and concepts
interface FeatureInfo {
  release: string;
  featureSlug: string;
  concepts: string[];
  hasCritique: boolean;
  hasConformance: boolean;
}

async function scanCorpus(): Promise<FeatureInfo[]> {
  const features: FeatureInfo[] = [];
  for await (const entry of Deno.readDir(".")) {
    if (!entry.isDirectory || !/^v\d+$/.test(entry.name)) continue;
    const release = entry.name;
    for await (const fd of Deno.readDir(release)) {
      if (!fd.isDirectory) continue;

      const featureSlug = fd.name;
      const concepts: string[] = [];
      let hasCritique = false;
      let hasConformance = false;

      try {
        const stat = await Deno.stat(`${release}/${featureSlug}/_questions.json`);
        if (stat.isFile) hasCritique = true;
      } catch {}

      try {
        const stat = await Deno.stat(`${release}/${featureSlug}/conformance.json`);
        if (stat.isFile) hasConformance = true;
      } catch {}

      try {
        for await (const cd of Deno.readDir(`${release}/${featureSlug}`)) {
          if (cd.isDirectory) {
            concepts.push(cd.name);
          }
        }
      } catch {}

      features.push({
        release,
        featureSlug,
        concepts,
        hasCritique,
        hasConformance,
      });
    }
  }
  return features;
}

const features = await scanCorpus();
console.log(`Scanned repository: found ${features.length} features across all milestones.`);

// 2. Start the Deno server in the background
console.log(`\nStarting local server on http://localhost:${PORT}...`);
const serverProcess = new Deno.Command("deno", {
  args: ["run", "--allow-net", "--allow-read", "--allow-env", "server.ts"],
  stdout: "piped",
  stderr: "inherit",
  env: { PORT: String(PORT) },
});

const child = serverProcess.spawn();

// Wait a moment for server to boot
await delay(3000);

console.log("%cServer is up and running!", "color: green");

// 3. Quality Checklist
const missingCritiques = features.filter((f) => !f.hasCritique);
const missingConformance = features.filter((f) => !f.hasConformance);

console.log(`\n%c--- Quality Checklist Snapshot ---`, "color: yellow; font-weight: bold");
console.log(`Missing Feature-level Critiques: ${missingCritiques.length}`);
console.log(`Missing Feature-level Conformance Suites: ${missingConformance.length}`);

if (missingCritiques.length > 0) {
  console.log("\nTop 5 Missing Critiques:");
  missingCritiques.slice(0, 5).forEach((f) => console.log(`  - [${f.release}] ${f.featureSlug}`));
}

if (missingConformance.length > 0) {
  console.log("\nTop 5 Missing Conformance Suites:");
  missingConformance.slice(0, 5).forEach((f) => console.log(`  - [${f.release}] ${f.featureSlug}`));
}

// 4. Instructing next steps
console.log("\n==========================================================");
console.log(
  "%c🎉 To automatically repair and run browser-based conformance:",
  "color: green; font-weight: bold",
);
console.log("1. Type '/auto-research' or 'run showcase' in the chat.");
console.log(
  "2. The agent will start a background browser subagent, load http://localhost:3000/conformance/run-all,",
);
console.log("   automatically collect all failures, fix the relevant codes, and commit them.");
console.log("==========================================================");

// Clean up server on exit
Deno.addSignalListener("SIGINT", () => {
  console.log("\nShutting down local server...");
  try {
    child.kill("SIGTERM");
  } catch {}
  Deno.exit(0);
});

// Keep running so the user can browse http://localhost:3000
console.log("\nServer is running. Press Ctrl+C to stop.");
while (true) {
  await delay(10000);
}
