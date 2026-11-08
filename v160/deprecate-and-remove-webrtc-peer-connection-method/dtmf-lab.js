// Shared, real WebRTC loopback helpers for the createDTMFSender() removal demos.
//
// Everything here calls the genuine platform surface: two RTCPeerConnections in the
// same page, a silent Web Audio track (OscillatorNode -> GainNode(0) ->
// MediaStreamAudioDestinationNode, never routed to the speakers, so no microphone
// permission and no sound), real offer/answer + ICE, and the standard
// RTCRtpSender.dtmf (RTCDTMFSender) object. Nothing is simulated.

export const ALLOWED_TONES = "0123456789ABCDabcd#*,";

export function legacyMethodPresent() {
  return typeof globalThis.RTCPeerConnection === "function" &&
    "createDTMFSender" in RTCPeerConnection.prototype &&
    typeof RTCPeerConnection.prototype.createDTMFSender === "function";
}

export function standardSurfacePresent() {
  return typeof globalThis.RTCRtpSender === "function" &&
    "dtmf" in RTCRtpSender.prototype &&
    typeof globalThis.RTCDTMFSender === "function" &&
    typeof RTCDTMFSender.prototype.insertDTMF === "function";
}

export function describeError(error) {
  if (!error) return "(no error)";
  return `${error.name || "Error"}: ${error.message || String(error)}`;
}

// Characters the spec treats as unrecognized (insertDTMF throws InvalidCharacterError).
export function invalidCharacters(tones) {
  const bad = [];
  for (const ch of String(tones)) {
    if (!ALLOWED_TONES.includes(ch) && !bad.includes(ch)) bad.push(ch);
  }
  return bad;
}

export function makeSilentAudioTrack() {
  const AudioCtx = globalThis.AudioContext || globalThis.webkitAudioContext;
  const ac = new AudioCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  gain.gain.value = 0; // silent: DTMF travels out-of-band as RTP telephone-event anyway
  const dest = ac.createMediaStreamDestination();
  osc.connect(gain).connect(dest);
  osc.start();
  const stream = dest.stream;
  const track = stream.getAudioTracks()[0];
  return {
    ac,
    stream,
    track,
    stop() {
      try {
        osc.stop();
      } catch { /* already stopped */ }
      track.stop();
      ac.close().catch(() => {});
    },
  };
}

export function telephoneEventLines(sdp) {
  const out = [];
  const re = /a=rtpmap:(\d+) telephone-event\/(\d+)/g;
  let m;
  while ((m = re.exec(sdp || ""))) out.push(`PT ${m[1]} @ ${m[2]} Hz`);
  return out;
}

export function waitForConnected(pc, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (pc.connectionState === "connected") return resolve("connected");
    const timer = setTimeout(() => {
      pc.removeEventListener("connectionstatechange", onChange);
      reject(new Error(`timed out in connectionState "${pc.connectionState}"`));
    }, timeoutMs);
    function onChange() {
      const s = pc.connectionState;
      if (s === "connected") {
        clearTimeout(timer);
        pc.removeEventListener("connectionstatechange", onChange);
        resolve(s);
      } else if (s === "failed" || s === "closed") {
        clearTimeout(timer);
        pc.removeEventListener("connectionstatechange", onChange);
        reject(new Error(`connectionState became "${s}"`));
      }
    }
    pc.addEventListener("connectionstatechange", onChange);
  });
}

