# CSS Polish Details

A checklist of small, high-leverage CSS details that make interfaces feel finished. Each is a
one-line change with an objectively correct answer, so they belong in a review: easy to flag, easy
to apply, no judgment call. Adapted from
[make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) (MIT).

For each item below, report a finding only when the page is missing the detail. Use the standard
ui-review finding structure (location, severity, issue, recommendation, effort). These are almost
always **Low** severity and **trivial** effort.

## Concentric border radius

Nested rounded elements should share a common center: `outerRadius = innerRadius + padding`.
Matching radii on parent and child is the most common thing that makes a card look slightly off.

- **Look for**: a rounded container and a rounded child with the same `border-radius`.
- **Recommendation**: e.g. card `rounded-xl` (12px) with a `p-2` (8px) inner button → inner button
  should be `rounded-lg` (8px). Or outer `24px` with `8px` padding → inner `16px`.

## Tabular numbers

Any number that updates in place (counters, timers, prices, live stats) should use fixed-width
digits so the layout doesn't jitter as values change.

- **Look for**: dynamic numeric content without `tabular-nums`.
- **Recommendation**: add `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums`).

## Text wrapping

- **Headings**: `text-wrap: balance` evens out line lengths so a heading doesn't end on one orphan
  word.
- **Body text**: `text-wrap: pretty` prevents single-word orphans on the last line.
- **Look for**: multi-line headings or paragraphs with default wrapping.

## Font smoothing

On macOS, default font rendering can look heavy. Applying antialiasing to the root makes text
crisper.

- **Look for**: a root layout without font smoothing.
- **Recommendation**: add `-webkit-font-smoothing: antialiased` to the root/body element.
- **Caveat**: apply at the root only; don't sprinkle it per-component.

## Image outlines

Images blend into the surface at their edges. A subtle `1px` low-opacity outline gives consistent
depth and a clean edge.

- **Look for**: content images (avatars, thumbnails, screenshots) with no outline.
- **Recommendation**: `outline: 1px solid rgba(0, 0, 0, 0.1)` in light mode and
  `rgba(255, 255, 255, 0.1)` in dark mode.
- **Important**: the outline color must be pure black or pure white — never a tinted neutral (slate,
  zinc, etc.). A tinted outline picks up the surface color behind it and reads as dirt on the edge.
