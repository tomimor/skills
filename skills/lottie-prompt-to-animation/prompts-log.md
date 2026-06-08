# Lottie Prompt Log

A registry of animation prompts that are known to work, plus the result each one
produced. Append a new entry every time you build a Lottie worth keeping. The
point: stop re-deriving prompts — copy a proven one and tweak it.

Newest entries on top. Use the template below.

## Entry template

```
## <short name> — <YYYY-MM-DD>

- Intent: <what it's for / where it lives>
- Mood: <snappy | calm | playful | mechanical>
- Motion spec: <duration> · <easing> · <choreography> · <canvas> · <loop>

Prompt (final):
> Create a Lottie animation: ...

- Result: <link to .lottie / Creator project, or path in repo>
- Notes: <1-2 lines on what made it work / what to avoid>
```

---

## heart-burst — 2026-06-08

- Intent: "like" feedback on a button tap; plays once per tap.
- Mood: playful.
- Motion spec: 450ms · ease-out + small overshoot · heart leads, particles follow · 32×32 · play once, hold last frame.

Prompt (final):
> Create a Lottie animation: a heart that pops, emits a quick burst of small
> particles, then settles.
>
> Timing: 450ms total — heart scales 0 → 1.2 → 1 over the first 300ms, particles
> fire at 150ms and fade by 450ms.
> Easing: ease-out with ~10% overshoot on the heart; particles ease-out then fade.
> Choreography: heart leads; 6 particles radiate outward starting at 150ms,
> staggered 0.02s.
> Canvas: 32×32, 30 fps.
> Loop: play once and hold the last frame (heart at scale 1).
> Colors: heart #FF4D6D, particles #FFB3C1.
> Background: transparent.
>
> Keep it lightweight (vector only, no images). Play it back before export.

- Result: _build via Lottie Creator MCP, then paste the .lottie / Creator link here._
- Notes: The two things that make it read as "alive": the small overshoot on the
  heart (don't exceed ~15% or it looks rubbery) and firing the particles slightly
  *after* the heart starts (150ms) rather than simultaneously. Holding the last
  frame matters so the like stays "filled" after the tap.
