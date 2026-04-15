---
name: update-branch
description:
  Pull the latest changes from main and merge them into the current working branch. Use when the user mentions updating
  their branch, syncing with main, pulling latest, refreshing from main, or merging main into their branch.
---

# Update Branch

Checkout main, pull latest, then merge main into the current working branch.

## Pre-flight Checks

Before doing anything, run these checks and abort if either fails.

### 1. Not on main

```bash
BRANCH=$(git branch --show-current)
```

If `BRANCH` is `main`, stop and tell the user: "You're already on main -- nothing to update."

### 2. Clean worktree

```bash
git status --porcelain
```

If output is non-empty, stop and tell the user: "You have uncommitted changes. Please commit or stash them first."

## Workflow

### Step 1: Checkout main and pull

```bash
git checkout main && git pull
```

If `git pull` fails (e.g., network error), checkout back to the original branch and report the error:

```bash
git checkout $BRANCH
```

### Step 2: Return to branch and merge

```bash
git checkout $BRANCH && git merge main
```

### Step 3: Report result

**Clean merge:** Report success with the short SHA of the merge base:

```
Merged main (<short-sha>) into <branch> -- clean merge.
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

## Anti-Patterns

- Do NOT force-push or reset anything
- Do NOT auto-resolve merge conflicts
- Do NOT stash on the user's behalf -- let them decide
