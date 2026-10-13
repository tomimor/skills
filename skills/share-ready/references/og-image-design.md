# Designing the og:image

What goes on the 1200×630 card, what stays off, and three real cards to
calibrate against. Read before filling `assets/og-template.html` or writing an
`opengraph-image.tsx`. Platform layouts change without notice and none
publishes a layout spec — the numbers below are observed, not guaranteed.

## What the platform already shows around the image

The card is never seen alone. Text the platform renders next to it is text
the image doesn't need:

| Platform | Renders next to the image |
|---|---|
| X | Headline overlaid on the image, "From domain" below the card |
| Facebook / LinkedIn | Domain + title (+ description sometimes) below |
| iMessage | Title + domain below |
| Bluesky | Title, description, domain below |
| WhatsApp | Title, description, domain beside/below |
| Slack | Favicon + `og:site_name` above, title + description |
| Discord | `og:site_name`, title, description above; theme-color strip |

## Rules

1. **Never print the URL or domain.** Every platform above already shows it,
   X lays its own text over the bottom of the image, and a 28px footer
   shrinks to ~10px when the card renders at 400px wide — unreadable noise.
   Exception: identifiers that *are* the content (GitHub's `owner/repo`).
2. **One short hook, not `og:title` verbatim.** 5–7 words, ≤60 chars. The
   full title lives in `og:title`; the image carries the punchline. For the
   homepage use the value proposition, not the `<title>`.
3. **Type that survives downscaling.** Headline 72–96px bold (floor 56px —
   rewrite the copy rather than go smaller), nothing below ~32px, contrast
   ≥4.5:1 on a solid or simple background.
4. **Safe zone.** 60–80px margins, keep the bottom ~100px and the corners
   free of anything critical (X overlays). Optional stress test: the key
   content should still read when center-cropped to 630×630
   (small WhatsApp/iMessage previews).
5. **One focal point.** Logo + headline. Use the logo, not the site name in
   text — the platform already prints the name. No decorative side bars or
   accent stripes (generic, template-looking). No description paragraph,
   date, author, stock photos or full-page screenshots.
6. **Full-bleed opaque background.** Transparent PNGs render on whatever the
   feed is (black on Discord/X dark mode). Light cards need enough contrast
   at the edges to not dissolve into a white feed.
7. **Weight ≤300KB, PNG or JPEG.** WhatsApp drops heavier images to a small
   thumbnail; avoid WebP (LinkedIn). Flat designs → PNG; gradients/photos →
   JPEG.
8. **Static vs per-page.** One static card for the homepage and generic
   pages. Collections (blog, docs, products, ~10+ pages) get a card per page
   from the *same* template, parametrized by title. Missing data falls
   back to the static brand card. A hand-designed image always wins over a
   generated one.
9. **Version the URL** (`og.png?v=2`) whenever the design changes.

## Three reference cards

Each represents a different archetype; none prints a URL. Verified live on
2026-10-13 — fetch them to look at, don't hotlink them into the project.

### 1. GitHub repository cards — per-page, data-driven

- Image: `https://opengraph.githubassets.com/1/vercel/next.js` (1200×600 PNG, ~36KB)
- White background, `owner/` regular + `repo` bold as the title, description
  in grey, owner avatar top-right, a row of 5 stats (contributors, issues,
  discussions, stars, forks), language-color bar along the bottom edge.
- Why it works: the variables are real data readable at a glance; strict
  hierarchy (title ≫ description ≫ stats); tiny file; generic fallback card
  when data is missing. Rendered with headless Chrome from HTML — the same
  approach as this skill.
- Writeup: [A framework for building Open Graph images](https://github.blog/open-source/git/framework-building-open-graph-images/) (GitHub Blog, 2021).

### 2. Linear — minimal brand card

- Image: `https://linear.app/api/og/main?title=Linear&v=4` (1200×630 PNG)
- Logo + wordmark centered on a dark gradient. Nothing else. Sub-pages reuse
  a sibling template with only the title swapped
  (`/api/og/generic?title=Changelog&v=5`).
- Why it works: one focal point, restrained palette, instantly recognizable
  in a feed; one template parametrized by `title`, with a `v=` cache-buster.
- Caveat: ~766KB — over the WhatsApp budget. Copy the composition, not the
  weight.

### 3. Josh W. Comeau — editorial blog post

- Image: `https://www.joshwcomeau.com/images/og-server-components.jpg` (2560×1350 JPEG, ~213KB)
- Indigo→lavender gradient, small handwritten-style eyebrow ("What's the deal
  with") over a very large two-line white title, a 3D illustration bleeding
  off the right edge.
- Why it works: the title *is* the image — huge, short, high contrast; the
  eyebrow adds voice without adding words; one illustration gives each post
  identity. Hand-made per post, so use it as the bar for composition; for an
  automatable editorial pattern see Vercel Docs (logo, big left-aligned
  title, monospace category pill on white — `vercel.com/api/docs-og?...`).
