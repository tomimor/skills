---
type: regex
pattern: 'Must fix[\s\S]*97[\s\S]*Should fix|Hay que corregir[\s\S]*97[\s\S]*Conviene'
match: contains
target: last_message
weight: 1
---

The 97% statistic is flagged in the most severe group.
