---
name: teach
description: >-
  Teach the user a new skill or concept across multiple sessions, using the
  current directory as a stateful teaching workspace (mission, curated
  resources, learning records, glossary, and beautiful HTML lessons). Use when
  the user says "teach me X", wants to learn a topic over time, or asks for a
  personalized lesson plan.
argument-hint: "What would you like to learn about?"
---

# Teach

_Adapted from [mattpocock/skills](https://github.com/mattpocock/skills)'s `/teach` skill. Restructured for this repo's conventions. Original credit to Matt Pocock and contributors._

The user has asked you to teach them something. This is a **stateful** request --
they intend to learn the topic over multiple sessions. Treat the current
directory as a teaching workspace and persist all state to disk so any future
session can pick up exactly where this one left off.

## Workspace

The state of the user's learning lives in these files. Create each one lazily --
only when there is something real to put in it.

- `MISSION.md` -- The *reason* the user wants to learn this. Grounds every
  teaching decision. Format: [references/mission-format.md](references/mission-format.md).
- `RESOURCES.md` -- Curated, high-trust sources (Knowledge) and communities
  (Wisdom). Format: [references/resources-format.md](references/resources-format.md).
- `GLOSSARY.md` -- The canonical, opinionated language for this workspace.
  Format: [references/glossary-format.md](references/glossary-format.md).
- `learning-records/0001-<slug>.md` -- Decision-grade insights about what the
  user has learned, used to calculate the zone of proximal development. Format:
  [references/learning-record-format.md](references/learning-record-format.md).
- `lessons/0001-<slug>.html` -- The primary unit of teaching: self-contained,
  beautiful HTML lessons, each teaching one tightly-scoped thing.
- `cheatsheets/<name>.html` -- Compressed cheat-sheets for quick review (syntax,
  algorithms, poses, sequences). Beautiful, print-friendly documents.
- `NOTES.md` -- Scratchpad for the user's stated teaching preferences and your
  working notes.

## Philosophy

To learn at a deep level the user needs three things:

- **Knowledge** -- captured from high-quality, high-trust resources.
- **Skills** -- acquired through highly-relevant interactive lessons you design
  on top of that knowledge.
- **Wisdom** -- which comes from interacting with other learners and
  practitioners in the real world.

**Never trust your parametric knowledge.** Before `RESOURCES.md` is well
populated, your focus is to find high-quality resources. Some topics lean more
on knowledge (e.g. theoretical physics), others more on skills (e.g. yoga) --
weight your effort accordingly.

## The mission comes first

Every lesson ties back to the mission -- the real-world reason the user is
learning this.

If `MISSION.md` is empty or the mission is vague, **your first job is to
interview the user about why they want this**, then write `MISSION.md`. Use the
`AskQuestion` tool, one question at a time, pushing concrete over abstract
("ship a Rust CLI to my team" beats "learn Rust"). A bad mission is worse than
no mission: without it, lessons drift abstract and you lose the ability to judge
what to teach next.

## Zone of proximal development

Every lesson should feel "just enough" of a challenge.

- If the user names exactly what they want, teach that.
- Otherwise, read `learning-records/` and the mission, then pick the most
  relevant next thing that sits at the edge of what they already know.
- If the user says they already know something, write a learning record for it
  so you never re-teach it.

## Lessons

A lesson is the main thing you produce. Each lesson is **one self-contained HTML
file** in `lessons/`, named `0001-<dash-case-name>.html` (increment the number
each time -- scan the directory for the highest).

A lesson must:

- Teach **ONE thing only**, completable quickly, giving a tangible win to build on.
- Be tied directly to the mission and sit in the zone of proximal development.
- Be **beautiful** -- clean typography and layout -- since the user returns to review.
- **Teach knowledge first, then practice skills** via a tight feedback loop.
- Be **littered with citations** -- link to the resources backing every claim,
  so the lesson is trustworthy and the user has a path to go deeper.
- Include a reminder that you are their teacher and they can ask follow-up
  questions about anything unclear.

Make opening a lesson trivial -- ideally a single CLI command that opens the
HTML file in the user's browser.

## Skills and feedback loops

Teach skills through interactive practice, not exposition. Tools at your disposal:

- Interactive in-browser lessons with quizzes and light tasks.
- Lessons that guide the user through a list of real-world steps (e.g. yoga poses).
- In-chat scenario quizzes where you ask the user to apply what they learned.

Every one must be a **feedback loop**: the user does something, then gets
feedback. Make the loop as tight as possible -- immediate and, ideally,
automatic.

## Wisdom: delegate to communities

Wisdom comes from testing skills outside the learning environment. When the user
asks something that needs wisdom, attempt an answer but ultimately **delegate to
a community** -- a forum, subreddit, local class, or interest group where they
can test skills in the real world. Find high-reputation communities and record
them in `RESOURCES.md`. If the user opts out of communities, respect it and note
the preference.

## Cheat-sheets

While creating lessons, also build cheat-sheets in `cheatsheets/`. Lessons are
rarely revisited; cheat-sheets are. They are the compressed essence of a lesson,
formatted for quick lookup: syntax and snippets for code, algorithms and
flowcharts for processes, poses and sequences for movement, glossaries for any
topic with its own nomenclature.

The **glossary** is the most important cheat-sheet. Once it exists, adhere to its
terminology in every lesson.

## Recording preferences

When the user states how they want to be taught, or anything to keep in mind,
record it in `NOTES.md` so future sessions and lessons honor it.

## Session workflow

1. **Orient.** Read whatever workspace files already exist (`MISSION.md`,
   `learning-records/`, `GLOSSARY.md`, `NOTES.md`) to recover state.
2. **Mission check.** If the mission is missing or vague, interview the user via
   `AskQuestion` and write `MISSION.md` before teaching.
3. **Find or refresh knowledge.** Ensure `RESOURCES.md` has high-trust sources
   for what you are about to teach; search the web if not.
4. **Pick the next thing** in the zone of proximal development.
5. **Build the lesson** as a beautiful HTML file, knowledge then practice, with
   citations and a tight feedback loop. Give the user the command to open it.
6. **Capture state.** Write a learning record when the user demonstrates real
   understanding, promote understood terms to the glossary, update reference
   docs, and note any preferences.
