---
type: regex
pattern: '(plataforma integral|soluci[oó]n integral|revolucion|potente|de vanguardia|ecosistema)[\s\S]*\n-{3}'
flags: i
match: not_contains
target: last_message
weight: 1
---

No category noun or hype word in the proposal itself.
