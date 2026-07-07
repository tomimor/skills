# Slack mrkdwn cheatsheet

Slack `mrkdwn` is similar to Markdown but with key differences. Use these
exact tokens in every draft:

| Need | Slack mrkdwn | NOT |
|------|--------------|-----|
| Bold | `*bold*` | `**bold**` |
| Italic | `_italic_` | `*italic*` |
| Strikethrough | `~strike~` | `~~strike~~` |
| Inline code | `` `code` `` | same as Markdown |
| Code block | ` ```...``` ` | same as Markdown |
| Link | `<https://x.com\|label>` | `[label](https://x.com)` |
| Bare link | `<https://x.com>` | `https://x.com` |
| Bullet | `• item` or `- item` | `* item` |
| Blockquote | `> text` | same as Markdown |
| Heading | not supported -- use `*Bold:*` | `# Heading` |
| Horizontal rule | not supported -- use a blank line | `---` |
| User mention | `<@U12345>` | `@username` |
| Channel mention | `<#C12345\|name>` | `#channel` |
| Emoji | `:white_check_mark:` | unicode also works |

The pipe `|` inside `<url|label>` must NOT be escaped when pasted into Slack;
the table above escapes it only because it conflicts with Markdown table
syntax.
