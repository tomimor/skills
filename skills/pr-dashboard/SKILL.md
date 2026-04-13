---
name: pr-dashboard
description: Review open PRs authored by the user for a given repo, showing title, status, review state, open comments, CI checks, and recommended next steps. Use when the user mentions PR review, my PRs, open PRs, PR status, PR dashboard, or wants an overview of their pull requests.
---

# PR Review Dashboard

Generate a status overview of the user's open PRs for a given repository.

## Resolve the Repository

The user provides a shorthand name (e.g., "my-app", "api-server"). Resolve it to `owner/repo`:

1. Run: `gh repo list --json nameWithOwner --limit 200 -q '.[].nameWithOwner'` and filter for a repo name containing the shorthand.
2. If multiple matches, pick the closest match or ask the user.
3. If the user provides `owner/repo` directly, use it as-is.

## Fetch PR Data

```bash
gh pr list --repo OWNER/REPO --author @me --state open \
  --json number,title,url,isDraft,reviewDecision,updatedAt,additions,deletions,labels,headRefName
```

If no PRs are found, report that and stop.

For **each PR**, fetch detailed review and check info:

```bash
gh pr view NUMBER --repo OWNER/REPO \
  --json reviewDecision,reviews,comments,statusCheckRollup,mergeable,mergeStateStatus
```

## Build the Report

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

## Output Format

```
## PR Dashboard: {owner/repo}

### 1. {title}
- **PR**: [#{number}]({url}) | **Branch**: `{branch}`
- **Size**: +{additions} / -{deletions} | **Updated**: {relative_time}
- **Status**: {Draft/Ready} | **Reviews**: {review_summary} | **CI**: {ci_summary}
- **Open comments**: {count}
- **→ Next step**: {recommendation}

---
(repeat for each PR)

**Summary**: {total} open PRs — {approved} approved, {changes_requested} need changes, {awaiting} awaiting review, {draft} drafts
```

Sort PRs by priority: changes requested first, then awaiting review, then drafts, then approved.
