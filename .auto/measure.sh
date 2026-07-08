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

IMG_RE = re.compile(r"<img\b([^>]*)>", re.I | re.S)
CONTROL_RE = re.compile(r"<(input|select|textarea)\b([^>]*)>", re.I | re.S)
BUTTON_RE = re.compile(r"<button\b([^>]*)>(.*?)</button>", re.I | re.S)
CLICKABLE_RE = re.compile(r"<(div|span|li|p|section|article)\b([^>]*)\bonclick\s*=([^>]*)>", re.I | re.S)
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

for path in html_files:
    rel = path.relative_to(ROOT)
    html = path.read_text(encoding="utf-8", errors="ignore")
    labels_present = bool(LABEL_RE.search(html))

    for m in IMG_RE.finditer(html):
        attrs = attrs_to_dict(m.group(1))
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if "alt" not in attrs:
            static_issues.append(f"{rel}: img missing alt")

    for m in CONTROL_RE.finditer(html):
        tag, attr_src = m.group(1).lower(), m.group(2)
        attrs = attrs_to_dict(attr_src)
        if tag == "input" and attrs.get("type", "").lower() in {"hidden", "submit", "button", "reset"}:
            continue
        if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title") or (attrs.get("id") and labels_present)):
            static_issues.append(f"{rel}: {tag} may be missing label")

    for m in BUTTON_RE.finditer(html):
        attrs = attrs_to_dict(m.group(1))
        if not has_accessible_name(attrs, m.group(2)):
            static_issues.append(f"{rel}: button missing accessible name")

    for m in re.finditer(r"tabindex\s*=\s*['\"]?([0-9]+)", html, re.I):
        if int(m.group(1)) > 0:
            static_issues.append(f"{rel}: positive tabindex")

    for m in CLICKABLE_RE.finditer(html):
        attrs = attrs_to_dict(m.group(2))
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
