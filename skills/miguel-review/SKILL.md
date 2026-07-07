---
name: miguel-review
description: >-
  Opinionated code review of the user's own working diff that prioritizes
  minimal diffs, deletions over additions, and zero tolerance for dead code
  or premature abstractions. Reviews the current branch diff against a base
  branch. Use when the user mentions miguel review, diff review, or asks to
  review their own changes/branch before pushing.
---

# Miguel Review

Review the current branch's diff with a bias toward simplicity, small diffs, and deleting code.

## Critical rules

1. **No changes = no review.** If `git diff` is empty, inform the user and stop.
2. **Read before judging.** For non-trivial changes, read surrounding context before flagging issues.
3. **Opinionated, not hostile.** Be direct about problems. Never make it personal.

## Core Heuristics

- **Deletions over additions.** Removing code is often the best change.
- **Minimal diffs.** The smallest change that solves the problem completely.
- **Explicit over implicit.** No magic, no hidden behavior, no surprises.
- **Fail fast.** Clear errors at boundaries, not silent failures deep in the stack.
- **The Deletion Test:** For each new file -- is it necessary, or could existing code be extended? For each new
  function -- is it called more than once? If not, inline it. For each new parameter -- is there a concrete use case
  today?
- **No dead code.** Commented-out code, unused imports, unreachable branches, stale TODOs -- delete them. Git
  remembers.

## Workflow

### Step 1: Gather the Diff

If the user provides a base branch, use it. Otherwise default to `main`.

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
BASE=${USER_PROVIDED_BASE:-main}

git log $BASE...HEAD --oneline
git diff $BASE...HEAD --stat
git diff $BASE...HEAD
```

If no commits or diff exist between the branch and base, inform the user and stop.

### Step 2: Analyze

Walk through the diff checking each of these. Skip any that don't apply:

- **Purpose:** What problem does this solve? Is the problem real and current?
- **Scope:** Does every file change serve the stated purpose? Flag drive-by fixes.
- **Complexity:** Count new abstractions. Each needs justification. If code needs a comment to explain, it might need
  simplification instead.
- **Dead code:** Commented-out code, unused variables/imports/functions, single-value feature flags, unreachable
  branches.
- **Naming:** Can you understand each function from its name alone? Are variable names specific (`userId` not `id`)?
- **Deletion test:** Apply the heuristic above to every new file, function, and parameter.

### Step 3: Output

Use this exact structure:

```
### Summary
One sentence: approve, revise, or reject? Why?

### Critical Issues (Must Fix)
Specific: file, line, what's wrong, what to do instead.
If none: "None found."

### Recommendations (Should Fix)
Improvements with trade-off explanation if ignored.
If none: "None."

### Questions
Things you don't understand. Assume the author knows something you don't -- but make them explain it.
If none: "None."

### What's Good
Briefly acknowledge what was done well.
```

## Additional Resources

- For review philosophy and tone guidance, see [philosophy.md](references/philosophy.md)
- For example critiques showing the expected tone, see [examples.md](references/examples.md)

## Adjacent skills

| Ask | Skill |
|---|---|
| Review **my working diff** (shape/simplicity) | **miguel-review** (this skill) |
| Review a **teammate's PR** → paste-ready comments | review-pr |
| Heavyweight **verify** my PR (tests, assumptions) | verify-pr |
| **Respond to** reviewer comments on my PR | gh-pr-comment-assistant |
| Status overview of **my open PRs** | pr-dashboard |
