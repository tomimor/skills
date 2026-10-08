# <Site name> -- Design reference

- **Source:** <url>
- **Captured:** <YYYY-MM-DD>
- **Vibe (one line):** <e.g. "sober institutional fintech: off-white paper, ink-black serif headlines, one electric accent">
- **Best for:** <kinds of projects this style suits>

![Desktop hero](screenshots/desktop-fold.png)

## 1. Design principles

3-5 bullets on what makes this look distinctive (contrast strategy, density, ornament, restraint).

## 2. Color

| Token | Value | Role | Where it appears |
|-------|-------|------|------------------|
| `--color-bg` | `#......` | Page background | |
| `--color-surface` | | Cards, raised panels | |
| `--color-text` | | Body text | |
| `--color-text-muted` | | Secondary text | |
| `--color-border` | | Hairlines, dividers | |
| `--color-accent` | | CTAs, links, highlights | |

Notes on gradients, overlays, dark sections, and contrast ratios.

## 3. Typography

| Role | Family | Weight | Size / line-height | Letter-spacing | Case |
|------|--------|--------|--------------------|----------------|------|
| Display (h1) | | | | | |
| Heading (h2) | | | | | |
| Subheading (h3) | | | | | |
| Body | | | | | |
| Small / caption | | | | | |
| Eyebrow / label | | | | | |
| Button | | | | | |

Font sources (files in `assets/fonts/`, or Google Fonts link) and fallbacks.

## 4. Layout & spacing

- Max content width, gutters, column grid.
- Spacing scale (observed values).
- Section vertical rhythm (padding between sections).
- Breakpoints (from media queries).

## 5. Shape, depth & texture

Border radii, border widths, shadows, blur/glass, background patterns, noise, grid lines.

## 6. Components

For each: screenshot crop or description, anatomy, measurements, states (hover/focus/active),
and a minimal snippet.

### Navigation
### Hero
### Buttons (primary / secondary / ghost / link)
### Cards
### Stats / metrics
### Logo wall / partners
### Forms & inputs
### Footer

## 7. Motion

Durations, easings, hover transitions, scroll reveals, keyframes.

## 8. Imagery & iconography

Photo/illustration style, icon style (stroke width, fill), logo usage.

## 9. Assets

| File | What it is |
|------|------------|
| `assets/...` | |

## 10. Assets & licensing

Who owns the fonts/images/logos; which are reference-only vs. reusable.

## 11. Do / Don't

- **Do** ...
- **Don't** ...

## 12. Starter tokens

```css
:root {
  /* paste the full token set here, ready to copy into a new project */
}
```
