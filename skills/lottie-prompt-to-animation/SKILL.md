---
name: lottie-prompt-to-animation
description: >-
  Turn an animation idea into a structured prompt and build it as a Lottie
  animation with an AI assistant via the Lottie Creator MCP, applying
  motion-design principles (timing, easing, choreography). Then log the prompt
  and its result so the team builds a reusable library. Use when the user wants
  to create, design, or prompt a Lottie animation, set up the Lottie Creator
  MCP, or register/log example animation prompts.
---

# Lottie Prompt to Animation

Two jobs in one skill:

1. **Write a good prompt** for a Lottie animation — structured, motion-aware, buildable.
2. **Build it and log it** — drive the Lottie Creator MCP to produce the `.lottie`/JSON, then record the prompt + result in `prompts-log.md` so we accumulate a reusable library.

Origin: this workflow follows LottieFiles' **Lottie Creator MCP** + **motion design skill** combo — describe the animation in natural language, the AI builds it layer-by-layer inside Lottie Creator, and the motion-design judgment makes it look intentional instead of random.

> The MCP gives the AI the *tools*. The motion-design principles give it the *judgment*. The prompt connects the two.

## When to use this vs. other animation skills

- **This skill** → *create a new* Lottie animation from a description, and log the prompt.
- A discovery/embed skill → *find an existing* animation on LottieFiles and drop it into a project.

If the user just wants an off-the-shelf loader, search the marketplace. Use this skill when the animation needs to be authored to spec.

## Prerequisites (one-time setup)

1. A LottieFiles account with **Creator** access (the MCP drives the editor on your behalf).
2. The **Lottie Creator MCP** registered with your assistant. Quick path with Smithery:

   ```bash
   npx -y smithery install mcp-server-lottiefiles --client claude
   ```

   Manual path: open the assistant's MCP config (`Settings → Developer → Edit Config` in Claude Desktop, or `~/.claude.json` / `.mcp.json` for Claude Code) and add the `mcp-server-lottiefiles` entry, then restart the assistant.
3. Confirm the MCP tools are live before building — list tools and verify the LottieFiles server connected. If it didn't, stop and fix setup; do not hand-write JSON as a silent fallback.

See [references/setup.md](references/setup.md) for config details and troubleshooting.

## Workflow

### Step 1 — Lock the intent (1-2 questions max)

Before writing anything, pin down what the animation is *for*. Ask only what the request doesn't already answer:

- **What is it?** (loader, success check, like/heart burst, progress bar, character idle, icon transition…)
- **Where does it live?** (button, empty state, onboarding, splash) — drives size, loop, and duration.
- **Mood?** (snappy/playful, calm/premium, mechanical/precise) — drives easing and timing.

Don't over-interview. One round, then move.

### Step 2 — Spec the motion

Translate the intent into concrete motion before prompting. Pull values from [references/motion-design.md](references/motion-design.md):

- **Duration** — micro-interaction 150–300ms, feedback 300–500ms, looping decorative 800–2000ms.
- **Easing** — `ease-out` for things arriving/delighting, `ease-in-out` for calm/stable, spring/overshoot for playful.
- **Choreography** — if multiple elements, define the order and stagger (hero first, supporting follows).
- **Loop** — loop vs. play-once, and whether it holds on the last frame.

### Step 3 — Write the prompt

Use the template in [references/prompt-template.md](references/prompt-template.md). A good Lottie prompt names six things: **subject, motion, timing, easing, choreography, technical constraints** (canvas size, loop, fps, color tokens). Vague prompts ("make a cool loader") produce vague animations; specified prompts ("32×32, 1.2s loop, 2 dots scaling 0.6→1 with ease-in-out, 0.15s stagger, brand purple #6C5CE7") produce buildable ones.

Show the user the prompt and confirm before building — the prompt is the cheap thing to iterate on.

### Step 4 — Build via the MCP

Hand the finalized prompt to the Lottie Creator MCP and let it construct the animation layer-by-layer in Creator. Then:

- Preview / play it back.
- Iterate in small deltas ("the dots pop too hard — soften the overshoot, slow the stagger to 0.2s") rather than rewriting the whole prompt.
- Export the `.lottie` / Lottie JSON when it's right.

### Step 5 — Log it (the registry)

Append an entry to [prompts-log.md](prompts-log.md) for every animation worth keeping. This is the point of the skill: a growing, copy-pasteable library of prompts that are known to work. Record the final prompt (not the first draft), the motion spec, the result link, and 1-2 notes on what made it work. See the template at the top of that file.

## Quick reference

| Thing | Default |
|-------|---------|
| Micro-interaction duration | 150–300ms |
| Feedback (success/error) duration | 300–500ms |
| Looping decorative duration | 800–2000ms |
| Arriving / delight easing | `ease-out` |
| Calm / stable easing | `ease-in-out` |
| Playful easing | spring / slight overshoot |
| Icon canvas | 24×24 or 32×32 |
| fps | 30 (or 60 for snappy micro-interactions) |

## Files

- [references/prompt-template.md](references/prompt-template.md) — the fill-in-the-blanks prompt structure.
- [references/motion-design.md](references/motion-design.md) — condensed timing/easing/choreography principles (credit: LottieFiles motion-design-skill).
- [references/setup.md](references/setup.md) — Lottie Creator MCP setup + troubleshooting.
- [prompts-log.md](prompts-log.md) — the registry of prompts and their resulting animations.
