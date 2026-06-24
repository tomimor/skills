---
name: pr-ready-message
description: >-
  Generate a one-line, Slack-ready "Ready for review" message for a single pull
  request, where the PR's title is rendered as a Slack link to the PR and a
  reviewer is cc'd. Use when the user wants to announce a PR is ready for
  review, asks for a Slack message for a PR, a "ready for review" ping, a
  greenpr message, or pastes a PR link and asks for a review shout-out.
---

# PR Ready-for-Review Message

Turn a pull request into a single, copy-paste Slack line announcing it is ready
for review. The PR title becomes the clickable link to the PR.

## Output format

The message is always this exact one-line shape:

```
:greenpr: Ready for review: <PR_URL|PR_TITLE> cc REVIEWER
```

Rendered example (what the user pastes into Slack):

> :greenpr: Ready for review: <https://github.com/acme/repo/pull/42|chore(repo): repo baseline (templates, protection, secret scan)> cc @alice

- `:greenpr:` is a literal custom Slack emoji — keep it verbatim, do not swap it
  for `:large_green_circle:` or anything else.
- `<PR_URL|PR_TITLE>` is Slack `mrkdwn` link syntax: the PR title is the visible
  label, the URL is the target. Never paste the raw URL inline.
- `PR_TITLE` is the PR's title verbatim (typically a conventional-commit subject
  like `chore(repo): ...`). Do not rewrite, shorten, or re-case it.
- `cc REVIEWER` tags the reviewer. Use `<@U012ABC>` if you have the Slack user
  ID, otherwise `@handle` as plain text. Multiple reviewers: `cc @alice @bob`.

## Critical rules

1. **One line only.** The deliverable is a single chat line. No title, no
   preamble, no trailing explanation, no fenced code block.
2. **Plain chat reply.** Emit the message as the bare reply with the Slack
   tokens (`:greenpr:`, `<url|label>`, `@handle`) as literal text so the user
   copies it straight from chat into Slack. Never write it to a file.
3. **Slack mrkdwn, not Markdown.** Links are `<url|label>`, NOT `[label](url)`.
4. **Title verbatim.** The link label is the PR title exactly as it is on
   GitHub. If the user supplies a title, trust it; otherwise fetch it.
5. **Don't invent the reviewer.** If no reviewer is given, ask once (or leave a
   clear `@reviewer` placeholder if the user says to).

## Workflow

### Step 1 — Collect inputs

You need three things:

| Input | Source |
|-------|--------|
| **PR URL** | The skill argument. If missing, ask for the PR link. |
| **PR title** | User-provided, or fetch from the PR (see Step 2). |
| **Reviewer** | User-provided. If missing, ask who to cc. |

### Step 2 — Fetch the title if not provided

If the user gave a PR URL but no title, get the title from GitHub rather than
guessing. Use the GitHub MCP `pull_request_read` tool (load via `ToolSearch` if
needed) with the owner/repo/number parsed from the URL, and read the PR `title`
field. If GitHub is unavailable, ask the user to paste the title.

### Step 3 — Emit the line

Fill the format and emit it as the bare chat reply:

```
:greenpr: Ready for review: <PR_URL|PR_TITLE> cc REVIEWER
```

No "Here is your message:" prose. No code block. Just the line.

### Step 4 — Iterate if asked

If the user wants a change (different reviewer, different emoji, extra
reviewer), re-emit the full single line with the change applied — still as plain
chat text, no code block.

## Anti-patterns

- Do NOT use `[title](url)` — Slack renders it literally. Use `<url|label>`.
- Do NOT paste the raw PR URL inline instead of linking the title.
- Do NOT rewrite, translate, or shorten the PR title.
- Do NOT wrap the message in a code block, backticks, or quotes.
- Do NOT add a second line, a summary, or "let me know if you'd like changes."
- Do NOT replace `:greenpr:` with a different emoji.
- Do NOT fabricate a reviewer handle — ask if you don't have one.
