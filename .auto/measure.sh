#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
from __future__ import annotations
import re
import subprocess
from pathlib import Path

ROOT = Path.cwd()

REQUIRED = [
    (
        "docs.agents.accessibility_goal",
        "docs",
        "AGENTS.md",
        [r"accessib", r"keyboard", r"accessible name|accessibility tree|aria"],
    ),
    (
        "docs.claude.accessibility_goal",
        "docs",
        "CLAUDE.md",
        [r"accessib", r"keyboard", r"accessible name|accessibility tree|aria"],
    ),
    (
        "routine.critical_accessibility_rule",
        "docs",
        ".claude/routine-prompt.md",
        [r"CRITICAL RULES", r"accessib", r"keyboard", r"accessible name|accessibility tree|aria"],
    ),
    (
        "routine.devtools_accessibility_evidence",
        "docs",
        ".claude/routine-prompt.md",
        [r"chrome-devtools-mcp", r"accessibility tree|a11y tree|Accessibility", r"console|network"],
    ),
    (
        "auto_research.accessibility_critique_contract",
        "docs",
        ".claude/auto-research.md",
        [r"critique rubric", r"accessib", r"keyboard|accessible name|accessibility tree|aria"],
    ),
    (
        "critique_model.accessibility_verdict",
        "code",
        "lib/critique.ts",
        [r"accessib", r"rubric", r"Verdict"],
    ),
    (
        "audit_tool.static_accessibility_checks",
        "code",
        ".claude/audit-demos.py",
        [r"alt", r"aria-label|aria-labelledby|accessible", r"tabindex", r"label"],
    ),
]

def file_text(path: str) -> str:
    try:
        return (ROOT / path).read_text(encoding="utf-8", errors="ignore")
    except FileNotFoundError:
        return ""

missing = []
docs_gaps = 0
code_gaps = 0
for name, group, path, patterns in REQUIRED:
    text = file_text(path)
    ok = all(re.search(p, text, re.I | re.S) for p in patterns)
    if not ok:
        missing.append(name)
        if group == "docs":
            docs_gaps += 1
        else:
            code_gaps += 1

# Objective static accessibility scan. This intentionally catches only obvious,
# low-false-positive issues. It is not a substitute for DevTools accessibility-tree review.
html_files = sorted(ROOT.glob("v*/**/index.html"))
static_issues: list[str] = []

SCRIPT_BLOCK_RE = re.compile(r"<script\b[^>]*>.*?</script>", re.I | re.S)
CODE_BLOCK_RE = re.compile(r"<pre\b[^>]*>.*?</pre>", re.I | re.S)
SRCDOC_ATTR_RE = re.compile(r"\ssrcdoc\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", re.I | re.S)
IMG_RE = re.compile(r"<img\b([^>]*)>", re.I | re.S)
IFRAME_RE = re.compile(r"<iframe\b([^>]*)>", re.I | re.S)
MEDIA_RE = re.compile(r"<(audio|video)\b([^>]*)>", re.I | re.S)
INDICATOR_RE = re.compile(r"<(progress|meter)\b([^>]*)>", re.I | re.S)
CONTROL_RE = re.compile(r"<(input|select|textarea)\b([^>]*)>", re.I | re.S)
CONTENTEDITABLE_RE = re.compile(r"<(div|p|span|pre|section|article)\b([^>]*)\bcontenteditable(?:\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+))?([^>]*)>", re.I | re.S)
CANVAS_RE = re.compile(r"<canvas\b([^>]*)>(.*?)</canvas>|<canvas\b([^>]*)/?>", re.I | re.S)
SVG_RE = re.compile(r"<svg\b([^>]*)>(.*?)</svg>|<svg\b([^>]*)/?>", re.I | re.S)
ARIA_HIDDEN_RE = re.compile(r"<([a-z][\w:-]*)\b([^>]*)\baria-hidden\s*=\s*(['\"]?)true\3([^>]*)>", re.I | re.S)
STATEFUL_CONTROL_RE = re.compile(r"<(div|span|li|p|section|article|a)\b([^>]*)>", re.I | re.S)
CUSTOM_BUTTON_RE = re.compile(r"<(div|span|li|p|section|article|a)\b([^>]*)>(.*?)</\1>", re.I | re.S)
TAG_RE = re.compile(r"<([a-z][\w:-]*)\b([^>]*)>", re.I | re.S)
BUTTON_RE = re.compile(r"<button\b([^>]*)>(.*?)</button>", re.I | re.S)
CLICKABLE_RE = re.compile(r"<(div|span|li|p|section|article)\b([^>]*)>", re.I | re.S)
ATTR_RE = re.compile(r"([:\w-]+)(?:\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+))?", re.I)
LABEL_RE = re.compile(r"<label\b", re.I)

