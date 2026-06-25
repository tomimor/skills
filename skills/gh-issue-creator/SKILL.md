---
name: gh-issue-creator
description:
  Create a GitHub issue in the current repo. Prefers the repo's own issue templates when present, otherwise falls back
  to the skill's built-in templates (bug, feature, tech debt) or a blank issue. Fetches available labels dynamically,
  maps user intent to the right template, and enforces concise problem descriptions. Use when the user mentions creating
  an issue, filing a bug, opening a ticket, or reporting a problem.
---

# GitHub Issue Creator

Create concise, well-labeled GitHub issues in the current repo using the predefined issue templates.

## Critical Rules

1. **Clarification gate:** If the user's description is vague or missing key details, STOP and use the **Ask User
   Questions** tool to ask for specifics before drafting. Never guess what the issue is about.
2. **Confirmation gate:** NEVER run `gh issue create` without showing the full draft to the user first and receiving
   explicit approval.
3. **Conciseness over completeness:** Each section in the issue body should be 2-4 sentences max. Only include sections
   the user provided content for. Prefer brevity over verbosity.

## Template Source Precedence

**Always prefer the repo's own issue templates over the skill's built-in ones.** Resolve the source in this order:

1. **Repo-native templates** -- if the repo ships issue templates (in `.github/ISSUE_TEMPLATE/`, a legacy
   `.github/ISSUE_TEMPLATE.md`, or the `docs/`/root variants), use those. Read
   [repo-templates.md](references/repo-templates.md) for how to detect, list, and parse them.
2. **Skill built-in templates** -- only when the repo has no native templates, fall back to the three definitions below.

Either way, blank issues (freeform) remain available -- no template file needed.

### Skill built-in templates

Three template definitions live in the `references/` folder. Read the relevant file for the chosen issue type to get
field definitions, required/optional markers, and an example body.

| Template        | Reference                                           |
| --------------- | --------------------------------------------------- |
| Bug Report      | [bug-report.md](references/bug-report.md)           |
| Feature Request | [feature-request.md](references/feature-request.md) |
| Tech Debt       | [tech-debt.md](references/tech-debt.md)             |

## Workflow

### Step 1: Detect Repo

```bash
gh repo view --json nameWithOwner -q '.nameWithOwner'
```

**If not inside a git repo or `gh` fails:** Inform the user and stop. **If `gh` is not authenticated:** Show error and
suggest `gh auth login`. Stop.

### Step 2: Detect Repo Issue Templates

Check whether the repo ships its own issue templates before doing anything else. Follow the detection commands in
[repo-templates.md](references/repo-templates.md).

- **Repo templates found:** set the template source to **repo**. The discovered template names become the options for
  the type picker in Step 3, and you will parse the matched template file (markdown or issue form) in Step 5.
- **No repo templates:** set the template source to **skill** and use the built-in templates.

### Step 3: Determine Issue Type / Template

If the user hasn't specified the type, use the **Ask User Questions** tool to pick one:

- **Source = repo:** offer the discovered template names (from their `name`/`about` fields), plus **Blank issue
  (freeform)** unless the repo's `config.yml` disables blank issues. If the user's intent clearly matches one template
  (e.g., "file a bug" -> the "Bug report" template), skip the picker and proceed.
- **Source = skill:** offer Bug Report, Feature Request, Tech Debt, Blank issue (freeform).

If the type is obvious from context, skip the picker and proceed.

### Step 4: Fetch Labels and Resolve Issue Type

Fetch labels dynamically:

```bash
gh label list --limit 100
```

**Labels:** Select the best-fit labels from the available list based on the issue type and content. No labels are
hardcoded -- always pick dynamically.

**Issue types:** This repo uses GitHub issue types. Resolve the type name as follows:

- **Source = repo:** infer the best-fit type from the template's intent and its frontmatter `labels` (e.g. a template
  named/labeled "bug" -> `Bug`, "feature"/"enhancement" -> `Feature`, otherwise -> `Task`).
