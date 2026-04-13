# Bug Report Template

## Fields

| Field                        | Input                  | Required | Description                            |
| ---------------------------- | ---------------------- | -------- | -------------------------------------- |
| Description                  | free text              | yes      | What happened and what was expected    |
| Steps to reproduce           | free text              | no       | How to reproduce the issue             |
| Environment                  | select from list       | no       | Where the bug was observed             |
| Affected component           | select from list       | no       | Which part of the system is affected   |
| Relevant logs or screenshots | free text (code block) | no       | Paste log output or attach screenshots |

### Environment options

- Local dev
- Testnet
- Mainnet
- Client env

## Title Examples

- Fix pagination on user list
- User list returns 500 for high limit values
- Session redirect fails when token is expired

## Example Body

Use this markdown structure when drafting bug report issues. Only include sections the user provided content for.

````markdown
## Description

The user list endpoint returns a 500 error when the `limit` query parameter exceeds 100. Expected: a 400 validation
error with a descriptive message.

## Steps to reproduce

1. Call `GET /api/users?limit=200`
2. Observe the 500 response

## Affected component

Permissions API

## Relevant logs or screenshots

```shell
ERROR: relation "users" does not exist at character 15
```
````
