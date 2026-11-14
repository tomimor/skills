---
type: regex
pattern: 'Propuesta econ[oó]mica[\s\S]*Condiciones comerciales'
flags: i
match: contains
target: last_message
weight: 1
---

The economic proposal and the commercial conditions each have a section, in that order.
