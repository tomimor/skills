---
name: agent-guide-bootstrap
description: >-
  Bootstrap a complete agent guide system for a repo — generates AGENTS.md
  (always-on), .agents/{domain}.md (loaded on demand), CLAUDE.md (redirect),
  and .agents/design-decisions.md using progressive disclosure and
  canonical references instead of stale embedded code. Use when the user
  mentions setting up AGENTS.md, bootstrapping an agent guide, configuring
  CLAUDE.md for a repo, "set up agent context", or onboarding a new repo
  for AI coding agents.
---

# Agent Guide Bootstrap

Generate the full agent-guide system for a repo so AI coding assistants (Claude Code, Cursor, Copilot, Codex) get the right context at the right time.

**The system uses progressive disclosure**: a terse always-on `AGENTS.md` (~80 lines) + on-demand domain guides + canonical reference files. One source of truth — tool-specific files like `CLAUDE.md` are thin redirects.

## Additional triggers

Beyond the description's "Use when…" phrases, also invoke when:

- User joined a new repo and wants AI agents productive.
- User notices an agent making the same mistake twice and wants to encode the rule.

## Critical rules

1. **Never embed code examples that will go stale.** Point to canonical reference files (`Canonical example: src/routes/users-routes.ts`). The codebase is always up to date — embedded examples are not.
2. **Lead domain guides with "Do Not" lists.** Agents discover positive patterns from existing code. They cannot discover which valid-looking patterns are prohibited.
3. **AGENTS.md ≤ 80 lines.** It loads on every turn. Anything domain-specific moves to `.agents/{domain}.md`.
4. **Exact commands, not descriptions.** `pnpm biome check --write path/to/file.ts`, not "run the linter".

## Workflow

### 1. Explore the repo

Read these:
- Manifest files: `package.json` / `pyproject.toml` / `Gemfile` / `Cargo.toml` / `go.mod`
- Top-level directories + monorepo config (`pnpm-workspace.yaml`, `turbo.json`, `nx.json`)
- Build/CI configs: `Makefile`, `.github/workflows/`, `Dockerfile`, `docker-compose.yml`
- Existing docs: `README.md`, `CONTRIBUTING.md`, `docs/`
- Recent commit history (commit message format)
- Any existing `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.github/copilot-instructions.md` — do not duplicate, merge

### 2. Identify

- **Tech stack**: languages, frameworks, package manager, linter, formatter, test runner, ORM, CI.
- **Architecture per app/package**: routes/controllers/services/models, or components/views/state, etc.
- **Domains**: each top-level area that an agent would touch separately (frontend, backend, infra, db, mobile).
- **Exact commands**: read `package.json` scripts, Makefiles, CI configs, READMEs. Capture lint, typecheck, test, dev, full-check.
- **Conventions**: commit format (look at commit history), `.env.example` keys, conditional commands (e.g. "if Prisma schema changed: `pnpm db:generate`").
- **Prohibited patterns**: multiple ways to do the same thing → pick canonical, prohibit rest. Singletons that get duplicated. Legacy vs. preferred patterns.
- **Canonical reference files**: best-written example per pattern (routes, components, data fetching, tests).

### 3. Clarification gate

If anything is ambiguous — which pattern is canonical, what the commit format is, whether a domain needs its own guide — **STOP and ask the user** with `AskUserQuestion` before generating files. Guessing here cascades into bad rules.

### 4. Generate files

Use the structure spec in [references/agent-guide-spec.md](references/agent-guide-spec.md) for exact section-by-section guidance. Generate:

- `AGENTS.md` (~80 lines): project header, repo map, commands, domain pointers, workflow checklist, conventions.
- `.agents/<domain>.md` (one per major area): "Do Not" list first, then architecture diagram, then key patterns with canonical references.
- `CLAUDE.md`: one-line redirect to `AGENTS.md`.
- `.agents/design-decisions.md`: rationale for the progressive disclosure system + maintenance protocol.

### 5. Verify before committing

- `AGENTS.md` is ≤ 80 lines.
- Every "Do Not" rule has a concrete "do this instead".
- Every canonical reference path exists (`ls` it). Broken links destroy trust.
- Every command is exact and runnable (no placeholders).
- No embedded code examples that could go stale.

## Anti-patterns

- **Do not** generate `AGENTS.md` over 100 lines. It costs tokens on every turn.
- **Do not** duplicate content between `AGENTS.md` and tool-specific files. Tool files are redirects.
- **Do not** write "prefer" or "consider" rules. Use "Do NOT" and "NEVER" — agents follow prohibitions reliably; suggestions get ignored.
- **Do not** invent reference paths. Verify they exist.
- **Do not** add a domain guide for an area the repo doesn't actually have. One guide per real domain.

## Reference

Full structural spec with section-by-section templates: [references/agent-guide-spec.md](references/agent-guide-spec.md).
