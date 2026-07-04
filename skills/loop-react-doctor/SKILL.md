---
name: loop-react-doctor
description: >-
  Iterative React-health loop: inventory every React app in the repo,
  baseline with a version-pinned react-doctor scan, fix one root cause
  per iteration, and re-verify until every app scores 100/100 or every
  remaining finding has a user-approved written justification. Never
  silences findings with ignores, exclusions, or deleted behavior, and
  stops itself after two iterations without measurable progress. Use
  when the user mentions react-doctor, React health score, React
  anti-patterns cleanup, or driving a React codebase to a clean scan.
---

# Loop: React Doctor

Drive every React app in the repository to a freshly verified
[react-doctor](https://www.npmjs.com/package/react-doctor) score of
100/100 — or to a documented, user-approved justification for whatever
stands between the current score and 100. This is a **run-until-done
loop**: it has a finish line, unlike scheduled maintenance loops.

## Loop contract

Every run ends in exactly one of these states and must report which:

| Terminal state | Meaning |
|---|---|
| **PERFECT** | Every app scores 100/100 on a fresh full-battery verification. |
| **JUSTIFIED** | Remaining findings each have a written justification (false positive or intentional pattern) approved by the user. Score and justifications reported. |
| **STALLED** | Two consecutive iterations produced no score improvement. Reported with the blocking findings and what was tried. |
| **BLOCKED** | A precondition failed (no React apps, scanner won't run, baseline checks broken). Reported, nothing changed. |

Hard rules for the whole loop:

- **Never hide findings.** No rule exclusions, ignore files or comments,
  severity/config relaxation, or deleting *used* behavior to silence a
  rule. Removing genuinely dead code that the dead-code analysis flags
  is a fix; deleting a live feature to make a finding disappear is
  cheating. The only exits for a finding are a verified fix or a
  user-approved justification.
- **Pin the scanner version for the whole run.** Resolve once at
  baseline (`npm view react-doctor version`), then invoke
  `npx react-doctor@<version>` everywhere. react-doctor is pre-1.0 —
  `@latest` moves the goalposts mid-run and makes "progress"
  unmeasurable.
- **One root cause per iteration.** A root cause may span many files
  (the same anti-pattern repeated); it may not bundle unrelated rules.
- **Preserve unrelated work.** Never commit, revert, or stash changes
  that existed before the loop started.

## Phase 0 — Preconditions (fail fast)

1. **Inventory app roots.** Find every production React app: workspace
   packages and directories whose `package.json` depends on `react`
   (skip pure tooling/config packages). `npx react-doctor@<version> -y`
   scans all workspace projects; use `--project` to target specific
   ones. Confirm the inventory with the user if ambiguous.
2. **Identify the verification commands** for each app: typecheck,
   lint, tests, build — read them from `package.json` scripts or CI
   config; don't guess.
3. **Green baseline.** Run those commands once before any change. If
   they already fail, you can't attribute regressions to your fixes →
   **BLOCKED**, report what's broken.

If there are no React apps or the scanner won't run → **BLOCKED**.

## Phase 1 — Baseline scan

For each app root, record:

```bash
npx react-doctor@<version> --json --verbose <dir>
```

- The pinned scanner version and scan timestamp.
- Per-app score and the full finding list (rule, file, count).
- Keep the JSON output (`--json-out`) as the baseline artifact.

## Phase 2 — Plan by root cause

Group findings across apps by root cause (same rule + same underlying
pattern), not by file. Rank by: score impact, blast radius of the fix
(prefer contained), and risk of behavior change (prefer none). Work
strictly from the top.

## Phase 3 — Fix (one root cause per iteration)

Apply the smallest credible change that resolves the root cause
everywhere it occurs. Behavior must be preserved — these are
health/pattern fixes, not features. If a fix genuinely requires a
behavior change or a risky refactor, stop and ask first.

## Phase 4 — Verify (tiered, to control cost)

- **After every fix**: typecheck + the affected app's tests + re-scan
  the affected app(s) with the pinned version. The targeted findings
  are gone, the score did not drop anywhere, and no new findings
  appeared.
- **Every ~5 fixes and before claiming any terminal state**: the full
  battery — full scan of every app plus lint, full tests, and build
  for each. A terminal state claimed without a fresh full battery is
  invalid.

Keep the change only if its tier passes; otherwise revert and count
the attempt.

## Phase 5 — Stall detection and justification

- **Two remediation attempts per root cause**: if both fail
  verification, revert, mark it contested, move to the next root cause.
- **Two consecutive iterations with no score improvement** → stop:
  terminal state **STALLED**. Report the contested findings, what was
  tried, and why it failed. Do not grind.
- **Justification path**: when a finding is a false positive or flags
  an intentional, documented pattern, write the justification (rule,
  location, why the code is correct as-is) and present it to the user.
  Only user approval moves it off the worklist. Approved justifications
  make **JUSTIFIED** reachable — this is the pressure valve that keeps
  the 100/100 target from deadlocking against reality.

## Final report

1. **Terminal state** (PERFECT / JUSTIFIED / STALLED / BLOCKED).
2. **Score table**: per app, baseline → final, with the pinned scanner
   version and both timestamps.
3. **Fixes applied**: root cause, files touched, and the verification
   tier output proving each.
4. **Justifications** approved by the user, in full.
5. **Contested/stalled findings** with attempt history, if any.

Fresh command output is the only acceptable proof. Show the final scan.

## Re-running later

This loop finishes — but the score decays as code and scanner evolve.
The cheap maintenance variant: periodically (or in CI) run
`npx react-doctor@<version> --score` per app against the version
recorded in the last report; only a drop below that report's final
score triggers a new full run. When intentionally adopting a newer
scanner version, re-baseline first — new rules are new work, not
regressions.
