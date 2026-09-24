#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net
// Regenerate the ContextJ data tables embedded in the IDNA domain-validator demo.
//
// RFC 5892 Appendix A.1/A.2 needs two pieces of DERIVED Unicode data:
//
//   * Joining_Type for every code point (the ZWNJ clause matches
//     (L|D)(T)* ZWNJ (T)*(R|D); Join_Causing is deliberately NOT in those sets)
//   * Canonical_Combining_Class = Virama for the "preceded by Virama" clause
//
// The demo used to carry hand-written ranges and a short Virama list, which
// misreported the rules: it missed dual/right-joining letters (U+0626, U+06C1,
// U+06D2, …), treated Join_Causing U+0640 as joining, and listed 15 of the 69
// Virama code points. Derived data belongs in generated data, not in ranges
// someone typed — so this script fetches the UCD, compresses it to ranges, and
// rewrites the marked block in the page.
//
// Usage:
//   deno run --allow-read --allow-write --allow-net scripts/build-joining-table.mjs
//   UCD_DIR=/path/to/ucd deno run --allow-read --allow-write scripts/build-joining-table.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./lib/manifest.mjs";

const PAGE = join(
  REPO_ROOT,
  "v148/idna-contextj-rules/domain-validator/index.html",
);
const BEGIN = "// BEGIN GENERATED CONTEXT-DATA";
const END = "// END GENERATED CONTEXT-DATA";
const JOINING_KEEP = new Set(["L", "D", "R", "C", "T"]); // U is the default and is omitted

const BASE = (Deno.env.get("UCD_DIR") ??
  "https://www.unicode.org/Public/UCD/latest/ucd/extracted").replace(/\/$/, "");

async function load(name) {
  const local = `${BASE}/${name}`;
  if (local.startsWith("http")) {
    const res = await fetch(local);
    if (!res.ok) throw new Error(`${local} -> HTTP ${res.status}`);
    return await res.text();
  }
  return readFileSync(local, "utf8");
}

// "# DerivedJoiningType-18.0.0.txt" -> "18.0.0"
function versionOf(text, fallback) {
  const m = text.match(/^#\s*\S+?-(\d+\.\d+\.\d+)\.txt/m);
  return m ? m[1] : fallback;
}

function* entries(text) {
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [rangeRaw, valueRaw] = line.split("#")[0].split(";");
    if (!rangeRaw || !valueRaw) continue;
    const range = rangeRaw.trim();
    const value = valueRaw.trim();
    if (range.includes("..")) {
      const [a, b] = range.split("..");
      yield [parseInt(a, 16), parseInt(b, 16), value];
    } else {
      const cp = parseInt(range, 16);
      yield [cp, cp, value];
    }
  }
}

function compress(codepoints) {
  const ranges = [];
  for (const cp of [...codepoints].sort((a, b) => a - b)) {
    const last = ranges[ranges.length - 1];
    if (last && last[1] + 1 === cp) last[1] = cp;
    else ranges.push([cp, cp]);
  }
  return ranges;
}

const joiningText = await load("DerivedJoiningType.txt");
const combiningText = await load("DerivedCombiningClass.txt");

// Joining_Type, keeping the types the rules distinguish. The UCD file groups
// entries by property value (Join_Causing first, then Dual_Joining, …), NOT by
// code point, so the ranges must be sorted before they can be binary-searched.
const joiningRanges = [];
for (const [start, end, type] of entries(joiningText)) {
  if (!JOINING_KEEP.has(type)) continue;
  joiningRanges.push([start, end, type]);
}
joiningRanges.sort((a, b) => a[0] - b[0]);
for (let i = 1; i < joiningRanges.length; i++) {
  if (joiningRanges[i][0] <= joiningRanges[i - 1][1]) {
    throw new Error(
      `overlapping joining ranges at U+${joiningRanges[i][0].toString(16)}: ` +
        `${joiningRanges[i - 1][2]} then ${joiningRanges[i][2]}`,
    );
  }
}

const viramas = [];
for (const [start, end, ccc] of entries(combiningText)) {
  if (ccc !== "9") continue;
  for (let cp = start; cp <= end; cp++) viramas.push(cp);
}

const version = versionOf(joiningText, "unknown");
if (versionOf(combiningText, version) !== version) {
  throw new Error("joining and combining data are from different UCD versions");
}

// Self-check before writing: every code point the UCD lists must map back to its
// own type through the sorted ranges. Catches ordering and merge mistakes, which
// is exactly how an unsorted table shipped once already.
const lookup = (cp) => {
  let lo = 0;
  let hi = joiningRanges.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const [start, end, type] = joiningRanges[mid];
    if (cp < start) hi = mid - 1;
    else if (cp > end) lo = mid + 1;
    else return type;
  }
  return "U";
};
for (const [start, end, type] of entries(joiningText)) {
  for (let cp = start; cp <= end; cp++) {
    if (lookup(cp) !== type) {
      throw new Error(
        `self-check failed at U+${cp.toString(16)}: table says ${lookup(cp)}, UCD says ${type}`,
      );
    }
  }
}
const viramaCheck = new Set(viramas);
for (const [start, end, ccc] of entries(combiningText)) {
  if (ccc !== "9") continue;
  for (let cp = start; cp <= end; cp++) {
    if (!viramaCheck.has(cp)) {
      throw new Error(`virama self-check failed at U+${cp.toString(16)}`);
    }
  }
}

const hex = (cp) => `0x${cp.toString(16).toUpperCase().padStart(4, "0")}`;
const formatRanges = (() => {
  let line = "  const JOINING_RANGES = [\n";
  let width = 0;
  for (const [start, end, type] of joiningRanges) {
    const item = `[${hex(start)}, ${hex(end)}, "${type}"]`;
    if (width + item.length > 96) {
      line += "\n";
      width = 0;
    }
    line += `    ${item},`;
    width += item.length + 5;
  }
  return line + "\n  ];";
})();
const formatViramas = (() => {
  let line = "  const VIRAMAS = new Set([\n";
  let width = 0;
  for (const cp of viramas) {
    const item = hex(cp);
    if (width + item.length > 96) {
      line += "\n";
      width = 0;
    }
    line += `    ${item},`;
    width += item.length + 5;
  }
  return line + "\n  ]);";
})();

const block = [
  `${BEGIN} (Unicode ${version}) — regenerate with: deno task joining-table`,
  `  // Joining_Type ranges for every code point whose type is not U (non-joining);`,
  `  // Join_Causing (C) is kept because it is NOT in the RFC 5892 joining sets and the`,
  `  // demo must not treat it as joining. Viramas are every code point with`,
  `  // Canonical_Combining_Class = Virama (9). Source: Unicode Character Database ${version}.`,
  formatRanges,
  formatViramas,
  `  const CONTEXT_DATA_VERSION = "${version}";`,
  `  ${END}`,
].join("\n");

const page = readFileSync(PAGE, "utf8");
const start = page.indexOf(BEGIN);
const end = page.indexOf(END);
if (start < 0 || end < 0) {
  throw new Error(
    `marker block not found in ${PAGE}; expected ${BEGIN} … ${END}`,
  );
}
const updated = page.slice(0, start) + block + page.slice(end + END.length);
writeFileSync(PAGE, updated);

console.log(
  `joining-table: Unicode ${version} · ${joiningRanges.length} joining ranges · ${viramas.length} viramas`,
);
console.log(`updated ${PAGE}`);
