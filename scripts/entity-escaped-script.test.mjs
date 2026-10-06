// Entity-escaped JavaScript guard for the published showcase demos
// (bead chrome_platform_showcase-br0).
//
// A routine that HTML-escapes generated markup also escaped the `=>` arrows (and
// in one case the `<td>` tags) inside executable JavaScript. An inline <script>
// is raw text, so `=&gt;` is a syntax error that kills the whole demo — six
// published pages shipped that way before this guard. The mirror-image mistake is
// easier to miss: a template literal assigned to `iframe.srcdoc` is *parsed as
// HTML*, and character references inside its <script> are NOT decoded, so the
// same `=&gt;` breaks the injected probe silently (the partition-inspector
// same-site lane). This test scans every published demo for HTML entity
// references that land in executable JavaScript position — inline scripts, and
// scripts inside srcdoc (attribute or JS-assigned) — and fails with the exact
// file:line. Entities inside strings, template text, comments, regex literals,
// `<pre>`/`<code>` samples and JSON-ish script types are correct and ignored.
//
// Run: deno task test-entity-scripts

const REPO = new URL("..", import.meta.url).pathname;
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);
const SKIP_TYPE =
  /^(application\/(ld\+json|json)|importmap|speculationrules|text\/(template|html|plain))$/;
const ENTITY_RE = /&(?:gt|lt|amp|quot|apos|#39|#x27|#\d+|#x[0-9a-fA-F]+);/g;

let failures = 0;
function check(label, ok, detail = "") {
  if (ok) console.log(`ok — ${label}`);
  else {
    failures++;
    console.error(`FAIL — ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

function read(path) {
  return Deno.readTextFileSync(`${REPO}${path.replace(/^\/+/, "")}`);
}

function listDemoHtml(dir = REPO, out = [], depth = 0) {
  for (const e of Deno.readDirSync(dir)) {
    if (e.isDirectory) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      if (depth === 0 && !/^v\d+$/.test(e.name)) continue;
      listDemoHtml(`${dir}${e.name}/`, out, depth + 1);
    } else if (e.name.endsWith(".html")) out.push(`${dir}${e.name}`);
  }
  return out;
}

function decodeEntities(s) {
  return s.replace(/&(?:#(\d+)|#x([0-9a-fA-F]+)|(\w+));/g, (m, d, h, n) => {
    if (d) return String.fromCodePoint(Number(d));
    if (h) return String.fromCodePoint(parseInt(h, 16));
    const map = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
    return Object.hasOwn(map, n) ? map[n] : m;
  });
}

// Minimal HTML tokenizer. Attribute values are parsed, so a literal `<script>`
// inside an attribute is not mistaken for a real script tag, and raw-text
// elements are captured verbatim to their matching close tag.
function tokenize(html) {
  const scripts = [], srcdocs = [];
  let i = 0;
  const n = html.length;
  const lineAt = (idx) => html.slice(0, idx).split("\n").length;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt < 0) break;
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end < 0 ? n : end + 3;
      continue;
    }
    if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) {
      const end = html.indexOf(">", lt);
      i = end < 0 ? n : end + 1;
      continue;
    }
    let j = lt + 1, closing = false;
    if (html[j] === "/") {
      closing = true;
      j++;
    }
    const nameMatch = /^[a-zA-Z][a-zA-Z0-9:-]*/.exec(html.slice(j));
    if (!nameMatch) {
      i = lt + 1;
      continue;
    }
    const tagName = nameMatch[0].toLowerCase();
    j += tagName.length;
    const attrs = {};
    while (j < n) {
      while (j < n && /\s/.test(html[j])) j++;
      if (html[j] === ">") {
        j++;
        break;
      }
      if (html[j] === "/" && html[j + 1] === ">") {
        j += 2;
        break;
      }
      const am = /^[^\s=/>]+/.exec(html.slice(j));
      if (!am) {
        j++;
        continue;
      }
      const an = am[0].toLowerCase();
      j += am[0].length;
      while (j < n && /\s/.test(html[j])) j++;
      let value = "";
      if (html[j] === "=") {
        j++;
        while (j < n && /\s/.test(html[j])) j++;
        const q = html[j];
        if (q === '"' || q === "'") {
          const end = html.indexOf(q, j + 1);
          value = html.slice(j + 1, end < 0 ? n : end);
          j = end < 0 ? n : end + 1;
        } else {
          const vm = /^[^\s>]*/.exec(html.slice(j));
          value = vm ? vm[0] : "";
          j += value.length;
        }
      }
      attrs[an] = value;
    }
    const typeAttr = (attrs.type || "").trim().toLowerCase();
    if (!closing && RAW_TEXT.has(tagName)) {
      const closeRe = new RegExp(`</${tagName}>`, "i");
      const rest = html.slice(j);
      const cm = closeRe.exec(rest);
      const body = cm ? rest.slice(0, cm.index) : rest;
      if (tagName === "script") scripts.push({ type: typeAttr, body, bodyLine: lineAt(j) });
      if (attrs.srcdoc) srcdocs.push({ value: attrs.srcdoc, line: lineAt(lt), via: "attribute" });
      i = cm ? j + cm.index + cm[0].length : n;
      continue;
    }
    if (attrs.srcdoc) srcdocs.push({ value: attrs.srcdoc, line: lineAt(lt), via: "attribute" });
    i = j;
  }
  return { scripts, srcdocs };
}

// Report entity references that appear in JavaScript code position — not inside
// a string, template text, comment or regex literal.
function codeEntities(js) {
  const hits = [];
  const n = js.length;
  let i = 0, prevSig = "";
  const isIdent = (c) => /[A-Za-z0-9_$]/.test(c);
  const ctx = [{ type: "code", brace: 0 }];
  const top = () => ctx[ctx.length - 1];
  while (i < n) {
    const c = js[i], k = top();
    if (k.type === "code") {
      if (c === "/" && js[i + 1] === "/") {
        ctx.push({ type: "line" });
        i += 2;
        continue;
      }
      if (c === "/" && js[i + 1] === "*") {
        ctx.push({ type: "block" });
        i += 2;
        continue;
      }
      if (c === '"') {
        ctx.push({ type: "dq" });
        i++;
        continue;
      }
      if (c === "'") {
        ctx.push({ type: "sq" });
        i++;
        continue;
      }
      if (c === "`") {
        ctx.push({ type: "template" });
        i++;
        continue;
      }
      if (c === "/" && prevSig && !isIdent(prevSig) && !")]}".includes(prevSig)) {
        ctx.push({ type: "regex" });
        i++;
        continue;
      }
      if (c === "&") {
        ENTITY_RE.lastIndex = i;
        const m = ENTITY_RE.exec(js);
        if (m && m.index === i) {
          hits.push({ text: m[0], index: i });
          i += m[0].length;
          continue;
        }
      }
      if (c === "{") k.brace++;
      else if (c === "}") {
        if (k.brace === 0 && k.fromTemplate) {
          ctx.pop();
          i++;
          continue;
        }
        k.brace--;
      }
      if (!/\s/.test(c)) prevSig = c;
      i++;
      continue;
    }
    if (k.type === "line") {
      if (c === "\n") ctx.pop();
      i++;
      continue;
    }
    if (k.type === "block") {
      if (c === "*" && js[i + 1] === "/") {
        ctx.pop();
        i += 2;
      } else i++;
      continue;
    }
    if (k.type === "sq" || k.type === "dq") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if ((k.type === "sq" && c === "'") || (k.type === "dq" && c === '"')) {
        ctx.pop();
        prevSig = c;
        i++;
        continue;
      }
      i++;
      continue;
    }
    if (k.type === "template") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "`") {
        ctx.pop();
        prevSig = "`";
        i++;
        continue;
      }
      if (c === "$" && js[i + 1] === "{") {
        ctx.push({ type: "code", brace: 0, fromTemplate: true });
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (k.type === "regex") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "[") {
        ctx.push({ type: "regexClass" });
        i++;
        continue;
      }
      if (c === "/") {
        ctx.pop();
        prevSig = "/";
        i++;
        continue;
      }
      i++;
      continue;
    }
    if (k.type === "regexClass") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "]") {
        ctx.pop();
        i++;
        continue;
      }
      i++;
      continue;
    }
    i++;
  }
  return hits;
}

