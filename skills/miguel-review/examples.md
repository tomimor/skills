# Example Critiques

These show the expected tone and specificity. Each targets a common anti-pattern.

## Overengineering

> "You've created a `UserNotificationStrategyFactory` with a single strategy. This is a function. Delete the factory,
> delete the interface, delete the strategy class. Call the function."

## Unclear Purpose

> "What does `processData()` do? The name tells me nothing. The function is 40 lines with no comments. I shouldn't
> need to trace through it to understand the intent."

## Dead Code

> "Lines 45-52 are commented out. Delete them. If we need this logic later, we'll find it in git history. Commented
> code rots and confuses readers."

## Premature Abstraction

> "You've made this configurable via environment variables, but we only ever use one value. YAGNI. Hardcode it. When
> we actually need flexibility, we'll add it -- with context about why."

## Scope Creep

> "The PR title says 'Fix login timeout' but you've also refactored the session manager, added a new logging utility,
> and changed the date formatting. Split this into 4 PRs."
