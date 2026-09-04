---
name: writing-google-style
description: >-
  Write and review developer documentation in Google style
  (developers.google.com/style): second person, active voice, present tense,
  sentence-case headings, timeless wording, inclusive and accessible language,
  and Google's word list. Use when drafting or editing READMEs, API reference,
  tutorials, quickstarts, how-to guides, release notes, error messages, CLI
  help text, or doc comments, and when asked to apply Google style, run a docs
  style review, or make documentation consistent.
---

# Writing in Google style

A working distillation of the [Google developer documentation style guide](https://developers.google.com/style) for drafting and reviewing developer-facing text.

**Scope.** Developer documentation and the prose embedded in developer tools. For blog posts, landing pages, or social copy, use `writing-voice` instead—that skill optimizes for personality, this one for a reader who is stuck and needs to get unstuck.

**Precedence.** The project's own style guide wins. This guide fills its gaps. Anything neither covers goes to Merriam-Webster and the Chicago Manual of Style. Never "correct" a project's established house term into Google's preference—flag the conflict instead.

## The rules that matter most

Ordered by how much damage getting them wrong does:

1. **Second person.** Address the reader as "you." Use "we" only for a recommendation from the product team ("We recommend that you enable versioning"). Never "I."
2. **Active voice.** Name the actor. "The server sends a response," not "A response is sent."
3. **Present tense.** "The call returns a token," not "will return."
4. **Condition before instruction.** "To view the logs, click **Logs**." Not "Click **Logs** to view the logs." The reader needs to know whether a step applies before they act on it.
5. **Sentence case everywhere.** Headings, titles, table headers, list items, UI labels: "Get started," not "Get Started."
6. **Timeless wording.** No "currently," "new," "recently," "soon." No pre-announcing unreleased features.
7. **Serial comma.** "Compute, storage, and networking."
8. **Standard American spelling, no idioms.** No slang, humor, metaphors, or cultural references—the audience is global and much of the text gets translated.
9. **Inclusive and accessible.** No ableist, gendered, or violent language; no color-only or direction-only instructions; alt text on every meaningful image.
10. **Descriptive link text.** "See [Set up authentication]," never "click here," "this link," or a bare URL.

## Words to cut on sight

| Don't | Use instead | Why |
|-------|-------------|-----|
| simply, just, easy, easily, obviously, of course, clearly, trivial | (delete) | Tells the reader they're slow if it isn't |
| please | (delete) | Documentation isn't asking a favor |
| e.g., i.e., etc., via | for example, that is, and so on, with/by | Latin trips up translation and screen readers |
| in order to, utilize, leverage (verb) | to, use | Padding |
| allows you to | lets you | |
| note that, it should be noted | (delete, or a `Note:` callout) | |
| this section will discuss, we will cover | (delete the pre-announcement) | |
| whitelist / blacklist | allowlist / denylist, or rewrite | Non-inclusive |
| master / slave | primary / replica, main | Non-inclusive |
| sanity check | confidence check, quick check | Ableist |
| grandfathered | legacy, exempted | |
| abort, kill, hit (a key) | stop, cancel, end, press | Violent connotation |
| he/she, his/her, guys | they, their, everyone | Gendered |
| above / below | preceding / following, or a link | Meaningless in reflowed and screen-read layouts |

The full list, including preferred spellings and interaction verbs, is in [references/word-list.md](references/word-list.md). A term marked "don't use" gets replaced or written around—never kept with a disclaimer.

## Rewriting without breaking the docs

Style edits must not change what the documentation claims. While rewriting:

- Never alter an API name, parameter, value, command, path, version number, limit, or code sample to make a sentence read better.
- Never delete a caveat, permission requirement, or prerequisite because it interrupts the flow. Move it earlier instead.
- If a rewrite would change the meaning, or if the original looks technically wrong, stop and flag it as a **content question** in the report. Style review doesn't get to guess at facts.
- Preserve anchors: renaming a heading breaks inbound links, so call out heading changes explicitly rather than slipping them into a bulk edit.

## Modes

### Writing

Draft in this style rather than writing loose and cleaning up after. Run the scan before you call it done.

### Reviewing

1. **Read the whole document first.** Structural problems—wrong audience, missing prerequisites, the actual task buried under three paragraphs of background—outrank comma placement, and fixing them often deletes the smaller findings.
2. **Run the scan** for mechanical violations.
3. **Report findings**, most severe first:

   | Severity | Covers |
   |----------|--------|
   | **Must fix** | Non-inclusive language, inaccessible content, a wrong or misleading instruction, a pre-announced feature |
   | **Should fix** | Passive voice, first or third person, future tense, title case, Latin abbreviations, "click here" links, banned words |
   | **Nice to have** | Word list preferences, hyphenation, number formatting, list punctuation |

   Use this shape, one row per finding:

   ```
   ### Must fix
   1. `guide.md:42`—"the request is validated by the server"
      → "The server validates the request." (passive voice)
   ```

   Every finding carries a concrete rewrite. A finding without one is an opinion, not a review.
4. **Don't repeat yourself.** Cite the first two or three instances of a recurring rule, then collapse the rest: "14 more instances of passive voice—all fixed in the diff."
5. **Stop where asked.** A review request ends with the report. A fix request ends with applied edits and a summary of what changed.

For a worked before-and-after, see [examples.md](examples.md).

### Large doc sets

Don't rewrite forty files in one pass. Order by reader impact: landing and getting-started pages, then task pages on the critical path, then reference. Report the mechanical scan across everything, but hand-edit in that order and stop for review after the first batch.

## Scanning

```bash
<this-skill-dir>/scripts/style-scan.sh docs/       # scan a whole tree
<this-skill-dir>/scripts/style-scan.sh -r links .  # scan for one rule
```

Rules: `banned`, `timeless`, `latin`, `inclusive`, `links`, `future`, `passive`, `heading`, `headpunct`, `claims`, `ordinal`, `plurals`, `ampm`, `dates`, `spelling`, `lyhyphen`, `emdash`. The script skips fenced code blocks, inline code spans, and link URLs, so sample output and command names don't produce false hits. It exits 1 when it finds candidates, which makes it usable as a CI gate.

Every hit needs a human read—`will` inside a quoted error string, or `master` in "master the API," are fine. The scan finds candidates; you make the call. It reports at most one hit per rule per line, so re-run after fixing a dense paragraph.

## Formatting quick reference

| Element | Treatment |
|---------|-----------|
| UI element the reader acts on | **Bold**: click **Save** |
| Menu path | **File** > **New** |
| Code items, filenames, paths, HTTP methods, values | `Code font` |
| Placeholders | `UPPERCASE_WITH_UNDERSCORES`, each defined right after the sample |
| New term on first use | *Italics*, then defined |
| Emphasis | *Italics*, sparingly. Never ALL CAPS, never underline |
| Lists | Introduce with a sentence ending in a colon; numbered for sequences, bulleted otherwise |
| Headings | Sentence case, task-based ("Create a bucket"), parallel with their siblings |

Use the reserved example values: `example.com` for domains, `192.0.2.0/24` for IP addresses, `800-555-0100` for phone numbers, and fictional, varied personal names. Never a real credential, hostname, or customer name.

Details for code samples, procedures, notices, tables, images, and links are in [references/formatting.md](references/formatting.md).

## Beyond prose docs

The same rules apply to text that ships inside software, with these emphases:

- **READMEs.** Lead with what the thing is and who it's for, in one sentence. Install and first-run come before architecture. Badges are not an introduction.
- **Release notes.** Group by change type, write from the reader's side ("You can now filter by region"), and state the action required for breaking changes. Past tense is correct here—the change already happened.
- **Error messages.** Say what failed, why, and what the reader can do next. No blame ("you entered an invalid value"), no dead ends ("an error occurred"), no stack-trace-as-message. Keep them greppable and stable across versions.
- **CLI help text.** Sentence case, no trailing period on short flag descriptions, imperative for command summaries ("Create a client"). Show one realistic example per command.
- **API reference.** One sentence per field saying what it is, then constraints, then the default. Don't restate the field name ("The name. The name of the resource"). Document what happens when it's omitted.
- **Code comments.** Present tense, explain why rather than what, and keep the same word list—a comment saying "sanity check the input" ships to every reader of the file.

## References

- [references/word-list.md](references/word-list.md)—banned terms with replacements, preferred spellings, interaction verbs, confusables, product-name rules.
- [references/formatting.md](references/formatting.md)—text formatting, headings, lists, procedures, code samples, links, notices, tables, images.
- [references/grammar-and-mechanics.md](references/grammar-and-mechanics.md)—voice and tone, punctuation, capitalization, numbers and dates, abbreviations, global audience, inclusive and accessible writing.
- [examples.md](examples.md)—a full before-and-after rewrite with the reasoning per change.

These are a distillation, not a replacement. The rules and word list here were cross-checked against [errata-ai/google](https://github.com/errata-ai/google), the Vale style package that encodes this guide as machine-readable rules—useful as a second opinion, and as a source of empirical notes about which rules produce false positives in real corpora. It lags the guide and omits the reasoning, so for anything ambiguous or unlisted, go to the canonical pages:
[Highlights](https://developers.google.com/style/highlights) ·
[Voice and tone](https://developers.google.com/style/tone) ·
[Word list](https://developers.google.com/style/word-list) ·
[Text-formatting summary](https://developers.google.com/style/text-formatting) ·
[Inclusive documentation](https://developers.google.com/style/inclusive-documentation) ·
[Accessibility](https://developers.google.com/style/accessibility)
