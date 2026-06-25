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

## Critical Rules

1. **Recommendations are the deliverable.** The subagents produce concrete fixes (exact code changes). Present those directly -- users apply them, they don't re-run the skills.
2. **Small changes only.** Every recommendation must be a targeted edit: a CSS value, a token swap, a copy string, a missing attribute. Never suggest structural rewrites, component replacements, or architectural changes.
3. **Report, don't fix.** Present the full review. Never apply changes without explicit user approval.
4. **Browser-first.** Use cursor-ide-browser MCP to visually inspect the live page before analysis.

## Phase 0: Context Gathering

### Resolve Impeccable skill paths

This review delegates to Impeccable's dimension skills. Locate them **once** and reuse the
result as `{IMPECCABLE_SKILLS}` everywhere below -- never hard-code an absolute or
version-pinned path. Run:

```bash
IMPECCABLE_SKILLS=""
# 1. Installed alongside this skill -- the default for the tomimor/skills install.sh,
#    which symlinks each Impeccable dimension as a sibling skill.
for base in "$HOME/.claude/skills" "$HOME/.cursor/skills"; do
  if [ -f "$base/polish/SKILL.md" ] && [ -f "$base/frontend-design/SKILL.md" ]; then
    IMPECCABLE_SKILLS="$base"; break
  fi
done
# 2. Installed as a Claude Code plugin -- pick the highest version present.
if [ -z "$IMPECCABLE_SKILLS" ]; then
  IMPECCABLE_SKILLS="$(ls -d "$HOME"/.claude/plugins/cache/impeccable/impeccable/*/.claude/skills 2>/dev/null | sort -V | tail -1)"
fi
echo "${IMPECCABLE_SKILLS:-NOT_FOUND}"
```

If it prints `NOT_FOUND`, tell the user Impeccable isn't installed (install it via the
tomimor/skills `install.sh`, or add the `impeccable` plugin) and stop. Otherwise use the
printed directory as `{IMPECCABLE_SKILLS}` for every skill path below.

### Design Context

Check for design context in this order:
1. Current instructions -- if a **Design Context** section is loaded, proceed.
2. `.impeccable.md` in project root -- read it. If it has context, proceed.
3. Neither exists -- read and run the **teach-impeccable** skill at `{IMPECCABLE_SKILLS}/teach-impeccable/SKILL.md` before continuing.

### User Input

Use the AskQuestion tool to gather:

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

1. **Navigate**: Use `browser_navigate` to open the URL.
2. **Screenshot**: Use `browser_take_screenshot` to capture the visual state.
3. **Snapshot**: Use `browser_snapshot` to get the aria/accessibility tree.
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

First, read the skill file at {SKILL_PATH} and follow its assessment criteria.
Also read the frontend-design base skill at:
{IMPECCABLE_SKILLS}/frontend-design/SKILL.md

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
| 1 | **Audit** | `{IMPECCABLE_SKILLS}/audit/SKILL.md` | Accessibility (contrast, ARIA, keyboard, semantics), performance (layout thrashing, expensive animations), theming (hard-coded colors, dark mode), responsive (fixed widths, touch targets), anti-patterns (AI slop tells) |
| 2 | **Critique** | `{IMPECCABLE_SKILLS}/critique/SKILL.md` | Visual hierarchy, information architecture, emotional resonance, composition & balance, discoverability, typography as communication, color purpose, states & edge cases, microcopy |
| 3 | **Typography** | `{IMPECCABLE_SKILLS}/typeset/SKILL.md` | Font choices (generic defaults?), type scale consistency, hierarchy clarity, readability (line length, line height), weight consistency, font loading |
| 4 | **Layout** | `{IMPECCABLE_SKILLS}/arrange/SKILL.md` | Spacing system consistency, visual rhythm (tight grouping vs generous separation), grid usage, card monotony, hierarchy through space, squint test |
| 5 | **Responsive** | `{IMPECCABLE_SKILLS}/adapt/SKILL.md` | Breakpoint coverage, touch targets (44px minimum), content reflow, orientation handling, input method adaptation |
| 6 | **Copy** | `{IMPECCABLE_SKILLS}/clarify/SKILL.md` | Error messages, form labels, button/CTA text, empty states, loading states, help text, terminology consistency |
| 7 | **Polish** | `{IMPECCABLE_SKILLS}/polish/SKILL.md` | Pixel alignment, interaction states (all 8 states), transitions & easing, icon consistency, focus indicators, reduced motion support |

All skill paths in the table are relative to `{IMPECCABLE_SKILLS}` resolved in Phase 0 (e.g. `{IMPECCABLE_SKILLS}/audit/SKILL.md`).

**The Polish subagent must also read [css-polish-details.md](css-polish-details.md)** (in this skill
directory) and apply its checklist. Append this line to the Polish subagent's prompt, after the
Impeccable skill path:

```
Also read the CSS polish checklist at {ui-review skill dir}/css-polish-details.md and report any
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

Generate the final review report following the template in [review-template.md](review-template.md).

Present the full report to the user. Every finding must include the explicit recommendation (the exact change to make).

After presenting, ask the user: "Would you like me to apply any of these recommendations?"

## Anti-Patterns

- Do NOT re-run Impeccable skills as a recommendation. The subagents already did the analysis -- their recommendations are the deliverable.
- Do NOT suggest vague fixes ("improve the contrast"). Be specific ("Change `color: #999` to `color: var(--text-secondary)` on line 42").
- Do NOT flag issues without explaining impact on users.
- Do NOT suggest rewrites or new components. Only small, targeted edits.
- Do NOT skip the browser inspection. Visual context is essential.
- Do NOT launch subagents sequentially. Always launch in parallel.
- Do NOT present findings without deduplication. Overlapping findings from different subagents must be merged.
