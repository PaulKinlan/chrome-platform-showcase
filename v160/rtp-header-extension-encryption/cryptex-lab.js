// Shared helpers for the RTP Header Extension Encryption (cryptex, RFC 9335) concept pages.
// Everything here drives REAL RTCPeerConnection objects in the page: no signalling server,
// no mocked SDP. Two peers in one document, ICE candidates handed across in-process.
//
// Exposed as window.CryptexLab (no bare globals that could collide with page code).
(function () {
  "use strict";

  var POLICIES = ["disable", "negotiate", "require"];
  var FLAG_NAME = "RtcRtpHeaderEncryptionPolicy";

  // The dictionary member is [RuntimeEnabled=RtcRtpHeaderEncryptionPolicy] in Blink's
  // rtc_configuration.idl. When the runtime feature is off, the member is an unknown dictionary
  // key: it is silently ignored by the constructor AND absent from getConfiguration(). So the only
  // honest probe is "does getConfiguration() report the member?" — passing it to the constructor
  // proves nothing.
  function probeSupport() {
    var pc;
    try {
      pc = new RTCPeerConnection();
      var cfg = pc.getConfiguration();
      return {
        supported: Object.prototype.hasOwnProperty.call(cfg, "rtpHeaderEncryptionPolicy") ||
          "rtpHeaderEncryptionPolicy" in cfg,
        defaultPolicy: cfg.rtpHeaderEncryptionPolicy,
      };
    } catch (e) {
      return { supported: false, error: e.name + ": " + e.message };
    } finally {
      if (pc) pc.close();
    }
  }

  // Which enum values does THIS build accept? Chrome 153 (pre w3c/webrtc-extensions PR #256)
  // only knows "negotiate" | "require"; the current spec adds "disable". Each value is tried
  // for real; a TypeError means the enum does not contain it.
  function probeVocabulary() {
    return POLICIES.concat(["bogus-value"]).map(function (value) {
      var pc;
      try {
        pc = new RTCPeerConnection({ rtpHeaderEncryptionPolicy: value });
        var got = pc.getConfiguration().rtpHeaderEncryptionPolicy;
        return { value: value, accepted: true, reflected: got };
      } catch (e) {
        return { value: value, accepted: false, error: e.name };
      } finally {
        if (pc) pc.close();
      }
    });
  }

  function acceptedPolicies() {
    return probeVocabulary().filter(function (r) {
      return r.accepted && r.value !== "bogus-value" && r.reflected === r.value;
    }).map(function (r) {
      return r.value;
    });
  }

  function splitLines(sdp) {
    return sdp.split(/\r?\n/).filter(function (l) {
      return l.length;
    });
  }

  // Split into [session, m-section...] keeping text.
  function sections(sdp) {
    var out = [[]];
    splitLines(sdp).forEach(function (line) {
      if (line.indexOf("m=") === 0) out.push([]);
      out[out.length - 1].push(line);
    });
    return out;
  }

  // Per RTP m= section: does a=cryptex apply (session-level or media-level)?
  // Mirrors cryptexPerMediaSection() in WPT webrtc-extensions/RTCConfiguration-rtpHeaderEncryptionPolicy.html.
  function analyse(sdp) {
    var secs = sections(sdp);
    var sessionCryptex = secs[0].indexOf("a=cryptex") !== -1;
    var media = secs.slice(1).map(function (lines) {
      var m = lines[0];
      var kind = m.slice(2).split(" ")[0];
      var mid = (lines.find(function (l) {
        return l.indexOf("a=mid:") === 0;
      }) || "").slice(6);
      var mediaCryptex = lines.indexOf("a=cryptex") !== -1;
      var extmaps = lines.filter(function (l) {
        return l.indexOf("a=extmap:") === 0;
      })
        .map(function (l) {
          var parts = l.slice(9).split(" ");
          return { id: parts[0], uri: parts[1] };
        });
      var rtp = kind !== "application";
      return {
        kind: kind,
        mid: mid,
        rtp: rtp,
        mediaCryptex: mediaCryptex,
        applies: rtp && (sessionCryptex || mediaCryptex),
        extmaps: extmaps,
      };
    });
    return {
      sessionCryptex: sessionCryptex,
      media: media,
      hasCryptexLine: /(^|\n)a=cryptex\r?$/m.test(sdp),
    };
  }

  // What a signalling server / middlebox that drops unknown attributes would do.
  function stripCryptex(sdp) {
    return splitLines(sdp).filter(function (l) {
      return l !== "a=cryptex";
    }).join("\r\n") + "\r\n";
  }

  function makePc(policy) {
    var cfg = {};
    if (policy) cfg.rtpHeaderEncryptionPolicy = policy;
    return new RTCPeerConnection(cfg);
  }

  // Synthetic media: a canvas animation + an oscillator. No camera/mic permission needed.
  function makeMediaStream(opts) {
    opts = opts || {};
    var tracks = [];
    var cleanup = [];
    if (opts.video !== false) {
      var canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 120;
      var ctx = canvas.getContext("2d");
      var raf = 0, t = 0;
      var draw = function () {
        t++;
        ctx.fillStyle = "rgb(20,20,20)";
        ctx.fillRect(0, 0, 160, 120);
        ctx.fillStyle = "rgb(0,153,102)";
        ctx.fillRect((t * 3) % 160, 40, 30, 30);
        raf = requestAnimationFrame(draw);
      };
      draw();
      tracks.push(canvas.captureStream(15).getVideoTracks()[0]);
      cleanup.push(function () {
        cancelAnimationFrame(raf);
      });
    }
    var audioCtx = null, gain = null;
    if (opts.audio !== false) {
      audioCtx = new AudioContext();
      var osc = audioCtx.createOscillator();
      osc.frequency.value = 330;
      gain = audioCtx.createGain();
      gain.gain.value = opts.gain == null ? 0.5 : opts.gain;
      var dest = audioCtx.createMediaStreamDestination();
      osc.connect(gain).connect(dest);
      osc.start();
      tracks.push(dest.stream.getAudioTracks()[0]);
      cleanup.push(function () {
        try {
          osc.stop();
        } catch (e) { /* already stopped */ }
        audioCtx.close();
      });
    }
    var stream = new MediaStream(tracks);
    return {
      stream: stream,
      gain: gain,
      audioCtx: audioCtx,
      stop: function () {
        stream.getTracks().forEach(function (tr) {
          tr.stop();
        });
        cleanup.forEach(function (fn) {
          fn();
        });
      },
    };
  }

  function exchangeIce(pc1, pc2) {
    pc1.onicecandidate = function (e) {
      if (e.candidate) pc2.addIceCandidate(e.candidate).catch(function () {});
    };
    pc2.onicecandidate = function (e) {
      if (e.candidate) pc1.addIceCandidate(e.candidate).catch(function () {});
    };
  }

  // Run offer/answer between two in-page peers. `tamperAnswer(sdp)` lets a page model a
  // signalling path that rewrites the answer before the offerer sees it.
  async function negotiate(pc1, pc2, opts) {
    opts = opts || {};
    var log = [];
    await pc1.setLocalDescription();
    log.push({ step: "offer", sdp: pc1.localDescription.sdp });
    await pc2.setRemoteDescription(pc1.localDescription);
    await pc2.setLocalDescription();
    log.push({ step: "answer", sdp: pc2.localDescription.sdp });
    var answerSdp = pc2.localDescription.sdp;
    if (opts.tamperAnswer) answerSdp = opts.tamperAnswer(answerSdp);
    await pc1.setRemoteDescription({ type: "answer", sdp: answerSdp });
    log.push({ step: "answer-as-delivered", sdp: answerSdp });
    return log;
  }

  function waitConnected(pc, ms) {
    return new Promise(function (resolve, reject) {
      if (pc.connectionState === "connected") return resolve();
      var to = setTimeout(function () {
        reject(new Error("connection timed out in state " + pc.connectionState));
      }, ms || 10000);
      pc.addEventListener("connectionstatechange", function h() {
        if (pc.connectionState === "connected") {
          clearTimeout(to);
          pc.removeEventListener("connectionstatechange", h);
          resolve();
        }
        if (pc.connectionState === "failed") {
          clearTimeout(to);
          reject(new Error("connection failed"));
        }
      });
    });
  }

  async function rtpCounters(pc) {
    var report = await pc.getStats();
    var out = { inbound: {}, outbound: {} };
    report.forEach(function (s) {
      if (s.type === "inbound-rtp") {
        out.inbound[s.kind] = {
          packetsReceived: s.packetsReceived || 0,
          headerBytesReceived: s.headerBytesReceived,
          bytesReceived: s.bytesReceived,
        };
      }
      if (s.type === "outbound-rtp") {
        out.outbound[s.kind] = {
          packetsSent: s.packetsSent || 0,
          headerBytesSent: s.headerBytesSent,
          bytesSent: s.bytesSent,
        };
      }
    });
    return out;
  }

  function flagHelpHTML() {
    return "Enable it: launch Chrome/Canary with <code>--enable-blink-features=" + FLAG_NAME +
      "</code> (or <code>--enable-features=" + FLAG_NAME + "</code>), or turn on " +
      "<code>chrome://flags/#enable-experimental-web-platform-features</code>. There is no dedicated " +
      "chrome://flags entry; the Blink runtime feature <code>" + FLAG_NAME + "</code> is " +
      "<em>experimental</em> in runtime_enabled_features.json5.";
  }

  window.CryptexLab = {
    POLICIES: POLICIES,
    FLAG_NAME: FLAG_NAME,
    probeSupport: probeSupport,
    probeVocabulary: probeVocabulary,
    acceptedPolicies: acceptedPolicies,
    analyse: analyse,
    stripCryptex: stripCryptex,
    sections: sections,
    makePc: makePc,
    makeMediaStream: makeMediaStream,
    exchangeIce: exchangeIce,
    negotiate: negotiate,
    waitConnected: waitConnected,
    rtpCounters: rtpCounters,
    flagHelpHTML: flagHelpHTML,
  };
})();
