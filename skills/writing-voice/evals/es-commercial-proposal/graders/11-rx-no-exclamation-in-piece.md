---
type: regex
pattern: '![\s\S]*\n-{3}'
match: not_contains
target: last_message
weight: 1
---

No exclamation mark in the proposal itself.
