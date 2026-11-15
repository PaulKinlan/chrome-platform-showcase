// Shared helpers for the "Web Authentication Conditional UI Passive Mode"
// concept pages. Everything here calls the real WebAuthn surface; nothing
// fabricates a credential or an assertion.
//
// Spec surface (w3c/webauthn PR #2485 + explainer "Conditional UI without
// Autofill"):
//   navigator.credentials.get({ mediation: 'conditional', uiMode: 'passive', publicKey })
//   PublicKeyCredential.getClientCapabilities() -> { conditionalPassiveGet, conditionalActiveGet, ... }
//
// Chromium vocabulary note (observed, Chromium 153 with
// --enable-features=WebAuthenticationAmbientSignin): the capability key is
// reported as "ambientGet" — the prototype's original name — while the spec PR
// and Chromium main use "conditionalPassiveGet". We read BOTH and say which one
// answered, so a renamed key never falls into a stale "unsupported" branch.

export const FLAG_URL = "chrome://flags/#web-authentication-ambient-signin";
export const FEATURE_SWITCH = "--enable-features=WebAuthenticationAmbientSignin";
export const PASSIVE_KEYS = ["conditionalPassiveGet", "ambientGet"];

export function hasWebAuthn() {
  return typeof globalThis.PublicKeyCredential === "function" &&
    typeof navigator.credentials?.get === "function";
}

/**
 * Reads PublicKeyCredential.getClientCapabilities() and classifies passive-mode
 * support. Returns { available, caps, error, passive, passiveKey, active,
 * conditionalGet, immediateGet }. `passive` is true/false/null (null = unknown:
 * the capability method itself is missing or threw).
 */
export async function readCapabilities() {
  const out = {
    available: false,
    caps: null,
    error: null,
    passive: null,
    passiveKey: null,
    active: null,
    conditionalGet: null,
    immediateGet: null,
  };
  if (!hasWebAuthn()) {
    out.error = "PublicKeyCredential is not defined (insecure context or no WebAuthn).";
    return out;
  }
  if (typeof PublicKeyCredential.getClientCapabilities !== "function") {
    out.error = "PublicKeyCredential.getClientCapabilities is not a function in this browser.";
    return out;
  }
  try {
    const caps = await PublicKeyCredential.getClientCapabilities();
    out.available = true;
    out.caps = caps;
    for (const key of PASSIVE_KEYS) {
      if (Object.hasOwn(caps, key)) {
        out.passiveKey = key;
        out.passive = caps[key] === true;
        break;
      }
    }
    if (out.passiveKey === null) out.passive = false;
    out.active = Object.hasOwn(caps, "conditionalActiveGet")
      ? caps.conditionalActiveGet === true
      : null;
    out.conditionalGet = Object.hasOwn(caps, "conditionalGet")
      ? caps.conditionalGet === true
      : null;
    out.immediateGet = Object.hasOwn(caps, "immediateGet") ? caps.immediateGet === true : null;
  } catch (error) {
    out.error = `getClientCapabilities() rejected: ${error.name}: ${error.message}`;
  }
  return out;
}

export function randomChallenge(len = 32) {
  return crypto.getRandomValues(new Uint8Array(len));
}

export function b64url(buffer) {
  const bytes = buffer instanceof ArrayBuffer
    ? new Uint8Array(buffer)
    : new Uint8Array(buffer.buffer ?? buffer);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decodes the parts of a real assertion that can be read client-side. */
export function describeAssertion(cred, expectedChallenge) {
  if (!cred) return { kind: "null" };
  if (cred.type === "password") {
    return {
      kind: "password",
      id: cred.id,
      note: "PasswordCredential returned (password: true). The password value is never printed.",
    };
  }
  if (cred.type !== "public-key") return { kind: cred.type };
  const r = cred.response;
  let clientData = null;
  try {
    clientData = JSON.parse(new TextDecoder().decode(r.clientDataJSON));
  } catch { /* leave null */ }
  const authData = new Uint8Array(r.authenticatorData);
  const flags = authData[32] ?? 0;
  const signCount = authData.length >= 37
    ? new DataView(authData.buffer, authData.byteOffset + 33, 4).getUint32(0)
    : null;
  const challengeMatches = clientData && expectedChallenge
    ? clientData.challenge === b64url(expectedChallenge)
    : null;
  let userHandle = null;
  if (r.userHandle && r.userHandle.byteLength) {
    try {
      userHandle = new TextDecoder("utf-8", { fatal: true }).decode(r.userHandle);
    } catch {
      userHandle = b64url(r.userHandle);
    }
  }
  return {
    kind: "public-key",
    id: cred.id,
    authenticatorAttachment: cred.authenticatorAttachment ?? null,
    clientData,
    challengeMatches,
    flags: {
      UP: Boolean(flags & 0x01),
      UV: Boolean(flags & 0x04),
      BE: Boolean(flags & 0x08),
      BS: Boolean(flags & 0x10),
    },
    signCount,
    signatureBytes: r.signature.byteLength,
    userHandle,
  };
}

export function formatAssertion(d) {
  if (d.kind === "password") return `PasswordCredential id=${d.id}\n${d.note}`;
  if (d.kind !== "public-key") return `credential kind: ${d.kind}`;
  return [
    `PublicKeyCredential id: ${d.id}`,
    `authenticatorAttachment: ${d.authenticatorAttachment}`,
    `clientDataJSON.type: ${d.clientData?.type}`,
    `clientDataJSON.origin: ${d.clientData?.origin}`,
    `challenge echoed back matches the one we sent: ${d.challengeMatches}`,
    `authenticatorData flags: UP=${d.flags.UP} UV=${d.flags.UV} BE=${d.flags.BE} BS=${d.flags.BS}`,
    `signCount: ${d.signCount}`,
    `signature: ${d.signatureBytes} bytes (NOT verified here — no relying-party server in this demo)`,
    `userHandle: ${d.userHandle ?? "(none)"}`,
  ].join("\n");
}

/** Creates a real discoverable credential (passkey) for this origin. */
export async function createDemoPasskey(username, displayName) {
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { name: "Chrome platform showcase (passive mode demo)" },
      user: {
        // Demo only: the handle is the username bytes so it can be shown back.
        // A real RP uses a random, non-identifying user handle.
        id: new TextEncoder().encode(username),
        name: username,
        displayName: displayName || username,
      },
      challenge: randomChallenge(),
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
      timeout: 120000,
    },
  });
  rememberPasskey({ id: cred.id, username, createdAt: new Date().toISOString() });
  return cred;
}

