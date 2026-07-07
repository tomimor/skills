---
name: update-branch
description: >-
  Bring the latest changes from the default branch (main/master) into the
  current working branch via fetch + merge, without touching any other
  checkout — safe inside git worktrees. Use when the user mentions updating
  their branch, syncing with main, pulling latest, refreshing from main, or
  merging main into their branch.
---

# Update Branch

Fetch the latest default branch from origin and merge it into the current working
branch. No `git checkout` involved — the flow never switches branches, so it works
identically in a normal checkout and inside a git worktree (where checking out `main`
would fail because another worktree holds it).

## Pre-flight checks

Before doing anything, run these checks and abort if any fails.

### 1. Resolve the default branch

```bash
DEFAULT=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
```

If empty (the ref was never set locally), fix it once and retry:

```bash
git remote set-head origin --auto
```

If it still can't be resolved, ask the user which branch to merge from. Do not
silently assume `main`.

### 2. Not already on the default branch

```bash
BRANCH=$(git branch --show-current)
```

If `BRANCH` equals `DEFAULT`, stop and tell the user: "You're already on `<DEFAULT>` --
run `git pull` instead." If `BRANCH` is empty (detached HEAD), stop and point to the
`git-worktrees` pre-flight guard for recovery.

### 3. Clean worktree

```bash
git status --porcelain
```

If output is non-empty, stop and tell the user: "You have uncommitted changes. Please
commit or stash them first."

## Workflow

### Step 1: Fetch the default branch

```bash
git fetch origin "$DEFAULT"
```

If the fetch fails (network, auth), report the error and stop — merging a stale local
ref would silently miss upstream changes.

### Step 2: Merge

```bash
git merge "origin/$DEFAULT"
```

### Step 3: Report result

**Clean merge (or already up to date):** Report success with the merged tip:

```
Merged origin/<DEFAULT> (<short-sha>) into <branch> -- clean merge.
```

**Conflicts:** List the conflicting files and stop so the user can resolve them:

```bash
git diff --name-only --diff-filter=U
```

Report:

```
Merge conflicts in <N> file(s):
- path/to/file1
- path/to/file2

Resolve the conflicts and run `git merge --continue` when ready.
```

## Anti-patterns

- Do NOT `git checkout` the default branch to update it — it mutates another
  worktree's branch state and fails outright when a worktree holds it.
- Do NOT force-push or reset anything.
- Do NOT auto-resolve merge conflicts.
- Do NOT stash on the user's behalf -- let them decide.
