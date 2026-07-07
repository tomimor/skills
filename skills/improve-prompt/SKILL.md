---
name: improve-prompt
description: >-
  Critique and rewrite a prompt using prompt engineering best practices:
  clarity, examples, XML structure, role, explicit output format, and
  positive-over-negative instructions. Asks 1-3 targeted questions to fill
  missing context, then returns a short critique plus a drop-in rewritten
  prompt. Use when the user wants to improve, refine, audit, fix, or rewrite
  a prompt.
---

# Improve Prompt

Take a prompt and make it better. Critique it against a short list of model-agnostic prompting principles, then produce a drop-in rewritten version. Ask the user only for context the prompt itself does not already provide.

## Core Principles

The audit lens. Every finding in the critique maps back to one of these.

1. **Clear and direct.** A new employee with no context could follow the prompt. If they'd be confused, the model will be too. Be specific about the desired output and constraints.
2. **Context behind instructions.** Explain *why* a constraint exists when it isn't obvious. "Your response will be read aloud, so never use ellipses" beats "NEVER use ellipses."
3. **Examples (few-shot).** Include 3-5 relevant, diverse examples for non-trivial tasks. Wrap them in `<example>` tags, grouped under `<examples>`. Cover edge cases.
4. **XML structure.** When a prompt mixes instructions, context, examples, and variable inputs, wrap each type in its own tag (`<instructions>`, `<context>`, `<input>`, etc.) so the model can't confuse them.
5. **Role.** A single sentence assigning a role focuses tone and behavior. "You are a senior backend engineer reviewing a pull request."
6. **Positive instructions over negatives.** Tell the model what to do, not what to avoid. Replace "do not use markdown" with "respond in plain prose paragraphs."
7. **Match prompt style to desired output.** Want plain text? Strip markdown from the prompt. Want JSON? Show the schema. The output mirrors the prompt's form.
8. **Action vs suggestion explicitness.** "Suggest improvements" gets suggestions. "Make these edits" gets edits. Pick one on purpose.
9. **Long context: data on top, query at the bottom, ground in quotes.** For 20k+ token inputs, place documents first, then instructions. Ask the model to quote relevant passages before answering.

## Workflow

### Step 1: Read the input prompt verbatim

Treat the prompt as source code. Do not paraphrase. If the user has not pasted the prompt yet, ask them to paste it before doing anything else.

### Step 2: Gap analysis (silent)

Run the prompt through the nine principles. Note which are missing, weak, or contradictory. Look specifically for:

- Vague verbs ("help with", "deal with", "handle")
- Negative-only instructions ("don't", "never", "avoid") with no positive alternative
- Missing output format spec
- Missing role
- Long context with no XML structure
- Examples that are too uniform (model will overfit to the pattern)
- Action verbs that don't match the user's actual intent

The **Anti-Patterns** section below lists concrete surface forms of these categories.

### Step 3: Ask 1-3 questions via `AskQuestion`

Only ask about context that is not already in the prompt. Skip any question the prompt already answers. Typical questions, in priority order:

1. **Use case / target system.** "Where will this prompt run? Standalone chat, API pipeline, agent loop, eval harness?"
2. **Desired output format.** "What should the output look like? Plain prose, JSON, structured report, code-only?"
3. **Success criteria.** "What does a good response look like? What failure mode are you trying to fix?"

One question per `AskQuestion` call. Always include an "Other / explain" option. Stop asking as soon as you have enough to rewrite.

### Step 4: Produce the critique

Short, scannable, capped at ~7 findings. Format:

```
## Critique

| Severity     | Finding                                | Principle           |
|--------------|----------------------------------------|---------------------|
| Must fix     | No output format specified             | Clear and direct    |
| Should fix   | "Don't be verbose" with no positive    | Tell what to do     |
| Nice to have | Examples all use the same edge case    | Examples (few-shot) |
```

Severities:

- **Must fix** — the prompt will likely produce wrong or unusable output as-is.
- **Should fix** — the prompt works but leaks tokens, drifts in style, or under-specifies.
- **Nice to have** — polish, naming, ordering.

If more than 7 findings, group them ("Multiple negative-only instructions throughout — see rewrite") rather than enumerating each.

### Step 5: Produce the rewrite

A single fenced code block, drop-in ready. No prose between the critique and the rewrite other than a one-line header. The user should be able to copy-paste the block straight into their system prompt.

After the block, add a 2-4 line **What changed** note summarizing the biggest moves (role added, XML structure introduced, format spec made explicit, examples added).

## Rewrite Rules

The rewrite must:

- **Preserve the user's intent verbatim** where they stated it. If they wrote "must be under 200 tokens," keep that exact constraint.
- **Front-load the role and the goal.** Open with the role assignment, then the task.
- **Use XML tags** for any prompt that mixes instructions, context, examples, or variable inputs. Use consistent, descriptive tag names.
- **State output format explicitly.** Even if it's "plain prose with no markdown," say it.
- **Replace negative-only instructions** with positive ones. Keep the negative only when the positive alternative is unclear.
- **Put long reference material at the top, the query at the bottom.** Wrap documents in `<document>` tags with `<source>` metadata when there are multiple.
- **Match the style of the desired output.** If the output should be plain text, write the prompt in plain text. If JSON, include a schema.
- **Include 3-5 diverse examples** for non-trivial extraction, classification, or formatting tasks. Skip examples for simple instructions.

The rewrite must NOT:

- Add features or constraints the user did not request.
- Bloat the prompt with hedging language ("please try to", "if possible").
- Introduce Claude-, GPT-, or model-specific knobs the user did not ask for.

## Anti-patterns to fix on sight

- **"Be helpful / be concise / be professional"** — vague. Replace with concrete behavior or examples.
- **"Don't hallucinate"** — tell the model what to do instead: "Only state claims supported by the provided documents. If unsure, say 'not in the documents.'"
- **"You are an AI assistant"** — generic role, no signal. Give a specific role tied to the task.
- **Stacked negatives** ("don't do X, don't do Y, never do Z") — convert to a positive spec or a single `<constraints>` block.
- **Examples wrapped in prose** — pull them into `<example>` tags so the model can find the boundary.
- **Output format described in adjectives** ("a clean, well-formatted response") — show a literal template instead.

## Rewrite Self-Check

Before delivering the rewrite, confirm:

- [ ] Role is assigned in one explicit sentence
- [ ] Goal is stated before any constraints
- [ ] Output format is explicit (schema, template, or concrete description)
- [ ] XML tags used wherever instructions / context / examples / input are mixed
- [ ] No instruction is negative-only when a positive alternative exists
- [ ] Examples (if used) are 3-5, diverse, and wrapped in `<example>` tags
- [ ] Long reference material is at the top; the actual query is at the bottom
- [ ] Prompt style matches the desired output style
- [ ] User's verbatim constraints are preserved
- [ ] Critique cites the specific principle each finding violates
