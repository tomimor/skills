# Blueprint rules

The grammar of the piece, adapted from [blueprint-animation](https://github.com/moguzbulbul/blueprint-animation) (CC BY-NC 4.0). The kit implements the timing, the drawing and the construct motion. The scene author owns the focus rects, the marks and the wording, and checks the result against these rules.

## Contents

- [Per-step sequence](#per-step-sequence)
- [What keeps it smooth](#what-keeps-it-smooth)
- [Drawing style](#drawing-style)
- [Text and overlap](#text-and-overlap)
- [Explain mode](#explain-mode)
- [QA before handing over](#qa-before-handing-over)

## Per-step sequence

Never skip a phase. Local step time `t` is authored seconds ÷ K (K = 1.4). With the defaults (`dur` 5.6, reveal start `c1` 3.8) a step lasts 7.8 s.

| Phase | t | What happens |
|---|---|---|
| Problem | 0 → 0.9 | Everything except the focus rect fades toward white (≈ 78%). A thin grey outline draws around the focus. The text band shows number, name and problem. |
| Blueprint in | 0.95 → 1.75 | A cyan scan line sweeps top → bottom. Above it, the WHOLE app is a blueprint drawing; below it, the real UI of the previous state. |
| Construct | 1.9 → c1 − 0.6 | Only what the step changes moves. The static blueprint behind it dims 0.7 → 0.3. Guides and "before" labels (`ph.before`) draw; the labels leave by c1 − 1.0. |
| Finished | c1 − 1.0 → c1 | "After" marks draw in (`ph.done`) and hold, so they can be read before the reveal. The fix sentence fades in beside the problem. |
| Reveal | c1 + 0.05 → c1 + 0.85 | The scan line sweeps again. Above it, the real UI of the new state; below it, the blueprint. |
| Hold | → dur | The fix sentence stays while the real UI holds. Then the focus fades out. |

A step with many moving parts gets more room with a larger `dur` and `c1` (keep `dur − c1` ≥ 1.8 so the hold can be read).

## What keeps it smooth

The kit does these; marks must not fight them.

- The real UI switches to the next state only while the blueprint fully covers it, so the swap is invisible. render.mjs checks every rest frame against its screenshot.
- Content pushed by an insertion moves first. Then removals (collapse in place, or fly into their `into` target), changes and arrivals, staggered 0.06–0.12 s by row so wires never cross.
- When a step also adds, removes or reshapes something, pushed content draws dimmed: it is context. Rows that trade places (a sort) are the change and draw at full strength, each cell moving with its own row.
- An overlay (open menu, dialog) hides the page under it, in the blueprint as on screen. It opens before what moves inside it and closes after.
- A merge target appears only after the wires flying into it have hidden their text.
- Nothing jumps from 0 to 1 in under ~0.3 s while visible. Time marks with `tw` windows of at least 0.3 s.
- The video opens on the base UI and ends on the head UI at full opacity: GitHub shows the first frame as the preview, and the last one stays on screen after playback. `fade: true` softens the seam of a looping GIF instead.

## Drawing style

- Draw on white: line colour cyan-ink `#0B8FC2`, fill `#2ACCFF14`, guides dotted `2 4`.
- **Everything on screen** turns into the blueprint: sidebar, nav, header, buttons, rows, cards, pills. The kit draws every captured element, so a missing part means the capture missed it: fix the capture, don't draw it by hand.
- Each wire uses its element's exact captured rect, so the blueprint lines up with the real UI. Wires carry their real text, as rendered (`text-transform` applied). Headings of 22 px and up draw as outlined text.
- Selection handles (5 px squares) go on the 1–3 wires that matter in that step, never more.
- Corner ticks on the focus rect, dotted alignment guides through key edges, one dimension line per step with a short UPPERCASE mono label ("1 PRIMARY + OVERFLOW", "CENTERED COLUMN · 760").
- Labels: 11–12 px mono, letter-spacing .06em, no stroked halo.

## Text and overlap

Checked on every render (§6 of SKILL.md):

- No text on a moving wire: wire text fades out within the first few pixels of a move and back in within the last few. Leaving wires never show their text again.
- Wires that disappear collapse in place (height → 0) or fly into their merge target, never across other content.
- Labels live in empty bands (above the focus, between sections), never on top of a row or a card. A band that a push fills during construct is empty only before the push: fade that label out by t = 2.0.
- "After" marks use `ph.done`: the reveal wipes from the top, so a mark that is still drawing in at `c1` is gone before anyone reads it.
- Focus rects and their corner ticks run through empty space, not through text. A rect that reaches the bottom edge runs past it.
- Only one step's text is visible at a time, in the band below the app: `[number badge · NAME] [problem] [fix]`.
- No title card and no end card unless the user asks for them.

## Explain mode

For a PR that adds a new screen: capture only `s0` (the head) and set `mode: 'explain'`. Nothing is redesigned; the blueprint is an x-ray that shows the reasoning behind each module.

| Phase | t | What happens |
|---|---|---|
| Focus | 0 → 0.9 | As Problem above. The band shows number, name and **what**. |
| Blueprint in | 0.95 → 1.75 | As above. |
| Annotate | 1.9 → c1 − 0.6 | Nothing moves. The module's wires stay in place with handles; the static blueprint dims. Marks draw in, staggered 0.08–0.12 s: guides → dimension line → labels, all complete by `c1` − 0.6 (`ph.done`). |
| Reveal | c1 + 0.05 → c1 + 0.85 | The scan line brings back the SAME real UI. |
| Hold | → dur | The **why** sentence, in since the marks completed, stays; then the focus fades out. |

Pick the marks from the reason, 1–3 per step plus one dimension line:

| The reason is about | Draw |
|---|---|
| Hierarchy, the primary action | Handles on the primary wire only; label "1 PRIMARY · 2 SECONDARY" |
| Alignment, grid, column | Dotted guides through the shared edges; dimension "CENTERED COLUMN · 760" |
| Spacing, rhythm | Dimension lines across the gaps: "GAP · 24" |
| Grouping | `group()` around the group, naming it: "DEAL CONTEXT" |
| Reading order, flow | `num()` badges in reading order, joined by one arrowed `line()` |
| Size, hit area | A dimension on the element: "40 × 40" |
| Progressive disclosure | A label on the entry point: "14 EMPTY FIELDS BEHIND THIS" |
| Colour, state | A label naming the rule: "RED ONLY FOR OVERDUE" |

The number goes in the dimension label and the reason in the text band. Labels on the drawing name the rule, not the pixels. The real UI before Focus and after Hold is pixel-identical for every step (render.mjs checks it).

## QA before handing over

1. render.mjs passes: no player error; the first frame, every rest frame and the last frame match their states.
2. In the filmstrip and key frames: no text on text at any mid-construct frame; no moving wire crosses a label; moving cells stay with their own row.
3. Every counter, date and number in labels and sentences matches the screen, and the sentences claim only what the diff does.
4. Each step moves only what its sentence describes (compare.mjs regions per step).
5. The last state is the PR head (`git diff --quiet` in §3).
6. At GitHub's ~900 px width the changed part is readable; otherwise crop with `view`.
