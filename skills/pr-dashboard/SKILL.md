---
name: pr-dashboard
description: >-
  Review the user's open PRs for a repo in two modes: a full dashboard
  (title, status, review state, open comments, CI checks, recommended next
  step per PR) or a quick Slack-ready list split into "Ready for review"
  and "Drafts". Use when the user mentions my PRs, open PRs, PR status,
  PR dashboard, Slack PR list, share my PRs on Slack, PRs ready to review,
  or wants an overview of their pull requests.
---

# PR Dashboard

Status overview of the user's open PRs. Two output modes:

- **Dashboard** (default): full per-PR detail plus a copy-paste summary.
- **Quick list**: just the Slack-ready message — use when the user asks for a
  Slack list, a short message to ping reviewers, or "PRs ready to review".

For reviewing the *content* of a PR, this is the wrong skill — see the routing
table at the bottom.

## Resolve the Repository

1. If the user provides `owner/repo`, use it as-is.
2. If the user provides a shorthand name (e.g., "my-app"), run
   `gh repo list --json nameWithOwner --limit 200 -q '.[].nameWithOwner'` and filter
   for a repo containing the shorthand. If multiple match, ask the user.
3. Otherwise use the current directory's repo:
   `gh repo view --json nameWithOwner -q .nameWithOwner`. If that fails, tell the
   user the cwd is not a GitHub repo (or `gh` is not authenticated) and stop.

## Fetch PR Data

```bash
gh pr list --repo OWNER/REPO --author @me --state open \
  --json number,title,url,isDraft,reviewDecision,updatedAt,additions,deletions,labels,headRefName
```

If no PRs are found, report that (in the conversation language) and stop.

**Quick list mode stops fetching here.** For the full dashboard, also fetch detail
per PR:

```bash
gh pr view NUMBER --repo OWNER/REPO \
  --json reviewDecision,reviews,comments,statusCheckRollup,mergeable,mergeStateStatus
```

## Quick List Output

Render the message directly in the chat as markdown — **not** inside a fenced code
block. The user copies the rendered text into Slack, which accepts markdown-style
links `[title](url)`.

Exact format, sorted by `updatedAt` desc within each section:

- Header `Ready for review:` + blank line + one bullet per non-draft PR:
  `- :greenpr: [PR title](PR url)`
- Blank line.
- Header `Drafts:` + blank line + one bullet per draft PR:
  `- :draftpr: [PR title](PR url)`

The leading `- ` is required so the chat renders a proper bulleted list. Omit an
entire section if its group is empty. No numbering, no intro paragraph, no
commentary — the message is just the headers, blank lines, and bullets.

Example:

```
Ready for review:

- :greenpr: [fix: limit long name fields in admin panel tables](https://github.com/owner/repo/pull/123)
- :greenpr: [feat: group system permissions and cap badge cells](https://github.com/owner/repo/pull/125)

Drafts:

- :draftpr: [wip: experimental rate limiter](https://github.com/owner/repo/pull/126)
```

Quick list mode ends here.

## Status Icon (dashboard mode)

Assign each PR a single status icon, used in both the detail rows and the summary.
Pick the **first** matching rule, in priority order:

| Icon | Meaning | Condition |
|------|---------|-----------|
| 🔴 | CI failing | `statusCheckRollup` has any failing check |
| 🟠 | Changes requested | `reviewDecision` = CHANGES_REQUESTED |
| 📝 | Draft | `isDraft` = true |
| 🟡 | Awaiting review | review pending / no reviewers / CI still pending |
| 🟢 | Green — ready to merge | `reviewDecision` = APPROVED and all CI checks passing |

## Build the Report (dashboard mode)

For each PR, present a row with:

| Field | Source |
|-------|--------|
| **Title** | `title` |
| **PR** | `#number` as a markdown link to `url` |
| **Branch** | `headRefName` |
| **Size** | `+additions / -deletions` |
| **Draft?** | `isDraft` → "Draft" or "Ready" |
| **Reviews** | Summarize from `reviewDecision`: APPROVED → "Approved", CHANGES_REQUESTED → "Changes requested", REVIEW_REQUIRED → "Awaiting review", empty → "No reviewers" |
| **CI** | From `statusCheckRollup`: count pass/fail/pending. Show "All passing", "N failing", or "Pending" |
| **Comments** | Count of unresolved review comments from `comments` and `reviews` |
| **Updated** | Relative time from `updatedAt` |

## Recommended Next Step

Derive one recommended action per PR using this priority:

1. **CI failing** → "Fix failing checks"
2. **Changes requested** → "Address review feedback"
3. **Draft** → "Mark as ready for review when done"
4. **No reviewers** → "Request reviewers"
5. **Awaiting review** → "Waiting on reviewers — consider pinging if stale (>3 days)"
6. **Approved + CI passing** → "Ready to merge"
7. **Approved + CI pending** → "Wait for CI, then merge"

## Dashboard Output Format

```
## PR Dashboard: {owner/repo}

### {icon} 1. {title}
- **PR**: [#{number}]({url}) | **Branch**: `{branch}`
- **Size**: +{additions} / -{deletions} | **Updated**: {relative_time}
- **Status**: {Draft/Ready} | **Reviews**: {review_summary} | **CI**: {ci_summary}
- **Open comments**: {count}
- **→ Next step**: {recommendation}

---
(repeat for each PR)
```

Sort by urgency: 🔴 failing → 🟠 changes requested → 📝 draft → 🟡 awaiting review →
🟢 ready to merge.

After the detailed report, always end with a **copy-paste summary**: one line per
PR, status icon + linked title, same sort order, nothing else — tight enough to
drop straight into Slack.

```
**PR dashboard check — {owner/repo}**

{icon} [{title}]({url})
{icon} [{title}]({url})
```

## Adjacent skills

| Ask | Skill |
|---|---|
| Status overview of **my open PRs** | **pr-dashboard** (this skill) |
| Review **my working diff** (shape/simplicity) | miguel-review |
| Review a **teammate's PR** → paste-ready comments | review-pr |
| Heavyweight **verify** my PR (tests, assumptions) | verify-pr |
| **Respond to** reviewer comments on my PR | gh-pr-comment-assistant |
