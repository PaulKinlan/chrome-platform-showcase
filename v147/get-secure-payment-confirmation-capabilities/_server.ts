// Co-located feature server for v147/get-secure-payment-confirmation-capabilities:
// handles the SPC/WebAuthn auth-flow verifier API and the SPC checkout-flow orders API.

import {
  base64UrlDecode,
  base64UrlEncode,
  DEMO_BODY_LIMIT,
  jsonResponse,
  parseCookies,
  randomBase64Url,
  toArrayBuffer,
} from "../../lib/feature-servers/http-helpers.ts";
import { readBoundedText } from "../../lib/request-body.ts";
import { BoundedSessionStore } from "../../lib/session-store.ts";

type CborValue =
  | number
  | string
  | Uint8Array
  | CborValue[]
  | Map<CborValue, CborValue>
  | boolean
  | null;

interface CborReadResult {
  value: CborValue;
  offset: number;
}

interface SpcAuthCredential {
  id: string;
  rawId: string;
  rpId: string;
  publicKeyJwk: JsonWebKey;
  signCount: number;
  createdAt: string;
  extensionResults: Record<string, unknown>;
}

interface SpcAuthSession {
  id: string;
  userId: string;
  userName: string;
  registerChallenge: string | null;
  authChallenge: string | null;
  rpId: string;
  credential: SpcAuthCredential | null;
  payment: {
    amount: string;
    currency: string;
    merchant: string;
    createdAt: string;
  } | null;
  events: { at: string; event: string; detail: string }[];
}

type RequestJson =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response };

const SPC_AUTH_COOKIE = "showcase_spc_auth";
const spcAuthSessions = new BoundedSessionStore<SpcAuthSession>();
const spcCheckoutOrders: Record<string, unknown>[] = [];

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function webAuthnRpId(req: Request): string {
  const host = new URL(req.url).hostname;
  return host === "0.0.0.0" ? "localhost" : host;
}

async function requestJson(req: Request): Promise<RequestJson> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return { ok: true, value: {} };
  }
  const text = await readBoundedText(req, DEMO_BODY_LIMIT);
  if (!text.ok) return text;
  try {
    return { ok: true, value: JSON.parse(text.text) as Record<string, unknown> };
  } catch {
    return { ok: true, value: {} };
  }
}

