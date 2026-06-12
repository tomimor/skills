---
name: save-and-archive
description: >-
  Land finished worktree work onto main for solo projects: auto-commit pending
  changes, sync with origin/main resolving conflicts inside the worktree,
  fast-forward main, push, and remove the worktree so the conversation can be
  archived. Use when the user says save and archive, land this worktree, ship
  this to main, push this conversation's work to main, guardar y archivar, or
  says they're done with a worktree conversation and want the work saved on
  main before closing it.
---

# Save & Archive

Close out a worktree conversation in a solo project: everything done in this
conversation lands on `main` (locally and on `origin`), the worktree is removed,
and the conversation is safe to archive.

This is the landing counterpart to `git-worktrees` (which creates the worktree).
No PR is involved -- solo projects merge straight to main.

## Pre-flight Checks

Run all of these first. Abort with the stated message if any fails -- never
continue silently.

```bash
MAIN_ROOT=$(git worktree list --porcelain | awk '$1=="worktree"{print $2; exit}')
WT_PATH=$(git rev-parse --show-toplevel)
BRANCH=$(git branch --show-current)
```

1. **Must be inside a worktree.** If `WT_PATH` equals `MAIN_ROOT`, abort:
   "You're in the main checkout, not a worktree. Nothing to land."
2. **Must be on a branch.** If `BRANCH` is empty (detached HEAD), abort and
   point to the `git-worktrees` pre-flight guard for recovery.
3. **Remote must exist.** If `git remote get-url origin` fails, abort:
   "No `origin` remote -- this skill pushes to origin/main. Add a remote or
   land manually."
4. **Main root must hold `main`.** If `git -C "$MAIN_ROOT" branch --show-current`
   is not `main`, abort and report what it holds instead.
5. **Main root must be clean.** If `git -C "$MAIN_ROOT" status --porcelain` is
   non-empty, abort: a dirty main checkout can collide with the fast-forward.
   List the dirty files so the user can deal with them.

## Step 1: Commit pending work

```bash
git status --porcelain
```

If dirty, commit everything -- the point of this skill is that nothing from the
conversation is left behind:

```bash
git add -A
git commit -m "<generated conventional commit>"
```

Generate the message from the diff: `<type>(<scope>): <subject>`, imperative,
under 70 chars. Split into multiple commits only if the diff clearly contains
unrelated changes. Never add `Co-Authored-By` trailers.

## Step 2: Sync with origin/main inside the worktree

Conflicts are resolved here, in the worktree -- main never ends up in a
conflicted state.

```bash
git fetch origin
git merge origin/main
```

- If `fetch` fails (network/auth), abort and report. Do not land against a
  stale main.
- **Clean merge or already up to date:** continue.
- **Conflicts:** resolve them in the worktree. Resolve mechanically obvious
  ones; when intent is ambiguous (both sides changed the same logic), show the
  conflict and ask the user. Commit the merge, then continue.

## Step 3: Fast-forward main

Main was just merged into the branch, so main can always fast-forward to the
branch tip -- no merge bubble, individual commits intact:

```bash
git -C "$MAIN_ROOT" merge --ff-only "$BRANCH"
```

If this fails, main moved after the fetch (rare in solo projects). Go back to
Step 2 once; if it fails again, abort and report.

## Step 4: Push

```bash
git -C "$MAIN_ROOT" push origin main
```

If rejected as non-fast-forward, someone pushed in between: go back to Step 2
once; if it fails again, abort and report. Never `--force`.

## Step 5: Clean up the worktree

Same flow as the `git-worktrees` cleanup, minus the PR check.

1. **Reseat the agent to `MAIN_ROOT` first** -- removing the worktree while
   the conversation is rooted in it leaves a ghost cwd. Use the agent's
   reseat mechanism if available (Claude Code: `ExitWorktree`; Cursor:
   `cursor-app-control.move_agent_to_root`); otherwise tell the user to open
   `MAIN_ROOT` before continuing.
2. Remove the worktree and branch:

   ```bash
   git -C "$MAIN_ROOT" worktree remove "$WT_PATH"
   git -C "$MAIN_ROOT" branch -d "$BRANCH"
   git -C "$MAIN_ROOT" worktree prune
   ```

   `branch -d` is safe here -- the branch is fully merged by construction. If
   `worktree remove` fails because the tree is dirty, something slipped past
   Step 1: stop and report, do not `--force`.

## Step 6: Report

```
Landed on main.
  commits:   <n> commit subjects from this branch>
  main:      origin/main @ <short-sha>
  worktree:  <WT_PATH> removed, branch <BRANCH> deleted

Safe to archive this conversation.
```

## What this skill does NOT do

- No PR, no review gate -- it assumes a solo project.
- No test/build gate -- verification happens during the conversation
  (see `verification-before-completion`), not at landing time.
- Never resolves conflicts on main, never force-pushes, never `--force`
  removes a dirty worktree.
