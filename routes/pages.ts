import { renderBreadcrumbs } from "../lib/breadcrumbs.ts";
import { chromeStatusUrl, getMilestoneFeatures, slugify } from "../lib/chromestatus.ts";
import type { Channel, Channels, FeatureSummary, MilestoneFeatures } from "../lib/chromestatus.ts";
import { escapeHTML } from "./html.ts";

const CHROMIUM_DASH_BASE = "https://chromiumdash.appspot.com";

interface CommitInfo {
  sha: string;
  shortSha: string;
  date: string;
  htmlUrl: string;
}

const COMMIT_TTL_MS = 5 * 60 * 1000;
let commitCache: { at: number; value: CommitInfo | null } | null = null;

async function getLatestCommit(): Promise<CommitInfo | null> {
  if (commitCache && Date.now() - commitCache.at < COMMIT_TTL_MS) return commitCache.value;
  try {
    const res = await fetch(
      "https://api.github.com/repos/PaulKinlan/chrome-platform-showcase/commits/main",
      { headers: { accept: "application/vnd.github+json" } },
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

function formatCommitLine(c: CommitInfo | null): string {
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

interface MilestoneSchedule {
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

async function getMilestoneSchedule(milestone: number): Promise<MilestoneSchedule | null> {
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

// ----- Page rendering -----

function statusBadgeFor(channels: Channels, milestone: number): string {
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

function stableDateRange(channel: Channel | MilestoneSchedule): string {
  return stableDateRangeFromDates(
    channel.stable_date,
    channel.late_stable_date ?? channel.stable_refresh_first,
  );
}

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
    for await (const entry of Deno.readDir(".")) {
      if (entry.isDirectory && /^v\d+$/.test(entry.name)) {
        const m = Number(entry.name.slice(1));
        if (!seen.has(m)) {
          releases.push({ mstone: m, status: "Archive", stableRange: "" });
          seen.add(m);
        }
      }
    }
  } catch {
    // ignore — Deno Deploy can refuse the readDir at root in some isolates.
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
      <p class="lede">A premium, hand-crafted demo for every new web platform feature shipping in Chrome. One per API. One uber-demo per release. Maintained by an automated routine; reviewed and merged by humans.</p>
      ${formatCommitLine(commit)}
    </header>

    <section>
      <h2>releases</h2>
      <ol class="release-list">${cards}</ol>
      <p class="note">Or jump straight to <a href="/features">the full feature catalogue</a>, <a href="/categories/">browse by category</a> (identity, on-device AI, CSS layout, WebGPU, privacy…), the <a href="/critiques/">self-critique</a> (a reviewer agent's open-questions list per concept), or run the <a href="/conformance/">conformance probes</a> in your browser (live pass/fail against the spec). Release cards show stable rollout ranges from ChromeStatus and Chromium Dash schedules when available.</p>
    </section>

    <section class="how">
      <h2>how it works</h2>
      <ol>
        <li>The routine reads the <a href="https://chromestatus.com/" target="_blank" rel="noopener">chromestatus.com</a> JSON API for current, upcoming, and archived milestones.</li>
        <li>It builds every missing feature directly from the listing name, feature details, specs, docs, samples, and explainers.</li>
        <li>Each feature gets a feature index plus every distinct interactive concept the API needs; 2-3 concepts is a floor, not a cap.</li>
        <li>The routine commits one feature at a time to <code>main</code>. Deno Deploy redeploys from GitHub.</li>
        <li>Humans review the live output and tighten demos, server routes, and the routine prompt as needed.</li>
      </ol>
      <p class="note">Repo: <a href="https://github.com/PaulKinlan/chrome-platform-showcase" target="_blank" rel="noopener">PaulKinlan/chrome-platform-showcase</a>.</p>
    </section>

    <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
  </main>
</body>
</html>`;
}

// ----- Categories taxonomy -----
//
// A thematic grouping over features that's coarser than chromestatus's own
// category field. The goal is to let visitors browse by interest area (identity
// & auth, CSS layout, WebGPU, etc.) rather than by chromestatus's own
// engineering-team bucketing.
//
// Per-feature primary category is derived by keyword match against the feature
// name and (as a fallback) the chromestatus category. The first matching
// taxonomy entry wins, so ordering matters: put more specific rules first.

interface Category {
  slug: string;
  label: string;
  blurb: string;
  patterns: RegExp[];
}

const CATEGORIES: Category[] = [
  {
    slug: "identity-and-auth",
    label: "Identity & Auth",
    blurb:
      "Passkeys, WebAuthn, FedCM, Digital Credentials, autofill, payment confirmation, sign-in flows.",
    patterns: [
      /webauthn/i,
      /passkey/i,
      /fedcm/i,
      /\bdbsc\b/i,
      /device.bound.session/i,
      /\bcredential\b/i,
      /autofill/i,
      /publickeycredential/i,
      /payment.confirmation/i,
      /\bspc\b/i,
      /digital.credential/i,
      /email.verification/i,
      /web.install/i,
      /facilitated.payment/i,
      /identity/i,
      /storage.access/i,
      /related.website.set/i,
      /requeststorageaccessfor/i,
    ],
  },
  {
    slug: "on-device-ai",
    label: "On-device AI",
    blurb:
      "Prompt API, Summariser, Translator, Language Detector, Proofreader, Writer, Rewriter, on-device speech.",
    patterns: [
      /prompt.api/i,
      /summari[sz]er/i,
      /translator/i,
      /language.detector/i,
      /proofreader/i,
      /\bwriter.api/i,
      /\brewriter.api/i,
      /language.model/i,
      /on.device/i,
      /web.speech/i,
      /webnn/i,
      /abusive.notif/i,
    ],
  },
  {
    slug: "css-layout",
    label: "CSS Layout",
    blurb:
      "Anchor positioning, container queries, scroll-state, view transitions, reading-flow, focusgroup, carousels.",
    patterns: [
      /anchor.positioning/i,
      /anchor.scope/i,
      /\banchor-size\b/i,
      /container.quer/i,
      /container.name/i,
      /scroll.state/i,
      /scroll.target.group/i,
      /scroll.button/i,
      /scroll.marker/i,
      /scroll.triggered/i,
      /overscroll/i,
      /reading.flow/i,
      /reading.order/i,
      /focusgroup/i,
      /carousel/i,
      /flex.wrap/i,
      /flex.basis/i,
      /grid/i,
      /sideways.writing/i,
      /logical.overflow/i,
      /page.margin.box/i,
      /\b@page\b/i,
    ],
  },
  {
    slug: "css-typography",
    label: "CSS Typography",
    blurb:
      "Text wrap, text-box-trim, font-feature/variation, ruby, font-language-override, font-variant-emoji, line decorations.",
    patterns: [
      /text.wrap/i,
      /text.box/i,
      /font.feature/i,
      /font.variation/i,
      /font.language/i,
      /font.variant.emoji/i,
      /\bruby\b/i,
      /letter.spacing/i,
      /text.decoration/i,
      /text.size.adjust/i,
      /h1.within/i,
      /cursive.scripts/i,
      /textmetrics/i,
      /opentype/i,
      /open.font.format/i,
    ],
  },
  {
    slug: "css-visual",
    label: "CSS Visual",
    blurb:
      "Corner-shape, colour functions, dynamic-range-limit, accent-color, caret-, paint, image, table borders.",
    patterns: [
      /corner.shap/i,
      /squircle/i,
      /superellipse/i,
      /dynamic.range/i,
      /accent.color/i,
      /accentcolor/i,
      /\bcaret\b/i,
      /\b::view-transition/i,
      /currentcolor/i,
      /print.color/i,
      /background.position/i,
      /background.clip/i,
      /box.decoration.break/i,
      /image.rendering/i,
      /smoothing/i,
      /color.fn/i,
      /relative.alpha/i,
      /css.image.color/i,
      /light.dark/i,
      /border.color/i,
      /clip.text/i,
    ],
  },
  {
    slug: "css-functions",
    label: "CSS Functions & Syntax",
    blurb:
      "if(), attr(), counter, sibling-index, custom @function, nesting, @supports/at-rule(), @property, shape(), progress().",
    patterns: [
      /css.if/i,
      /attr\(/i,
      /\bcounter\b/i,
      /sibling.index/i,
      /custom.function/i,
      /custom.functions/i,
      /nesting/i,
      /supports/i,
      /at.rule/i,
      /\b@property\b/i,
      /property.support/i,
      /shape\b.*function/i,
      /progress\(/i,
      /typed.arithmetic/i,
      /sign.related/i,
      /short.circuit/i,
      /name.only/i,
      /comma.separated.container/i,
      /declarative.css.module/i,
      /raw.string/i,
      /style.container/i,
      /named.feature.function/i,
    ],
  },
  {
    slug: "forms-and-input",
    label: "Forms & Input",
    blurb:
      "Customizable <select>, popover, dialog, autofill event, focusgroup, interestfor, invoker commands, keyboard input.",
    patterns: [
      /\bselect\b/i,
      /selectedcontent/i,
      /popover/i,
      /dialog/i,
      /invoker/i,
      /\binterestfor\b/i,
      /\bcommand\b/i,
      /\bhint\b/i,
      /pointer.lock/i,
      /pointer.event/i,
      /pointerrawupdate/i,
      /keyboard/i,
      /virtual.keyboard/i,
      /mouseup/i,
      /click/i,
      /aria/i,
      /focus/i,
      /selection/i,
      /ime/i,
      /editcontext/i,
      /content.editable/i,
      /textarea/i,
      /opaquerange/i,
      /input.event/i,
      /event.handler/i,
      /gamepad/i,
      /spellcheck/i,
      /spelling/i,
    ],
  },
  {
    slug: "privacy-and-security",
    label: "Privacy & Security",
    blurb:
      "CSP, COOP, Document-Isolation-Policy, Local Network Access, partitioning, signature integrity, sandboxing, removals of legacy attack surface.",
    patterns: [
      /\bcsp\b/i,
      /content.security.policy/i,
      /coop\b/i,
      /coep\b/i,
      /document.isolation/i,
      /local.network/i,
      /attribution.report/i,
      /partition/i,
      /\bhsts\b/i,
      /strict.transport/i,
      /private.aggregation/i,
      /shared.storage/i,
      /protected.audience/i,
      /\bpst\b/i,
      /private.state.token/i,
      /\bfenced/i,
      /signature.based.integrity/i,
      /integrity.policy/i,
      /\bsri\b/i,
      /sandboxed/i,
      /isolation/i,
      /noopener/i,
      /allowlist/i,
      /permissions.policy/i,
      /xslt/i,
      /xxe/i,
      /externally.loaded.entities/i,
      /xss/i,
      /clickjack/i,
      /bounce.tracking/i,
      /document.policy/i,
      /visited.links/i,
      /opaque.origin/i,
      /noopener.allow.popups/i,
      /event.interfaces/i,
      /sub.resource.integrity/i,
      /report.to/i,
      /reporting/i,
      /crash.reporting/i,
      /connection.allowlist/i,
      /focus.without.user.activation/i,
      /agentic.federated/i,
    ],
  },
  {
    slug: "webgpu",
    label: "WebGPU",
    blurb:
      "Adapters, devices, textures, buffers, WGSL features, subgroups, dual-source blending, compatibility mode.",
    patterns: [
      /webgpu/i,
      /\bgpu\w*/i,
      /\bwgsl\b/i,
      /subgroup/i,
      /clip.distance/i,
      /uniform.buffer/i,
      /vertex.format/i,
      /texture.compress/i,
      /dual.source/i,
      /externaltexture/i,
      /copybuffer/i,
      /linear.indexing/i,
      /maxinterstage/i,
      /compatibility.mode/i,
      /core.features/i,
      /primitive.index/i,
    ],
  },
  {
    slug: "webassembly",
    label: "WebAssembly",
    blurb: "Wasm features: memory64, branch hints, JSPI, JS String Builtins, custom descriptors.",
    patterns: [
      /webassembly/i,
      /\bwasm\b/i,
      /jspi/i,
      /js.promise.integration/i,
      /custom.descriptors/i,
      /memory64/i,
      /branch.hints/i,
      /js.string.builtins/i,
    ],
  },
  {
    slug: "workers-and-runtime",
    label: "Workers & Runtime",
    blurb:
      "SharedWorker, Dedicated Workers, Service Workers, scheduling, freeze/resume lifecycle, runtime extras.",
    patterns: [
      /sharedworker/i,
      /shared.worker/i,
      /service.worker/i,
      /dedicated.workers?/i,
      /workers?(?!.let|.tablet)/i,
      /scheduler/i,
      /scheduling/i,
      /\bfreez/i,
      /resume/i,
      /background.freeze/i,
      /energy.saver/i,
      /static.router/i,
      /autopreload/i,
      /atomics/i,
      /\bset(interval|timeout)\b/i,
      /explicit.resource.management/i,
      /await.using/i,
      /\busing\b/i,
      /import.maps/i,
      /js.profiling/i,
      /v8.profiler/i,
      /inline.script.cache/i,
      /compile.hints/i,
      /platform.provided.behavior/i,
      /element.internals/i,
      /element.reflection/i,
      /element.scoped/i,
      /element.capture/i,
    ],
  },
  {
    slug: "media-and-realtime",
    label: "Media & Realtime",
    blurb:
      "WebRTC, MediaStream, getDisplayMedia, MediaSession, WebCodecs, MediaRecorder, captured surface, PiP, Speech API.",
    patterns: [
      /webrtc/i,
      /\brtc\b/i,
      /mediastream/i,
      /getdisplaymedia/i,
      /mediasession/i,
      /webcodecs/i,
      /mediarecorder/i,
      /captured.surface/i,
      /picture.in.picture/i,
      /\bpip\b/i,
      /videoframe/i,
      /audio.level/i,
      /audio.context/i,
      /audio.output/i,
      /webaudio/i,
      /audio.worklet/i,
      /h26/i,
      /\bhevc\b/i,
      /h265/i,
      /restrictown/i,
      /windowaudio/i,
      /capabilit.*usermedia/i,
      /usermedia/i,
      /encoded.transform/i,
      /encoded.frame/i,
      /rtp/i,
      /rtcdegradation/i,
      /track.processor/i,
      /webxr/i,
      /xrvisibilit/i,
      /immersive/i,
      /xr/i,
      /captured.pointer/i,
      /facilitated/i,
      /scaleresolution/i,
      /echo.cancellation/i,
    ],
  },
  {
    slug: "storage-and-files",
    label: "Storage & Files",
    blurb:
      "IndexedDB, OPFS, FileSystemObserver, quota, Clipboard, ClipboardItem, blob, file pickers.",
    patterns: [
      /indexeddb/i,
      /\bidb\b/i,
      /storage.quota/i,
      /quota/i,
      /opfs/i,
      /filesystem/i,
      /file.system.access/i,
      /file.system.observer/i,
      /file.api/i,
      /clipboard/i,
      /\bblob\b/i,
      /readablestream/i,
      /writablestream/i,
      /upsert/i,
      /\bclear.site.data/i,
      /persistent/i,
      /storage.access.headers/i,
    ],
  },
  {
    slug: "network-and-loading",
    label: "Network & Loading",
    blurb:
      "Fetch, HTTP cache, No-Vary-Search, Speculation Rules, prerendering, prefetch, sec-purpose, WebTransport, sockets, Smart Card.",
    patterns: [
      /fetch.retry/i,
      /fetch.later/i,
      /fetchlater/i,
      /\bfetch\b/i,
      /no.vary.search/i,
      /speculation.rules/i,
      /prerender/i,
      /prefetch/i,
      /sec.purpose/i,
      /websocket/i,
      /webtransport/i,
      /\btcp\b/i,
      /direct.socket/i,
      /multicast/i,
      /smart.card/i,
      /serial/i,
      /hid/i,
      /\busb\b/i,
      /bluetooth/i,
      /\bhttp\b/i,
      /cookie/i,
      /compression.dictionary/i,
      /shared.brotli/i,
      /shared.zstandard/i,
      /referrer.policy/i,
      /cors/i,
      /cache/i,
      /pervasive/i,
      /preload/i,
      /interest.group/i,
    ],
  },
  {
    slug: "performance-and-timing",
    label: "Performance & Timing",
    blurb:
      "Long Animation Frames, Event Timing, Soft Navigation, render-blocking, freeze, CPU performance, bimodal timings.",
    patterns: [
      /long.animation.frame/i,
      /event.timing/i,
      /soft.navigation/i,
      /interaction.count/i,
      /performance.event/i,
      /performance.api/i,
      /performance.observer/i,
      /render.blocking/i,
      /render.quantum/i,
      /\bfreeze/i,
      /cpu.performance/i,
      /bimodal/i,
      /render.time/i,
      /resource.timing/i,
      /first.response.headers/i,
      /container.timing/i,
      /content.type.in.resource/i,
      /performance.timing/i,
      /preload/i,
      /perf/i,
      /priority/i,
    ],
  },
  {
    slug: "dom-and-interop",
    label: "DOM & Interop",
    blurb:
      "DOM mutation, ranges, parser, navigation API, streaming, Observable, Atomics, async iterators, Intl, Temporal.",
    patterns: [
      /dom/i,
      /document/i,
      /range/i,
      /selection/i,
      /processing.instruction/i,
      /parse.processing/i,
      /streaming/i,
      /html.insertion/i,
      /html.in.canvas/i,
      /observable/i,
      /error.is.error/i,
      /promise/i,
      /\btemporal\b/i,
      /intl\b/i,
      /unicode/i,
      /\bicu\b/i,
      /mirroring/i,
      /idn[a]?/i,
      /relaunch/i,
      /\bxml\b/i,
      /event/i,
      /navigateevent/i,
      /navigation.api/i,
      /\bnavigation\b/i,
      /toggleevent/i,
      /\bdetails/i,
      /hidden.until.found/i,
      /reveal/i,
      /tab.navigation/i,
      /float16/i,
      /uint8array/i,
      /regexp/i,
      /encoding/i,
      /document.subtitle/i,
      /quotaexceeded/i,
      /domexception/i,
      /clonable/i,
      /clone.into/i,
      /selectedcontent/i,
      /shadow.dom/i,
      /shadow.root/i,
      /reference.target/i,
      /aria.element/i,
      /move.before/i,
      /state.preserving/i,
      /idna/i,
      /css.module/i,
      /declarative.css/i,
    ],
  },
  {
    slug: "view-transitions",
    label: "View Transitions",
    blurb:
      "View Transitions API: nested groups, element-scoped, waitUntil, pseudos, finished promise.",
    patterns: [
      /view.transition/i,
      /::view-transition/i,
      /activeviewtransition/i,
      /viewtransition/i,
    ],
  },
  {
    slug: "pwa-and-installability",
    label: "PWA & Installability",
    blurb:
      "Web App Manifest, install elements, scope extensions, Controlled Frame, Isolated Web Apps, window-drag, unframed mode.",
    patterns: [
      /\bpwa\b/i,
      /web.app/i,
      /manifest/i,
      /install.element/i,
      /install.api/i,
      /scope.extensions/i,
      /scope_extensions/i,
      /controlled.frame/i,
      /isolated.web.app/i,
      /unframed/i,
      /window.drag/i,
      /window.controls/i,
      /borderless/i,
      /capture/i,
      /related.apps/i,
      /sub.title/i,
      /document.subtitle/i,
      /related.application/i,
      /user.navigation.capturing/i,
      /origin.migration/i,
    ],
  },
  {
    slug: "removals-and-deprecations",
    label: "Removals & Deprecations",
    blurb:
      "Features the platform is phasing out: deprecated APIs, removed legacy behaviours, paired with replacement guidance.",
    patterns: [
      /deprecat/i,
      /\bremove\b/i,
      /removal/i,
      /removes/i,
      /legacy/i,
      /retire/i,
    ],
  },
  {
    slug: "miscellaneous",
    label: "Miscellaneous",
    blurb: "Features that don't fit a single theme — interop fixes, platform hygiene, niche APIs.",
    patterns: [/.*/i],
  },
];

function slugifyCategory(slug: string): string {
  return slug;
}

function categoryForFeature(name: string, fallbackCategory: string): Category {
  const haystack = `${name} ${fallbackCategory}`;
  for (const cat of CATEGORIES) {
    for (const p of cat.patterns) {
      if (p.test(name)) return cat;
    }
  }
  for (const cat of CATEGORIES) {
    for (const p of cat.patterns) {
      if (p.test(haystack)) return cat;
    }
  }
  // Final fallback — should be unreachable because Misc matches /.*/.
  return CATEGORIES[CATEGORIES.length - 1];
}

function categoryTag(category: string): string {
  // Compress some of the chromestatus category names into something readable.
  const short = category
    .replace("In developer trial (Behind a flag)", "Dev Trial")
    .replace("Enabled by default", "Shipped")
    .replace("Origin trial", "Origin Trial")
    .replace("Stepped rollout", "Stepped rollout")
    .replace("Browser Intervention", "Intervention");
  return short;
}

async function featureHasDemo(release: string, feature: FeatureSummary): Promise<boolean> {
  // A feature is "built" once its folder index page exists. The feature index
  // is what the routine writes after each concept page is in place.
  try {
    await Deno.stat(`./${release}/${slugify(feature.name)}/index.html`);
    return true;
  } catch {
    return false;
  }
}

async function releaseHasUberDemo(release: string): Promise<boolean> {
  try {
    await Deno.stat(`./${release}/uber-demo/index.html`);
    return true;
  } catch {
    return false;
  }
}

export async function renderReleasePage(
  release: string,
  milestone: number,
  channels: Channels,
  origin: string,
): Promise<string> {
  let features: MilestoneFeatures;
  try {
    features = await getMilestoneFeatures(milestone);
  } catch (err) {
    return `<!doctype html><html><body><main><h1>Chrome ${milestone}</h1><p>Could not load features: ${
      escapeHTML(String(err))
    }</p></main></body></html>`;
  }

  const status = statusBadgeFor(channels, milestone);
  const breadcrumbs = renderBreadcrumbs([
    { name: "Chrome platform showcase", path: "/" },
    { name: `Chrome ${milestone}`, path: `/${release}/` },
  ], origin);
  const hasUberDemo = await releaseHasUberDemo(release);
  const sections = await Promise.all(features.groups.map(async (group) => {
    const cards = await Promise.all(group.features.map(async (f) => {
      const hasDemo = await featureHasDemo(release, f);
      const slug = slugify(f.name);
      const summary = (f.summary ?? "").slice(0, 220);
      const demoUrl = `/${release}/${slug}/`;
      // Title links to the demo when one exists (the thing you actually want to
      // open); otherwise fall back to the ChromeStatus entry. ChromeStatus is
      // always reachable via the button in the tags row.
      const titleHref = hasDemo ? demoUrl : chromeStatusUrl(f.id);
      return `<li class="demo-card">
        <h3><a href="${titleHref}"${hasDemo ? "" : ' target="_blank" rel="noopener"'}>${
        escapeHTML(f.name)
      }</a></h3>
        <p>${escapeHTML(summary)}${summary.length === 220 ? "..." : ""}</p>
        <div class="demo-tags">
          <span class="tag">${escapeHTML(categoryTag(group.category))}</span>
          <a class="tag tag-chromestatus" href="${
        chromeStatusUrl(f.id)
      }" target="_blank" rel="noopener">ChromeStatus &nearr;</a>
          ${
        hasDemo
          ? `<a class="tag tag-live" href="${demoUrl}">demo &rarr;</a>`
          : `<span class="tag tag-pending">demo pending</span>`
      }
        </div>
      </li>`;
    }));
    return `<section>
      <h3 class="group-title">${
      escapeHTML(categoryTag(group.category))
    } <span class="group-count">(${group.features.length})</span></h3>
      <ol class="demo-list">${cards.join("")}</ol>
    </section>`;
  }));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>chrome ${milestone} demos — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  ${breadcrumbs.canonical}
  ${breadcrumbs.structuredData}
</head>
<body>
<main>
  ${breadcrumbs.navigation}

  <header class="lede-block">
    <p class="eyebrow">chrome ${milestone} · ${escapeHTML(status.toLowerCase())}</p>
    <h1>chrome ${milestone} platform demos</h1>
    <p class="lede">${features.total} features tracked for Chrome ${milestone}. Click a feature's title to open its demo; each card also links to its ChromeStatus entry. A single "uber" demo per release combines several APIs into one larger experience.</p>
  </header>

  <section>
    <h2>uber demo</h2>
    ${
    hasUberDemo
      ? `<p><a class="tag tag-live" href="/${release}/uber-demo/">open the Chrome ${milestone} uber demo &rarr;</a></p>`
      : `<p><span class="tag tag-pending">uber demo pending</span> The release-level experience will live at <code>/${release}/uber-demo/</code>.</p>`
  }
    <p>Per-feature demos below are built automatically, one feature per commit, and every distinct use case should become an interactive concept page.</p>
  </section>

  <section>
    <h2>features (${features.total})</h2>
    ${sections.join("\n")}
  </section>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

// ----- /features (flat, filterable catalogue) -----

export async function renderFeaturesCatalogue(channels: Channels): Promise<string> {
  const known = [...await knownReleaseMilestones(channels)].sort((a, b) => b - a);

  type Row = {
    mstone: number;
    id: number;
    name: string;
    summary: string;
    category: string;
    hasDemo: boolean;
  };

  const rows: Row[] = [];
  for (const m of known) {
    try {
      const feats = await getMilestoneFeatures(m);
      for (const g of feats.groups) {
        for (const f of g.features) {
          const hasDemo = await featureHasDemo(`v${m}`, f);
          // The catalogue is the index of what's actually been built. Pending
          // features still appear on the per-release pages.
          if (!hasDemo) continue;
          rows.push({
            mstone: m,
            id: f.id,
            name: f.name,
            summary: f.summary ?? "",
            category: g.category,
            hasDemo,
          });
        }
      }
    } catch {
      // skip milestones we can't fetch
    }
  }

  const tableRows = rows.map((r) => {
    const slug = slugify(r.name);
    const cat = categoryTag(r.category);
    const demoCell = r.hasDemo
      ? `<a class="tag tag-live" href="/v${r.mstone}/${slug}/">demo &rarr;</a>`
      : `<span class="tag tag-pending">pending</span>`;
    const search = `${r.name} ${r.summary} ${cat} v${r.mstone}`.toLowerCase();
    return `<tr data-search="${escapeHTML(search)}" data-mstone="${r.mstone}" data-status="${
      escapeHTML(cat)
    }" data-built="${r.hasDemo}">
      <td><a href="${
      r.hasDemo ? `/v${r.mstone}/${slug}/` : `https://chromestatus.com/feature/${r.id}`
    }"${r.hasDemo ? "" : ' target="_blank" rel="noopener"'}>${escapeHTML(r.name)}</a></td>
      <td><span class="release-status">v${r.mstone}</span></td>
      <td><span class="tag">${escapeHTML(cat)}</span></td>
      <td>
        <a class="tag tag-chromestatus" href="https://chromestatus.com/feature/${r.id}" target="_blank" rel="noopener">ChromeStatus &nearr;</a>
        ${demoCell}
      </td>
    </tr>`;
  }).join("");

  const mstoneOptions = known.map((m) => `<option value="${m}">v${m}</option>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>all features — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1100px; }
    .filters {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin: 1rem 0 1.5rem;
      padding: 1rem;
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--thin-shadow);
    }
    .filters input, .filters select {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      padding: 0.45rem 0.6rem;
      background: var(--bg-paper);
      color: var(--text-black);
      border: 2px solid var(--border-black);
      outline: none;
    }
    .filters input:focus { box-shadow: var(--thin-shadow); }
    .filters input[type=search] { flex: 1; min-width: 160px; }
    .features-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .features-table th, .features-table td { padding: 0.6rem 0.6rem; text-align: left; border-bottom: 1px solid var(--border-black); vertical-align: top; }
    .features-table th {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
      background: var(--bg-stone);
    }
    .features-table tr.hidden { display: none; }
    .features-table td a { color: var(--text-black); text-decoration: underline; text-underline-offset: 3px; }
    .features-table td a:hover { color: var(--accent-blue); }
    .features-table td .tag, .features-table td .release-status { font-family: var(--font-mono); }
    .features-table td .release-status { background: var(--text-black); color: var(--bg-ivory); padding: 0.15rem 0.5rem; font-size: 0.75rem; }
    .stats { font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; }

    @media (max-width: 640px) {
      main { padding-left: var(--space-4); padding-right: var(--space-4); }
      .features-table thead { display: none; }
      .features-table, .features-table tbody, .features-table tr, .features-table td {
        display: block;
        width: 100%;
      }
      .features-table tr {
        border: 2px solid var(--border-black);
        background: var(--bg-paper);
        margin-bottom: var(--space-3);
        padding: var(--space-3);
        box-shadow: var(--thin-shadow);
      }
      .features-table td {
        border: none;
        padding: 0.25rem 0;
      }
      .features-table td:first-child { font-weight: 600; padding-bottom: var(--space-2); }
      .features-table td:not(:first-child) {
        display: inline-block;
        margin-right: var(--space-2);
      }
      .filters { padding: var(--space-3); gap: var(--space-2); }
      .filters input, .filters select { flex: 1 1 100%; min-width: 0; }
    }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>

  <header class="lede-block">
    <p class="eyebrow">catalogue</p>
    <h1>all features</h1>
    <p class="lede">Every feature with a demo available, across every milestone. Filter by name, milestone, or status. Pending features still show up on the per-release pages.</p>
  </header>

  <div class="filters">
    <input type="search" id="q" placeholder="search by name, summary, category">
    <select id="mstone">
      <option value="">all milestones</option>
      ${mstoneOptions}
    </select>
    <select id="status">
      <option value="">any status</option>
      <option value="Shipped">Shipped</option>
      <option value="Origin Trial">Origin Trial</option>
      <option value="Dev Trial">Dev Trial</option>
      <option value="Stepped rollout">Stepped rollout</option>
    </select>
  </div>

  <p class="stats"><span id="visible">${rows.length}</span> / ${rows.length} demos</p>

  <table class="features-table">
    <thead>
      <tr><th>feature</th><th>milestone</th><th>status</th><th>demo</th></tr>
    </thead>
    <tbody id="rows">${tableRows}</tbody>
  </table>

  <script>
    const q = document.getElementById('q');
    const mstone = document.getElementById('mstone');
    const status = document.getElementById('status');
    const rows = document.querySelectorAll('#rows tr');
    const visible = document.getElementById('visible');

    function applyFilter() {
      const qv = q.value.toLowerCase().trim();
      const mv = mstone.value;
      const sv = status.value;
      let count = 0;
      for (const row of rows) {
        const search = row.dataset.search;
        const okq = !qv || search.includes(qv);
        const okm = !mv || row.dataset.mstone === mv;
        const oks = !sv || row.dataset.status === sv;
        const show = okq && okm && oks;
        row.classList.toggle('hidden', !show);
        if (show) count++;
      }
      visible.textContent = count;
    }

    q.addEventListener('input', applyFilter);
    mstone.addEventListener('change', applyFilter);
    status.addEventListener('change', applyFilter);
  </script>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

// ----- /categories (explorer index) and /categories/<slug> -----

interface CategorizedRow {
  mstone: number;
  id: number;
  name: string;
  summary: string;
  category: Category;
  hasDemo: boolean;
}

async function collectCategorizedRows(channels: Channels): Promise<CategorizedRow[]> {
  const known = [...await knownReleaseMilestones(channels)].sort((a, b) => b - a);
  const rows: CategorizedRow[] = [];
  for (const m of known) {
    try {
      const feats = await getMilestoneFeatures(m);
      // Chromestatus puts the same feature in multiple groups when it's under
      // several statuses (e.g. "Origin trial" + "In developer trial"). Dedupe
      // by (milestone, slug) so we don't list the same demo twice on the
      // category page.
      const seen = new Set<string>();
      for (const g of feats.groups) {
        for (const f of g.features) {
          const slug = slugify(f.name);
          const key = `${m}:${slug}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const hasDemo = await featureHasDemo(`v${m}`, f);
          rows.push({
            mstone: m,
            id: f.id,
            name: f.name,
            summary: f.summary ?? "",
            category: categoryForFeature(f.name, g.category),
            hasDemo,
          });
        }
      }
    } catch {
      // skip milestones we can't fetch
    }
  }
  return rows;
}

export async function renderCategoriesIndex(channels: Channels): Promise<string> {
  const rows = await collectCategorizedRows(channels);
  const byCategory = new Map<string, CategorizedRow[]>();
  for (const cat of CATEGORIES) byCategory.set(cat.slug, []);
  for (const row of rows) {
    if (!row.hasDemo) continue; // only count built features
    byCategory.get(row.category.slug)!.push(row);
  }

  const tiles = CATEGORIES
    .filter((c) => (byCategory.get(c.slug) ?? []).length > 0)
    .map((c) => {
      const count = byCategory.get(c.slug)!.length;
      return `<li class="category-tile">
        <a href="/categories/${c.slug}/">
          <h3>${escapeHTML(c.label)}</h3>
          <p class="category-blurb">${escapeHTML(c.blurb)}</p>
          <p class="category-count">${count} ${count === 1 ? "demo" : "demos"}</p>
        </a>
      </li>`;
    }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>browse by category — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
  <style>
    main { max-width: 1100px; }
    .category-grid {
      list-style: none;
      padding: 0;
      margin: var(--space-5) 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: var(--space-4);
    }
    .category-tile {
      background: var(--bg-paper);
      border: 2px solid var(--border-black);
      box-shadow: var(--flat-shadow);
      transition: transform 80ms ease, box-shadow 80ms ease;
    }
    .category-tile:hover { transform: translate(-2px, -2px); box-shadow: var(--flat-shadow-hover); }
    .category-tile a {
      display: block;
      padding: var(--space-4);
      text-decoration: none;
      color: var(--text-black);
    }
    .category-tile h3 {
      margin: 0 0 var(--space-2);
      font-family: var(--font-display);
      font-size: 1.4rem;
      letter-spacing: -0.01em;
    }
    .category-blurb {
      margin: 0 0 var(--space-3);
      font-family: var(--font-serif);
      color: var(--text-charcoal);
      line-height: 1.5;
      font-size: 0.95rem;
    }
    .category-count {
      margin: 0;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      letter-spacing: 0.04em;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; home</a></p>

  <header class="lede-block">
    <p class="eyebrow">explore</p>
    <h1>browse by category</h1>
    <p class="lede">Demos grouped by theme. Identity bundles passkeys + WebAuthn + FedCM + autofill. On-device AI bundles Prompt + Summariser + Translator + speech. Drill into any category to see every demo, grouped by milestone.</p>
  </header>

  <ol class="category-grid">${tiles}</ol>

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

export async function renderCategoryPage(slug: string, channels: Channels): Promise<string | null> {
  const cat = CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return null;
  const rows = await collectCategorizedRows(channels);
  const matching = rows.filter((r) => r.category.slug === slug);
  if (matching.length === 0) return null;

  // Group by milestone, descending.
  matching.sort((a, b) => b.mstone - a.mstone || a.name.localeCompare(b.name));
  const byMstone = new Map<number, CategorizedRow[]>();
  for (const r of matching) {
    if (!byMstone.has(r.mstone)) byMstone.set(r.mstone, []);
    byMstone.get(r.mstone)!.push(r);
  }

  const milestoneSections = [...byMstone.entries()].map(([m, rs]) => {
    const cards = rs.map((r) => {
      const slugged = slugify(r.name);
      const summary = (r.summary ?? "").slice(0, 220);
      return `<li class="demo-card">
        <h3>${
        r.hasDemo
          ? `<a href="/v${r.mstone}/${slugged}/">${escapeHTML(r.name)}</a>`
          : escapeHTML(r.name)
      }</h3>
        <p>${escapeHTML(summary)}${summary.length === 220 ? "..." : ""}</p>
        <div class="demo-tags">
          <a class="tag" href="https://chromestatus.com/feature/${r.id}" target="_blank" rel="noopener">chromestatus</a>
          ${
        r.hasDemo
          ? `<a class="tag tag-live" href="/v${r.mstone}/${slugged}/">demo &rarr;</a>`
          : `<span class="tag tag-pending">demo pending</span>`
      }
        </div>
      </li>`;
    }).join("");
    return `<section>
      <h3 class="group-title">Chrome ${m} <span class="group-count">(${rs.length})</span></h3>
      <ol class="demo-list">${cards}</ol>
    </section>`;
  }).join("\n");

  const builtCount = matching.filter((r) => r.hasDemo).length;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHTML(cat.label)} — chrome platform showcase</title>
  <link rel="stylesheet" href="/public/styles.css">
</head>
<body>
<main>
  <p class="crumbs"><a href="/categories/">&larr; all categories</a></p>

  <header class="lede-block">
    <p class="eyebrow">category</p>
    <h1>${escapeHTML(cat.label)}</h1>
    <p class="lede">${escapeHTML(cat.blurb)}</p>
    <p class="updated-line">${builtCount} of ${matching.length} demos built, across ${byMstone.size} ${
    byMstone.size === 1 ? "release" : "releases"
  }.</p>
  </header>

  ${milestoneSections}

  <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
</main>
</body>
</html>`;
}

export async function knownReleaseMilestones(channels: Channels): Promise<Set<number>> {
  // Always accept the three live channels plus the previous stable (since
  // chromestatus's "stable" is the next cut, the previous mstone is what most
  // users actually have installed). Also accept any v<N>/ directory in the
  // repo, which covers archived older releases.
  const set = new Set<number>([
    channels.stable.mstone - 1,
    channels.stable.mstone,
    channels.beta.mstone,
    channels.dev.mstone,
  ]);
  try {
    for await (const entry of Deno.readDir(".")) {
      if (entry.isDirectory && /^v\d+$/.test(entry.name)) {
        set.add(Number(entry.name.slice(1)));
      }
    }
  } catch {
    // ignore — Deno Deploy filesystem may not allow readDir at the root.
  }
  return set;
}
