---
name: google-style
description: >-
  Write and review technical documentation against the Google developer
  documentation style guide (developers.google.com/style): second person,
  active voice, present tense, sentence-case headings, timeless wording,
  inclusive and accessible language, and Google's word list. Use when writing
  or editing READMEs, API reference, tutorials, quickstarts, how-to guides,
  release notes, error messages, CLI help text, or doc comments, and when the
  user asks to apply Google style, run a docs style review, or make docs
  consistent.
---

# Google Developer Documentation Style

A distillation of the [Google developer documentation style guide](https://developers.google.com/style) for drafting and reviewing developer-facing docs.

**Use this for developer documentation.** For blog posts, landing pages, social copy, or anything with a marketing voice, use `writing-voice` instead — the two have deliberately different goals. If a repo has its own style guide, that wins; this guide fills the gaps, and third-party references (Merriam-Webster, Chicago Manual of Style) settle whatever neither covers.

## The rules that matter most

Applied in every mode, in this order of importance:

1. **Second person.** Address the reader as "you." Use "we" only for a recommendation from the product team ("We recommend that you use..."). Never "I."
2. **Active voice.** Name the actor. "The server sends a response," not "A response is sent."
3. **Present tense.** "The call returns a token," not "will return."
4. **Condition before instruction.** "To view the logs, click **Logs**." Not "Click **Logs** to view the logs." The reader needs to know whether a step applies before they do it.
5. **Sentence case everywhere.** Headings, titles, table headers, list items, UI labels: "Get started," not "Get Started."
6. **Timeless wording.** No "currently," "new," "recently," "soon," "will soon support." No pre-announcements of unreleased features.
7. **Serial comma.** "Compute, storage, and networking."
8. **Standard American spelling and punctuation.** No slang, idioms, humor, metaphors, or cultural references — the audience is global and much of it is translated.
9. **Inclusive and accessible.** No ableist, gendered, or violent language; no directional-only or color-only instructions; alt text on every meaningful image. See [references/grammar-and-mechanics.md](references/grammar-and-mechanics.md).
10. **Descriptive link text.** "See [Set up authentication]," never "click here," "this link," or a bare URL.

## Words to cut on sight

| Don't | Use instead | Why |
|-------|-------------|-----|
| simply, just, easy, easily, obviously, of course, clearly, trivial | (delete) | Tells the reader they're dumb if it isn't |
| please | (delete) | Not a favor; it's documentation |
| e.g., i.e., etc., via | for example, that is, and so on, with/by | Latin trips up translation and screen readers |
| in order to, utilize, leverage (verb) | to, use | Padding |
| allows you to | lets you | |
| note that, it should be noted | (delete, or use a `Note:` callout) | |
| we will, this section will discuss | (delete the pre-announcement) | |
| whitelist / blacklist | allowlist / denylist, or rewrite | Non-inclusive |
| master / slave | primary / replica, main | Non-inclusive |
| sanity check | confidence check, quick check | Ableist |
| dummy value | placeholder, sample value | |
| grandfathered | legacy, exempted | |
| abort, kill, hit (a key) | stop, cancel, end, press | Violent connotation |
| he/she, his/her, guys | they, their, everyone | Gendered |
| above / below | preceding / following, or a link | Meaningless in reflowed and screen-read layouts |

The full list is in [references/word-list.md](references/word-list.md). When a term is marked "don't use," replace it or write around it — don't just add a disclaimer.

## Modes

### Writing

Draft directly in this style rather than writing loosely and cleaning up after. Before finishing, run the fast scan below.

### Reviewing

When asked to review docs, or when the user points at a file, PR, or directory:

1. **Read the whole document first.** Structural problems (wrong audience, missing prerequisites, buried task) outrank comma placement, and fixing them often deletes the smaller findings.
2. **Run the fast scan** for mechanical violations.
3. **Report findings in a table**, most severe first:

   | Severity | Meaning |
   |----------|---------|
   | **Must fix** | Non-inclusive language, inaccessible content, wrong or misleading instruction, pre-announced feature |
   | **Should fix** | Passive voice, first/third person, future tense, title case, Latin abbreviations, "click here" links, banned words |
   | **Nice to have** | Word list preferences, hyphenation, number formatting, list punctuation |

   Each finding gets: the location (`file:line`), the offending text quoted, and a concrete rewrite. No finding without a rewrite.
4. **Offer the rewrite.** If the user asked for a review, stop at the report. If they asked to fix the docs, apply the edits and summarize what changed.

Don't report the same rule twenty times. Cite the first two or three instances, then say "12 more instances of passive voice — fixed in the diff" or "…listed below," and move on.

### Fast scan

Mechanical violations, cheapest first. Adjust the glob to the docs in question.

```bash
# Banned words and phrases
grep -rniE '\b(simply|just |easy|easily|obviously|of course|please |in order to|utilize|e\.g\.|i\.e\.|etc\.|note that|allows you to|whitelist|blacklist|master/slave|sanity check|dummy|grandfathered|abort|kill the|hit the|he/she|his/her|guys|and/or)\b' --include='*.md' .

# Timeless-wording violations and pre-announcements
grep -rniE '\b(currently|at this time|recently|soon|in the future|new feature|will be (available|supported)|coming soon)\b' --include='*.md' .

# Non-descriptive links
grep -rniE '\[(click here|here|this link|read more|learn more|link)\]' --include='*.md' .

# Future tense
grep -rniE '\b(will|won'"'"'t|shall) [a-z]+\b' --include='*.md' .
```

Every hit needs a human read — `will` inside a quoted error string or `just` meaning "only a moment ago" are fine. The scan finds candidates, it doesn't make the call.

## Formatting quick reference

| Element | Treatment |
|---------|-----------|
| UI element names | **Bold**: click **Save** |
| Menu paths | **File** > **New** |
| Code items, filenames, paths, HTTP methods, values | `Code font` |
| Placeholders | `UPPERCASE_WITH_UNDERSCORES`, each one defined right after the sample |
| New terms on first use | *Italics*, then defined |
| Emphasis | *Italics*, sparingly. Never ALL CAPS, never underline |
| Lists | Introduce with a sentence ending in a colon; numbered for sequences, bulleted otherwise |
| Headings | Sentence case, task-based ("Create a bucket"), parallel with their siblings |

Full details — code samples, procedures, notices, tables, images, and links — are in [references/formatting.md](references/formatting.md).

Use the reserved examples: `example.com` for domains, `192.0.2.0/24` for IP addresses, `555-0100`-style phone numbers, and fictional (and varied) personal names.

## References

- [references/word-list.md](references/word-list.md) — Google's word list: banned terms, preferred spellings, commonly confused pairs.
- [references/formatting.md](references/formatting.md) — text formatting, code samples, procedures, lists, tables, links, notices, images.
- [references/grammar-and-mechanics.md](references/grammar-and-mechanics.md) — punctuation, capitalization, numbers and dates, abbreviations, sentence structure, global audience, inclusive and accessible writing.

These are a working distillation, not a replacement. For anything ambiguous or unlisted, check the canonical guide:
[Highlights](https://developers.google.com/style/highlights) ·
[Voice and tone](https://developers.google.com/style/tone) ·
[Word list](https://developers.google.com/style/word-list) ·
[Text-formatting summary](https://developers.google.com/style/text-formatting) ·
[Inclusive documentation](https://developers.google.com/style/inclusive-documentation) ·
[Accessibility](https://developers.google.com/style/accessibility)
