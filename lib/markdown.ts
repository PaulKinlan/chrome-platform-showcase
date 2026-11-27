import { escapeHTML } from "../routes/html.ts";

export type InlineNode =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "em"; children: InlineNode[] }
  | { type: "link"; href: string; children: InlineNode[] };

export type BlockNode =
  | { type: "p"; children: InlineNode[] }
  | { type: "ul"; items: InlineNode[][] }
  | { type: "ol"; items: InlineNode[][] };

export interface RenderMarkdownOptions {
  /**
   * Optional visible-character budget for card excerpts. Markup and link URLs
   * do not count toward this budget, and truncation happens on the parsed AST
   * so links, inline code, and formatting tags are never cut in half.
   */
  maxChars?: number;
}

const UNORDERED_ITEM_RE = /^\s*[-*+]\s+(.+)$/;
const ORDERED_ITEM_RE = /^\s*\d+[.)]\s+(.+)$/;
const BARE_URL_RE = /^https?:\/\/[^\s<>"'`]+/i;
const WORD_CHAR_RE = /[A-Za-z0-9]/;
const CONTROL_OR_UNSAFE_URL_RE = /[\u0000-\u001f\u007f\s<>"']/;
const TRAILING_URL_PUNCT_RE = /[.,;:!?'"]$/;

export function isSafeHttpUrl(candidate: string): boolean {
  if (!candidate || CONTROL_OR_UNSAFE_URL_RE.test(candidate)) return false;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function pushText(nodes: InlineNode[], text: string): void {
  if (!text) return;
  const last = nodes[nodes.length - 1];
  if (last && last.type === "text") {
    last.text += text;
  } else {
    nodes.push({ type: "text", text });
  }
}

function trimTrailingUrlPunctuation(raw: string): string {
  let url = raw;
  while (url.length > 0) {
    if (TRAILING_URL_PUNCT_RE.test(url)) {
      url = url.slice(0, -1);
      continue;
    }
    const last = url[url.length - 1];
    if (last === ")" || last === "]" || last === "}") {
      const open = last === ")" ? "(" : last === "]" ? "[" : "{";
      let balance = 0;
      for (const ch of url) {
        if (ch === open) balance++;
        else if (ch === last) balance--;
      }
      if (balance < 0) {
        url = url.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return url;
}

function findMatchingBracket(input: string, openIndex: number): number {
  let depth = 0;
  let i = openIndex;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "`") {
      let ticks = 1;
      while (input[i + ticks] === "`") ticks++;
      const close = input.indexOf("`".repeat(ticks), i + ticks);
      if (close !== -1) {
        i = close + ticks;
        continue;
      }
    }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function findClosingParenUrl(input: string, openParenIndex: number): number {
  let depth = 0;
  for (let i = openParenIndex; i < input.length; i++) {
    const ch = input[i];
    if (/\s/.test(ch)) return -1;
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findClosingDelimiter(input: string, start: number, delim: "**" | "*"): number {
  const len = delim.length;
  let i = start;
  while (i < input.length) {
    const ch = input[i];
    if (ch === "`") {
      let ticks = 1;
      while (input[i + ticks] === "`") ticks++;
      const close = input.indexOf("`".repeat(ticks), i + ticks);
      if (close !== -1) {
        i = close + ticks;
        continue;
      }
    }
    if (input.startsWith(delim, i)) {
      const prev = input[i - 1] ?? "";
      const next = input[i + len] ?? "";
      if (delim === "**") {
        if (prev && !/\s/.test(prev)) return i;
      } else {
        if (prev && !/\s/.test(prev) && next !== "*" && !WORD_CHAR_RE.test(next)) {
          return i;
        }
      }
    }
    i++;
  }
  return -1;
}

export function parseInline(input: string, allowLinks = true): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // Inline code span: `...` (or multi-backtick).
    if (ch === "`") {
      let ticks = 1;
      while (input[i + ticks] === "`") ticks++;
      const fence = "`".repeat(ticks);
      const close = input.indexOf(fence, i + ticks);
      if (close !== -1) {
        let code = input.slice(i + ticks, close);
        // Strip a single matching padding space on both sides per CommonMark.
        if (code.length >= 2 && code.startsWith(" ") && code.endsWith(" ") && /[^ ]/.test(code)) {
          code = code.slice(1, -1);
        }
        nodes.push({ type: "code", text: code });
        i = close + ticks;
        continue;
      }
    }

    // Markdown link: [label](https://...)
    if (allowLinks && ch === "[") {
      const closeBracket = findMatchingBracket(input, i);
      if (closeBracket !== -1 && input[closeBracket + 1] === "(") {
        const closeParen = findClosingParenUrl(input, closeBracket + 1);
        if (closeParen !== -1) {
          const label = input.slice(i + 1, closeBracket);
          const rawUrl = input.slice(closeBracket + 2, closeParen);
          if (label.trim().length > 0 && isSafeHttpUrl(rawUrl)) {
            nodes.push({
              type: "link",
              href: rawUrl,
              children: parseInline(label, false),
            });
            i = closeParen + 1;
            continue;
          }
        }
      }
    }

    // Angle-bracket autolink: <https://...>
    if (allowLinks && ch === "<") {
      const closeAngle = input.indexOf(">", i + 1);
      if (closeAngle !== -1) {
        const candidate = input.slice(i + 1, closeAngle);
        if (/^https?:\/\//i.test(candidate) && isSafeHttpUrl(candidate)) {
          nodes.push({
            type: "link",
            href: candidate,
            children: [{ type: "text", text: candidate }],
          });
          i = closeAngle + 1;
          continue;
        }
      }
    }

    // Bare HTTP(S) URL.
    if (allowLinks && (ch === "h" || ch === "H")) {
      const prev = i > 0 ? input[i - 1] : "";
      const boundaryOk = !prev || /[\s([{"']/.test(prev);
      if (boundaryOk) {
        const match = BARE_URL_RE.exec(input.slice(i));
        if (match) {
          const cleaned = trimTrailingUrlPunctuation(match[0]);
          if (isSafeHttpUrl(cleaned)) {
            nodes.push({
              type: "link",
              href: cleaned,
              children: [{ type: "text", text: cleaned }],
            });
            i += cleaned.length;
            continue;
          }
        }
      }
    }

    // Bold: **...**
    if (ch === "*" && input[i + 1] === "*") {
      const next = input[i + 2] ?? "";
      if (next && !/\s/.test(next) && next !== "*") {
        const close = findClosingDelimiter(input, i + 2, "**");
        if (close !== -1) {
          const inner = input.slice(i + 2, close);
          nodes.push({ type: "strong", children: parseInline(inner, allowLinks) });
          i = close + 2;
          continue;
        }
      }
    }

    // Italic: *...* (underscores deliberately ignored to protect _blank, snake_case, etc.)
    if (ch === "*" && input[i + 1] !== "*") {
      const prev = i > 0 ? input[i - 1] : "";
      const next = input[i + 1] ?? "";
      if (next && !/\s/.test(next) && !WORD_CHAR_RE.test(prev)) {
        const close = findClosingDelimiter(input, i + 1, "*");
        if (close !== -1) {
          const inner = input.slice(i + 1, close);
          nodes.push({ type: "em", children: parseInline(inner, allowLinks) });
          i = close + 1;
          continue;
        }
      }
    }

    pushText(nodes, ch);
    i++;
  }

  return nodes;
}

export function parseMarkdown(markdown: string): BlockNode[] {
  const normalized = markdown.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    const ulMatch = UNORDERED_ITEM_RE.exec(line);
    if (ulMatch) {
      const items: InlineNode[][] = [];
      while (i < lines.length) {
        const m = UNORDERED_ITEM_RE.exec(lines[i]);
        if (!m) break;
        const parts = [m[1].trim()];
        i++;
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          /^\s{2,}/.test(lines[i]) &&
          !UNORDERED_ITEM_RE.test(lines[i]) &&
          !ORDERED_ITEM_RE.test(lines[i])
        ) {
          parts.push(lines[i].trim());
          i++;
        }
        items.push(parseInline(parts.join(" ")));
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    const olMatch = ORDERED_ITEM_RE.exec(line);
    if (olMatch) {
      const items: InlineNode[][] = [];
      while (i < lines.length) {
        const m = ORDERED_ITEM_RE.exec(lines[i]);
        if (!m) break;
        const parts = [m[1].trim()];
        i++;
        while (
          i < lines.length &&
          lines[i].trim() !== "" &&
          /^\s{2,}/.test(lines[i]) &&
          !UNORDERED_ITEM_RE.test(lines[i]) &&
          !ORDERED_ITEM_RE.test(lines[i])
        ) {
          parts.push(lines[i].trim());
          i++;
        }
        items.push(parseInline(parts.join(" ")));
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !UNORDERED_ITEM_RE.test(lines[i]) &&
      !ORDERED_ITEM_RE.test(lines[i])
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: "p", children: parseInline(paraLines.join(" ")) });
  }

  return blocks;
}

function inlineVisibleLength(nodes: InlineNode[]): number {
  let len = 0;
  for (const node of nodes) {
    if (node.type === "text" || node.type === "code") {
      len += node.text.length;
    } else {
      len += inlineVisibleLength(node.children);
    }
  }
  return len;
}

function blocksVisibleLength(blocks: BlockNode[]): number {
  let len = 0;
  for (const block of blocks) {
    if (block.type === "p") {
      len += inlineVisibleLength(block.children);
    } else {
      for (const item of block.items) {
        len += inlineVisibleLength(item);
      }
    }
  }
  return len;
}

function sliceWordBoundary(text: string, limit: number, atStart: boolean): string {
  if (limit <= 0) return "";
  if (text.length <= limit) return text;
  const slice = text.slice(0, limit + 1);
  const lastSpace = slice.search(/\s[^\s]*$/);
  if (lastSpace > 0 && (!atStart || lastSpace >= Math.floor(limit * 0.4))) {
    return slice.slice(0, lastSpace).replace(/[\s,;:-]+$/, "");
  }
  if (lastSpace === 0 && !atStart) {
    return "";
  }
  if (!atStart && limit < 6) {
    return "";
  }
  return text.slice(0, limit).replace(/[\s,;:-]+$/, "");
}

function appendEllipsis(nodes: InlineNode[]): void {
  const last = nodes[nodes.length - 1];
  if (last && last.type === "text") {
    const trimmed = last.text.replace(/[\s,;:-]+$/, "");
    if (trimmed.endsWith("…") || trimmed.endsWith("...")) {
      last.text = trimmed;
    } else if (/[.!?]$/.test(trimmed)) {
      last.text = `${trimmed} …`;
    } else {
      last.text = `${trimmed}…`;
    }
    return;
  }
  nodes.push({ type: "text", text: "…" });
}

interface TruncateState {
  remaining: number;
  truncated: boolean;
}

function truncateInline(
  nodes: InlineNode[],
  state: TruncateState,
  isAtStart: boolean,
): InlineNode[] {
  const out: InlineNode[] = [];
  for (let idx = 0; idx < nodes.length; idx++) {
    if (state.truncated) break;
    const node = nodes[idx];
    const hasMoreAfter = idx < nodes.length - 1;
    const atStart = isAtStart && out.length === 0;

    if (node.type === "text") {
      if (node.text.length <= state.remaining) {
        out.push(node);
        state.remaining -= node.text.length;
      } else {
        const cut = sliceWordBoundary(node.text, state.remaining, atStart);
        if (cut) out.push({ type: "text", text: cut });
        appendEllipsis(out);
        state.remaining = 0;
        state.truncated = true;
      }
      continue;
    }

    if (node.type === "code") {
      if (node.text.length <= state.remaining) {
        out.push(node);
        state.remaining -= node.text.length;
      } else if (node.text.length <= state.remaining + 30 || atStart) {
        out.push(node);
        state.remaining = 0;
        if (hasMoreAfter) {
          appendEllipsis(out);
          state.truncated = true;
        }
      } else {
        appendEllipsis(out);
        state.remaining = 0;
        state.truncated = true;
      }
      continue;
    }

    if (node.type === "link") {
      const len = inlineVisibleLength(node.children);
      if (len <= state.remaining) {
        out.push(node);
        state.remaining -= len;
      } else if (len <= state.remaining + 40 || atStart) {
        // Keep links intact rather than cutting URLs or labels mid-token.
        out.push(node);
        state.remaining = 0;
        if (hasMoreAfter) {
          appendEllipsis(out);
          state.truncated = true;
        }
      } else {
        appendEllipsis(out);
        state.remaining = 0;
        state.truncated = true;
      }
      continue;
    }

    // strong / em
    const childOut = truncateInline(node.children, state, atStart);
    if (childOut.length > 0) {
      out.push({ type: node.type, children: childOut });
    }
  }
  return out;
}

function truncateBlocks(blocks: BlockNode[], maxChars: number): BlockNode[] {
  const total = blocksVisibleLength(blocks);
  // Small grace tolerance avoids truncating away the last couple of words.
  if (total <= maxChars + 25) return blocks;

  const state: TruncateState = { remaining: maxChars, truncated: false };
  const out: BlockNode[] = [];

  for (let bi = 0; bi < blocks.length; bi++) {
    if (state.truncated) break;
    if (bi > 0) {
      state.remaining -= 20;
      if (state.remaining < 24) {
        const prev = out[out.length - 1];
        if (prev) {
          if (prev.type === "p") appendEllipsis(prev.children);
          else if (prev.items.length > 0) appendEllipsis(prev.items[prev.items.length - 1]);
        }
        state.truncated = true;
        break;
      }
    }

    const block = blocks[bi];
    if (block.type === "p") {
      const children = truncateInline(block.children, state, out.length === 0);
      if (children.length > 0) out.push({ type: "p", children });
      if (!state.truncated && state.remaining === 0 && bi < blocks.length - 1) {
        appendEllipsis(children);
        state.truncated = true;
      }
    } else {
      const items: InlineNode[][] = [];
      for (let ii = 0; ii < block.items.length; ii++) {
        if (state.truncated) break;
        if (ii > 0) {
          state.remaining -= 12;
          if (state.remaining < 20) {
            if (items.length > 0) appendEllipsis(items[items.length - 1]);
            state.truncated = true;
            break;
          }
        }
        const item = truncateInline(block.items[ii], state, out.length === 0 && items.length === 0);
        if (item.length > 0) items.push(item);
        if (
          !state.truncated &&
          state.remaining === 0 &&
          (ii < block.items.length - 1 || bi < blocks.length - 1)
        ) {
          appendEllipsis(item);
          state.truncated = true;
        }
      }
      if (items.length > 0) out.push({ type: block.type, items });
    }
  }

  return out;
}

function serializeInline(nodes: InlineNode[]): string {
  return nodes.map((node) => {
    switch (node.type) {
      case "text":
        return escapeHTML(node.text);
      case "code":
        return `<code>${escapeHTML(node.text)}</code>`;
      case "strong":
        return `<strong>${serializeInline(node.children)}</strong>`;
      case "em":
        return `<em>${serializeInline(node.children)}</em>`;
      case "link":
        return `<a href="${escapeHTML(node.href)}" target="_blank" rel="noopener">${
          serializeInline(node.children)
        }</a>`;
    }
  }).join("");
}

function serializeBlocks(blocks: BlockNode[]): string {
  return blocks.map((block) => {
    if (block.type === "p") {
      return `<p>${serializeInline(block.children)}</p>`;
    }
    const tag = block.type;
    const items = block.items.map((item) => `<li>${serializeInline(item)}</li>`).join("");
    return `<${tag}>${items}</${tag}>`;
  }).join("");
}

/**
 * Render a limited, XSS-safe subset of Markdown (paragraphs, bullet/numbered
 * lists, inline code, bold/italic, HTTP(S) links, and bare HTTP(S) URLs) to
 * semantic HTML. All raw HTML is escaped and non-HTTP(S) link schemes are
 * rejected.
 */
export function renderMarkdown(markdown: string, options: RenderMarkdownOptions = {}): string {
  const parsed = parseMarkdown(markdown);
  if (parsed.length === 0) return "";
  const blocks = options.maxChars !== undefined ? truncateBlocks(parsed, options.maxChars) : parsed;
  return serializeBlocks(blocks);
}
