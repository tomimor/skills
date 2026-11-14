---
type: regex
pattern: '(Estimad|Hola |Buenas|Saludos,|Quedo atento|Quedo a disposici)[\s\S]*\n-{3}'
flags: i
match: not_contains
target: last_message
weight: 1
---

The document has no greeting and no sign-off.
