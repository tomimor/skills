---
name: grill-me
description: >-
  Interviews the user relentlessly about a plan or design until reaching shared understanding, walking the decision tree
  one branch at a time. Use when the user wants to stress-test a plan, get grilled on their design, or mentions "grill me".
---

# Grill Me

Interview the user relentlessly about every aspect of their plan or design until you reach a shared understanding. Walk
down each branch of the design tree, resolving dependencies between decisions one-by-one.

## Critical rules

1. **One question at a time.** Never batch. Wait for each answer before moving on.
2. **Always use the AskUserQuestion tool.** Never list options inline in chat. Every grill question goes through
   `AskUserQuestion` with at least two concrete options.
3. **Always recommend an answer.** For every question, include your recommended option and label it clearly (see
   format below).
4. **Explore the codebase before asking.** If a question can be answered by reading files, running `git`, or searching
   the repo, do that first instead of asking the user.
5. **Resolve dependencies in order.** Don't ask about leaf decisions before their parents are settled.

## Workflow

### Step 1: Anchor the plan

Restate the plan or design as a **"How Might We"** problem statement, in 1-3 sentences, so both of you are working from
the same baseline. The HMW framing forces clarity on what's actually being solved -- not just what's being built. If the
plan is unclear or missing, ask one `AskUserQuestion` to pin down the goal before grilling further.

Example: instead of "we'll add a rate limiter," restate as "How might we keep abusive traffic from degrading API latency
for paying users?" -- now the grill has a target.

### Step 2: Build the decision tree (internally)

Before asking anything, sketch the tree of decisions in your head:

- **Roots:** the highest-level choices (architecture, scope, ownership, success criteria).
- **Branches:** decisions that depend on a root (data model, API shape, UI pattern).
- **Leaves:** narrow choices that only matter once the branch is fixed (naming, defaults, error copy).

Don't show the tree to the user. Use it to order questions.

### Step 3: Walk the tree, one question at a time

For each unresolved node, in dependency order:

1. **Try to resolve it from the codebase first.** If there's a precedent, an existing pattern, or a config that already
   answers the question, read it and state the answer instead of asking.
2. **Otherwise, ask via `AskUserQuestion`.** Use this format:

   - `prompt`: the question itself, followed by a 1-2 sentence rationale and your recommendation. Mark the recommended
     option with `(recommended)` in the option label.
   - `options`: 2-5 concrete, mutually exclusive choices. Always include an `Other / explain` option so the user can
     redirect you.
3. **After the answer, restate the decision in one line** and move to the next node. If the answer opens new branches,
   add them to the tree before continuing.

### Step 4: Stop conditions

Stop grilling when any of these is true:

- Every branch you can see is resolved or explicitly deferred.
- The user says stop, enough, or equivalent.
- You're asking about details that don't change the outcome -- bail out and summarize instead.

### Step 5: Summarize the shared understanding

When done, produce a short summary:

- The plan in 2-3 sentences (updated with the decisions made).
- A bullet list of resolved decisions: `Decision -> chosen option`.
- A bullet list of explicitly deferred items, if any.
- An **assumptions ledger**: unverified claims the plan is now betting on. For each, name the bet in one line and, if
  obvious, how it could be invalidated. Example: `Assumes Postgres can sustain 5k writes/s at our row size -- not
  benchmarked.` This is the negative space of the grill: what survived not because it was confirmed, but because nobody
  challenged it yet.

## Question Format

Every `AskUserQuestion` call must look roughly like this:

- **prompt**: one clear question, then `Recommended: <option>. Why: <one sentence>`.
- **options**: each option is a short phrase. The recommended one ends with `(recommended)`.
- **allow_multiple**: `false` unless the decision is genuinely multi-select (e.g. picking which validations to run).

Example shape (do not copy verbatim, adapt to the actual question):

- prompt: "Where should the rate limiter live? Recommended: edge middleware. Why: it stops abusive traffic before it
  hits app servers."
- options: `Edge middleware (recommended)`, `App-level middleware`, `Per-route decorator`, `Other / explain`.

## Anti-patterns

- Do NOT ask multiple questions in one message or one `AskUserQuestion` call when they aren't independent.
- Do NOT list options as a markdown bullet list in chat -- use the tool.
- Do NOT ask questions whose answers are already in the codebase.
- Do NOT skip the recommendation. "I don't know, what do you think?" is not a grill.
- Do NOT keep grilling once the tree is resolved. Wrap up.
- Do NOT make it adversarial. Direct and probing, not hostile.
- Do NOT yes-machine a weak premise. If the underlying goal is shaky, say so with specificity and propose a sharper
  framing -- don't grill the leaves of a bad tree.

## Adjacent skills

Full interrogation of a **plan/design's decisions** is this skill. For interrogating a **product idea's premise**
(is it worth building?), use `office-hours`. For a **single sharp blindspot** instead of a full grill, use
`whats-missing`.
