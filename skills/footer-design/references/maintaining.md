# Maintaining the footer data

The skill searches two files in `data/`:

| File | What | How it's made |
|------|------|---------------|
| `index.json` | Every footer.design entry: name, description, live URL, designer, date, style/type tags, screenshot URLs | Scraped: `footer_design.py refresh-index` |
| `layouts.json` | One layout description per entry, in a fixed vocabulary | Written by looking at each screenshot, then `merge-layouts` |

The screenshots themselves are never committed: they're footer.design's and the designers' work.
Scripts fetch them on demand.

## Refresh (monthly is plenty)

```bash
S=skills/footer-design/scripts/footer_design.py
python3 $S refresh-index            # adds new entries, drops removed ones
python3 $S layouts-todo > todo.txt  # entries with no layout description yet
python3 $S composite $(cat todo.txt) --out /tmp/fd-comp > /tmp/fd-comp.jsonl   # needs Pillow
```

`composite` writes one image per entry (desktop on the left, mobile on the right, magenta gutter
between) and prints `{"slug", "image", "height_px", "bg", "palette"}` per line. Look at each image, write
one JSON line per entry as specified below, then:

```bash
python3 $S merge-layouts described.jsonl   # validates against the vocabulary, reports errors
```

Fix any reported errors and merge again. Commit `data/` with a message like
`footer-design: refresh data (N new)`.

## Describing a footer

One JSON object per line. Copy `slug`, `height_px`, `bg` and `palette` from the composite output; judge the rest
from the image. `bg` is the most common color in the screenshot, a rough hint only: when it disagrees
with what you see (a big gray wordmark, a split two-tone footer), set `theme` from what you see.

| Key | Values | How to judge |
|-----|--------|--------------|
| `pattern` | one of the patterns below | The **main** structural idea. What would you call it in one breath? |
| `features` | list from the features below | Everything visibly present, layout and content. Omit what you can't see. |
| `palette` | copied | Measured from pixels: `bw` (grays only), `mono-color` (one hue family + neutrals), `multicolor`. |
| `theme` | `light` `dark` `colorful` `gradient` `image` | The background. `colorful` = a saturated flat color (red, orange, blue…). `image` = photo or video fills it. A dark footer with a 3D render behind it is still `dark` (add the `3d` feature). |
| `links` | `few` (≤8) `some` (9–20) `many` (21+) | Count clickable nav, legal and social links on desktop. Estimate when dense. |
| `groups` | integer | Labelled or clearly separate link groups. 0 if links are just a row. |
| `typeface` | `sans` `serif` `mono` `mixed` `display` | Dominant type. `mixed` = two families with real roles (e.g. serif headline, sans links). `display` = a quirky or custom display face carries the look. |
| `effort` | `low` `medium` `high` | Rebuild effort. low = HTML/CSS layout. medium = needs a custom asset, gradient/texture, marquee or careful type fitting. high = 3D/WebGL, physics, heavy illustration or interaction that a screenshot hints at. |
| `summary` | ≤ 30 words | Concrete layout, left to right, top to bottom. Name what's big. No adjectives like "stunning", "clean", "modern". |
| `mobile` | ≤ 15 words | How the mobile view differs: what stacks, what's hidden, what changes order or size. `No mobile screenshot.` when the image has no right-hand panel. |
| `labels` | string | Visible link and group-heading text, comma-separated (see below). Empty if there are no links. |

### Patterns

| Pattern | Use when |
|---------|----------|
| `single-row` | Everything sits on one or two thin lines or in one short band |
| `centered-stack` | One centered column: logo, links, socials, legal stacked |
| `link-columns` | A brand block plus 2–4 labelled link groups side by side |
| `sitemap` | 5+ link groups, a dense mega footer |
| `giant-wordmark` | A brand name or word set huge, spanning most of the width, is the main element |
| `cta-first` | A big headline, button or newsletter leads; links are secondary |
| `big-links` | A few links set large (roughly 28px+ at 1440) are the main element |
| `bento` | Content split into separate tiles or cards in a grid |
| `split` | Two distinct halves or panels side by side |
| `illustrated` | Artwork, illustration, pattern or a 3D scene dominates |
| `image-led` | A photo or video fills most of the footer |
| `other` | None of the above; say what in the summary |

