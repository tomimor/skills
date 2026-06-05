# Recovery: Untangling Mixed Branches

When two agent conversations have already trampled each other's branches, work the problem in this order. Stop and ask the user before any destructive operation.

## Diagnose First

Before touching anything, take a snapshot:

```bash
git status
git log --oneline -20 --decorate
git reflog --date=iso | head -40
git stash list
git worktree list
```

The reflog is the most important artifact -- it remembers every `HEAD` move for ~90 days even if branches have been reset or deleted. Save it somewhere if you're about to do anything risky:

```bash
git reflog > /tmp/reflog-backup-$(date +%s).txt
```

## Common Scenarios

### Scenario A: Uncommitted changes are sitting on the wrong branch

You meant to work on `feature-x` but the changes landed on `feature-y`'s worktree (or worse, on `main`).

1. Stash on the wrong branch:
   ```bash
   git stash push -u -m "rescue: meant for feature-x"
   ```
2. Move to the correct worktree (or create one via the parent skill).
3. Pop:
   ```bash
   git stash pop
   ```
4. Verify with `git status` that the diff looks right, then commit.

### Scenario B: Commits landed on the wrong branch

Commits A and B were made on `feature-y` but belong on `feature-x`.

1. Note the SHAs from `git log --oneline` on the wrong branch.
2. Reset the wrong branch back to before the bad commits (use reflog to find the right SHA, NOT `HEAD~N` blindly):
   ```bash
   git reset --keep <good-sha>
   ```
   `--keep` aborts if it would clobber uncommitted changes -- safer than `--hard`.
3. Switch to the correct worktree.
4. Cherry-pick the commits in order:
   ```bash
   git cherry-pick <sha-A> <sha-B>
   ```
5. If `feature-y` was already pushed, the team needs to know -- a force-push to a shared branch is a coordination issue, not a git issue.

### Scenario C: A worktree is in a weird state and you don't know what's in it

```bash
git -C <weird-worktree> status
git -C <weird-worktree> log --oneline -10
git -C <weird-worktree> diff
```

If it has uncommitted work, stash with a descriptive message before doing anything else. If it has unpushed commits, note their SHAs in a scratchpad. Only then consider removing the worktree.

### Scenario D: `git worktree remove` refuses ("contains modified or untracked files")

Good. That's the safety net working. Options in order of preference:

1. Stash or commit the changes, then retry `git worktree remove`.
2. Move what you need somewhere safe (`cp`), then `git worktree remove --force`.
3. Last resort only: `git worktree remove --force` after confirming with the user that the changes are disposable.

Never `rm -rf` the worktree directory. That leaves `.git/worktrees/<name>/` orphaned and confuses git.

### Scenario E: `.git/worktrees/<name>/` is orphaned (directory was deleted manually)

```bash
git worktree prune
```

This is the cleanup for "I deleted the directory and now `git worktree list` is showing ghosts."

### Scenario F: Detached HEAD inside a worktree

The pre-flight guard reports `(detached HEAD at <sha>)`. The worktree was supposed to be on `<expected>` but `HEAD` points directly at a commit.

1. Find out whether `<sha>` is unique work or just a stray checkout:
   ```bash
   git branch --contains HEAD
   git reflog -20
   ```
   If `--contains` lists `<expected>` (or any branch you trust), `<sha>` is already preserved -- skip to step 3.
2. If `<sha>` is unique, save it before doing anything else:
   ```bash
   git branch "rescue/$(date +%s)" HEAD
   ```
   Now the SHA is on a real branch and won't be garbage-collected.
3. Return to the expected branch:
   ```bash
   git checkout <expected>
   ```
4. If you saved a rescue branch, decide what to do with it: cherry-pick the commits onto wherever they belong, or delete it once it's no longer needed.

If the SHA only lives in the reflog (no branch contains it), act fast -- reflog entries expire after ~90 days for reachable commits and 30 days for unreachable ones.

### Scenario G: Branch held by another worktree

Git refuses to check out the same branch in two worktrees. The guard reports `Branch <expected> is already checked out at <holder>`.

1. Preferred: open `<holder>` in your agent and continue work there. That's where the branch lives.
2. If `<holder>` is stale (directory was moved or deleted but git still tracks it):
   ```bash
   git worktree repair        # if the dir moved
   git worktree prune         # if the dir is gone
   ```
   Then re-run the guard.
3. If you genuinely need a second worktree from the same branch's history (rare), branch off it instead:
   ```bash
   git worktree add ../<repo>--<new-branch> -b <new-branch> <expected>
   ```

Never delete `<holder>`'s metadata under `.git/worktrees/` by hand to "free up" the branch.

## Prevention

Once recovered, the parent skill's pre-flight guard prevents recurrence: every new conversation aborts if the actual branch doesn't match the worktree's expected branch. Make sure the user runs it at conversation start.

## When To Bail Out

Stop and hand back to the user if:

- The reflog doesn't go back far enough to find a known-good SHA.
- A force-push to a shared branch would be required.
- Multiple people's work is intermingled.
- You'd need to use `git filter-branch`, `git filter-repo`, or rewrite published history.

These are coordination problems, not recovery problems. The user makes the call.
