---
name: footer-design
description: >-
  Finds a website footer to replicate from footer.design (Footr Design, ~800 curated footers
  tagged by style and site type), helps the user choose one, then rebuilds it in their own stack
  with their own content. Turns a vague brief into style/type filters, searches the gallery,
  looks at the desktop and mobile screenshots, presents a numbered shortlist with a visual contact
  sheet, and after the pick, measures the live footer and rebuilds its layout. Use when the user
  mentions footer.design, footr, footer inspiration, picking or choosing a footer, "make my
  footer look like X", redesigning a site footer, or wants footer ideas to copy.
---

# Footer Design

Pick a footer from [footer.design](https://www.footer.design) and replicate it. Three phases:
**brief → shortlist → rebuild**. The user picks; you do the legwork and the looking. If the user
already names a footer.design entry or a footer they want, skip straight to Phase 3.

Scripts (`$SKILL` is the directory containing this SKILL.md):

| Script | What it does |
|--------|--------------|
| `python3 $SKILL/scripts/footer_design.py taxonomy` | All style and type filters, plus the site count |
| `... search --style dark --style minimal --type saas` | Candidates, best match first, then newest. `--all` = every filter must match. `--limit N` |
| `... site <slug>...` | Name, live URL, designer, tags, desktop + mobile screenshot URLs. Slugs or full footer.design URLs |
| `... download <slug>... --out DIR` | Saves desktop + mobile screenshots (AVIF converted to PNG so you can view them) |
| `... gallery <slug>... --out FILE.html` | Numbered contact sheet the user can open to compare options |
| `node $SKILL/scripts/inspect_footer.mjs <live-url> DIR` | Screenshots the live footer at 1440 and 390 px and dumps its structure + computed styles (needs Playwright) |

The Python script is stdlib-only and caches responses for a day in `~/.cache/footer-design`.
For `inspect_footer.mjs`, set `CHROME_PATH` to reuse an installed Chrome/Chromium, and pass
`--selector "css"` when it can't find the footer.

## Phase 1: Brief

Get just enough to filter. Infer first, ask second:

1. **Read the project** if there is one: framework and styling (Tailwind, CSS modules…), brand
   colors and fonts, the current footer and the links it needs to carry (nav, legal, socials,
   newsletter, contact). This is the content the new footer must hold.
2. **Ask only what you can't infer**, at most 3 questions in one go: the feel (e.g. calm vs bold,
   light vs dark), how much it must hold (a few links vs a big sitemap), and whether animation
   or interactivity is welcome. If the user already named a vibe or a reference site, skip this.
3. **Map the brief to filters.** Run `taxonomy` once, then choose 1–3 styles plus at most 1
   type. See [references/replicate.md](references/replicate.md#brief-to-filters) for how
   common briefs map to filters.

## Phase 2: Shortlist

1. `search` with the filters. Take ~20 candidates. If fewer than 8 match, drop the type filter,
   then the least important style.
2. `download` the top ~12 and **look at every screenshot**, desktop and mobile. Tags are coarse;
   the screenshot is the truth. Discard footers that can't carry the user's content, that depend
   on a one-off illustration or brand asset, or whose mobile view falls apart.
3. Pick **4–6 that differ in structure**, not 5 variations of "logo left, four link columns".
   Name each one's pattern (catalog in [references/replicate.md](references/replicate.md#footer-patterns)).
4. `gallery` the shortlist and share the HTML (open it, send it as a file, or publish it as an
   artifact, whichever this environment supports). Then present a numbered list:

   ```
   1. Sylvan Labs: link columns + ASCII-art illustration below (dark, minimal)
      Fits: carries your 14 links cleanly. Effort: medium (illustration needs a substitute).
      https://www.footer.design/sites/sylvan-labs
   ```

   One line on the pattern, one on fit and rebuild effort, the footer.design link. Recommend one
   and say why in a sentence. Ask the user to pick a number (or combine: "2's layout, 4's type").

If the user wants more options, search again with different filters rather than paging deeper
into the same ones.

## Phase 3: Rebuild

1. **Study the pick.** Download its screenshots if you haven't. Run `inspect_footer.mjs` on its
   live URL to get the real grid, spacing, type scale, and colors. Live sites get redesigned:
   if the live footer no longer matches the footer.design screenshot, the screenshot wins.
   Use the outline only for what still matches, and estimate the rest from the screenshot.
   If Playwright isn't available or the site blocks headless browsers, work from the screenshots
   alone (scale factors in the reference).
2. **Write a short spec before coding**: layout per breakpoint, type scale, spacing, color roles,
   interactions. Use the anatomy checklist in
   [references/replicate.md](references/replicate.md#anatomy-checklist). Map every value onto
   the user's tokens (their colors, fonts, spacing scale), not the source's.
3. **Build it** in the user's stack with **their content**. Rebuild the structure, proportions,
   and interaction. Don't paste the source's code.
4. **Verify**: screenshot your footer at 1440 and 390 px and compare it side by side with the
   source screenshots. Fix the biggest visual differences first (proportions, spacing, type size),
   then details. Run the a11y checks in the reference.

## Rules

- **Replicate the design, not the brand.** Never copy logos, illustrations, photos, copy, or
  paid fonts. Substitute the user's own, or a close free font.
- **The screenshot is the source of truth**, since live sites change after they're catalogued.
- **Look before you recommend.** Never shortlist a footer whose screenshots you haven't viewed.
- **Fit beats looks.** A gorgeous three-link footer is the wrong pick for a 40-link sitemap.
- **Be polite to the site.** Use the cache; don't crawl every page of the gallery.
