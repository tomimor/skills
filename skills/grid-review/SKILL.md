---
name: grid-review
description: >-
  Read-only audit of a web page's layout grid. Measures column adherence, baseline rhythm, and optical
  ink alignment in pixels (Müller-Brockmann), then critiques grid appropriateness, type scale,
  flush-left, white space, measure, and color-as-identifier (Vignelli). Mechanical px violations first,
  principled critique second, each with a minimal fix -- never rewrites. Works rigorously on pages with
  a declared CSS grid; falls back to inferred-grid plus principled checks on arbitrary pages. Use when
  the user mentions grid review, grid audit, layout grid, column alignment, baseline grid, is my grid
  aligned, Swiss grid, Müller-Brockmann, or Vignelli.
---

# Grid Review

Audit a page's layout grid and report what's measurably off and what's principally wrong. The
differentiator vs. a generic UI review: this skill **measures in pixels** — it runs a harness and
returns numbers, not a vibe. Qualitative judgment sits on top of the measured facts, never instead of
them.

Discipline and fix catalog live in [grid-discipline.md](grid-discipline.md); the output shape is
[report-template.md](report-template.md).

## Critical rules

1. **Read-only. Report, don't fix.** Produce findings ready to apply by hand. Never edit the page.
2. **Measure first, opine second.** Section 1 of the report is px violations from the harness.
   Section 2 is the Vignelli critique, explicitly built on those measured signals.
3. **Two modes, stated honestly.** An *explicit* grid (declared CSS Grid) is audited at ~2px rigor; an
   *inferred* grid (clustered element edges) is an estimate — down-rank its column findings one level
   and say so. Never present inferred drift as if it were the page's stated intent.
4. **Minimal diffs only.** Every fix is the smallest change that resolves the violation — a CSS value,
   a `grid-column`, a `line-height`. No structural rewrites (matches this repo's house style).
5. **Don't prescribe a grid the content doesn't want.** Before reporting drift, judge whether the
   content wants the grid it has (Vignelli §2.1). A two-column essay isn't broken for not being 12-up.

## What it measures

| Signal | Law | Output field |
|--------|-----|--------------|
| Column adherence (both edges) | M-B §1.1 | `columnViolations` |
| Baseline rhythm (line-height multiples) | M-B §1.2 | `baseline`, `baselineViolations` |
| Optical ink alignment of display type | M-B §1.3 | `opticalViolations` |
| Type scale / contrast | Vignelli §2.2 | `principled.distinctTextSizes`, `headBodyRatio` |
| Flush-left vs justified | Vignelli §2.3 | `principled.justifiedSelectors` |
| Measure (chars/line) | Vignelli §2.4 | `principled.avgMeasureCh` |
| Color as identifier | Vignelli §2.5 | `principled.accentHues` |

## Workflow

### Phase 1 — Gather

Get the **URL or file path** to audit, and the **quality bar** (MVP / production / flagship — sets how
strict to be on principled findings). If the user gave a URL in the prompt, skip the question.

### Phase 2 — Run the audit

Audit at **multiple widths** (default `1440, 1180, 768`) — centered-container drift only appears wider
than the max-width, and column collapse only appears narrow. Two interchangeable paths share the same
measurement core (`scripts/grid_audit_core.js`):

**Path A — Chrome MCP / browser-eval (preferred, no install).** Use when a browser-eval MCP tool is
connected (Chrome MCP / Claude-in-Chrome / Preview). This runs in a real browser with the page's real
fonts, so optical-ink numbers are trustworthy.
1. Navigate to the URL; resize to each width.
2. Wait for fonts: eval `await document.fonts.ready`.
3. Eval the entire contents of `scripts/grid_audit_core.js` (defines `window.__gridAudit`).
4. Eval `JSON.stringify(window.__gridAudit({ displayMinPx: 40 }))` and parse the result. `displayMinPx`
   is the font-size floor (px) for the optical-ink check — lower it for small-display pages.
5. Repeat per width.

**Path B — headless script (CI / no browser MCP).** One command, auto-detects a driver
(playwright → puppeteer → puppeteer-core with `CHROME=<binary>`):
```bash
node scripts/audit_grid.mjs <url|file> --widths=1440,1180,768 --json /tmp/grid.json
```
If no driver is installed it prints the install/MCP fallback and exits — the audit logic needs no
install, only a way to drive a page. Install the driver at the repo root (`npm i -D playwright`) so the
script resolves it by walking up from `scripts/`. Headless without the page's webfont makes optical-ink
numbers unreliable (see grid-discipline §1.3); prefer Path A when optical findings matter.

### Phase 3 — Synthesize

Read [grid-discipline.md](grid-discipline.md) and turn the JSON into the report:
1. **Section 1 (measured):** list real `columnViolations` / `baselineViolations` / `opticalViolations`,
   worst offset first, each with its law citation and a one-line fix. A clean width is a finding too —
   say it passed. In **inferred** mode, prefix column findings with the confidence and the estimate
   caveat.
2. **Section 2 (principled):** judge `principled.*` against the Vignelli laws — scale soup past ~6
   sizes, weak contrast below ~1.5×, measure outside 45–75ch, 3+ accent hues, justified text. Lead
   with the appropriateness question.
3. **Top 3 moves:** the smallest changes with the most effect.

Use the severity mapping at the bottom of grid-discipline.md. Fill [report-template.md](report-template.md).

### Phase 4 — Deliver

Present the report in chat (or write to a file if long). Nothing was changed; findings are
copy-paste-ready. Offer to apply the top fixes only if the user asks.

## Scope

- **In:** auditing the grid/layout discipline of a rendered web page (declared or arbitrary).
- **Out:** generating a grid from scratch (that's a scaffold generator, not this); fixing the page;
  non-grid UI concerns like a11y, perf, or copy — route those to `ui-review`, `benchmark`, etc.
  `grid-review` is the deep, measured layout specialist those broader reviews can defer to.

## Attribution

Measurement laws adapted from the `muller-brockmann-grid-systems` skill; principled laws from
`vignelli-canon-design-system` — both from
[hyperagent-public-skills](https://github.com/alexmcdonnell-airtable/hyperagent-public-skills),
re-cast here as a read-only auditor. Design-corpus credit to Josef Müller-Brockmann (*Grid Systems in
Graphic Design*) and Massimo Vignelli (*The Vignelli Canon*).
