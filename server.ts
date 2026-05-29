// chrome-platform-showcase
// Deno HTTP entry. The index and each release page are rendered live from the
// chromestatus.com JSON API so the catalogue always reflects what's currently
// shipping. Per-feature demos live as static files inside the matching /v<N>/
// folder once they've been built.

import {
  Channel,
  Channels,
  chromeStatusUrl,
  FeatureSummary,
  getChannels,
  getMilestoneFeatures,
  MilestoneFeatures,
  slugify,
} from "./lib/chromestatus.ts";

const PORT = Number(Deno.env.get("PORT") ?? 3000);

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  woff2: "font/woff2",
};

function escapeHTML(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function readPublicAsset(path: string): Promise<Response> {
  try {
    const file = await Deno.readFile("." + path);
    const ext = path.split(".").pop() ?? "";
    return new Response(file, {
      headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function readReleaseAsset(release: string, sub: string): Promise<Response | null> {
  if (sub.includes("..")) return null;
  // Trailing slash or path with no extension: serve <path>/index.html.
  let key = sub.replace(/^\/+/, "");
  if (!key) return null;
  if (key.endsWith("/")) key += "index.html";
  else if (!/\.[a-z0-9]+$/i.test(key)) key += "/index.html";

  try {
    const file = await Deno.readFile(`./${release}/${key}`);
    const ext = key.split(".").pop() ?? "";
    return new Response(file, {
      headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
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

async function renderIndex(channels: Channels): Promise<string> {
  // Chromestatus's "stable.mstone" is the *next* stable cut, even when its
  // stable_date is still a few days away. Most users are on stable-1 until
  // the cut lands. Show that release too so the issue stream and the catalogue
  // line up with what's actually deployed.
  const prevStable = channels.stable.mstone - 1;
  const releases: { mstone: number; status: string; date: string }[] = [
    { mstone: channels.dev.mstone, status: "Dev", date: channels.dev.stable_date },
    { mstone: channels.beta.mstone, status: "Beta", date: channels.beta.stable_date },
    {
      mstone: channels.stable.mstone,
      status: "Stable (rolling out)",
      date: channels.stable.stable_date,
    },
    { mstone: prevStable, status: "Stable (live)", date: "" },
  ];

  // Surface any backfilled older releases that have v<N>/ folders too, so a
  // demo for an older Chrome doesn't get hidden just because the channels API
  // no longer mentions it.
  const seen = new Set(releases.map((r) => r.mstone));
  try {
    for await (const entry of Deno.readDir(".")) {
      if (entry.isDirectory && /^v\d+$/.test(entry.name)) {
        const m = Number(entry.name.slice(1));
        if (!seen.has(m)) {
          releases.push({ mstone: m, status: "Archive", date: "" });
          seen.add(m);
        }
      }
    }
  } catch {
    // ignore — Deno Deploy can refuse the readDir at root in some isolates.
  }
  releases.sort((a, b) => b.mstone - a.mstone);

  const cards = releases.map((r) => {
    let note: string;
    if (r.date) {
      note = `Stable date: ${
        new Date(r.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      }`;
    } else if (r.status === "Archive") {
      note = "Backfilled";
    } else {
      note = "Most users are here";
    }
    return `<li class="release-card">
      <a href="/v${r.mstone}/">
        <span class="release-label">Chrome ${r.mstone}</span>
        <span class="release-status">${escapeHTML(r.status)}</span>
      </a>
      <p class="release-note">${escapeHTML(note)}</p>
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
    </header>

    <section>
      <h2>releases</h2>
      <ol class="release-list">${cards}</ol>
      <p class="note">Older Chrome releases will be backfilled as the routine works through the chromestatus archive.</p>
    </section>

    <section class="how">
      <h2>how it works</h2>
      <ol>
        <li>The routine reads the <a href="https://chromestatus.com/" target="_blank" rel="noopener">chromestatus.com</a> JSON API every day.</li>
        <li>It opens a GitHub issue for each new feature without a demo, proposing 2-3 demo concepts using the feature's overview, motivation, spec links, and explainers.</li>
        <li>A human picks a concept (or writes a different one) in the issue.</li>
        <li>The routine opens a draft PR. A human reviews and merges. Deno Deploy redeploys.</li>
        <li>The release uber demo follows the same flow, gated behind a "concept locked" comment.</li>
      </ol>
      <p class="note">Repo: <a href="https://github.com/PaulKinlan/chrome-platform-showcase" target="_blank" rel="noopener">PaulKinlan/chrome-platform-showcase</a>.</p>
    </section>

    <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
  </main>
</body>
</html>`;
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

async function renderReleasePage(
  release: string,
  milestone: number,
  channels: Channels,
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
  const sections = await Promise.all(features.groups.map(async (group) => {
    const cards = await Promise.all(group.features.map(async (f) => {
      const hasDemo = await featureHasDemo(release, f);
      const slug = slugify(f.name);
      const summary = (f.summary ?? "").slice(0, 220);
      return `<li class="demo-card">
        <h3><a href="${chromeStatusUrl(f.id)}" target="_blank" rel="noopener">${
        escapeHTML(f.name)
      }</a></h3>
        <p>${escapeHTML(summary)}${summary.length === 220 ? "..." : ""}</p>
        <div class="demo-tags">
          <span class="tag">${escapeHTML(categoryTag(group.category))}</span>
          ${
        hasDemo
          ? `<a class="tag tag-live" href="/${release}/${slug}/">demo &rarr;</a>`
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
</head>
<body>
<main>
  <p class="crumbs"><a href="/">&larr; all releases</a></p>

  <header class="lede-block">
    <p class="eyebrow">chrome ${milestone} · ${escapeHTML(status.toLowerCase())}</p>
    <h1>chrome ${milestone} platform demos</h1>
    <p class="lede">${features.total} features tracked for Chrome ${milestone}. Each card links to its ChromeStatus entry; the live demos drop in as the routine builds them. A single "uber" demo per release combines several APIs into one larger experience.</p>
  </header>

  <section>
    <h2>uber demo</h2>
    <p>Concept is locked in a GitHub issue first; humans pick the direction, the routine builds it, the result lives at <code>/${release}/showcase/</code>. Per-feature demos below are built automatically (no human gate) — every concept the routine proposes gets shipped.</p>
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

async function knownReleaseMilestones(channels: Channels): Promise<Set<number>> {
  // Always accept the three live channels plus the previous stable (since
  // chromestatus's "stable" is the next cut, the previous mstone is what most
  // users actually have installed). Also accept any v<N>/ directory in the
  // repo, which covers backfilled older releases.
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

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/" || path === "/index.html") {
    try {
      const channels = await getChannels();
      return new Response(await renderIndex(channels), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response(`Failed to render index: ${err}`, { status: 502 });
    }
  }

  if (path.startsWith("/public/")) return readPublicAsset(path);

  // Per-release routes: /vNNN/ and /vNNN/<sub>.
  const releaseMatch = path.match(/^\/(v\d+)(\/.*)?$/);
  if (releaseMatch) {
    const release = releaseMatch[1];
    const milestone = Number(release.slice(1));
    const sub = releaseMatch[2] ?? "/";

    let channels: Channels;
    try {
      channels = await getChannels();
    } catch (err) {
      return new Response(`Failed to load channels: ${err}`, { status: 502 });
    }
    const known = await knownReleaseMilestones(channels);
    if (!known.has(milestone)) {
      return new Response(`Release ${release} not configured yet`, { status: 404 });
    }

    if (sub === "/" || sub === "/index.html") {
      try {
        const channels = await getChannels();
        return new Response(await renderReleasePage(release, milestone, channels), {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      } catch (err) {
        return new Response(`Failed to render release: ${err}`, { status: 502 });
      }
    }

    return (await readReleaseAsset(release, sub)) ??
      new Response("Not found", { status: 404 });
  }

  return new Response("Not found", { status: 404 });
});

console.log(`Listening on http://localhost:${PORT}`);
