// Structured experiment metadata (`page.json`) and friction ledger model.
//
// Each concept page (`v<N>/<feature-slug>/<concept-slug>/`) may carry an
// optional `page.json` describing what kind of experiment it is, the question
// it asks, the observed result, what APIs it exercises or composes with, and
// any platform friction discovered while building it.
//
// All filesystem access goes through `platform()` from `lib/platform.ts` so
// this module works identically on Node and on Cloudflare Workers (where
// `page.json` files are served from `_worker/bundle-page.json`).

import { type Platform, platform } from "./platform.ts";

export type ExperimentKind =
  | "starter"
  | "experiment"
  | "stress"
  | "composition"
  | "migration";

export type FrictionKind =
  | "browser-bug"
  | "spec-mismatch"
  | "platform-limit"
  | "interop-gap"
  | "ergonomics";

export const EXPERIMENT_KINDS: readonly ExperimentKind[] = [
  "starter",
  "experiment",
  "stress",
  "composition",
  "migration",
];

export const FRICTION_KINDS: readonly FrictionKind[] = [
  "browser-bug",
  "spec-mismatch",
  "platform-limit",
  "interop-gap",
  "ergonomics",
];

const EXPERIMENT_KIND_SET = new Set<string>(EXPERIMENT_KINDS);
const FRICTION_KIND_SET = new Set<string>(FRICTION_KINDS);

export interface FrictionEntry {
  summary: string;
  kind: FrictionKind;
  repro?: string;
  browser?: string;
  issueUrl?: string;
  workaround?: string;
}

export interface ConceptPageMeta {
  title: string;
  blurb: string;
  kind: ExperimentKind;
  question?: string;
  result?: string;
  testedIn?: string;
  api?: string[];
  composesWith?: string[];
  friction?: FrictionEntry[];
}

export interface ExperimentRecord {
  release: string;
  featureSlug: string;
  conceptSlug: string;
  route: string;
  meta: ConceptPageMeta;
}

export interface FrictionRecord {
  release: string;
  featureSlug: string;
  conceptSlug: string;
  route: string;
  pageTitle: string;
  entry: FrictionEntry;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function nonEmptyStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: string[] = [];
  for (const item of value) {
    const s = nonEmptyString(item);
    if (s) out.push(s);
  }
  return out.length > 0 ? out : undefined;
}

export function isSafeHttpUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function parseFrictionEntry(raw: unknown): FrictionEntry | null {
  if (!isPlainObject(raw)) return null;
  const summary = nonEmptyString(raw.summary);
  const kind = nonEmptyString(raw.kind);
  if (!summary || !kind || !FRICTION_KIND_SET.has(kind)) return null;

  const entry: FrictionEntry = {
    summary,
    kind: kind as FrictionKind,
  };
  const repro = nonEmptyString(raw.repro);
  if (repro) entry.repro = repro;
  const browser = nonEmptyString(raw.browser);
  if (browser) entry.browser = browser;
  const issueUrl = nonEmptyString(raw.issueUrl);
  if (issueUrl && isSafeHttpUrl(issueUrl)) entry.issueUrl = issueUrl;
  const workaround = nonEmptyString(raw.workaround);
  if (workaround) entry.workaround = workaround;

  return entry;
}

/**
 * Safely validates and normalizes an untrusted `page.json` payload.
 * Returns `null` if required fields (`title`, `blurb`, `kind`) are missing or
 * invalid, and strips unknown or malformed optional fields.
 */
