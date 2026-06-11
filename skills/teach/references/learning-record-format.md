# Learning Record Format

Learning records live in `learning-records/` with sequential numbering:
`0001-slug.md`, `0002-slug.md`, etc. Create the directory lazily -- only when the
first record is written.

They are the teaching equivalent of architectural decision records: they capture
non-obvious lessons, key insights, and stated prior knowledge that steer future
sessions. They are used to calculate the zone of proximal development.

## Template

```md
# {Short title of what was learned or established}

{1-3 sentences: what was learned (or what prior knowledge was established), and
why it matters for future sessions.}
```

That is the whole format. A learning record can be a single paragraph. The value
is recording *that* this is now known and *why* it changes what to teach next --
not in filling out sections.

## Optional sections

Only include these when they add genuine value. Most records won't need them.

- **Status** frontmatter (`active | superseded by LR-NNNN`) -- useful when an
  earlier understanding turns out wrong and is replaced.
- **Evidence** -- how the user demonstrated understanding (a question answered,
  an exercise completed, prior experience cited). Useful if the claim might be
  revisited.
- **Implications** -- what this unlocks or rules out for future sessions. Worth
  recording when non-obvious.

## Numbering

Scan `learning-records/` for the highest existing number and increment by one.

## When to write a learning record

Write one when any of these is true:

1. **The user demonstrated genuine understanding of something non-trivial** --
   not just exposure, but evidence they can use the concept correctly. This sets
   a new floor for what to teach next.
2. **The user disclosed prior knowledge** -- "I already know X." Record it, and
   the depth claimed, so future sessions don't re-teach it.
3. **A misconception was corrected** -- the user previously believed something
   wrong and now sees why. High-value: these predict future stumbling blocks.
4. **The mission shifted in response to learning** -- the user discovered they
   cared about something different. Update `MISSION.md` and cross-link it.

### What does *not* qualify

- Material merely covered. Coverage is not learning -- wait for evidence.
- Anything already captured tersely in `GLOSSARY.md` as a term definition.
- Session-by-session activity logs. Learning records are decision-grade
  insights, not a journal.

## Supersession

When a later record contradicts an earlier one, mark the old record
`Status: superseded by LR-NNNN` rather than deleting it. The history of how
understanding evolved is itself useful signal.
