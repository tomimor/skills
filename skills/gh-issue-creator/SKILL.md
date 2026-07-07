---
name: gh-issue-creator
description: >-
  Create a GitHub issue in the current repo using one of the predefined issue templates (bug, feature, tech debt) or as
  a blank issue. Fetches available labels dynamically, maps user intent to the right template, and enforces concise
  problem descriptions. Use when the user mentions creating an issue, filing a bug, opening a ticket, or reporting a
  problem.
---

# GitHub Issue Creator

Create concise, well-labeled GitHub issues in the current repo using the predefined issue templates.

## Critical rules

1. **Clarification gate:** If the user's description is vague or missing key details, STOP and use the
   **AskUserQuestion** tool to ask for specifics before drafting. Never guess what the issue is about.
2. **Confirmation gate:** NEVER run `gh issue create` without showing the full draft to the user first and receiving
   explicit approval.
3. **Conciseness over completeness:** Each section in the issue body should be 2-4 sentences max. Only include sections
   the user provided content for. Prefer brevity over verbosity.

## Issue Templates

Three template definitions live in the `references/` folder. Read the relevant file for the chosen issue type to get
field definitions, required/optional markers, and an example body.

| Template        | Reference                                           |
| --------------- | --------------------------------------------------- |
| Bug Report      | [bug-report.md](references/bug-report.md)           |
| Feature Request | [feature-request.md](references/feature-request.md) |
| Tech Debt       | [tech-debt.md](references/tech-debt.md)             |

Blank issues (freeform) are also supported -- no template file needed.

## Workflow

### Step 1: Detect Repo

```bash
gh repo view --json nameWithOwner -q '.nameWithOwner'
```

**If not inside a git repo or `gh` fails:** Inform the user and stop. **If `gh` is not authenticated:** Show error and
suggest `gh auth login`. Stop.

### Step 2: Determine Issue Type

If the user hasn't specified the type, use the **AskUserQuestion** tool with these options:

- Bug Report
- Feature Request
- Tech Debt
- Blank issue (freeform)

If the type is obvious from context (e.g., "file a bug for..."), skip the picker and proceed.

### Step 3: Fetch Labels and Resolve Issue Type

Fetch labels dynamically:

```bash
gh label list --limit 100
```

**Labels:** Select the best-fit labels from the available list based on the issue type and content. No labels are
hardcoded -- always pick dynamically.

**Issue types:** GitHub issue types are an org-level feature that may not be enabled
for the repo. When they are, map the chosen template to a type name:

| Template        | Issue type name |
| --------------- | --------------- |
| Bug Report      | Bug             |
| Feature Request | Feature         |
| Tech Debt       | Task            |

If free form issue, define the best suited type from the issue types (Bug, Feature or Task).

> **Note:** `gh issue type list` and `gh issue create --type` are not valid CLI commands. Issue types must be set via
> the REST API after creation (see Step 8).

### Step 4: Gather Issue Details

**Clarification gate:** If the user has not clearly stated what the issue is about, use the **AskUserQuestion** tool
to clarify before proceeding.

Read the companion file for the chosen template type (see Issue Templates table above). Use the **Fields** table in that
file to determine what to gather and which fields are required vs optional. Only the first field in each template is
required -- keep it lightweight.

For **blank issues**, gather a freeform title and body. Keep the body to 2-4 sentences.

### Step 5: Draft the Issue

- **Title:** A short description in imperative mood (e.g., `Fix pagination on user list`). No type prefix.
- **Body:** Format using markdown headers matching the template fields. Only include sections the user provided content
  for. Follow the **Example Body** in the companion file for the correct structure.
- **Labels:** Best-fit labels from the dynamically fetched list.
- **Type:** The matched issue type from the fetch step (if available).
- **Related:** If the user mentions related issues or PRs, include a `## Related` section with links at the end of the
  body.

### Step 6: Present Preview

Show the full draft using this template:

```
### Issue Preview
**Title:** <title>
**Type:** <issue type>
**Labels:** <label1>, <label2>
**Body:**
<full issue body>

<template name> was used to generate this issue.
```

### Step 7: Await Approval

**Confirmation gate:** Wait for explicit user approval before creating. Use the **AskUserQuestion** tool to ask the
user if they want to create the issue as-is, or if they want to make any changes.

### Step 8: Create and Report

**Create the issue**:

```bash
gh issue create --title "<title>" --body "<body>" --label "<label1>,<label2>"
```

**Set the issue type**. Extract the issue number from the returned URL, then set the type using the REST API with the
human-readable type name from the Step 3 table:

```bash
gh api -X PATCH repos/<owner>/<repo>/issues/<number> -f type="<issue_type_name>"
```

If this call fails because issue types aren't enabled for the repo/org, skip it
silently — the labels already classify the issue. Any other error, report it.

After creation, display the issue URL as a clickable markdown link:

`Created: [<repo>#<number> <title>](<url>)`

## Style Guide for Issues

- Title: imperative mood, no period at the end
- Body: problem-first framing. "X does not work when Y" or "Users need the ability to Z"
- No excessive reproduction steps. Keep it to the essentials
- Link to related PRs or issues if relevant context exists

## Anti-patterns

- Do NOT skip label assignment -- always check available labels and pick the best fit
- Do NOT include solution proposals unless the user provides one or explicitly asks
