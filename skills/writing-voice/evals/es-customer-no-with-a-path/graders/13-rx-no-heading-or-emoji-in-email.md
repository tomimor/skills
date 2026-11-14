---
type: regex
pattern: '(^|\n)#{1,6} [\s\S]*\n-{3}'
match: not_contains
target: last_message
weight: 1
---

No Markdown heading in the email itself.
