// Honest feature detection for the `import defer` grammar.
//
// The only truthful way to know whether a browser parses new syntax is to make
// it try. We import a tiny module whose whole body is an `import defer`
// statement (as a data: URL, so detection needs no extra network round trip and
// never pollutes the real module map). A browser that understands the grammar
// resolves it; one that does not throws a SyntaxError at parse time. We report
// the actual reason rather than sniffing navigator.userAgent.

const PROBE_SOURCE = 'import defer * as ns from "data:text/javascript,export const ok = true;";' +
  "export const tag = ns[Symbol.toStringTag];" +
  "export const ok = true;";

let cached = null;

export async function detectImportDefer() {
  if (cached) return cached;
  const url = "data:text/javascript," + encodeURIComponent(PROBE_SOURCE);
  try {
    const mod = await import(url);
    cached = {
      supported: true,
      tag: mod.tag ?? null,
      reason: "the import defer statement parsed and evaluated",
    };
  } catch (error) {
    const name = error && error.name ? error.name : "Error";
    const message = error && error.message ? error.message : String(error);
    // A SyntaxError is the definitive "this grammar is not understood" signal.
    // Any other error means the grammar parsed but the tiny probe module failed
    // to load (e.g. a data:-URL import restriction) — the syntax IS supported.
    if (name === "SyntaxError") {
      cached = { supported: false, tag: null, reason: name + ": " + message };
    } else {
      cached = {
        supported: true,
        tag: null,
        reason: "grammar parsed; probe module load reported " + name + ": " + message,
      };
    }
  }
  return cached;
}
