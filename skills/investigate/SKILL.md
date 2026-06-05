---
name: investigate
description:
  Systematic root-cause debugging that enforces an "Iron Law" (no fix without a confirmed root cause) and walks
  investigation through five phases -- collect, pattern-match, hypothesize, fix, verify. Use when the user says debug
  this, fix this bug, why is this broken, root cause, or investigate.
---

# Investigate

_Adapted from [garrytan/gstack](https://github.com/garrytan/gstack)'s `/investigate` skill. Restructured for this repo's
conventions and decoupled from gstack-specific telemetry. Original credit to Garry Tan and contributors._

Debug a bug methodically. Find the root cause **before** writing a fix. Never patch a symptom you don't understand.

## Iron Law

**No fix without a confirmed root cause.** If you can't explain in one sentence why the bug happens, you are not allowed
to edit code. Investigate more.

## Critical Rules

1. **One hypothesis at a time.** State it, then prove or disprove it before moving on.
2. **3-strike rule.** If three independent hypotheses fail, stop and escalate to the user. Do not keep trying.
3. **Minimal fix.** The diff that touches the root cause and nothing else. Drive-by cleanups go in a separate task.
4. **Always add a regression test.** A bug without a test that would catch it again is a bug waiting to come back.
5. **Reproduce first.** If you can't reproduce, say so. Don't guess from logs.

## Workflow

### Phase 1: Collect

Before forming any hypothesis, gather:

- **Symptoms.** What does the user observe? Error message verbatim, stack trace, expected vs actual.
- **Recent changes.** `git log --since="7 days ago" --oneline -- <suspect-area>` and `git blame` on the failing line.
- **Reproduction.** Steps to trigger the bug locally. If intermittent, note frequency and conditions.
- **Surrounding code.** Read the failing function and its callers. Do not skim.

Output of this phase: one or two written sentences describing what is happening and where.

### Phase 2: Pattern-match

Before designing a custom theory, check known bug shapes:

- Race condition / TOCTOU
- Nil / undefined propagation (a `None` snuck past a check)
- Cache staleness or stale closure
- Off-by-one / boundary
- Wrong assumption about ordering, async, or retry
- Type coercion (string vs number, timezone)
- Permission / auth at a layer above the failing code

If the symptom matches a known pattern, your first hypothesis is that pattern. If nothing matches, search the codebase
for the error string and read prior fixes in `git log --all --grep=<error-keyword>`.

### Phase 3: Hypothesize and test

For each hypothesis, in order:

1. **State it in one sentence.** "The bug happens because X."
2. **Predict an observation that would confirm it.** "If true, then logging Y at line Z will show ..."
3. **Test the prediction.** Run the code, add a log, write a failing test, inspect state.
4. **Score it.** Confirmed / refuted / inconclusive. Inconclusive counts as a failure for the 3-strike rule.

If confirmed, advance to Phase 4. If refuted, discard and try the next hypothesis. If you've hit 3 strikes, stop and
report.

### Phase 4: Fix

Once the root cause is confirmed:

- Write the **smallest** diff that addresses the root cause.
- Add a regression test that fails before the fix and passes after.
- Run the full test suite for the affected area, not just the new test.
- If the fix touches **more than 5 files**, pause and ask the user before continuing. Blast radius matters.

### Phase 5: Verify and report

- Reproduce the original symptom on the patched code. Confirm it is gone.
- Run lint, typecheck, and tests one more time.
- Output a structured report:

```
### Root cause
One sentence.

### Evidence
What confirmed the hypothesis.

### Fix
File(s) touched and what changed.

### Regression test
Path and what it asserts.

### Concerns / open questions
Anything you couldn't verify (e.g. only reproduces in prod, depends on staging data).
```

## Status

End every investigation with one of:

- **DONE** -- root cause confirmed, fix applied, tests pass, original symptom is gone.
- **DONE_WITH_CONCERNS** -- fix applied but something can't be verified locally (intermittent, staging-only, external
  dependency). State exactly what to verify in prod.
- **ESCALATE** -- 3 hypotheses failed, or the issue spans architecture you shouldn't unilaterally change. Hand back to
  the user with what was tried and what's left.

## Anti-Patterns

- Do NOT add try/catch to make the error disappear. That is not a fix.
- Do NOT refactor surrounding code "while you're in there." Stay on root cause.
- Do NOT ship a fix without a test that would have caught the bug.
- Do NOT keep adding hypotheses after 3 strikes. Escalate.
- Do NOT trust a fix you can't reproduce the failure for.
