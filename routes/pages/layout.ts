import type { Channel, Channels } from "../../lib/chromestatus.ts";
import { escapeHTML } from "../html.ts";

const CHROMIUM_DASH_BASE = "https://chromiumdash.appspot.com";

export type ShellNavKey =
  | "releases"
  | "features"
  | "categories"
  | "experiments"
  | "friction"
  | "critiques"
  | "conformance";

const SHELL_NAV_ITEMS: readonly { key: ShellNavKey; label: string; href: string }[] = [
  { key: "releases", label: "Releases", href: "/" },
  { key: "features", label: "Features", href: "/features" },
  { key: "categories", label: "Categories", href: "/categories/" },
  { key: "experiments", label: "Experiments", href: "/experiments/" },
  { key: "friction", label: "Friction", href: "/friction/" },
  { key: "critiques", label: "Critiques", href: "/critiques/" },
  { key: "conformance", label: "Conformance", href: "/conformance/" },
];

export function renderSiteHeader(active?: ShellNavKey): string {
  const navLinks = SHELL_NAV_ITEMS.map((item) => {
    const isCurrent = item.key === active;
    return `<a class="site-nav-link${isCurrent ? " is-active" : ""}" href="${
      escapeHTML(item.href)
    }"${isCurrent ? ' aria-current="page"' : ""}>${escapeHTML(item.label)}</a>`;
  }).join("");

  return `<a class="skip-link" href="#main-content">Skip to main content</a>
  <header class="site-header">
    <div class="site-header-inner">
      <a class="site-brand" href="/">
        <span class="site-mark" aria-hidden="true">CP</span>
        <span class="site-wordmark">Chrome Platform Showcase</span>
      </a>
      <nav class="site-nav" aria-label="Primary">${navLinks}</nav>
    </div>
  </header>`;
}

export function renderSiteFooter(): string {
  return `<footer class="byline site-footer">
    <div class="site-footer-meta">
      <strong class="site-footer-title">Chrome Platform Showcase</strong>
      <span>Made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a> &middot; Data from <a href="https://chromestatus.com/" target="_blank" rel="noopener">ChromeStatus</a> &amp; <a href="https://chromiumdash.appspot.com/" target="_blank" rel="noopener">Chromium Dash</a></span>
    </div>
    <nav class="site-footer-links" aria-label="Footer">
      <a href="/features">Catalogue</a>
      <a href="/categories/">Categories</a>
      <a href="/experiments/">Experiments</a>
      <a href="/friction/">Friction</a>
      <a href="/conformance/run-all/">Conformance</a>
      <a href="https://github.com/PaulKinlan/chrome-platform-showcase" target="_blank" rel="noopener">GitHub &nearr;</a>
    </nav>
  </footer>`;
}

export const BYLINE_FOOTER = renderSiteFooter();

export function channelTone(status: string): string {
  const s = status.toLowerCase();
  if (s === "dev" || s === "upcoming") return "dev";
  if (s === "beta") return "beta";
  if (s.includes("rolling")) return "rolling";
  if (s.startsWith("stable")) return "stable";
  return "archive";
}

export interface CommitInfo {
  sha: string;
  shortSha: string;
  date: string;
  htmlUrl: string;
}

const COMMIT_TTL_MS = 5 * 60 * 1000;
let commitCache: { at: number; value: CommitInfo | null } | null = null;

export async function getLatestCommit(): Promise<CommitInfo | null> {
  if (commitCache && Date.now() - commitCache.at < COMMIT_TTL_MS) return commitCache.value;
  try {
    const res = await fetch(
      "https://api.github.com/repos/PaulKinlan/chrome-platform-showcase/commits/main",
      // GitHub rejects requests without a User-Agent. Cloudflare Workers does
      // not send one by default.
      {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "chrome-platform-showcase",
        },
      },
    );
    if (!res.ok) {
      commitCache = { at: Date.now(), value: null };
      return null;
    }
    const data = await res.json();
    const value: CommitInfo = {
      sha: data.sha,
      shortSha: String(data.sha).slice(0, 7),
      date: data.commit?.author?.date ?? data.commit?.committer?.date ?? "",
      htmlUrl: data.html_url,
    };
    commitCache = { at: Date.now(), value };
    return value;
  } catch {
    return null;
  }
}

