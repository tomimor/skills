---
type: regex
pattern: '(hashtag|emoji|Agree\?)'
flags: i
match: contains
target: last_message
weight: 1
---

The review flags at least one of: the hashtags, the emoji bullets, the 'Agree?' ending.
