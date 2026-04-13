---
name: verify-pr
description: >-
  Heavyweight PR verification that produces a structured report: code review (delegates to miguel-review), test plan
  with gap analysis, and upstream assumption validation. Use when the user mentions verify PR, verify my PR, PR
  verification, test plan for PR, or validate PR changes.
---

# Verify PR

Three-phase verification of the current branch's PR. Produces a structured report the developer reviews before
deciding what to address.

## Critical Rules

1. **No changes = no verification.** If `git diff` is empty, inform the user and stop.
2. **Read before flagging.** For every finding, read the surrounding file context. Never flag based on diff hunks alone.
3. **Report, don't fix.** Present the full verification report. Never apply changes without explicit developer approval.
4. **Respect project conventions.** Before Phase 2, look for `TESTING.md`, `.agents/`, or similar convention files in
   the repo root and follow them.

## Workflow

### Step 0: Gather Context

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
BASE=${USER_PROVIDED_BASE:-main}

git log $BASE...HEAD --oneline
git diff $BASE...HEAD --stat
git diff $BASE...HEAD
```

If no diff exists, inform the user and stop.

Also fetch the PR description if one exists:

```bash
gh pr view --json title,body,labels -q '.title, .body' 2>/dev/null
```

Use the PR title/description to understand the stated intent of the changes.

---

### Phase 1: Code Review

**Delegate to `miguel-review`.** Run the miguel-review skill against the branch diff. It covers: dead code, scope
creep, overengineering, naming, minimal diffs, and the deletion test.

If `miguel-review` is not available, perform a lightweight review covering the same areas: dead code, unjustified
changes, scope creep, naming, complexity.

**Then layer on these additional checks** that miguel-review does not cover:

- **Hallucination / fabrication**: references to functions, modules, APIs, or types that don't exist in the codebase.
  Hardcoded values that look invented (URLs, addresses, constants). Copy-pasted code from unrelated contexts.
  For each suspect reference, search the codebase to confirm it exists.
- **Correctness**: logic errors, off-by-one, wrong operator, inverted conditions, incorrect return types.
- **Data integrity**: mutations without validation, missing null/undefined checks on external data, type coercions
  that lose information, unhandled promise rejections.

Record all Phase 1 findings (both from miguel-review and the addendum) for the final report.

---

### Phase 2: Test Plan

Read project testing conventions first. Look for `TESTING.md`, `docs/TESTING.md`, or similar files in the repo root.

For each meaningful change in the diff, produce a test plan entry:

| Field | Description |
|-------|-------------|
| **Change** | What was added/modified (1 sentence) |
| **What to test** | Specific behavior to verify |
| **Expected result** | What correct behavior looks like |
| **Test type** | Unit / Integration / E2E |
| **Suggested location** | File path where the test should live |
| **Existing coverage** | Whether a test already covers this (file + line if yes) |

To check existing coverage, for each changed file search for co-located test files (`.test.*`, `.spec.*`) and grep
integration/e2e test directories for references to changed functions or endpoints.

After presenting the test plan, offer to run existing tests:

```
I can run the relevant test suites now to check current state. Want me to proceed?
```

---

### Phase 3: Upstream Assumption Verification

Scan the diff for assumptions that depend on external sources of truth. Common categories:

- **Imported types or functions** from other packages -- verify they exist and match the expected signature.
- **DB schema expectations** -- verify column names, types, and constraints match the schema definition.
- **API contracts** -- verify endpoint paths, request/response shapes match the API spec or route definitions.
- **Environment variables** -- verify they exist in `.env.example` and compose files.
- **Config values** -- verify defaults and expected shapes match the config source.
- **Hardcoded URLs, addresses, selectors** -- verify they resolve or match the intended target.

For each assumption found:

1. Identify what is assumed (1 sentence).
2. Trace to the source of truth (specific file + line).
3. Verify it holds: **Confirmed** or **Unverified** (with reason).

---

## Output Template

Present the full report using this structure:

```
## PR Verification: `{branch}` -> `{base}`

**PR**: {title}
**Files changed**: {count} | **Additions**: +{n} | **Deletions**: -{n}

---

### Phase 1: Code Review

{miguel-review output}

#### Additional Checks

| # | File | Line | Finding | Severity |
|---|------|------|---------|----------|
| 1 | path/to/file.ts | 42 | Description of issue | Critical / Warning / Nit |

If none: "No additional issues beyond the code review above."

---

### Phase 2: Test Plan

| # | Change | What to test | Expected result | Type | Location | Covered? |
|---|--------|-------------|-----------------|------|----------|----------|
| 1 | ... | ... | ... | Unit | ... | No |

**Gaps**: {count} changes without existing test coverage.

---

### Phase 3: Upstream Assumptions

| # | Assumption | Source of truth | Status |
|---|-----------|----------------|--------|
| 1 | `UserSchema` has `email` field | `src/db/schema.ts:45` | Confirmed |
| 2 | `POST /api/users` accepts `role` | Not found | Unverified |

---

### Verdict

One sentence: what's the overall state of this PR?

### Recommended Actions
Numbered list of concrete next steps, ordered by priority.
```

## Anti-Patterns

- Do NOT duplicate the miguel-review checks -- delegate, don't reimplement.
- Do NOT suggest tests for trivial changes (import reordering, type-only changes, formatting).
- Do NOT fabricate source-of-truth paths -- if you can't find the upstream source, say "Unverified."
- Do NOT run tests or apply fixes without developer approval.
- Do NOT skip Phase 3 -- assumption verification catches the bugs that code review misses.
