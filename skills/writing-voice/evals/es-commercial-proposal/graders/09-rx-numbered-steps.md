---
type: regex
pattern: '(^|\n)\s*1\.\s[\s\S]*\n\s*2\.\s'
match: contains
target: last_message
weight: 1
---

The next steps are a numbered list.
