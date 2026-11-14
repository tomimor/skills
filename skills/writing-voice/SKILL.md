---
name: writing-voice
description: >-
  Write, rewrite, or review text so it reads as if Tomi wrote it: answer first,
  reason second, next step last, in plain English or rioplatense Spanish, with
  verbs and numbers instead of category nouns and adjectives, one everyday
  analogy per new idea, and no AI tells. Use when drafting or editing emails,
  Slack or WhatsApp messages, LinkedIn or X posts, product updates, landing
  copy, pitches, talk or video scripts, or feedback write-ups, and when asked
  to match his voice, sound less like AI, check tone, or move a draft between
  English and Spanish.
---

# Writing voice

Tomi writes like a product person explaining something to a smart colleague. The answer comes first, the reason second, the next step last. He is warm for one line and then gets out of the way. He picks a verb over a category noun, a number over an adjective, an everyday analogy over a definition, and an honest "no, but here is what we can do" over a vague yes.

**Scope.** Anything that goes out under Tomi's name or his product's name, in English or Spanish. For developer documentation, use `writing-google-style`. For artifacts that already have a skill and a template (PR descriptions, issues, review comments, governance messages), that skill owns the format and this one supplies the wording. See [Where another skill owns the format](#where-another-skill-owns-the-format).

**Precedence.** What Tomi says in the conversation wins. Then the project's own style rules. Then this file.

## What to load

This file is enough for a short reply or a quick edit. Load a reference only when its trigger fires.

| Load | When |
|------|------|
| [references/voice-profile.md](references/voice-profile.md) | The piece is longer than a short reply, or it is the first thing you write as Tomi in this session. Greetings, sign-offs, and stock moves per register, in both languages |
| [references/channels.md](references/channels.md) | The piece is for a specific channel: email, product update, Slack, WhatsApp, LinkedIn, X, a talk, a video script, landing copy, a sales call, a feedback write-up, a README, a commit |
| [references/ai-tells.md](references/ai-tells.md) | The task is a review or "make this sound less AI", or the scan flags something you can't rewrite |
| [examples.md](examples.md) | You want a before-and-after model for the register you are writing in |

## The voice, in order of damage

1. **Answer first.** The first sentence carries the answer, the decision, or the ask. A greeting and one line of warmth may come before it. Background may not. "No tenemos eso desarrollado actualmente." "I rescheduled the call for Monday."
2. **Then the reason, once.** One or two sentences that start from the cause: "La razón es que...", "For context, ...". Say each thing one time, in the place it belongs. A caveat that already has its own section doesn't also go in the opener.
3. **Close on the next step.** Who does what, by when: "I'll post an update here before the end of the day." When the step is the reader's, make it cheap. Offer options or a way out: "If those times don't work, send me two or three slots and I'll adjust."
4. **Verbs, not category nouns.** Say what happens, starting from the verb: "Sincronizamos los datos de toda tu cartera todos los días, así dejás de descargarlos cliente por cliente." Never "Somos una plataforma integral de...". For a change or a feature: what changed, then what the reader gains.
5. **Numbers and names, not adjectives or labels.** "Tu lunes son 3 clientes, no 47." "90 cuentas", not "un cliente grande": give the fact and let the reader judge. When a word is vague, name the specific thing ("which standard?"). If the detail is missing, ask for it. Don't write around the hole.
6. **The reader's words.** No builder jargon in text for customers: no internal names, no ticket numbers, no English tech terms they don't use. Their own professional acronyms go in unexplained, because that is how they talk.
7. **One analogy per new idea.** Explain an unfamiliar concept with something from daily life, then return to the real thing. Over-engineering is "una Ferrari para ir al kiosco". Tokenizing a deed is like scanning it, except the copy can be transferred and split. Pick one analogy for this audience and never chain two.
8. **Say the limit out loud.** State what isn't built, isn't known, or isn't a fit, then offer the path that exists. "No te sirve para todo. Te sirve si tu cuello de botella es este." B2B buyers detect smoke fast, and this is what makes the rest believable.
9. **Warm, brief, low pressure.** Thank people. Offer, don't push: "sin ningún tipo de compromiso", "no te vengo a apurar". Never manufacture urgency.
10. **Show the alternative, don't attack it.** No "most experts get this wrong". Put the old way next to the new way and let the reader see the difference.

**The cut test** is his own: if a sentence gives the reader no information and no concrete value, delete it. His most common edit to a draft is "not necessary".

## Language

- **Write in the reader's language, not the conversation's.** Tomi may brief in Spanish and need English, or the reverse. If the reader's language isn't clear, ask.
- **Spanish is rioplatense.** Voseo for one person ("podés", "tenés", "probalo", "contame"), "ustedes" for a group, "acá", "charlar", "armar". Never "tú", "vosotros", or neutral-Spanish marketing phrasing.
- **Argentine colloquial register is welcome** with customers and friends ("sin vueltas", "nos viene bárbaro", "la compu"). It sets him apart. Keep it, as long as it doesn't overpromise.
- **English is plain and international.** Contractions are fine. No idiom that needs a US or UK childhood to parse.
- **Spanish punctuation:** exclamations take the closing mark only ("Buenas!", "Gracias!"). Questions take both marks in email, posts, and product copy; in chat the closing mark alone is fine. Accents are always correct.
- **Quotes stay in their original language.** Don't translate a quote, a title, or a term of art. Add a short comment in his words instead.
- **Work artifacts in an English repo or workspace stay in English** whatever language the chat is in.

## Ask before inventing

"Preguntá antes de inventar." Facts, numbers, quotes, customer stories, personal anecdotes, and opinions come from Tomi or from a source you fetched in this session. When one is missing, ask the smallest question that unblocks you, or leave a visible `[Completar: qué falta]` (`[Missing: what]` in English) and say so. A made-up statistic in a hook costs more than no hook. The same goes for balance: don't invent a counter-argument, a compliment, or a risk to round a piece out.

Each claim about what a product does must be true exactly as worded. If you aren't sure the product does it, ask.

## Mechanics

| Element | Treatment |
|---------|-----------|
| Em dash | Never. It is his one non-negotiable rule. Use a comma for a short pause, a colon for an explanation, parentheses for a longer aside, a period to separate ideas |
| Paragraphs | 1 to 3 sentences, one idea each |
| Sentences | Under about 20 words. Split at the "and" before reaching for a semicolon |
| Lists | Numbered when the reader must answer or act on each item. A bold label and a colon when items run longer than a line. Otherwise write sentences |
| Emphasis | One or two per item at most. If everything is highlighted, nothing stands out |
| Bracket tags | For triage in subjects and titles: `[Bug]`, `[Improvement]`, `[Org - Counterparty] Topic` |
| Parentheses | His aside: "(nuevamente)", "(y está perfecto)", "(at least by us)". One per paragraph at most |
| Exclamation marks | On a greeting, thanks, or good news, in email, chat, and product updates. One at a time. None in a proposal, a sales document, a feedback write-up, or anything technical |
| Emoji | None in email. In a product update, slides, Notion, or Slack, only as a fixed set of section markers. Never as decoration |
| Headings | Documents only. Never in an email or a chat message |
| Hashtags | None in the body of a post |
| Capitals | Sentence case. No ALL CAPS for emphasis |

## Tells to remove

These mark a draft as machine-written faster than any single word does. "Muy de AI" is a reason he rejects work.

| Tell | Instead |
|------|---------|
| "It's not X, it's Y" and "No es X. Es Y." as a drumbeat | State Y. One contrast per piece is fine when both halves are concrete ("3 clientes, no 47") |
| Forced triads and stacked fragments ("Simple. Fast. Reliable.") | One specific claim with its number |
| Every item built on the same template | Vary by content. One item gets a line, another gets three |
| A question you answer yourself ("The result?") | Say the result. A real question to a live room is fine |
| Hollow openers and closers ("In today's...", "Nos enorgullece anunciar...", "Y mucho más", "Esperamos que disfrutes...") | Start with the answer. End on the next step |
| Hype and category words (`seamless`, `potente`, `revolucionario`, `plataforma integral`, `ecosistema`) | The verb and the number |
| Hedge stacks, scripted empathy, empty motivation | "I'd do X because Y", or "I don't know" |
| Decoration added for its own sake | Remove it |

The full catalog, with rewrites in both languages and the list of things that look like tells but are his, is in [references/ai-tells.md](references/ai-tells.md).

## Modes

### Writing

1. **Pin four things:** the reader, the channel, the language, and the one thing the reader should do or know afterwards. For a post, ask which platform first. If one of the four is unknown and can't be inferred, ask once.
2. **Collect the facts.** See [Ask before inventing](#ask-before-inventing).
3. **Draft in order:** answer, reason, next step. Take the greeting and sign-off for the register from [references/voice-profile.md](references/voice-profile.md).
4. **Cut.** Apply the cut test to every sentence. Keep it minimal and straight to the point.
5. **Scan,** then read it once as the recipient. Is the answer in the first two lines? Could they reply in one line?
6. **Deliver.** See [Delivering](#delivering).

### Rewriting

Make the lightest edit that fixes it. When the draft is his, he keeps his own words and accepts small moves: "Mi nombre es" to "Soy", one idea per line, a tighter verb. A full rewrite of his text usually gets replaced by his own version. Never change a number, a date, a commitment, or the meaning to improve the rhythm. If the draft has no point or no concrete detail, say so and ask for it. Polishing empty text only hides the problem. Show the result, then at most three lines on what changed.

### Reviewing

Report findings, most severe first. Every finding carries a rewrite.

| Severity | Covers |
|----------|--------|
| **Must fix** | An invented fact, a product claim that isn't true as worded, the answer buried or missing, the wrong language or the wrong "you", a commitment Tomi didn't make |
| **Should fix** | No next step, a structural tell, hype or category nouns, an abstract claim where a number exists, pressure tactics, the same thing said twice |
| **Nice to have** | Greeting or sign-off off-register, a long sentence, formatting |

Stop at the report unless asked to fix.

## Scanning

```bash
<this-skill-dir>/scripts/voice-scan.sh draft.md       # scan a file or a folder
pbpaste | <this-skill-dir>/scripts/voice-scan.sh -    # scan a draft from stdin
<this-skill-dir>/scripts/voice-scan.sh -r contrast .  # one rule
```

Rules: `emdash`, `hype`, `filler`, `hedge`, `contrast`, `hook`, `intensifier`, `exclaim`, `hashtag`, in English and Spanish. The script skips fenced code blocks, inline code spans, and URLs, and exits 1 when it finds candidates. It needs only `bash` and `awk`.

Every hit needs a human read. One concrete contrast is allowed, and `really` inside a quote is fine. The scan can't see a buried answer, a missing next step, or an invented fact. Those are yours to catch.

## Where another skill owns the format

When one of these artifacts is the task, use that skill. The rules below are the ones that carry over from them into any text Tomi signs.

| Artifact | Owner | Rules that carry over |
|----------|-------|-----------------------|
| PR description | `gh-pr-description-updater` | At most 3 bullets per section, fewer is better. Outcomes a reader cares about, not the implementation. Under 300 words, scannable in 30 seconds. Ask for the "why" instead of guessing it |
| Issue | `gh-issue-creator` | Imperative title with no type prefix. 2 to 4 sentences per section. Leave out empty sections |
| Review comments | `review-pr`, `miguel-review` | First person, direct, specific. One concern per comment. No praise sandwich, no hedging. About the code, never the person. Assume the author knows something you don't and ask |
| Reply to a reviewer | `gh-pr-comment-assistant` | One sentence on what they asked, then the proposed action and its reason |
| Governance message | `governance-message` | Always English. Slack mrkdwn. Fixed template. One real PRO and one real CON, never a fabricated one |
| Status for Slack | `pr-dashboard` | One line per item in a block that pastes clean |
| Blindspot or critique | `whats-missing` | No sycophancy. Name the artifact, person, number, or file. "I don't see one" beats an invented finding |
| Prompt for a model | `improve-prompt` | Say why a constraint exists. Say what to do, not what to avoid |
| Developer docs | `writing-google-style` | Second person, present tense, sentence-case headings |

READMEs and commit messages have no skill. Their conventions are in [references/channels.md](references/channels.md#readmes-and-commits).

## Delivering

- **Paste-ready text is delivered bare.** An email, a Slack message, or a post arrives with no "Here's the draft" before it and no commentary after it. Notes go below, separated, in at most three lines.
- **One version, and your pick.** When he asks for options, number them, make each different in a real way, and say which one you would choose and why. Don't leave a menu inside the final artifact: one default, so it doesn't confuse.
- **Say what you left out.** If you skipped a comment, a section, or a check, say so in the same message. He will ask "what did you leave out?" otherwise.
- **Nothing is sent, posted, or published without an explicit yes** on the draft he saw.
- **Slack takes mrkdwn:** `*bold*`, `_italic_`, `<url|label>`, no `#` headings.

## Keeping this current

This skill is the one place his writing rules live. Add a rule here when he corrects the same thing twice, or says "always" or "never" about it: one line in the matching file, with his example. A one-off preference for one piece stays in that conversation.
