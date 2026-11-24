// Shared Secure Payment Confirmation browser-bound key verifier backend.
// Mounted by v135 and v145 `_server.ts` sidecars so both milestones share
// one bounded enrollment store and verbatim signature-verification logic.

import { p256PublicJwkForStorage } from "../jwk.ts";
import { readBoundedText } from "../request-body.ts";
import { BoundedSessionStore } from "../session-store.ts";
import {
  base64UrlDecode,
  base64UrlEncode,
  DEMO_BODY_LIMIT,
  jsonResponse,
  parseCookies,
  randomBase64Url,
  toArrayBuffer,
} from "./http-helpers.ts";

interface SpcBbkEvent {
  at: string;
  type: string;
  detail: string;
}

interface SpcBbkEnrollment {
  id: string;
  version: string;
  deviceName: string;
  createdAt: string;
  passkeyPublicJwk: JsonWebKey;
  browserBoundPublicJwk: JsonWebKey;
  pendingPayload: string | null;
  events: SpcBbkEvent[];
}

const SPC_BBK_COOKIE = "showcase_spc_bbk";

// Display-length bound for the device label an enrollment keeps. The caller
// controls deviceName up to the 1 MiB DEMO_BODY_LIMIT, it is retained for the
// enrollment's lifetime, and both /enroll and /state echo it back — so without a
// bound a full store (512 entries, 1e5) can park hundreds of megabytes of
// label. The demo client only ever sends a short label (its longest is
// "Primary checkout browser"), so bounding the retained value costs nothing.
const SPC_BBK_DEVICE_NAME_MAX_LENGTH = 128;
const spcBbkEnrollments = new BoundedSessionStore<SpcBbkEnrollment>();

function spcBbkBasePath(req: Request): string {
  return new URL(req.url).pathname.match(/^\/v\d+\/secure-payment-confirmation-browser-bound-keys/)
    ?.[0] ?? "/v145/secure-payment-confirmation-browser-bound-keys";
}

