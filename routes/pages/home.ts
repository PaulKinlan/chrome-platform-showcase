import { platform } from "../../lib/platform.ts";
import type { Channels } from "../../lib/chromestatus.ts";
import { escapeHTML } from "../html.ts";
import {
  BYLINE_FOOTER,
  formatCommitLine,
  getLatestCommit,
  getMilestoneSchedule,
  stableDateRange,
} from "./layout.ts";

export async function renderIndex(channels: Channels): Promise<string> {
  const commit = await getLatestCommit();
  // Chromestatus's "stable.mstone" is the *next* stable cut, even when its
  // stable_date is still a few days away. Most users are on stable-1 until
  // the cut lands. Show that release too so the issue stream and the catalogue
  // line up with what's actually deployed.
  const prevStable = channels.stable.mstone - 1;
  const releases: { mstone: number; status: string; stableRange: string }[] = [
    { mstone: channels.dev.mstone, status: "Dev", stableRange: stableDateRange(channels.dev) },
    { mstone: channels.beta.mstone, status: "Beta", stableRange: stableDateRange(channels.beta) },
    {
      mstone: channels.stable.mstone,
      status: "Stable (rolling out)",
      stableRange: stableDateRange(channels.stable),
    },
    { mstone: prevStable, status: "Stable (live)", stableRange: "" },
  ];

  // Surface older releases that have v<N>/ folders too, so a
  // demo for an older Chrome doesn't get hidden just because the channels API
  // no longer mentions it.
  const seen = new Set(releases.map((r) => r.mstone));
  try {
    for await (const entry of platform().readDir(".")) {
      if (entry.isDirectory && /^v\d+$/.test(entry.name)) {
        const m = Number(entry.name.slice(1));
        if (!seen.has(m)) {
          releases.push({ mstone: m, status: "Archive", stableRange: "" });
          seen.add(m);
        }
      }
    }
  } catch {
    // ignore — some runtimes can refuse the readDir at root.
  }

  await Promise.all(releases.map(async (release) => {
    if (release.stableRange) return;
    const schedule = await getMilestoneSchedule(release.mstone);
    if (schedule) release.stableRange = stableDateRange(schedule);
  }));

  releases.sort((a, b) => b.mstone - a.mstone);

  const cards = releases.map((r) => {
    let note: string;
    if (r.stableRange) {
      note = `Stable date range: ${r.stableRange}`;
    } else if (r.status === "Archive") {
      note = "Stable date unavailable";
    } else {
      note = "Most users are here";
    }
    return `<li class="release-card">
      <a class="release-card-link" href="/v${r.mstone}/">
        <span class="release-card-row">
          <span class="release-label">Chrome ${r.mstone}</span>
          <span class="release-status">${escapeHTML(r.status)}</span>
        </span>
        <span class="release-note">${escapeHTML(note)}</span>
      </a>
    </li>`;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
  <main>
    <header class="lede-block">
      <p class="eyebrow">work in progress</p>
      <h1>chrome platform showcase</h1>
      <p class="lede">A premium, hand-crafted demo for every new web platform feature shipping in Chrome. One per API, each with its own portfolio of interactive use cases. Maintained by an automated routine; reviewed and merged by humans.</p>
      ${formatCommitLine(commit)}
    </header>

    <section>
      <h2>releases</h2>
      <ol class="release-list">${cards}</ol>
      <p class="note">Or jump straight to <a href="/features">the full feature catalogue</a>, <a href="/categories/">browse by category</a> (identity, on-device AI, CSS layout, WebGPU, privacy…), <a href="/experiments/">explore experiments</a> (starters, stress tests, and cross-API compositions), the <a href="/friction/">friction ledger</a> (measured browser bugs &amp; API limits), the <a href="/critiques/">self-critique</a>, or run the <a href="/conformance/">conformance probes</a> in your browser. Release cards show stable rollout ranges from ChromeStatus and Chromium Dash schedules when available.</p>
    </section>

    <section class="how">
      <h2>how it works</h2>
      <ol>
        <li>The routine reads the <a href="https://chromestatus.com/" target="_blank" rel="noopener">chromestatus.com</a> JSON API for current, upcoming, and archived milestones.</li>
        <li>It builds every missing feature directly from the listing name, feature details, specs, docs, samples, and explainers.</li>
        <li>Each feature gets a feature index plus every distinct interactive concept the API needs; 2-3 concepts is a floor, not a cap.</li>
        <li>The routine commits one feature at a time to <code>main</code>. Cloudflare Workers Builds redeploys from GitHub.</li>
        <li>Humans review the live output and tighten demos, server routes, and the routine prompt as needed.</li>
      </ol>
      <p class="note">Repo: <a href="https://github.com/PaulKinlan/chrome-platform-showcase" target="_blank" rel="noopener">PaulKinlan/chrome-platform-showcase</a>.</p>
    </section>

    ${BYLINE_FOOTER}
  </main>
</body>
</html>`;
}
