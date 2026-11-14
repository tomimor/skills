---
type: regex
pattern: '^[^\n]*(charla|meetup|stablecoins)'
flags: i
match: contains
target: last_message
weight: 1
---

The first line is about the talk.
