# Footer reference

## Brief to filters

**Hard filters** must match, so use them only for real requirements: `--theme`, `--palette`, `--links`,
`--min-groups`, `--max-effort`, `--max-height`, `--need`, `--not`. Repeating one gives alternatives
(`--links some --links many`, `--need type:art --need type:museum`). **Soft filters** only rank:
`--pattern`, `--feature`, `--type` and `--text` count double; `--style` and `--typeface` count once.
Content needs (hours, payment icons, an address) are `--feature`s; `--text` matches word starts in
names, descriptions, summaries, mobile notes and link labels (not feature names). A result must
match at least one soft filter. Run `vocab` for counts; tags with a handful of
footers barely help. When a hard filter hides a strong match, search lists it under **near misses**:
read them, since a pastel or dark footer often repaints fine.

| The user says… | Hard | Soft |
|----------------|------|------|
| black and white | `--palette bw` (not `--style monochromatic`, which means one hue) | |
| dark / "keep it dark" | `--theme dark` (add `--palette bw` if no color at all) | |
| light, calm, warm | `--theme light --theme colorful` (pastels repaint to light) | `--style calm --typeface serif --typeface mixed` |
| one brand color | `--palette mono-color` | `--theme colorful` if the color should fill the footer |
| we have a big sitemap (20+ links) | `--min-groups 4 --links some --links many` | `--pattern link-columns --pattern sitemap` |
| just a few links | `--links few` | `--pattern single-row --pattern centered-stack --pattern big-links` |
| premium dev tool, "like Linear/Vercel/Stripe" | `--theme dark --not feature:3d --not feature:marquee --not pattern:illustrated` | `--style minimal --style small-type --type web-app --type ai --type development --feature clock-or-status --feature giant-type` |
| big brand moment | `--need pattern:giant-wordmark` (37% of the catalog, so add more filters) | `--feature giant-type --style large-type` |
| faint wordmark behind the links | | `--feature giant-type` (these are usually tagged link-columns or sitemap, not giant-wordmark) |
| grow the list, capture leads | | `--pattern cta-first --feature newsletter` |
| agency, "let's talk" | | `--pattern cta-first --feature cta-button --feature email-or-phone --type agency` |
| warm, playful, friendly | `--palette mono-color --palette multicolor` | `--pattern illustrated --style fun --style colorful --typeface display` |
| premium, editorial, luxury | | `--typeface serif --typeface mixed --style elegant --style typographic` |
| confident type, institutional, "not corporate" | | `--pattern giant-wordmark --feature giant-type --style typographic --style large-type --typeface serif --typeface display` |
| restaurant, café, venue | `--need feature:hours` if hours are a must (19 footers have them) | `--feature hours --feature address --feature booking-cta --text reserve --text menu --type food-drink` |
| studio, gym, spa, clinic (classes, appointments) | | `--feature booking-cta --feature hours --feature address --feature app-badges --text class --text appointment --type health --type fitness --type beauty` |
| museum, gallery, nonprofit | `--links some --links many` for big sitemaps | `--feature hours --feature address --feature newsletter --feature locale-switcher --text donate --text member --text visit --type art --type museum --type community` |
| online store | `--links some --links many --min-groups 3` | `--feature payment-icons --feature app-badges --feature locale-switcher --feature perks --feature newsletter --feature mobile-accordion --type ecommerce` |
| SaaS / app | | `--feature theme-toggle --feature clock-or-status --feature app-badges --type web-app --type ai` |
| modular, app-like | | `--pattern bento --feature cards --feature inset-panel` |
| wow factor, interactive | | `--feature 3d --pattern illustrated --style interactive --style webgl` |
| ship it this afternoon | `--max-effort low` | |
| it can't take over the page | `--max-height 500` | |
| no gimmicks | `--not feature:3d --not feature:marquee --not pattern:other` | |
| the user's industry | | `--type food-drink`, `--type finance`, `--type fashion`… (`vocab` lists them) |

**The catalog is design-led.** Agencies, studios and startups dominate. Store furniture is rare
(2 footers show payment icons, 3 a perks row, 6 app badges), and venue, museum and nonprofit
footers are few and mostly small. `booking-cta` includes "book a call/demo", so add `--text` words
for the booking you mean (`class`, `table`, `reserv`, `appointment`) and read the labels. When the right kind of site lacks the
capacity, shortlist both: an on-domain footer to adapt ("its structure, plus a link row") and an
off-domain one that already holds the content. Say which is which.

**Named reference sites.** Try `search --text <name>` first, and check that a hit is really that
brand (a slug containing the word may be something else). If the site isn't in the catalog (most
big brands aren't), say so plainly, name the traits you're matching instead (e.g. "dark, quiet type,
four columns, a status pill"), and search for those. Once you have one good match, `similar <slug>`
finds its neighbors and lists the traits they share.

**Too many results** (50+): add a hard filter (`--palette`, `--max-effort`, `--not ...`) rather than
reading further down. **Too few** (under 5): allow alternatives on a hard filter or drop it. `--all`
makes soft filters required: every `--feature` and `--text`, and one value per other kind.

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
- `inspect_footer.mjs` captures footers taller than the viewport in a taller window (it says so in
  the summary), because scroll-revealed footers hide whatever is out of view. Heights set in `vh`
  may read slightly larger there.

## Wordmark fit

A giant wordmark is sized to its word: at the same width, its height scales roughly with
1 / letters. Compare the source's word with the user's name before recommending it.

- **Name unknown:** ask, or assume about 8 letters and say so in the fit note.
- **Much longer name** (half again or more): stack it on two lines, let it span more columns, give
  its row less height, or use a condensed face. An acronym or monogram is another option.
- **Much shorter name:** add tracking or a symbol (® ©), or set a short slogan instead of the name,
  rather than letting it grow taller than its row.
- **Mobile:** decide separately; stacking or cropping at the edge is usually right.

## Accessibility checks

- `<footer>` landmark (only one `contentinfo` per page); grouped links inside `<nav aria-label>`
- Muted text still meets 4.5:1 contrast (footers often fail here: check the gray-on-black legal line)
- Visible focus state on every link and input; tab order matches visual order
- Newsletter input has a real `<label>`; social icon links have accessible names
- Touch targets at least 24×24px on mobile, ideally 44px for the main links
- Animations off or reduced under `prefers-reduced-motion: reduce`
