---
name: review-pr
description: >-
  Review a teammate's PR and produce a small list of high-signal,
  senior-engineer-level review comments ready to paste into GitHub. Aggressively
  drops nitpicks, style preferences, and "would be nice" suggestions. Output is
  text-only -- never auto-posts. Use when the user mentions review-pr, reviewing
  a teammate's PR, leaving PR comments, or wants senior-level feedback to post.
---

# Review PR

Review a teammate's PR and emit copy-paste-ready review comments. The bar is
high: only flag things that genuinely improve the code. Silence is a valid
result.

## Critical Rules

1. **Text-only output.** Never run `gh pr comment`, `gh pr review`, or any
   `gh api` write call. The user pastes comments themselves.
2. **Silence is valid.** If nothing clears the bar in
   [references/filter-rules.md](references/filter-rules.md), say "Nothing worth
   commenting on." Do not manufacture findings.
3. **Read before flagging.** For any non-trivial finding, read the surrounding
   file context. Never flag based on a diff hunk alone.
4. **No nitpicks.** Anything a linter, formatter, or type checker would catch is
   out. Style preferences are out. "Consider..." is out.
5. **Apply the hill test.** Include a comment only if you'd hold the line on it
   after one round of pushback. If you'd cave, drop it.

## Workflow

### Step 1: Resolve the PR

In order of preference:

1. User passed a PR URL or number -- use it.
2. Current branch has an open PR -- use it via `gh pr view --json number`.
3. Neither -- ask the user for a URL or number. Do not guess.

```bash
gh pr view "$PR" --json number,title,url,baseRefName,headRefName,author,body
```

If `gh` is not authenticated, stop and tell the user to run `gh auth login`.

### Step 2: Fetch the Diff and Existing Comments

```bash
gh pr diff "$PR"

REPO=$(gh repo view --json nameWithOwner -q '.nameWithOwner')
PR_NUMBER=$(gh pr view "$PR" --json number -q '.number')
gh api "repos/${REPO}/pulls/${PR_NUMBER}/comments" \
  --jq '.[] | {path, line, body, user: .user.login}'
```

Use the existing comments to avoid duplicating concerns already raised.

### Step 3: Analyze

Walk the diff. For each change:

1. Read the surrounding file context if the change is non-trivial.
2. Form a candidate finding.
3. Run it through [references/filter-rules.md](references/filter-rules.md). If
   it lands in the Drop list, discard it. If it survives, keep it.
4. Apply the hill test. Still confident? Keep it.

### Step 4: Draft Comments

For each surviving finding, write a comment using
[references/comment-style.md](references/comment-style.md). One concern per
comment. First person, direct, specific. No praise sandwiches, no hedging
stacks, no AI tells.

For tone calibration on borderline cases, see
[examples.md](examples.md).

### Step 5: Output

Use this exact structure so each comment is trivial to copy:

```
## Review: <PR title> -- <PR URL>

<N> comments. <M> candidates dropped.

---

### path/to/file.ts:L42-L45
<comment body, in the user's voice>

---

### path/to/other.ts:L17
<comment body, in the user's voice>
```

If nothing cleared the bar:

```
## Review: <PR title> -- <PR URL>

Nothing worth commenting on. <M> candidates considered, all dropped.
```

Do not print the dropped candidates by default. If the user asks, list them
with a one-line reason each.

## Anti-Patterns

- Do NOT post to GitHub. Text output only.
- Do NOT reply to existing review threads -- this skill drafts new comments.
- Do NOT manufacture findings to look thorough. An empty result is fine.
- Do NOT flag anything a linter, formatter, or type checker catches.
- Do NOT bundle multiple concerns into one comment.
- Do NOT include a "what's good" section -- this skill produces postable
  comments, not a review summary.
- Do NOT run tests, builds, or any heavyweight verification. That's
  `verify-pr`'s job.
