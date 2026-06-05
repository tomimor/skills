---
name: gh-pr-list
description: >-
  Generate a short, copy-paste friendly Slack message listing the user's open
  PRs in the current repo, split into "Ready for review" (non-draft) and
  "Drafts" sections, each as bullets with custom emoji and markdown-style
  links. Use when the user mentions PRs ready to review, Slack PR list, share
  my PRs on Slack, or wants a short message to ping reviewers.
---

# GH PR List

Generate a Slack-ready message with the user's open PRs in the current repo,
split into two sections: ready-for-review (non-draft) and drafts.

## Resolve the current repo

Run from the user's cwd:

```bash
gh repo view --json nameWithOwner -q .nameWithOwner
```

If that fails, tell the user the cwd is not a GitHub repo (or `gh` is not
authenticated) and stop.

## Fetch PRs

```bash
gh pr list --repo OWNER/REPO --author @me --state open \
  --json number,title,url,isDraft,updatedAt
```

Split the result into two groups:

- **Ready**: `isDraft == false`
- **Drafts**: `isDraft == true`

If both groups are empty, report "No tienes PRs abiertos" and stop.

## Output

Render the message directly in the chat using markdown (not inside a fenced
code block — the user wants to see the rendered links and copy them to
Slack, which accepts markdown-style links `[title](url)`).

Exact format:

- Header `Ready for review:` + blank line + one bullet per ready PR:
  `- :greenpr: [PR title](PR url)`
- Blank line.
- Header `Drafts:` + blank line + one bullet per draft PR:
  `- :draftpr: [PR title](PR url)`

The leading `- ` is required so the chat renders it as a proper bulleted list
(without it, lines collapse into a single paragraph). Slack also accepts the
`- ` prefix as a bullet on paste.

Omit an entire section if its group is empty (do not print the header with
no bullets under it).

Example (both sections):

```
Ready for review:

- :greenpr: [fix: limit long name fields and truncate in admin panel tables](https://github.com/owner/repo/pull/123)
- :greenpr: [fix: enforce HTTPS-only validation on webhook destination URL](https://github.com/owner/repo/pull/124)
- :greenpr: [feat: group system permissions and cap badge cells](https://github.com/owner/repo/pull/125)

Drafts:

- :draftpr: [wip: experimental rate limiter](https://github.com/owner/repo/pull/126)
- :draftpr: [chore: bump deps](https://github.com/owner/repo/pull/127)
```

Sort each section by `updatedAt` desc (most recent first).

Do not add a numbered list, intro paragraph, or commentary. The message is
just the section headers, blank lines, and bullets.
