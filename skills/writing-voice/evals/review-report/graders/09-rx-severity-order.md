---
type: regex
pattern: 'Must fix[\s\S]*Should fix|Hay que corregir[\s\S]*Conviene'
match: contains
target: last_message
weight: 1
---

Findings are grouped by severity, most severe first.
