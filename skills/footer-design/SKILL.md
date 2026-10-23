---
name: footer-design
description: >-
  Picks a website footer to replicate from footer.design (Footr Design) and rebuilds it in the
  user's code. Use it for any request to design, redesign, restyle or copy a site footer, or for
  footer ideas and real examples: a footer.design entry or another site's footer they like, a
  footer with too many links to tidy, a new footer for a Next, Astro, Shopify or plain HTML site,
  or a footer that must hold specific content (newsletter, opening hours, address, booking,
  payment icons, language switcher). Bundles a catalog of ~780 real footers, each described
  and screenshotted, that can't be reached otherwise; filters by layout, theme, palette, link
  capacity and effort; shows a visual shortlist; then measures the chosen footer, rebuilds it
  with the user's brand and compares it with the source. Consult it before designing a footer from memory.
  Not for small fixes to an existing footer (copyright year, overlap bugs, accessibility
  audits), email footers, checkout payment badges or legal disclaimer copy.
---

# Footer Design

Pick a footer from [footer.design](https://www.footer.design) and replicate it. Three phases:
**brief → shortlist → rebuild**. The user picks; you do the legwork and the looking. If the user
already names a footer.design entry or a footer they want, skip to Phase 3.

`$SKILL` is the directory containing this SKILL.md. The helper is stdlib-only Python:

| Command (`python3 $SKILL/scripts/footer_design.py …`) | What it does |
|--------|--------------|
| `vocab` | Every filter value with how many footers have it. Run once per session |
| `search [filters] [--compact] [--limit N]` | Matches with pattern, theme/palette, links, height, effort and a layout summary |
| `similar <slug> [hard filters]` | Footers sharing the most layout traits with one footer ("more like #2"), still within e.g. `--min-groups 3` |
| `site <slug>...` | Everything known about a footer: links, tags, screenshot URLs, full layout description |
| `download <slug>... --out DIR [--sheet FILE.png]` | Desktop + mobile screenshots as PNG/JPG; `--sheet` adds numbered contact sheets, 5 footers each (needs Pillow) |
| `gallery <slug>... --out FILE.html [--notes notes.json] [--pick slug] [--stretch slug] [--brief "..."] [--title "..."] [--images DIR]` | Numbered HTML contact sheet for the user, with your fit notes and the recommendation marked |
| `compare <slug> --mine DIR` | Source footer next to your rebuild, desktop and mobile, plus height differences; writes into DIR (needs Pillow) |
| `node $SKILL/scripts/inspect_footer.mjs <url> DIR` | A footer at 1440 and 390 px: screenshots, `footer-summary.txt`, full styles in JSON (needs Playwright). Works on live sites and on your own build |

Search has **hard filters**, which must match (repeat one to allow alternatives), and **soft
filters**, which rank results (pattern, feature, type and text count 2, style and typeface 1; ties:
newest first). A result must match at least one soft filter, so many vibe filters can narrow too;
the header shows how many passed the hard filters alone. `--all` makes soft filters required: every
feature and text word, one value per other kind. When a hard filter hides a strong match, search
lists it under **near misses**; an empty search lists what each filter matches on its own.

| Hard | Values |
|------|--------|
| `--theme` | `light` `dark` `colorful` `gradient` `image` (judged by eye) |
| `--palette` | `bw` (grays only) `mono-color` (one hue + neutrals) `multicolor` (measured from pixels) |
| `--links` | `few` (≤8) `some` (9–20) `many` (21+), estimated. Near a boundary, pass both buckets |
| `--min-groups` | N+ link groups, whatever the pattern (a giant-wordmark footer can still have 4 columns) |
| `--max-effort` · `--max-height` | `low`/`medium`/`high` · px at 1440 wide |
| `--need KIND:VALUE` / `--not KIND:VALUE` | require or exclude any value, e.g. `--need pattern:giant-wordmark --need feature:hours --not feature:3d --not text:game` |

| Soft | Values |
|------|--------|
| `--pattern` | `giant-wordmark` `link-columns` `cta-first` `big-links` `sitemap` `bento` `split` `centered-stack` `single-row` `illustrated` `image-led` |
| `--feature` | layout: `newsletter` `giant-type` `cta-button` `clock-or-status` `cards` `inset-panel` `marquee` `social-icons` `back-to-top` …; content: `hours` `booking-cta` `address` `email-or-phone` `payment-icons` `app-badges` `awards` `locale-switcher` `theme-toggle` `perks` `mobile-accordion` |
| `--typeface` | `sans` `serif` `mono` `mixed` `display` (cheap to change, so never a hard requirement) |
| `--style` · `--type` | footer.design's own tags, e.g. `minimal`, `web-app` (`vocab` shows which are common) |
| `--text` | a word start in the name, description, layout summary, mobile note or **link labels** (e.g. `--text reserv`, `--text pricing`) |

## Phase 1: Brief

Get just enough to filter. Infer first, ask second.

1. **Read the project** if there is one: framework and styling (Tailwind, CSS modules…), brand
   colors and fonts, the current footer and the links it must carry (nav, legal, socials,
   newsletter, contact). **Count every link, legal included, and the groups**: this decides
   `--links` and `--min-groups` and rules out half the gallery on its own. Count what the catalog
   counts: every clickable nav, legal and social link, and CTA buttons; not app badges or
   email addresses. A footer's count includes its socials and legal, so its room for nav links is
   smaller (`site <slug>` shows its labels).
2. **Ask only what you can't infer**, at most 3 questions in one go: the feel (calm vs bold, light
   vs dark, color or black and white), whether a newsletter or contact CTA belongs in the footer,
   and how much effort or motion is welcome. If the user already named a vibe or a reference
   site, skip this. If you can't ask, choose sensible defaults and state them as assumptions
   at the top of the shortlist.
