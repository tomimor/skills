---
type: regex
pattern: '(Best,|Best regards|Regards,|Thanks,\s*\n|:wave:|👋)[\s\S]*\n-{3}'
match: not_contains
target: last_message
weight: 1
---

A Slack nudge has no sign-off block and no emoji.
