# Agent Guide Spec — Section-by-Section Templates

**Reference material for the `agent-guide-bootstrap` skill.** Consult the templates and rationale below when generating files. Do not execute this document as a standalone prompt — the workflow and critical rules live in [SKILL.md](../SKILL.md).

The skill's workflow (explore → identify → clarify → generate → verify) calls into the sections of this spec when it needs exact structure: the AGENTS.md skeleton, domain-guide templates, the "Do Not" discovery checklist, and the example of "what good looks like".

---

## Architecture overview

The system helps AI coding assistants (Cursor, Claude Code, Copilot, Codex, etc.) work effectively in the repo by giving them the right context at the right time.

---

## Architecture

The system uses **progressive disclosure** -- a small always-on root file, with deeper context loaded on demand.

```
AGENTS.md                  Always loaded. ~80 lines max. The shared source of truth.
  ├── .agents/<domain>.md  Loaded on demand when agent touches that domain.
  ├── .agents/skills/      Loaded on trigger (specific workflows).
  └── .agents/design-decisions.md  Documents the "why" behind this system.

CLAUDE.md                  One-line redirect → AGENTS.md (for Claude Code).
```

**Why `AGENTS.md` as the hub?** Each AI tool has its own config format (`.cursorrules`, `CLAUDE.md`,
`.github/copilot-instructions.md`, etc.). Putting content in tool-specific files means maintaining multiple copies.
Instead, the actual content lives in `AGENTS.md` and tool-specific files either load it directly (Cursor workspace
rules) or contain a one-line redirect. One source of truth, no drift.

---

## File 1: `AGENTS.md` -- Always-On Context

This is the root file. It is loaded into every agent conversation. It must be **terse** (~80 lines) because it costs
tokens on every interaction. It contains five sections:

### Section 1: Project Header

One-line project description + tech stack summary.

```markdown
# <Project Name> -- Agent Guide

<One sentence describing the project>. This is a **<language/framework>** <monorepo|repo> <using build tool>.
```

### Section 2: Repository Map

A terse ASCII directory tree with one-line descriptions. The agent uses this to navigate without exploring. Only include
top-level directories and key subdirectories. No files.

```markdown
## Repository Map
```

With a fenced code block (no language tag) containing the tree:

```
src/
  api/        REST API (Express/Fastify/etc.)
  web/        Frontend app (React/Vue/etc.)
  shared/     Shared types and utilities
tests/        Test suites
docs/         Documentation
.agents/      Agent guides, skills, design decisions
```

**Guidelines for the map:**

- Include every app/package/top-level directory that an agent might need to navigate to.
- Use short inline descriptions (aligned with spaces).
- For monorepos, group by `apps/` and `packages/` (or however the repo organizes workspaces).

### Section 3: Commands

Exact shell commands for common operations. Agents guess wrong without these (e.g., `npm run lint` vs
`pnpm biome check --write`). Include only commands agents actually need:

```markdown
## Commands

- `<lint command>` -- lint + format a single file
- `<typecheck command>` -- typecheck
- `<test command>` -- run tests
- `<full check command>` -- lint + format + typecheck everything (run before pushing)
- `<dev command>` -- start development environment
```

**Guidelines for commands:**

- Use exact invocations, not descriptions. `pnpm biome check --write path/to/file.ts`, not "run the linter."
- Include filter/scope syntax if the repo uses workspaces (e.g., `pnpm --filter <app> typecheck`).
- Include conditional commands (e.g., "If API routes changed: `pnpm build-api-client`").

### Section 4: Domain Guide Pointers

Conditional routing rules that tell the agent which domain guide to read based on what files are being touched. This
keeps AGENTS.md small while ensuring deeper context loads on demand.

```markdown
## Domain Guides

- Touching `<path pattern>`? Read [<Guide name>](.agents/<guide>.md) first.
- Touching `<path pattern>`? Read [<Guide name>](.agents/<guide>.md) first.
- Writing or modifying tests? Read [Testing guidelines](path) first.
```

**Guidelines:**

- One pointer per domain/area of the codebase.
- Use path patterns that match what agents see (`apps/frontend/`, `src/api/`, etc.).
- Link to the guide file with a relative path.

### Section 5: Agent Workflow Guide

A numbered checklist that every agent follows for every task. This is the most important section -- it enforces
discipline.

```markdown
## Agent Workflow Guide

1. Always plan changes and identify the files you will touch. Ask the user for clarification if needed.
2. Read the relevant domain guide.
3. Check existing patterns in similar files.
4. Implement with minimal diff: change only what's necessary, don't refactor adjacent code, don't rename unless
   explicitly required, don't "improve" unrelated code.
5. During development, run for each modified file:
   - `<lint command>`
   - `<typecheck command>`
   - <any conditional commands>
6. Before committing, run final checks:
   - `<full check command>`
   - `<test command>`
   - Verify no secrets are being committed. If secrets are found, STOP and ask the user.
7. Once development is complete, update docs if needed.
```

