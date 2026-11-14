---
type: regex
pattern: '^[\s\S]{0,400}(yours|your own|of your own|tuy[oa]|propi[oa])'
flags: i
match: contains
target: last_message
weight: 1
---

The first lines say that nothing in the draft is his.
