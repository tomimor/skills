# Lottie Prompt Template

A Lottie prompt should name six things. Missing any of them forces the AI to guess, and guesses produce generic animations.

## The six slots

1. **Subject** — what is being animated. ("two dots", "a checkmark", "a heart")
2. **Motion** — what they do. ("scale up and down", "draws on then bounces", "pops, scatters particles, settles")
3. **Timing** — total duration and per-step durations. ("1.2s loop", "checkmark draws over 350ms")
4. **Easing** — the feel of each move. ("ease-in-out", "ease-out with slight overshoot")
5. **Choreography** — order and stagger for multi-element animations. ("dot 2 starts 0.15s after dot 1")
6. **Technical constraints** — canvas size, fps, loop behavior, colors. ("32×32, 30fps, infinite loop, #6C5CE7")

## Fill-in template

```
Create a Lottie animation: <SUBJECT> that <MOTION>.

Timing: <TOTAL DURATION>, with <PER-STEP TIMING>.
Easing: <EASING per move>.
Choreography: <ORDER + STAGGER, or "single element">.
Canvas: <WxH>, <FPS> fps.
Loop: <loop infinitely | play once | play once and hold last frame>.
Colors: <hex / brand tokens>.
Background: transparent.

Keep it lightweight (few layers, no rasterized images). After building,
play it back so I can review before export.
```

## Worked example (good prompt)

```
Create a Lottie animation: a 3-dot typing indicator where the dots scale 0.6 → 1 → 0.6.

Timing: 1.2s infinite loop.
Easing: ease-in-out on the scale.
Choreography: dot 1 leads, dot 2 starts 0.15s later, dot 3 starts 0.30s later.
Canvas: 48×16, 30 fps.
Loop: loop infinitely.
Colors: #6C5CE7.
Background: transparent.

Keep it lightweight. Play it back before export.
```

## Anti-examples (rewrite these)

| Vague prompt | Why it fails | Fix |
|--------------|--------------|-----|
| "Make a cool loading spinner" | No size, speed, count, or feel | Specify count, duration, easing, size |
| "Animate a heart" | No motion verb or timing | "heart pops to 1.2× then settles to 1× over 400ms, ease-out" |
| "Success animation, make it nice" | "nice" isn't buildable | "checkmark draws over 350ms ease-out, then a 1.1× pop, play once and hold" |

## Iteration phrasing

Iterate with small deltas, not full rewrites:

- "Too aggressive — reduce the overshoot to ~5%."
- "Slow the loop to 1.5s."
- "Add a 0.1s hold at full scale before it shrinks back."
- "Stagger feels mechanical — make it 0.2s and ease the second dot in."
