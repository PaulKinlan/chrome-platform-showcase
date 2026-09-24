# 8vh — valid corner-shape examples

Implementation verification, 2026-09-24. Independent review is required before landing. Base:
`3d219d0b1`. Browser: Chrome DevTools MCP, HeadlessChrome/152.0.0.0 Linux. Desktop 1280×800 DPR1;
mobile-emulated 360×740 DPR3 with touch. Subsequently rebased onto `0ca6b7036`; the three
implementation HTML files, shared stylesheet, panel runner and injection code are unchanged from the
browser-tested tree.

## Change

- Replace invalid `straight` with `square`; add `superellipse(2)` to the gallery.
- Explain six keywords plus one functional example, including the intentional `squircle` alias.
  Derive support/readout counts from the actual examples.
- Keep `corner-shape` detection distinct from the newer `corner` shorthand suite.
- Correct the same stale keyword in the sibling builder. Its newly reachable
  `superellipse(infinity)` read-back initially caused 373px document width on a 360px viewport;
  scoped table-cell wrapping fixes that without hiding content.
- Preserve routes, all other controls and every immutable conformance assertion. The existing Ticket
  stub preset question remains open in its critique and follow-up bead
  `chrome-platform-showcase-w32`.

## Spec and guidance

[CSS Borders 4](https://drafts.csswg.org/css-borders-4/#typedef-corner-shape-value) defines
`round | scoop | bevel | notch | square | squircle | superellipse()`. `square` is equivalent to
`superellipse(infinity)`; `squircle` is equivalent to `superellipse(2)`. The grammar was fetched
directly; a preceding Claude search attempt failed with exit 1.

Canonical `npx -y modern-web-guidance@latest` was queried for corner-shape values, progressive
fallback and responsive wrapping. Consulted `css` §8 (corner-shape as progressive enhancement over
border-radius) and §7 (`overflow-wrap` for long strings). Per-value detection/fallback remains; only
the computed-value cells need additional wrapping. Critiques record those consultations. The
installed skill template warns that version `2026_05_16-c5e78707` should be updated to
`2026_09_04-7de96777`; no global configuration was changed or guide text vendored.

## Browser results

- **Before:** [native record](evidence/before-desktop.json) and
  [screenshot](evidence/before-desktop.png) show 5/6 support, invalid `straight` falling back to
  round, and valid `square` / `superellipse(2)` parsing.
- **Gallery, both sizes:** seven valid values, 7/7 count, native computed shapes; radius 28 → 0 → 80
  → 79 → 0 updates every box. At zero all boxes are square; at 80, square remains square and the two
  squircle spellings visibly match. [Desktop](evidence/gallery-desktop.json),
  [mobile](evidence/gallery-mobile.json).
- **Keyboard:** natural Tab navigation reaches the labelled range. Home then ArrowRight produces
  1px, visible native focus and an updated polite live output.
  [Desktop](evidence/gallery-desktop-keyboard.json),
  [mobile](evidence/gallery-mobile-keyboard.json).
- **Fallback diagnostics:** deliberately intercepting only `CSS.supports` results gives 0/7 (all
  unavailable) and 5/7 (square/function unavailable). Unsupported boxes retain border-radius and the
  slider still works at both sizes. These are **simulations, not old-browser results**; see
  `gallery-*-unavailable.json` and `gallery-*-partial.json` in [evidence](evidence/).
- **Builder, both sizes:** all four selects, all four sliders and all three presets were driven.
  Every offered keyword parses; all-square selection generates `corner: square 24px` and reads back
  `superellipse(infinity)` for each corner. Mixed selections and all four 80px sliders update the
  preview. [Desktop](evidence/builder-desktop.json), [mobile](evidence/builder-mobile.json).
- **Layout:** final tested states have matching client/document widths at 360px and 1280px; primary
  controls are at least 44px high. The [pre-wrap failure](evidence/builder-pre-wrap-mobile.json) is
  retained rather than counted as a pass.
- **Conformance:** the unchanged injected feature suite remains **1 pass / 7 fail** in this MCP
  configuration. These separate shorthand assertions were not weakened, suppressed or presented as
  fixed by the gallery's 7/7 count.
- Final recorded console snapshots contain no warnings/errors. Network snapshots preserve observed
  request states; backend telemetry storage was not audited.

Screenshots: gallery [desktop 0](evidence/gallery-desktop-0.png),
[desktop 80](evidence/gallery-desktop-80.png), [mobile 0](evidence/gallery-mobile-0.png),
[mobile 80](evidence/gallery-mobile-80.png), and
[builder mobile square](evidence/builder-mobile-square.png).

The raw-CDP `responsive-check` script was **not** used: the repository requires Chrome DevTools MCP
only. The equivalent scoped matrix above was driven through MCP and the existing feature support
record's check date updated. No catalogue-wide, physical-device, screen-reader or flag-enabled
shorthand acceptance claim.

## Repository gates

[Recorded gate run](gates/exits.txt): `check-routes`, `check-duplicates`, and `check` **PASS**. The
route gate retains 849 published routes and 477/850 coverage on both device classes.

The additional mandatory live `check-demo-coverage` **FAILS**: two v157 anchor-visibility listings
have no demo (feature IDs 5136856479039488 and 5136123851571200). No v157, demo-index or coverage
logic changed in this patch. This is recorded separately as `chrome-platform-showcase-0mu`, not
silently treated as a passing gate. See [full failure](gates/check-demo-coverage.txt). Coordinator
explicitly requested publishing the review branch; main is not approved by these implementation
checks, and landing disposition must account for this red gate.

The gate candidate file identifies the pre-publication commit; subsequent changes only package this
report and the previously recorded regression logs, not implementation or assertions.

## Regression check

```sh
deno run --allow-read scripts/corner-shape-values.test.mjs
```

It checks the two exposed vocabularies and stale fixed-count copy without pretending to be a CSS
engine. The same check fails on the actual baseline sources and passes after the fix:
[before](evidence/before-regression.txt), [after](evidence/after-regression.txt). Native
parsing/rendering is covered above.

An initial navigation failed because the local server had not started; it was started explicitly. A
later MCP reset invalidated page 7 before the post-wrap run; pages were rediscovered and the
complete run replayed on page 9. All browser work remained within MCP. Reviewers should use a fresh
context, as the deliberately modified feature-detection pages are not native acceptance targets.
