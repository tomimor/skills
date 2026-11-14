---
type: regex
pattern: 'finds you well|do not hesitate|don.t hesitate|—'
flags: i
match: not_contains
target: last_message
weight: 1
---

No stock opener or closer, no em dash.
