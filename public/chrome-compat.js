// Honest Chromium major-version detection for demo compatibility badges.
//
// Modern Web Guidance (privacy — Fingerprinting and User-Agent Reduction):
// never parse navigator.userAgent for a version string; use User-Agent
// Client Hints where a version is genuinely needed, and stay honest when
// the browser does not offer them.
//
// Returns the Chromium-family major version as a Number, or null when the
// browser does not say (no UA-CH support, or a UA-CH brand list with no
// Chromium-family entry). Callers MUST render an honest "version unknown"
// state for null rather than falling back to UA-string parsing.
globalThis.chromiumMajorVersion = function chromiumMajorVersion() {
  const uad = globalThis.navigator && globalThis.navigator.userAgentData;
  if (!uad || !Array.isArray(uad.brands)) return null;
  const brand = uad.brands.find((b) => /^(Google Chrome|Chromium|Microsoft Edge)$/.test(b.brand));
  return brand ? Number(brand.version) || null : null;
};
