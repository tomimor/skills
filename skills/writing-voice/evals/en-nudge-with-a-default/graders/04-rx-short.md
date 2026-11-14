---
type: regex
pattern: '^[\s\S]{0,420}\n-{3}'
match: contains
target: last_message
weight: 1
---

The nudge is short: the notes start within the first 420 characters.
