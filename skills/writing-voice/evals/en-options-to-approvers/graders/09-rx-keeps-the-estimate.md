---
type: regex
pattern: '4 weeks[\s\S]*\n-{3}'
flags: i
match: contains
target: last_message
weight: 1
---

The message keeps the 4-week estimate, in digits.
