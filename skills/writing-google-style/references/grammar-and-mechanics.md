# Grammar and mechanics

Distilled from the Google guide's pages on [voice and tone](https://developers.google.com/style/tone), [punctuation](https://developers.google.com/style/punctuation), [writing for a global audience](https://developers.google.com/style/translation), [inclusive documentation](https://developers.google.com/style/inclusive-documentation), and [accessibility](https://developers.google.com/style/accessibility).

## Voice and tone

- Conversational and friendly without being frivolous. Write the way a knowledgeable colleague explains something at a whiteboard.
- Second person throughout. First-person plural is the exception, not the default: "we" is fine in "We recommend that you enable versioning," but `us`, `our`, and `let's` almost always signal that the sentence should be recast around the reader or the product. Never "I."
- No humor, jokes, puns, memes, or pop-culture references. They don't translate, they age badly, and they cost the reader time.
- No exclamation points outside of code.
- Don't editorialize about difficulty ("this is easy," "as you'd expect") or about the reader ("if you're a beginner").
- Don't apologize for the product or the docs.
- Prefer common contractions (it's, don't, you're, can't). Google's tone is contracted by default; the expanded forms read stiff. Skip the awkward ones ("there'd," "it'll").
- Don't anthropomorphize software: "the parser rejects the input," not "the parser is unhappy with the input."

### Modal verbs

| Verb | Means |
|------|-------|
| must | Required. Use for anything the reader has to do. |
| must not | Prohibited. |
| should | Recommended but optional. |
| can | Able to, or permitted to. |
| might | Possible. |
| may | Ambiguous between permission and possibility—don't use it. |

## Sentence structure

- One idea per sentence. Aim for under about 25 words; break anything longer.
- Front-load: the main clause first, qualifiers after, except for conditions, which come first.
- Keep the subject close to the verb; don't stack long prepositional chains between them.
- Don't drop articles ("the," "a"). Telegraphic writing reads as broken to non-native speakers and translation tools alike.
- Don't drop "that" after verbs like verify, ensure, note, assume: "Verify that the service is running."
- Avoid noun stacks of three or more ("cloud storage bucket access control configuration"). Break them up with prepositions.
- Avoid ambiguous `-ing` forms: "Using the API, the request is sent" hides the actor. Name it.
- Avoid double negatives ("not uncommon," "don't fail to").
- Make pronoun references unambiguous. If "it" or "this" could point at two things, repeat the noun.
- Use one term per concept, every time. Synonym variety is good prose and bad documentation.

## Punctuation

- **Serial comma**, always: "Compute, storage, and networking."
- **Em dash**—no spaces around it in Google style—for a break in thought. Use sparingly.
- **En dash** for numeric ranges in tables and reference material: `5–10`. In prose, prefer "from 5 to 10."
- **Colon** introduces a list, a definition, or an example. The text before it must be a complete sentence, and the first word after it is lowercase unless it's a proper noun or the label of a notice (`Note:`, `Caution:`).
- **Semicolon**: usually a sign the sentence should be two sentences.
- **Parentheses**: sparing. If the content matters, put it in the sentence; if it doesn't, cut it.
- **Slashes**: don't use them for "or" or "and/or." Spell out the relationship.
- **Ampersand**: only in proper names and code.
- **Quotation marks**: commas and periods go inside the closing quotation mark in American style—except when the quoted text is a code element or a literal string value, where trailing punctuation inside would be copied by mistake. Use double quotes; reserve single quotes for quotes inside quotes.
- **Apostrophes**: possessives take `'s` even for singular nouns ending in *s*. Plurals of acronyms take no apostrophe: `APIs`, `URLs`, `IDs`.
- **Hyphens**: hyphenate compound modifiers before a noun ("command-line tool," "read-only field"), not after ("the tool is command line"). No hyphen after an `-ly` adverb ("a highly available cluster"). No hyphen with most prefixes: `preconfigured`, `reinstall`, `nonprofit`.
- **Ellipsis**: only in quoted output where content was actually removed.
- **Sentence spacing**: one space after a period, never two.

## Capitalization

