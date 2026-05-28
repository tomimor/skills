---
name: ai-triage
description: Scan open issues in the current GitHub repo and pick the top 3 best suited for an AI coding agent, ranked by problem clarity, bounded scope, and presence of acceptance criteria. Use when the user mentions AI triage, finding AI-ready issues, picking issues for an agent, or asks "what should I give to Claude/Codex/an agent?".
---

# AI Triage

Find open issues that are well-described, bounded, and ready to be handed to an agent. Return the top 3 picks with a one-paragraph justification each.

## Critical Rules

1. **Top 3 only.** Do not pad the list. If fewer than 3 issues meet the bar, return fewer and say so.
2. **Read the body, not just the title.** A great title with an empty body is not AI-ready. Open the issue and inspect the description.
3. **Score against the rubric, not vibes.** Use the rubric below and show the score so the user can override.
4. **Never assign, comment, or modify issues.** This skill is read-only. Output is for the user to act on.

## Workflow

### Step 1: Detect Repo

```bash
gh repo view --json nameWithOwner -q '.nameWithOwner'
```

If not in a git repo or `gh` fails, tell the user and stop. If `gh` is not authenticated, suggest `gh auth login` and stop.

### Step 2: Fetch Candidate Issues

Pull open issues that aren't already assigned and aren't drafts of larger conversations:

```bash
gh issue list --state open --limit 50 \
  --json number,title,body,labels,assignees,comments,createdAt,updatedAt,author,url
```

Filter out:
- Issues with `assignees` (someone is already on it)
- Issues labeled `blocked`, `needs-design`, `discussion`, `question`, `epic`, `meta`, or any label clearly signalling "not ready"
- Issues whose body is empty or under ~200 characters (not enough signal)
- Issues with more than ~15 comments (likely contested, scope-creeping, or already partially solved in discussion)

If zero candidates remain after filtering, report that and stop.

### Step 3: Score Each Candidate

Score each remaining issue 0–2 on every dimension. Max score is 12.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| **Problem clarity** | Vague or rambling | Understandable but needs inference | Crisp problem statement |
| **Scope** | Touches many subsystems or open-ended | Medium, one feature area | Single file or small surface |
| **Acceptance criteria** | None | Implied | Explicit checklist or "done when…" |
| **Reproducibility / examples** | None | Some context | Repro steps, sample input, or code snippet |
| **Self-contained** | Needs external decisions, designs, or stakeholder input | Some open questions | Fully specified, no coordination needed |
| **Locality hints** | No file/module references | Mentions an area | Names files, functions, or links to code |

Bonus signals (each adds 0.5 to the score, cap at 12):
- Labeled `good first issue`, `help wanted`, `bug`, or similar "actionable" labels
- Linked PR attempts that were closed without merging (prior context)
- Recently updated (< 30 days)

Penalty signals (each subtracts 1):
- Label suggests architectural change (`refactor`, `breaking-change`, `RFC`)
- Body contains "we should discuss", "needs design", "not sure how", "TBD"
- Author asks a question rather than describes a task

### Step 4: Pick Top 3

Take the 3 highest-scoring issues with a score ≥ 6. If fewer than 3 meet the bar, return what you have and explicitly say "only N issues met the AI-ready threshold."

Tiebreak by:
1. Smaller scope wins
2. More recent activity wins
3. Lower issue number wins (older, more vetted)

### Step 5: Output

For each pick, output:

```
## {rank}. {title}

**Issue:** [#{number}]({url}) — score {score}/12
**Labels:** {labels}
**Why it's AI-ready:** {1-2 sentence justification grounded in the rubric. Mention concrete strengths — "has explicit repro steps and names the failing function" — not generic praise.}
**Suggested approach:** {1 sentence on how an agent should attack it — "start by reading X, then modify Y" — based on what the issue says, not invented detail.}
**Watch out for:** {Optional: one risk the agent should know about, e.g. "test fixtures use a real DB", "behavior is shared with module Z".}
```

End with a one-line summary:

```
Scanned {N} open issues, {M} passed filters, top {3 or fewer} shown.
```

## Anti-Patterns

- Do NOT include issues that are mostly discussion threads, even if active
- Do NOT pick issues just because they have many reactions or recent comments — engagement is not AI-readiness
- Do NOT invent acceptance criteria the issue doesn't have, to inflate the score
- Do NOT assign, label, or comment on any issue
- Do NOT include feature requests that require product/design decisions
- Do NOT pad to 3 if only 1 or 2 issues qualify
