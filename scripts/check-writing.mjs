#!/usr/bin/env node
// Writing-hygiene linter for showcase demo prose (ported from html-in-canvas-demos).
//
// Flags AI-slop and marketing-hype filler phrases in demo HTML prose (ignoring
// <script>, <style>, <code>, <pre>, HTML comments, and tags) and in JSON prose
// files (page.json / findings records).
//
// Usage:
//   node scripts/check-writing.mjs <path...>        # exit 1 if findings
//   node scripts/check-writing.mjs --changed [ref]  # changed files vs ref (origin/main or HEAD)
//   node scripts/check-writing.mjs --report         # non-failing summary across v*/

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const WRITING_RULES = [
  {
    id: "delve",
    pattern: /\bdelv(?:e|es|ed|ing)\b/gi,
    suggestion: "Use a concrete verb like 'inspect', 'examine', or 'trace'.",
  },
  {
    id: "tapestry",
    pattern: /\btapestry\b/gi,
    suggestion: "Name the actual set of APIs or components instead of 'tapestry'.",
  },
  {
    id: "unlock-the-power",
    pattern: /\bunlock(?:s|ed|ing)?\s+the\s+power\b/gi,
    suggestion: "State the concrete capability the API exposes.",
  },
  {
    id: "seamless",
    pattern: /\bseamless(?:ly)?\b/gi,
    suggestion: "Describe the actual transition, latency, or handoff behavior.",
  },
  {
    id: "game-changer",
    pattern: /\bgame[- ]chang(?:er|ing)\b/gi,
    suggestion: "State what changed and what constraint it removes.",
  },
  {
    id: "revolutionize",
    pattern: /\brevolutioni[sz](?:e|es|ed|ing)\b/gi,
    suggestion: "Describe the specific before/after difference.",
  },
  {
    id: "cutting-edge",
    pattern: /\bcutting[- ]edge\b/gi,
    suggestion: "Name the milestone, spec stage, or browser flag directly.",
  },
  {
    id: "supercharge",
    pattern: /\bsupercharg(?:e|es|ed|ing)\b/gi,
    suggestion: "State the measured speedup or new capability directly.",
  },
  {
    id: "harness-the-power",
    pattern: /\bharness(?:es|ed|ing)?\s+the\s+power\b/gi,
    suggestion: "Say directly what the code calls or uses.",
  },
  {
    id: "elevate-your",
    pattern: /\belevate\s+your\b/gi,
    suggestion: "Describe the concrete user-visible improvement.",
  },
  {
    id: "in-todays-world",
    pattern: /\bin\s+today['’]s\s+(?:fast[- ]paced|modern)\b/gi,
    suggestion: "Cut the throat-clearing opener and start with the technical problem.",
  },
  {
    id: "dive-into",
    pattern: /\b(?:deep[- ])?div(?:e|es|ing)\s+into\b/gi,
    suggestion: "Start directly with the behaviour or API call.",
  },
  {
    id: "worth-noting",
    pattern: /\bit(?:'s|’s|\s+is)\s+worth\s+noting(?:\s+that)?\b/gi,
    suggestion: "Delete the filler lead-in and state the fact directly.",
  },
  {
    id: "empower-developers",
    pattern: /\bempower(?:s|ed|ing)?\s+developers\b/gi,
    suggestion: "Use 'lets pages' or 'allows scripts to' with the concrete action.",
  },
];

const JSON_SKIP_KEYS = new Set([
  "id",
  "url",
  "href",
  "slug",
  "route",
  "path",
  "file",
  "status",
  "date",
  "lastChecked",
  "code",
  "snippet",
  "selector",
  "query",
  "source",
  "evidence",
  "verdict",
]);

function keepNewlines(str) {
  return str.replace(/[^\n]/g, " ");
}

function decodeBasicEntities(text) {
  return text
    .replace(/&rsquo;|&#8217;|&#x2019;/gi, "’")
    .replace(/&lsquo;|&#8216;|&#x2018;/gi, "‘")
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/&quot;|&#34;|&#x22;/gi, '"')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/**
 * Strip non-prose regions (<script>, <style>, <pre>, <code>, <svg>, HTML
 * comments, and tags) from HTML while preserving line breaks so line numbers
 * in findings map directly back to the original HTML source.
 */
export function stripNonProseHtml(html) {
  let out = String(html);
  // Strip comments first so commented-out tags do not affect block matching.
  out = out.replace(/<!--[\s\S]*?-->/g, keepNewlines);
  // Strip raw-text, code, and non-prose blocks (pre before code so nested code is removed too).
  for (const tag of ["script", "style", "pre", "code", "svg", "noscript", "textarea"]) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    out = out.replace(re, keepNewlines);
  }
  // Strip remaining tags while keeping newlines inside multi-line tags.
  out = out.replace(/<[^>]+>/g, (tag) => (tag.includes("\n") ? keepNewlines(tag) : " "));
  return decodeBasicEntities(out);
}

function extractJsonStrings(value, parentKey = "", out = []) {
  if (typeof value === "string") {
    if (!JSON_SKIP_KEYS.has(parentKey)) out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) extractJsonStrings(item, parentKey, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const [key, val] of Object.entries(value)) {
      if (JSON_SKIP_KEYS.has(key)) continue;
      extractJsonStrings(val, key, out);
    }
  }
  return out;
}

function lineNumberForSnippet(rawLines, needle, startIndex = 0) {
  const lower = needle.toLowerCase();
  for (let i = startIndex; i < rawLines.length; i++) {
    if (rawLines[i].toLowerCase().includes(lower)) return i + 1;
  }
  for (let i = 0; i < startIndex && i < rawLines.length; i++) {
    if (rawLines[i].toLowerCase().includes(lower)) return i + 1;
  }
  return 1;
}

function scanPlainLines(text, filename) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  for (let idx = 0; idx < lines.length; idx++) {
    const lineText = lines[idx];
    if (!lineText.trim()) continue;
    for (const rule of WRITING_RULES) {
      rule.pattern.lastIndex = 0;
      let match;
      while ((match = rule.pattern.exec(lineText)) !== null) {
        const excerpt = lineText.trim().replace(/\s+/g, " ");
        findings.push({
          file: filename,
          line: idx + 1,
          column: match.index + 1,
          match: match[0],
          rule: rule.id,
          suggestion: rule.suggestion,
          excerpt: excerpt.length > 140 ? `${excerpt.slice(0, 137)}...` : excerpt,
        });
      }
    }
  }
  return findings;
}

function scanJsonText(rawText, filename) {
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return scanPlainLines(rawText, filename);
  }

  const rawLines = rawText.split(/\r?\n/);
  const strings = extractJsonStrings(parsed);
  const findings = [];
  let cursorLine = 0;

  for (const str of strings) {
    // Strip inline code spans inside markdown-ish JSON prose strings.
    const prose = str.replace(/`[^`]*`/g, " ");
    for (const rule of WRITING_RULES) {
      rule.pattern.lastIndex = 0;
      let match;
      while ((match = rule.pattern.exec(prose)) !== null) {
        const line = lineNumberForSnippet(rawLines, match[0], cursorLine);
        cursorLine = Math.max(0, line - 1);
        const excerpt = str.trim().replace(/\s+/g, " ");
        findings.push({
          file: filename,
          line,
          column: match.index + 1,
          match: match[0],
          rule: rule.id,
          suggestion: rule.suggestion,
          excerpt: excerpt.length > 140 ? `${excerpt.slice(0, 137)}...` : excerpt,
        });
      }
    }
  }
  return findings;
}

/**
 * Pure writing check over file text.
 * - `.html` / `.htm` files strip scripts, styles, code, pre, comments, and tags.
 * - `.json` files inspect prose fields (e.g. `page.json`, `findings`).
 * - Everything else is scanned as plain text.
 */
export function checkWritingText(text, filename = "<input>") {
  const ext = extname(filename).toLowerCase();
  if (ext === ".html" || ext === ".htm") {
    return scanPlainLines(stripNonProseHtml(text), filename);
  }
  if (ext === ".json") {
    return scanJsonText(text, filename);
  }
  return scanPlainLines(String(text), filename);
}

function isTargetFile(filePath) {
  const name = basename(filePath).toLowerCase();
  return name.endsWith(".html") || name === "page.json" || name === "_questions.json";
}

function collectFiles(targetPath, out = []) {
  const full = resolve(targetPath);
  const st = statSync(full);
  if (st.isFile()) {
    out.push(full);
    return out;
  }
  if (!st.isDirectory()) return out;
  for (const entry of readdirSync(full, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".claude") continue;
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const child = join(full, entry.name);
    if (entry.isDirectory()) {
      collectFiles(child, out);
    } else if (isTargetFile(child)) {
      out.push(child);
    }
  }
  return out;
}

function listReleaseDirs() {
  const dirs = [];
  for (const entry of readdirSync(REPO_ROOT, { withFileTypes: true })) {
    if (entry.isDirectory() && /^v\d+$/.test(entry.name)) {
      dirs.push(join(REPO_ROOT, entry.name));
    }
  }
  return dirs.sort();
}

function gitOut(args) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function resolveBaseRef(explicitRef) {
  if (explicitRef) return explicitRef;
  for (const candidate of ["origin/main", "HEAD"]) {
    try {
      gitOut(["rev-parse", "--verify", candidate]);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  return "HEAD";
}

function changedTargetFiles(explicitRef) {
  const ref = resolveBaseRef(explicitRef);
  const files = new Set();
  const addLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed || !isTargetFile(trimmed)) return;
    const full = resolve(REPO_ROOT, trimmed);
    try {
      if (statSync(full).isFile()) files.add(full);
    } catch {
      // deleted file
    }
  };
  for (const line of gitOut(["diff", "--name-only", "--diff-filter=ACMR", ref]).split("\n")) {
    addLine(line);
  }
  for (const line of gitOut(["ls-files", "--others", "--exclude-standard"]).split("\n")) {
    addLine(line);
  }
  return { ref, files: [...files].sort() };
}

function formatDisplayPath(filePath) {
  const rel = relative(REPO_ROOT, filePath);
  return rel && !rel.startsWith("..") ? rel : filePath;
}

function printFindings(findings) {
  for (const f of findings) {
    process.stdout.write(
      `${f.file}:${f.line} [${f.rule}] "${f.match}" — ${f.suggestion}\n`,
    );
  }
}

function runReport() {
  const dirs = listReleaseDirs();
  const files = [];
  for (const dir of dirs) collectFiles(dir, files);

  const byRule = new Map();
  const byFile = new Map();
  let totalFindings = 0;

  for (const file of files) {
    const rel = formatDisplayPath(file);
    const content = readFileSync(file, "utf8");
    const findings = checkWritingText(content, rel);
    if (findings.length === 0) continue;
    totalFindings += findings.length;
    byFile.set(rel, findings.length);
    for (const f of findings) {
      byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
    }
  }

  process.stdout.write(
    `check-writing report: scanned ${files.length} files across ${dirs.length} release dirs — ` +
      `${totalFindings} match(es) in ${byFile.size} file(s)\n`,
  );

  if (byRule.size > 0) {
    process.stdout.write("\nTop matched phrases:\n");
    const sortedRules = [...byRule.entries()].sort((a, b) => b[1] - a[1]);
    for (const [rule, count] of sortedRules) {
      process.stdout.write(`  ${String(count).padStart(4)}  ${rule}\n`);
    }
  }

  if (byFile.size > 0) {
    process.stdout.write("\nTop files:\n");
    const sortedFiles = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
    for (const [file, count] of sortedFiles) {
      process.stdout.write(`  ${String(count).padStart(4)}  ${file}\n`);
    }
  }
  return 0;
}

function runCli(argv) {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
      "Usage:\n" +
        "  node scripts/check-writing.mjs <path...>\n" +
        "  node scripts/check-writing.mjs --changed [ref]\n" +
        "  node scripts/check-writing.mjs --report\n",
    );
    return argv.length === 0 ? 1 : 0;
  }

  if (argv[0] === "--report") {
    return runReport();
  }

  let files = [];
  let label = "";
  if (argv[0] === "--changed") {
    const { ref, files: changed } = changedTargetFiles(argv[1]);
    files = changed;
    label = `changed vs ${ref}`;
  } else {
    for (const arg of argv) collectFiles(arg, files);
    label = argv.join(", ");
  }

  const allFindings = [];
  for (const file of files) {
    const rel = formatDisplayPath(file);
    const content = readFileSync(file, "utf8");
    allFindings.push(...checkWritingText(content, rel));
  }

  if (allFindings.length > 0) {
    printFindings(allFindings);
    process.stderr.write(
      `check-writing: ${allFindings.length} finding(s) across ${files.length} file(s) (${label})\n`,
    );
    return 1;
  }

  process.stdout.write(
    `check-writing: PASS — 0 findings across ${files.length} file(s) (${label})\n`,
  );
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exit(runCli(process.argv.slice(2)));
}