export function parseConceptPageMeta(raw: unknown): ConceptPageMeta | null {
  if (!isPlainObject(raw)) return null;

  const title = nonEmptyString(raw.title);
  const blurb = nonEmptyString(raw.blurb);
  const kind = nonEmptyString(raw.kind);
  if (!title || !blurb || !kind || !EXPERIMENT_KIND_SET.has(kind)) return null;

  const meta: ConceptPageMeta = {
    title,
    blurb,
    kind: kind as ExperimentKind,
  };

  const question = nonEmptyString(raw.question);
  if (question) meta.question = question;
  const result = nonEmptyString(raw.result);
  if (result) meta.result = result;
  const testedIn = nonEmptyString(raw.testedIn);
  if (testedIn) meta.testedIn = testedIn;

  const api = nonEmptyStringArray(raw.api);
  if (api) meta.api = api;
  const composesWith = nonEmptyStringArray(raw.composesWith);
  if (composesWith) meta.composesWith = composesWith;

  if (Array.isArray(raw.friction)) {
    const friction: FrictionEntry[] = [];
    for (const item of raw.friction) {
      const parsed = parseFrictionEntry(item);
      if (parsed) friction.push(parsed);
    }
    if (friction.length > 0) meta.friction = friction;
  }

  return meta;
}

export async function readConceptPageMeta(
  release: string,
  featureSlug: string,
  conceptSlug: string,
): Promise<ConceptPageMeta | null> {
  try {
    const text = await platform().readTextFile(
      `${release}/${featureSlug}/${conceptSlug}/page.json`,
    );
    return parseConceptPageMeta(JSON.parse(text));
  } catch {
    return null;
  }
}

const EXPERIMENTS_CACHE_TTL_MS = 60 * 1000;
let experimentsCache: { host: Platform; at: number; records: ExperimentRecord[] } | null = null;
let experimentsInFlight: { host: Platform; promise: Promise<ExperimentRecord[]> } | null = null;

function releaseNumber(release: string): number {
  return Number(release.slice(1)) || 0;
}

async function scanExperiments(host: Platform): Promise<ExperimentRecord[]> {
  if (experimentsInFlight && experimentsInFlight.host === host) {
    return experimentsInFlight.promise;
  }
  const promise = (async () => {
    const out: ExperimentRecord[] = [];
    try {
      for await (const entry of host.readDir(".")) {
        if (!entry.isDirectory || !/^v\d+$/.test(entry.name)) continue;
        const release = entry.name;
        try {
          for await (const fd of host.readDir(release)) {
            if (!fd.isDirectory) continue;
            const featureSlug = fd.name;
            try {
              for await (const cd of host.readDir(`${release}/${featureSlug}`)) {
                if (!cd.isDirectory) continue;
                const conceptSlug = cd.name;
                const meta = await readConceptPageMeta(release, featureSlug, conceptSlug);
                if (!meta) continue;
                out.push({
                  release,
                  featureSlug,
                  conceptSlug,
                  route: `/${release}/${featureSlug}/${conceptSlug}/`,
                  meta,
                });
              }
            } catch {
              // Feature folder may not be readable in this isolate.
            }
          }
        } catch {
          // Release folder may not be readable in this isolate.
        }
      }
    } catch {
      // Root directory may not be readable.
    }

    out.sort((a, b) =>
      releaseNumber(b.release) - releaseNumber(a.release) ||
      a.featureSlug.localeCompare(b.featureSlug) ||
      a.conceptSlug.localeCompare(b.conceptSlug)
    );

    experimentsCache = { host, at: Date.now(), records: out };
    if (experimentsInFlight?.promise === promise) {
      experimentsInFlight = null;
    }
    return out;
  })();
  experimentsInFlight = { host, promise };
  return promise;
}

export async function collectExperiments(): Promise<ExperimentRecord[]> {
  const host = platform();
  if (
    experimentsCache &&
    experimentsCache.host === host &&
    Date.now() - experimentsCache.at < EXPERIMENTS_CACHE_TTL_MS
  ) {
    return experimentsCache.records;
  }
  return await scanExperiments(host);
}

export async function collectFrictionEntries(): Promise<FrictionRecord[]> {
  const experiments = await collectExperiments();
  const out: FrictionRecord[] = [];
  for (const exp of experiments) {
    if (!exp.meta.friction) continue;
    for (const entry of exp.meta.friction) {
      out.push({
        release: exp.release,
        featureSlug: exp.featureSlug,
        conceptSlug: exp.conceptSlug,
        route: exp.route,
        pageTitle: exp.meta.title,
        entry,
      });
    }
  }
  return out;
}
