---
type: regex
pattern: '^\s*(Hola|Buenas|Hi |Hello|Queridos|¿|¡)'
match: not_contains
target: last_message
weight: 1
---

The post does not open with a greeting or a question.
