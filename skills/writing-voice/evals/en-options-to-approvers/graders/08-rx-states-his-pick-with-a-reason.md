---
type: regex
pattern: '(recommend|I.d go with|I would go with|my pick)[^\n]*because'
flags: i
match: contains
target: last_message
weight: 1
---

The message states his pick and the reason in one line, in his words or as a recommendation.
