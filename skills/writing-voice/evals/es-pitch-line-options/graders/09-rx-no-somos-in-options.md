---
type: regex
pattern: '(^|\n)\s*(\d+\.\s*)?Somos [\s\S]*\n-{3}'
match: not_contains
target: last_message
weight: 1
---

No option starts with Somos.
