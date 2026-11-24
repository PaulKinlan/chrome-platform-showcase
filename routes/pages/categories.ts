import { getMilestoneFeatures, slugify } from "../../lib/chromestatus.ts";
import type { Channels } from "../../lib/chromestatus.ts";
import { escapeHTML } from "../html.ts";
import { knownReleaseMilestones, resolveDemo } from "./demo-index.ts";
import type { ResolvedDemo } from "./demo-index.ts";
import { BYLINE_FOOTER } from "./layout.ts";

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

// ----- /categories (explorer index) and /categories/<slug> -----

interface CategorizedRow {
  mstone: number;
  id: number;
  name: string;
  summary: string;
  category: Category;
  /** Built in this milestone's own folder — what the category counts count. */
  hasDemo: boolean;
  /** Where to send a reader, which may be another milestone's folder. */
  demo: ResolvedDemo | null;
}

async function collectCategorizedRows(channels: Channels): Promise<CategorizedRow[]> {
  const known = [...await knownReleaseMilestones(channels)].sort((a, b) => b - a);
  const milestoneBatches = await Promise.all(
    known.map(async (m) => {
      try {
        const feats = await getMilestoneFeatures(m);
        // Chromestatus puts the same feature in multiple groups when it's under
        // several statuses (e.g. "Origin trial" + "In developer trial"). Dedupe
        // by (milestone, slug) so we don't list the same demo twice on the
        // category page.
        const seen = new Set<string>();
        const batch: CategorizedRow[] = [];
        for (const g of feats.groups) {
          for (const f of g.features) {
            const slug = slugify(f.name);
            const key = `${m}:${slug}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const demo = await resolveDemo(`v${m}`, f);
            batch.push({
              mstone: m,
              id: f.id,
              name: f.name,
              summary: f.summary ?? "",
              category: categoryForFeature(f.name, g.category),
              hasDemo: demo?.sameRelease ?? false,
              demo,
            });
          }
        }
        return batch;
      } catch {
        return [] as CategorizedRow[];
      }
    }),
  );
  return milestoneBatches.flat();
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

  ${BYLINE_FOOTER}
</main>
</body>
</html>`;
}

/**
 * One feature card on a category page, with every interpolated value —
 * including the hrefs — escaped for its HTML attribute context.
 */
export function renderCategoryCard(
  r: { name: string; summary?: string | null; id: number | string; demo: ResolvedDemo | null },
): string {
  const summary = (r.summary ?? "").slice(0, 220);
  return `<li class="demo-card">
        <h3>${
    r.demo ? `<a href="${escapeHTML(r.demo.href)}">${escapeHTML(r.name)}</a>` : escapeHTML(r.name)
  }</h3>
        <p>${escapeHTML(summary)}${summary.length === 220 ? "..." : ""}</p>
        <div class="demo-tags">
          <a class="tag" href="${
    escapeHTML(`https://chromestatus.com/feature/${r.id}`)
  }" target="_blank" rel="noopener">chromestatus</a>
          ${
    r.demo
      ? r.demo.sameRelease
        ? `<a class="tag tag-live" href="${escapeHTML(r.demo.href)}">demo &rarr;</a>`
        : `<a class="tag tag-live" href="${
          escapeHTML(r.demo.href)
        }" title="This feature is demonstrated in the milestone it shipped in">demo in ${
          escapeHTML(r.demo.release)
        } &rarr;</a>`
      : `<span class="tag tag-pending">demo pending</span>`
  }
        </div>
      </li>`;
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
    const cards = rs.map((r) => renderCategoryCard(r)).join("");
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

  ${BYLINE_FOOTER}
</main>
</body>
</html>`;
}
