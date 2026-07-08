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
SCRIPT_BLOCK_RE = re.compile(r"<script\b[^>]*>.*?</script>", re.I | re.S)
CODE_BLOCK_RE = re.compile(r"<pre\b[^>]*>.*?</pre>", re.I | re.S)
SRCDOC_ATTR_RE = re.compile(r"\ssrcdoc\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", re.I | re.S)
IMG_RE = re.compile(r"<img\b([^>]*)>", re.I | re.S)
IFRAME_RE = re.compile(r"<iframe\b([^>]*)>", re.I | re.S)
DIALOG_RE = re.compile(r"<(dialog|[a-z][\w:-]*)\b([^>]*)>", re.I | re.S)
MEDIA_RE = re.compile(r"<(audio|video)\b([^>]*)>", re.I | re.S)
TABLE_RE = re.compile(r"<table\b([^>]*)>(.*?)</table>", re.I | re.S)
FIELDSET_RE = re.compile(r"<fieldset\b([^>]*)>(.*?)</fieldset>", re.I | re.S)
INDICATOR_RE = re.compile(r"<(progress|meter)\b([^>]*)>", re.I | re.S)
CONTROL_RE = re.compile(r"<(input|select|textarea)\b([^>]*)>", re.I | re.S)
CONTENTEDITABLE_RE = re.compile(r"<(div|p|span|pre|section|article)\b([^>]*)\bcontenteditable(?:\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+))?([^>]*)>", re.I | re.S)
CANVAS_RE = re.compile(r"<canvas\b([^>]*)>(.*?)</canvas>|<canvas\b([^>]*)/?>", re.I | re.S)
SVG_RE = re.compile(r"<svg\b([^>]*)>(.*?)</svg>|<svg\b([^>]*)/?>", re.I | re.S)
ARIA_HIDDEN_RE = re.compile(r"<([a-z][\w:-]*)\b([^>]*)\baria-hidden\s*=\s*(['\"]?)true\3([^>]*)>", re.I | re.S)
STATEFUL_CONTROL_RE = re.compile(r"<(div|span|li|p|section|article|a)\b([^>]*)>", re.I | re.S)
CUSTOM_BUTTON_RE = re.compile(r"<(div|span|li|p|section|article|a)\b([^>]*)>(.*?)</\1>", re.I | re.S)
ARIA_TAB_RE = re.compile(r"<([a-z][\w:-]*)\b([^>]*)>(.*?)</\1>|<([a-z][\w:-]*)\b([^>]*)/?>", re.I | re.S)
TAG_RE = re.compile(r"<([a-z][\w:-]*)\b([^>]*)>", re.I | re.S)
BUTTON_RE = re.compile(r"<button\b([^>]*)>(.*?)</button>", re.I | re.S)
CLICKABLE_NON_CONTROL_RE = re.compile(r"<(div|span|li|p|section|article)\b([^>]*)>", re.I | re.S)
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

ARIA_TOKEN_VALUES = {
    "aria-haspopup": {"true", "false", "menu", "listbox", "tree", "grid", "dialog"},
    "aria-live": {"off", "polite", "assertive"},
    "aria-current": {"page", "step", "location", "date", "time", "true", "false"},
    "aria-orientation": {"horizontal", "vertical"},
    "aria-sort": {"ascending", "descending", "none", "other"},
    "aria-autocomplete": {"inline", "list", "both", "none"},
    "aria-invalid": {"true", "false", "grammar", "spelling"},
    "aria-disabled": {"true", "false"},
    "aria-expanded": {"true", "false"},
    "aria-hidden": {"true", "false"},
    "aria-modal": {"true", "false"},
    "aria-multiline": {"true", "false"},
    "aria-multiselectable": {"true", "false"},
    "aria-required": {"true", "false"},
    "aria-selected": {"true", "false"},
    "aria-busy": {"true", "false"},
    "aria-pressed": {"true", "false", "mixed"},
    "aria-checked": {"true", "false", "mixed"},
}
ARIA_RELEVANT_TOKENS = {"additions", "removals", "text", "all"}


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


def likely_wrapped_by_label(html: str, start: int) -> bool:
    before = html[:start].lower()
    return before.rfind("<label") > before.rfind("</label>")


def has_label_for(html: str, control_id: str) -> bool:
    if not control_id:
        return False
    return bool(re.search(rf"<label\b[^>]*\bfor\s*=\s*(['\"])" + re.escape(control_id) + r"\1", html, re.I))


def strip_srcdoc_attrs(html: str) -> str:
    out: list[str] = []
    last = 0
    for match in re.finditer(r"\ssrcdoc\s*=\s*(['\"])", html, re.I):
        quote = match.group(1)
        index = match.end()
        while index < len(html) and html[index] != quote:
            index += 1
        if index < len(html):
            out.append(html[last:match.start()])
            last = index + 1
    out.append(html[last:])
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


