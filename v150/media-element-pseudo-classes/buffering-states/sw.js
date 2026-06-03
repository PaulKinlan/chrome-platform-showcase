self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

let cachedTone = null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeText(bytes, offset, text) {
  for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
}

function buildToneWav(durationSeconds = 24) {
  if (cachedTone) return cachedTone;

  const sampleRate = 8000;
  const samples = sampleRate * durationSeconds;
  const dataBytes = samples * 2;
  const bytes = new Uint8Array(44 + dataBytes);
  const view = new DataView(bytes.buffer);

  writeText(bytes, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeText(bytes, 8, "WAVE");
  writeText(bytes, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(bytes, 36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const envelope = 0.38 + 0.24 * Math.sin(2 * Math.PI * t / 5);
    const tone = Math.sin(2 * Math.PI * 220 * t) + 0.42 * Math.sin(2 * Math.PI * 330 * t);
    view.setInt16(44 + i * 2, Math.round(tone * envelope * 9000), true);
  }

  cachedTone = bytes;
  return cachedTone;
}

function parseRange(rangeHeader, size) {
  if (!rangeHeader) return null;

  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  let start = match[1] ? Number(match[1]) : 0;
  let end = match[2] ? Number(match[2]) : size - 1;

  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  start = Math.max(0, Math.min(size - 1, start));
  end = Math.max(start, Math.min(size - 1, end));
  return { start, end };
}

function streamBytes(bytes, start, end, profile) {
  let cancelled = false;
  const slow = profile !== "fast";
  const stall = profile === "stall";

  return new ReadableStream({
    async start(controller) {
      let offset = start;
      let sent = 0;
      let gapInserted = false;

      try {
        while (!cancelled && offset <= end) {
          const burst = slow && sent >= 56 * 1024 ? 4096 : 8192;
          const next = Math.min(end + 1, offset + (slow ? burst : 64 * 1024));
          controller.enqueue(bytes.slice(offset, next));
          sent += next - offset;
          offset = next;

          if (!slow || offset > end) continue;
          if (stall && sent >= 44 * 1024) {
            while (!cancelled) await delay(1000);
            return;
          }

          if (!gapInserted && sent >= 56 * 1024) {
            gapInserted = true;
            await delay(5200);
          } else {
            await delay(sent < 56 * 1024 ? 110 : 850);
          }
        }

        if (!cancelled) controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
    cancel() {
      cancelled = true;
    },
  });
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (!url.pathname.endsWith("/slow-tone.wav")) return;

  event.respondWith((async () => {
    const bytes = buildToneWav();
    const range = parseRange(event.request.headers.get("range"), bytes.length);
    const start = range?.start ?? 0;
    const end = range?.end ?? bytes.length - 1;
    const length = end - start + 1;
    const profile = url.searchParams.get("profile") ?? "slow";

    const headers = new Headers({
      "accept-ranges": "bytes",
      "cache-control": "no-store",
      "content-length": String(length),
      "content-type": "audio/wav",
      "x-showcase-stream": profile === "fast"
        ? "fast"
        : profile === "stall"
        ? "stalled"
        : "slow-starved",
    });

    if (range) {
      headers.set("content-range", `bytes ${start}-${end}/${bytes.length}`);
    }

    return new Response(streamBytes(bytes, start, end, profile), {
      status: range ? 206 : 200,
      headers,
    });
  })());
});
