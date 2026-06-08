# Motion Design Principles (condensed)

Plan the *what and why* of the motion before the *how*. These defaults make an
animation read as intentional. Credit: adapted from LottieFiles'
[motion-design-skill](https://github.com/lottiefiles/motion-design-skill).

## Three pillars

- **Timing** — duration, rhythm, pacing.
- **Easing** — acceleration curves, which carry emotional tone.
- **Choreography** — how multiple elements sequence and coordinate.

## Timing: duration by interaction type

| Interaction | Duration |
|-------------|----------|
| Micro-interaction (hover, tap, toggle) | 150–300ms |
| State feedback (success, error, like) | 300–500ms |
| Page / view transition | 400–800ms |
| Looping decorative (loader, idle, ambient) | 800–2000ms |

Faster reads as responsive; too fast (<100ms) reads as a glitch. Slower reads as
premium; too slow (>800ms for feedback) reads as laggy.

## Easing: curve by emotional tone

| Curve | Feel | Use for |
|-------|------|---------|
| `ease-out` | Arrives and settles | Elements entering, delight, most UI |
| `ease-in` | Accelerates away | Elements exiting |
| `ease-in-out` | Calm, balanced | Loops, ambient, premium/stable mood |
| spring / overshoot | Playful, alive | Likes, pops, celebratory feedback |
| `linear` | Mechanical | Spinners, progress, anything constant-rate |

Keep overshoot small (5–15%) unless the brand is explicitly playful.

## Choreography

- **Hierarchy** — hero element moves first, supporting elements follow.
- **Stagger** — offset sibling elements by 0.05–0.2s so they don't move in lockstep.
- **Narrative** — group moves into a beginning (anticipation), middle (action), end (settle).

## Disney principles that matter most for UI

- **Anticipation** — a tiny wind-up before the main move sells weight (e.g. dip before a jump/pop).
- **Staging** — one focal action at a time; don't make everything move at once.
- **Slow in / slow out** — this is just easing; almost nothing should be `linear`.
- **Follow-through / overshoot** — let things slightly overshoot and settle instead of stopping dead.
- **Appeal** — simple, legible silhouettes; fewer layers animate more smoothly and export smaller.

## Eight-step check before building

1. **Intent** — what should the user feel/understand?
2. **Properties** — what animates (scale, opacity, position, path, rotation)?
3. **Timing** — total + per-step durations.
4. **Easing** — curve per move.
5. **Narrative** — order, anticipation, settle.
6. **Accessibility** — keep it subtle; assume `prefers-reduced-motion` may disable it.
7. **Performance** — few layers, vector only, no rasterized images, reasonable fps.
8. **Review** — play it back and check it reads at the real display size.
