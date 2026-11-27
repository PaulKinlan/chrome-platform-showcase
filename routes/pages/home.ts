import { platform } from "../../lib/platform.ts";
import type { Channels } from "../../lib/chromestatus.ts";
import { escapeHTML } from "../html.ts";
import { getDemoIndexData } from "./demo-index.ts";
import {
  channelTone,
  formatCommitLine,
  getLatestCommit,
  getMilestoneSchedule,
  renderSiteFooter,
  renderSiteHeader,
  stableDateRange,
} from "./layout.ts";

interface ReleaseEntry {
  mstone: number;
  status: string;
  stableRange: string;
  active: boolean;
}

const EXPLORE_LENSES: readonly {
  kicker: string;
  title: string;
  href: string;
  blurb: string;
}[] = [
  {
    kicker: "Index",
    title: "All Features",
    href: "/features",
    blurb:
      "Search every deduplicated feature across milestones and filter by live browser support.",
  },
  {
    kicker: "Taxonomy",
    title: "Browse by Category",
    href: "/categories/",
    blurb:
      "Identity & Auth, On-Device AI, CSS Layout, WebGPU, Privacy & Security, Media, and more.",
  },
  {
    kicker: "Lab",
    title: "Experiments",
    href: "/experiments/",
    blurb: "Canonical starters, boundary stress tests, and cross-API compositions with findings.",
  },
  {
    kicker: "Field Notes",
    title: "Friction Ledger",
    href: "/friction/",
    blurb: "Measured browser bugs, spec gaps, and platform limits discovered while building demos.",
  },
  {
    kicker: "Quality",
    title: "Self-Critique",
    href: "/critiques/",
    blurb: "Cold rubric reviews and open follow-up questions per concept, sorted weakest first.",
  },
  {
    kicker: "Verification",
    title: "Conformance Probes",
    href: "/conformance/run-all/",
    blurb: "Live spec-vs-implementation assertions executed directly in your current browser.",
  },
];

