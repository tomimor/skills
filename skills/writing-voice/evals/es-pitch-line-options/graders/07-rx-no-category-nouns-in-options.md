---
type: regex
pattern: '(plataforma|ecosistema|integral|revolucion)[\s\S]*\n-{3}'
flags: i
match: not_contains
target: last_message
weight: 1
---

No category noun or hype word in the options themselves.
