---
name: git-worktrees
description: >-
  Set up and manage git worktrees so each agent conversation works on its own
  branch in its own physical directory. Prevents parallel agent chats (Cursor,
  Claude Code, etc.) from clobbering each other's git state. Use when the user
  says they're starting a new issue, starting an implementation, picking up a
  ticket, working on a new branch, or mentions worktrees, parallel branches,
  branch isolation, working on multiple branches at once, or when agents have
  gotten confused about which branch they're on. Also use when the user says a
  PR is done/merged and wants to clean up its worktree.
---

# Git Worktrees

Give every agent conversation its own physical directory so parallel chats stop colliding on the same `.git/HEAD`.

The user's flow this skill is built around:

1. "I'm starting a new issue, let's use a new worktree." -> create one off `origin/main`, reseat the agent inside.
2. All implementation and chat context lives in that worktree until the PR is done.
3. "The PR is merged." -> reseat back to the main checkout, remove the worktree, delete the local branch.

## Pre-flight Guard

Run this at the start of every conversation that touches code, before doing anything else.

### Step 1: Detect

```bash
ROOT=$(git rev-parse --show-toplevel)
ACTUAL=$(git branch --show-current)
EXPECTED=$(git worktree list --porcelain | awk -v r="$ROOT" '
  $1=="worktree" {wt=$2}
  $1=="branch"   {sub("refs/heads/","",$2); if (wt==r) {print $2; exit}}')
```

