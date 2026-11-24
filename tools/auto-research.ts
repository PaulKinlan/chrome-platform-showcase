#!/usr/bin/env node

import { readdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const REPO_DIR = process.cwd();
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
  for (const entry of await readdir(".", { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^v\d+$/.test(entry.name)) continue;
    const release = entry.name;
    for (const fd of await readdir(release, { withFileTypes: true })) {
      if (!fd.isDirectory()) continue;

      const featureSlug = fd.name;
      const concepts: string[] = [];
      let hasCritique = false;
      let hasConformance = false;

      try {
        if ((await stat(`${release}/${featureSlug}/_questions.json`)).isFile()) hasCritique = true;
      } catch {}

      try {
        if ((await stat(`${release}/${featureSlug}/conformance.json`)).isFile()) {
          hasConformance = true;
        }
      } catch {}

      try {
        for (const cd of await readdir(`${release}/${featureSlug}`, { withFileTypes: true })) {
          if (cd.isDirectory()) {
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

// 2. Start the local server in the background
console.log(`\nStarting local server on http://localhost:${PORT}...`);
const child = spawn(process.execPath, ["server.ts"], {
  stdio: ["ignore", "ignore", "inherit"],
  env: { ...process.env, PORT: String(PORT) },
});

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
process.on("SIGINT", () => {
  console.log("\nShutting down local server...");
  try {
    child.kill("SIGTERM");
  } catch {}
  process.exit(0);
});

// Keep running so the user can browse http://localhost:3000
console.log("\nServer is running. Press Ctrl+C to stop.");
while (true) {
  await delay(10000);
}
