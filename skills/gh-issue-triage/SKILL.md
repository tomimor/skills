---
name: gh-issue-triage
description: >-
  Scans the current GitHub repo for open, unassigned issues with no linked PR,
  scores them against an AI-readiness rubric, and returns the top 3 picks with
  rationale and a ready-to-paste agent kickoff prompt for each. Use when the
  user mentions AI triage, AI-ready issues, picking issues for an agent, what
  to work on next, or wants to find issues to dispatch to an AI.
---

# GH Issue Triage

Find the top 3 GitHub issues in the current repo that are best suited for
an AI agent to pick up, and produce a kickoff prompt for each.

This skill is **read-only**. Never assign, label, or comment on any issue —
the output is for the user to act on.

## Resolve the current repo

Run from the user's cwd:

```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

If that fails, tell the user the cwd is not a GitHub repo (or `gh` is not
authenticated) and stop.

## Fetch candidate issues

Pull open + unassigned issues that have no linked PR:

```bash
gh issue list --repo OWNER/REPO --state open --limit 50 \
  --search "no:assignee -linked:pr sort:updated-desc" \
  --json number,title,body,url,labels,comments,createdAt,updatedAt,author
```

If the result is empty, print `No AI-ready issues in OWNER/REPO` and stop.

## Score each issue

Apply this rubric to every issue using its body, labels, and comment metadata.
Each dimension scores 0–3 for a total of 0–15.

| Dimension       | 3 (great)                                              | 0 (bad)                                            |
| --------------- | ------------------------------------------------------ | -------------------------------------------------- |
| Clarity         | Concrete problem statement, no ambiguity               | Vague or one-line title with no body               |
| Scope           | Acceptance criteria stated or strongly implied         | Open-ended "improve X" with no boundary            |
| Self-contained  | No business/product decisions or private context needed | Requires stakeholder input or hidden context       |
| Size            | Doable in a single AI session                          | "Rewrite the module" or cross-cutting refactor     |
| Signal          | `good first issue` / `help wanted` / `ai-ready` labels, low comment count, no debate | Heated thread, conflicting requirements |

### Hard disqualifiers

Skip the issue (do not include in the ranking) if any of these are true:

- Body or comments call for upfront design ("needs design", "needs spec", "TBD")
  or flag the issue as blocked on another task or external input.
- Security-sensitive (auth, crypto, secrets handling) without clear scope.
- Comment thread shows reviewers disagreeing on the desired behavior.
- Title or labels indicate a question, discussion, or RFC — not work.

## Pick the top 3

Sort by total score descending; break ties by `updatedAt` (most recent first).
If fewer than 3 issues clear the rubric, return as many as qualify. Never pad
the list to 3.

## Output format

Render the headers, links, and bullets as plain markdown so the issue links
stay clickable. Render the kickoff prompt itself inside a fenced code block
so the user can copy it in one click and paste it into a fresh agent chat.

One block per pick, separated by `---`:

````
## Top AI-ready issues in OWNER/REPO

### 1. [#NUMBER — Title](URL)
- Score: 13/15 (Clarity 3, Scope 3, Self-contained 2, Size 3, Signal 2)
- Labels: bug, good first issue
- Why it's AI-ready: <2-3 sentences distilled from the issue>

Kickoff prompt:

```
Implement issue #NUMBER in OWNER/REPO: <title>.

Context: <one-paragraph summary of the problem from the issue body>.

Acceptance criteria:
- <criterion 1>
- <criterion 2>

Out of scope: <anything explicitly deferred in the issue>.

Reference: <issue URL>
```

---

### 2. ...
````

The kickoff prompt is the deliverable — it must be self-contained enough to
paste into a fresh agent chat (Cursor, Codex, Claude Code) and start work
without further questions.

After the last pick, print a one-line summary:

```
Scanned N open issues in OWNER/REPO, M passed the rubric, top K shown.
```

## Anti-patterns

- Do NOT invent acceptance criteria the issue does not state. If the issue is
  light on detail, lower the Scope score; do not fabricate.
- Do NOT pick issues with active reviewer debate, even if otherwise clear.
- Do NOT pad the list to 3 when fewer issues qualify.
- Do NOT include the full issue body in the kickoff prompt — distill it.
- Do NOT recommend issues assigned to someone or already linked to a PR; the
  search query should exclude them, but double-check before ranking.
