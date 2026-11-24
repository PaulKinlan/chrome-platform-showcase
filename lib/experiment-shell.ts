import { escapeHTML } from "../routes/html.ts";

export type ExperimentKind =
  | "starter"
  | "experiment"
  | "stress"
  | "composition"
  | "migration";

export interface ExperimentFrictionItem {
  title?: string;
  summary?: string;
  severity?: string;
  detail?: string;
}

export interface ExperimentBoxMeta {
  title: string;
  blurb: string;
  kind: ExperimentKind | (string & {});
  question?: string;
  result?: string;
  testedIn?: string;
  api?: readonly string[];
  composesWith?: readonly string[];
  friction?: readonly (string | ExperimentFrictionItem)[];
}

export interface ExperimentBoxOptions {
  frictionUrl?: string;
  experimentsUrl?: string;
}

const EXPERIMENT_BOX_CLASS_RE = /\bclass\s*=\s*["'][^"']*\bexperiment-box\b[^"']*["']/i;
const SHOW_CODE_CLASS_RE = /\bclass\s*=\s*["'][^"']*\bshow-code\b[^"']*["']/i;
const HEADER_CLOSE_RE = /<\/header>/i;
const LEDE_PARAGRAPH_RE = /<p\b[^>]*\bclass\s*=\s*["'][^"']*\blede\b[^"']*["'][^>]*>[\s\S]*?<\/p>/i;
const HEAD_CLOSE_RE = /<\/head>/i;
const SHOW_CODE_SCRIPT_TAG = '<script type="module" src="/public/show-code.js"></script>';

function kindModifier(kind: string): string {
  const slug = kind.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "experiment";
}

function renderFrictionItem(item: string | ExperimentFrictionItem): string {
  if (typeof item === "string") {
    return `<li>${escapeHTML(item)}</li>`;
  }
  const parts: string[] = [];
  if (item.severity) {
    parts.push(`<span class="friction-severity">${escapeHTML(item.severity)}</span>`);
  }
  const body = item.summary ?? item.detail;
  if (item.title && body) {
    parts.push(`<strong>${escapeHTML(item.title)}</strong>: ${escapeHTML(body)}`);
  } else if (item.title) {
    parts.push(`<strong>${escapeHTML(item.title)}</strong>`);
  } else if (body) {
    parts.push(escapeHTML(body));
  }
  return parts.length > 0 ? `<li>${parts.join(" ")}</li>` : "";
}

export function renderExperimentBox(
  meta: ExperimentBoxMeta,
  opts: ExperimentBoxOptions = {},
): string {
  const frictionUrl = opts.frictionUrl ?? "/friction/";
  const experimentsUrl = opts.experimentsUrl ?? "/experiments/";
  const composeSep = experimentsUrl.includes("?") ? "&" : "?";

  const rows: string[] = [];

  if (meta.question) {
    rows.push(
      `<div class="experiment-meta-row"><dt>Question</dt>` +
        `<dd>${escapeHTML(meta.question)}</dd></div>`,
    );
  }

  if (meta.result || meta.testedIn) {
    const resultParts: string[] = [];
    if (meta.result) resultParts.push(escapeHTML(meta.result));
    if (meta.testedIn) {
      resultParts.push(
        `<span class="experiment-tested">Tested in ${escapeHTML(meta.testedIn)}</span>`,
      );
    }
    rows.push(
      `<div class="experiment-meta-row"><dt>Measured result</dt>` +
        `<dd>${resultParts.join(" ")}</dd></div>`,
    );
  }

  if (meta.api && meta.api.length > 0) {
    const chips = meta.api
      .map((symbol) => `<li><code>${escapeHTML(symbol)}</code></li>`)
      .join("");
    rows.push(
      `<div class="experiment-meta-row"><dt>API surface</dt>` +
        `<dd><ul class="experiment-chips" role="list">${chips}</ul></dd></div>`,
    );
  }

  if (meta.composesWith && meta.composesWith.length > 0) {
    const links = meta.composesWith
      .map((tag) => {
        const href = `${experimentsUrl}${composeSep}compose=${encodeURIComponent(tag)}`;
        return (
          `<li><a class="experiment-chip-link" href="${escapeHTML(href)}">` +
          `${escapeHTML(tag)}</a></li>`
        );
      })
      .join("");
    rows.push(
      `<div class="experiment-meta-row"><dt>Composes with</dt>` +
        `<dd><ul class="experiment-chips" role="list">${links}</ul></dd></div>`,
    );
  }

  const frictionItems = (meta.friction ?? []).map(renderFrictionItem).filter(Boolean);
  const frictionBlock = frictionItems.length > 0
    ? `<div class="experiment-friction">` +
      `<p class="experiment-friction-head">Friction discovered · ` +
      `<a href="${escapeHTML(frictionUrl)}">All friction notes</a></p>` +
      `<ul class="friction-list">${frictionItems.join("")}</ul>` +
      `</div>`
    : "";

  const metaBlock = rows.length > 0
    ? `<dl class="experiment-meta">${rows.join("")}</dl>`
    : meta.blurb
    ? `<p class="experiment-blurb">${escapeHTML(meta.blurb)}</p>`
    : "";

  const kindClass = `experiment-kind experiment-kind-${escapeHTML(kindModifier(meta.kind))}`;

  return (
    `<aside class="experiment-box" aria-label="About this experiment">` +
    `<div class="experiment-box-head">` +
    `<span class="experiment-box-label">About this experiment</span>` +
    `<span class="${kindClass}">${escapeHTML(meta.kind)}</span>` +
    `</div>` +
    metaBlock +
    frictionBlock +
    `</aside>`
  );
}

export function injectExperimentShell(
  html: string,
  meta: ExperimentBoxMeta | null,
  opts: ExperimentBoxOptions = {},
): string {
  let out = html;

  if (meta && !EXPERIMENT_BOX_CLASS_RE.test(out)) {
    const box = renderExperimentBox(meta, opts);
    if (HEADER_CLOSE_RE.test(out)) {
      out = out.replace(HEADER_CLOSE_RE, (match) => `${match}\n${box}`);
    } else if (LEDE_PARAGRAPH_RE.test(out)) {
      out = out.replace(LEDE_PARAGRAPH_RE, (match) => `${match}\n${box}`);
    }
  }

  if (SHOW_CODE_CLASS_RE.test(out) && !out.includes("/public/show-code.js")) {
    if (HEAD_CLOSE_RE.test(out)) {
      out = out.replace(HEAD_CLOSE_RE, (match) => `  ${SHOW_CODE_SCRIPT_TAG}\n${match}`);
    } else {
      out = `${out}\n${SHOW_CODE_SCRIPT_TAG}`;
    }
  }

  return out;
}
