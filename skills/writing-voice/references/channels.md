# Channels

What changes from one channel to the next. The voice rules in `SKILL.md` apply everywhere; this file only adds the shape, the length, and the conventions of each place.

## Contents

- [Email](#email)
- [Product update email](#product-update-email)
- [Slack and work chat](#slack-and-work-chat)
- [WhatsApp](#whatsapp)
- [LinkedIn and X](#linkedin-and-x)
- [Talks and classes](#talks-and-classes)
- [Video and ad scripts](#video-and-ad-scripts)
- [Landing and product copy](#landing-and-product-copy)
- [Sales calls and pitches](#sales-calls-and-pitches)
- [Feedback write-ups and plans](#feedback-write-ups-and-plans)
- [Bios and spoken intros](#bios-and-spoken-intros)
- [Personal notes](#personal-notes)
- [READMEs and commits](#readmes-and-commits)

## Email

| Part | Convention |
|------|------------|
| Subject | Says the thing. Outreach between two organizations takes a bracket prefix: `[Org - Counterparty] Topic`. Administrative mail is `Topic - Full Name` |
| Reply | 2 to 6 short sentences between greeting and sign-off: reaction, answer, next step, thanks. No new subject: it inherits the thread's |
| Proposal or outreach | Up to about 200 words. Pick up the thread ("Tal como conversamos..."), list what is attached as numbered items, separate what exists today from what is promised and by when, offer a call |
| Asks | One per email. Two or more questions become a numbered list |
| Follow-up after silence | One line asking, one line making the next step cheap, no guilt |
| Logistics | When he sets or confirms a meeting himself: day, time, time zone, and link in the body, even if an invite went out |
| Signature | First name only. Name and role on a first formal contact |
| Format | Plain text. No Markdown asterisks unless the destination renders them |

No headings and no emoji. Bold only in outreach, where two or three phrases carry the offer.

Offering to prepare something or to talk is a stock move and always fine. A date, a price, or a scope is a commitment, so it comes from Tomi or goes in as a question.

## Product update email

The periodic email to the users of his product. It should sound like one person on the team writing to a colleague: close, human, "sin humo ni jerga técnica".

| Part | Convention |
|------|------------|
| Fields | Four, each labeled: **Título**, **Asunto**, **Preview**, and **Cuerpo** (the body, in Markdown) |
| Título and Asunto | The headline change in the reader's words, often as an invitation: "Instalá [producto] como app en tu compu y en tu celu!" · "Llegó el reporte para [quiénes]!" They are usually the same line. The Título can instead be a warm line for the whole edition |
| Preview | A fragment that adds the benefit: "A un toque de distancia, a pantalla completa y más rápida." |
| Opening | `Buenas!` then one human line (the long weekend, what was promised last time) or a scene from the reader's day: "En el día a día, manejás 20 pestañas y [producto] se mezcla entre tantas." The human line is Tomi's to supply. Ask for it, or leave a placeholder |
| Sections | `##` subtitles with a fixed marker each, in this order: `## ⭐️` with the star change as its title, `## ✨ Otras novedades`, `## 🛠️ Mejoras`, `## 🙏🏼 Gracias!`. A section with nothing in it is left out. 🐞 only when a fix needs a section of its own. ⚠️ marks an edition with no news. No other emoji |
| Otras novedades and Mejoras | Bullets. A news item is a bold label, a colon, and one or two sentences. An improvement is one sentence with the key phrase in bold |
| Who "you" is | The greeting addresses the group ("Espero que hayan disfrutado..."). Each item speaks to one reader in voseo ("Ahora podés...") |
| Each item | What changed, then what you gain. One or two emphases at most |
| A fix | Goes under Mejoras and starts with "Corregimos...": what was wrong, in the reader's terms, and that it is behind them. "Si alguna vez te topaste con una pantalla que no levantaba, eso ya quedó atrás." Add what the reader has to do, if anything |
| Names | The product's name and the founders' first names come from the project you are in or from Tomi. They are not written in this skill |
| Reassurance | Say what does not change: "Podés seguir usándola como hoy, no cambia nada!" |
| Thanks | Credit the users who asked: "Si estás leyendo esto y alguno de estos pedidos te suena, gracias!" |
| Sign-off | `Un saludo,` and the first names of the founders |
| PS | Optional, short, human. One line about the week, never about the product |

- **Left out:** commit-level detail, internal names, work on the marketing site, and filler such as "seguimos mejorando semana a semana".
- **A week with one topic** gets one topic. Don't pad it to fill the sections.
- **A week with no news** says so in one line instead of inventing some.

## Slack and work chat

- **One message, complete.** The reader shouldn't need the next message to act on this one.
- **Thread replies open by naming the person:** "Thanks @Name for the detailed write-up!"
- **A status or escalation has a fixed shape:** a bracketed topic line and who it is for, two or three sentences of fact, the link, then numbered next steps with owners. A step you don't know is written as the status you do know, or asked for. Never invent one.

  ```text
  [Client X: issue reported after delivery] @Lead, cc @Manager for visibility
  Client X reported a bug two weeks after we delivered. They found it on testnet, and I've asked them to confirm nothing is live. They already have a fix PR.

  Thread: <link>

  Next steps:
  1. @Lead checks whether it was in scope and how it relates to what we already reported.
  2. I keep everyone posted here and confirm next steps with the client.

  We plan to give the client clarity by EOD.
  ```
- **In a channel shared with a client, the first reply does four things:** thanks them, says who owns it on our side, asks the one question that sets the urgency, and commits to a time for the next update. It says nothing about cause, severity, scope, or blame until the team has agreed internally, even when Tomi's brief mentions a suspicion. "We are looking at it now" is the honest limit here.
- **A promise to a client has a time,** and the update arrives even when there is no news. Internally, "I'll keep everyone posted here" is enough once the client deadline is stated.
- **Mentions are written `@Name`.** Tomi picks them from Slack's autocomplete when he pastes.
- **No emoji** in a Slack message he writes by hand.
- **An automated alert carries the facts in a fixed order** (what happened, who, how much, in the local number format) and no verdict. "Plan Profesional: $ 180.000 por mes (90 cuentas)" tells the team more than "cliente grande", and it shows for every account, not only the big ones.
- **Formatting is Slack mrkdwn:** `*bold*`, `_italic_`, `<url|label>`, `•` or `-` for bullets, no `#` headings, no `**bold**`.

## WhatsApp

The shortest register. He uses it with customers and partners in Spanish.

- Open with `Buenas <Nombre>!` or `Hola <Nombre>!`, then the point in the same message.
- One question per message. No lists, no bold, no sign-off.
- Anything with numbers, dates, or commitments also goes by email, and the message says so.

## LinkedIn and X

**Ask which platform first.** LinkedIn is the main one. If you can't ask, draft for LinkedIn in the language he briefed in, and say you assumed both. The audience is founders, operators, and product and tech people. The goal is reputation and authority in his niche (tech, startups, product), so optimize for authority over virality, and quality over volume.

The conventions below come from his own posts, counting only the ones he wrote by hand. His posts start from something that happened: an event he ran or attended, news of his own, something he read. About 3 in 10 promote an event, a class, or a stream. About 3 in 10 are a recap with thanks. The rest are his own news, a recommendation, or an opinion.

| Part | Convention |
|------|------------|
| First line | The news, the event, or the topic, stated plainly. No greeting. "Tengo una gran noticia" · "Confirmado [evento] en Argentina!" · "Para mí, la línea entre producto y engineering tiende a desaparecer." |
| Length | 40 to 130 words. Never over 250. One or two lines are enough over a reshare |
| Paragraphs | 4 to 7, of one or two sentences each, with a blank line between them |
| Reader | The group ("Los invito a...", "Los esperamos!"), and one person in voseo for the call to action ("sumate", "mandame un mensaje") |
| People | He thanks people by full name for a concrete thing, with one specific compliment: "Gracias [nombre] por la invitación!" He credits the team: "fuimos", "logramos" |
| Link | Not in the body. "Dejo el link en el primer comentario." |
| Ending | Logistics, thanks, or a short forward line ("Vamos por más", "Let's keep building"). An open question now and then ("What do you think?"), only when he wants the answers |
| Emoji | One or two, closing a line: 🦾 🚀 🔥 🇦🇷 🙌. Never as a section header |
| Exclamation marks | Yes, on the news and on the thanks |
| Hashtags | None |
| Emphasis | At most one word in capitals. No bold |
| Personal angle | Only a real one that Tomi supplied. Never invent a confession, a story, or a family tie |
| Language | One per post. Spanish posts keep English tech terms ("stream", "link", "stablecoins") and write "cripto". English posts write "crypto" |

**Shape by kind of post:**

- **His own news:** the fact or the feeling in line one ("Me hace feliz compartirles que..."), then what it is, who it is with, and a forward line.
- **Recap with thanks:** what happened and what was covered, thanks by name, one compliment to the host or the venue, where the recording is.
- **Promotion of a class, talk, or stream:** when and where, what it covers, who else takes part (with a line on why they are worth hearing), who it is for, where the link is.
- **Recommendation:** where he found it, why he likes it ("Me encanta porque..."), who should read it, link in the comments.
- **Opinion:** the claim in line one ("Para mí, ...", "My take: ..."), the reason, one case, and often a question back to the reader.

**Not his.** These marked the posts he drafted with an assistant in 2023 to 2025, and he rejects them now: em dashes, emoji as headers or as a bullet on every line, a hashtag block, "..." for suspense, a closing aphorism ("The gap is an opportunity."), a question he answers himself, a post over 250 words, neutral Spanish ("Súmate"), empty motivational tone, clickbait hooks, thread-bait.

**Comments** on other people's posts run under 10 words: the person, a reaction, a wish, one emoji at the end. "Grande [nombre]! A seguir creciendo 🦾" · "Tremendo laburo!" · "Great read! Thanks for sharing." · "Completely agree. Let's go!"

**X:** one idea per post, and a thread only when each post stands alone. This skill has no sample of his X posts, so ask for one before assuming more.

A direct message on either platform is a short email reply without the sign-off block: greeting, the point, the next step.

## Talks and classes

Pedagogical clarity comes before completeness. People came to learn, not to read an encyclopedia.

**Arc:** promise, what the room has already heard, what is out and what is in, a roadmap of three parts, the concept with one analogy, a test the audience can apply, real cases, a closing tool they take home.

- **Slides are low density:** one main message per slide, a concrete example before the abstraction.
- **Slide titles are claims,** with the number when there is one: "Trazabilidad: de 7 días a 2,2 segundos". Not "Caso de estudio".
- **Every number has a public source** on the slide or in the notes. No source, no number.
- **Include a case that failed** and say why. It earns trust for the ones that worked.
- **End with something usable:** a short list of questions, a 30-second test, a next step.
- **Speaker notes** carry the timing per section and the moments where the room does something (raise hands, write down their own case).
- **Scripts for the camera** are written to be said aloud: one sentence per line, no clause that needs a breath in the middle. Close on an invitation: "Te esperamos."
- **Course material is sober:** calm, precise, confident. The warmth comes from the writing and the examples, not from decoration.

## Video and ad scripts

**Skeleton:** `[Hook] → [Demo: one use case] → [Result] → [Call to action]`. The angle of the hook changes between variants; the skeleton doesn't.

- 25 to 35 seconds, written as a table: time, what is on screen, text on screen.
- It works on mute. Text on screen carries the message.
- One product screen per video. If a second feature shows up, cut it.
- The same call to action closes every variant.
- Each variant is a hypothesis about what moves the buyer (time, fear, money, peace of mind). Say which one, so the results can be read later.
- A production note says which shot does the work, and what must be verified with the product before filming.

## Landing and product copy

"Mantenela mínima y directo al grano." The moves themselves (verb first, their moment in numbers, the objection honored) are in the voice profile, which `SKILL.md` has you load together with this file for product copy.

- **Headline:** the user's situation or the outcome, in their words. Not the category of the product.
- **Subhead:** what it does, in plain terms, in one sentence that starts with a verb.
- **Proof before adjectives:** a number, a screenshot, a named integration.
- **Objections get their own section,** phrased the way the buyer asks them.
- **One call to action,** repeated with the same words.
- **Transactional text** (notifications, emails from the product) says what happened, what it means for the user, and what they can do, in that order, in two or three sentences.
- **The tone follows the product.** A B2B tool is direct and never overpromises. An app for friends can be "canchero" and warm. Neither is corporate.

## Sales calls and pitches

- **Open by saying how the call goes and that "no" is a fine outcome:** "Te hago un par de preguntas, te muestro solo lo que te sirve, y al final puede ser sí, no, o seguir charlando. No te vengo a apurar."
- **Say who it is not for:** "No te sirve para todo. Te sirve si tu cuello de botella es este."
- **Pitch lines start with a verb in the first person plural:** "Sincronizamos...", "Te avisamos cuando..., antes de que se entere él." If a line starts with "Somos una plataforma de...", rewrite it. When he asks for options, every one starts from the verb. A headline that starts from the reader's situation is a different piece: offer it separately and say so.
- **The offer names the frictions removed:** "15 días de prueba, sin tarjeta. Si no te cambia la semana, lo dejás."
- **Never:** manufactured urgency, a pressure close, scripted empathy ("entiendo cómo te sentís").
- **A one-page version exists for every script.** If it doesn't fit on a page, it won't be used in the call.

## Feedback write-ups and plans

- It is a document, so it has headings and no greeting or sign-off. If he will paste it into an email, he adds those.
- Start with thanks and the frame, then one line on how the document is organized.
- One section per item. The heading is a bracket tag and the problem in plain words: `## [Bug] The two delivery dates don't match`.
- Each item: what happened, why it mattered, a suggestion, the evidence.
- Separate facts from assumptions, and label the assumptions.
- A plan names who owns each decision and drafts the messages in full.
- End with thanks, and an exclamation mark is fine there: "Thank you for reading through all of this!" No summary of what was just said.

## Bios and spoken intros

**Written bio:** role first, then what he does now, then background, in two or three sentences. First person on his own site, third person for an event page. Verbs and numbers ("built and shipped X, used daily by N firms"), no adjectives about himself. The details come from Tomi or from a bio he already published, never from memory.

**Spoken intro** (a podcast, a panel): `Buenas! Soy Tomás.` or `Buenas! Mi nombre es Tomás.` (both are his). Then years and what he does in one sentence, then what he is doing today with each front on its own line, then one closing line about what drives him. In a personal setting he wants less CV and more of himself. That closing line is his to write: ask for it in the notes, and don't put a placeholder in the text.

## Personal notes

For his own knowledge base, in Spanish.

- A saved idea is a link and two or three lines on why it mattered to him. The goal is to remember, cite, and connect, not to summarize.
- Quotes stay in the original language, with the timestamp or source, and a short comment in his words.
- No em dashes here either.

## READMEs and commits

**READMEs.** Short beats complete. Open with one sentence on what it is, then the objective as a few bullets. Explain how it works by walking through one concrete flow (a test, a demo) instead of listing every part. A caveat lives in one place. Package inventories and mapping tables that the reader didn't ask for are "not necessary". For the sentence-level rules, use `writing-google-style`.

**Pull requests** follow the repo's template, through `gh-pr-description-updater`. Whatever the template, the verification section says plainly what was not run: "The tests were not run here. CI on this PR is the check."

**Commits** follow the log of the repo you are in. In this repo:

| Part | Convention |
|------|------------|
| Subject | Imperative, lowercase start, no period: `add grill-me skill for relentless plan interviews` |
| Prefix | Conventional-commit type and scope when the change has one: `fix(governance-message): emit as bare chat text, never wrap in a code block` |
| Body | Why the change exists and what it changes for the user of the code, in 2 to 4 lines wrapped at 72. Skipped when the subject says it all |
| Before and after | An arrow: `badge 65 → 66`, `tomim-skills → skills` |
| Not in a commit | A narration of the diff, praise for the change, or anything a reviewer can read from the code |
