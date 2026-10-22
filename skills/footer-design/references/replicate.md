# Footer reference

## Brief to filters

Run `footer_design.py taxonomy` for the current list. Styles describe the look, types the kind of
site. Common mappings:

| The user says… | Styles | Type |
|----------------|--------|------|
| clean, simple, quiet, "like Linear/Vercel" | `minimal`, `small-type`, `calm` | `saas`, `startup` |
| dark mode, techy | `dark`, `monochromatic`, `grid` | `saas`, `ai`, `development` |
| big, loud, brand moment, giant wordmark | `large-type`, `bold`, `typographic` | `agency`, `studio` |
| playful, friendly | `fun`, `colorful`, `illustrative`, `pastel` | `ecommerce`, `d2c-direct-to-consumer` |
| premium, editorial, luxury | `elegant`, `typographic`, `photographic` | `fashion`, `magazine`, `editorial` |
| lots of links, sitemap | `grid`, `cards`, `bento-box` | `business`, `saas`, `ecommerce` |
| wow factor, interactive | `interactive`, `animated`, `webgl`, `gsap`, `3d` | `agency`, `portfolio` |
| raw, experimental | `brutalist`, `unusual`, `retro` | `portfolio`, `design` |
| personal site | `minimal`, `typographic` | `portfolio`, `personal` |

Prefer 2 styles plus 1 type. A single filter returns hundreds of results; four filters rarely match
anything.

## Footer patterns

Name the pattern when you shortlist so the user compares structures, not just colors.

| Pattern | Shape | Holds | Effort |
|---------|-------|-------|--------|
| **Single row** | logo · a few links · © on one line | ≤ 8 links | low |
| **Link columns** | brand block + 3–5 labelled columns, legal bar below | 10–40 links | low |
| **Giant wordmark** | links up top, brand name set edge to edge at the bottom | 5–20 links | low–medium |
| **CTA-first** | big headline + button or newsletter, links secondary | 5–20 links | low |
| **Big links** | few links at 32px+, often stacked | ≤ 10 links | low |
| **Bento / cards** | links, newsletter, socials, status in a grid of tiles | 10–30 links | medium |
| **Illustrated** | a scene, artwork, or pattern carries the mood | any | medium (needs an asset) |
| **Reveal** | footer pinned under the page, uncovered on scroll (`position: sticky` + z-index) | any | medium |
| **Interactive** | cursor-reactive type, physics, canvas or WebGL | few | high |

## Anatomy checklist

Write these down for the chosen footer before building. Values come from `inspect_footer.mjs`
output where it still matches the screenshot, otherwise estimated from the screenshot. Desktop
screenshots are ~2100px wide for a 1440px layout (divide measurements by ~1.46); mobile ones are
~786px wide for a ~390px viewport (divide by ~2).

- **Container**: max width, side padding, top/bottom padding, background (color, gradient, image)
- **Grid**: columns per breakpoint (`grid-template-columns`), gaps, alignment, what spans full width
- **Regions, in order**: brand, CTA/newsletter, link groups, socials, legal, extras (status, clock, locale)
- **Type**: family role (sans/serif/mono), size, weight, line height, letter spacing, case for each
  role: wordmark, headline, group label, link, legal text
- **Color roles**: background, primary text, muted text, divider, accent, hover state
- **Dividers**: rules between regions, their color and weight
- **Interactions**: link hover (underline, color, slide), button states, scroll reveal, motion
  timing. Respect `prefers-reduced-motion`.
- **Mobile**: from the mobile screenshot: stacking order, accordion or not, what's hidden, and
  wordmark scaling (often `clamp()` or `vw` units)

## Rebuild notes

- Giant wordmarks: size with `font-size: clamp(...)` or a `vw` value tuned so the word spans the
  container; set `line-height: 0.8` or so and `letter-spacing` negative; check overflow at 320px.
- Reveal footers: wrap the page content above with a background and `position: relative; z-index: 1`,
  then make the footer `position: sticky; bottom: 0`.
- Link columns: use a semantic `<nav aria-label="Footer">` with a heading and `<ul>` per group.
- Illustrations and 3D: substitute the user's own asset, a CSS/SVG pattern, or leave a clearly marked
  placeholder. Never ship the source's artwork.

## Accessibility checks

- `<footer>` landmark (only one `contentinfo` per page); grouped links inside `<nav aria-label>`
- Muted text still meets 4.5:1 contrast (footers often fail here: check the gray-on-black legal line)
- Visible focus state on every link and input; tab order matches visual order
- Newsletter input has a real `<label>`; social icon links have accessible names
- Touch targets at least 24×24px on mobile, ideally 44px for the main links
- Animations off or reduced under `prefers-reduced-motion: reduce`
