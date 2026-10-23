# Footer reference

## Brief to filters

**Hard filters** must match, so use them only for real requirements: `--theme`, `--palette`, `--links`,
`--min-groups`, `--max-effort`, `--max-height`, `--typeface`, `--not`. Repeat one to allow
alternatives (`--links some --links many`). **Soft filters** only rank: `--pattern`, `--feature`,
`--style`, `--type`, `--text`. Run `vocab` for counts; tags with a handful of footers barely help.

| The user says… | Hard | Soft |
|----------------|------|------|
| black and white | `--palette bw` (not `--style monochromatic`, which means one hue) | |
| dark / "keep it dark" | `--theme dark` (add `--palette bw` if no color at all) | |
| one brand color | `--palette mono-color` | `--theme colorful` if the color should fill the footer |
| we have a big sitemap (20+ links) | `--min-groups 4 --links some --links many` | `--pattern link-columns --pattern sitemap` |
| just a few links | `--links few` | `--pattern single-row --pattern centered-stack --pattern big-links` |
| premium dev tool, "like Linear/Vercel/Stripe" | `--theme dark` or `--palette bw` | `--style minimal --style small-type --type web-app --type ai --type development --feature clock-or-status` |
| big brand moment | | `--pattern giant-wordmark --feature giant-type --style large-type` |
| grow the list, capture leads | | `--pattern cta-first --feature newsletter` |
| agency, "let's talk" | | `--pattern cta-first --feature cta-button --feature contact-details --type agency` |
| warm, playful, friendly | `--palette mono-color --palette multicolor` | `--pattern illustrated --style fun --style colorful --typeface display` |
| premium, editorial, luxury | `--typeface serif --typeface mixed` | `--style elegant --style typographic` |
| modular, app-like | | `--pattern bento --feature cards --feature inset-panel` |
| wow factor, interactive | | `--feature 3d --pattern illustrated --style interactive --style webgl` |
| ship it this afternoon | `--max-effort low` | |
| it can't take over the page | `--max-height 500` | |
| no gimmicks | `--not feature:3d --not feature:marquee --not pattern:other` | |
| the user's industry | | `--type food-drink`, `--type finance`, `--type fashion`… (`vocab` lists them; often the most relevant single signal) |

**Named reference sites.** Try `search --text <name>` first. If the site isn't in the catalog (most
big brands aren't), say so plainly, name the traits you're matching instead (e.g. "dark, quiet type,
four columns, a status pill"), and search for those. Once you have one good match, `similar <slug>`
finds its neighbors.

**Too many results** (50+): add a hard filter (`--palette`, `--max-effort`, `--not ...`) rather than
reading further down. **Too few** (under 5): allow alternatives on a hard filter or drop it.

## Footer patterns

Name the pattern when you shortlist so the user compares structures, not just colors. These are the
`--pattern` values.

| Pattern | Shape | Holds | Typical effort |
|---------|-------|-------|----------------|
| `single-row` | logo · a few links · © in one short band | ≤ 8 links | low |
| `centered-stack` | logo, links, socials, legal stacked in one centered column | ≤ 12 links | low |
| `link-columns` | brand block + 2–4 labelled groups, legal bar below | 10–30 links | low |
| `sitemap` | 5+ groups, dense mega footer | 20–80 links | low |
| `giant-wordmark` | brand name set edge to edge, links above or below | 5–20 links | low–medium |
| `cta-first` | big headline + button or newsletter, links secondary | 5–20 links | low |
| `big-links` | a few links at 28px+, often stacked | ≤ 10 links | low |
| `bento` | links, newsletter, socials, status in a grid of tiles | 10–30 links | medium |
| `split` | two contrasting halves or panels | any | low–medium |
| `illustrated` | a scene, artwork, or pattern carries the mood | any | medium–high (needs an asset) |
| `image-led` | a photo or video fills the footer | few | medium (needs an asset) |

Two behaviors that a screenshot can't show but are worth offering: a **reveal** footer (pinned under
the page and uncovered on scroll, `position: sticky` plus z-index) and an **interactive** one
(cursor-reactive type, physics, canvas or WebGL; high effort).

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
- Physics piles and canvas toys (often Matter.js): a staggered CSS drop of SVG shapes gets most of the
  look at a fraction of the cost; offer real physics as an upgrade, and keep it off under
  `prefers-reduced-motion`.
- Slogans or wordmarks shipped as an image: rebuild them as live text so they stay crisp and
  translatable; match the width of the source face, or the composition falls apart.
- Cards that overlap the section above (negative top margin): give the band above enough bottom
  padding, and check the overlap on mobile, where it's usually smaller.

## Accessibility checks

- `<footer>` landmark (only one `contentinfo` per page); grouped links inside `<nav aria-label>`
- Muted text still meets 4.5:1 contrast (footers often fail here: check the gray-on-black legal line)
- Visible focus state on every link and input; tab order matches visual order
- Newsletter input has a real `<label>`; social icon links have accessible names
- Touch targets at least 24×24px on mobile, ideally 44px for the main links
- Animations off or reduced under `prefers-reduced-motion: reduce`
