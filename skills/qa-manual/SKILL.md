---
name: qa-manual
description: >-
  Drives a local web app through Chrome MCP across the happy path plus 2-3
  edge cases, capturing screenshots, console errors, and network failures
  to produce QA evidence. Use when the user says "QA this", "test this
  manually", "verify the flow", "see if it works in the browser", or when
  exercising a change before claiming it works or producing evidence for
  verification-before-completion.
---

# QA Manual (web)

Structured manual QA of a web feature, driven through Chrome MCP. The output
is evidence — `verification-before-completion` is the gate that consumes it.

## When to use

After implementing a UI or web-flow change, before claiming it works. Pair
with `verification-before-completion`: this skill produces the evidence, that
one enforces the gate.

## Pre-flight

1. **Confirm the feature has a clear "what should happen."** If unclear, ask
   the user for the happy path in 1 sentence before opening the browser.
2. **Identify edge cases.** 2-3 conditions that would have broken before the
   fix: empty input, slow network, missing auth, invalid data, double-submit,
   logged-out state. Pick the ones that exercise the changed code, not
   generic ones.
3. **Make sure the app runs.** Check the manifest for a dev script
   (`pnpm dev`, `npm start`, `bun dev`, `make run`). Start it in a background
   shell if not already running. Confirm the URL responds before driving the
   browser.

## The QA pass

For each case (happy path + edges):

1. **Navigate.** Open the page where the feature lives via Chrome MCP's
   `navigate` tool.
2. **Reset state if needed.** Clear localStorage, cookies, IndexedDB if the
   test needs a clean slate. A test that only passes with stale state isn't a
   real test.
3. **Exercise the flow.** Click, type, submit — mimic a real user. Use
   Chrome MCP's interaction tools (`form_input` for form fields, plus
   whatever click/navigation tools the connected Chrome MCP exposes — check
   the available tool list if unsure).
4. **Capture three signals each step:**
   - **Visual:** capture a screenshot of the result using Chrome MCP's
     screenshot tool (or `javascript_tool` to capture if no direct tool is
     available).
   - **Console:** check `read_console_messages` for `error` / `warn` logs
     that weren't there before.
   - **Network:** check `read_network_requests` for failed responses
     (4xx/5xx) or unexpected calls.
5. **Compare to expected.** Did the right thing happen? If not, stop and
   diagnose. Don't keep clicking past a broken state.

## Output format

A report with:

- **Setup:** env (local dev URL, branch/commit, browser).
- **Cases run:** numbered list.
- **Results per case:** Pass / Fail with screenshot ref + console/network
  anomalies.
- **Verdict:** "Verified" or "Failed: <which case, what went wrong>".

Example:

> **Setup:** `localhost:3000`, branch `feat/oauth-callback`, Chrome MCP.
>
> **Cases:**
>
> 1. **Happy path:** login → callback → land on dashboard. **Pass.**
>    Screenshot captured.
> 2. **Edge — missing state param:** callback URL stripped of `state`.
>    **Pass.** Redirects to login with error toast. Screenshot.
> 3. **Edge — double-submit:** trigger callback twice in 200ms.
>    **Pass.** Idempotent, single session.
>
> **Console:** clean.
> **Network:** 1 expected 302 redirect, no errors.
>
> **Verdict:** Verified.

## Anti-patterns

- **Don't just screenshot the happy path and stop.** Edges are where bugs
  hide.
- **Don't ignore console warnings.** New `Warning:` lines mean adjacent code
  is degraded.
- **Don't skip the network tab.** A successful render with a silent 500 in
  the background is not passing.
- **Don't run QA on an outdated build.** If you changed code, restart the
  dev server before driving the browser.
- **Don't keep clicking past a broken state.** Stop, diagnose, fix or report.
- **Don't conflate "looks the same as before" with "works."** Visual
  regressions are one signal; behavior is what you're testing.

## Pair with

- `verification-before-completion` — the gate that consumes this skill's
  output before allowing a "done" claim.
- `ui-review` — broader visual / a11y / typography review. This skill is
  about behavior; that one is about polish.
- `verify-pr` — when verifying a whole PR end-to-end, not just one feature.
