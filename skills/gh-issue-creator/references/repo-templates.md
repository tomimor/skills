# Repo-Native Issue Templates

GitHub repos can ship their own issue templates. When present, they take precedence over the skill's
built-in templates (see SKILL.md "Template Source Precedence"). This file explains how to detect, list,
and parse them.

## Where templates live

GitHub looks for issue templates in three folders: the repo root, `.github/`, and `docs/`. In practice
almost all repos use `.github/`. There are three shapes:

| Shape                | Path                                       | Format                                  |
| -------------------- | ------------------------------------------ | --------------------------------------- |
| Multiple templates   | `.github/ISSUE_TEMPLATE/*.md`              | Markdown + YAML frontmatter             |
| Issue forms          | `.github/ISSUE_TEMPLATE/*.yml` / `*.yaml`  | Structured YAML form (`name`, `body[]`) |
| Legacy single        | `.github/ISSUE_TEMPLATE.md`                | Plain markdown (no chooser)             |

`.github/ISSUE_TEMPLATE/config.yml` is **configuration, not a template** -- it toggles blank issues and
adds contact links. Always exclude it from the template list.

## Detecting templates

Prefer reading from the local working tree (the skill has already confirmed it is inside a git repo).
Fall back to the GitHub API only if the local checkout has nothing (templates may live on the default
branch but not be checked out).

```bash
# 1) Local: list templates in the multi-template dir, excluding config
ls .github/ISSUE_TEMPLATE/ 2>/dev/null | grep -viE '^config\.ya?ml$'

# 2) Local: legacy single-file template
ls .github/ISSUE_TEMPLATE.md 2>/dev/null

# 3) Remote fallback (default branch), if local finds nothing
gh api "repos/<owner>/<repo>/contents/.github/ISSUE_TEMPLATE" \
  --jq '.[] | select(.name | test("^config\\.ya?ml$") | not) | .name' 2>/dev/null
```

If none of these return anything, the repo has **no native templates** -- fall back to the skill's
built-in templates.

## Reading a template's content

```bash
# Local
cat .github/ISSUE_TEMPLATE/<name>

# Remote fallback
gh api "repos/<owner>/<repo>/contents/.github/ISSUE_TEMPLATE/<name>" --jq '.content' | base64 -d
```

## Parsing markdown templates (`.md`)

A markdown template has YAML frontmatter followed by a body skeleton:

```markdown
---
name: Bug report
about: Report something that is broken
title: "[Bug]: "
labels: ["bug", "triage"]
assignees: octocat
---

## Describe the bug
<!-- A clear and concise description. -->

## Steps to reproduce
1.
2.
```

Extract from frontmatter:

- **`name` / `about`** -- the human-friendly label shown in the type picker.
- **`title`** -- use as the title prefix/seed if present (the user's title still wins).
- **`labels`** -- pre-select these, then add best-fit labels from the repo's label list on top.
- **`assignees`** -- pass through to `--assignee` if present.

Use the **body skeleton** (everything after the frontmatter) as the structure to fill in: keep its
headings and ordering, drop the HTML `<!-- comment -->` hints, and fill each section from what the user
provided. Omit sections the user has no content for.

## Parsing issue forms (`.yml` / `.yaml`)

Issue forms are structured. Render them to a markdown body since `gh issue create --body` takes markdown:

```yaml
name: Bug Report
description: File a bug report
title: "[Bug]: "
labels: ["bug"]
body:
  - type: textarea
    id: what-happened
    attributes:
      label: What happened?
      description: Also tell us what you expected
    validations:
      required: true
  - type: dropdown
    id: version
    attributes:
      label: Version
      options: ["1.0", "2.0"]
```

Map each `body[]` item to a markdown section using its `attributes.label` as an `##` heading. For
`input`/`textarea` fill free text; for `dropdown`/`checkboxes` pick from `options`. Respect
`validations.required` the same way the skill treats required fields. Skip `type: markdown` items (they
are display-only instructions).

## Mapping user intent to a repo template

When the repo has multiple templates, match the user's intent to the closest one by `name`/`about`
(e.g. "file a bug" -> the template whose name contains "bug"). If the intent is ambiguous, present the
discovered template names via the **Ask User Questions** tool and let the user choose. Always offer a
**Blank issue** option as well (unless the repo's `config.yml` sets `blank_issues_enabled: false`).
