---
name: design-md
description: >-
  Library of reference DESIGN.md files, each capturing one real website's visual language (tokens,
  typography, layout, components, motion, assets, screenshots), plus a capture script to add new ones.
  Use when starting a new website or project and the user wants it to look like, borrow from, or be
  inspired by a reference site; when they say /design-md, "use the <name> design", "design reference",
  "style like <site>"; or when they ask to add, scrape, or capture a site's design into the library.
---

# design-md

A collection of design references. Each reference is a folder under `references/<slug>/` with a
`DESIGN.md` (the spec an agent builds from), `screenshots/`, and `assets/` (logos, icons, images,
fonts) captured from the live site.

## Available references

| Slug | Source | Vibe |
|------|--------|------|
| _(none yet -- `ethereum-institutional` is pending; see "Adding a reference")_ | | |

Keep this table in sync whenever a reference is added or removed.

## Mode 1: Use a reference

Triggered by `/design-md <slug>` or "build this in the style of <slug>".

1. If no slug was given, show the table above and ask which one (or offer to combine two).
2. Read `references/<slug>/DESIGN.md` in full. Glance at `references/<slug>/screenshots/` to calibrate
   proportions and density -- the prose alone loses the feel.
3. Port the **tokens first**: copy the `:root` block (or Tailwind theme extension) from the DESIGN.md
   into the project's global styles before writing any component.
4. Build components from the "Components" section, matching the documented anatomy, states, and
   spacing. Reuse the reference's assets only where its "Assets & licensing" section allows; otherwise
   use them as placeholders and flag them for replacement.
5. Follow the "Do / Don't" list. The reference is a style, not a clone: keep the user's content,
   brand name, and information architecture. Never reproduce the source's logo or copy as the user's.
6. When done, compare a screenshot of the result against the reference screenshots and fix the
   biggest visual mismatch (usually type scale, spacing rhythm, or contrast).

## Mode 2: Add a reference

Triggered by "add <url> to design-md" or "scrape <url> into a design md".

1. Pick a kebab-case slug from the site name.
2. Run the capture script (needs Playwright; in Claude Code cloud, Chromium is preinstalled):

   ```bash
   node skills/design-md/scripts/capture.mjs <url> skills/design-md/references/<slug>
   ```

   It writes `screenshots/` (desktop 1440 + mobile 390, full page and above the fold),
   `assets/` (images, SVGs, inline SVGs, favicons, font files, stylesheets), and `capture.json`
   (CSS custom properties, computed styles of key elements, color and font frequency, @font-face
   rules, breakpoints from media queries, transitions/keyframes, section outline).
   If the site or its asset CDNs are blocked by a network policy (the script prints the failed hosts,
   also saved as `failedHosts` in `capture.json`), stop and tell the user which hosts to allow --
   a capture without its fonts and images renders in fallback fonts and misleads the DESIGN.md.
3. Read `capture.json` and look at every screenshot. Visit secondary pages (pricing, blog, about) with
   the script too if the homepage doesn't show the full component set -- pass a third arg
   `--prefix <page>` to keep their files separate.
4. Write `references/<slug>/DESIGN.md` from [TEMPLATE.md](TEMPLATE.md). Rules:
   - Every value comes from `capture.json` or a screenshot. No invented hex codes or sizes; if a value
     is inferred, mark it `(inferred)`.
   - Name tokens semantically (`--color-surface`, `--color-accent`), keeping the raw value alongside.
   - Describe components by anatomy + measurements + states, with a minimal HTML/CSS snippet each.
   - Link every asset by relative path and say what it is.
   - Fill in "Assets & licensing": fonts and imagery belong to the site owner; mark them
     reference-only unless a license (e.g. Google Fonts OFL) says otherwise.
5. Delete `capture.json` raw noise you don't need only if it exceeds ~1 MB; otherwise keep it as
   evidence.
6. Add the slug to the "Available references" table above.
