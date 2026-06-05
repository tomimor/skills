# Comment Style

How the comments should read so they sound like the user wrote them, not an
AI. Pair these rules with the `writing-voice` skill when in doubt.

## Voice

- **First person, low-key.** "I think this drops the `null` case" beats "This
  must handle null."
- **Questions when curious, statements when certain.** Don't dress up a known
  bug as a polite question -- that reads as passive-aggressive.
- **Specific.** Name the file, the line, and the concrete failure mode. "This
  breaks when `items` is empty -- `items[0]` throws" beats "edge case here."
- **One concern per comment.** If you have three things to say about the same
  function, that's three comments (or one Slack message).
- **Short.** 1-3 sentences is usually right. If it's longer, it's probably two
  comments or a real architectural discussion that doesn't belong inline.

## Banned Phrases

These are AI tells. Strip them.

- "Let's..." (we're not pairing on this)
- "I noticed that..." / "It looks like..." (just say the thing)
- "This is a great change, however..." (praise sandwich)
- "It might be worth considering whether we could possibly..."
- "Just a thought:" / "Just a small nit:" (if it's just a thought, drop it)
- "Per best practices..." / "It's generally recommended..." (cite a concrete
  reason instead)
- "Going forward..." / "Moving forward..."
- "Overall, this looks good!" (this is a comment, not a review summary)

## Format

- Plain prose. No bullet lists inside a single comment.
- Inline code with backticks for identifiers and short snippets.
- Fenced code blocks only when showing 2+ lines of suggested replacement.
- No headings inside the comment body. The `### path:Lxx` header in the
  output template is the only heading.

## Calibration

Read the comment back aloud. If it sounds like a Slack message you'd send a
teammate you respect, ship it. If it sounds like a press release or a Jira
ticket, rewrite it.
