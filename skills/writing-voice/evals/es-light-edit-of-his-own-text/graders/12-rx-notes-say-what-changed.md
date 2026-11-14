---
type: regex
pattern: '\n-{3}[\s\S]*(cambi|correg|pasó a|changed)'
flags: i
match: contains
target: last_message
weight: 1
---

After the piece, the notes say what changed.
