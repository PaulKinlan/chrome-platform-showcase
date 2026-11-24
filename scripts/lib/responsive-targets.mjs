// Pure helpers for expanding responsive-check targets (feature indexes and
// optionally their concept pages) and rolling per-page verdicts back up to
// per-feature support records.
//
// Side-effect-free so both `scripts/responsive-check.mjs` and unit tests can
// import it directly.

function normalizeRoute(route, fallbackId) {
  const raw = route || `/${fallbackId}/`;
  const trimmed = String(raw).replace(/^\/+|\/+$/g, "");
  return `/${trimmed}/`;
}

// Expand manifest entries (`{ id, route, concepts }`) into page-level check
// targets. When `includeConcepts` is false (default), only feature index pages
// are emitted; when true, each feature index is followed by every concept page
// beneath it (`/${entry.id}/${concept}/`).
export function expandResponsiveTargets(entries, { includeConcepts = false } = {}) {
  const targets = [];
  for (const entry of entries ?? []) {
    const featureId = entry.id;
    const indexRoute = normalizeRoute(entry.route, featureId);
    targets.push({
      featureId,
      pageId: featureId,
      route: indexRoute,
      isConcept: false,
    });
    if (includeConcepts && Array.isArray(entry.concepts)) {
      for (const concept of entry.concepts) {
        if (!concept) continue;
        targets.push({
          featureId,
          pageId: `${featureId}/${concept}`,
          route: `/${featureId}/${concept}/`,
          isConcept: true,
        });
      }
    }
  }
  return targets;
}

function extractOutcome(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.outcome === "string") {
    return value.outcome;
  }
  return undefined;
}

function isConceptPage(page) {
  if (typeof page.isConcept === "boolean") return page.isConcept;
  if (typeof page.pageId === "string" && page.pageId !== page.featureId) return true;
  return false;
}

function conceptSlugFor(page) {
  if (typeof page.concept === "string" && page.concept.length > 0) return page.concept;
  const prefix = `${page.featureId}/`;
  if (typeof page.pageId === "string" && page.pageId.startsWith(prefix)) {
    return page.pageId.slice(prefix.length);
  }
  return page.pageId ?? page.route ?? "unknown";
}

function lookupConceptCount(conceptCounts, featureId) {
  if (!conceptCounts) return undefined;
  if (conceptCounts instanceof Map) return conceptCounts.get(featureId);
  if (Object.hasOwn(conceptCounts, featureId)) return conceptCounts[featureId];
  return undefined;
}

// Roll up a single device class across every checked page belonging to a
// feature. Precedence: broken > blocked > ok. A feature is only `ok` on a
// class when every checked page for that feature returned `ok` on that class.
function rollupClassOutcome(pages, cls) {
  const raw = pages.map((p) => extractOutcome(p[cls]));
  if (raw.every((o) => o === undefined)) return undefined;
  let hasBroken = false;
  let hasBlocked = false;
  let allOk = true;
  for (const outcome of raw) {
    if (outcome === "broken") {
      hasBroken = true;
      allOk = false;
    } else if (outcome === "blocked" || outcome === undefined) {
      hasBlocked = true;
      allOk = false;
    } else if (outcome !== "ok") {
      hasBlocked = true;
      allOk = false;
    }
  }
  if (hasBroken) return "broken";
  if (hasBlocked) return "blocked";
  return allOk ? "ok" : "blocked";
}

// Aggregate per-page `{ featureId, pageId?, isConcept?, desktop, mobile, ... }`
// results back into per-feature records:
//   { [featureId]: { desktop, mobile, conceptCount, conceptsChecked,
//                    failedConcepts, lastChecked, source } }
export function rollupFeatureSupport(pageResults, options = {}) {
  const grouped = new Map();
  for (const page of pageResults ?? []) {
    if (!page?.featureId) continue;
    if (!grouped.has(page.featureId)) grouped.set(page.featureId, []);
    grouped.get(page.featureId).push(page);
  }

  const defaultDate = options.lastChecked ?? new Date().toISOString().slice(0, 10);
  const defaultSource = options.source ?? "harness";
  const out = {};

  for (const [featureId, pages] of grouped.entries()) {
    const desktop = rollupClassOutcome(pages, "desktop");
    const mobile = rollupClassOutcome(pages, "mobile");

    let conceptsChecked = 0;
    const failedConcepts = new Set();
    let lastChecked = null;
    let source = null;

    for (const page of pages) {
      if (page.lastChecked && (!lastChecked || page.lastChecked > lastChecked)) {
        lastChecked = page.lastChecked;
      }
      if (!source && page.source) source = page.source;

      if (isConceptPage(page)) {
        conceptsChecked++;
        const d = extractOutcome(page.desktop);
        const m = extractOutcome(page.mobile);
        if (d === "broken" || m === "broken") {
          failedConcepts.add(conceptSlugFor(page));
        }
      }
    }

    const knownCount = lookupConceptCount(options.conceptCounts, featureId);
    const conceptCount = typeof knownCount === "number" ? knownCount : conceptsChecked;

    out[featureId] = {
      desktop,
      mobile,
      conceptCount,
      conceptsChecked,
      failedConcepts: [...failedConcepts],
      lastChecked: lastChecked ?? defaultDate,
      source: source ?? defaultSource,
    };
  }

  return out;
}

// Convert rolled-up per-feature verdicts into the payload shape accepted by
// `scripts/responsive-support.mjs merge`. Only definite `ok`/`broken` outcomes
// are emitted; `blocked` classes are omitted so existing sidecar classes stay
// untouched.
export function toSidecarUpdates(rolledUp) {
  const updates = {};
  for (const [featureId, rec] of Object.entries(rolledUp ?? {})) {
    const entry = {
      source: rec.source ?? "harness",
      lastChecked: rec.lastChecked,
    };
    if (rec.desktop === "ok" || rec.desktop === "broken") entry.desktop = rec.desktop;
    if (rec.mobile === "ok" || rec.mobile === "broken") entry.mobile = rec.mobile;
    if (entry.desktop || entry.mobile) updates[featureId] = entry;
  }
  return updates;
}