def attrs_to_dict(src: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for key, value in ATTR_RE.findall(src):
        key = key.lower()
        if not key or key == "/":
            continue
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        out[key] = value
    return out

def has_accessible_name(attrs: dict[str, str], inner: str = "") -> bool:
    if attrs.get("aria-hidden", "").lower() == "true":
        return True
    if attrs.get("aria-label", "").strip():
        return True
    if attrs.get("aria-labelledby", "").strip():
        return True
    if attrs.get("title", "").strip():
        return True
    if re.sub(r"<[^>]+>", "", inner).strip():
        return True
    return False


def likely_wrapped_by_label(html_text: str, start: int) -> bool:
    before = html_text[:start].lower()
    return before.rfind("<label") > before.rfind("</label>")


def has_label_for(html_text: str, control_id: str) -> bool:
    if not control_id:
        return False
    return bool(re.search(rf"<label\b[^>]*\bfor\s*=\s*(['\"])" + re.escape(control_id) + r"\1", html_text, re.I))


def strip_srcdoc_attrs(html_text: str) -> str:
    out: list[str] = []
    last = 0
    for match in re.finditer(r"\ssrcdoc\s*=\s*(['\"])", html_text, re.I):
        quote = match.group(1)
        index = match.end()
        while index < len(html_text) and html_text[index] != quote:
            index += 1
        if index < len(html_text):
            out.append(html_text[last:match.start()])
            last = index + 1
    out.append(html_text[last:])
    return "".join(out)


def is_hidden_from_page(attrs: dict[str, str]) -> bool:
    style = attrs.get("style", "").lower().replace(" ", "")
    return attrs.get("hidden") is not None or "display:none" in style


def is_focusable_element(tag: str, attrs: dict[str, str]) -> bool:
    if attrs.get("disabled") is not None:
        return False
    return (
        tag in {"button", "input", "select", "textarea", "summary"}
        or (tag == "a" and bool(attrs.get("href")))
        or attrs.get("tabindex") is not None
        or ("contenteditable" in attrs and attrs.get("contenteditable", "").lower() in {"", "true", "plaintext-only"})
    )

for path in html_files:
    rel = path.relative_to(ROOT)
    html = path.read_text(encoding="utf-8", errors="ignore")
    # Ignore JS payload strings and code samples. This audit targets actual DOM
    # markup in the page shell, not examples rendered as text or generated later.
    html = CODE_BLOCK_RE.sub("", SCRIPT_BLOCK_RE.sub("", strip_srcdoc_attrs(html)))

    element_attrs = [(m.group(1).lower(), attrs_to_dict(m.group(2))) for m in TAG_RE.finditer(html)]
    id_values = [attrs["id"] for _, attrs in element_attrs if attrs.get("id")]
    ids = set(id_values)
    for duplicate_id in sorted({value for value in id_values if id_values.count(value) > 1}):
        static_issues.append(f"{rel}: duplicate id '{duplicate_id}'")

    for m in ARIA_HIDDEN_RE.finditer(html):
        tag = m.group(1).lower()
        attrs = attrs_to_dict(f"{m.group(2)} {m.group(4)}")
        if is_focusable_element(tag, attrs):
            static_issues.append(f"{rel}: focusable element is aria-hidden")

    for tag, attrs in element_attrs:
        if attrs.get("role", "").lower() == "img" and attrs.get("aria-hidden", "").lower() != "true":
            if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title")):
                static_issues.append(f"{rel}: role=img missing accessible name")
        for attr_name in ("aria-controls", "aria-labelledby", "aria-describedby"):
            if attrs.get(attr_name):
                for ref in attrs[attr_name].split():
                    if ref not in ids:
                        static_issues.append(f"{rel}: {attr_name} references missing id '{ref}'")
        if "aria-expanded" in attrs and tag != "summary" and not attrs.get("aria-controls"):
            static_issues.append(f"{rel}: expanded control missing aria-controls")

    for m in IMG_RE.finditer(html):
        attrs = attrs_to_dict(m.group(1))
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if "alt" not in attrs:
            static_issues.append(f"{rel}: img missing alt")

    for m in IFRAME_RE.finditer(html):
        attrs = attrs_to_dict(m.group(1))
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if not (attrs.get("title") or attrs.get("aria-label") or attrs.get("aria-labelledby")):
            static_issues.append(f"{rel}: iframe missing accessible name")

    for m in MEDIA_RE.finditer(html):
        tag = m.group(1).lower()
        attrs = attrs_to_dict(m.group(2))
        if attrs.get("aria-hidden", "").lower() == "true" or is_hidden_from_page(attrs):
            continue
        if not (attrs.get("title") or attrs.get("aria-label") or attrs.get("aria-labelledby")):
            static_issues.append(f"{rel}: {tag} missing accessible name")

    for m in INDICATOR_RE.finditer(html):
        tag = m.group(1).lower()
        attrs = attrs_to_dict(m.group(2))
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if likely_wrapped_by_label(html, m.start()):
            continue
        if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title") or has_label_for(html, attrs.get("id", ""))):
            static_issues.append(f"{rel}: {tag} missing accessible name")

    for m in CONTROL_RE.finditer(html):
        tag, attr_src = m.group(1).lower(), m.group(2)
        attrs = attrs_to_dict(attr_src)
        if tag == "input" and attrs.get("type", "").lower() in {"hidden", "submit", "button", "reset"}:
            continue
        if likely_wrapped_by_label(html, m.start()):
            continue
        if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title") or has_label_for(html, attrs.get("id", ""))):
            static_issues.append(f"{rel}: {tag} may be missing label")

    for m in BUTTON_RE.finditer(html):
        attrs = attrs_to_dict(m.group(1))
        if not has_accessible_name(attrs, m.group(2)):
            static_issues.append(f"{rel}: button missing accessible name")

    for m in CUSTOM_BUTTON_RE.finditer(html):
        attrs = attrs_to_dict(m.group(2))
        if attrs.get("role", "").lower() == "button" and attrs.get("aria-hidden", "").lower() != "true":
            if not has_accessible_name(attrs, m.group(3)):
                static_issues.append(f"{rel}: role=button missing accessible name")

    for m in STATEFUL_CONTROL_RE.finditer(html):
        tag = m.group(1).lower()
        attrs = attrs_to_dict(m.group(2))
        if "aria-pressed" not in attrs and "aria-expanded" not in attrs:
            continue
        if tag == "a" and attrs.get("href"):
            continue
        if attrs.get("role") != "button" or attrs.get("tabindex") != "0":
            static_issues.append(f"{rel}: stateful custom control missing button role or focusability")

    for m in CONTENTEDITABLE_RE.finditer(html):
        attrs = attrs_to_dict(f"{m.group(2)} {m.group(4)}")
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if attrs.get("role") not in {"textbox", "searchbox"}:
            static_issues.append(f"{rel}: contenteditable missing textbox role")
        if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title")):
            static_issues.append(f"{rel}: contenteditable missing accessible name")

    for m in CANVAS_RE.finditer(html):
        attrs = attrs_to_dict(m.group(1) or m.group(3) or "")
        inner = m.group(2) or ""
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title") or re.sub(r"<[^>]+>", "", inner).strip()):
            static_issues.append(f"{rel}: canvas missing accessible name or fallback")

    for m in SVG_RE.finditer(html):
        attrs = attrs_to_dict(m.group(1) or m.group(3) or "")
        inner = m.group(2) or ""
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if not (
            attrs.get("aria-label")
            or attrs.get("aria-labelledby")
            or attrs.get("title")
            or "<title" in inner.lower()
            or re.sub(r"<[^>]+>", "", inner).strip()
        ):
            static_issues.append(f"{rel}: svg missing accessible name or hidden state")

    for m in re.finditer(r"tabindex\s*=\s*['\"]?([0-9]+)", html, re.I):
        if int(m.group(1)) > 0:
            static_issues.append(f"{rel}: positive tabindex")

    for m in CLICKABLE_RE.finditer(html):
        attrs = attrs_to_dict(m.group(2))
        if "onclick" not in attrs:
            continue
        if not attrs.get("role") or not (attrs.get("tabindex") == "0" or attrs.get("tabindex") == "-1"):
            static_issues.append(f"{rel}: onclick on non-control without role/tabindex")

# Existing strict audit errors are a secondary guardrail.
strict_errors = 0
try:
    proc = subprocess.run(
        ["python3", ".claude/audit-demos.py", "--strict"],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=30,
    )
    strict_errors = 0 if proc.returncode == 0 else len([l for l in proc.stderr.splitlines() if l.startswith("ERROR:")]) or 1
except Exception:
    strict_errors = 1

a11y_goal_gaps = len(missing)
print(f"METRIC a11y_goal_gaps={a11y_goal_gaps}")
print(f"METRIC static_a11y_issues={len(static_issues)}")
print(f"METRIC docs_gaps={docs_gaps}")
print(f"METRIC code_gaps={code_gaps}")
print(f"METRIC audit_strict_errors={strict_errors}")
print("ASI missing_integration_points=" + ",".join(missing))
if static_issues:
    print("ASI sample_static_a11y_issues=" + " | ".join(static_issues[:12]))
PY
