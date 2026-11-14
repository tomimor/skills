# Channels

What changes from one channel to the next. The voice rules in `SKILL.md` apply everywhere; this file only adds the shape, the length, and the conventions of each place.

## Contents

- [Email](#email)
- [Product update email](#product-update-email)
- [Slack and work chat](#slack-and-work-chat)
- [WhatsApp](#whatsapp)
- [LinkedIn and X](#linkedin-and-x)
- [Forum and community replies](#forum-and-community-replies)
- [Talks and classes](#talks-and-classes)
- [Video and ad scripts](#video-and-ad-scripts)
- [Landing and product copy](#landing-and-product-copy)
- [Sales calls and pitches](#sales-calls-and-pitches)
- [Commercial proposal](#commercial-proposal)
- [Weekly status update](#weekly-status-update)
- [Executive brief](#executive-brief)
- [Assumptions and rationale](#assumptions-and-rationale)
- [Client kickoff deck](#client-kickoff-deck)
- [Feedback write-ups and plans](#feedback-write-ups-and-plans)
- [Bios and spoken intros](#bios-and-spoken-intros)
- [Personal notes](#personal-notes)
- [READMEs and commits](#readmes-and-commits)

## Email

| Part | Convention |
|------|------------|
| Subject | Says the thing. When he writes for one organization to another, a bracket prefix: `[Org - Counterparty] Topic` or `[Org <> Client] Topic`. Administrative mail is `Topic - Full Name`. A cold email takes a direct question about the reader's day |
| Reply | 2 to 6 short sentences between greeting and sign-off: reaction, answer, next step, thanks. No new subject: it inherits the thread's |
| Proposal or outreach | Up to about 200 words. Pick up the thread ("Tal como conversamos..."), list what is attached as numbered items, separate what exists today from what is promised and by when, offer a call. The attached document has its own shape: see [Commercial proposal](#commercial-proposal) |
| To a client executive | Restate the ask in their terms ("We understand you would like [the ask] ahead of [their milestone]."). Say who reviews it and when he follows up. Then ask what he needs to plan: "To help guide our approach, could you clarify the following?" Each question opens with a bold label ("**Scope:**") and offers the alternative: "Do you require the full [thing], or would an initial core version suffice?" Close warm: "Looking forward to working together!" |
| Asks | One per email. Two or more questions become a numbered list |
| Follow-up after silence | One line asking, one line making the next step cheap, no guilt |
| Logistics | When he sets or confirms a meeting himself: day, time, time zone, and link in the body, even if an invite went out |
| Signature | First name only. On a first formal contact: `Best regards,`, his first name, and his role and company on the next line. `Tomás / [producto]` on a cold email |
| Format | Plain text. No Markdown asterisks unless the destination renders them |

No headings and no emoji. Bold only as the label that opens each question in a list, and only where the mail client renders it.

**Cold email,** to someone who is not looking for the product. Four moves, under 90 words: a subject that asks about their day ("¿Cuántos clientes descarga tu estudio a mano cada mes?"), why he is asking ("Te pregunto porque la mayoría de los estudios con los que hablo hacen lo mismo: ..."), what the product does in one verb-first sentence, and a small ask with a size ("Te muestro cómo en 15 minutos. ¿Tenés tiempo esta semana?"). If they met, the first line says where.

Offering to prepare something or to talk is a stock move and always fine. A date, a price, or a scope is a commitment, so it comes from Tomi or goes in as a question.

## Product update email

The periodic email to the users of his product. It should sound like one person on the team writing to a colleague: close, human, "sin humo ni jerga técnica".

| Part | Convention |
|------|------------|
| Fields | Four, each labeled: **Título**, **Asunto**, **Preview**, and **Cuerpo** (the body, in Markdown) |
| Título and Asunto | The headline change in the reader's words, often as an invitation: "Instalá [producto] como app en tu compu y en tu celu!" · "Llegó el reporte para [quiénes]!" They are usually the same line. The Título can instead be a warm line for the whole edition |
| Preview | A fragment that names the next item in the update, or a benefit Tomi gave you: "A un toque de distancia, a pantalla completa y más rápida." Never a benefit you inferred, such as "más rápido" when he didn't say it |
| Opening | `Buenas!` then one human line (the long weekend, what was promised last time) or a scene from the reader's day: "En el día a día, manejás 20 pestañas y [producto] se mezcla entre tantas." The human line and the scene are Tomi's to supply. Build one from a fact in his brief ("este lunes fue feriado"), or leave a placeholder |
| Sections | `##` subtitles with a fixed marker each, in this order: `## ⭐️` with the star change as its title, `## ✨ Otras novedades`, `## 🛠️ Mejoras`, `## 🙏🏼 Gracias!`. A section with nothing in it is left out. 🐞 only when a fix needs a section of its own. ⚠️ marks an edition with no news. No other emoji |
| Otras novedades and Mejoras | Bullets. A news item is a bold label, a colon, and one or two sentences. An improvement is one sentence with the key phrase in bold. A fix may take two |
| Who "you" is | The greeting addresses the group ("Espero que hayan disfrutado..."). Each item speaks to one reader in voseo ("Ahora podés...") |
| Each item | What changed, then what you gain. The gain has to follow from the change as he described it. If you would have to guess what a feature is for, ask. One or two emphases at most |
| A fix | Goes under Mejoras and starts with "Corregimos...": what was wrong, in the reader's terms, and that it is behind them. "Si alguna vez te topaste con una pantalla que no levantaba, eso ya quedó atrás." Whether the reader has to do anything is a fact: write it only if Tomi told you, and otherwise ask |
| Names | The product's name and the founders' first names come from the project you are in or from Tomi. They are not written in this skill |
| Reassurance | Say what does not change: "Podés seguir usándola como hoy, no cambia nada!" |
| Thanks | Credit the users who asked: "Si estás leyendo esto y alguno de estos pedidos te suena, gracias!" Thank them for what he said they did, and add no promise of your own ("las leemos todas", "seguimos leyendo sus mensajes"). The thanks appears once, in this section: don't thank next to the item and then fill the section with another line |
| Sign-off | `Un saludo,` and the first names of the founders |
| PS | Optional, short, human. One line about the week, never about the product |

- **A commit list is raw material, not his wording.** Translate it into what the reader sees, and ask in the notes whether a screen name ("dashboard", "tabla de clientes") is the label the user knows.
- **The four field labels sit outside the code fence.** Only the Markdown body goes inside it.
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
- **Closing the loop on a promise starts by saying so:** "Hi @Name! As promised, here's our plan after looking into the issue with @Lead:". Then one bullet per commitment: a bold label, a colon, who does what, and by when ("We'll share feedback here by [Missing: date]."). It ends on an offer: "Happy to jump on a quick call this week to walk through it together. Let me know what works for you!"
- **A DM that asks a teammate for time has four parts:** what happened, the link, an ask with its size, and what he plans to do in the meantime. "Hey @Lead! [Client] just posted that they found a bug in [the contract]. Thread: <link>. Do you have 5 minutes to sync? I was planning to reply in the thread to acknowledge and confirm that nothing is live."
- **A new scope ask from a client is framed as a choice,** never as a yes or a no. His own line: "Frame every new scope ask as a choice: swap priorities, add capacity or add time".
- **Options go to the people who approve as a short list, then his pick, then what he needs from them:** "These are the options we could offer [client]:", one line per option (a bold label, a colon, what changes and what the client gives up), "Our recommendation: [option], because [reason].", and "Before I take this to [who], I'd like your input on [what]." The pick and its reason are his. Without them, ask.
- **One voice toward the client:** "If anyone at [client] raises this with you directly, please point them to me, and let's not commit to dates or scope until we agree internally."
- **A DM before a meeting lists the questions:** "Hey team! I've booked 45 minutes on [topic]. These are the questions I'd like us to answer:", grouped under each `@Name`.
- **Mentions are written `@Name`.** Tomi picks them from Slack's autocomplete when he pastes. A person he hasn't named is their role in brackets (`[Lead]`, `[BD]`), and the notes ask who it is.
- **No emoji** in a Slack message he writes by hand.
- **An automated alert carries the facts in a fixed order** (what happened, who, how much, in the local number format) and no verdict. "Plan Profesional: $ 180.000 por mes (90 cuentas)" tells the team more than "cliente grande", and it shows for every account, not only the big ones.
- **Formatting is Slack mrkdwn:** `*bold*`, `_italic_`, `<url|label>`, `•` or `-` for bullets, no `#` headings, no `**bold**`.

## WhatsApp

The shortest register. He uses it with customers and partners in Spanish.

- Open with `Buenas <Nombre>!` or `Hola <Nombre>!`, then the point in the same message.
- One question per message. No lists, no bold, no sign-off.
- Anything with numbers, dates, or commitments also goes by email, and the message says so.
- **First contact with a lead** says who he is, then what the product does in one sentence that starts with a verb, then asks one thing: "Buenas! Soy Tomás, cofundador de [producto]. Ayudamos a [quiénes] con [qué]."
- **An ask says how small it is and what it is for:** "es cortito y me ayuda así entiendo tu caso para asesorarte".

## LinkedIn and X

**Ask which platform first.** LinkedIn is the main one. If you can't ask, draft for LinkedIn in the language he briefed in, and say you assumed both. The audience is founders, operators, and product and tech people. The goal is reputation and authority in his niche (tech, startups, product), so optimize for authority over virality, and quality over volume.

**The voice he set for his brand** has three parts: authentic (real experiences, including the ones that went wrong), expert but approachable, and educational (a complex topic made digestible). He likes sharing other people's work as a source of learning.

**What he posts:** his take on an article, a clip of a founder or an expert, an explainer, a milestone, takeaways from an event, a personal reflection, a shout-out to someone in the community, a roundup of trends. A reference from outside the industry (football, a scene from a film) is welcome when it connects to the topic. In his words, people buy from people.

The conventions below come from his own posts, counting only the ones he wrote by hand. His posts start from something that happened: an event he ran or attended, news of his own, something he read. About 3 in 10 promote an event, a class, or a stream. About 3 in 10 are a recap with thanks. The rest are his own news, a recommendation, or an opinion.

| Part | Convention |
|------|------------|
| First line | The news, the event, or the topic, stated plainly. No greeting. "Tengo una gran noticia" · "Confirmado [evento] en Argentina!" · "Para mí, la línea entre producto y engineering tiende a desaparecer." |
| Length | Usually 40 to 130 words. Never over 250. Shorter is fine: one or two lines are enough over a reshare |
| Paragraphs | 4 to 7, of one or two sentences each, with a blank line between them |
| Reader | The group ("Los invito a...", "Los esperamos!"), and one person in voseo for the call to action ("sumate", "mandame un mensaje") |
| People | He thanks people by full name for a concrete thing, with one specific compliment: "Gracias [nombre] por la invitación!" He credits the team: "fuimos", "logramos" |
| Link | Never in the body, not even as a placeholder. The post says "Dejo el link en el primer comentario", and the notes ask him for the link |
| Ending | Logistics, thanks, or a short forward line ("Vamos por más", "Let's keep building"). An open question now and then ("What do you think?"), only when he wants the answers |
| Emoji | One or two, closing a line: 🦾 🚀 🔥 🇦🇷 🙌. Never as a section header |
| Exclamation marks | Yes, on the news and on the thanks |
| Hashtags | None |
| Emphasis | At most one word in capitals. No bold |
| Personal angle | Only a real one that Tomi supplied. Never invent a confession, a story, or a family tie |
| Language | One per post. Spanish posts keep English tech terms ("stream", "link", "stablecoins") and write "cripto". English posts write "crypto" |

**Shape by kind of post:**

- **His own news:** the fact or the feeling in line one ("Me hace feliz compartirles que..."), then what it is, who it is with, and a forward line.
- **Recap with thanks:** what happened and what was covered, thanks by name, one compliment to the host or the venue, where the recording is. Thank people only for what he told you happened ("por la invitación" if she invited him, and nothing added such as "y por armar el espacio"), and ask him for the compliment.
- **Promotion of a class, talk, or stream:** when and where, what it covers, who else takes part, who it is for, where the link is. He usually adds a line on why the other speakers are worth hearing. That line is his: ask for it in the notes.
- **Recommendation:** where he found it, why he likes it ("Me encanta porque..."), who should read it, link in the comments.
- **Opinion:** the claim in line one ("Para mí, ...", "My take: ..."), the reason, one case, and often a question back to the reader.

A post can mix two kinds (a recommendation that carries an opinion). Lead with the news or the claim, and keep one ending.

**Not his.** He once had an assistant write sample posts for each type and noted that he did not like the tone of most of them: "was a game-changer for me", "is not just technology, it's a movement", "Thoughts?". The same marks show in the posts he drafted with an assistant in 2023 to 2025, and he rejects them now: em dashes, emoji as headers or as a bullet on every line, a hashtag block, "..." for suspense, a closing aphorism ("The gap is an opportunity."), a question he answers himself, a post over 250 words, neutral Spanish ("Súmate"), empty motivational tone, clickbait hooks, thread-bait.

**Comments** on other people's posts run under 10 words: the person, a reaction, a wish, one emoji at the end. "Grande [nombre]! A seguir creciendo 🦾" · "Tremendo laburo!" · "Great read! Thanks for sharing." · "Completely agree. Let's go!"

**X:** one idea per post, and a thread only when each post stands alone. This skill has no sample of his X posts, so ask for one before assuming more.

A direct message on either platform is a short email reply without the sign-off block: greeting, the point, the next step. For outreach: `Hola [nombre], vi que [un hecho de su perfil]. Pregunta directa: [la pregunta sobre su día].` Then what the product does in one sentence, and "Si te interesa, te cuento cómo en 10 minutos." 

## Forum and community replies

A technical answer in a public forum or a community channel, to someone who asked several things at once.

- **Answer their questions in their order,** each under a bold numbered label that repeats the question in a few words.
- **Start from their world.** When they come from another stack, a short table maps their terms to the ones used here before the answers begin.
- **Confirm what they got right** in one plain sentence: "Thinking of it as [their model] is right."
- **Say the limit in the first person:** "I haven't seen a standard for [that case]."
- **Link the official source for each claim,** and credit material you adapted.
- **Post the short version.** A longer draft stays in the notes for whoever asks a follow-up.

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
- **A deck that presents his own work** keeps each slide to three short points at most, and links the deliverable behind it.

## Video and ad scripts

**Skeleton:** `[Hook] → [Demo: one use case] → [Result] → [Call to action]`. The angle of the hook changes between variants; the skeleton doesn't.

- 25 to 35 seconds, written as a table: time, what is on screen, text on screen.
- It works on mute. Text on screen carries the message.
- One product screen per video. If a second feature shows up, cut it.
- The same call to action closes every variant.
- Each variant is a hypothesis about what moves the buyer (time, fear, money, peace of mind). Say which one, so the results can be read later.
- A production note says which shot does the work, and what must be verified with the product before filming.

**An explainer with voiceover** (2 to 5 minutes: a proof of concept, a product walkthrough) is a different piece. It is a document with one numbered heading per section, and under each a table with three columns: Time, On screen, Say. Each row is one caption. Pace it at about 150 words a minute, and open with one line that gives the total running time.

- **Arc:** what this is, the problem with a sourced quote, a real example, the evidence in numbers, the tool, the tool applied to the example, the result as before and after, the takeaway, where to learn more.
- **Say is written for the ear:** one sentence per row, under about 25 words. When a sentence runs across rows, "…" ends one row and opens the next.
- **On screen carries the numbers** ("17 → 0 committed files"). Say carries what they mean: "The build reads no committed files."
- **Say what does not change:** "The compiler and the application code stay exactly the same."
- **One spoken transition question is fine** ("So, what changed for [the example]?"), because the next row answers it on screen.
- **The link is shown, not read aloud:** "...at the link on screen." The last row can be the logo with no line.

**Captions for a product walkthrough** (how the product works, step by step, in Spanish): each step title starts with a verb in voseo ("Conectás tu estudio"), and each caption stays under 10 words ("Y lo hace con cada cliente.").

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
- **The one-sentence pitch** for networking has a fixed shape: `Hacemos que [quién] deje de [la tarea manual]: [qué pasa en su lugar].`
- **Use the words customers use for their problem,** not the category's. Customer quotes go in verbatim. Proof points are the documented ones only. For the owner of a firm, talk about outcomes for the business. For the person who uses the product, talk about their day.
- **The offer names the frictions removed:** "15 días de prueba, sin tarjeta. Si no te cambia la semana, lo dejás."
- **Never:** manufactured urgency, a pressure close, scripted empathy ("entiendo cómo te sentís").
- **A one-page version exists for every script.** If it doesn't fit on a page, it won't be used in the call.

## Commercial proposal

The document a prospect receives after the call, in Spanish. The email that carries it is under [Email](#email). It fits on one page (about 350 words), has no greeting and no sign-off, and takes no exclamation marks.

| Part | Convention |
|------|------------|
| Title | `Propuesta comercial [producto] para [cliente]`, then the date and his name on one line |
| First paragraph | The whole offer in one sentence, with the price in bold: "Proponemos que [cliente] sume [producto] por **$320.000 mensuales**, sin lock-in, con 6 horas de soporte técnico incluidas para [para qué]." A reader who stops there knows the deal |
| `## Qué es [producto]` | One sentence that starts with a verb, and one proof number. Then two run-in labels in bold. **El problema.** is the reader's day in their own numbers. **Cómo lo resolvemos.** is a list where each bullet starts with a verb in bold: "**Sincronizamos [la fuente] a diario**, para toda la cartera." One bullet per capability he gave you, and no more |
| `## Qué puede hacer [producto] por [cliente]` | What this client gets beyond a standard account, as a table with two columns: Canal, Qué habilita |
| `## Propuesta económica` | A table with three columns: Concepto, Detalle, Precio. Whatever is included says "Incluido". One sentence under the table says how the price changes over time and which index it follows |
| `## Condiciones comerciales` | Bullets with a bold label and one line each: **Facturación:**, **Pago:**, **Sin lock-in:** ("puede cancelar en cualquier momento con un mes de aviso") |
| `## Compromiso de roadmap y próximos pasos` | What he commits to build and by when ("dentro de los 2 meses desde la firma del contrato"). Then numbered steps that name who acts: "1. [Cliente] confirma la propuesta. 2. Firmamos el contrato y damos de alta la cuenta." |
| Who "you" is | The client by name, in the third person: "[Cliente] accede a...", "[Cliente] puede cancelar...". Not "ustedes" and not voseo |

- **Every price, hour, deadline, and condition is his.** If the price is missing, ask before drafting. A missing deadline or condition goes in as `[Completar: ...]`.
- **A section with nothing in his brief is left out.** A proposal with no roadmap commitment has no roadmap section.

## Weekly status update

The weekly deck for a client or a steering group. Three slides do the work: a cover, the week in review, and one highlight. It is denser than a talk slide, because the room reads it together.

| Part | Convention |
|------|------------|
| Cover | The meeting name, the date, and one line that lists what the week covered: "Roles, access lists, and new accounts." |
| Status | One label: On track, At risk, or Off track. Tomi sets it. If he didn't, ask |
| Shipped | Each item is titled with who can now do what, in the present tense: "Admins invite and remove members from the dashboard". Not "Member management improvements". A tag names the product area. One or two sentences follow: how it works, and the guardrail ("A removal that would leave the team without an owner is refused.") |
| Coming up | Short noun labels with the same area tag: "Review queue". No date unless he gave one |
| Highlight | One slide for the change worth showing, with a screenshot |

## Executive brief

One page for the people who decide: an account thesis, a strategy, a recommendation. He builds it on situation, complication, answer and the pyramid principle. The answer sits on top, and in his words "all other slides act as backup".

| Part | Convention |
|------|------------|
| Title line | The title, then the date and "by" his name |
| `## The thesis` | One sentence with the situation and the deadline: "[Client] already runs on our [product], but [the gap], and our contract ends on [date]." Then two bullets that say what to do: "We should [renew the core work] first, priced on its own." |
| `## What we know about [client]` | Three or four bullets. Each opens with a claim in bold ("**It already depends on us.**"), then the numbers behind it, each one linked to its source |
| `## Account strategy` | A table with two columns: Pillar, What we offer. Pillars are numbered, start with a verb in bold, and carry a date: "**1. Keep the core**, signed by [date]" |
| `## Risks and the decision` | One line that frames them: "Two risks are high, and both land inside the renewal window:". Each risk is a bold label, the evidence, then what we do and by when: "We name a second line of maintainers now." |
| Close | "**Left for later:**" with what is out and why. Then "**The decision:** approve [what] by [date]." |

- **Every number links to a source he can open.** No source, no number.
- **A deadline is a date:** "by 27 Nov", not "soon" or "in the coming weeks".

## Assumptions and rationale

The note that goes with a plan or an estimate and shows where each date and rule came from. It is in the first person: "I read it as...", "I use the same three dates here."

- **One table carries it:** Decision, Basis, Strength. Strength is one of three words: Sourced, Derived, Assumed.
- **Basis quotes the source and says where it is:** `Process guide, p.3: "every change is reviewed by two people"`. A derived row shows the arithmetic: "15 plus 5 is 20".
- **A reading of an ambiguous number gets its own short section:** the reading in bold, then the reasons as a numbered list where each item opens with its claim in bold.
- **Say what breaks if the assumption is wrong:** "if this assumption differs from expectations, the only affected result should be the number of days".
- **Where no source gives a date, don't promise one:** "So I don't promise a date here."

## Client kickoff deck

The deck that opens an engagement. It speaks to the client in the second person and says what happens, when, and what they have to do.

- **An overview slide lists the stages, numbered,** each with its dates ("Mon, Nov 16") and what the client does and receives: "You receive an initial report with all findings."
- **One slide per stage,** titled with its number.
- **One slide says who is who** and which channel to use.
- **One "Important" callout** holds the single hard rule of the engagement. One rule, not a list.
- **It closes on "Thank you!"**
- **Dates and rules come from the plan.** A date nobody gave is not on a slide. See [Assumptions and rationale](#assumptions-and-rationale).

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

**Prep notes for speaking** (an interview, a panel, a pitch) are cues, not a script: short sentences, active voice, one idea per line, in Simplified Technical English. He does not read them word for word. A pitch gets a 30-second and a 2-minute version.

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