def has_shadow_reference_target(html: str, target_id: str) -> bool:
    """Return true when a custom element explicitly exposes a shadow-root target."""
    if not target_id:
        return False
    quoted = re.escape(target_id)
    return bool(
        re.search(rf"\bshadowrootreferencetarget\s*=\s*(['\"])" + quoted + r"\1", html, re.I)
        or re.search(rf"\bshadowRootReferenceTarget\s*:\s*(['\"])" + quoted + r"\1", html)
    )


def aria_token_issue_count(attrs: dict[str, str]) -> int:
    issues = 0
    for attr_name, valid_values in ARIA_TOKEN_VALUES.items():
        value = attrs.get(attr_name)
        if value and value.lower() not in valid_values:
            issues += 1

    if attrs.get("aria-relevant"):
        relevant_tokens = attrs["aria-relevant"].lower().split()
        if (
            not relevant_tokens
            or any(token not in ARIA_RELEVANT_TOKENS for token in relevant_tokens)
            or ("all" in relevant_tokens and len(relevant_tokens) > 1)
        ):
            issues += 1

    return issues


def static_accessibility_issue_count(html: str) -> int:
    """Count obvious static a11y issues. This is a safety net, not a full audit."""
    # Ignore JS payload strings and code samples. This audit targets actual DOM
    # markup in the page shell, not examples rendered as text or generated later.
    html = CODE_BLOCK_RE.sub("", SCRIPT_BLOCK_RE.sub("", strip_srcdoc_attrs(html)))
    issues = 0

    element_attrs = [(match.group(1).lower(), attrs_to_dict(match.group(2))) for match in TAG_RE.finditer(html)]
    id_values = [attrs["id"] for _, attrs in element_attrs if attrs.get("id")]
    ids = set(id_values)
    tab_ids = {attrs["id"] for _, attrs in element_attrs if attrs.get("role", "").lower() == "tab" and attrs.get("id")}
    tabpanel_ids = {attrs["id"] for _, attrs in element_attrs if attrs.get("role", "").lower() == "tabpanel" and attrs.get("id")}
    issues += len(id_values) - len(ids)

    for match in ARIA_HIDDEN_RE.finditer(html):
        tag = match.group(1).lower()
        attrs = attrs_to_dict(f"{match.group(2)} {match.group(4)}")
        if is_focusable_element(tag, attrs):
            issues += 1

    for tag, attrs in element_attrs:
        if attrs.get("role", "").lower() == "img" and attrs.get("aria-hidden", "").lower() != "true":
            if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title")):
                issues += 1
        issues += aria_token_issue_count(attrs)
        for attr_name in ("aria-controls", "aria-labelledby", "aria-describedby", "aria-activedescendant", "aria-owns"):
            if attrs.get(attr_name):
                for ref in attrs[attr_name].split():
                    if ref in ids:
                        continue
                    if attr_name == "aria-activedescendant" and "-" in tag and has_shadow_reference_target(html, ref):
                        continue
                    issues += 1
        if "aria-expanded" in attrs and tag != "summary" and not attrs.get("aria-controls"):
            issues += 1

    for match in IMG_RE.finditer(html):
        attrs = attrs_to_dict(match.group(1))
        if attrs.get("aria-hidden", "").lower() != "true" and "alt" not in attrs:
            issues += 1

    for match in IFRAME_RE.finditer(html):
        attrs = attrs_to_dict(match.group(1))
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if not (attrs.get("title") or attrs.get("aria-label") or attrs.get("aria-labelledby")):
            issues += 1

    for match in DIALOG_RE.finditer(html):
        tag = match.group(1).lower()
        attrs = attrs_to_dict(match.group(2))
        if tag != "dialog" and attrs.get("role", "").lower() not in {"dialog", "alertdialog"}:
            continue
        if attrs.get("aria-hidden", "").lower() == "true" or is_hidden_from_page(attrs):
            continue
        if not (attrs.get("title") or attrs.get("aria-label") or attrs.get("aria-labelledby")):
            issues += 1

    for match in MEDIA_RE.finditer(html):
        attrs = attrs_to_dict(match.group(2))
        if attrs.get("aria-hidden", "").lower() == "true" or is_hidden_from_page(attrs):
            continue
        if not (attrs.get("title") or attrs.get("aria-label") or attrs.get("aria-labelledby")):
            issues += 1

    for match in TABLE_RE.finditer(html):
        attrs = attrs_to_dict(match.group(1))
        if attrs.get("role", "").lower() in {"presentation", "none"}:
            continue
        if attrs.get("aria-hidden", "").lower() == "true" or is_hidden_from_page(attrs):
            continue
        if not (attrs.get("title") or attrs.get("aria-label") or attrs.get("aria-labelledby") or "<caption" in match.group(2).lower()):
            issues += 1

    for match in FIELDSET_RE.finditer(html):
        attrs = attrs_to_dict(match.group(1))
        if attrs.get("aria-hidden", "").lower() == "true" or is_hidden_from_page(attrs):
            continue
        if not (attrs.get("title") or attrs.get("aria-label") or attrs.get("aria-labelledby") or "<legend" in match.group(2).lower()):
            issues += 1

    for match in INDICATOR_RE.finditer(html):
        attrs = attrs_to_dict(match.group(2))
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if likely_wrapped_by_label(html, match.start()):
            continue
        if not (
            attrs.get("aria-label")
            or attrs.get("aria-labelledby")
            or attrs.get("title")
            or has_label_for(html, attrs.get("id", ""))
        ):
            issues += 1

    for match in CONTROL_RE.finditer(html):
        tag = match.group(1).lower()
        attrs = attrs_to_dict(match.group(2))
        if tag == "input" and attrs.get("type", "").lower() in {"hidden", "submit", "button", "reset"}:
            continue
        if likely_wrapped_by_label(html, match.start()):
            continue
        if not (
            attrs.get("aria-label")
            or attrs.get("aria-labelledby")
            or attrs.get("title")
            or has_label_for(html, attrs.get("id", ""))
        ):
            issues += 1

    for match in BUTTON_RE.finditer(html):
        if not has_accessible_name(attrs_to_dict(match.group(1)), match.group(2)):
            issues += 1

    for match in CUSTOM_BUTTON_RE.finditer(html):
        attrs = attrs_to_dict(match.group(2))
        if attrs.get("role", "").lower() == "button" and attrs.get("aria-hidden", "").lower() != "true":
            if not has_accessible_name(attrs, match.group(3)):
                issues += 1

    for match in ARIA_TAB_RE.finditer(html):
        tag = (match.group(1) or match.group(4) or "").lower()
        attrs = attrs_to_dict(match.group(2) or match.group(5) or "")
        role = attrs.get("role", "").lower()
        inner = match.group(3) or ""
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if role == "tab":
            if not has_accessible_name(attrs, inner):
                issues += 1
            if attrs.get("aria-selected") not in {"true", "false"}:
                issues += 1
            if tag not in {"button", "a"} and attrs.get("tabindex") not in {"0", "-1"}:
                issues += 1
            if attrs.get("aria-controls") and attrs["aria-controls"] not in tabpanel_ids:
                issues += 1
        if role == "tabpanel":
            if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title")):
                issues += 1
            if attrs.get("aria-labelledby") and attrs["aria-labelledby"] not in tab_ids:
                issues += 1
        if role in {"group", "listbox", "menu", "menubar", "radiogroup", "toolbar", "tree"}:
            if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title")):
                issues += 1
        if role in {"menuitem", "option", "radio", "treeitem"}:
            if not has_accessible_name(attrs, inner):
                issues += 1
            if role == "option" and attrs.get("aria-selected") not in {"true", "false"}:
                issues += 1
            if role == "radio" and attrs.get("aria-checked") not in {"true", "false"}:
                issues += 1
            if role == "treeitem" and tag not in {"button", "a"} and attrs.get("tabindex") not in {"0", "-1"}:
                issues += 1

    for match in STATEFUL_CONTROL_RE.finditer(html):
        tag = match.group(1).lower()
        attrs = attrs_to_dict(match.group(2))
        if "aria-pressed" not in attrs and "aria-expanded" not in attrs:
            continue
        if tag == "a" and attrs.get("href"):
            continue
        if attrs.get("role") != "button" or attrs.get("tabindex") != "0":
            issues += 1

    for match in CONTENTEDITABLE_RE.finditer(html):
        attrs = attrs_to_dict(f"{match.group(2)} {match.group(4)}")
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if attrs.get("role") not in {"textbox", "searchbox"}:
            issues += 1
        if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title")):
            issues += 1

    for match in CANVAS_RE.finditer(html):
        attrs = attrs_to_dict(match.group(1) or match.group(3) or "")
        inner = match.group(2) or ""
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if not (attrs.get("aria-label") or attrs.get("aria-labelledby") or attrs.get("title") or re.sub(r"<[^>]+>", "", inner).strip()):
            issues += 1

    for match in SVG_RE.finditer(html):
        attrs = attrs_to_dict(match.group(1) or match.group(3) or "")
        inner = match.group(2) or ""
        if attrs.get("aria-hidden", "").lower() == "true":
            continue
        if not (
            attrs.get("aria-label")
            or attrs.get("aria-labelledby")
            or attrs.get("title")
            or "<title" in inner.lower()
            or re.sub(r"<[^>]+>", "", inner).strip()
        ):
            issues += 1

    for match in re.finditer(r"tabindex\s*=\s*['\"]?([0-9]+)", html, re.I):
        if int(match.group(1)) > 0:
            issues += 1

    for match in CLICKABLE_NON_CONTROL_RE.finditer(html):
        attrs = attrs_to_dict(match.group(2))
        if "onclick" not in attrs:
            continue
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
