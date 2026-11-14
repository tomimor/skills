---
type: regex
pattern: '^\s*Buenas!'
match: contains
target: last_message
weight: 1
---

Keeps his greeting, closing mark only, as the first words.
