# Skill System Refactor Plan

Scope: the **32 own skills** under `skills/`. The 5 vendor skills (`impeccable`,
`improve`, `remotion`, `review-animations`, `emil-design-eng`) are git submodules and
off-limits per AGENTS.md — they are only touched here as *targets of references* from own
skills.

Every SKILL.md and every supporting file was read for this plan. Findings are grouped by
severity: **A. Broken/incorrect** (fix first, these produce wrong behavior today),
**B. Overlaps & conflicts**, **C. Structural standardization**, **D. Bloat cuts**,
**E. Guardrails** (so the cleanup doesn't decay). Each item states the evidence and the
exact fix.

---

## A. Broken or incorrect today (must fix)

### A1. `ui-review` is hard-wired to one machine and a stale Impeccable version
`skills/ui-review/SKILL.md:30,74,108` reference
`/Users/tomimor/.claude/plugins/cache/impeccable/impeccable/1.5.1/.claude/skills/...`.

- Breaks for anyone (or any machine/agent) that isn't that exact Mac — including this
  repo's own promise that `install.sh` makes skills portable.
- Pins Impeccable **1.5.1** while the repo vendors Impeccable **v3.7.1** as a submodule
  and symlinks its skills into `skills/` — the dependency is already local and versioned.

**Fix:** resolve the Impeccable skill files relative to the installed skills directory
(the `impeccable` skills are siblings of `ui-review` in `~/.claude/skills` /
`~/.cursor/skills` and in this repo's `skills/`), with a one-line fallback: "locate the
`frontend-design` / `audit` / `critique` … skills wherever Impeccable is installed; if
absent, tell the user to install the Impeccable pack." Also replace the
`cursor-ide-browser` MCP + `browser_navigate`/`browser_take_screenshot` tool names with
the tool-agnostic browser guidance the other skills use (see C4).

### A2. `update-branch` contradicts `git-worktrees` and fails inside worktrees
`skills/update-branch/SKILL.md` does `git checkout main && git pull && git checkout
$BRANCH && git merge main`.

- In the worktree workflow this repo promotes (`git-worktrees`), `main` is checked out in
  the main root, so `git checkout main` inside a feature worktree **hard-fails** ("branch
  is already checked out at ...").
- It violates git-worktrees' own anti-pattern: "Do NOT `git checkout` a different branch
  inside an existing worktree."
- It hardcodes `main` — the exact thing `gh-pr-description-updater` lists as an
  anti-pattern ("Do NOT hardcode `main` as the base branch").

**Fix:** drop the checkout dance entirely. `git fetch origin && git merge
origin/<default>`, with the default branch detected via
`git symbolic-ref refs/remotes/origin/HEAD` (fallback: ask). Same result, fewer steps,
worktree-safe, no local `main` mutation. Keep the clean-tree pre-flight.

### A3. `install.sh` registry descriptions have drifted from the skills
- `gh-pr-list` entry: "**Numbered** Slack message of your **non-draft** open PRs" — the
  skill explicitly forbids numbered lists and has a whole Drafts section.
- `create-skill` entry: "authoring **Cursor** agent skills (forked from Cursor built-in)"
  — the repo targets both platforms.

**Fix:** regenerate the `SKILLS` array descriptions from the current frontmatter (and see
E1 for keeping them in sync automatically). Note: if B1 merges `gh-pr-list` away, its
entry is removed instead.

### A4. `gh-pr-list` emits a hardcoded Spanish string
`skills/gh-pr-list/SKILL.md:39`: empty-state message is "No tienes PRs abiertos" in an
otherwise fully English skill — an accidental leftover that makes output language depend
on which branch of the flow you hit. **Fix:** match the conversation language (the
pattern `governance-message` already documents), or plain English. Subsumed by B1 if
merged.

### A5. `gh-issue-creator` assumes org-specific GitHub issue types
`skills/gh-issue-creator/SKILL.md:69`: "**This repo uses GitHub issue types.**" Issue
types are an org-level opt-in feature; on repos without them the Step-8 `PATCH ...
-f type=` call fails. **Fix:** make the type step conditional — attempt it, and treat
"types not enabled" as a non-error (labels already carry the classification).

---

## B. Overlaps and conflicts

### B1. `gh-pr-list` is a subset of `pr-dashboard` — merge (decision needed)
Both: list *my* open PRs in a repo, produce a Slack-pasteable list of linked PR titles.
`pr-dashboard` already ends with a mandatory "copy-paste summary" that is exactly
`gh-pr-list`'s deliverable plus status icons. Their trigger spaces collide directly
("my PRs", "PRs ready to review", Slack sharing) — the agent has no reliable way to pick.

**Recommendation:** fold `gh-pr-list` into `pr-dashboard` as a **quick mode** ("just the
Slack list, no per-PR detail": keep the `:greenpr:`/`:draftpr:` emoji + Ready/Drafts
split as the quick-mode format), delete `gh-pr-list`, update `install.sh` + README.
Alternative if you prefer two skills: strip `pr-dashboard`'s copy-paste summary and give
each an exclusive trigger vocabulary. The merge is better: one fetch pipeline, one
format contract, zero routing ambiguity.

### B2. Review-family trigger collisions
"PR review" is claimed verbatim by **miguel-review**, **pr-dashboard**, and effectively
**review-pr**; "audit" is claimed by **miguel-review** and collides with
`grid-review`/`loop-cve-audit` trigger words. Misrouting is likely (e.g. "review my PR"
landing on the dashboard).

**Fix:** exclusive trigger vocabularies per description, plus a shared routing table
(same 6 lines in each skill's intro or a "Scope" note):

| Ask | Skill |
|---|---|
| Review **my working diff** (shape/simplicity) | miguel-review |
| Review a **teammate's PR** → paste-ready comments | review-pr |
| **Heavyweight verify** my PR (tests, assumptions) | verify-pr |
| **Respond to** reviewer comments on my PR | gh-pr-comment-assistant |
| **Status overview** of my open PRs | pr-dashboard |

Remove "PR review, code review, audit" from miguel-review's description (keep "miguel
review, diff review, minimal-diff review"); remove "PR review" from pr-dashboard's.

### B3. Thinking-partner trio: keep all three, align shared conventions
`grill-me` (walk a design's decision tree), `office-hours` (interrogate a product idea's
premise), `whats-missing` (single blindspot) occupy genuinely different niches — no
merge. But they independently re-invent the same conventions with different wording:
one-question-at-a-time, "mark the recommended option", anti-sycophancy phrase bans.
**Fix:** normalize the wording of those shared rules across the three, and add a
two-line "adjacent skills" note to each so the agent routes between them (e.g.
whats-missing: "for a full interrogation use grill-me; for a product-idea premise use
office-hours").

### B4. Worktree family: align the agent-reseat guidance
`git-worktrees` reseat instructions only know the Cursor MCP
(`cursor-app-control.move_agent_to_root`); `save-and-archive` knows both Cursor and
Claude Code (`ExitWorktree`). **Fix:** use save-and-archive's dual-platform wording in
git-worktrees too (both create and cleanup flows). The intentional duplication of
cleanup steps between the two skills stays (skills can't include each other), but the
duplicated text should be identical so it can't drift apart silently.

### B5. UI/design family: one-way cross-references
`grid-review` correctly defers non-grid concerns to `ui-review`/`benchmark`, but
`ui-review` never mentions `grid-review` (deep layout measurement) or `share-ready`
(meta/preview concerns), and `qa-manual` already cross-refs `ui-review`. **Fix:** add a
short "Pair with / defer to" section to `ui-review` (grid-review for measured grid
audits, benchmark for perf, qa-manual for behavior, share-ready for link previews).
This is the same pattern the verification family already does well
(`verification-before-completion` ↔ `qa-manual` ↔ `verify-pr`).

### B6. `create-skill` doesn't know this repo's own rules
AGENTS.md mandates: register new skills in `install.sh`'s `SKILLS` array, add them to the
README catalog, `references/` one level deep, SKILL.md < 500 lines. `create-skill`
teaches none of this and instead documents only generic `~/.cursor/skills` paths — so
using the skill *inside this repo* produces an unregistered, catalog-invisible skill.
**Fix:** add a "When authoring in a skills repo" step that defers to the repo's
AGENTS.md, and align its quality checklist with the conventions in section C so the
checklist and the house style are the same document.

---

## C. Standardization (one house format)

Codify the canonical SKILL.md shape in `create-skill` + AGENTS.md, then apply it to all
32. The shape (already the de-facto majority format):

```
---
name: <dir-name>
description: >-           # folded style, everywhere
  <What it does, 1-2 sentences.> Use when <trigger phrases>.
---
# Title
<1-paragraph intro; attribution line here if adapted from elsewhere>
## Critical rules          # numbered, ≤ ~6
## Workflow                # numbered steps or phases
## Output format           # when the skill has a deliverable shape
## Anti-patterns           # only items NOT already stated as critical rules
## References / Pair with  # links to references/*, sibling skills
```

### C1. Section naming & casing
Today: "Critical Rules" / "Core Rules" / "Core Principles" / "Hard rules" vs
"Anti-Patterns" / "Anti-patterns". Standardize on sentence case ("Critical rules",
"Anti-patterns") — pure find-and-replace, zero behavior risk.

### C2. Frontmatter description style
Mixed `>-` folded blocks and plain indented blocks. Standardize `>-`. Also verify every
description follows WHAT + "Use when …" (they nearly all do; `pr-dashboard` needs the
folded style only).

### C3. Supporting files move under `references/`
AGENTS.md prescribes `references/`; 5 skills keep supporting docs at top level:
`create-skill/patterns.md`, `miguel-review/{examples,philosophy}.md`,
`review-pr/examples.md` (its other two refs already live in `references/` — mixed!),
`grid-review/{grid-discipline,report-template}.md`,
`ui-review/{css-polish-details,review-template}.md`. Move + update links. Keeps every
skill's tree self-describing: SKILL.md, references/, scripts/, assets/, examples/.

### C4. One vocabulary for cross-cutting tool references
- **Ask-the-user tool:** 3 spellings in the wild — `AskQuestion` (14×),
  "Ask User Questions" (8×), `AskUserQuestion` (8×). Standardize on **`AskUserQuestion`**
  (the actual Claude Code tool name; Cursor maps its equivalent) — one grep-able token.
- **Browser tooling:** qa-manual/grid-review/benchmark say "Chrome MCP" with graceful
  fallbacks; ui-review names `cursor-ide-browser` + specific `browser_*` tools.
  Standardize on the "Chrome MCP / browser-eval tool, whichever is connected" phrasing
  with the preference order grid-review already models.
- **Agent reseat:** per B4.

### C5. Trigger phrases live only in the description
The body of a skill loads *after* activation, so in-body trigger lists are dead tokens:
`agent-guide-bootstrap` "## Additional triggers" and `qa-manual` "Trigger phrases that
should activate this skill". Fold any phrase worth keeping into the frontmatter
description, delete the sections.

---

## D. Bloat cuts (token budget, per skill)

Rule of thumb applied: SKILL.md carries what the agent needs *every* invocation;
everything situational moves to `references/`; anti-patterns that merely negate a
critical rule are deleted (the rule already exists — the mirror costs tokens twice).

| Skill | Lines | Cut | Target |
|---|---|---|---|
| **writing-voice** | 297 | Move "Platform Guidance" (~55 ln) and "Examples" (~40 ln) to `references/`; principles, blacklist, process, checklist stay. | ~190 |
| **create-skill** | 294 | The requirements list appears **twice verbatim** ("Before You Begin" vs "Phase 1: Discovery"); storage-location table appears twice; Summary Checklist restates the best-practices prose. Dedup + fold in B6 repo conventions. | ~180 |
| **governance-message** | 228 | "Plain message, no code block, no prose wrapper" is stated 4 separate times (rules 8–9, Step 5, 3 anti-pattern bullets) — say it once, sharply. Move the mrkdwn cheatsheet to `references/slack-mrkdwn.md`. | ~150 |
| **verify-pr** | 226 | Anti-patterns duplicate critical rules ("Report, don't fix" ×2); minor trims. Earns most of its length. | ~200 |
| **git-worktrees** | 233 | Dense but each line is operational; only C-series alignment. | ~225 |
| **gh-issue-creator** | 155 | Anti-patterns 1/2/5 restate rules 1–3 verbatim; trim. | ~140 |
| **review-pr, whats-missing, office-hours, others** | — | Same rule-mirror trim, generally 5–15 lines each. | — |

Not bloated (leave alone beyond C-series formatting): `miguel-review` (88),
`gh-pr-list`* (80), `update-branch` (80, rewritten smaller by A2), `goal-cursor` (91),
`grill-me` (103), `pr-dashboard` (107), `qa-manual` (116), `verification-before-completion`
(117), `investigate` (117), `grid-review` (113), `share-ready` (134), `teach` (149),
`meta-ads-bulk-creator` (159), the two loop skills (their length is contract, not fat).

*if it survives B1.

---

## E. Guardrails so the standard sticks

### E1. Extend `install.sh --check` (or add `scripts/lint_skills.sh`)
Current check: name↔dir match, description present, SKILLS-array sync. Add:
1. description ≤ 1024 chars, contains "Use when";
2. SKILL.md ≤ 500 lines;
3. no absolute `/Users/` or `/home/` paths anywhere in a skill;
4. banned tokens: `AskQuestion`, "Ask User Questions" (must be `AskUserQuestion`);
5. every relative markdown link in a SKILL.md resolves to an existing file;
6. every own skill appears in README.md's catalog.
CI already runs `--check` (`.github/workflows/`), so drift gets caught on push.

### E2. Documentation sync
Update AGENTS.md's "Own skill conventions" with the canonical template from section C
(single source of truth that `create-skill` links to), and refresh README catalog rows
whose one-liners drift (and the skill-count badge if B1 removes a skill).

---

## Execution plan (milestones = check-ins)

Order: correctness → consolidation → standardization → guardrails. One commit per
coherent step; `./install.sh --check` + link-check after every batch; each behavioral
change (A1–A5) manually traced against its workflow before commit.

| Milestone | Content | Check-in |
|---|---|---|
| **M1** | This plan | **← you are here — approve/adjust the 3 decisions below** |
| **M2** | A1–A5 correctness fixes | Diff summary per skill |
| **M3** | B1 merge (if approved) + B2 trigger vocab + B3–B6 cross-refs | Routing table review |
| **M4** | C1–C5 standardization + D bloat cuts, batched by family (GitHub / review / worktree / UI / thinking / loops / misc) | Before/after line counts, spot-check diffs |
| **M5** | E1 lint + E2 docs; full `--check` + link-check green | Final report |

### Decisions needed before M3
1. **Merge `gh-pr-list` into `pr-dashboard`?** (recommended: yes, as quick mode)
2. **`ui-review` Impeccable dependency:** repoint at the installed/vendored Impeccable
   pack (recommended), or decouple ui-review from Impeccable entirely?
3. **File moves in C3 OK?** (changes paths people may have memorized, e.g.
   `miguel-review/philosophy.md` → `miguel-review/references/philosophy.md`)
