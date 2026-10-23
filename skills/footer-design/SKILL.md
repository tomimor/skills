---
name: footer-design
description: >-
  Finds a website footer to replicate from footer.design (Footr Design, ~780 curated footers) and
  rebuilds it. Searches a bundled index where every footer has a layout description (pattern such
  as giant-wordmark or link-columns, features such as newsletter or clock, theme, link count,
  height, rebuild effort), so it can match a brief to concrete layouts before looking at any
  screenshot. Presents a numbered shortlist with a visual contact sheet, then measures the chosen
  live footer and rebuilds it in the user's stack with their content. Use when the user mentions
  footer.design, footr, footer inspiration, picking or choosing a footer, "make my footer look like
  X", redesigning or building a site footer, or wants footer ideas to copy.
---

# Footer Design

Pick a footer from [footer.design](https://www.footer.design) and replicate it. Three phases:
**brief → shortlist → rebuild**. The user picks; you do the legwork and the looking. If the user
already names a footer.design entry or a footer they want, skip to Phase 3.

`$SKILL` is the directory containing this SKILL.md. The helper is stdlib-only Python:

| Command (`python3 $SKILL/scripts/footer_design.py …`) | What it does |
|--------|--------------|
| `vocab` | Every filter value with how many footers have it. Run once per session |
| `search [filters] [--all] [--limit N]` | Ranked matches with each footer's pattern, theme, height and a one-line layout summary |
| `site <slug>...` | Everything known about a footer: links, tags, screenshot URLs, full layout description |
| `download <slug>... --out DIR` | Desktop + mobile screenshots as viewable PNG/JPG |
| `gallery <slug>... --out FILE.html [--notes notes.json] [--pick slug]` | Numbered contact sheet with your fit notes and the recommendation marked |
| `node $SKILL/scripts/inspect_footer.mjs <live-url> DIR` | Live footer at 1440 and 390 px: screenshots + structure with computed styles (needs Playwright) |

Search filters, all repeatable and combinable:

| Filter | Values | From |
|--------|--------|------|
| `--pattern` | `giant-wordmark` `link-columns` `cta-first` `big-links` `sitemap` `bento` `split` `centered-stack` `single-row` `illustrated` `image-led` | layout |
| `--feature` | `newsletter` `giant-type` `clock-or-status` `cards` `inset-panel` `marquee` `social-icons` `contact-details` `back-to-top` … (`vocab` lists all) | layout |
| `--theme` | `light` `dark` `colorful` `gradient` `image` | layout |
| `--links` | `few` (≤8) `some` (9–20) `many` (21+) | layout |
| `--typeface` | `sans` `serif` `mono` `mixed` `display` | layout |
| `--max-effort` / `--max-height` | `low`/`medium`/`high` · px at 1440 wide | layout |
| `--style` / `--type` | footer.design's own tags, e.g. `minimal`, `saas` | site tags |
| `--text` | any word in the name, description or layout summary | all |

Results rank by how many filters match, then newest. `--all` drops partial matches.

## Phase 1: Brief

Get just enough to filter. Infer first, ask second.

1. **Read the project** if there is one: framework and styling (Tailwind, CSS modules…), brand
   colors and fonts, the current footer and the links it must carry (nav, legal, socials,
   newsletter, contact). **Count the links**: this decides `--links` and rules out half the
   gallery on its own.
2. **Ask only what you can't infer**, at most 3 questions in one go: the feel (calm vs bold, light
   vs dark), whether a newsletter or contact CTA belongs in the footer, and how much effort or
   motion is welcome. If the user already named a vibe or a reference site, skip this.
3. **Map the brief to filters**: one `--links` value, 1–2 `--pattern`s if the brief implies a
   structure, a `--theme`, any must-have `--feature`s, then a style or type tag for vibe. See
   [references/replicate.md](references/replicate.md#brief-to-filters) for common mappings.

## Phase 2: Shortlist

1. **Search wide, read first.** Run 2–3 searches that each take a different structural angle
   (e.g. `--pattern giant-wordmark`, then `--pattern link-columns --feature giant-type`). Read the
   summaries and cut anything that can't hold the user's content, before downloading a single
   image. If a search returns fewer than 5, drop the least important filter.
2. **Look at the finalists.** `download` the best 8–10 and **view every screenshot**, desktop and
   mobile. The summary tells you the structure; only the image tells you whether it's good.
3. **Pick 4–6 that differ in structure**, not five variations of "logo left, four link columns".
4. **Show them.** Write a notes file `{"slug": "one line on why it fits this brief"}` and run
   `gallery` with `--notes` and `--pick` (your recommendation). Share the HTML however this
   environment allows (open it, send it as a file, or publish it as an artifact). Then list:

   ```
   1. Mother Design (giant-wordmark, light, effort low)
      Full-width wordmark over a ruled grid of offices and a newsletter. Holds your 6 links easily.
      https://www.footer.design/sites/mother-design
   ```

   Recommend one in a sentence. Ask the user to pick a number, or to combine ("2's layout, 4's type").

If the user wants more options, search again from a different angle rather than going further
down the same list.

## Phase 3: Rebuild

1. **Study the pick.** `site <slug>` for the full description; download its screenshots if you
   haven't. Run `inspect_footer.mjs` on the live URL for the real grid, spacing, type scale, and
   colors (`CHROME_PATH` reuses an installed Chrome; `--selector "css"` when it misses the footer).
   Live sites get redesigned: if the live footer no longer matches the footer.design screenshot,
   the screenshot wins, so use the outline only for what still matches. Without Playwright, or if
   the site blocks headless browsers, measure from the screenshots (scale factors in the reference).
2. **Write a short spec before coding**: layout per breakpoint, type scale, spacing, color roles,
   interactions. Use the anatomy checklist in
   [references/replicate.md](references/replicate.md#anatomy-checklist). Map every value onto
   the user's tokens (their colors, fonts, spacing scale), not the source's.
3. **Build it** in the user's stack with **their content**. Rebuild the structure, proportions,
   and interaction. Don't paste the source's code.
4. **Verify**: screenshot your footer at 1440 and 390 px and compare it side by side with the
   source screenshots. Fix the biggest differences first (proportions, spacing, type size), then
   details. Run the a11y checks in the reference.

## Rules

- **Replicate the design, not the brand.** Never copy logos, illustrations, photos, copy, or
  paid fonts. Substitute the user's own, or a close free font.
- **The screenshot is the source of truth**, since live sites change after they're catalogued.
- **Look before you recommend.** Never shortlist a footer whose screenshots you haven't viewed;
  layout summaries are for filtering, not for judging quality.
- **Fit beats looks.** A gorgeous three-link footer is the wrong pick for a 40-link sitemap.
- The data is a snapshot (date in `data/index.json`). To refresh it, follow
  [references/maintaining.md](references/maintaining.md).
