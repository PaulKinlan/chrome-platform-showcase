// Shared helpers for the createDTMFSender removal demos. Everything runs on
// REAL RTCPeerConnection objects in this page; no SDP or events are faked.

// A real audio track with no permission prompt (oscillator -> MediaStream).
// Call from a click handler so the AudioContext may start.
export async function makeAudioTrack() {
  const ctx = new AudioContext();
  await ctx.resume().catch(() => {});
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.value = 0.05;
  const dest = ctx.createMediaStreamDestination();
  osc.connect(gain).connect(dest);
  osc.start();
  return { ctx, osc, stream: dest.stream, track: dest.stream.getAudioTracks()[0] };
}

// Connect a sending caller to a receiving callee in this tab.
// Returns once ICE/DTLS is connected (or after a timeout).
export async function makeCall({ negotiateNow = true } = {}) {
  const audio = await makeAudioTrack();
  const caller = new RTCPeerConnection();
  const callee = new RTCPeerConnection();
  const sender = caller.addTrack(audio.track, audio.stream);
  caller.onicecandidate = (e) => e.candidate && callee.addIceCandidate(e.candidate).catch(() => {});
  callee.onicecandidate = (e) => e.candidate && caller.addIceCandidate(e.candidate).catch(() => {});
  const call = {
    audio,
    caller,
    callee,
    sender,
    connected: false,
    close() {
      caller.close();
      callee.close();
      audio.osc.stop();
      audio.ctx.close().catch(() => {});
    },
  };
  if (negotiateNow) await negotiate(call);
  return call;
}

export async function negotiate(call) {
  const { caller, callee } = call;
  await caller.setLocalDescription();
  await callee.setRemoteDescription(caller.localDescription);
  await callee.setLocalDescription();
  await caller.setRemoteDescription(callee.localDescription);
  call.connected = await new Promise((resolve) => {
    if (caller.connectionState === "connected") return resolve(true);
    const timer = setTimeout(() => resolve(false), 8000);
    caller.addEventListener("connectionstatechange", () => {
      if (caller.connectionState === "connected") {
        clearTimeout(timer);
        resolve(true);
      }
    });
  });
  // canInsertDTMF can flip to true a moment after "connected"; wait briefly.
  const dtmf = call.sender?.dtmf;
  const wantSend = ["sendrecv", "sendonly"].includes(caller.getTransceivers()[0]?.currentDirection);
  for (let i = 0; call.connected && dtmf && wantSend && !dtmf.canInsertDTMF && i < 40; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  return call.connected;
}

// The exact removal probe: is the legacy method still on the prototype?
export function legacyMethodPresent() {
  return typeof RTCPeerConnection === "function" &&
    typeof RTCPeerConnection.prototype.createDTMFSender === "function";
}

// The replacement surface the spec defines.
export function replacementPresent() {
  return typeof RTCRtpSender === "function" && "dtmf" in RTCRtpSender.prototype &&
    typeof RTCDTMFSender === "function";
}
