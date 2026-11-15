// Co-located server handler for
// v159/serviceworker-static-routing-distinct-typeerror-message-for-cancelled-race-netwo
// Mounted by routes/release.ts for /v159/<this-slug>/*
//
// Serves ONE real network behaviour the demos need: a response whose HEADERS
// are deliberately held back. The ChromeStatus change only applies when a
// `race-network-and-fetch-handler` network request is cancelled
// (net::ERR_ABORTED) BEFORE response headers arrive, so the demos need a
// network leg that is reliably still waiting for headers when the page or the
// service worker gives up on it.
//
//   /race/slow?delay=<ms>&tag=<label>
//     waits <delay> ms (0-8000, default 3000) and THEN sends headers + a small
//     JSON body. Matched by the service worker's static routing rule
//     { urlPattern: {pathname: '…/race/*'}, source: 'race-network-and-fetch-handler' }.
//   /race/fast?tag=<label>
//     answers immediately (the control arm: headers arrive, nothing is cancelled).
//   /race/loop?n=<k>
//     302-redirects to itself forever: a GENUINE network failure
//     (net::ERR_TOO_MANY_REDIRECTS, not ERR_ABORTED), so the demos can show the
//     message that must still read "Failed to fetch".
//
// Nothing here simulates the browser behaviour under test: the TypeError
// message is produced by the visiting browser's own fetch() inside the
// service worker, and the pages print it verbatim.

const PREFIX = "/serviceworker-static-routing-distinct-typeerror-message-for-cancelled-race-netwo";
const SLOW = `${PREFIX}/race/slow`;
const FAST = `${PREFIX}/race/fast`;
const LOOP = `${PREFIX}/race/loop`;

const TAG_RE = /^[A-Za-z0-9_.:-]{1,64}$/;

function body(tag: string, delay: number): Response {
  return new Response(
    JSON.stringify({ from: "network", tag, delay, servedAt: new Date().toISOString() }),
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  if (sub !== SLOW && sub !== FAST && sub !== LOOP) return null;
  const url = new URL(req.url);
  if (sub === LOOP) {
    const n = Math.min(Math.max(Number(url.searchParams.get("n") ?? 0) || 0, 0), 1000);
    const next = new URL(url);
    next.searchParams.set("n", String(n + 1));
    return new Response(null, {
      status: 302,
      headers: { location: next.pathname + next.search, "cache-control": "no-store" },
    });
  }
  const rawTag = url.searchParams.get("tag") ?? "demo";
  const tag = TAG_RE.test(rawTag) ? rawTag : "demo";
  if (sub === FAST) return body(tag, 0);
  const parsed = Number(url.searchParams.get("delay") ?? 3000);
  const delay = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 8000) : 3000;
  // Hold the headers back. If the client goes away first, Deno aborts
  // req.signal; stop waiting so cancelled requests do not pin a timer.
  await new Promise<void>((resolve) => {
    const t = setTimeout(resolve, delay);
    req.signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
  return body(tag, delay);
}