// Build an in-page loopback call. Negotiation is split into steps so the
// inspector concept can walk them one at a time; negotiate() runs them all.
export function createLoopback(
  { direction = "sendrecv", stripTelephoneEvent = false } = {},
) {
  const audio = makeSilentAudioTrack();
  const pcA = new RTCPeerConnection();
  const pcB = new RTCPeerConnection();
  pcA.addEventListener("icecandidate", (e) => {
    if (e.candidate) pcB.addIceCandidate(e.candidate).catch(() => {});
  });
  pcB.addEventListener("icecandidate", (e) => {
    if (e.candidate) pcA.addIceCandidate(e.candidate).catch(() => {});
  });
  const transceiver = pcA.addTransceiver(audio.track, {
    direction,
    streams: [audio.stream],
  });
  if (stripTelephoneEvent) {
    const caps = RTCRtpSender.getCapabilities("audio");
    transceiver.setCodecPreferences(
      caps.codecs.filter((c) => c.mimeType.toLowerCase() !== "audio/telephone-event"),
    );
  }
  const call = {
    audio,
    pcA,
    pcB,
    transceiver,
    sender: transceiver.sender,
    track: audio.track,
    async offer() {
      await pcA.setLocalDescription();
      return pcA.localDescription;
    },
    async answerOnB() {
      await pcB.setRemoteDescription(pcA.localDescription);
      await pcB.setLocalDescription();
      return pcB.localDescription;
    },
    async applyAnswer() {
      await pcA.setRemoteDescription(pcB.localDescription);
      return pcA.remoteDescription;
    },
    async negotiate(timeoutMs = 8000) {
      await call.offer();
      await call.answerOnB();
      await call.applyAnswer();
      const state = await waitForConnected(pcA, timeoutMs);
      // canInsertDTMF is reported by the WebRTC engine and can lag the
      // connectionstatechange by a task or two; give it a short grace period
      // (it stays false for good when DTMF genuinely cannot be sent).
      const t0 = performance.now();
      while (call.sender.dtmf && !call.sender.dtmf.canInsertDTMF && performance.now() - t0 < 1000) {
        await new Promise((r) => setTimeout(r, 25));
      }
      return state;
    },
    close() {
      pcA.close();
      pcB.close();
      audio.stop();
    },
  };
  return call;
}

// Run one insertDTMF() call and collect every real tonechange event until the
// terminal empty-tone event (or a timeout). Each record carries the tone, the
// time since the first event, and the live toneBuffer at that moment.
export function playAndCollect(dtmf, tones, duration, gap, onEvent, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const events = [];
    let t0;
    const timer = setTimeout(() => {
      dtmf.removeEventListener("tonechange", handler);
      resolve({ events, timedOut: true });
    }, timeoutMs);
    function handler(e) {
      const now = performance.now();
      if (t0 === undefined) t0 = now;
      const rec = { tone: e.tone, t: Math.round(now - t0), buffer: dtmf.toneBuffer };
      events.push(rec);
      onEvent?.(rec);
      if (e.tone === "") {
        clearTimeout(timer);
        dtmf.removeEventListener("tonechange", handler);
        resolve({ events, timedOut: false });
      }
    }
    dtmf.addEventListener("tonechange", handler);
    try {
      if (duration === undefined) dtmf.insertDTMF(tones);
      else if (gap === undefined) dtmf.insertDTMF(tones, duration);
      else dtmf.insertDTMF(tones, duration, gap);
    } catch (error) {
      clearTimeout(timer);
      dtmf.removeEventListener("tonechange", handler);
      reject(error);
    }
  });
}

// Standard DTMF row/column frequencies (ITU-T Q.23), used only for the optional
// local sidetone so a user can hear which key was sent.
export const DTMF_FREQS = {
  "1": [697, 1209],
  "2": [697, 1336],
  "3": [697, 1477],
  "A": [697, 1633],
  "4": [770, 1209],
  "5": [770, 1336],
  "6": [770, 1477],
  "B": [770, 1633],
  "7": [852, 1209],
  "8": [852, 1336],
  "9": [852, 1477],
  "C": [852, 1633],
  "*": [941, 1209],
  "0": [941, 1336],
  "#": [941, 1477],
  "D": [941, 1633],
};

export function sidetone(ac, tone, ms, level = 0.04) {
  const pair = DTMF_FREQS[String(tone).toUpperCase()];
  if (!pair || !ac) return false;
  const g = ac.createGain();
  g.gain.value = level;
  g.connect(ac.destination);
  const end = ac.currentTime + ms / 1000;
  for (const f of pair) {
    const o = ac.createOscillator();
    o.frequency.value = f;
    o.connect(g);
    o.start();
    o.stop(end);
  }
  setTimeout(() => g.disconnect(), ms + 50);
  return true;
}

export function tele(id, cond, details) {
  try {
    globalThis.showcaseTelemetry?.assert(id, cond, details);
  } catch { /* telemetry must never break the demo */ }
}
