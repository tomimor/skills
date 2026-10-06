# Scene API

`$WORK/scene.js` sets `window.SCENE`. build.mjs inlines it into `player.html` after the kit, so `window.BPKit` is available. The worked example is `template/scene.js`.

## Contents

- [SCENE](#scene)
- [Steps](#steps)
- [Marks](#marks)
- [Geometry](#geometry)
- [How changes are detected](#how-changes-are-detected)
- [Explain mode example](#explain-mode-example)
- [Player](#player)

## SCENE

| Field | Default | Meaning |
|---|---|---|
| `title` | — | Player title; also names the playhead saved in the viewer's browser. |
| `steps` | — | 1–6 steps, one per UI decision, in order. Redesign needs one more state than steps (`s0` … `sN`). |
| `view` | whole screen | `{x, y, w, h}`: the part of the captured screen the video shows, still 1:1 (at least 200 × 150). Use it for small changes (a menu, a dialog) so they stay readable at GitHub's ~900 px width. Marks and focus rects stay in screen coordinates. |
| `K` | 1.4 | Slow factor: a step lasts `dur × K` seconds. |
| `holdBefore` | 1.5 | Seconds on the base state before step 1. |
| `holdAfter` | 3 | Seconds on the last state. |
| `fade` | false | Fade the app in at the start and out at the end, for a GIF that loops softly. Off, the first frame (GitHub's video preview) is the base UI and the last is the head UI. Needs `holdBefore` ≥ 1 and `holdAfter` ≥ 1.5. |
| `mode` | redesign | `'explain'` annotates one state; implied when only `s0` exists. |

## Steps

| Field | Default | Meaning |
|---|---|---|
| `key` | `step<n>` | Unique id. |
| `name` | key | 2–4 words, shown uppercase in the text band. |
| `prob`, `fix` | — | Redesign sentences. Explain: `what`, `why`. |
| `focus` | changed area + 16 px | `{x, y, w, h}` in screen pixels. Required in Explain mode. |
| `dur`, `c1` | 5.6, 3.8 | Step length and reveal start, in local seconds (`c1` ≥ 2.8, `dur` ≥ `c1` + 1.2). The construct runs from 1.9 to `c1` − 0.6, then the finished blueprint holds until `c1`. |
| `into` | — | `'nearest'`: removed controls, images and boxes in focus fly into the nearest new one. A key or text: all fly into that element. |
| `pushes` | guessed | Translated elements: `'context'` draws them dimmed (content pushed by an insertion), `'change'` draws them as the step's change (rows re-sorted). By default rows moving both ways are a change, and a block moving one way is context. |
| `handles` | merge targets + restyled | Keys or texts of the 1–3 elements that get selection handles; `[]` for none. |
| `marks` | — | `(ph, A, B, K) => svgString`, drawn in the blueprint above the step's wires. |

## Marks

`marks(ph, A, B, K)` runs every frame of the step's blueprint phase and returns SVG markup (a string) in screen coordinates.

`ph` holds the step's phase values, each 0 → 1 unless noted:

| Key | Meaning |
|---|---|
| `t` | Local time in seconds (not 0–1): 0 at focus start, `c1` at the reveal. |
| `lines` | Guides draw in (t 1.2 → 2.0). |
| `before` | "Before" labels: in with the guides, out by c1 − 1.0, so they never overlap the "after" labels in the same spot. |
| `p` | Construct progress (t 1.9 → c1 − 0.6). |
| `done` | "After" marks draw in (t c1 − 1.0 → c1 − 0.6), so they are complete for the hold before the reveal. The fix (or why) sentence appears with them. |
| `wipe`, `rev` | Scan line down (blueprint in), scan line down again (reveal). The reveal wipes the top of the screen first, so marks near the top disappear first. |
| `focus`, `hl`, `call`, `fix` | Focus dim, outline draw, text band, fix sentence. |

`A` and `B` are the geometry of the state before and after the step (the same state in Explain mode). `K` is `window.BPKit`:

| Helper | Draws / returns |
|---|---|
| `K.tw(t, a, b, ease?)` | 0 → 1 as `t` goes from `a` to `b` (default ease in-out cubic). `K.M.enter`, `K.M.move`, `K.M.draw` are the easings. |
| `K.label(x, y, text, {op, anchor, size, color})` | Mono uppercase label; `y` is the baseline. |
| `K.guide(x1, y1, x2, y2, op)` | Dotted alignment guide. |
| `K.dimH(x1, x2, y, text, draw, {op})` | Horizontal dimension line with end ticks; label above. |
| `K.dimV(y1, y2, x, text, draw, {op, side: 'left'})` | Vertical dimension line; label to the right (or left). |
| `K.line(d, draw, {op, arrow, color})` | SVG path that draws in with `draw`; `arrow` adds a head once drawn. |
| `K.curve(a, b)`, `K.ctr(r)` | Path `d` for an S-curve between two points; centre of a rect. |
| `K.group(r, text, op)` | Dashed rect around a group, named above it. |
| `K.num(x, y, n, op)` | Numbered accent badge for reading order. |
| `K.handles(r)`, `K.wire(r, opts)` | Selection handles; a raw wire (rect with optional `text`, `round`, `dashed`). |
| `K.pad(r, px, py?)`, `K.union(rects)`, `K.LR(a, b, p)`, `K.lerp(a, b, p)` | Rect helpers. |

Common timings:

```js
// "Before" label: in with the blueprint, out before the "after" marks come in.
K.label(x, y, '4 ACTIONS · SAME WEIGHT', { op: ph.before })
// "After" mark: complete before the reveal.
K.dimH(x1, x2, y, '1 PRIMARY + OVERFLOW', ph.done)
// A label in a band the construct will fill: gone before the push starts at t = 1.9.
K.label(x, y, 'BELOW THE FOLD ↓', { op: ph.lines * (1 - K.tw(ph.t, 1.8, 2.0)) })
```

## Geometry

Each state's `sN.json` holds the captured elements, in viewport pixels:

| Field | Meaning |
|---|---|
| `k` | Key: `ctl:Invite member`, `text:NAME`, `box:3 invitations are pending`, `img:logo.svg`, `rule:<owner>:b`. Built from `data-bp`, `data-testid`, `aria-label` or a hand-written `id` (framework ids such as `:r1:` are skipped), else from the element's text, a field's placeholder or name. Repeats get `~2`, `~3`. |
| `an` | 1 when nothing names the element: its key is its tag and longest class (`box:span.dot`), and the kit pairs it by place, not by key. |
| `t` | `box` (visible background, border or shadow), `ctl` (button, input, select, role=button/tab/...), `img` (img, svg, canvas, video, background image), `text` (one run per line, inline pieces merged), `rule` (a divider: a one-sided border, or a filled element at most 3 px thin). |
| `x`, `y`, `w`, `h` | Rect, clipped by scrolling ancestors. Rules have `w` or `h` 0. |
| `txt`, `fs`, `fw` | Text as rendered, font size and weight. Password fields read `••••••••`; checkboxes, radios and sliders have no text. |
| `r`, `bg`, `bc`, `c`, `sh`, `al`, `pl`, `pr` | Radius, background, border and text colour (as sRGB, whatever CSS colour syntax the app uses), shadow, control label alignment (`l`, `c`, `r`, from the computed style) and padding. |
| `z`, `oc` | Overlay layer: elements inside an open menu, dialog or sticky bar that covers other content have `z` ≥ 1, and the overlay's own box has `oc: 1`. The kit hides the page under it. |
| `g` | The row or list item the element belongs to (a number per state). Repeated cells pair within their own row. |

Lookups on `A` and `B`:

- `get(q, kind?)`: the first element whose key equals `q`, or whose text equals `q` (case-insensitive), or else whose key or text contains `q`. Throws when nothing matches, so a typo shows up as a player error.
- `find(q, kind?)`: the same, returning `null` instead of throwing.
- `all(q, kind?)`: every match; `q` can also be a predicate `e => …`.
- `within(rect, kind?)`: elements whose centre lies in `rect`.
- `els`, `W`, `H`: all elements and the viewport size.

To name an element the app leaves anonymous, set `data-bp` on it in a setup script: `page.evaluate(() => document.querySelector('.seat-meter').dataset.bp = 'seat-meter')`.

## How changes are detected

For each Redesign step the kit compares state `A` (before) with `B` (after):

1. A key (without its `~n`) that occurs once in each state pairs directly. Repeated keys (the cells of a list, icons, anonymous boxes) pair within the same row, following where that row's uniquely named members went, else by the smallest move between elements of similar size. Leftovers of one kind that overlap by ≥ 60% pair too (a container whose text-derived key changed, a label whose text changed, a divider on the same line), and so do nearby controls and labels where one text extends the other ("Delete workspace" → "Delete workspace…").
2. Pairs with the same rect, text and style form the static blueprint. Same rect, other colours or weight: **restyled** (handles in focus). A different rect or text: **moved**. Translated only, same size: a **push**, unless rows move both ways (a sort), which makes them moves.
3. Unpaired `A` elements are **removed**, unpaired `B` elements **added**.
4. Without `focus`, the step frames the area of its removals, additions and moves, padded by 16 px.

If a step animates something it shouldn't, the states differ more than the step's code does: check with compare.mjs and fix the capture or the step split, not the scene.

## Explain mode example

```js
window.SCENE = {
  title: 'New billing page (PR #212)',
  mode: 'explain',
  steps: [
    {
      key: 'plan', name: 'Plan first',
      what: 'The current plan sits above everything else.',
      why: 'Most visits are "what am I paying?"; the answer needs no scrolling.',
      focus: { x: 272, y: 120, w: 1128, h: 180 },
      handles: ['ctl:Change plan'],
      marks(ph, A, B, K) {
        const card = A.get('box:Pro plan');
        return K.dimH(card.x, card.x + card.w, card.y - 12, 'FULL WIDTH · 1128', K.tw(ph.t, 2.0, 2.6, K.M.draw))
          + K.label(card.x, card.y + card.h + 20, '1 PRIMARY ACTION', { op: ph.done });
      },
    },
    // ...one step per further module
  ],
};
```

## Player

`player.html` is one self-contained file (states, kit, scene and engine inlined); it plays offline in any browser.

- Controls: play/pause (click or space), ← → ±1 s (shift ±5 s), Home/End, the scrubber, one button per step. The playhead is remembered in the viewer's browser.
- URL parameters: `?t=12.5` opens at that time, `?autoplay=0` opens paused, `?render=1` shows the bare 1:1 stage (what render.mjs records).
- `window.BP.seek(t)` draws time `t` and resolves once it is painted; `window.BP.meta()` returns the duration, canvas, app and view rects, key frames and rest frames. render.mjs uses both.
