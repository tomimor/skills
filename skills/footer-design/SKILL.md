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
| `search [filters] [--compact] [--limit N]` | Matches with pattern, theme/palette, links, height, effort and a layout summary |
| `similar <slug>` | Footers sharing the most layout traits with one footer ("more like #2") |
| `site <slug>...` | Everything known about a footer: links, tags, screenshot URLs, full layout description |
| `download <slug>... --out DIR [--sheet FILE.png]` | Desktop + mobile screenshots as PNG/JPG; `--sheet` adds numbered contact sheets, 5 footers each (needs Pillow) |
| `gallery <slug>... --out FILE.html [--notes notes.json] [--pick slug] [--brief "..."] [--images DIR]` | Numbered HTML contact sheet for the user, with your fit notes and the recommendation marked |
| `compare <slug> --mine DIR` | Source footer next to your rebuild, desktop and mobile (needs Pillow) |
| `node $SKILL/scripts/inspect_footer.mjs <url> DIR` | A footer at 1440 and 390 px: screenshots, `footer-summary.txt`, full styles in JSON (needs Playwright). Works on live sites and on your own build |

Search has **hard filters**, which must match (repeat one to allow alternatives), and **soft
filters**, which rank results by how many match (ties: newest first; `--all` makes them required):

| Hard | Values |
|------|--------|
| `--theme` | `light` `dark` `colorful` `gradient` `image` (judged by eye) |
| `--palette` | `bw` (grays only) `mono-color` (one hue + neutrals) `multicolor` (measured from pixels) |
| `--links` | `few` (≤8) `some` (9–20) `many` (21+), estimated. Near a boundary, pass both buckets |
| `--min-groups` | N+ link groups, whatever the pattern (a giant-wordmark footer can still have 4 columns) |
| `--max-effort` · `--max-height` · `--typeface` | `low`/`medium`/`high` · px at 1440 wide · `sans` `serif` `mono` `mixed` `display` |
| `--not KIND:VALUE` | exclude, e.g. `--not feature:3d --not pattern:other --not text:game` |

| Soft | Values |
|------|--------|
| `--pattern` | `giant-wordmark` `link-columns` `cta-first` `big-links` `sitemap` `bento` `split` `centered-stack` `single-row` `illustrated` `image-led` |
| `--feature` | `newsletter` `giant-type` `clock-or-status` `cards` `inset-panel` `marquee` `social-icons` `contact-details` `back-to-top` … |
| `--style` · `--type` | footer.design's own tags, e.g. `minimal`, `web-app` (`vocab` shows which are common) |
| `--text` | a word in the name, description or layout summary |

## Phase 1: Brief

Get just enough to filter. Infer first, ask second.

1. **Read the project** if there is one: framework and styling (Tailwind, CSS modules…), brand
   colors and fonts, the current footer and the links it must carry (nav, legal, socials,
   newsletter, contact). **Count the links and groups**: this decides `--links` and `--min-groups`
   and rules out half the gallery on its own.
2. **Ask only what you can't infer**, at most 3 questions in one go: the feel (calm vs bold, light
   vs dark, color or black and white), whether a newsletter or contact CTA belongs in the footer,
   and how much effort or motion is welcome. If the user already named a vibe or a reference
   site, skip this. If you can't ask, choose sensible defaults and state them as assumptions
   at the top of the shortlist.
3. **Map the brief to filters.** Only real requirements become hard filters; everything about
   vibe goes in soft filters. [references/replicate.md](references/replicate.md#brief-to-filters)
   maps common briefs (black and white, "like Linear", big sitemap, playful…) and covers named
   reference sites that aren't in the catalog.

## Phase 2: Shortlist

1. **Search wide, read first.** Run 2–3 searches that each take a different structural angle
   (e.g. `--pattern giant-wordmark`, then `--min-groups 3 --pattern link-columns`), with
   `--compact` to scan. Cut anything that can't hold the user's content before downloading any
   image. Over ~50 matches, add a hard filter; under 5, relax one. When one result is spot on,
   `similar <slug>` finds its neighbors.
2. **Look at the finalists.** `download` the best 8–10 with `--sheet` and view the sheets (one
   image per 5 footers), then open individual screenshots only for close calls. The summary tells
   you the structure; only the image tells you whether it's good, and whether the screenshot
   itself is usable (some are cropped oddly or include non-footer content).
3. **Pick 4–6 that differ in structure**, not five variations of "logo left, four link columns".
   Include one that stretches the brief (e.g. the light inversion of a dark brief) when it's strong.
4. **Show them.** Write a notes file `{"slug": "one line on why it fits this brief"}` and run
   `gallery` with `--notes`, `--pick` (your recommendation) and `--brief`. If you can publish an
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
   the screenshots (scale factors in the reference).
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
   side-by-side desktop and mobile images. Fix the biggest differences first (proportions,
   spacing, type size), then details, and re-run. Finish with the a11y checks in the reference.
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