function spcAuthCookieAttributes(req: Request, maxAge = 60 * 60 * 6): string {
  const { protocol } = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? protocol.replace(":", "");
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return `Path=/v147/get-secure-payment-confirmation-capabilities; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function getSpcAuthSession(req: Request): { session: SpcAuthSession; headers: Headers } {
  const headers = new Headers();
  const cookies = parseCookies(req);
  let id = cookies.get(SPC_AUTH_COOKIE);
  if (!id || !spcAuthSessions.has(id)) {
    id = randomBase64Url(18);
    const rpId = webAuthnRpId(req);
    spcAuthSessions.set(id, {
      id,
      userId: randomBase64Url(16),
      userName: "alice@example.com",
      registerChallenge: null,
      authChallenge: null,
      rpId,
      credential: null,
      payment: null,
      events: [],
    });
    headers.set("set-cookie", `${SPC_AUTH_COOKIE}=${id}; ${spcAuthCookieAttributes(req)}`);
  }
  return { session: spcAuthSessions.get(id)!, headers };
}

function recordSpcAuthEvent(session: SpcAuthSession, event: string, detail: string) {
  session.events.unshift({ at: new Date().toISOString(), event, detail });
  session.events = session.events.slice(0, 12);
}

function spcAuthPayload(session: SpcAuthSession): Record<string, unknown> {
  return {
    rpId: session.rpId,
    user: {
      id: session.userId,
      name: session.userName,
      displayName: session.userName,
    },
    hasCredential: Boolean(session.credential),
    credential: session.credential
      ? {
        id: session.credential.id,
        rawId: session.credential.rawId,
        rpId: session.credential.rpId,
        signCount: session.credential.signCount,
        createdAt: session.credential.createdAt,
        publicKey: {
          kty: session.credential.publicKeyJwk.kty,
          crv: session.credential.publicKeyJwk.crv,
          x: session.credential.publicKeyJwk.x,
          y: session.credential.publicKeyJwk.y,
        },
        extensionResults: session.credential.extensionResults,
      }
      : null,
    pendingRegisterChallenge: session.registerChallenge,
    pendingAuthChallenge: session.authChallenge,
    payment: session.payment,
    events: session.events,
  };
}

function readCborLength(bytes: Uint8Array, offset: number, additional: number): {
  value: number;
  offset: number;
} {
  if (additional < 24) return { value: additional, offset };
  if (additional === 24) return { value: bytes[offset], offset: offset + 1 };
  if (additional === 25) {
    return { value: (bytes[offset] << 8) | bytes[offset + 1], offset: offset + 2 };
  }
  if (additional === 26) {
    return {
      value: (bytes[offset] * 2 ** 24) + (bytes[offset + 1] << 16) +
        (bytes[offset + 2] << 8) + bytes[offset + 3],
      offset: offset + 4,
    };
  }
  throw new Error("Unsupported CBOR length encoding.");
}

function readCbor(bytes: Uint8Array, offset = 0): CborReadResult {
  if (offset >= bytes.length) throw new Error("Unexpected end of CBOR data.");
  const initial = bytes[offset++];
  const major = initial >> 5;
  const additional = initial & 0x1f;
  if (additional === 31) throw new Error("Indefinite-length CBOR is not supported.");

  if (major === 0 || major === 1) {
    const length = readCborLength(bytes, offset, additional);
    const unsigned = length.value;
    return { value: major === 0 ? unsigned : -1 - unsigned, offset: length.offset };
  }

  if (major === 2) {
    const length = readCborLength(bytes, offset, additional);
    const end = length.offset + length.value;
    return { value: bytes.slice(length.offset, end), offset: end };
  }

  if (major === 3) {
    const length = readCborLength(bytes, offset, additional);
    const end = length.offset + length.value;
    return { value: new TextDecoder().decode(bytes.slice(length.offset, end)), offset: end };
  }

  if (major === 4) {
    const length = readCborLength(bytes, offset, additional);
    const values: CborValue[] = [];
    let next = length.offset;
    for (let i = 0; i < length.value; i++) {
      const item = readCbor(bytes, next);
      values.push(item.value);
      next = item.offset;
    }
    return { value: values, offset: next };
  }

  if (major === 5) {
    const length = readCborLength(bytes, offset, additional);
    const map = new Map<CborValue, CborValue>();
    let next = length.offset;
    for (let i = 0; i < length.value; i++) {
      const key = readCbor(bytes, next);
      const value = readCbor(bytes, key.offset);
      map.set(key.value, value.value);
      next = value.offset;
    }
    return { value: map, offset: next };
  }

  if (major === 6) {
    const tagged = readCbor(bytes, readCborLength(bytes, offset, additional).offset);
    return { value: tagged.value, offset: tagged.offset };
  }

  if (major === 7) {
    if (additional === 20) return { value: false, offset };
    if (additional === 21) return { value: true, offset };
    if (additional === 22) return { value: null, offset };
  }

  throw new Error("Unsupported CBOR value.");
}

function getCborMapNumber(map: Map<CborValue, CborValue>, key: number): number | null {
  const value = map.get(key);
  return typeof value === "number" ? value : null;
}

function getCborMapBytes(map: Map<CborValue, CborValue>, key: number): Uint8Array | null {
  const value = map.get(key);
  return value instanceof Uint8Array ? value : null;
}

function coseEc2ToJwk(value: CborValue): JsonWebKey {
  if (!(value instanceof Map)) throw new Error("Credential public key is not a COSE map.");
  const kty = getCborMapNumber(value, 1);
  const alg = getCborMapNumber(value, 3);
  const crv = getCborMapNumber(value, -1);
  const x = getCborMapBytes(value, -2);
  const y = getCborMapBytes(value, -3);

  if (kty !== 2 || alg !== -7 || crv !== 1 || !x || !y) {
    throw new Error("Only ES256 P-256 WebAuthn credentials are supported by this demo verifier.");
  }

  return {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    ext: true,
  };
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function readSignCount(authenticatorData: Uint8Array): number {
  return (authenticatorData[33] * 2 ** 24) + (authenticatorData[34] << 16) +
    (authenticatorData[35] << 8) + authenticatorData[36];
}

async function rpIdHash(rpId: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(rpId)));
}

async function parseRegistrationResponse(
  req: Request,
  session: SpcAuthSession,
  body: Record<string, unknown>,
): Promise<SpcAuthCredential> {
  const response = objectValue(body.response);
  const clientDataBytes = base64UrlDecode(stringValue(response.clientDataJSON));
  const attestationBytes = base64UrlDecode(stringValue(response.attestationObject));
  const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  const expectedOrigin = new URL(req.url).origin;

  if (clientData.type !== "webauthn.create") {
    throw new Error("Expected webauthn.create client data.");
  }
  if (!session.registerChallenge || clientData.challenge !== session.registerChallenge) {
    throw new Error("Registration challenge did not match this server session.");
  }
  if (clientData.origin !== expectedOrigin) {
    throw new Error(`Origin mismatch: ${clientData.origin}`);
  }

  const attestation = readCbor(attestationBytes).value;
  if (!(attestation instanceof Map)) throw new Error("Attestation object was not a CBOR map.");
  const authData = attestation.get("authData");
  if (!(authData instanceof Uint8Array)) {
    throw new Error("Attestation object did not include authData.");
  }
  if (!bytesEqual(authData.slice(0, 32), await rpIdHash(session.rpId))) {
    throw new Error("Credential rpIdHash did not match the relying party ID.");
  }

  const flags = authData[32];
  if ((flags & 0x40) === 0) {
    throw new Error("Authenticator data did not include attested credential data.");
  }

  let offset = 37 + 16;
  const credentialIdLength = (authData[offset] << 8) | authData[offset + 1];
  offset += 2;
  const credentialId = authData.slice(offset, offset + credentialIdLength);
  offset += credentialIdLength;
  const cosePublicKey = readCbor(authData, offset).value;
  const publicKeyJwk = coseEc2ToJwk(cosePublicKey);
  const rawId = stringValue(body.rawId) || stringValue(body.id);
  const extensionResults = objectValue(body.clientExtensionResults);

  if (!bytesEqual(credentialId, base64UrlDecode(rawId))) {
    throw new Error("Credential ID in authenticator data did not match rawId.");
  }

  return {
    id: stringValue(body.id),
    rawId,
    rpId: session.rpId,
    publicKeyJwk,
    signCount: readSignCount(authData),
    createdAt: new Date().toISOString(),
    extensionResults,
  };
}

function normalizeEcdsaSignature(signature: Uint8Array): Uint8Array {
  if (signature.length === 64) return signature;
  if (signature[0] !== 0x30) throw new Error("ECDSA signature is not ASN.1 DER or raw P-1363.");
  let offset = 2;
  if (signature[1] & 0x80) offset = 2 + (signature[1] & 0x7f);
  if (signature[offset++] !== 0x02) throw new Error("Invalid DER ECDSA signature.");
  const rLength = signature[offset++];
  let r = signature.slice(offset, offset + rLength);
  offset += rLength;
  if (signature[offset++] !== 0x02) throw new Error("Invalid DER ECDSA signature.");
  const sLength = signature[offset++];
  let s = signature.slice(offset, offset + sLength);
  while (r.length > 32 && r[0] === 0) r = r.slice(1);
  while (s.length > 32 && s[0] === 0) s = s.slice(1);
  if (r.length > 32 || s.length > 32) throw new Error("ECDSA signature component too large.");
  const out = new Uint8Array(64);
  out.set(r, 32 - r.length);
  out.set(s, 64 - s.length);
  return out;
}

async function verifyWebAuthnAssertion(
  req: Request,
  session: SpcAuthSession,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!session.credential) throw new Error("Register a credential before authenticating.");
  const response = objectValue(body.response);
  const clientDataBytes = base64UrlDecode(stringValue(response.clientDataJSON));
  const authenticatorData = base64UrlDecode(stringValue(response.authenticatorData));
  const signature = base64UrlDecode(stringValue(response.signature));
  const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  const expectedOrigin = new URL(req.url).origin;

  if (clientData.type !== "webauthn.get") throw new Error("Expected webauthn.get client data.");
  if (!session.authChallenge || clientData.challenge !== session.authChallenge) {
    throw new Error("Authentication challenge did not match this server session.");
  }
  if (clientData.origin !== expectedOrigin) {
    throw new Error(`Origin mismatch: ${clientData.origin}`);
  }
  if (!bytesEqual(authenticatorData.slice(0, 32), await rpIdHash(session.credential.rpId))) {
    throw new Error("Assertion rpIdHash did not match the stored credential.");
  }

  const clientDataHash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", toArrayBuffer(clientDataBytes)),
  );
  const signedBytes = new Uint8Array(authenticatorData.byteLength + clientDataHash.byteLength);
  signedBytes.set(authenticatorData);
  signedBytes.set(clientDataHash, authenticatorData.byteLength);

  const key = await crypto.subtle.importKey(
    "jwk",
    session.credential.publicKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  const normalizedSignature = normalizeEcdsaSignature(signature);
  const verified = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    toArrayBuffer(normalizedSignature),
    signedBytes,
  );
  if (!verified) throw new Error("WebAuthn assertion signature verification failed.");

  const previousSignCount = session.credential.signCount;
  const signCount = readSignCount(authenticatorData);
  session.credential.signCount = signCount;
  return {
    verified,
    clientData,
    authenticatorData: base64UrlEncode(authenticatorData),
    signature: base64UrlEncode(signature),
    signCount,
    signCountAdvanced: signCount === 0 || previousSignCount === 0
      ? null
      : signCount > previousSignCount,
  };
}

async function renderSpcAuthRoute(req: Request, sub: string): Promise<Response | null> {
  const prefix = "/get-secure-payment-confirmation-capabilities/spc-auth-flow/api";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);
  const { session, headers } = getSpcAuthSession(req);

  if (route === "/state") return jsonResponse(spcAuthPayload(session), { headers });

  if (route === "/register-options" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    session.userName = stringValue(body.userName, session.userName);
    session.rpId = stringValue(body.rpId, webAuthnRpId(req)) || webAuthnRpId(req);
    session.registerChallenge = randomBase64Url(32);
    session.authChallenge = null;
    recordSpcAuthEvent(session, "register-options", "Issued server registration challenge.");
    return jsonResponse({
      publicKey: {
        challenge: session.registerChallenge,
        rp: { id: session.rpId, name: "Chrome Platform Showcase SPC" },
        user: {
          id: session.userId,
          name: session.userName,
          displayName: session.userName,
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }],
        authenticatorSelection: {
          authenticatorAttachment: stringValue(body.authenticatorAttachment, "platform"),
          residentKey: "preferred",
          userVerification: stringValue(body.userVerification, "required"),
        },
        timeout: 60000,
        attestation: "none",
        extensions: { payment: { isPayment: true } },
      },
      ...spcAuthPayload(session),
    }, { headers });
  }

  if (route === "/register" && req.method === "POST") {
    try {
      const parsedBody = await requestJson(req);
      if (!parsedBody.ok) return parsedBody.response;
      const body = parsedBody.value;
      session.credential = await parseRegistrationResponse(req, session, body);
      session.registerChallenge = null;
      recordSpcAuthEvent(session, "registered", "Stored ES256 credential public key.");
      return jsonResponse({ verified: true, ...spcAuthPayload(session) }, { headers });
    } catch (error) {
      recordSpcAuthEvent(session, "register-rejected", String((error as Error).message));
      return jsonResponse({ error: String((error as Error).message), ...spcAuthPayload(session) }, {
        status: 400,
        headers,
      });
    }
  }

  if (route === "/challenge-options" && req.method === "POST") {
    if (!session.credential) {
      return jsonResponse({ error: "Register a credential before requesting a challenge." }, {
        status: 409,
        headers,
      });
    }
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    session.authChallenge = randomBase64Url(32);
    session.payment = {
      amount: stringValue(body.amount, "$42.00"),
      currency: stringValue(body.currency, "USD"),
      merchant: stringValue(body.merchant, "ACME Store"),
      createdAt: new Date().toISOString(),
    };
    recordSpcAuthEvent(session, "challenge-options", "Issued server authentication challenge.");
    return jsonResponse({
      publicKey: {
        challenge: session.authChallenge,
        rpId: session.credential.rpId,
        allowCredentials: [{
          type: "public-key",
          id: session.credential.rawId,
          transports: ["internal", "hybrid", "usb", "nfc", "ble"],
        }],
        userVerification: stringValue(body.userVerification, "required"),
        timeout: 60000,
        extensions: {
          payment: {
            isPayment: true,
            payeeOrigin: new URL(req.url).origin,
            total: {
              currency: session.payment.currency,
              value: session.payment.amount,
            },
            instrument: { displayName: session.payment.merchant, icon: "" },
            rpId: session.credential.rpId,
          },
        },
      },
      ...spcAuthPayload(session),
    }, { headers });
  }

  if (route === "/verify" && req.method === "POST") {
    try {
      const parsedBody = await requestJson(req);
      if (!parsedBody.ok) return parsedBody.response;
      const body = parsedBody.value;
      const verification = await verifyWebAuthnAssertion(req, session, body);
      session.authChallenge = null;
      recordSpcAuthEvent(
        session,
        "verified",
        "Verified assertion signature with stored public key.",
      );
      return jsonResponse({ ...verification, ...spcAuthPayload(session) }, { headers });
    } catch (error) {
      recordSpcAuthEvent(session, "verify-rejected", String((error as Error).message));
      return jsonResponse({ error: String((error as Error).message), ...spcAuthPayload(session) }, {
        status: 400,
        headers,
      });
    }
  }

  if (route === "/reset" && req.method === "POST") {
    session.registerChallenge = null;
    session.authChallenge = null;
    session.credential = null;
    session.payment = null;
    session.events = [];
    return jsonResponse(spcAuthPayload(session), { headers });
  }

  return null;
}

async function renderSpcCheckoutRoute(req: Request, sub: string): Promise<Response | null> {
  const prefix = "/get-secure-payment-confirmation-capabilities/spc-checkout-flow/api";
  if (!sub.startsWith(prefix)) return null;
  const route = sub.slice(prefix.length);

  if (route === "/orders" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    const order = {
      id: `CPX-${randomBase64Url(5).toUpperCase()}`,
      method: stringValue(body.method, "card-fallback"),
      total: stringValue(body.total, "32.49"),
      currency: stringValue(body.currency, "GBP"),
      createdAt: new Date().toISOString(),
      storedBy: "chrome-platform-showcase backend",
    };
    spcCheckoutOrders.unshift(order);
    spcCheckoutOrders.splice(20);
    return jsonResponse({ order, recent: spcCheckoutOrders.slice(0, 5) });
  }

  return null;
}

export async function handleFeatureRequest(
  req: Request,
  sub: string,
): Promise<Response | null> {
  const spcAuthResponse = await renderSpcAuthRoute(req, sub);
  if (spcAuthResponse) return spcAuthResponse;
  return await renderSpcCheckoutRoute(req, sub);
}
