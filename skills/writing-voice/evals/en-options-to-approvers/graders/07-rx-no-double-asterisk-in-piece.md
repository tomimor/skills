---
type: regex
pattern: '\*\*[\s\S]*\n-{3}'
match: not_contains
target: last_message
weight: 1
---

Slack bold is one asterisk on each side, so the message has no double asterisks.
