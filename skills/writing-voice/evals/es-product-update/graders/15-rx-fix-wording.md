---
type: regex
pattern: 'Corregimos[\s\S]*CCMA|CCMA[\s\S]*(corregi|arregl)'
flags: i
match: contains
target: last_message
weight: 1
---

The fix is told from the reader's side and says it is fixed.