Tie-breaks: a giant wordmark that dominates beats everything else → `giant-wordmark`. A giant
wordmark that's just a band under link columns → `link-columns` plus the `giant-type` feature.
A headline + button that dominates beats link structure → `cta-first`.

### Features

Layout: `giant-type` huge display type somewhere · `logo` logo or logomark (not huge) ·
`newsletter` email signup field · `cta-button` prominent button or CTA headline · `social-icons` ·
`social-links` (as text) · `legal-row` copyright/legal on its own bottom line · `clock-or-status`
local time, weather, status or other live info · `back-to-top` · `photo` · `illustration` drawing,
pattern or ASCII art · `3d` 3D render or WebGL look · `cards` content in rounded cards/tiles ·
`dividers` visible rules between regions · `inset-panel` footer is a rounded panel inset from the
page edges · `map` · `marquee` a row of repeated or cut-off scrolling text

Content: `hours` opening hours or days/times · `booking-cta` book/reserve/schedule/tickets link ·
`address` a street or postal address (not just a city) · `email-or-phone` written out ·
`payment-icons` card/payment logos · `app-badges` App Store/Google Play · `awards` award badges,
certifications, press or partner logos · `locale-switcher` language/currency/country selector ·
`theme-toggle` light/dark toggle · `perks` store promises (shipping, returns, warranty) ·
`mobile-accordion` mobile link groups collapse into expandable rows

`labels` (string): the visible link and group-heading text, comma-separated, in reading order,
Title Case, up to 40 items; no body copy, addresses, emails or the brand name. Use the desktop view,
then append links that only appear on mobile. Drop commas inside a label. Search matches it with
`--text`.

## Calibration examples

```jsonl
{"slug": "hellohello", "pattern": "cta-first", "features": ["3d", "address", "cta-button", "giant-type", "legal-row"], "theme": "dark", "palette": "mono-color", "bg": "#080808", "links": "few", "groups": 0, "typeface": "sans", "height_px": 1028, "effort": "medium", "summary": "Huge red 'Let's make it happen.' top left and '©26' top right over a dim 3D render; full-width red 'Let's Talk' bar; tiny row of links, address, copyright.", "mobile": "Headline and ©26 side by side, bar full width, address stacked; small links dropped.", "labels": "Let's Talk, Privacy Policy, Home, Careers, Contact"}
{"slug": "northeast-tomato", "pattern": "single-row", "features": ["address", "email-or-phone", "illustration", "logo"], "theme": "light", "palette": "mono-color", "bg": "#f8f8f8", "links": "few", "groups": 0, "typeface": "display", "height_px": 197, "effort": "low", "summary": "One short cream band: address left, arched illustrated tomato logo centered, phone, email and credit right, all in a spaced-out display face.", "mobile": "Centered stack: address, contact, then logo at the bottom.", "labels": "Tomato Tomato, Website By Incory + D7MTG"}
{"slug": "aperios-design", "pattern": "giant-wordmark", "features": ["back-to-top", "dividers", "email-or-phone", "giant-type", "illustration", "legal-row", "marquee", "social-links"], "theme": "dark", "palette": "bw", "bg": "#181818", "links": "some", "groups": 3, "typeface": "sans", "height_px": 801, "effort": "medium", "summary": "Three small-labelled link groups (links, connect, contact) above a dotted rule; huge gray wordmark running edge to edge as a marquee; centered care-label badge; location, copyright, back-to-top row.", "mobile": "Groups stack in one column; wordmark cropped to a few letters.", "labels": "Links, Home, About, Logos, Projects, Connect, X, Linked In, Behance, Instagram, Contact, Back to top"}
{"slug": "mother-design", "pattern": "giant-wordmark", "features": ["address", "clock-or-status", "dividers", "email-or-phone", "giant-type", "legal-row", "newsletter", "social-links"], "theme": "light", "palette": "bw", "bg": "#f8f8f8", "links": "few", "groups": 0, "typeface": "mixed", "height_px": 946, "effort": "low", "summary": "Black wordmark spanning the full width on white; ruled grid below: two office columns with live local time and address, newsletter panel right, socials and legal at the bottom.", "mobile": "No mobile screenshot.", "labels": "New York, London, Sign up for our emails, Submit, Instagram, LinkedIn, Privacy Policy, Credit, View Mother Family"}
```
