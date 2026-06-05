# Filter Rules

The senior-level bar for what makes it into the output. When in doubt, drop it.

## Drop (do not post)

- **Lint/format catches.** Spacing, quote style, trailing commas, import order,
  unused-variable warnings. Example: "Use single quotes here." -> drop.
- **Naming bikeshedding without a correctness implication.** Example: "Rename
  `data` to `userRecords`." -> drop unless the name is actively misleading.
- **"Consider..." / "It might be nicer to..." / "Optional:..."** If the
  suggestion is optional by your own admission, it's not worth the reviewer's
  time. Drop.
- **Premature optimization.** "This could be O(n) instead of O(n*m)." -> drop
  unless there's a real, measured performance problem on the hot path.
- **Speculative abstractions.** "What if we need to support another provider
  later?" -> drop. YAGNI. Flag when it actually happens.
- **Personal preference refactors.** Functional vs OO, early-return vs nested,
  one-liner vs expanded. Drop.
- **Comments that restate the code.** "This function gets the user." -> drop.
- **Doc/comment requests on small, self-explanatory changes.** Drop.
- **Praise comments.** "Nice work!" / "Clean implementation." -> drop. Use a
  reaction in the PR UI instead.
- **Already-raised concerns.** If the same point exists in the fetched
  comments, drop the duplicate.

## Keep (worth a comment)

- **Correctness bugs.** Off-by-one, inverted conditions, wrong operator, wrong
  return type, wrong default, swapped arguments.
- **Data integrity.** Missing null/undefined checks on external input, unsafe
  type coercions that lose information, unhandled promise rejections, mutation
  of shared state without locking.
- **Security and privacy.** Auth bypass, broken RBAC, secrets in code or logs,
  PII leakage, missing input sanitization on a real injection vector.
- **Missed edge cases the diff clearly creates.** Empty array, empty string,
  zero, negative number, very large input, concurrent caller, retry storm.
- **Hallucinated references.** Functions, types, endpoints, env vars,
  selectors, or routes that don't exist in the codebase or its known
  dependencies.
- **Dead code introduced by this PR.** Commented-out blocks, unreachable
  branches, unused new exports, single-value feature flags. (Pre-existing dead
  code is not in scope for this review.)
- **Genuine readability cliffs.** A function nobody on the team will be able
  to follow in six months -- not because of style, because of structure.
- **Scope creep that should be a separate PR.** The diff does three unrelated
  things and the title only describes one.

## The Hill Test

Before keeping any comment, ask: "If the author pushes back once -- 'I don't
think that's a real problem' -- would I still hold the line?"

- If yes: keep the comment. Make sure it's specific enough that the pushback
  has to address the actual concern, not a vague version of it.
- If no: drop it. A comment you'd abandon at the first sign of resistance is
  noise for the author and erodes the signal of your future comments.

## Tie-Breaker

If a finding sits exactly on the line between Drop and Keep, drop it. The cost
of a missed comment is low (the author or another reviewer catches it later, or
production does). The cost of a noisy comment is permanent: it trains the
author to skim or dismiss your reviews.
