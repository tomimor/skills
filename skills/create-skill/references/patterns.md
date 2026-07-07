# Skill Patterns & Examples

Reference material for common skill authoring patterns. Read this when you need a template or inspiration for structuring a skill.

---

## Template Pattern

Provide output format templates when consistent structure matters:

```markdown
## Report structure

Use this template:

\`\`\`markdown
# [Analysis Title]

## Executive summary
[One-paragraph overview of key findings]

## Key findings
- Finding 1 with supporting data
- Finding 2 with supporting data

## Recommendations
1. Specific actionable recommendation
2. Specific actionable recommendation
\`\`\`
```

---

## Examples Pattern

Show input/output pairs when output quality depends on seeing examples:

```markdown
## Commit message format

**Example 1:**
Input: Added user authentication with JWT tokens
Output:
\`\`\`
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
\`\`\`

**Example 2:**
Input: Fixed bug where dates displayed incorrectly
Output:
\`\`\`
fix(reports): correct date formatting in timezone conversion

Use UTC timestamps consistently across report generation
\`\`\`
```

---

## Workflow Pattern

Break complex operations into clear steps with checklists:

```markdown
## Form filling workflow

Task Progress:
- [ ] Step 1: Analyze the form
- [ ] Step 2: Create field mapping
- [ ] Step 3: Validate mapping
- [ ] Step 4: Fill the form
- [ ] Step 5: Verify output

**Step 1: Analyze the form**
Run: \`python scripts/analyze_form.py input.pdf\`
...
```

---

## Conditional Workflow Pattern

Guide through decision points:

```markdown
## Document modification workflow

1. Determine the modification type:

   **Creating new content?** → Follow "Creation workflow" below
   **Editing existing content?** → Follow "Editing workflow" below

2. Creation workflow:
   - Use docx-js library
   - Build document from scratch
   ...
```

---

## Feedback Loop Pattern

For quality-critical tasks, implement validation loops:

```markdown
## Document editing process

1. Make your edits
2. **Validate immediately**: \`python scripts/validate.py output/\`
3. If validation fails:
   - Review the error message
   - Fix the issues
   - Run validation again
4. **Only proceed when validation passes**
```

---

## Utility Scripts

Pre-made scripts beat generated code:
- More reliable
- Save tokens (no code in context)
- Save time (no generation step)
- Ensure consistency

```markdown
## Utility scripts

**analyze_form.py**: Extract all form fields from PDF
\`\`\`bash
python scripts/analyze_form.py input.pdf > fields.json
\`\`\`

**validate.py**: Check for errors
\`\`\`bash
python scripts/validate.py fields.json
# Returns: "OK" or lists conflicts
\`\`\`
```

Make clear whether the agent should **execute** the script or **read** it as reference.

---

## Complete Example

A well-structured skill:

```
code-review/
├── SKILL.md
└── references/
    ├── standards.md
    └── examples.md
```

```markdown
---
name: code-review
description: >-
  Review code for quality, security, and maintainability following team
  standards. Use when reviewing pull requests, examining code changes,
  or when the user asks for a code review.
---

# Code Review

## Quick Start

When reviewing code:

1. Check for correctness and potential bugs
2. Verify security best practices
3. Assess code readability and maintainability
4. Ensure tests are adequate

## Review Checklist

- [ ] Logic is correct and handles edge cases
- [ ] No security vulnerabilities (SQL injection, XSS, etc.)
- [ ] Code follows project style conventions
- [ ] Functions are appropriately sized and focused
- [ ] Error handling is comprehensive
- [ ] Tests cover the changes

## Providing Feedback

Format feedback as:
- **Critical**: Must fix before merge
- **Suggestion**: Consider improving
- **Nice to have**: Optional enhancement

## Additional Resources

- For detailed coding standards, see [references/standards.md](references/standards.md)
- For example reviews, see [references/examples.md](references/examples.md)
```
