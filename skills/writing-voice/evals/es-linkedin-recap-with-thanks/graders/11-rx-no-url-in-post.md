---
type: regex
pattern: 'https?://[\s\S]*\n-{3}'
match: not_contains
target: last_message
weight: 1
---

No URL in the post itself.
