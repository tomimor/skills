---
type: regex
pattern: '^\s*(Hola Julieta|Buenas Julieta|Julieta,)'
match: contains
target: last_message
weight: 1
---

The reply starts with the email itself, no preamble.
