---
name: gh-pr-comment-assistant
description: >-
  Fetch the latest PR review comments for the current branch, analyze and summarize feedback, and help the developer
  plan fixes. Use when the user mentions PR comments, review feedback, reviewer requests, or wants to understand and
  address PR review comments.
---

# GH PR Comment Assistant

Analyze PR review comments for the current branch, summarize feedback, and help the developer plan fixes or apply
suggestions if necessary.

## Critical rules

1. **Clarification gate:** If any reviewer comment is ambiguous or you are unsure what they mean, STOP and use the
   **AskUserQuestion** tool to clarify before proposing a resolution. Never guess.
2. **Confirmation gate:** NEVER apply code changes without explicit user approval. Always present the full plan first
   and wait for "go ahead."
3. **Minimal diff mindset:** When proposing code changes, change only what's necessary to address the feedback. Don't
   refactor adjacent code or "improve" unrelated things.

## Workflow

### Step 1: Detect Branch and PR

```bash
BRANCH=$(git branch --show-current)
PR_NUMBER=$(gh pr view --json number -q '.number')
gh pr view --json number,url,title,baseRefName
```

**If no PR exists for the current branch:** Inform the user and suggest `gh pr create`. Stop. **If `gh` is not
authenticated:** Show error and suggest `gh auth login`. Stop.

### Step 2: Fetch Review Comments

Fetch both inline review comments and general PR comments:

```bash
# Get repo info
REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')

# Inline review comments (code-level)
gh api repos/${REPO}/pulls/${PR_NUMBER}/comments

# General PR comments and review summaries
gh pr view --json comments,reviews
```

### Step 3: Group and Prioritize

Group comments by file and thread. Tag each as:

- **Blocking** -- reviewer explicitly requests a change or flags a bug
- **Suggestion** -- nitpick, style preference, or optional improvement

Skip already-resolved threads.

### Step 4: Analyze Each Comment

For each comment or thread:

1. Read the relevant code, surrounding context, and related files to fully understand the concern
2. Summarize what the reviewer is asking (1 sentence)
3. Propose a concrete action: code change, decision, or no-op
4. Provide brief reasoning for the proposed action

**Clarification gate:** If a comment is ambiguous, use the **AskUserQuestion** tool to ask the user before proposing
a resolution.

### Step 5: Present Analysis and Discuss

Present all comments using this template:

```
### Comment #N: [file:line] by @reviewer
**Type:** Blocking | Suggestion
**What they asked:** <1-sentence summary>
**Proposed action:** <code change | decision | no-op> -- <brief reasoning>
```

After presenting the analysis, switch to **Plan mode** and use the **AskUserQuestion** tool with **one question per
comment group**. Each question should:

- Use the comment summary as the prompt, customized to that specific comment
- Offer context-specific options that make sense for the comment's situation
- Cover these four directions as baseline, adapted with concrete labels:
  - **Dive deeper** -- investigate the concern further before deciding
  - **Create a plan** -- outline concrete changes to address this comment
  - **Discuss trade-offs** -- explore alternatives if there are multiple approaches
  - **Skip** -- developer will handle this one themselves

Options should be specific to the comment, not generic labels. For example, a comment about error handling might have:
"Add try-catch to the fetch call", "Discuss whether we need error boundaries here", "Investigate what errors are
possible", "Skip".

### Step 6: Iterate

Work through comments based on the developer's direction. For each comment being addressed:

1. Propose a concrete fix or outline options if there are trade-offs
2. Wait for the developer to approve, adjust, or move on

**Confirmation gate:** Wait for explicit approval before applying any code changes.

Repeat until the developer is satisfied or decides to continue on their own.

## Anti-patterns

- NEVER reply or resolve comments automatically.
- Do NOT propose changes without explaining why or understanding the user's comment intent.
- Do NOT group unrelated comments together
- Do NOT apply code changes without developer approval
- Do NOT refactor code beyond what the feedback requires

## Adjacent skills

| Ask | Skill |
|---|---|
| **Respond to** reviewer comments on my PR | **gh-pr-comment-assistant** (this skill) |
| Review **my working diff** (shape/simplicity) | miguel-review |
| Review a **teammate's PR** → paste-ready comments | review-pr |
| Heavyweight **verify** my PR (tests, assumptions) | verify-pr |
| Status overview of **my open PRs** | pr-dashboard |
