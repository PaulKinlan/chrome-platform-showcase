# Responsive probe calibration — layout viewport, not `window.innerWidth`

Status: applied to `scripts/responsive-check.mjs` (this change) and to `scripts/overflow-scan.mjs`
(the same signal, landed with the `--concepts` mode). Evidence for bead
`chrome-platform-showcase-ayg`.

## The defect

The harness measured horizontal overflow as:

```js
document.documentElement.scrollWidth - window.innerWidth;
```

Under mobile emulation Chrome expands the layout viewport to fit wide content in normal flow, so
`window.innerWidth` grows to the **content** width. The subtraction then collapses toward zero for
content a phone user cannot fit on screen.

Positive control — a page with a deliberately injected 1400px block:

```
clientWidth (layout viewport)  360
scrollWidth                    1424
window.innerWidth              1424     <- expanded to the content
visualViewport.width           360
scrollWidth - innerWidth          0     <- what the harness reported: clean
scrollWidth - clientWidth      1064     <- the truth
```

## The fix

`documentElement.clientWidth` is the layout viewport and does not expand, so the signal becomes
`scrollWidth - clientWidth`. Per-control `clipped` counting uses the same reference, because a
control past the layout viewport is not reachable on a phone. Both numbers are reported in the probe
result (`innerWidth` now carries the layout reference, `reportedInnerWidth` keeps the browser's own
value) so the reference is never implicit.

## Falsification test (reproducible, no merge)

A page that the old signal called clean and the new one must call broken:

```bash
deno task responsive-check v131/nested-pseudo-elements-styling --no-server
```

```
before this change:  [mobile] OK — clean
after  this change:  [mobile] BROKEN — h-overflow 199px
                     [desktop] OK — clean
```

Independently confirmed at a **plain 360×740 viewport** (no mobile flag, where both signals agree):
`scrollWidth 559 = clientWidth 360` → 199px, and `v140/clipboardchange-event` measures 78px the same
way.

## Severity: overflow splits into two classes — measure which one

The layout-viewport signal detects both, and the harness contract is "no horizontal overflow", so
both fail. They differ in what a user loses:

| class                                                          | test                                                           | example                                                                                            |
| -------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **unreachable** — content cannot be scrolled to                | `scrollLeft`/`window.scrollX` stay at 0 after a scroll attempt | the four feature records in opus's independent sample                                              |
| **reachable but overflowing** — viewport scrolls, no scrollbar | `window.scrollX` moves                                         | `v131/nested-pseudo-elements-styling` (scrollX → 199), `v140/clipboardchange-event` (scrollX → 78) |

Repair order should favour the unreachable cases; the reachable ones are still violations of the
invariant.

## The verdict change is wider than the overflow number

`clipped` — the count of controls whose box falls outside the reference — now also uses the layout
viewport, because a control past it is not reachable on a phone. That means a page can flip to
`broken` on clipped controls alone, with no `h-overflow` reason at all, and the run report's
`overflow` field alone does not describe the whole change. Check `clipped` alongside `overflow` when
reading a before/after comparison.

## Field name: `layoutViewport`, not `innerWidth`

The probe still returns two widths, and they are different quantities: `layoutViewport` (=
`documentElement.clientWidth`, the reference used for every verdict) and `reportedInnerWidth` (= the
browser's own `window.innerWidth`, kept for diagnosis). The first draft kept the name `innerWidth`
while changing what it held, which would have made a before/after comparison of persisted run
reports compare two different quantities under one name — the exact defect class this change exists
to kill.

## Records policy (coord ruling, 2026-09-24)

Existing `ok` records are **not** mass-flipped. A `broken` record makes the route gate fail with no
escape until the page is fixed, and an `ok → needs-review` flip fails the monotonic check unless a
migration record names the id — so a bulk rewrite would fail every lane's pre-push gate on files
they never touched. The tooling is now honest; each record is corrected by the repair wave that
fixes its page.

## Scope note

This is a report, not a CI test: the proof needs a real Chrome and a served page, which
`deno task check` deliberately does not require. If a headless-browser test gate is wanted later,
this file names the two pages and the exact expected verdicts to assert.
