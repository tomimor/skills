# UI Review Report Template

Use this structure when generating the final review report in Phase 4.

---

## Output Structure

```markdown
# UI Review: {page name or URL}

**Date**: {date}
**Quality bar**: {MVP / Production / Flagship}
**Dimensions reviewed**: {list of dimensions that were run}

---

## Anti-Patterns Verdict

**Pass / Fail**: Does this page look AI-generated?

{If fail, list specific tells from the frontend-design skill's DON'T guidelines:}
- {Tell 1: e.g., "Uses the AI color palette: cyan accent on dark background"}
- {Tell 2: e.g., "Identical card grid with icon + heading + text repeated 3x"}

{If pass: "No obvious AI slop tells detected."}

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | {n}   |
| High     | {n}   |
| Medium   | {n}   |
| Low      | {n}   |
| **Total** | **{n}** |

**Top 3 issues**:
1. {Most impactful issue -- one sentence}
2. {Second most impactful -- one sentence}
3. {Third most impactful -- one sentence}

---

## Recommendations

### Critical

| # | Category | Location | Issue | Recommendation | Effort |
|---|----------|----------|-------|----------------|--------|
| 1 | accessibility | `Modal.tsx:18` | IconButton missing accessible name | Add `aria-label="Close dialog"` to the IconButton | trivial |
| 2 | accessibility | `.card-subtitle` | Contrast ratio 2.8:1, fails WCAG AA | Change `color: #999` to `color: var(--text-secondary)` (4.6:1 ratio) | trivial |

### High

| # | Category | Location | Issue | Recommendation | Effort |
|---|----------|----------|-------|----------------|--------|
| 3 | typography | `Hero.tsx:42` | Body text uses px, ignores user font settings | Change `font-size: 14px` to `font-size: 0.875rem` | trivial |
| 4 | layout | `.feature-grid` | Equal spacing everywhere, no visual rhythm | Change `gap: 24px` to `gap: var(--space-sm)` between siblings, `gap: var(--space-xl)` between sections | small |

### Medium

| # | Category | Location | Issue | Recommendation | Effort |
|---|----------|----------|-------|----------------|--------|
| 5 | responsive | `.nav-link` | Touch target 32x32px, below 44px minimum | Add `padding: 6px` to reach 44x44px tap area | trivial |
| 6 | copy | `EmptyState.tsx:8` | Empty state just says "No items" | Change to "No projects yet. Create your first one to get started." | trivial |

### Low

| # | Category | Location | Issue | Recommendation | Effort |
|---|----------|----------|-------|----------------|--------|
| 7 | visual-polish | `.card:hover` | No hover transition, state change is abrupt | Add `transition: transform 200ms cubic-bezier(0.25, 1, 0.5, 1)` | trivial |
| 8 | design | `.hero-section` | Pure black background (#000) | Change to `oklch(8% 0.01 250)` for a tinted near-black | trivial |

---

## Positive Findings

Highlight what's working well -- patterns to keep and replicate:

- {e.g., "Consistent use of design tokens for spacing throughout the sidebar component"}
- {e.g., "Clear visual hierarchy in the header -- primary CTA is immediately obvious"}
- {e.g., "Good use of semantic HTML landmarks (nav, main, aside)"}

---

## Summary by Category

| Category | Findings | Most Common Severity |
|----------|----------|---------------------|
| accessibility | {n} | {severity} |
| typography | {n} | {severity} |
| layout | {n} | {severity} |
| responsive | {n} | {severity} |
| copy | {n} | {severity} |
| visual-polish | {n} | {severity} |
| design | {n} | {severity} |
```

## Rules for Filling the Template

- Every recommendation cell must contain an **exact change**: a specific CSS property, attribute, text string, or token to add/modify/remove. Never use vague language like "improve contrast" or "consider using tokens."
- The `Location` column must point to a real file:line or CSS selector from the source code.
- Use real values from the codebase, not placeholder examples. The examples in the template above are illustrative only.
- Keep issue descriptions to one sentence.
- Keep recommendations to one sentence with the specific change.
- If a finding was reported by multiple subagents, list it once with the most specific recommendation.
- Order findings within each severity group by category, then by location.
- The Positive Findings section must have at least 2 items. If the page is well-built, say so.
