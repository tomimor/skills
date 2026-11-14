---
type: regex
pattern: '(nos enorgullece|estamos emocionados|y mucho más|seguimos mejorando)[\s\S]*\n-{3}'
flags: i
match: not_contains
target: last_message
weight: 1
---

None of his banned filler phrases in the email itself.
