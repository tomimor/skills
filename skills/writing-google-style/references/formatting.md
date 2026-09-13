# Formatting

Distilled from the Google guide's [text-formatting summary](https://developers.google.com/style/text-formatting), [code samples](https://developers.google.com/style/code-samples), [lists](https://developers.google.com/style/lists), and [procedures](https://developers.google.com/style/procedures) pages.

## Text formatting

| Element | Treatment | Example |
|---------|-----------|---------|
| UI element the reader acts on | **Bold** | Click **Create instance**. |
| Menu path | **Bold**, separated by `>` with spaces | Go to **File** > **Settings** > **Editor**. |
| Code elements: class, method, parameter, value, filename, path, command, HTTP method, MIME type, env var, query string | `Code font` | Set `retryCount` to `3` in `config.yaml`. |
| Placeholder in a code sample | `UPPERCASE_WITH_UNDERSCORES` in code font | `gcloud config set project PROJECT_ID` |
| New term on first use | *Italics*, immediately defined | A *service account* is an account that belongs to your app. |
| A word used as a word | *Italics* | The word *deprecated* has a specific meaning here. |
| Titles of books, papers, specs | *Italics* | |
| Emphasis | *Italics*, rarely | |
| Never | ALL CAPS for emphasis, underline for anything but links, bold for emphasis in body text | |

Don't format punctuation that isn't part of the code element. When quoting a code element or a string value, keep trailing commas and periods outside the code span so the reader doesn't copy them.

## Headings and titles

- Sentence case: "Set up your environment," not "Set Up Your Environment."
- Task sections get imperative headings ("Create a bucket," "Authenticate the client"). Conceptual sections get noun phrases ("Authentication overview") or gerunds, used consistently.
- Sibling headings are parallel—all imperative or all noun phrases, not mixed.
- Descriptive, not clever. The reader scans headings to find their task.
- Don't skip heading levels, and don't use a heading as the antecedent for a pronoun—the first sentence under a heading must stand on its own.
- No terminal punctuation in a heading, no code font unless a code element is genuinely part of the name, and no links inside headings.
- Titles: `About X` for concepts, `Get started with X` for quickstarts, verb-first for how-tos.

## Lists

- Introduce every list with a sentence that ends in a colon, usually containing "the following": "The request accepts the following parameters:"
- Numbered lists for sequences and ranked items; bulleted lists for everything else; description lists for term/definition pairs.
- Parallel structure across items: all fragments, all sentences, all imperatives.
- Capitalize the first word of every item.
- Punctuate consistently: end each item with a period if items are complete sentences or complete the introductory sentence; omit periods if every item is a short fragment. Never end items with semicolons or with "and"/"or."
- Don't use a list for a single item, and don't nest more than two levels deep.
- Keep items short—if an item runs several sentences, it's probably a paragraph or a subsection.

## Procedures

- Number the steps. Each step is one action the reader takes.
- Imperative mood, present tense: "Click **Save**," not "You should click Save."
- Put the location before the action: "In the **Name** field, enter a name."
- Put the condition before the action: "If you use a service account, add the role."
- State the result when it isn't obvious, or when the next step depends on it: "The instance list appears."
- Prerequisites, permissions, and required tools go before step 1, not buried in step 4.
- Single-step procedures: write them as a paragraph or a single bullet, not a list of one.
- Don't mix explanation into a step. Explain first, then act.

## Code samples

- Every sample must run as written, apart from clearly marked placeholders.
- Define each placeholder immediately after the sample, in a list: "Replace `PROJECT_ID` with your Google Cloud project ID."
- Placeholders are uppercase with underscores. Don't wrap them in angle brackets unless the surrounding product convention requires it.
- Tag the language on fenced blocks so highlighting works.
- Keep samples minimal but complete: imports included, no unexplained magic, no `...` where real code is needed.
- Show errors being handled if the reader would need to handle them.
- Don't use real credentials, real user data, real internal hostnames, or real customer names—ever, in any sample or output.
- Break long command lines with the shell's continuation character rather than letting them scroll.
- Comments in samples follow the same style rules as prose: sentence case, present tense, no jokes.
- Sample output goes in its own block, labeled, and truncated with a clear marker if it's long.

### Reserved example values

| Kind | Use |
|------|-----|
| Domains | `example.com`, `example.org`, `example.net` |
| IPv4 | `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24` |
| IPv6 | `2001:db8::/32` |
| Phone numbers | `800-555-0100` through `-0199` |
| Email | `alice@example.com` |
| People | Fictional names, drawn from a variety of cultures. Not colleagues, not celebrities. |

## Links

- Link text describes the destination: "See [Set up authentication]," never "click here," "this link," "read more," or a bare URL as the text.
- The link text should make sense read aloud on its own, out of context—screen reader users navigate by link list.
- Standard phrasing for cross-references: "For more information, see [X]." Use "see," not "refer to" or "check out."
- Mention the format when the target isn't a webpage: "[Migration guide] (PDF)."
- Don't stack consecutive links with no text between them, and don't link the same phrase twice in a paragraph.
- Link to a stable canonical URL, not a redirect or a versioned URL that will rot.

## Notices and callouts

Use them sparingly—a page of callouts is a page with no emphasis at all.

| Type | For |
|------|-----|
| `Note:` | Neutral information that's useful but not required |
| `Important:` | Information the reader needs to avoid a bad but recoverable outcome |
| `Caution:` | Risk of data loss, cost, or a hard-to-undo state |
| `Warning:` | Risk of damage, security exposure, or irreversible loss |
| `Tip:` | An optional shortcut or better approach |
| `Key Point:` | The one thing to remember from a long section |

Put the notice immediately before the step it applies to, not after. Start with the label and a colon, keep it to one or two sentences, and don't put a procedure inside a notice.

## Tables

- Sentence case headers, no terminal punctuation on fragments.
- A header row is required; screen readers rely on it.
- Every table needs an introductory sentence saying what it contains.
- Don't use a table for a single column—that's a list. Don't use a table for layout.
- Keep cells short. Long prose in cells is a sign the content wants to be a section.
- Be consistent within a column: all fragments or all sentences.

## Images and video

- Every meaningful image needs alt text describing what it conveys, not what it looks like. Purely decorative images get empty alt text.
- Don't put essential information only in an image—screenshots go stale and can't be searched, translated, or read aloud.
- Don't rely on color alone to make a point ("the red box"); name the element too.
- Avoid directional-only instructions ("the button on the left"); name the element and give its label.
- Crop screenshots to the relevant area and avoid capturing personal data, real names, or credentials.
- Video needs captions and, for anything instructional, a text equivalent.
