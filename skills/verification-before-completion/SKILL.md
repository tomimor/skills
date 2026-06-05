---
name: verification-before-completion
description: >-
  Forces running a fresh proof command and reading its output before any
  "done" / "fixed" / "works" / "passing" / "ready to commit" / "ready to
  merge" claim. Use when about to assert that a change succeeded, before
  committing, before opening a PR, or before marking a task as finished.
---

# Verification Before Completion

A gate. You don't claim "done" without fresh, executed proof. Adapted from
[obra/superpowers](https://github.com/obra/superpowers).

## Core principle

**No completion claims without fresh verification evidence.**

Confidence is not evidence. A previous green test run is not evidence. A
successful agent report is not evidence. The diff "looking right" is not
evidence.

Evidence is: a command run in the current state of the code, its output read,
and the output supporting the claim.

## When to activate

Before saying or writing any of:

- "Done."
- "Fixed."
- "Works."
- "Passing."
- "Complete."
- "Ready to commit / merge / ship."
- "Should be good."
- Any positive close that asserts the work succeeded.

Also before:

- Running `git commit` after a non-trivial change.
- Opening a PR.
- Marking a task as completed.
- Handing off to the user as finished.
- Switching to the next task in the same turn.

## The gate

1. **Identify the proof command.** What single command (or short sequence)
   would demonstrate the claim is true?
   - Tests: `pnpm test path/to/file.test.ts`, `pytest tests/test_x.py -v`
   - Type check: `pnpm tsc --noEmit`, `mypy .`
   - Build: `pnpm build`, `cargo build`
   - Behavior: run the app and exercise the path (use `qa-manual` skill)
   - Lint / format: `pnpm lint`, `ruff check`
2. **Run it fresh.** Not "I ran it earlier." Run it now, in the current tree.
3. **Read the full output.** All of it — including warnings and partial
   failures. Don't grep for "PASS" and call it done.
4. **State the conclusion with evidence.** Quote the relevant lines when
   claiming success. If output is large, summarize and reference the path to
   the log.

## Hard rules

- **No "should" without proof.** "This should fix it" → run it.
- **No "probably" / "seems to" / "looks right."** Those are confidence
  signals, not evidence. Run something.
- **Linter passing ≠ code working.** It means the lint rule didn't trigger.
- **Type check passing ≠ logic correct.** It means types align.
- **A subagent reporting success is not verification.** You must
  independently run the proof command.
- **Tiredness does not justify skipping.** If you're tired, stop. Don't ship
  unverified.

## Common failure patterns to flag and refuse

| Pattern | What to do instead |
|---|---|
| "I made the changes, you can test them" | Run the proof command yourself first |
| "Tests pass" (from a previous run) | Run them again now |
| "The fix is in place" | Reproduce the original bug, then show it's gone |
| "Build should succeed" | Build it |
| "All edge cases handled" | Run a case that would fail without the fix |
| "The change is minimal so it's safe" | Minimal changes still need proof |

## Output format

After the gate clears, produce:

- The command that was run.
- The relevant output (quoted or referenced).
- An explicit `Verified:` or `Not verified:` statement.

Example:

> **Verified.**
>
> Ran: `pnpm test src/auth/oauth.test.ts`
>
> Output: `Tests: 12 passed, 12 total`. The case
> `redirects on missing state param` (the original bug) now passes.

If the gate fails:

> **Not verified.**
>
> Ran: `pnpm test src/auth/oauth.test.ts`
>
> Output: 1 failing — `redirects on missing state param`: expected 302, got
> 500. Need to handle the null branch in `callback.ts:42` before claiming done.

## Pair with

- `qa-manual` — for behavior verification of web features (the proof command
  is "drive the app in Chrome").
- `verify-pr` — heavier verification scoped to a whole PR.
- `miguel-review` — review the diff for shape; this skill verifies behavior.
