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

Emit exactly this one line as a plain chat reply — no code block, no preamble,
no trailing prose. The user copies it straight from chat into Slack.

```
:greenpr: Ready for review: <PR_URL|PR_TITLE> cc REVIEWER
```

(The fenced block above is documentation. The real reply is the bare line.)

Rendered example:

> :greenpr: Ready for review: <https://github.com/acme/repo/pull/42|chore(repo): repo baseline (templates, protection, secret scan)> cc @alice

Filling the slots:

- `:greenpr:` — a custom Slack emoji. Keep it verbatim; do not substitute.
- `<PR_URL|PR_TITLE>` — Slack `mrkdwn` link syntax, NOT Markdown `[label](url)`.
  The title is the label, the URL is the target. If the title contains `|` or
  `>`, drop them from the label so the link doesn't break.
- `PR_TITLE` — the PR title verbatim (usually a conventional-commit subject like
  `chore(repo): ...`). Do not rewrite, shorten, or translate it.
- `REVIEWER` — `<@U012ABC>` if you have the Slack user ID, else `@handle`.
  Multiple: `cc @alice @bob`. If no reviewer was given, ask who to cc.

## Inputs

The skill argument is the **PR URL**. If it's missing, ask for it.

If the user didn't supply the title, fetch it from GitHub instead of guessing:
parse owner/repo/number from the URL and read the `title` field via the GitHub
MCP `pull_request_read` tool (load via `ToolSearch` if needed). If GitHub is
unavailable, ask the user to paste the title.
