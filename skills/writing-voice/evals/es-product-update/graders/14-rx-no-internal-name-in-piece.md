---
type: regex
pattern: 'useClientes[\s\S]*\n-{3}'
match: not_contains
target: last_message
weight: 1
---

The internal hook name does not appear in the email itself.