### Section 6: Conventions

Cross-cutting rules that are most commonly violated. These are always visible because agents break them most often.

```markdown
## Conventions

- **Commit format** -- <describe format, e.g., conventional commits>.
- **Env var changes** require updating: <list all places that must be updated>.
- **Never install a new dependency** without first checking if an existing package covers the need.
```

---

## File 2: Domain Guides -- `.agents/<domain>.md`

Create one domain guide per major area of the codebase (e.g., `frontend.md`, `backend.md`, `infrastructure.md`,
`mobile.md`). Each guide follows the same structure.

### Structure

```markdown
# <Domain> Patterns

Applies to `<path(s)>` -- <brief tech description>.

## Do Not

- Do not <prohibited pattern> -- <what to do instead>.
- Do not <prohibited pattern> -- <what to do instead>.

## <Architecture / Structure>

<Terse ASCII diagram of the domain's architecture>

<Responsibility boundaries for each layer>

## <Key Pattern 1>

<Description with canonical reference file>

## <Key Pattern 2>

<Description with canonical reference file>
```

### Critical Rules for Domain Guides

1. **Lead with "Do Not" lists.** Agents can discover positive patterns from existing code. They cannot discover which
   valid-looking patterns are prohibited. Every "Do Not" rule should trace to an actual agent mistake or a pattern that
   looks correct but is wrong in this codebase.

2. **Point to canonical reference files.** Instead of embedding code examples that go stale, point to a real file:
   "Canonical example: `src/routes/users-routes.ts`". The codebase is always up to date; docs aren't.

3. **Include architecture diagrams.** Use terse ASCII diagrams to show layer boundaries. Agents need to know where
   business logic vs. data access vs. HTTP handling belongs.

4. **Cover responsibility boundaries.** For each architectural layer, state what it does and what it must NOT do (e.g.,
   "Routes define schemas and return responses. No business logic.").

5. **Document preferred vs. legacy patterns.** If the codebase has two ways of doing something, explicitly state which
   is preferred for new code and which is legacy. Tell agents: "Do not introduce new files using the legacy pattern."

### How to Discover "Do Not" Rules

Explore the codebase and look for:

- Multiple ways to do the same thing (API clients, state management, styling approaches) -- pick the canonical one and
  prohibit the rest.
- Singleton patterns that agents might duplicate (HTTP clients, database connections, auth instances).
- Import path conventions that have a "wrong but works" alternative.
- Framework features that are banned (e.g., Options API in a Composition API codebase).
- Auth/security patterns that must not be bypassed.
- Styling/design-token systems where inventing new tokens breaks consistency.

---

## File 3: `CLAUDE.md` -- Tool Redirect

A one-line file for Claude Code support:

```markdown
# <Project Name>

Read AGENTS.md for full project context, monorepo structure, commands, conventions, and workflow guidelines.
```

---

## File 4: `.agents/design-decisions.md` -- Architecture Rationale

Documents why the agent guide system is structured this way. Useful for maintainers and for agents that need to
understand the meta-system.

Generate this file based on the following principles, adapted to the specific repo:

### Design Principles (Non-Negotiable)

1. **Progressive disclosure** -- `AGENTS.md` (~80 lines) is always loaded. Domain guides and skills load only when
   needed. This keeps base context small for performance and cost.

2. **Single source of truth** -- All agent guidance lives in `AGENTS.md` + `.agents/`. Tool-specific files (CLAUDE.md,
   .cursorrules, etc.) are thin redirects. No duplicated content.

3. **Guardrails over guidelines** -- Use "Do NOT" and "NEVER" instead of "prefer" and "consider." Agents follow
   prohibitions more reliably than suggestions.

4. **Canonical references** -- Point to real code files instead of embedding examples. The codebase is always up to
   date; embedded examples go stale.

5. **Gates as safety nets** -- Destructive operations (force push, dropping tables, deleting resources) require explicit
   human approval. Skills encode this as confirmation gates.

### Maintenance Protocol

```markdown
## Maintenance

- **New app/package** → update repository map in `AGENTS.md`
- **New convention** → add to relevant domain guide, not `AGENTS.md` (unless cross-cutting)
- **New skill** → create `SKILL.md` in `.agents/skills/<name>/`
- **Agent mistake observed** → add "Do Not" rule to domain guide or anti-pattern to skill
- **New AI tool support** → create entry-point file redirecting to `AGENTS.md`
```

---

## Optional: Skills -- `.agents/skills/<name>/SKILL.md`

Skills are self-contained automation recipes for repetitive workflows (PR descriptions, issue creation, security scans,
doc updates). Only create skills if the repo has clear repetitive workflows. Each skill file follows this structure:

