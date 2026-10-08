// Public-JWK projection for the fixtures that retain a caller-supplied key.
//
// WebCrypto's importKey ignores every JWK property it does not need, so a body
// can carry arbitrary extras — a multi-hundred-kilobyte "junk" string, an "alg",
// a nested object — and a fixture that stores the parsed object keeps them for
// the whole lifetime of the session record without ever reading them. Measured
// in the SPC browser-bound-key fixture: two 500 KB extras retained per
// enrollment, against the 1 MiB request-body ceiling and the 512-entry store
// cap, which is roughly a megabyte per enrollment of pure padding.
//
// Only kty/crv/x/y are ever consumed: the existing thumbprint hashes exactly
// those four fields, and importKey needs no others for a P-256 public key. So
// projecting to them removes the retention path while leaving every behaviour
// (import, signature verification, thumbprints) byte-identical.

/** The only JWK fields any of these fixtures reads. */
export const P256_PUBLIC_JWK_FIELDS = ["kty", "crv", "x", "y"] as const;

/**
 * Returns a new object carrying only the fields the fixtures consume, so a
 * caller-supplied extra property cannot be stored on a session record.
 */
export function p256PublicJwkForStorage(jwk: JsonWebKey): JsonWebKey {
  return { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
}
