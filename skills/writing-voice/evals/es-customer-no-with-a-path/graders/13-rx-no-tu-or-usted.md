---
type: regex
pattern: '(\btú\b|\busted\b|\bpuedes\b|\bquieres\b|\btienes\b|\bdescubre\b|[Ss]úmate|[Oo]lvídate)[\s\S]*\n-{3}'
match: not_contains
target: last_message
weight: 1
---

No tu or usted forms in the email: it is voseo.