If `EXPECTED` is empty (this isn't a known worktree) or `ACTUAL` equals `EXPECTED`, proceed normally. Otherwise, run Step 2.

### Step 2: Diagnose

Collect cheap signals before classifying:

```bash
STATUS=$(git status --porcelain)
WORKTREES=$(git worktree list --porcelain)
LOCAL_BRANCH=$(git rev-parse --verify --quiet "refs/heads/$EXPECTED")
HOLDER=$(awk -v b="refs/heads/$EXPECTED" '
  $1=="worktree" {wt=$2}
  $1=="branch" && $2==b {print wt; exit}' <<<"$WORKTREES")
AHEAD=$(git rev-list --count "@{u}..HEAD" 2>/dev/null || echo 0)
DETACHED_SHA=$(git rev-parse --short HEAD)
```

Classify by the first matching row, top to bottom:

| Condition | Diagnosis | Proposed fix |
| --- | --- | --- |
| `ACTUAL` is empty | Detached HEAD at `<DETACHED_SHA>`. | `git checkout <EXPECTED>`. If the SHA holds unique work, run `git branch rescue/<ts> <DETACHED_SHA>` first. See recovery.md Scenario F. |
| `HOLDER` is set and != `ROOT` | Branch `<EXPECTED>` is already checked out at `<HOLDER>`. Git can't share branches across worktrees. | Open that worktree instead, or pick a different branch here. See recovery.md Scenario G. |
| `LOCAL_BRANCH` is empty | Branch `<EXPECTED>` no longer exists locally. | `git fetch origin && git checkout -B <EXPECTED> origin/<EXPECTED>` if the remote has it, else remove this worktree via the cleanup flow. |
| `STATUS` is non-empty | Uncommitted changes sitting on the wrong branch (`<ACTUAL>`). | Ask via `AskUserQuestion`: (a) move via stash + switch + pop (recovery.md Scenario A), (b) commit here on `<ACTUAL>` if they really belong, (c) discard. |
| `AHEAD` > 0 | `<AHEAD>` unpushed commits on `<ACTUAL>` that may belong on `<EXPECTED>`. | Stop. Do NOT auto-reset. See recovery.md Scenario B (reflog + cherry-pick). |
| Otherwise | Stray `git checkout`. Clean worktree, branch exists, no other worktree holds it. | `git checkout <EXPECTED>` -- safe single command. |

### Step 3: Report

Emit a structured report, never a one-liner:

```
Branch mismatch in worktree.
  worktree:        <ROOT>
  expected branch: <EXPECTED>
  actual branch:   <ACTUAL>   (or "(detached HEAD at <sha>)")

Diagnosis: <one-line classification>

Proposed fix:
  $ <specific command>

<extra context: linked recovery.md scenario, what to back up first, etc.>
```

Then stop. Wait for explicit user confirmation before running the proposed command. Never run anything destructive (`reset`, `branch -D`, `checkout -- .`, `--force` flags) without an extra confirmation step.

## Start Work on a New Issue / Branch

### Step 1: Resolve the main repo root

The "main root" is the original checkout, not a sibling worktree. Use the first entry of `git worktree list --porcelain` (porcelain lists the main worktree first):

```bash
MAIN_ROOT=$(git worktree list --porcelain | awk '$1=="worktree"{print $2; exit}')
```

If the current dir is already that path, you're in the main checkout. Otherwise you're inside a sibling worktree -- still use `MAIN_ROOT` for all git operations below via `git -C "$MAIN_ROOT"`.

### Step 2: Decide the branch name

- If the user gave an issue number or URL, derive it:
  ```bash
  gh issue view <n> --json number,title -q '"\(.number)-\(.title)"'
  ```
  Slugify to `<n>-<short-kebab-title>` (lowercase, hyphens, max ~40 chars).
- If the user gave a branch name, use it verbatim.
- Otherwise, ask once via `AskUserQuestion` with a sensible default option.

### Step 3: Refresh the base

```bash
git -C "$MAIN_ROOT" fetch origin
```

If `fetch` fails (no network, auth issue), warn the user and continue with the local `origin/main` ref.

### Step 4: Compute the target path and create the worktree

```bash
REPO_NAME=$(basename "$MAIN_ROOT")
PARENT=$(dirname "$MAIN_ROOT")
WT_PATH="$PARENT/$REPO_NAME--$BRANCH_SLUG"
```

Refuse if `WT_PATH` already exists. Then:

```bash
git -C "$MAIN_ROOT" worktree add "$WT_PATH" -b "$BRANCH" origin/main
```

If the branch already exists on the remote (e.g. continuing someone else's work), drop `-b`:

```bash
git -C "$MAIN_ROOT" worktree add "$WT_PATH" "origin/$BRANCH"
```

### Step 5: Reseat the agent into the worktree

Try the agent's reseat mechanism first; fall back cleanly when there isn't one.

- **If a reseat tool is available** (Claude Code: `EnterWorktree`; Cursor: `cursor-app-control.move_agent_to_root` with `rootPath="$WT_PATH"`), call it. From this point the conversation continues rooted in the new worktree.
- **Otherwise**, print:
  ```
  Worktree ready: <WT_PATH>
  Branch:         <BRANCH> (based on origin/main @ <short-sha>)

  Open it in your agent and continue from there:
    cursor "<WT_PATH>"     # for Cursor
    claude "<WT_PATH>"     # for Claude Code
    cd     "<WT_PATH>"     # for terminal-based agents
  ```

Do not try to detect the agent via environment variables. Try the reseat tool, fall back if it isn't there.

### Step 6: Report

```
Worktree:  <WT_PATH>
Branch:    <BRANCH>
Base:      origin/main @ <short-sha>
```

## List Active Worktrees

```bash
git worktree list
```

For each entry, also show the linked PR if one exists:

```bash
gh pr view --json number,title,state,url 2>/dev/null
```

Format as a compact table: path, branch, last commit subject, PR state.

## Clean Up After PR Is Done

### Step 1: Confirm the PR is merged or closed

```bash
gh pr view --json state,mergedAt
```

If `state` is `OPEN`, abort:

```
PR is still open. Resolve or close it before removing the worktree.
```

### Step 2: Find the main root from inside the worktree

```bash
MAIN_ROOT=$(git worktree list --porcelain | awk '$1=="worktree"{print $2; exit}')
WT_PATH=$(git rev-parse --show-toplevel)
BRANCH=$(git branch --show-current)
```

### Step 3: Reseat the agent BACK to the main root FIRST

Before removing the worktree directory, move out of it -- otherwise the agent ends up in a ghost cwd.

- If a reseat tool is available (Claude Code: `ExitWorktree`; Cursor: `cursor-app-control.move_agent_to_root` with `rootPath="$MAIN_ROOT"`), call it.
- Otherwise, tell the user to open the main root in their agent before continuing.

### Step 4: Remove the worktree

```bash
git -C "$MAIN_ROOT" worktree remove "$WT_PATH"
```

If this fails because the worktree is dirty, stop and report. Do not pass `--force` automatically.

### Step 5: Delete the local branch and prune

```bash
git -C "$MAIN_ROOT" branch -d "$BRANCH"   # fails safely if not merged
git -C "$MAIN_ROOT" worktree prune
```

If `branch -d` fails because the branch isn't merged locally (e.g. squash-merged on GitHub), confirm with the user once before falling back to `-D`.

## Anti-patterns

- Do NOT `git checkout` a different branch inside an existing worktree. Create a new worktree instead.
- Do NOT nest worktrees inside the main checkout. Always use a sibling directory.
- Do NOT share a worktree between two agent conversations.
- Do NOT `rm -rf` a worktree directory manually. Always go through `git worktree remove`.
- Do NOT remove the worktree before reseating the agent out of it.
- Do NOT sniff `CURSOR_*` / `CLAUDE_*` env vars to pick a strategy. Try the reseat tool, fall back.

## Recovery

When branches have already gotten mixed (the situation that motivated this skill), see [references/recovery.md](references/recovery.md) for how to untangle commits across worktrees safely.