export function formatCommitLine(c: CommitInfo | null): string {
  if (!c) return "";
  const when = c.date ? new Date(c.date) : null;
  const relative = when ? relativeTime(when) : "";
  const absolute = when
    ? when.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
    : "";
  return `<p class="updated-line">Last updated ${escapeHTML(relative)} <span class="updated-abs">(${
    escapeHTML(absolute)
  })</span> &middot; commit <a href="${
    escapeHTML(c.htmlUrl)
  }" target="_blank" rel="noopener"><code>${escapeHTML(c.shortSha)}</code></a></p>`;
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

// ----- Milestone schedule info (fetched from Chromium Dash, cached for 1 hour) -----

export interface MilestoneSchedule {
  mstone: number;
  stable_date?: string;
  late_stable_date?: string;
  stable_refresh_first?: string;
}

interface MilestoneScheduleResponse {
  mstones?: MilestoneSchedule[];
}

const MILESTONE_SCHEDULE_TTL_MS = 60 * 60 * 1000;
const milestoneScheduleCache = new Map<number, {
  at: number;
  value: MilestoneSchedule | null;
}>();

export async function getMilestoneSchedule(milestone: number): Promise<MilestoneSchedule | null> {
  const hit = milestoneScheduleCache.get(milestone);
  if (hit && Date.now() - hit.at < MILESTONE_SCHEDULE_TTL_MS) return hit.value;

  try {
    const url = new URL("/fetch_milestone_schedule", CHROMIUM_DASH_BASE);
    url.searchParams.set("mstone", String(milestone));
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`chromiumdash ${milestone} returned ${res.status}`);
    const data = await res.json() as MilestoneScheduleResponse;
    const value = data.mstones?.find((m) => m.mstone === milestone) ?? null;
    milestoneScheduleCache.set(milestone, { at: Date.now(), value });
    return value;
  } catch {
    milestoneScheduleCache.set(milestone, { at: Date.now(), value: null });
    return null;
  }
}

// ----- Shared status badges & formatters -----

export function statusBadgeFor(channels: Channels, milestone: number): string {
  if (milestone === channels.stable.mstone) return "Stable";
  if (milestone === channels.beta.mstone) return "Beta";
  if (milestone === channels.dev.mstone) return "Dev";
  if (milestone < channels.stable.mstone) return "Released";
  return "Upcoming";
}

function parseDate(date: string | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function datePart(date: Date, part: "day" | "month" | "year"): string {
  if (part === "month") return date.toLocaleDateString("en-GB", { month: "short" });
  return date.toLocaleDateString("en-GB", { [part]: "numeric" });
}

function stableDateRangeFromDates(
  stableDate: string | undefined,
  finalStableDate: string | undefined,
): string {
  const start = parseDate(stableDate);
  if (!start) return "";
  const end = parseDate(finalStableDate);
  if (!end || end.getTime() === start.getTime()) {
    return start.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const startYear = datePart(start, "year");
  const endYear = datePart(end, "year");
  const startMonth = datePart(start, "month");
  const endMonth = datePart(end, "month");
  const startDay = datePart(start, "day");
  const endDay = datePart(end, "day");

  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay}-${endDay} ${endMonth} ${endYear}`;
  }
  if (startYear === endYear) {
    return `${startDay} ${startMonth}-${endDay} ${endMonth} ${endYear}`;
  }
  return `${startDay} ${startMonth} ${startYear}-${endDay} ${endMonth} ${endYear}`;
}

export function stableDateRange(channel: Channel | MilestoneSchedule): string {
  return stableDateRangeFromDates(
    channel.stable_date,
    channel.late_stable_date ?? channel.stable_refresh_first,
  );
}

export function categoryTag(category: string): string {
  // Compress some of the chromestatus category names into something readable.
  const short = category
    .replace("In developer trial (Behind a flag)", "Dev Trial")
    .replace("Enabled by default", "Shipped")
    .replace("Origin trial", "Origin Trial")
    .replace("Stepped rollout", "Stepped rollout")
    .replace("Browser Intervention", "Intervention");
  return short;
}
