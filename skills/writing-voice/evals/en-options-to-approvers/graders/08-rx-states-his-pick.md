---
type: regex
pattern: '(recommend|I.d go with|I would go with|my pick)'
flags: i
match: contains
target: last_message
weight: 1
---

The message states his pick, in his words or as a recommendation. The reason is checked by the judge.
