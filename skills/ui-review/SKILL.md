---
name: ui-review
description: >-
  Orchestrates a comprehensive frontend UI review by running parallel analysis across typography,
  layout, accessibility, responsiveness, copy, visual polish, and design critique. Uses browser
  inspection for visual context. Produces a prioritized plan of small, concrete fixes -- never
  rewrites. Use when the user mentions UI review, frontend review, page review, design review,
  visual review, audit my page, or review my UI.
---

# UI Review

Comprehensive frontend review that orchestrates 7 Impeccable analysis dimensions via parallel
subagents. Produces a plan artifact with explicit, ready-to-apply recommendations.

## Critical rules

1. **Recommendations are the deliverable.** The subagents produce concrete fixes (exact code changes). Present those directly -- users apply them, they don't re-run the skills.
2. **Small changes only.** Every recommendation must be a targeted edit: a CSS value, a token swap, a copy string, a missing attribute. Never suggest structural rewrites, component replacements, or architectural changes.
3. **Report, don't fix.** Present the full review. Never apply changes without explicit user approval.
4. **Browser-first.** Visually inspect the live page before analysis using whichever browser tool is connected (Chrome MCP / browser-eval MCP / IDE browser).

## Phase 0: Context Gathering

### Locate the Impeccable pack

The per-dimension review criteria come from the **Impeccable** skill pack, which is installed alongside this skill (in this repo it lives at `skills/impeccable`, vendored from [pbakaus/impeccable](https://github.com/pbakaus/impeccable); when installed it is a sibling of this skill's directory, e.g. `~/.claude/skills/impeccable` or `~/.cursor/skills/impeccable`). Find it once and reuse the path:

```bash
IMPECCABLE_DIR=$(dirname <this skill's directory>)/impeccable
```

Internal layout varies by Impeccable version -- locate each dimension's file by name (glob for `audit`, `critique`, `typeset`, etc. under `IMPECCABLE_DIR`), never by a hardcoded internal path. **If the pack is not installed**, tell the user and run the review anyway using the **Criteria Focus** column of the dimension table below as each subagent's criteria.

### Design Context

Check for design context in this order:
1. Current instructions -- if a **Design Context** section is loaded, proceed.
2. `.impeccable.md` in project root -- read it. If it has context, proceed.
3. Neither exists -- run Impeccable's teach/setup flow (the `teach-impeccable` file under `IMPECCABLE_DIR`) before continuing. If the pack is absent, ask the user for the essentials instead: brand personality, target feel, and any design tokens.

### User Input

Use the AskUserQuestion tool to gather:

```
Questions:
1. "What is the URL of the page to review?" (free text or provide the current URL)
2. "What is the quality bar?" with options: ["MVP / early stage", "Production feature", "Flagship / high polish"]
3. "Any specific focus areas?" with options: ["All dimensions", "Typography only", "Layout & spacing only", "Accessibility only", "Responsiveness only", "Copy & UX writing only", "Visual polish only", "Design critique only"]
   (allow_multiple: true)
```

If the user already provided the URL and context in their message, skip redundant questions.

## Phase 1: Visual Capture

Navigate to the page and capture its current state:

1. **Navigate**: Open the URL with the browser tool's navigate action.
2. **Screenshot**: Capture the visual state with its screenshot action.
3. **Snapshot**: Get the aria/accessibility tree if the tool exposes one (otherwise evaluate `document.body` structure via its JS-eval action).
4. **Source files**: Ask the user which source files to review, or infer from the page structure. Read them with the Read tool.

Store all captured context -- it gets passed to every subagent.

## Phase 2: Parallel Reviews

Launch subagents in parallel using the Task tool. Each subagent is `readonly: true`.

For each dimension, the subagent reads its Impeccable skill file, applies the assessment criteria to the captured context, and returns structured findings.

**Launch ALL applicable subagents in a single message** (parallel execution):

### Subagent Definitions

Each subagent prompt follows this template. Replace `{DIMENSION}`, `{SKILL_PATH}`, and `{CRITERIA}` per dimension:

```
You are reviewing a frontend page for {DIMENSION} issues.

First, read the Impeccable file for this dimension at {SKILL_PATH} and follow its
assessment criteria. Also read Impeccable's base design file (`frontend-design`,
located under {IMPECCABLE_DIR}). If Impeccable is not installed, use the criteria
listed below instead.

Then analyze the page using this context:
- Design context: {design_context from .impeccable.md or instructions}
- Source files to review: {list of files and their contents}

Additional criteria to focus on:
{CRITERIA}

RULES:
- Report ONLY small, targeted fixes (a CSS value, a token, a string, a missing attribute).
- Do NOT suggest structural rewrites, component replacements, or architectural changes.
- For each finding, return EXACTLY this structure:
  - location: file path and line number, or CSS selector
  - severity: Critical / High / Medium / Low
  - issue: what is wrong (one sentence)
  - recommendation: the EXACT change to make (e.g. "Change `font-size: 14px` to `font-size: 1rem`")
  - effort: trivial / small

Return findings as a numbered list. If no issues found, say "No issues found."
```

The 7 dimensions:

| # | Dimension | Skill Path | Criteria Focus |
|---|-----------|-----------|----------------|
| 1 | **Audit** | `.../skills/audit/SKILL.md` | Accessibility (contrast, ARIA, keyboard, semantics), performance (layout thrashing, expensive animations), theming (hard-coded colors, dark mode), responsive (fixed widths, touch targets), anti-patterns (AI slop tells) |
| 2 | **Critique** | `.../skills/critique/SKILL.md` | Visual hierarchy, information architecture, emotional resonance, composition & balance, discoverability, typography as communication, color purpose, states & edge cases, microcopy |
| 3 | **Typography** | `.../skills/typeset/SKILL.md` | Font choices (generic defaults?), type scale consistency, hierarchy clarity, readability (line length, line height), weight consistency, font loading |
| 4 | **Layout** | `.../skills/arrange/SKILL.md` | Spacing system consistency, visual rhythm (tight grouping vs generous separation), grid usage, card monotony, hierarchy through space, squint test |
| 5 | **Responsive** | `.../skills/adapt/SKILL.md` | Breakpoint coverage, touch targets (44px minimum), content reflow, orientation handling, input method adaptation |
| 6 | **Copy** | `.../skills/clarify/SKILL.md` | Error messages, form labels, button/CTA text, empty states, loading states, help text, terminology consistency |
| 7 | **Polish** | `.../skills/polish/SKILL.md` | Pixel alignment, interaction states (all 8 states), transitions & easing, icon consistency, focus indicators, reduced motion support |

`...` in the Skill Path column is `IMPECCABLE_DIR` resolved in Phase 0. If a dimension file isn't found there by that name (layout varies by Impeccable version), glob for it; if the pack is absent, drop {SKILL_PATH} from the prompt and use the Criteria Focus column alone.

**The Polish subagent must also read [css-polish-details.md](references/css-polish-details.md)** (in this skill
directory) and apply its checklist. Append this line to the Polish subagent's prompt, after the
Impeccable skill path:

```
Also read the CSS polish checklist at {ui-review skill dir}/references/css-polish-details.md and report any
missing details: concentric border radius, tabular numbers, text-wrap balance/pretty, font
smoothing, and image outlines.
```

**If the user selected specific focus areas** in Phase 0, only launch those subagents.

## Phase 3: Aggregate and Deduplicate

After all subagents return:

1. **Collect** all findings from every subagent.
2. **Deduplicate**: If multiple subagents flagged the same issue (e.g., "contrast too low" from audit and polish), merge into one finding. Keep the most specific recommendation.
3. **Assign severity**: Use the highest severity any subagent gave. Severity guide:
   - **Critical**: Blocks core functionality or violates WCAG A.
   - **High**: Significant usability/accessibility impact, WCAG AA violation.
   - **Medium**: Quality issues, readability concerns, inconsistencies.
   - **Low**: Minor polish, optimization opportunities.
4. **Categorize**: Assign each finding to one category: `accessibility` / `typography` / `layout` / `responsive` / `copy` / `visual-polish` / `design`.

## Phase 4: Plan Artifact

Generate the final review report following the template in [review-template.md](references/review-template.md).

Present the full report to the user. Every finding must include the explicit recommendation (the exact change to make).

After presenting, ask the user: "Would you like me to apply any of these recommendations?"

## Anti-patterns

- Do NOT re-run Impeccable skills as a recommendation. The subagents already did the analysis -- their recommendations are the deliverable.
- Do NOT suggest vague fixes ("improve the contrast"). Be specific ("Change `color: #999` to `color: var(--text-secondary)` on line 42").
- Do NOT flag issues without explaining impact on users.
- Do NOT suggest rewrites or new components. Only small, targeted edits.
- Do NOT skip the browser inspection. Visual context is essential.
- Do NOT launch subagents sequentially. Always launch in parallel.
- Do NOT present findings without deduplication. Overlapping findings from different subagents must be merged.

## Pair with / defer to

- `grid-review` — deep, **measured** layout-grid audit (px-level column/baseline checks); defer grid questions there.
- `benchmark` — page performance and Core Web Vitals; out of scope here.
- `qa-manual` — behavior verification in the browser; this skill is about polish, that one about function.
- `share-ready` — link previews, favicons, and social/meta presentation.
