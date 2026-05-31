(function () {
  function basePath() {
    const match = location.pathname.match(
      /^\/v\d+\/secure-payment-confirmation-browser-bound-keys/,
    );
    return match ? match[0] : "/v145/secure-payment-confirmation-browser-bound-keys";
  }

  function encodeBase64Url(buffer) {
    let binary = "";
    for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  async function request(route, body = {}) {
    const response = await fetch(`${basePath()}${route}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      const error = new Error(json.error || response.statusText);
      error.response = json;
      throw error;
    }
    return json;
  }

  async function generateKeyPair() {
    return await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
  }

  async function exportPublicJwk(pair) {
    return await crypto.subtle.exportKey("jwk", pair.publicKey);
  }

  async function signPayload(privateKey, payload) {
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      new TextEncoder().encode(payload),
    );
    return encodeBase64Url(signature);
  }

  async function enroll(deviceName, keys = {}) {
    const passkey = keys.passkey || await generateKeyPair();
    const browserBound = keys.browserBound || await generateKeyPair();
    const result = await request("/enroll", {
      deviceName,
      passkeyPublicJwk: await exportPublicJwk(passkey),
      browserBoundPublicJwk: await exportPublicJwk(browserBound),
    });
    return { result, passkey, browserBound };
  }

  async function challenge(enrollmentId, payment = {}) {
    return await request("/challenge", { enrollmentId, ...payment });
  }

  async function verify(enrollmentId, payload, passkey, browserBound) {
    return await request("/verify", {
      enrollmentId,
      payload,
      passkeySignature: await signPayload(passkey.privateKey, payload),
      browserBoundSignature: await signPayload(browserBound.privateKey, payload),
    });
  }

  async function verifyWithSignatures(
    enrollmentId,
    payload,
    passkeySignature,
    browserBoundSignature,
  ) {
    return await request("/verify", {
      enrollmentId,
      payload,
      passkeySignature,
      browserBoundSignature,
    });
  }

  async function rotate(enrollmentId, oldBrowserBound, newBrowserBound, payload) {
    return await request("/rotate", {
      enrollmentId,
      payload,
      oldBrowserBoundSignature: await signPayload(oldBrowserBound.privateKey, payload),
      newBrowserBoundPublicJwk: await exportPublicJwk(newBrowserBound),
    });
  }

  async function reset() {
    return await request("/reset");
  }

  function supported() {
    return Boolean(globalThis.crypto?.subtle);
  }

  window.spcBbkLive = {
    basePath,
    challenge,
    encodeBase64Url,
    enroll,
    exportPublicJwk,
    generateKeyPair,
    request,
    reset,
    rotate,
    signPayload,
    supported,
    verify,
    verifyWithSignatures,
  };
})();