- Sentence case for headings, titles, table headers, list items, UI labels, figure captions, and button text.
- Capitalize product names exactly as the product does; don't capitalize generic feature names ("the storage bucket," not "the Storage Bucket").
- Don't capitalize a word for emphasis or importance.
- Keep the case of code elements exactly as the code has it, even at the start of a sentence—or better, rewrite so the sentence doesn't start with a lowercase code element.
- Acronyms take no periods: `API`, `HTTP`, `SDK`.

## Numbers, dates, and measurements

- Spell out zero through nine in prose; use numerals for 10 and up.
- Always use numerals for measurements, versions, percentages, money, coordinates, and anything in a table: `3 GB`, `version 2`, `5%`.
- Don't start a sentence with a numeral—rewrite the sentence.
- Spell out ordinals in prose: `first`, `second`, `third`, not `1st`, `2nd`, `3rd`.
- Don't use a parenthesized plural. `file(s)` reads as noise—pick `file` or `files`, or write "one or more files."
- Use a nonbreaking space between a number and its unit (`512 MB`, `20 ms`) so the pair never wraps across lines. Degrees and percentages close up.
- Dates: `January 5, 2026` in prose. Never all-numeric formats like `5/1/26`, which mean different things in different countries. In code, logs, and filenames, use ISO 8601: `2026-01-05`.
- Times: 12-hour clock with `AM` or `PM` - capitals, no periods, preceded by a space (`10:00 AM`) - plus an explicit time zone. Use ISO 8601 in logs and other machine-facing contexts.
- Large numbers: use commas as thousands separators in prose (`1,048,576`); in code, follow the language.
- Ranges: "from 5 to 10" or "between 5 and 10" in prose—don't mix "from" with an en dash.

## Abbreviations and acronyms

- Spell out the term on first use with the acronym in parentheses, then use the acronym: "Transport Layer Security (TLS)."
- Don't define acronyms the audience already knows cold (`API`, `HTTP`, `URL`, `CPU`).
- Don't abbreviate something used only once—just spell it out.
- No Latin abbreviations: no `e.g.`, `i.e.`, `etc.`, `cf.`, `viz.`, `N.B.`
- Don't make an acronym possessive, and don't use an acronym in a heading before it's been defined.
- Use `a` or `an` based on how the abbreviation is pronounced: "an SDK," "a URL."

## Global audience

Much of this content is machine-translated or read by non-native English speakers.

- No idioms, slang, sports metaphors, or military metaphors ("out of the box," "home run," "in the trenches," "bandwidth" for time).
- No regional references, holidays, or currency assumptions.
- No humor and no sarcasm—neither survives translation.
- Prefer simple verbs to phrasal verbs where a simple one exists ("submit," not "put in").
- Be consistent in terminology and in sentence patterns; repetition helps translation memory and helps readers.
- Spell out the words in numbers-as-words puns and shorthand ("2" for "to," "u" for "you")—never use them.

## Inclusive writing

- Use `they` as a singular pronoun; rewrite in second person or plural where you can.
- Avoid gendered nouns: chair not chairman, workforce not manpower, staffed not manned, intermediary not middleman.
- No ableist language: not crazy, insane, lame, dumb, blind to, deaf to, crippled, sanity check.
- No violent or ownership metaphors: not kill, abort, hang, master/slave, hit.
- Not "normal user" or "regular user"—say "typical user" or name the case.
- Diverse, non-stereotyped names, roles, and scenarios in examples.
- Describe people only when relevant, and use the terms people use for themselves.
- Don't assume the reader's experience level, employer, hardware, or location.

## Accessible writing

- Alt text on every meaningful image; empty alt text on decorative ones.
- Don't convey information by color alone, or by position alone ("the button on the right").
- Avoid "above" and "below" for cross-references; link, or say "preceding"/"following."
- Descriptive link text that stands alone out of context.
- Real heading structure, in order, with no skipped levels—screen readers navigate by it.
- Header rows on tables; no layout tables; no ASCII art or emoji carrying meaning.
- Document keyboard alternatives for any mouse-only interaction, and write keys as `Ctrl+C`.
- Prefer device-agnostic verbs ("select," "go to") in docs covering both desktop and touch.
- Spell out symbols that screen readers skip or mangle when they carry meaning in prose.