function spcBbkCookieAttributes(req: Request, maxAge: number): string {
  const { protocol } = new URL(req.url);
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? protocol.replace(":", "");
  const secure = forwardedProto === "https" ? "; Secure" : "";
  return `Path=${spcBbkBasePath(req)}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function spcBbkEvent(enrollment: SpcBbkEnrollment, type: string, detail: string) {
  enrollment.events.unshift({ at: new Date().toISOString(), type, detail });
  enrollment.events = enrollment.events.slice(0, 20);
}

function getSpcBbkEnrollment(req: Request, body: Record<string, unknown> = {}) {
  const id = String(body.enrollmentId ?? parseCookies(req).get(SPC_BBK_COOKIE) ?? "");
  return id ? spcBbkEnrollments.get(id) ?? null : null;
}

async function importSpcBbkPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
}

async function verifySpcBbkSignature(
  publicJwk: JsonWebKey,
  signature: string,
  payload: string,
): Promise<boolean> {
  const key = await importSpcBbkPublicKey(publicJwk);
  return await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    toArrayBuffer(base64UrlDecode(signature)),
    new TextEncoder().encode(payload),
  );
}

function spcBbkJwkThumbprint(jwk: JsonWebKey): string {
  return base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y })),
  ).slice(0, 18);
}

// Keeps the stored label a display string: the first SPC_BBK_DEVICE_NAME_MAX_LENGTH
// characters of whatever the caller sent, with the fixture's default when the
// body omits the field. A longer label is truncated rather than rejected, so a
// caller with a verbose name still enrolls.
function spcBbkDeviceName(value: unknown): string {
  return String(value ?? "Primary browser").slice(0, SPC_BBK_DEVICE_NAME_MAX_LENGTH);
}

function spcBbkEnrollmentState(enrollment: SpcBbkEnrollment | null) {
  if (!enrollment) return { enrolled: false };
  return {
    enrolled: true,
    enrollmentId: enrollment.id,
    version: enrollment.version,
    deviceName: enrollment.deviceName,
    createdAt: enrollment.createdAt,
    passkeyThumbprint: spcBbkJwkThumbprint(enrollment.passkeyPublicJwk),
    browserBoundThumbprint: spcBbkJwkThumbprint(enrollment.browserBoundPublicJwk),
    hasPendingPayload: Boolean(enrollment.pendingPayload),
    events: enrollment.events,
  };
}

type RequestJson =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response };

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

export async function handleSpcBbkRequest(
  req: Request,
  release: string,
  sub: string,
): Promise<Response | null> {
  if (!sub.startsWith("/secure-payment-confirmation-browser-bound-keys/")) return null;
  const route = sub.slice("/secure-payment-confirmation-browser-bound-keys".length);

  if (route === "/enroll" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    const passkeyPublicJwk = body.passkeyPublicJwk as JsonWebKey | undefined;
    const browserBoundPublicJwk = body.browserBoundPublicJwk as JsonWebKey | undefined;
    if (
      !passkeyPublicJwk?.x || !passkeyPublicJwk?.y || !browserBoundPublicJwk?.x ||
      !browserBoundPublicJwk?.y
    ) {
      return jsonResponse({
        error: "passkeyPublicJwk and browserBoundPublicJwk must be P-256 public JWKs.",
      }, { status: 400 });
    }

    try {
      await importSpcBbkPublicKey(passkeyPublicJwk);
      await importSpcBbkPublicKey(browserBoundPublicJwk);
    } catch (err) {
      return jsonResponse({ error: `Public key import failed: ${err}` }, { status: 400 });
    }

    const enrollment: SpcBbkEnrollment = {
      id: randomBase64Url(18),
      version: release,
      deviceName: spcBbkDeviceName(body.deviceName),
      createdAt: new Date().toISOString(),
      passkeyPublicJwk: p256PublicJwkForStorage(passkeyPublicJwk),
      browserBoundPublicJwk: p256PublicJwkForStorage(browserBoundPublicJwk),
      pendingPayload: null,
      events: [],
    };
    spcBbkEvent(enrollment, "enrolled", "Stored passkey and browser-bound public keys.");
    spcBbkEnrollments.set(enrollment.id, enrollment);

    const headers = new Headers();
    headers.set(
      "set-cookie",
      `${SPC_BBK_COOKIE}=${enrollment.id}; ${spcBbkCookieAttributes(req, 60 * 60 * 6)}`,
    );
    return jsonResponse({
      message: "Enrollment stored. Server can now verify dual-signature payment assertions.",
      ...spcBbkEnrollmentState(enrollment),
    }, { headers });
  }

  if (route === "/state") {
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      const parsedBody = await requestJson(req);
      if (!parsedBody.ok) return parsedBody.response;
      body = parsedBody.value;
    }
    return jsonResponse(spcBbkEnrollmentState(getSpcBbkEnrollment(req, body)));
  }

  if (route === "/challenge" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    const enrollment = getSpcBbkEnrollment(req, body);
    if (!enrollment) {
      return jsonResponse({ error: "Enroll keys before requesting a payment challenge." }, {
        status: 404,
      });
    }
    const payment = {
      type: "payment.get",
      challenge: randomBase64Url(32),
      amount: String(body.amount ?? "49.99"),
      currency: String(body.currency ?? "GBP"),
      payeeName: String(body.payeeName ?? "Chrome Platform Store"),
      payeeOrigin: String(body.payeeOrigin ?? new URL(req.url).origin),
      rpId: new URL(req.url).hostname,
      enrollmentId: enrollment.id,
      issuedAt: new Date().toISOString(),
    };
    enrollment.pendingPayload = JSON.stringify(payment);
    spcBbkEvent(
      enrollment,
      "challenge",
      `Issued ${payment.currency} ${payment.amount} payment challenge.`,
    );
    return jsonResponse({
      message: "Payment challenge issued. Sign payload with both keys.",
      payload: enrollment.pendingPayload,
      payment,
      ...spcBbkEnrollmentState(enrollment),
    });
  }

  if (route === "/verify" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    const enrollment = getSpcBbkEnrollment(req, body);
    if (!enrollment) return jsonResponse({ error: "Enrollment not found." }, { status: 404 });
    const payload = String(body.payload ?? enrollment.pendingPayload ?? "");
    const passkeySignature = String(body.passkeySignature ?? "");
    const browserBoundSignature = String(body.browserBoundSignature ?? "");
    if (!payload || !passkeySignature || !browserBoundSignature) {
      return jsonResponse({
        error: "payload, passkeySignature, and browserBoundSignature are required.",
      }, { status: 400 });
    }

    let passkeyVerified = false;
    let browserBoundVerified = false;
    let error: string | null = null;
    try {
      passkeyVerified = await verifySpcBbkSignature(
        enrollment.passkeyPublicJwk,
        passkeySignature,
        payload,
      );
      browserBoundVerified = await verifySpcBbkSignature(
        enrollment.browserBoundPublicJwk,
        browserBoundSignature,
        payload,
      );
    } catch (err) {
      error = String(err);
    }

    const accepted = passkeyVerified && browserBoundVerified;
    spcBbkEvent(
      enrollment,
      accepted ? "verify-ok" : "verify-rejected",
      accepted
        ? "Both passkey and browser-bound signatures verified."
        : `passkey=${passkeyVerified}, browserBound=${browserBoundVerified}`,
    );
    if (accepted && payload === enrollment.pendingPayload) enrollment.pendingPayload = null;
    return jsonResponse({
      accepted,
      passkeyVerified,
      browserBoundVerified,
      error,
      expectedBrowserBoundThumbprint: spcBbkJwkThumbprint(enrollment.browserBoundPublicJwk),
      ...spcBbkEnrollmentState(enrollment),
    }, { status: accepted ? 200 : 403 });
  }

  if (route === "/rotate" && req.method === "POST") {
    const parsedBody = await requestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.value;
    const enrollment = getSpcBbkEnrollment(req, body);
    const newBrowserBoundPublicJwk = body.newBrowserBoundPublicJwk as JsonWebKey | undefined;
    const payload = String(body.payload ?? "");
    const oldBrowserBoundSignature = String(body.oldBrowserBoundSignature ?? "");
    if (!enrollment) return jsonResponse({ error: "Enrollment not found." }, { status: 404 });
    if (
      !newBrowserBoundPublicJwk?.x || !newBrowserBoundPublicJwk?.y || !payload ||
      !oldBrowserBoundSignature
    ) {
      return jsonResponse({
        error: "newBrowserBoundPublicJwk, payload, and oldBrowserBoundSignature are required.",
      }, { status: 400 });
    }

    let oldKeyVerified = false;
    try {
      oldKeyVerified = await verifySpcBbkSignature(
        enrollment.browserBoundPublicJwk,
        oldBrowserBoundSignature,
        payload,
      );
      await importSpcBbkPublicKey(newBrowserBoundPublicJwk);
    } catch (err) {
      return jsonResponse({ error: `Rotation verification failed: ${err}` }, { status: 400 });
    }
    if (!oldKeyVerified) {
      spcBbkEvent(enrollment, "rotation-rejected", "Old browser-bound key proof failed.");
      return jsonResponse({ error: "Old browser-bound key proof did not verify." }, {
        status: 403,
      });
    }

    enrollment.browserBoundPublicJwk = p256PublicJwkForStorage(newBrowserBoundPublicJwk);
    enrollment.pendingPayload = null;
    spcBbkEvent(enrollment, "rotated", "Browser-bound public key rotated after old-key proof.");
    return jsonResponse({
      message: "Browser-bound key rotated.",
      ...spcBbkEnrollmentState(enrollment),
    });
  }

  if (route === "/reset" && req.method === "POST") {
    const enrollment = getSpcBbkEnrollment(req);
    if (enrollment) spcBbkEnrollments.delete(enrollment.id);
    const headers = new Headers();
    headers.set("set-cookie", `${SPC_BBK_COOKIE}=; ${spcBbkCookieAttributes(req, 0)}`);
    return jsonResponse({ message: "SPC browser-bound key enrollment reset.", enrolled: false }, {
      headers,
    });
  }

  return null;
}
