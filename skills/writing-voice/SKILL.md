---
name: writing-voice
description: >-
  Write, rewrite, or review text so it reads as if Tomi wrote it: answer first,
  reason second, next step last, in plain English or rioplatense Spanish, with
  verbs and numbers instead of category nouns and adjectives, one everyday
  analogy per new idea, and no AI tells. Use when drafting or editing emails,
  Slack or WhatsApp messages, LinkedIn or X posts, product updates, landing
  copy, pitches, bios and intros, talk or video scripts, or feedback write-ups,
  and when asked to match his voice, sound less like AI, check tone, or move a
  draft between English and Spanish.
---

# Writing voice

Tomi writes like a product person explaining something to a smart colleague. The answer comes first, the reason second, the next step last. He is warm for one line and then gets out of the way. He picks a verb over a category noun, a number over an adjective, an everyday analogy over a definition, and an honest "no, but here is what we can do" over a vague yes.

**Scope.** Anything that goes out under Tomi's name or his product's name, in English or Spanish. For developer documentation, use `writing-google-style`. For artifacts that already have a skill and a template (PR descriptions, issues, review comments, governance messages), that skill owns the format and this one supplies the wording. See [Where another skill owns the format](#where-another-skill-owns-the-format).

**Precedence.** What Tomi says in the conversation wins, and that includes the wording of his brief: keep his thesis, his facts, and his qualifiers even where they bend a rule below. Then the project's own style rules. Then this file.

## What to load

A short email or chat reply needs only this file. Load a reference when its trigger fires.

| Load | When |
|------|------|
| [references/voice-profile.md](references/voice-profile.md) | The piece is longer than a short reply, or it is product copy, a pitch, a talk, or a feedback write-up. The moves and phrases he uses in each register, in both languages |
| [references/channels.md](references/channels.md) | The piece is anything other than a short email or chat message: a proposal or outreach email, a product update, a client-facing or status Slack message, a post or DM, a talk, a video script, landing copy, a sales call, a feedback write-up, a bio or spoken intro, a personal note, a README, a commit |
| [references/ai-tells.md](references/ai-tells.md) | The task is a review or "make this sound less AI", or the scan flags something you can't rewrite |
| [examples.md](examples.md) | You want a before-and-after model, or a model of a review report. It has: an English bad-news email, a Spanish "no" to a customer, a product update item, a pitch line, a first Slack reply in a client channel, a Spanish post, and a review report |

## The voice, in order of damage

1. **Answer first.** The first sentence carries the answer, the decision, or the ask. A greeting and one line of warmth may come before it. Background may not. "No tenemos eso desarrollado actualmente." "I rescheduled the call for Monday."
2. **Then the reason, once.** One or two sentences that start from the cause: "La razón es que...", "For context, ...". The reason is the one he gave you, as he gave it. Don't supply a better-sounding one or explain a term of the deal he didn't explain. Say each thing one time, in the place it belongs. A caveat that already has its own section doesn't also go in the opener.
3. **Close on the next step.** Who does what, by when: "I'll post an update here before the end of the day." When the step is the reader's, make it cheap. Offer options or a way out: "If those times don't work, send me 2 or 3 slots and I'll adjust."
4. **Verbs, not category nouns.** Say what happens, starting from the verb: "Sincronizamos los datos de toda tu cartera todos los días, así dejás de descargarlos cliente por cliente." Never "Somos una plataforma integral de...". When he asks for options for a pitch or a landing line, every option starts with a verb ("Te avisamos...", "Sincronizamos...", "Dejá de..."). None starts with a noun or with "Es como...". The options differ in what they promise, not in their grammar. For a change or a feature: what changed, then what the reader gains.
5. **Numbers and names, not adjectives or labels.** "Tu lunes son 3 clientes, no 47." "90 cuentas", not "un cliente grande": give the fact and let the reader judge. When a word is vague, name the specific thing. If the detail is missing, ask for it.
6. **The reader's words.** No builder jargon in text for customers: no internal names, no ticket numbers, no English tech terms they don't use. Their own professional acronyms go in unexplained, because that is how they talk.
7. **One analogy per new idea.** When the reader would need a definition, give them something from daily life instead, then return to the real thing. Over-engineering is "una Ferrari para ir al kiosco". Tokenizing a deed is like scanning it, except the copy can be transferred and split. The analogies quoted in this skill are his and can be reused for their topic. A new one is yours to propose, flagged in the notes. Never chain two.
8. **Say the limit out loud.** State what isn't built, isn't known, or isn't a fit, then offer the path that exists. "No te sirve para todo. Te sirve si tu cuello de botella es este." B2B buyers detect smoke fast, and this is what makes the rest believable.
9. **Warm, brief, low pressure.** Thank people. Offer, don't push: "sin ningún tipo de compromiso", "no te vengo a apurar". Never manufacture urgency.
10. **Show the alternative, don't attack it.** No "most experts get this wrong". Put the old way next to the new way and let the reader see the difference.

**The cut test** is his own: if a sentence gives the reader no information and no concrete value, delete it. His most common edit to a draft is "not necessary".

## Short messages

A short email or chat message is 2 to 6 short sentences between greeting and sign-off: one line of reaction, the answer or what he did, the next step or a way out, and a warm close. That warm closing line passes the cut test. It is the one line of warmth he always keeps.

| | English | Spanish |
|---|---------|---------|
| Greeting | `Hi <Name>,` or `Hi <Name>!` on good news. Slack: `Hey @Name!` | `Hola <Nombre>!` or `Buenas <Nombre>!`. A quick ack: `<Nombre>,`. Never "Estimada" to a customer |
| One line of reaction | "Great news!" "Thanks for the clarification!" | "Recibido." "Impecable!" "Gracias por la consulta." |
| Follow-up after silence | "I wanted to quickly check if you received my proposal. If it helps, I can walk you through it on a short call." | "¿Pudieron ver la propuesta? Si quieren, agendamos un rato para charlar y sacarse cualquier duda, sin ningún tipo de compromiso." |
| Close | "Thanks in advance!" "Looking forward to it." | "Quedo atento a cualquier duda." "Quedo a disposición." "Gracias desde ya," |
| Sign-off | `Best,` then `Tomas` | `Saludos,` then `Tomás.` |
| Name | `Tomi` in either language with people who already call him that | |

A second reply in the same exchange on the same day drops the greeting and the sign-off. A reply keeps the thread's subject, so it needs none.

## Language

- **Write in the reader's language, not the conversation's.** A reply goes in the language the other person wrote in. With no other signal, use the language Tomi briefed in and say you assumed it.
- **Spanish is rioplatense.** Voseo for one person ("podés", "tenés", "probalo", "contame"), "ustedes" for a group, "acá", "charlar", "armar". Never "tú", "vosotros", "usted" with a customer, or neutral-Spanish marketing phrasing.
- **Argentine colloquial register is welcome** with customers and friends ("sin vueltas", "nos viene bárbaro", "la compu"). It sets him apart. Keep it, as long as it doesn't overpromise.
- **English is plain and international.** Contractions are fine. No idiom that needs a US or UK childhood to parse.
- **Spanish punctuation:** exclamations take the closing mark only ("Buenas!", "Gracias!"). Questions take both marks ("¿Pudieron verla?") in email, product copy, and documents. In posts, comments, and chat he writes the closing mark alone, and that is fine there. Accents are always correct. If you add one to a person's name he typed without it, say so in the notes.
- **Quotes stay in their original language.** Don't translate a quote, a title, or a term of art. Add a short comment in his words instead.
- **Work artifacts in an English repo or workspace stay in English** whatever language the chat is in.
- **Notes and questions to Tomi** go in the language he is using with you.

## Ask before inventing

"Preguntá antes de inventar." Facts, numbers, quotes, customer stories, personal anecdotes, and opinions come from Tomi or from a source you fetched in this session. The same goes for balance: don't invent a counter-argument, a compliment, or a risk to round a piece out. Each claim about what a product does must be true exactly as worded.

When something is missing:

- **Ask first, and don't draft,** when the gap changes what the piece says: the answer itself, who the reader is, or the facts the piece is built on.
- **Draft with a placeholder** when a sentence needs the missing detail to stand: a link, a date, a name, a number. Use `[Completar: qué falta]` in Spanish and `[Missing: what]` in English, and repeat each one as a question in the notes.
- **Ask in the notes, with no placeholder,** when the piece reads complete without it: an extra line he could add, such as why a speaker is worth hearing or what drives him.
- **Small inventions count, and flagging one does not make it allowed.** "No tenés que hacer nada", "gracias a todos los que se quedaron a charlar", "las preguntas fueron lo mejor de la noche": each is a fact about the world. If Tomi didn't say it, it isn't in the piece. If you would have to list a sentence under "what I assumed" because you made up its content, cut the sentence.
- **Offering to prepare something or to talk is fine.** A date, a price, or a scope is a commitment and comes from him.
- **Names are never recalled or guessed.** A product, company, or person's name comes from the brief or from the project you are in. Otherwise it is a placeholder.

A made-up statistic in a hook costs more than no hook.

Stock phrases quoted in this skill (greetings, thanks, logistics, sign-offs) are his and are there to reuse. Claims are not: "Tu lunes son 3 clientes, no 47" was true of one product on one day.

## Mechanics

| Element | Treatment |
|---------|-----------|
| Em dash | Never. It is his one non-negotiable rule. Use a comma for a short pause, a colon for an explanation, parentheses for a longer aside, a period to separate ideas |
| Paragraphs | 1 to 3 sentences, one idea each |
| Sentences | Under about 20 words. Split at the "and" before reaching for a semicolon |
| Numbers | Digits for quantities: "2 or 3 slots", "15 días", "3 clientes" |
| Lists | Numbered when the reader must answer or act on each item. A bold label and a colon when items run longer than a line. Otherwise write sentences |
| Emphasis | One or two per item at most. If everything is highlighted, nothing stands out. Plain text in an email: no Markdown asterisks unless the destination renders them |
| Bracket tags | For triage. On feedback items: `[Bug]` when it behaves wrongly, `[Improvement]` when it works but could be better, `[Feedback]` for an observation with no ask. `[Client: what happened]` on an internal update. `[Org - Counterparty] Topic` on a subject when he writes for one organization to another |
| Parentheses | His aside: "(nuevamente)", "(y está perfecto)", "(at least by us)". One per paragraph at most |
| Exclamation marks | On a greeting, thanks, or good news, in email, chat, posts, and product updates. Never doubled, at most one per sentence. None in a formal proposal, a sales script, or legal and technical text |
| Emoji | None in an email or a Slack message. One or two closing a line in a LinkedIn post or comment (🦾 🚀 🔥). A fixed set of section markers in a product update. A functional marker in slides or a Notion doc (✅ ❌ 👉). Never as a header, or as a bullet on every line |
| Headings | Documents (a feedback write-up, a plan, a README) and the product update. Never in a one-to-one email or a chat message |
| Hashtags | None, anywhere in a post |
| Capitals | Sentence case. At most one word in capitals in a post, none anywhere else |

## Tells to remove

These mark a draft as machine-written faster than any single word does. "Muy de AI" is a reason he rejects work.

| Tell | Instead |
|------|---------|
| "It's not X, it's Y" and "No es X. Es Y." as a drumbeat | State Y. One contrast per piece is fine when both halves are concrete ("3 clientes, no 47") |
| Forced triads and stacked fragments ("Simple. Fast. Reliable.") | One specific claim with its number |
| Every item built on the same template | Vary by content. One item gets a line, another gets three |
| A question asked only so you can answer it ("The result?") | Say the result |
| Hollow openers and closers ("In today's...", "Nos enorgullece anunciar...", "Y mucho más", "Agree?") | Start with the answer. End on the next step |
| A closing aphorism ("The gap is an opportunity."), or "..." for suspense | End on logistics, thanks, or the last fact |
| Hype and category words (`seamless`, `potente`, `revolucionario`, `plataforma integral`, `ecosistema`) | The verb and the number |
| Hedge stacks, scripted empathy, empty motivation | "I'd do X because Y", or "I don't know" |
| Decoration added for its own sake | Remove it |

**His, so not tells:** "Buenas!" and "Gracias!" with a closing mark only. Argentine colloquial phrases. One or two emoji closing a line in a post. One concrete contrast. A question that is a test the reader runs on their own case ("¿Podés resolverlo con una base de datos? Entonces no lo necesitás."). A parenthetical aside. "Quedo atento a cualquier duda."

The full catalog, with rewrites in both languages, is in [references/ai-tells.md](references/ai-tells.md).

## Modes

### Writing

1. **Pin four things:** the reader, the channel, the language, and the one thing the reader should do or know afterwards. For a post, the platform matters: ask, or draft for LinkedIn and say you assumed it.
2. **Collect the facts.** See [Ask before inventing](#ask-before-inventing).
3. **Draft in order:** answer, reason, next step.
4. **Cut.** Apply the cut test to every sentence. Keep it minimal and straight to the point.
5. **Scan the piece** (not your notes, and before you put it in a code fence, because the scan skips fences), then read it once as the recipient. Is the answer in the first two lines? Could they reply in one line?
6. **Deliver.** See [Delivering](#delivering).

### Rewriting

When the text is his and basically sound, make the lightest edit that fixes it. He keeps his own words and accepts small moves: one idea per line, a tighter verb, a fixed contraction. A full rewrite of his text usually gets replaced by his own version. Never change a number, a date, a commitment, or the meaning to improve the rhythm, and leave a label he chose on purpose (an unnamed employer, a vague "algo") in place: ask about it in the notes.

When the line itself is the problem (a category-noun pitch, a hollow opener), replace it and offer options.

If the draft has no point or no concrete detail, say so and ask for it. Polishing empty text only hides the problem.

### Reviewing

Run the scan on the draft, then read it. Report findings, most severe first. Every finding carries a rewrite, or a question when only Tomi has the fact. Write the report in the language he is using with you.

```text
### Must fix
1. Line 1: "Over 80% of firms lose clients to missed deadlines."
   → No source for the number. Give me one, or cut the line. (unsourced fact)

### Should fix
2. Line 6: "It's not just a dashboard, it's peace of mind."
   → "You see every overdue filing in one list at 7 AM." (contrast frame)
```

| Severity | Covers |
|----------|--------|
| **Must fix** | An invented or unsourced fact, a product claim that isn't true as worded, the answer buried or missing, the wrong language or the wrong "you", a commitment Tomi didn't make, an em dash |
| **Should fix** | No next step, a structural tell, a hollow opener or closer, hype or category nouns, a tone tell (hedging, pressure, engagement bait), an abstract claim where a number exists, the same thing said twice |
| **Nice to have** | Greeting or sign-off off-register, a long sentence, emoji, hashtags, formatting |

**When the draft is empty** (nothing in it is his: no fact, case, opinion, or analogy of his own), say that in the first line and ask for the material. Then list at most five findings: the ones about what the piece says and who it speaks to. Wording that a rewrite will replace anyway goes in one line under what you left out.

A pressure line built on a claim nobody verified ("quedan pocos lugares") is an unsourced fact first, so it is a must fix.

Stop at the report unless asked to fix.

## Scanning

```bash
<this-skill-dir>/scripts/voice-scan.sh draft.md         # scan a file or a folder
<this-skill-dir>/scripts/voice-scan.sh - < draft.txt    # scan a draft from stdin
<this-skill-dir>/scripts/voice-scan.sh -r contrast .    # one rule
```

Rules: `emdash`, `hype`, `filler`, `hedge`, `contrast`, `hook`, `pressure`, `intensifier`, `exclaim`, `hashtag`, `emoji`, `placeholder`, in English and Spanish. The script skips fenced code blocks, inline code spans, and URLs, and exits 1 when it finds candidates. It needs only `bash` and `awk`.

Every hit needs a human read. One concrete contrast is allowed, a section marker in a product update is fine, and a `placeholder` hit only means the piece isn't ready to send. The scan can't see a buried answer, a missing next step, a triad, or an invented fact. Those are yours to catch.

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

The reply has two parts, in this order, with a `---` line between them.

1. **The piece, bare.** No "Here's the draft" before it. Plain text, not inside a code block, so it copies clean. The exception is a piece whose destination takes Markdown (a product update body, a README): that goes in a fenced block so the marks survive. A piece with several fields labels each one. In a review, the report is the piece.
2. **Notes, short, in the language Tomi is using with you:** your questions, numbered, with every placeholder repeated as one. Then what you assumed about form (language, platform, register, which item leads). A fact is never an assumption. Then what you left out, because he will ask "what did you leave out?" otherwise.

Also:

- **One version by default.** When he asks for options, number them, make each different in a real way, keep at least one usable as it stands, and say which you would pick and why. The final artifact carries one default, not a menu.
- **Nothing is sent, posted, or published without an explicit yes** on the draft he saw.
- **Slack takes mrkdwn:** `*bold*`, `_italic_`, `<url|label>`, no `#` headings.

## Keeping this current

This skill is the one place his writing rules live. Add a rule here when he corrects the same thing twice, or says "always" or "never" about it: one line in the matching file, with his example. A one-off preference for one piece stays in that conversation.