```markdown
---
name: <skill-name>
description: <one-line trigger description>
---

# <Skill Name>

## Critical rules

- NEVER <destructive action> without explicit user approval.
- <other non-negotiable constraints>

## Steps

1. <Step with exact shell command>
2. <Step with exact shell command>
   - If <error condition>: <recovery action>
3. <Gate: confirm with user before proceeding>
4. <Final step>

## Anti-patterns

- Do not <common mistake>.
- Do not <common mistake>.
```

**Gate types:**

- _Clarification gate_ -- "If ambiguous, STOP and ask the user." Prevents guessing.
- _Confirmation gate_ -- "NEVER do X without user approval." Prevents destructive actions.

---

## Step-by-Step Instructions

When generating the agent guide system for a repo, follow these steps:

1. **Explore the repository structure.** Identify all top-level directories, apps, packages, and key config files
   (package.json, tsconfig, Dockerfile, docker-compose, CI configs, etc.).

2. **Identify the tech stack.** Languages, frameworks, build tools, package managers, linters, formatters, test runners,
   ORMs, CI systems.

3. **Map the architecture.** For each app/service, identify the internal layer structure (routes, controllers, services,
   repositories, models, components, views, etc.).

4. **Discover commands.** Read package.json scripts, Makefiles, CI configs, and READMEs to find the exact lint, test,
   build, and dev commands.

5. **Identify conventions.** Look at commit history for commit message format. Check for .env.example files. Look at
   existing linter/formatter configs. Check for conventional commits, semantic release, or similar tooling.

6. **Find prohibited patterns.** Look for multiple approaches to the same problem and determine which is canonical.
   Check for singleton patterns. Look at import conventions. Check auth/security patterns.

7. **Identify canonical reference files.** For each pattern (routes, components, data fetching, etc.), find the
   best-written example file to point to.

8. **Generate the files:**
   - `AGENTS.md` (~80 lines, terse, cross-cutting)
   - `.agents/<domain>.md` (one per major domain, "Do Not" lists first)
   - `CLAUDE.md` (one-line redirect)
   - `.agents/design-decisions.md` (architecture rationale)

9. **Verify the output:**
   - `AGENTS.md` is under ~80 lines.
   - Every "Do Not" rule has a concrete "do this instead" alternative.
   - All file paths in canonical references actually exist.
   - Commands are exact and runnable.
   - No embedded code examples that could go stale -- only canonical references.

---

## Reference: What Good Looks Like

A well-structured `AGENTS.md` for a TypeScript monorepo:

    # MyProject -- Agent Guide

    MyProject is a SaaS platform for team collaboration. This is a
    **TypeScript monorepo** (pnpm workspaces + Turborepo).

    ## Repository Map

    ```
    apps/
      api/          Express REST API      (port 3000)
      web/          Next.js frontend      (port 3001)
      worker/       Bull queue processor

    packages/
      db/           Prisma schema + client
      ui/           Shared React components
      config/       Shared ESLint/TS configs
      emails/       Email templates (React Email)

    infra/          Terraform + Docker configs
    docs/           Documentation site
    .agents/        Agent guides, skills
    ```

    ## Commands

    - `pnpm lint --filter <app>` -- lint a single app
    - `pnpm typecheck --filter <app>` -- typecheck a single app
    - `pnpm test --filter <app>` -- test a single app
    - `pnpm check` -- lint + typecheck + test everything
    - `pnpm dev` -- start all apps + deps
    - `pnpm db:generate` -- regenerate Prisma client after schema changes
    - `pnpm db:migrate` -- run pending migrations

    ## Domain Guides

    - Touching `apps/web/` or `packages/ui/`? Read [Frontend patterns](.agents/frontend.md) first.
    - Touching `apps/api/`? Read [Backend patterns](.agents/backend.md) first.
    - Touching `packages/db/`? Read [Database patterns](.agents/database.md) first.
    - Writing tests? Read [Testing guidelines](TESTING.md) first.

    ## Agent Workflow Guide

    1. Plan changes and identify files. Ask for clarification if needed.
    2. Read the relevant domain guide.
    3. Check existing patterns in similar files.
    4. Implement with minimal diff. Don't refactor adjacent code.
    5. Per modified file: `pnpm lint --filter <app>` + `pnpm typecheck --filter <app>`.
       If Prisma schema changed: `pnpm db:generate`.
    6. Before committing: `pnpm check` + `pnpm test`. Verify no secrets.
    7. Update docs if needed.

    ## Conventions

    - **Conventional commits** -- `feat:`, `fix:`, `chore:`, etc. Used by semantic-release.
    - **Env var changes** require updating: `.env.example`, `docker-compose.yml`, and `infra/`.
    - **Never install a new dependency** without checking if an existing package covers the need.
