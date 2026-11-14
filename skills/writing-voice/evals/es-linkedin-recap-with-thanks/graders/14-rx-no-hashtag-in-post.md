---
type: regex
pattern: '#[A-Za-z][\s\S]*\n-{3}'
match: not_contains
target: last_message
weight: 1
---

No hashtag in the post itself.
