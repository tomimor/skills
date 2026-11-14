---
type: regex
pattern: '(retenciones[^\n]*2 meses|2 meses[^\n]*retenciones)[\s\S]*\n-{3}'
flags: i
match: contains
target: last_message
weight: 1
---

The proposal states the commitment to add the retentions module within 2 months of signing.
