---
name: create-skill
description: >-
  Author or audit agent skills: gather requirements, write SKILL.md with
  frontmatter, structure supporting files, and verify quality. Use when
  creating a new skill, reviewing an existing skill, or asking about
  SKILL.md format and best practices.
---

# Create & Audit Skills

Skills are markdown files that teach the agent specialized workflows. This skill covers both **creating** new ones and **auditing** existing ones.

## Skill File Structure

### Directory layout

```
skill-name/
├── SKILL.md              # Required - main instructions
├── references/           # Optional - detailed docs the agent reads on demand
│   └── some-reference.md
├── examples/             # Optional - sample inputs
└── scripts/              # Optional - utility scripts
```

Keep references **one level deep**: link them from SKILL.md, never chain reference → reference (deeply nested references get partially read).

### Storage locations

| Type | Path | Scope |
|------|------|-------|
| Personal (Cursor) | `~/.cursor/skills/skill-name/` | All your projects |
| Personal (Claude Code) | `~/.claude/skills/skill-name/` | All your projects |
| Project | `.cursor/skills/skill-name/` (or `.claude/skills/`) | Shared via repository |

**Authoring inside a skills repo:** if the repo has an `AGENTS.md` with its own skill conventions (like this one), follow it — typically: register the skill in `install.sh`'s `SKILLS` array, add it to the README catalog, and commit all three together. The repo's AGENTS.md wins over the generic paths above.

### Canonical SKILL.md shape

```markdown
---
name: your-skill-name          # matches the directory name
description: >-                # folded style
  What this skill does, 1-2 sentences. Use when [specific triggers].
---

# Title

One-paragraph intro (attribution line here if adapted from elsewhere).

## Critical rules      # numbered, ~6 max

## Workflow            # numbered steps or phases

## Output format       # when the skill has a deliverable shape

## Anti-patterns       # only items NOT already stated as critical rules

## References          # links to references/*, adjacent skills
```

Required frontmatter:

| Field | Requirements | Purpose |
|-------|--------------|---------|
| `name` | Max 64 chars, lowercase letters/numbers/hyphens, matches directory | Unique identifier |
| `description` | Max 1024 chars, non-empty, third person | Discovery and auto-invocation |

## Writing Effective Descriptions

The description drives skill discovery — it is the **only** part loaded before the skill fires, so trigger phrases belong here, never in the body.

- First sentence: what the skill does. Second sentence: `Use when [specific triggers]`.
- Trigger signals can include keywords, contexts, **and file types** (e.g. PDFs, .csv, Dockerfiles).
- Third person ("Processes Excel files...", not "I can help you...") — it is injected into the system prompt.
- Claim triggers no sibling skill already claims. If two skills could plausibly answer the same phrase, disambiguate both descriptions.

```yaml
# Good
description: >-
  Extract text from PDF files, fill forms, merge documents. Use when
  working with PDFs or document extraction.

# Bad
description: Helps with documents
```

## Core Authoring Principles

### 1. Concise is key

The context window is shared. Every token competes for space. The agent is already smart — only add context it doesn't have. Challenge each paragraph: "Does this justify its token cost?"

### 2. Keep SKILL.md under 500 lines

Extract detailed reference material into `references/`. Essential info in SKILL.md; detail loaded only when needed (progressive disclosure).

### 3. Don't restate rules as anti-patterns

An anti-pattern that merely negates a critical rule costs the tokens twice. Anti-patterns are for failure modes the rules don't already cover.

### 4. Degrees of freedom

| Freedom | When | Example |
|---------|------|---------|
| **High** (text) | Multiple valid approaches | Code review guidelines |
| **Medium** (pseudocode) | Preferred pattern with wiggle room | Report generation |
| **Low** (scripts) | Fragile ops, consistency critical | Database migrations |

### 5. When to add scripts

Add utility scripts when the operation is deterministic (validation, formatting, parsing), the same code would be regenerated every run, or errors need consistent handling. Scripts save tokens and improve reliability. For pattern examples, see [references/patterns.md](references/patterns.md).

## Creation Workflow

### Phase 1: Gather requirements

1. **Purpose and scope**: What task or workflow does this skill handle?
2. **Storage location**: Personal, project, or a skills repo?
3. **Trigger scenarios**: When should the agent apply this skill?
4. **Key domain knowledge**: What does the agent need that it wouldn't already know?
5. **Output format**: Any required templates, formats, or styles?
6. **Existing patterns**: Conventions, sibling skills, or examples to follow?

Use `AskUserQuestion` for structured gathering. If the conversation already contains the workflow (patterns or domain knowledge that emerged while working), infer the skill from it. **If the user provides exact wording, use it verbatim** — do not paraphrase, soften, or expand their copy.

### Phase 2: Design

1. Draft the skill name (lowercase, hyphens, max 64 chars; specific like `processing-pdfs`, never vague like `helper`, `utils`)
2. Write a specific, third-person description with triggers
3. Outline sections following the canonical shape
4. Identify supporting files or scripts

### Phase 3: Implementation

Create the directory structure, write SKILL.md, add references/scripts as needed. If in a skills repo, complete its registration steps (install.sh, README).

### Phase 4: Review with the user

Present the draft and ask: does this cover your use cases? Anything missing or unclear? Apply feedback.

### Phase 5: Verification

Run the checklist below. Fix anything that fails before delivering.

## Auditing an Existing Skill

Run the checklist below against the skill and report each finding as:

| Severity | Meaning |
|----------|---------|
| **Must fix** | Violates core quality rules (broken frontmatter, over line limit, missing WHAT/WHEN) |
| **Should fix** | Hurts discoverability or wastes tokens (vague description, redundant sections, trigger collisions) |
| **Nice to have** | Polish (could extract to reference file, terminology tweak) |

For each finding: state the problem in one line, cite the specific lines, suggest a concrete fix. End with a summary table by severity.

## Anti-patterns

- **Too many options.** "You can use pypdf, or pdfplumber, or PyMuPDF..." → pick one: "Use pdfplumber. For scanned PDFs needing OCR, use pdf2image + pytesseract."
- **Time-sensitive information.** Don't tie instructions to dates; use a "deprecated" section if needed.
- **Inconsistent terminology.** Pick one term and stick with it: always "endpoint", not a mix of "URL", "route", "path".
- **Windows-style paths.** Always forward slashes: `scripts/helper.py`.
- **Trigger phrases in the body.** They do nothing there — the body loads after activation.

## Summary Checklist

Before finalizing any skill (creation or audit), verify:

### Core quality
- [ ] Description: third person, specific triggers, WHAT + "Use when..." format
- [ ] No trigger collisions with sibling skills
- [ ] SKILL.md body under 500 lines
- [ ] Consistent terminology; concrete examples
- [ ] Anti-patterns don't restate critical rules

### Structure
- [ ] Follows the canonical shape (frontmatter `>-`, sentence-case sections)
- [ ] Supporting docs under `references/`, one level deep, all links resolve
- [ ] Workflows have clear numbered steps
- [ ] No absolute machine-specific paths
- [ ] Registered per the repo's AGENTS.md, if authoring in a skills repo

### If including scripts
- [ ] Scripts solve problems rather than punt
- [ ] Required packages documented; error handling explicit
- [ ] No Windows-style paths

For pattern examples and a complete skill template, see [references/patterns.md](references/patterns.md).
