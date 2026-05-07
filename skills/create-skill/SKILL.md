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

## Before You Begin: Gather Requirements

Before creating a skill, gather:

1. **Purpose and scope**: What task or workflow does this skill handle?
2. **Target location**: Personal (`~/.cursor/skills/`) or project (`.cursor/skills/`)?
3. **Trigger scenarios**: When should the agent apply this skill?
4. **Key domain knowledge**: What does the agent need that it wouldn't already know?
5. **Output format**: Any required templates, formats, or styles?
6. **Existing patterns**: Conventions or examples to follow?

### Verbatim text from the user

If the user includes exact wording, use it **verbatim** in `SKILL.md`. Do not paraphrase, soften, or expand their copy.

### Inferring from context

If conversation context exists, infer the skill from what was discussed — workflows, patterns, or domain knowledge that emerged.

### Gathering information

Use AskQuestion for structured gathering:

```
- "Where should this skill be stored?" → ["Personal (~/.cursor/skills/)", "Project (.cursor/skills/)"]
- "Should this skill include executable scripts?" → ["Yes", "No"]
```

---

## Auditing an Existing Skill

When auditing a skill, run the Summary Checklist (bottom of this file) against it and report:

### Report format

| Severity | Meaning |
|----------|---------|
| **Must fix** | Violates core quality rules (broken frontmatter, over line limit, missing WHAT/WHEN) |
| **Should fix** | Hurts discoverability or wastes tokens (vague description, redundant sections) |
| **Nice to have** | Polish (could extract to reference file, terminology tweak) |

For each finding:
1. State the problem in one line
2. Cite the specific lines or section
3. Suggest a concrete fix

End with a summary table of all findings by severity.

---

## Skill File Structure

### Directory layout

```
skill-name/
├── SKILL.md              # Required - main instructions
├── reference.md          # Optional - detailed docs
├── examples.md           # Optional - usage examples
└── scripts/              # Optional - utility scripts
```

### Storage locations

| Type | Path | Scope |
|------|------|-------|
| Personal | `~/.cursor/skills/skill-name/` | All your projects |
| Project | `.cursor/skills/skill-name/` | Shared via repository |

### SKILL.md structure

```markdown
---
name: your-skill-name
description: Brief description of what this skill does and when to use it
---

# Your Skill Name

## Instructions
Clear, step-by-step guidance for the agent.

## Examples
Concrete examples of using this skill.
```

### Required metadata

| Field | Requirements | Purpose |
|-------|--------------|---------|
| `name` | Max 64 chars, lowercase letters/numbers/hyphens | Unique identifier |
| `description` | Max 1024 chars, non-empty | Discovery and auto-invocation |

---

## Writing Effective Descriptions

The description drives skill discovery. Include both **WHAT** (capabilities) and **WHEN** (trigger scenarios).

### Format

- Max 1024 chars, third person
- First sentence: what the skill does
- Second sentence: `Use when [specific triggers]`
- Trigger signals can include keywords, contexts, **and file types** (e.g. PDFs, .csv, Dockerfiles)

### Best practices

1. **Third person** — the description is injected into the system prompt:
   - Good: "Processes Excel files and generates reports"
   - Bad: "I can help you process Excel files"

2. **Specific trigger terms**:
   - Good: "Extract text from PDF files, fill forms, merge documents. Use when working with PDFs or document extraction."
   - Bad: "Helps with documents"

### Examples

```yaml
description: Generate commit messages by analyzing git diffs. Use when writing commit messages or reviewing staged changes.

description: Review code for quality, security, and best practices. Use when reviewing pull requests or code changes.
```

---

## Core Authoring Principles

### 1. Concise is key

The context window is shared. Every token competes for space.

The agent is already smart. Only add context it doesn't have. Challenge each paragraph: "Does this justify its token cost?"

```markdown
# Good
Use pdfplumber for text extraction:
\`\`\`python
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
\`\`\`

# Bad
PDF (Portable Document Format) files are a common file format...
there are many libraries available... we recommend pdfplumber
because it's easy to use...
```

### 2. Keep SKILL.md under 500 lines

Extract detailed reference material into separate files.

### 3. Progressive disclosure

Essential info in SKILL.md. Detailed reference in linked files the agent reads only when needed.

```markdown
## Additional resources
- For pattern examples, see [patterns.md](patterns.md)
```

Keep references one level deep. Deeply nested references get partially read.

### 4. Degrees of freedom

| Freedom | When | Example |
|---------|------|---------|
| **High** (text) | Multiple valid approaches | Code review guidelines |
| **Medium** (pseudocode) | Preferred pattern with wiggle room | Report generation |
| **Low** (scripts) | Fragile ops, consistency critical | Database migrations |

---

## Anti-Patterns

### 1. Too many options
```markdown
# Bad
"You can use pypdf, or pdfplumber, or PyMuPDF..."

# Good
"Use pdfplumber. For scanned PDFs needing OCR, use pdf2image + pytesseract."
```

### 2. Time-sensitive information
Don't tie instructions to dates. Use a "deprecated" section if needed.

### 3. Inconsistent terminology
Pick one term and stick with it: always "endpoint" (not mixing "URL", "route", "path").

### 4. Vague skill names
- Good: `processing-pdfs`, `analyzing-spreadsheets`
- Bad: `helper`, `utils`, `tools`

### 5. Windows-style paths
Always use forward slashes: `scripts/helper.py`

---

## When to Add Scripts

Add utility scripts when:
- The operation is deterministic (validation, formatting, parsing)
- The same code would be regenerated every run
- Errors need explicit, consistent handling

Scripts save tokens (no code in context) and improve reliability vs. generated code. For pattern examples, see [patterns.md](patterns.md).

---

## Skill Creation Workflow

### Phase 1: Discovery

Gather:
1. Purpose and primary use case
2. Storage location (personal vs project)
3. Trigger scenarios
4. Requirements or constraints
5. Existing examples or patterns

### Phase 2: Design

1. Draft the skill name (lowercase, hyphens, max 64 chars)
2. Write a specific, third-person description
3. Outline main sections
4. Identify if supporting files or scripts are needed

### Phase 3: Implementation

1. Create the directory structure
2. Write SKILL.md with frontmatter
3. Create supporting reference files if needed
4. Create utility scripts if needed

### Phase 4: Review with the user

Present the draft and ask:
- Does this cover your use cases?
- Anything missing or unclear?
- Should any section be more or less detailed?

Apply feedback before running the verification checklist.

### Phase 5: Verification

Run the Summary Checklist below. Fix anything that fails before delivering.

---

## Common Patterns

For pattern examples and a complete skill template, see [patterns.md](patterns.md).

---

## Summary Checklist

Before finalizing any skill (creation or audit), verify:

### Core quality
- [ ] Description is specific and includes trigger terms
- [ ] Description includes both WHAT and WHEN
- [ ] Description follows two-sentence format (what / "Use when...")
- [ ] Written in third person
- [ ] SKILL.md body is under 500 lines
- [ ] Consistent terminology throughout
- [ ] Examples are concrete, not abstract

### Structure
- [ ] File references are one level deep
- [ ] Progressive disclosure used appropriately
- [ ] Workflows have clear steps
- [ ] No time-sensitive information

### If including scripts
- [ ] Scripts solve problems rather than punt
- [ ] Required packages are documented
- [ ] Error handling is explicit and helpful
- [ ] No Windows-style paths
