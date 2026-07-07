---
name: gh-pr-description-updater
description: >-
  Read or update the PR description for the current branch, strictly following the repo's PR template. Enforces concise
  bullet points and template compliance. Use when the user mentions PR description, PR body, updating a pull request, or
  filling in the PR template.
---

# GH PR Description Updater

Read or update the PR description for the current branch using the repo's PR template.

## Critical rules

1. **Clarification gate:** If unsure about the "Why" behind certain changes, or if the diff is ambiguous, STOP and use
   the **AskUserQuestion** tool to clarify before filling in sections. Never guess motivations.
2. **Confirmation gate:** NEVER run `gh pr edit --body` without showing the full draft to the user first and receiving
   explicit approval.
3. **Conciseness:** Max 3 bullet points per section, and aim for fewer. One sharp bullet beats three weak ones.
   Describe the outcome a human reader cares about -- not the technical changes that produced it.
4. **Brevity:** Aim for under 300 words total across all sections. PR descriptions should be scannable in under 30
   seconds.

## Workflow

### Step 1: Detect Branch and PR

```bash
BRANCH=$(git branch --show-current)
gh pr view --json number,url,body,title,baseRefName 2>/dev/null
```

**If `gh` is not authenticated:** Show error and suggest `gh auth login`. Stop.

**If a PR exists:** Extract `PR_NUMBER` and `BASE` from the output. Continue to Step 2.

```bash
PR_NUMBER=$(gh pr view --json number -q '.number')
BASE=$(gh pr view --json baseRefName -q '.baseRefName')
```

**If no PR exists:** Do NOT error out. Instead, ask the user for the base branch before running any diff or log
commands. First, list recent remote branches for context:

```bash
git branch -r --sort=-committerdate | head -3
```

Then use the **AskUserQuestion** tool with the discovered branches as options:

```
Question: "No open PR found for branch `$BRANCH`. Which base branch should I diff against?"
Options: main | <recent remote branches from output above> | Other (please specify)
```

Store the user's answer as `BASE`. Set `PR_NUMBER` to empty. Do NOT silently fall back to `main`.

### Step 2: Locate PR Template

Read the PR template at `.github/PULL_REQUEST_TEMPLATE.md`.

### Step 3: Gather Context

**If a PR exists**, read the current PR body first:

```bash
gh pr view --json body -q '.body'
```

**If no PR exists**, skip reading the PR body (there is none).

Then, in both cases, gather the branch diff:

```bash
# Commit history
git log $BASE...HEAD --oneline

# Changed files summary
git diff $BASE...HEAD --stat

# Full diff for understanding actual changes
git diff $BASE...HEAD
```

### Step 4: Draft the Description

Fill each template section following these rules:

- **What:** Describe the outcome the PR delivers, in language a non-author can scan in seconds. Max 3 bullets, fewer
  is better. Each bullet should answer "what is different now?" from a user / system / product perspective -- NOT
  which functions, files, or patterns changed. If a single sentence covers it, use one bullet.
- **Why:** Describe the problem this PR solves or the value it unlocks. Max 3 bullets, fewer is better. Stay at the
  level of motivation and impact (user pain, risk avoided, capability gained). If the motivation is unclear from the
  diff, trigger the clarification gate instead of guessing.
- **Relates to:** Link issues if detectable from commits, branch name, or PR title. Use `Closes #N` format.
- **Evidence:** Remind the user to add screenshots or recordings. The agent cannot fill this section.
- **Optional sections** (Notes, Env Variables Checklist): Leave commented out unless the changes clearly require them
  (e.g., new env variables added).
- **Breaking changes / migrations:** If the diff introduces breaking changes, new dependencies, or migration
  requirements, these MUST be called out in the What or Why sections. Check for new entries in `package.json`, schema
  changes, or removed/renamed APIs.
- **Security:** If changes touch auth, RBAC, secrets, or crypto -- note security implications in the description.

### Step 5: Present Draft

Show the complete PR description to the user in a markdown code block.

If updating an existing description, highlight what changed compared to the current version.

### Step 6: Await Approval and Deliver

**Confirmation gate:** Wait for the user to approve. The user may approve as-is, request edits, or cancel.

**If a PR exists**, update it after approval:

```bash
gh pr edit $PR_NUMBER --body "$(cat <<'EOF'
<approved description>
EOF
)"
```

**If no PR exists**, use the **AskUserQuestion** tool to let the user choose a delivery method:

```
Question: "How would you like to use this description?"
Options: Create the PR now (gh pr create) | Just show it (I'll copy it myself)
```

If the user chooses to create the PR, ask for a PR title (or suggest one from the branch name / commit messages), then
run:

```bash
git push -u origin $BRANCH
gh pr create --base $BASE --title "<title>" --body "$(cat <<'EOF'
<approved description>
EOF
)"
```

## Anti-patterns

- Do NOT hardcode `main` as the base branch
- Do NOT silently assume `main` as the base branch when no PR is found -- always ask the user
- Do NOT run `git diff` or `git log` before confirming the base branch with the user (when no PR exists)
- Do NOT write sentences with more than 20 words.
- Do NOT write more than 3 bullets per section; prefer 1-2 when possible
- Do NOT describe technical changes in What/Why (e.g. "refactored X service", "added Y hook"); describe the resulting
  behavior, capability, or fix instead
- Do NOT include implementation details (function names, variable names, file paths) in the What/Why sections unless
  they are the only way to convey the outcome
- Do NOT fill in the Evidence section -- remind the user to add screenshots
- Do NOT update the PR on GitHub without explicit user approval