const STORE_KEY = "wa-passive-demo-passkeys";
export function rememberedPasskeys() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}
function rememberPasskey(entry) {
  try {
    const list = rememberedPasskeys().filter((e) => e.id !== entry.id);
    list.push(entry);
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(-10)));
  } catch { /* storage blocked: the passkey still exists in the authenticator */ }
}

/**
 * Starts one real passive-mode conditional request. Returns a handle with the
 * promise, the challenge, and abort(). The promise never resolves on its own
 * when there are no credentials — callers must keep (and offer) abort().
 */
export function startPassiveRequest({ password = false, uiMode = "passive" } = {}) {
  const controller = new AbortController();
  const challenge = randomChallenge();
  const options = {
    mediation: "conditional",
    publicKey: { challenge, userVerification: "preferred" },
    signal: controller.signal,
  };
  if (uiMode !== null) options.uiMode = uiMode;
  if (password) options.password = true;
  const startedAt = performance.now();
  const promise = navigator.credentials.get(options);
  return {
    promise,
    challenge,
    startedAt,
    abort: (reason) => controller.abort(reason),
    controller,
  };
}

/**
 * Outcome of a get() call within `ms`, then aborts it. Used only by probes that
 * must not leave a request pending.
 */
export async function settleWithin(options, ms = 800) {
  const controller = new AbortController();
  const started = performance.now();
  let promise;
  try {
    promise = navigator.credentials.get({ ...options, signal: controller.signal });
  } catch (error) {
    return { state: "threw-sync", name: error.name, message: error.message, ms: 0 };
  }
  const result = await Promise.race([
    promise.then(
      (v) => ({ state: "resolved", value: v }),
      (e) => ({ state: "rejected", name: e.name, message: e.message }),
    ),
    new Promise((r) => setTimeout(() => r({ state: "pending" }), ms)),
  ]);
  result.ms = Math.round(performance.now() - started);
  controller.abort();
  await promise.catch(() => {});
  return result;
}

export function outcomeText(o) {
  if (o.state === "pending") return `still pending after ${o.ms} ms (then aborted by this page)`;
  if (o.state === "resolved") return `RESOLVED after ${o.ms} ms with ${o.value?.type ?? o.value}`;
  if (o.state === "threw-sync") return `threw synchronously: ${o.name}: ${o.message}`;
  return `rejected after ${o.ms} ms: ${o.name}: ${o.message}`;
}

/**
 * Differential probe for the renderer-side passive branch. The explainer and
 * Chromium both reject passive mode combined with a credential type it cannot
 * show in the ambient surface (federated/identity/otp). We send the SAME
 * request twice — once with uiMode:'passive', once without — and compare. If
 * the outcomes differ, uiMode:'passive' changed the code path. Identical
 * outcomes mean the value was accepted but had no effect (no false positive
 * from a merely-valid enum value).
 */
export async function differentialProbe() {
  const base = () => ({
    mediation: "conditional",
    publicKey: { challenge: randomChallenge() },
    federated: { providers: ["https://idp.example"] },
  });
  const control = await settleWithin(base(), 700);
  const passive = await settleWithin({ ...base(), uiMode: "passive" }, 700);
  const key = (o) => `${o.state}|${o.name ?? ""}|${o.message ?? ""}`;
  return { control, passive, differs: key(control) !== key(passive) };
}
