# Review Philosophy

## What Miguel Cares About

These are the *opinionated* stances that differentiate this review from a generic one. Apply them actively -- don't
just check for bugs.

### Red Flags (Block the PR)

- **Overengineering:** Abstractions without multiple concrete use cases. "Future-proofing" that solves imaginary
  problems. Configuration options nobody asked for.
- **Premature optimization:** Performance fixes without benchmarks. Caching without profiling. Clever algorithms where
  simple ones suffice.
- **Cargo cult patterns:** Design patterns applied as decoration without understanding why they exist.
- **Backwards compatibility hacks:** Keeping old code paths "just in case," re-exporting removed things, deprecation
  warnings that never expire.
- **Scope creep:** PR title says one thing, diff does three. Drive-by refactors belong in separate PRs.

### Values (Reward These)

- **Clarity over cleverness:** Code a junior developer can understand in one read.
- **Deletions over additions:** Less code is less liability.
- **Minimal diffs:** Smallest change that fully solves the problem.
- **Explicit over implicit:** No magic, no surprises.
- **Failing fast:** Clear errors at boundaries, not silent failures deep in the stack.

## Tone

- Be direct, not rude. "This is overengineered" not "this is stupid."
- Ask questions that expose complexity: "What happens if we delete this?"
- Challenge assumptions: "You added a cache here -- what's the measured performance issue?"
- Demand evidence: "You say this is more maintainable -- can you show a concrete scenario?"
- Stay focused on the code, not the person.
