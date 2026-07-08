#!/usr/bin/env python3
"""Audit generated demo pages for the invariants that have regressed before.

Default mode prints a quality report. --strict fails only on objective
repository-safety errors that should block a merge.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHROMESTATUS_RE = re.compile(r"https://chromestatus\.com/feature/\d+")
TITLE_CHROME_RE = re.compile(r"<title>[^<]*Chrome (\d{3})[^<]*</title>", re.I | re.S)
CRUMBS_RE = re.compile(r'<p class="crumbs">.*?</p>', re.I | re.S)
INTERNAL_RELEASE_LINK_RE = re.compile(r'href="/v(\d{3})(/[^"]*)?"')
RAW_COLOR_RE = re.compile(r"#[0-9a-fA-F]{3,8}(?![0-9A-Za-z_-])|rgba\([^)]*\)|hsla\([^)]*\)", re.I)
CSS_COMMENT_RE = re.compile(r"/\*.*?\*/", re.S)
STYLE_BLOCK_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.I | re.S)
STYLE_ATTR_RE = re.compile(r'\sstyle="([^"]*)"', re.I | re.S)
IMG_RE = re.compile(r"<img\b([^>]*)>", re.I | re.S)
CONTROL_RE = re.compile(r"<(input|select|textarea)\b([^>]*)>", re.I | re.S)
BUTTON_RE = re.compile(r"<button\b([^>]*)>(.*?)</button>", re.I | re.S)
CLICKABLE_NON_CONTROL_RE = re.compile(
    r"<(div|span|li|p|section|article)\b([^>]*)\bonclick\s*=([^>]*)>", re.I | re.S
)
ATTR_RE = re.compile(r"([:\w-]+)(?:\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+))?", re.I)
LABEL_RE = re.compile(r"<label\b", re.I)

INTERACTIVE_MARKERS = (
    "<button",
    "<input",
    "<select",
    "<textarea",
    "contenteditable",
    "addEventListener",
    "onclick=",
    "<canvas",
    "<dialog",
    "<details",
    "fetch(",
    "navigator.",
    "performanceobserver",
    "new WebSocket",
    "new Worker",
    "CSS.supports",
    "matchMedia",
    "requestAdapter",
    "getContext(",
)


def milestone_for(path: Path) -> int | None:
    first = path.parts[0]
    if re.fullmatch(r"v\d+", first):
        return int(first[1:])
    return None


def html_files() -> list[Path]:
    return sorted(ROOT.glob("v*/**/index.html"))


def is_feature_index(path: Path) -> bool:
    return len(path.parts) == 3 and path.parts[0].startswith("v") and path.parts[1] != "uber-demo"


def is_concept_page(path: Path) -> bool:
    return len(path.parts) == 4 and path.parts[0].startswith("v")


def own_release_link_mismatches(path: Path, html: str, mstone: int) -> list[str]:
    """Find copied absolute links that point to the same feature under another release."""
    if len(path.parts) < 3:
        return []
    feature_slug = path.parts[1]
    out: list[str] = []
    for match in INTERNAL_RELEASE_LINK_RE.finditer(html):
        linked_mstone = int(match.group(1))
        suffix = match.group(2) or "/"
        if linked_mstone == mstone:
            continue
        if suffix == "/" or suffix.startswith(f"/{feature_slug}/"):
            out.append(match.group(0))
    return out


def css_raw_color_count(html: str) -> int:
    count = 0
    for block in STYLE_BLOCK_RE.findall(html):
        block = CSS_COMMENT_RE.sub("", block)
        count += len(RAW_COLOR_RE.findall(block))
    for attr in STYLE_ATTR_RE.findall(html):
        # Color swatches and SVG demo markup sometimes intentionally expose raw
        # colors as user-editable content. Inline CSS on normal HTML still gets
        # counted here.
        if "background:#" in attr or "color:#" in attr or RAW_COLOR_RE.search(attr):
            count += len(RAW_COLOR_RE.findall(attr))
    return count


def attrs_to_dict(src: str) -> dict[str, str]:
    attrs: dict[str, str] = {}
    for key, value in ATTR_RE.findall(src):
        key = key.lower()
        if not key or key == "/":
            continue
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        attrs[key] = value
    return attrs


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


def static_accessibility_issue_count(html: str) -> int:
    """Count obvious static a11y issues. This is a safety net, not a full audit."""
    issues = 0
    labels_present = bool(LABEL_RE.search(html))

    for match in IMG_RE.finditer(html):
        attrs = attrs_to_dict(match.group(1))
        if attrs.get("aria-hidden", "").lower() != "true" and "alt" not in attrs:
            issues += 1

    for match in CONTROL_RE.finditer(html):
        tag = match.group(1).lower()
        attrs = attrs_to_dict(match.group(2))
        if tag == "input" and attrs.get("type", "").lower() in {"hidden", "submit", "button", "reset"}:
            continue
        if not (
            attrs.get("aria-label")
            or attrs.get("aria-labelledby")
            or attrs.get("title")
            or (attrs.get("id") and labels_present)
        ):
            issues += 1

    for match in BUTTON_RE.finditer(html):
        if not has_accessible_name(attrs_to_dict(match.group(1)), match.group(2)):
            issues += 1

    for match in re.finditer(r"tabindex\s*=\s*['\"]?([0-9]+)", html, re.I):
        if int(match.group(1)) > 0:
            issues += 1

    for match in CLICKABLE_NON_CONTROL_RE.finditer(html):
        attrs = attrs_to_dict(match.group(2))
        if not attrs.get("role") or attrs.get("tabindex") not in {"0", "-1"}:
            issues += 1

    return issues


def run(strict: bool) -> int:
    errors: list[str] = []
    warnings: list[str] = []
    static_pages: list[str] = []
    raw_color_pages: list[str] = []
    accessibility_pages: list[str] = []

    for path in html_files():
        rel = path.relative_to(ROOT)
        html = path.read_text(encoding="utf-8", errors="ignore")
        mstone = milestone_for(rel)
        if mstone is None:
            continue

        if is_feature_index(rel) and not CHROMESTATUS_RE.search(html):
            errors.append(f"{rel}: feature index missing chromestatus.com/feature/<id> link")

        title = TITLE_CHROME_RE.search(html)
        if title and int(title.group(1)) != mstone:
            errors.append(f"{rel}: title says Chrome {title.group(1)} but path is v{mstone}")

        crumbs = CRUMBS_RE.search(html)
        if crumbs:
            for mismatch in own_release_link_mismatches(rel, crumbs.group(0), mstone):
                errors.append(f"{rel}: crumb points at another release: {mismatch}")

        if is_concept_page(rel) and not any(marker in html for marker in INTERACTIVE_MARKERS):
            static_pages.append(str(rel))

        if css_raw_color_count(html):
            raw_color_pages.append(str(rel))

        a11y_issues = static_accessibility_issue_count(html)
        if a11y_issues:
            accessibility_pages.append(f"{rel} ({a11y_issues})")

    if static_pages:
        warnings.append(f"{len(static_pages)} concept pages need stronger interactive affordances")
    if raw_color_pages:
        warnings.append(f"{len(raw_color_pages)} pages contain raw color literals/functions")
    if accessibility_pages:
        warnings.append(f"{len(accessibility_pages)} pages contain likely static accessibility issues")

    for msg in errors:
        print(f"ERROR: {msg}", file=sys.stderr)
    for msg in warnings:
        print(f"WARN: {msg}", file=sys.stderr)

    if not strict:
        if static_pages:
            print("\nConcept pages with weak/no obvious interactivity markers:")
            for item in static_pages[:120]:
                print(f"  {item}")
            if len(static_pages) > 120:
                print(f"  ... {len(static_pages) - 120} more")
        if raw_color_pages:
            print("\nPages with raw color literals/functions:")
            for item in raw_color_pages[:120]:
                print(f"  {item}")
            if len(raw_color_pages) > 120:
                print(f"  ... {len(raw_color_pages) - 120} more")
        if accessibility_pages:
            print("\nPages with likely static accessibility issues (count in parentheses):")
            for item in accessibility_pages[:120]:
                print(f"  {item}")
            if len(accessibility_pages) > 120:
                print(f"  ... {len(accessibility_pages) - 120} more")

    return 1 if errors else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true", help="fail on objective safety errors")
    args = parser.parse_args()
    return run(args.strict)


if __name__ == "__main__":
    sys.exit(main())
