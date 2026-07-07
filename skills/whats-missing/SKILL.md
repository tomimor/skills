---
name: whats-missing
description: >-
  Surfaces the single most important blindspot in a plan, decision, or situation by checking whether the frame is
  right, generating candidates across 8 lenses (hidden constraints, false assumptions, second-order effects,
  stakeholders, blast radius, base rates, time horizon, counter-positions), then either committing to one or
  returning a calibrated "no blindspot" when none is load-bearing -- never a list of risks. Use when the user asks
  "what am I missing", "what's the most important thing I'm missing about this situation or decision", "what's my
  blindspot", "what's the biggest risk I'm not seeing", or wants a single sharp second opinion before committing.
---

# What's Missing

Surface the single highest-leverage thing the user hasn't seen, or honestly say there isn't one. Not a list of risks.
Not a brainstorm. One blindspot -- or a calibrated no -- with an observable signal and a cheap test.

## Critical Rules

1. **One blindspot, or a calibrated no.** Either pick the single most important thing and commit, or use the
   no-blindspot template. A ranked list is a dodge. So is a stretched "best of weak candidates" pick.
2. **Check the frame first.** Before searching inside the user's decision, ask whether the decision itself is the right
   unit of analysis. If the user is solving the wrong problem, that IS the blindspot -- name it and stop.
3. **Evidence over generality.** Pull from what's in front of you: the diff, the plan, prior messages, the codebase.
   "Consider security" is not a blindspot -- "your auth check assumes the cookie is signed, and the new middleware sets
   it before the signer runs" is.
4. **Predict the observable.** State what the user would see, measure, or hear if the blindspot is real. If you can't
   name the signal, you don't have a blindspot -- you have a vibe.
5. **One cheap test.** End with the smallest action that confirms or kills the blindspot. Hours, not days.
6. **Ask only if blocked.** If one clarifying question would unlock a sharper answer, ask it via `AskUserQuestion`.
   Never ask more than two before answering.
7. **No sycophancy, no hedging.** Banned phrases: "you might want to consider", "have you thought about", "have you
   considered", "is there a chance", "one thing to think about", "it could be worth". Replace with: "the thing you're
   missing is X" or "I don't see one".
8. **Calibrated no beats invented yes.** If you had to stretch a lens to produce a candidate, the answer is no
   blindspot. The skill's value compounds across invocations; a fabricated answer poisons that compounding.

## Workflow

### Phase 0: Frame check

In one sentence, ask yourself: "Is the user solving the right problem, or is the decision itself the wrong unit of
analysis?" If the frame is suspect (optimizing the wrong metric, making a decision that doesn't need to be made,
treating a strategy question as a tactical one), name that as the blindspot and skip the rest of the workflow.

### Phase 1: Ground the situation

Restate the decision in **one short paragraph** in your own words. This forces you to notice what's vague. If the
restatement reveals a gap that would change the answer (you don't know who the user is, what the deadline is, what
success looks like), ask one `AskUserQuestion`. Otherwise inventory in your head:

- The decision or situation, as stated.
- Constraints the user named.
- Constraints the user did NOT name but you can infer (deadlines, headcount, reversibility, audience).
- Evidence available: code in this repo, prior messages, attached docs.

### Phase 2: Generate candidates across lenses

Use these as prompts to think with, not boxes to fill. Aim for 5-8 candidates -- skip any lens where the candidate
required stretching. Don't show this list to the user.

| Lens | Probe |
|------|-------|
| **Hidden constraint** | A limit (technical, legal, contractual, social, financial) the user didn't mention but exists. |
| **False assumption** | A premise the plan rests on that hasn't been verified. Includes assumptions about what has or hasn't changed since the last similar call. |
| **Second-order effect** | A consequence one step removed from the immediate change. What breaks downstream? |
| **Stakeholder** | A person or group affected who isn't in the room. Who finds out and how? |
| **Blast radius** | Reversibility plus cost-if-wrong. Is the user treating a one-way door as two-way? Is the failure mode sized correctly? |
| **Base rate** | What usually happens to projects, decisions, or people in this reference class? Is the user the exception or the rule? |
| **Time horizon** | What looks fine at 1 week and bad at 6 months? What looks bad now and fine later? |
| **Counter-position** | The most credible person who'd disagree -- what would they say? What evidence would they cite? |

### Phase 3: Calibrate and commit

Score each candidate on two axes:

- **Impact-if-true** -- would knowing this change the decision, not just decorate it?
- **Non-obviousness** -- has the user almost certainly already considered this? Drop it if yes.

Then apply the **stretch test**. A candidate is "stretched" if it doesn't name a specific artifact, person, number,
file, or premise from the actual situation. If **3 or more** of your candidates were stretched, the answer is **no
blindspot** -- use the no template in Phase 4. Do not pick the strongest of weak candidates.

Otherwise, pick the single highest-scoring candidate. If two tie, pick the one with the cheapest test.

### Phase 4: Deliver

#### When you have a blindspot

Reply with this shape, no headers, no preamble:

> **The thing you're missing:** <one sentence, specific, names the actual artifact / person / number / file.>
>
> **Why it matters:** <2-3 sentences. What changes if this is true? What's the cost of missing it?>
>
> **What you'd see if it's real:** <one observable signal -- a log line, a user response, a metric, a calendar entry.>
>
> **Cheapest check:** <one action under 2 hours that confirms or kills it.>

#### When you don't (equally weighted, not a fallback)

Reply with this shape -- same length, same commitment:

> **The thing you're missing:** Nothing load-bearing that I can see.
>
> **Why I'm confident:** <2-3 sentences. Which lenses came up empty and why. Cite what's already accounted for in the
> plan.>
>
> **What would change my mind:** <one specific signal -- a number, a person, a doc -- that would flip me.>
>
> **Cheapest gut-check anyway:** <under 30 minutes, optional, for the user to stress-test their own confidence.>

Stop after either shape. Do not append "let me know if you want more" or "happy to go deeper".

### Phase 5: Follow-ups (only on request)

If the user reacts and asks for the next one, surface #2 in the same shape. Otherwise, the skill is done.

## Worked example

Plan: "add a 1-hour cache to `/users` to cut DB load."

> **The thing you're missing:** `/users` returns the caller's own profile, so a shared cache keyed only on URL will
> serve user A's record to user B until the entry expires.
>
> **Why it matters:** Cross-tenant data leak in a hot endpoint. A 1-hour TTL means hundreds of leaked profile views
> per cached entry before eviction. The cache key in the diff is the URL, not URL plus auth subject -- that's the bug.
>
> **What you'd see if it's real:** In staging, log in as user A, request `/users`, log out, log in as user B, request
> `/users`. You see user A's profile.
>
> **Cheapest check:** Run that four-step sequence in staging in 10 minutes.

## Anti-patterns

- Do NOT return a numbered list of 5 risks. That's a status report, not a blindspot.
- Do NOT use any banned phrase from rule 7.
- Do NOT cite generic categories ("security", "performance", "edge cases") without naming the specific artifact.
- Do NOT ask more than two clarifying questions before committing.
- Do NOT validate the plan. The user did not ask if the plan is good. They asked what's missing.
- Do NOT manufacture a blindspot when the situation is well-scoped. The calibrated no is a first-class outcome, not
  a fallback for laziness -- it fires when the stretch test fires.
- Do NOT include code unless the blindspot is literally a line of code -- words are cheaper.

## Adjacent skills

A **single sharp blindspot** is this skill. For a full interrogation of a plan/design's decisions, use `grill-me`.
For stress-testing a **product idea's premise**, use `office-hours`.
