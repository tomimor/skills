# Grid Review — {page or URL}

**Mode:** {explicit | inferred} grid · **Confidence:** {high | medium | low}
**Detected:** {N} columns (explicit grid) / ≈{N} inferred column bands · {baseline}px baseline ({rate}% of line-heights on rhythm)
**Widths audited:** {1440, 1180, 768}

> One-line verdict: is the grid load-bearing, decorative, or absent — and does the content want the
> grid it has?

---

## 1. Measured violations (mechanical — px, not opinion)

Sorted by severity, worst offset first. Each cites the law from `grid-discipline.md` and a one-line fix.

| Sev | Finding | Where | Measured | Fix |
|-----|---------|-------|----------|-----|
| Must | Column item off the grid | `selector` | left +14px @1440 | `grid-column: 6 / 13` (snap to line) |
| Must | Justified body text | `selector` | — | `text-align: left` |
| Should | Headline ink off the line | `selector` | inkOffset 9px | `margin-left: 9px` after fonts load |
| Should | Baseline broken | `selector` | line-height 27px vs 8px unit | `line-height: 24px` |

(Only list real offenders. If a width passes clean, say so — don't pad.)

## 2. Principled critique (Vignelli lens — judgment on the measured signals)

- **Grid appropriateness:** {does the content want this grid? one honest sentence}
- **Type scale:** {distinctTextSizes} distinct sizes, head/body {ratio}× → {scale soup? weak contrast?}
- **Measure:** {avgMeasureCh}ch → {inside / outside the 45–75ch band}
- **Color:** {N} accent hues → {one identifier, or noise?}
- **White space:** {crowded / breathing}

## 3. Top 3 moves

The smallest changes with the most effect. Minimal diffs, no rewrites.

1. …
2. …
3. …

---

_Read-only audit. Nothing was changed. Findings are ready to apply by hand._
