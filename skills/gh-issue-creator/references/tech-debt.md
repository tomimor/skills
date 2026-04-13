# Tech Debt Template

## Fields

| Field                | Input            | Required | Description                                          |
| -------------------- | ---------------- | -------- | ---------------------------------------------------- |
| What needs improving | free text        | yes      | Describe the current state and why it is problematic |
| Affected component   | select from list | no       | Which part of the system is affected                 |
| Proposed approach    | free text        | no       | High-level direction for addressing this             |

## Title Examples

- Consolidate duplicated RBAC checks in route handlers
- Migrate permission logic to shared access-control package
- Remove deprecated v1 auth endpoints

## Example Body

Use this markdown structure when drafting tech debt issues. Only include sections the user provided content for.

```markdown
## What needs improving

The permission check logic is duplicated across 12 route handlers in `apps/permissions-api/src/routes/`. Each handler
implements its own RBAC validation instead of using the shared `@repo/access-control` package. This makes policy changes
error-prone and increases the surface area for authorization bugs.

## Affected component

Permissions API

## Proposed approach

Migrate all route handlers to use the `permix` middleware from `@repo/access-control`. Start with the tenant management
routes as a pilot, then roll out to the remaining handlers.
```