- **Source = skill:** map the chosen template directly:

  | Template        | Issue type name |
  | --------------- | --------------- |
  | Bug Report      | Bug             |
  | Feature Request | Feature         |
  | Tech Debt       | Task            |

For a free-form/blank issue, pick the best-suited type (Bug, Feature, or Task).

> **Note:** `gh issue type list` and `gh issue create --type` are not valid CLI commands. Issue types must be set via
> the REST API after creation (see Step 9).

### Step 5: Gather Issue Details

**Clarification gate:** If the user has not clearly stated what the issue is about, use the **Ask User Questions** tool
to clarify before proceeding.

- **Source = repo:** read the matched template file and parse it per [repo-templates.md](references/repo-templates.md)
  (markdown frontmatter + body skeleton, or issue-form `body[]` fields). Gather content for each section/field, honoring
  the template's required markers. Carry over the template's frontmatter `title` seed, `labels`, and `assignees`.
- **Source = skill:** read the companion file for the chosen template type (see the built-in templates table above). Use
  its **Fields** table to determine what to gather and which fields are required vs optional. Only the first field in
  each template is required -- keep it lightweight.

For **blank issues**, gather a freeform title and body. Keep the body to 2-4 sentences.

### Step 6: Draft the Issue

- **Title:** A short description in imperative mood (e.g., `Fix pagination on user list`). No type prefix unless the repo
  template's `title` seed specifies one (then honor it).
- **Body:**
  - **Source = repo:** follow the matched template's structure -- keep its headings and ordering, drop HTML
    `<!-- comment -->` hints, and fill each section from what the user provided. Omit sections with no content.
  - **Source = skill:** format using markdown headers matching the template fields, following the **Example Body** in
    the companion file. Only include sections the user provided content for.
- **Labels:** Best-fit labels from the dynamically fetched list. For repo templates, start from the template's
  frontmatter `labels` and add best-fit labels on top.
- **Type:** The resolved issue type from Step 4 (if available).
- **Related:** If the user mentions related issues or PRs, include a `## Related` section with links at the end of the
  body.

### Step 7: Present Preview

Show the full draft using this template:

```
### Issue Preview
**Title:** <title>
**Type:** <issue type>
**Labels:** <label1>, <label2>
**Body:**
<full issue body>

<template name> (<repo template | skill template>) was used to generate this issue.
```

### Step 8: Await Approval

**Confirmation gate:** Wait for explicit user approval before creating. Use the **Ask User Questions** tool to ask the
user if they want to create the issue as-is, or if they want to make any changes.

### Step 9: Create and Report

**Create the issue**:

```bash
gh issue create --title "<title>" --body "<body>" --label "<label1>,<label2>"
```

**Set the issue type**. Extract the issue number from the returned URL, then set the type using the REST API with the
human-readable type name resolved in Step 4:

```bash
gh api -X PATCH repos/<owner>/<repo>/issues/<number> -f type="<issue_type_name>"
```

After creation, display the issue URL as a clickable markdown link:

`Created: [<repo>#<number> <title>](<url>)`

## Style Guide for Issues

- Title: imperative mood, no period at the end
- Body: problem-first framing. "X does not work when Y" or "Users need the ability to Z"
- No excessive reproduction steps. Keep it to the essentials
- Link to related PRs or issues if relevant context exists

## Anti-Patterns

- Do NOT create the issue on GitHub without explicit user approval
- Do NOT skip label assignment -- always check available labels and pick the best fit
- Do NOT write walls of text in the issue body
- Do NOT include solution proposals unless the user provides one or explicitly asks
- Do NOT hardcode labels -- always fetch dynamically from the repo
- Do NOT fall back to the skill's built-in templates when the repo has its own issue templates -- repo templates win
- Do NOT count `.github/ISSUE_TEMPLATE/config.yml` as a template -- it is configuration only
