# Feature Request Template

## Fields

| Field                   | Input            | Required | Description                                      |
| ----------------------- | ---------------- | -------- | ------------------------------------------------ |
| Problem                 | free text        | yes      | What problem does this solve or why is it needed |
| Proposed solution       | free text        | no       | How the feature should work                      |
| Affected component      | select from list | no       | Which part of the system this would affect       |
| Alternatives considered | free text        | no       | Other solutions or workarounds considered        |

## Title Examples

- Add single API key revocation endpoint
- Support tenant-scoped rate limits
- Allow admin to export audit logs as CSV

## Example Body

Use this markdown structure when drafting feature request issues. Only include sections the user provided content for.

```markdown
## Problem

Tenant admins cannot revoke individual API keys without rotating the entire set. This forces unnecessary downtime for
other integrations sharing the same tenant.

## Proposed solution

Add a `DELETE /api/keys/:id` endpoint that revokes a single key by ID.

## Affected component

Permissions API, Admin Panel

## Alternatives considered

Considered adding an expiry field to keys, but that does not address immediate revocation needs.
```
