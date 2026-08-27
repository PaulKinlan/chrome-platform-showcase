#!/usr/bin/env -S deno run --allow-read --allow-write
// Write the lineage note into every feature index page that shares its
// ChromeStatus feature id with another milestone.
//
// Without it, four separate pages each open with "Chrome 150 introduces the
// <usermedia> element" for a feature that shipped in Chrome 151 and was merely
// re-listed by ChromeStatus in 144, 149 and 150 as its estimate moved. The note
// states which milestone the feature actually shipped in, why the other pages
// exist, and links the siblings so the demo work is reachable from all of them.
//
// Routes are durable: nothing is moved or deleted, the note is added in place.
// Idempotent — an existing note is replaced, so this can be re-run after
// `deno task feature-lineage`.
//
// Usage: deno task apply-lineage [--check]

const ROOT = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
const CHECK = Deno.args.includes("--check");

const lineage = JSON.parse(await Deno.readTextFile(`${ROOT}/feature-lineage.json`));

const NOTE_RE = /\n[ \t]*<aside class="lineage-note"[\s\S]*?<\/aside>\n/;

/** "Chrome 144, 149 and 150" */
function joinMilestones(list) {
  if (list.length === 1) return `Chrome ${list[0]}`;
  return `Chrome ${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function link(folder) {
  const demos = folder.concepts === 1 ? "1 demo" : `${folder.concepts} demos`;
  return `        <li><a href="/${folder.dir}/">Chrome ${folder.milestone}</a> · ${demos}</li>`;
}

function buildNote(id, feature, self) {
  const others = feature.folders.filter((f) => f.dir !== self.dir);
  const canonical = feature.folders.find((f) => f.role === "canonical");
  const shipped = feature.shippedDesktop;
  const listed = joinMilestones(feature.folders.map((f) => f.milestone));

  let head;
  let body;
  if (feature.canonicalBasis === "shipped-milestone") {
    head = self.role === "canonical"
      ? `Shipped in Chrome ${shipped}`
      : `Shipped in <a href="/${canonical.dir}/">Chrome ${shipped}</a>, not Chrome ${self.milestone}`;
    body = `ChromeStatus listed this feature against ${listed} as its shipping estimate moved. ` +
      (self.role === "canonical"
        ? `This is the milestone it shipped on desktop. The earlier listings kept their own demos:`
        : `It shipped on desktop in Chrome ${shipped}. The demos on this page were built against the Chrome ${self.milestone} listing; the other listings are:`);
  } else if (feature.canonicalBasis === "shipping-milestone-not-built") {
    head = `Shipped in Chrome ${shipped} · listed in ${listed}`;
    body = `ChromeStatus records a desktop ship in Chrome ${shipped}, which has no page for this ` +
      `feature. It was listed against ${listed} as its estimate moved, and the demo work is split ` +
      `across those milestones:`;
  } else {
    head = `Listed in ${listed} · no desktop ship recorded`;
    body =
      `ChromeStatus has no desktop shipping milestone for this feature and listed it against ` +
      `${listed} as its estimate moved. The demo work is split across those milestones:`;
  }

  return `  <aside class="lineage-note" data-feature-lineage="${id}">
    <p class="lineage-head">${head}</p>
    <p>${body}</p>
    <ul class="lineage-links">
${others.map(link).join("\n")}
    </ul>
    <p class="lineage-source"><a href="https://chromestatus.com/feature/${id}">ChromeStatus feature ${id}</a></p>
  </aside>
`;
}

let written = 0;
let missingCrumbs = [];
let stale = [];

for (const [id, feature] of Object.entries(lineage.features)) {
  for (const self of feature.folders) {
    const path = `${ROOT}/${self.dir}/index.html`;
    let html;
    try {
      html = await Deno.readTextFile(path);
    } catch {
      missingCrumbs.push(`${self.dir} (no index.html)`);
      continue;
    }
    const stripped = html.replace(NOTE_RE, "");
    // Some pages are written on a single line, so the newline after the
    // crumbs paragraph is optional and the note supplies its own.
    const crumbs = stripped.match(/[ \t]*<p class="crumbs">[\s\S]*?<\/p>\n?/);
    if (!crumbs) {
      missingCrumbs.push(self.dir);
      continue;
    }
    const note = buildNote(id, feature, self);
    const anchor = crumbs[0].endsWith("\n") ? crumbs[0] : `${crumbs[0]}\n`;
    const next = stripped.slice(0, crumbs.index) + anchor + "\n" + note +
      stripped.slice(crumbs.index + crumbs[0].length);

    if (next === html) continue;
    if (CHECK) {
      stale.push(self.dir);
      continue;
    }
    await Deno.writeTextFile(path, next);
    written++;
  }
}

if (missingCrumbs.length) {
  console.error(`no crumbs paragraph to anchor the note in:\n  ${missingCrumbs.join("\n  ")}`);
}
if (CHECK) {
  if (stale.length) {
    console.error(
      `${stale.length} feature pages have a missing or out-of-date lineage note:\n  ` +
        stale.slice(0, 20).join("\n  ") +
        (stale.length > 20 ? `\n  … and ${stale.length - 20} more` : "") +
        `\nRun: deno task feature-lineage && deno task apply-lineage`,
    );
    Deno.exit(1);
  }
  console.log("every duplicated feature page carries its lineage note");
} else {
  console.log(`lineage note written to ${written} feature pages`);
}
if (missingCrumbs.length) Deno.exit(1);