3. **Map the brief to filters.** Only real requirements become hard filters; everything about
   vibe goes in soft filters. Capacity (links, groups) and effort are real requirements. Colors
   usually aren't: the rebuild repaints in the user's brand anyway, so hard-filter `--theme` or
   `--palette` only when the user wants that look (e.g. "black and white", "keep it dark"), not
   just because they have a brand color. [references/replicate.md](references/replicate.md#brief-to-filters)
   maps common briefs (black and white, "like Linear", big sitemap, playful…) and covers named
   reference sites that aren't in the catalog.

## Phase 2: Shortlist

1. **Search wide, read first.** Run 2–3 searches that each take a different structural angle
   (e.g. `--pattern giant-wordmark`, then `--min-groups 3 --pattern link-columns`), with
   `--compact` to scan. Cut anything that can't hold the user's content before downloading any
   image. Over ~50 matches, add a hard filter; under 5, relax one. Read the near misses: a pastel
   or dark footer that's perfect otherwise usually repaints fine. When one result is spot on,
   `similar <slug>` finds its neighbors.
2. **Look at the finalists.** `download` the best 8–10 with `--sheet` and view the sheets (one
   image per 5 footers), then open individual screenshots only for close calls. The summary tells
   you the structure; only the image tells you whether it's good, and whether the screenshot
   itself is usable (some are cropped oddly or include non-footer content).
3. **Pick 4–6 that differ in structure**, not five variations of "logo left, four link columns":
   the user is choosing a direction, and near-duplicates hide the real choice. Aim for at least
   three patterns. Capacity filters often leave mostly one family (link-heavy briefs land on
   columns), so keep the same hard filters and run one quick search per alternative pattern
   (`--need pattern:giant-wordmark`, `--need pattern:cta-first`, `--need pattern:bento`…), then keep
   the best of each family that can hold the content.
   Include one that stretches the brief when it's strong, but only on something the user left
   open (a bolder structure, a mood they didn't rule out); never break what they asked for
   outright ("keep it dark" means every option is dark).
   For giant-wordmark footers, **check the name fits**: at the same width, a 9-letter name sets about
   half as tall as a 5-letter one. Say so in the fit note and how you'd handle it
   ([wordmark fit](references/replicate.md#wordmark-fit)).
4. **Show them.** Write a notes file `{"slug": "one line on why it fits this brief"}` and run
   `gallery` with `--notes`, `--pick` (your recommendation), `--brief`, and `--stretch` for the
   option that stretches the brief. If you can publish an
   artifact, publish the gallery (the default hotlinked images work there) and give the link;
   otherwise give the file path and pass `--images DIR` so it works offline. Then list:

   ```
   1. Mother Design (giant-wordmark, light, effort low)
      Full-width wordmark over a ruled grid of offices and a newsletter. Holds your 6 links easily.
      https://www.footer.design/sites/mother-design
   ```

   Recommend one in a sentence. Ask the user to pick a number, or to combine ("2's layout, 4's type").

If the user wants more options, search again from a different angle, or run `similar` on their
favorite, rather than going further down the same list.

## Phase 3: Rebuild

1. **Study the pick.** `site <slug>` for the full description; download its screenshots if you
   haven't. Run `inspect_footer.mjs` on the live URL (`CHROME_PATH` reuses an installed Chrome;
   `--selector "css"` when it misses the footer; `--wait 4000` for physics or scroll animations).
   Read `footer-summary.txt` first: regions, type sizes and families, colors, artwork, shadows,
   and parts that overlap the section above. Open `footer-outline.json` only for exact values.
   Live sites get redesigned: if the live footer no longer matches the footer.design screenshot,
   the screenshot wins. Without Playwright, or if the site blocks headless browsers, measure from
   the screenshots ([scale factors](references/replicate.md#anatomy-checklist)).
2. **Write a short spec before coding**: layout per breakpoint, type scale, spacing, color roles,
   interactions, and a plan for every piece of artwork the summary lists (`img`, `svg`, `canvas`,
   `video`): rebuild it in CSS/SVG, swap in the user's asset, or approximate it. Use the anatomy
   checklist in [references/replicate.md](references/replicate.md#anatomy-checklist). Map every
   value onto the user's tokens (their colors, fonts, spacing scale), not the source's.
3. **Build it** in the user's stack with **their content**. Rebuild the structure, proportions,
   and interaction. Don't paste the source's code. If the user's fonts are named in CSS but never
   loaded, load them (or say so). For the source's paid fonts, pick a free one with a similar
   **width** as well as weight: giant type depends on it.
4. **Verify against the source.** Run `inspect_footer.mjs` on your own page (`http://localhost:…`
   or `file:///…/index.html`) into a folder, then `compare <slug> --mine <that folder>` for
   side-by-side images and height differences. Fix the biggest differences first (proportions,
   spacing, type size), then details, and re-run. If the summary warns that text is invisible,
   the capture caught an animation midway: check the screenshot before trusting the numbers. Finish with the [a11y checks](references/replicate.md#accessibility-checks).
   Report what you assumed (copy you wrote, placeholder URLs, endpoints to wire up).

## Rules

- **Replicate the design, not the brand.** Never copy logos, illustrations, photos, copy, or
  paid fonts. Substitute the user's own, or a close free font.
- **The screenshot is the source of truth**, since live sites change after they're catalogued.
- **Look before you recommend.** Never shortlist a footer whose screenshots you haven't viewed;
  layout summaries are for filtering, not for judging quality.
- **Fit beats looks.** A gorgeous three-link footer is the wrong pick for a 40-link sitemap.
- The data is a snapshot (date in `data/index.json`). To refresh it, follow
  [references/maintaining.md](references/maintaining.md).
