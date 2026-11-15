// Shared helpers for the RTP Header Extension Encryption concept pages.
// Everything here drives REAL RTCPeerConnection objects in this page — no
// simulated SDP. The cryptex (RFC 9335) signal is the "a=cryptex" attribute.

export const POLICY_VALUES = ["disable", "negotiate", "require"];

// Behavioural support probe for RTCConfiguration.rtpHeaderEncryptionPolicy.
// An unsupporting browser silently ignores the unknown dictionary member, so
// "the constructor did not throw" is NOT evidence of support. We require the
// member to be reflected by getConfiguration() AND an invalid enum value to be
// rejected with TypeError. Each enum value is probed separately because the
// "disable" value was added to the spec after the first implementation.
export function probePolicySupport() {
  const result = { reflected: false, rejectsInvalid: false, invalidError: null, values: {} };
  try {
    const pc = new RTCPeerConnection({ rtpHeaderEncryptionPolicy: "require" });
    result.reflected = pc.getConfiguration().rtpHeaderEncryptionPolicy === "require";
    pc.close();
  } catch (error) {
    result.reflectError = `${error.name}: ${error.message}`;
  }
  try {
    const pc = new RTCPeerConnection({ rtpHeaderEncryptionPolicy: "not-a-policy" });
    pc.close();
  } catch (error) {
    result.rejectsInvalid = error.name === "TypeError";
    result.invalidError = `${error.name}: ${error.message}`;
  }
  for (const value of POLICY_VALUES) {
    try {
      const pc = new RTCPeerConnection({ rtpHeaderEncryptionPolicy: value });
      result.values[value] = pc.getConfiguration().rtpHeaderEncryptionPolicy === value
        ? "accepted"
        : "ignored";
      pc.close();
    } catch (error) {
      result.values[value] = `rejected (${error.name})`;
    }
  }
  result.supported = result.reflected && result.rejectsInvalid;
  return result;
}

// Build an RTCConfiguration, leaving the member out entirely for "(default)".
export function configFor(policy) {
  return policy && policy !== "default" ? { rtpHeaderEncryptionPolicy: policy } : {};
}

// A real audio track with no permission prompt: an oscillator through a gain
// node into a MediaStreamAudioDestinationNode. Call from a click handler.
export async function makeToneTrack({ frequency = 440, level = 0.2 } = {}) {
  const ctx = new AudioContext();
  await ctx.resume().catch(() => {});
  const osc = ctx.createOscillator();
  osc.frequency.value = frequency;
  const gain = ctx.createGain();
  gain.gain.value = level;
  const dest = ctx.createMediaStreamDestination();
  osc.connect(gain).connect(dest);
  osc.start();
  return { ctx, osc, gain, stream: dest.stream, track: dest.stream.getAudioTracks()[0] };
}

// Count cryptex signals in an SDP blob and return the matching lines.
export function cryptexInfo(sdp) {
  const lines = (sdp || "").split(/\r?\n/);
  const hits = lines.filter((l) => /^a=cryptex\b/.test(l));
  // RFC 6904 per-extension encryption, for comparison (legacy mechanism).
  const legacy = lines.filter((l) => /urn:ietf:params:rtp-hdrext:encrypt/.test(l));
  return { count: hits.length, lines: hits, legacyCount: legacy.length };
}

// Escape SDP text for innerHTML and highlight a=cryptex lines.
export function highlightSdp(sdp) {
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  return (sdp || "").split(/\r?\n/).filter(Boolean).map((line) =>
    /^a=cryptex\b/.test(line) ? `<mark class="hit">${esc(line)}</mark>` : esc(line)
  ).join("\n");
}

// Offer/answer between two local peer connections with trickled candidates.
// mungeOffer lets a page alter the offer the callee sees (downgrade attacks).
export async function negotiate(caller, callee, { mungeOffer } = {}) {
  caller.onicecandidate = (e) => e.candidate && callee.addIceCandidate(e.candidate).catch(() => {});
  callee.onicecandidate = (e) => e.candidate && caller.addIceCandidate(e.candidate).catch(() => {});
  const offer = await caller.createOffer();
  await caller.setLocalDescription(offer);
  const offerSdp = caller.localDescription.sdp;
  const seenSdp = mungeOffer ? mungeOffer(offerSdp) : offerSdp;
  const step = { offerSdp, seenSdp, answerSdp: null, stage: "callee.setRemoteDescription(offer)" };
  await callee.setRemoteDescription({ type: "offer", sdp: seenSdp });
  step.stage = "callee.createAnswer()";
  const answer = await callee.createAnswer();
  await callee.setLocalDescription(answer);
  step.answerSdp = callee.localDescription.sdp;
  step.stage = "caller.setRemoteDescription(answer)";
  await caller.setRemoteDescription(callee.localDescription);
  step.stage = "done";
  return step;
}

export function waitForConnected(pc, ms = 8000) {
  return new Promise((resolve) => {
    if (pc.connectionState === "connected") return resolve(true);
    const timer = setTimeout(() => resolve(false), ms);
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "connected") {
        clearTimeout(timer);
        resolve(true);
      } else if (pc.connectionState === "failed") {
        clearTimeout(timer);
        resolve(false);
      }
    });
  });
}

export async function transportStats(pc) {
  const stats = await pc.getStats();
  for (const s of stats.values()) {
    if (s.type === "transport") {
      return {
        srtpCipher: s.srtpCipher,
        dtlsCipher: s.dtlsCipher,
        tlsVersion: s.tlsVersion,
        dtlsState: s.dtlsState,
      };
    }
  }
  return null;
}