// JS-assigned srcdoc: `ifr.srcdoc = \`...\``. Evaluate enough of the template to
// recover the HTML the browser will parse: drop `${...}` expressions and undo
// the `\/` escape. Entities are left as-is (the srcdoc parse does not decode
// them inside a <script>).
function jsSrcdocTemplates(html) {
  const out = [];
  const re = /\.srcdoc\s*=\s*`([\s\S]*?)`\s*;/g;
  let m;
  while ((m = re.exec(html))) {
    const line = html.slice(0, m.index).split("\n").length;
    const value = m[1].replace(/\$\{[^}]*\}/g, "X").replace(/\\\//g, "/");
    out.push({ value, line, via: "js-template" });
  }
  return out;
}

function findingsFor(html) {
  const findings = [];
  const { scripts, srcdocs } = tokenize(html);
  for (const s of scripts) {
    if (SKIP_TYPE.test(s.type)) continue;
    for (const h of codeEntities(s.body)) {
      findings.push({
        line: s.bodyLine + s.body.slice(0, h.index).split("\n").length - 1,
        text: h.text,
        where: "inline script",
      });
    }
  }
  for (const sd of [...srcdocs, ...jsSrcdocTemplates(html)]) {
    const inner = tokenize(decodeEntities(sd.value));
    for (const s of inner.scripts) {
      if (SKIP_TYPE.test(s.type)) continue;
      for (const h of codeEntities(s.body)) {
        findings.push({ line: sd.line, text: h.text, where: `srcdoc script (${sd.via})` });
      }
    }
  }
  return findings;
}

const files = listDemoHtml();
let totalFindings = 0;
const reported = [];
for (const abs of files) {
  const rel = abs.slice(REPO.length);
  for (const f of findingsFor(Deno.readTextFileSync(abs))) {
    totalFindings++;
    reported.push(`${rel}:${f.line} — ${f.text} in ${f.where}`);
  }
}
check(
  `${files.length} demo pages have no HTML-entity escapes in executable JavaScript`,
  totalFindings === 0,
  reported.slice(0, 20).join("\n      ") +
    (reported.length > 20 ? `\n      …and ${reported.length - 20} more` : ""),
);

// The entity inside a `<pre>`/`<code>` sample is correct and must stay — a guard
// that stripped entities everywhere would corrupt the displayed source. Assert
// the surviving samples are still present so a "fix" cannot have over-reached.
const partition = read(
  "/v137/blob-url-partitioning-fetching-navigation/partition-inspector/index.html",
);
check(
  "partition-inspector keeps its displayed code sample escaped inside <pre><code>",
  partition.includes("fetch(url).then((r) =&gt; r.text())"),
);
const catchDemo = read(
  "/v139/fire-error-event-instead-of-throwing-for-csp-blocked-worker/catch-vs-onerror/index.html",
);
check(
  "catch-vs-onerror keeps its displayed code sample escaped where it is markup",
  catchDemo.includes("=&gt;"),
);

if (failures) {
  console.error(`\n${failures} entity-escape guard check(s) failed`);
  Deno.exit(1);
}
console.log("\nentity-escape guard: all checks passed");