export async function renderIndex(channels: Channels): Promise<string> {
  const [commit, demoIndex] = await Promise.all([getLatestCommit(), getDemoIndexData()]);

  const countsByRelease = new Map<number, number>();
  for (const dir of Object.values(demoIndex.demos)) {
    const m = Number(dir.split("/")[0]?.replace(/^v/, ""));
    if (Number.isFinite(m)) {
      countsByRelease.set(m, (countsByRelease.get(m) ?? 0) + 1);
    }
  }
  const totalFeaturesCovered = Object.keys(demoIndex.demos).length;

  // Chromestatus's "stable.mstone" is the *next* stable cut, even when its
  // stable_date is still a few days away. Most users are on stable-1 until
  // the cut lands. Show that release too so the issue stream and the catalogue
  // line up with what's actually deployed.
  const prevStable = channels.stable.mstone - 1;
  const activeReleases: ReleaseEntry[] = [
    {
      mstone: channels.dev.mstone,
      status: "Dev",
      stableRange: stableDateRange(channels.dev),
      active: true,
    },
    {
      mstone: channels.beta.mstone,
      status: "Beta",
      stableRange: stableDateRange(channels.beta),
      active: true,
    },
    {
      mstone: channels.stable.mstone,
      status: "Rolling out",
      stableRange: stableDateRange(channels.stable),
      active: true,
    },
    {
      mstone: prevStable,
      status: "Stable (live)",
      stableRange: "",
      active: true,
    },
  ];

  // Surface older (and upcoming) releases that have v<N>/ folders too, so a
  // demo for another Chrome milestone never disappears from navigation.
  const seen = new Set(activeReleases.map((r) => r.mstone));
  const archivedReleases: ReleaseEntry[] = [];
  try {
    for await (const entry of platform().readDir(".")) {
      if (entry.isDirectory && /^v\d+$/.test(entry.name)) {
        const m = Number(entry.name.slice(1));
        if (!seen.has(m)) {
          archivedReleases.push({
            mstone: m,
            status: m > channels.dev.mstone ? "Upcoming" : "Archive",
            stableRange: "",
            active: false,
          });
          seen.add(m);
        }
      }
    }
  } catch {
    // ignore — some runtimes can refuse the readDir at root.
  }

  const allReleases = [...activeReleases, ...archivedReleases];
  await Promise.all(allReleases.map(async (release) => {
    if (release.stableRange) return;
    const schedule = await getMilestoneSchedule(release.mstone);
    if (schedule) release.stableRange = stableDateRange(schedule);
  }));

  activeReleases.sort((a, b) => b.mstone - a.mstone);
  archivedReleases.sort((a, b) => b.mstone - a.mstone);

  const activeCards = activeReleases.map((r) => {
    const tone = channelTone(r.status);
    const count = countsByRelease.get(r.mstone) ?? 0;
    const countLabel = count > 0
      ? `${count} canonical demo${count === 1 ? "" : "s"}`
      : "Live milestone listing";
    const note = r.stableRange
      ? `Stable: ${r.stableRange}`
      : r.status === "Stable (live)"
      ? "Most users are here"
      : "Schedule pending";
    return `<li class="channel-card">
      <a class="channel-card-link" href="/v${r.mstone}/">
        <span class="channel-card-top">
          <span class="channel-card-label">Chrome</span>
          <span class="channel-pill channel-pill-${escapeHTML(tone)}">${escapeHTML(r.status)}</span>
        </span>
        <span class="channel-card-num">${r.mstone}</span>
        <span class="channel-card-meta">
          <span class="channel-card-count">${escapeHTML(countLabel)}</span>
          <span>${escapeHTML(note)}</span>
        </span>
      </a>
    </li>`;
  }).join("");

  const hubCards = EXPLORE_LENSES.map((lens) =>
    `<li class="hub-card">
      <a class="hub-card-link" href="${escapeHTML(lens.href)}">
        <span class="hub-card-kicker">${escapeHTML(lens.kicker)}</span>
        <span class="hub-card-title">${escapeHTML(lens.title)} <span aria-hidden="true">&rarr;</span></span>
        <p class="hub-card-blurb">${escapeHTML(lens.blurb)}</p>
      </a>
    </li>`
  ).join("");

  const archiveCards = archivedReleases.map((r) => {
    const count = countsByRelease.get(r.mstone) ?? 0;
    const countText = count > 0 ? `${count} demos` : r.status;
    const dateText = r.stableRange || (r.status === "Upcoming" ? "Upcoming" : "Archived");
    return `<li class="archive-card">
      <a class="archive-card-link" href="/v${r.mstone}/">
        <span class="archive-card-head">
          <span class="archive-card-title">Chrome ${r.mstone}</span>
          <span class="archive-card-count">${escapeHTML(countText)}</span>
        </span>
        <span class="archive-card-date">${escapeHTML(dateText)}</span>
      </a>
    </li>`;
  }).join("");

  const heroKicker = totalFeaturesCovered > 0
    ? `${totalFeaturesCovered} features covered · ${allReleases.length} milestones`
    : `${allReleases.length} Chrome milestones`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Chrome Platform Showcase</title>
  <meta name="description" content="Interactive demos, experiments, friction notes, and live spec conformance probes for every web platform feature shipping in Chrome.">
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body class="shell-page">
  ${renderSiteHeader("releases")}
  <main id="main-content">
    <header class="lede-block home-hero">
      <div class="home-kicker-row">
        <p class="eyebrow">${escapeHTML(heroKicker)}</p>
        ${formatCommitLine(commit)}
      </div>
      <h1>Chrome Platform Showcase</h1>
      <p class="lede">Interactive demos for every web platform feature shipping in Chrome — canonical starters, boundary stress tests, cross-API compositions, and live browser conformance probes. Built continuously against ChromeStatus; reviewed and merged by humans.</p>
      <div class="home-actions">
        <a class="action-btn action-btn-primary" href="/features">Browse all features &rarr;</a>
        <a class="action-btn action-btn-secondary" href="/experiments/">Explore experiments</a>
        <a class="action-btn action-btn-secondary" href="/conformance/run-all/">Run conformance probes</a>
      </div>
    </header>

    <section aria-labelledby="active-channels-heading">
      <h2 id="active-channels-heading">Active channels <span class="section-kicker">Dev &middot; Beta &middot; Stable</span></h2>
      <ol class="channel-grid">${activeCards}</ol>
    </section>

    <section aria-labelledby="explore-heading">
      <h2 id="explore-heading">Explore the showcase <span class="section-kicker">6 views</span></h2>
      <ul class="hub-grid">${hubCards}</ul>
    </section>

    ${
    archivedReleases.length > 0
      ? `<section aria-labelledby="archive-heading">
      <h2 id="archive-heading">All other milestones <span class="section-kicker">${archivedReleases.length} releases</span></h2>
      <ol class="archive-grid">${archiveCards}</ol>
    </section>`
      : ""
  }

    <section aria-labelledby="how-heading">
      <h2 id="how-heading">How it works <span class="section-kicker">Colophon</span></h2>
      <div class="colophon-box">
        <ol class="colophon-steps">
          <li>Reads the <a href="https://chromestatus.com/" target="_blank" rel="noopener">ChromeStatus</a> JSON API for current, upcoming, and archived Chrome milestones.</li>
          <li>Builds every uncovered feature from its spec, explainer, docs, WPT tests, and Chromium implementation.</li>
          <li>Gives each API a feature hub plus distinct interactive concepts — canonical starters, stress tests, and cross-API compositions.</li>
          <li>Commits one feature at a time to <code>main</code>; Cloudflare Workers Builds deploys straight from GitHub.</li>
          <li>Automated browser verification, conformance suites, and human review keep demos working across desktop and mobile.</li>
        </ol>
        <p class="colophon-note">Source repository: <a href="https://github.com/PaulKinlan/chrome-platform-showcase" target="_blank" rel="noopener">PaulKinlan/chrome-platform-showcase</a>. Rollout ranges come from ChromeStatus and Chromium Dash.</p>
      </div>
    </section>

    ${renderSiteFooter()}
  </main>
</body>
</html>`;
}
