// chrome-platform-showcase
// Deno HTTP entry. Per-release versions live in /v<N>/ folders. For now the
// server is just an index + a placeholder for v148; the per-feature demos
// will arrive via the agent loop described in the README.

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

const RELEASES = [
  { id: "v148", label: "Chrome 148", status: "DevTrial", note: "scaffolding in progress" },
];

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
  // Strip leading slash and any "..". This is only used for static files under the release folder.
  const safe = sub.replace(/^\/+/, "");
  if (!safe || safe.includes("..")) return null;
  try {
    const file = await Deno.readFile(`./${release}/${safe}`);
    const ext = safe.split(".").pop() ?? "";
    return new Response(file, {
      headers: { "content-type": MIME[ext] ?? "application/octet-stream" },
    });
  } catch {
    return null;
  }
}

function indexPage(): Response {
  const releases = RELEASES.map((r) =>
    `<li class="release-card">
      <a href="/${r.id}/">
        <span class="release-label">${escapeHTML(r.label)}</span>
        <span class="release-status">${escapeHTML(r.status)}</span>
      </a>
      <p class="release-note">${escapeHTML(r.note)}</p>
    </li>`
  ).join("");

  const body = `<!doctype html>
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
      <ol class="release-list">${releases}</ol>
    </section>

    <section class="how">
      <h2>how it works</h2>
      <ol>
        <li>The routine reads the <a href="https://chromestatus.com/" target="_blank" rel="noopener">chromestatus.com</a> JSON API every day.</li>
        <li>It opens an issue for each new feature without a demo, proposing 2-3 demo concepts using the feature's overview, motivation, and spec links.</li>
        <li>A human picks a concept (or writes a different one).</li>
        <li>The routine opens a draft PR. A human reviews and merges. Deno Deploy redeploys.</li>
      </ol>
      <p class="note">Repo: <a href="https://github.com/PaulKinlan/chrome-platform-showcase" target="_blank" rel="noopener">PaulKinlan/chrome-platform-showcase</a>.</p>
    </section>

    <footer class="byline">made by <a href="https://paul.kinlan.me/" target="_blank" rel="noopener">Paul Kinlan</a></footer>
  </main>
</body>
</html>`;

  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path === "/" || path === "/index.html") return indexPage();
  if (path.startsWith("/public/")) return readPublicAsset(path);

  // Per-release routes: /vNNN/ and /vNNN/<sub>.
  const releaseMatch = path.match(/^\/(v\d+)(\/.*)?$/);
  if (releaseMatch) {
    const release = releaseMatch[1];
    const sub = releaseMatch[2] ?? "/";
    if (!RELEASES.find((r) => r.id === release)) {
      return new Response("Release not found", { status: 404 });
    }
    // Try a static asset under the release folder first.
    if (sub === "/" || sub === "/index.html") {
      return (await readReleaseAsset(release, "/index.html")) ??
        new Response("Index not found", { status: 404 });
    }
    return (await readReleaseAsset(release, sub)) ??
      new Response("Not found", { status: 404 });
  }

  return new Response("Not found", { status: 404 });
});

console.log(`Listening on http://localhost:${PORT}`);
