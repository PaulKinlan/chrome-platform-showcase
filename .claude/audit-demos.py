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
RAW_COLOR_RE = re.compile(r"#[0-9a-fA-F]{3,8}|rgba\(|hsla\(", re.I)
STYLE_BLOCK_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.I | re.S)
STYLE_ATTR_RE = re.compile(r'\sstyle="([^"]*)"', re.I | re.S)

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
        count += len(RAW_COLOR_RE.findall(block))
    for attr in STYLE_ATTR_RE.findall(html):
        # Color swatches and SVG demo markup sometimes intentionally expose raw
        # colors as user-editable content. Inline CSS on normal HTML still gets
        # counted here.
        if "background:#" in attr or "color:#" in attr or RAW_COLOR_RE.search(attr):
            count += len(RAW_COLOR_RE.findall(attr))
    return count


def run(strict: bool) -> int:
    errors: list[str] = []
    warnings: list[str] = []
    static_pages: list[str] = []
    raw_color_pages: list[str] = []

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

    if static_pages:
        warnings.append(f"{len(static_pages)} concept pages need stronger interactive affordances")
    if raw_color_pages:
        warnings.append(f"{len(raw_color_pages)} pages contain raw color literals/functions")

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

    return 1 if errors else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict", action="store_true", help="fail on objective safety errors")
    args = parser.parse_args()
    return run(args.strict)


if __name__ == "__main__":
    sys.exit(main())
