# Grid discipline — the laws behind the audit

Two lineages, distilled into the rules this skill checks and the fixes it prescribes.
Read this when synthesizing the report so every finding cites a law and a remedy.

- **Measurable laws** come from Josef Müller-Brockmann, *Grid Systems in Graphic Design* (1981) —
  the Swiss/International Typographic Style modular grid, made load-bearing on the web.
- **Principled laws** come from Massimo Vignelli, *The Vignelli Canon* — the judgment a ruler can't
  measure: whether the grid is even appropriate, and whether restraint is doing its job.

> Source: rules adapted from the `muller-brockmann-grid-systems` and `vignelli-canon-design-system`
> skills in github.com/alexmcdonnell-airtable/hyperagent-public-skills, re-cast here as a read-only
> audit. Original design corpus credit to Müller-Brockmann and Vignelli.

---

## PART 1 — Measurable laws (Müller-Brockmann)

These map 1:1 to the numbers `grid_audit_core.js` returns.

### 1.1 Column adherence
Every element occupies whole columns: its left edge snaps to a column **start** line and its right
edge to a column **end** line. A grid item that lands mid-column is off the grid.
- **Audit:** `columnViolations` — offset in px from the nearest line, per side.
- **The both-edges gotcha:** an item spanning "to line N" ends at the *far* side of the gutter.
  Check left against the start-set and right against the end-set; single-edge math falsely reports a
  one-gutter error. (The core builds both sets.)
- **Fix:** place the element on column lines — in CSS Grid, `grid-column: <start> / <end>`; in a
  flex/manual layout, set width/margins to land on the measured line. Don't eyeball spans.

### 1.2 Baseline rhythm
Vertical rhythm is sacred: **leading = a whole multiple of the baseline unit** (commonly 8px on the
web; 4/6/12 also valid), and every block snaps to it. This is what makes facing columns line up.
- **Audit:** `baseline.unit`, `lineHeightMultipleRate`, and `baselineViolations` (text whose
  line-height isn't a multiple of the unit).
- **Web trap:** unitless `line-height` on large display type pushes the box off the grid — use **px**
  line-heights that are baseline multiples for headings.
- **Fix:** set `line-height` to the nearest baseline multiple; make vertical margins/padding and media
  heights multiples of the unit too.

### 1.3 Optical alignment — ink, not box
A large headline whose layout **box** sits exactly on a column line still looks misaligned, because
the letterform's **ink** is inset by its left side-bearing. **Box-on-grid ≠ ink-on-grid.**
- **Audit:** `opticalViolations` — the side-bearing offset (`inkOffsetPx`) of the first glyph of each
  display element, measured against the *actually loaded* font via canvas.
- **Confidence caveat:** side-bearing is font-specific. If the audit ran headless without the page's
  webfont, canvas falls back to a different grotesque and the nudge is wrong. Trust optical numbers
  most from the Chrome-MCP path (real browser, real fonts) or after `document.fonts.ready`.
- **Fix:** shift the box so the ink lands on the line — at runtime,
  `el.style.marginLeft = actualBoundingBoxLeft + 'px'` after fonts load, re-run on resize. Apply to
  mastheads, big numerals, and section headlines only (body text doesn't need it).

### 1.4 Craft defaults (informational, not pass/fail)
Grotesque sans for display + body (Inter / Helvetica Now / Archivo); flush-left, ragged-right; few
sizes with large jumps in scale; near-black ink on white; **one** accent (Swiss red is canonical); no
warm-cream cast, no blue/purple gradients. Big data set as **large numerals**.

---

## PART 2 — Principled laws (Vignelli)

A page can pass every px check and still be a bad grid. These are the judgment calls — the audit
surfaces measured signals; you decide.

### 2.1 Is the grid appropriate at all?
"Infinite grids, but just one — the most appropriate — for any problem." Too fine = an empty page;
too coarse = restrictive. Before reporting drift, ask whether the content *wants* this grid. A photo
essay, a data table, and a manifesto want different structures. Don't prescribe a 12-column grid to
content that wants two.

### 2.2 Two type sizes, strong contrast
**Two sizes per page, maximum** as the ideal; heading ≈ **2× body**. Hierarchy comes from **scale +
weight + white space**, not from a soup of sizes or from color.
- **Audit signal:** `distinctTextSizes` (flag the page as "scale soup" past ~6 distinct sizes) and
  `headBodyRatio` (flag weak contrast below ~1.5×).
- **Fix:** collapse near-duplicate sizes to a small scale; push the heading/body ratio toward 2×.

### 2.3 Flush-left, never justified
Flush-left/ragged-right by default. "Justified is fundamentally contrived" — the rivers and uneven
spacing break the texture. Centered only for lapidary text (invitations, addresses).
- **Audit signal:** `justifiedSelectors`.
- **Fix:** `text-align: left`.

### 2.4 White space is the protagonist
"It is really the white that makes the black sing." Generous margins; don't fill the page. Crowding is
the most common failure. Measure (characters per line) belongs in the **45–75ch** band — wider reads
as a wall, much narrower as a ransom note.
- **Audit signal:** `avgMeasureCh`.
- **Fix:** widen margins / cap content measure; add baseline-multiple spacing between bands.

### 2.5 Color as identifier, not decoration
Default to a restrained palette with **one** identifier color (Vignelli's primaries: red/blue/yellow).
Color signifies; it isn't pictorial filler. Many accent hues = noise.
- **Audit signal:** `accentHues` (flag past ~2 distinct non-grey hues in text).
- **Fix:** demote extra hues to grey; keep one accent for what matters.

### 2.6 Timelessness & equity
Prefer primary shapes, durable typography, and — for an existing identity — **refine, don't replace**.
This is a stance for recommendations: bias toward the smallest change that fixes the violation, never a
rewrite. (Matches this repo's house style: minimal diffs, deletions over additions.)

---

## Severity mapping (use in the report)

| Severity | Use for |
|----------|---------|
| **Must fix** | Measured grid breakage with high confidence: column offsets above tolerance on a declared grid; justified body text; broken baseline on a page that clearly intends one. |
| **Should fix** | Principled violations with clear signal: scale soup, weak head/body contrast, measure far outside 45–75ch, 3+ accent hues, optical-ink offsets on mastheads. |
| **Nice to have** | Low-confidence inferred-grid drift; craft-default nudges; informational font-family notes. |

When the grid is **inferred** (no declared CSS grid), down-rank column findings by one level — the
target line is an estimate, not the page's stated intent. Say so explicitly.
