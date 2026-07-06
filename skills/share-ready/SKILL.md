---
name: share-ready
description: >-
  Audits and fully configures how a website looks when shared (Open Graph,
  Twitter/X cards, WhatsApp/Discord/Slack previews) and in the browser
  (title, favicons, theme-color, web manifest), generating missing assets
  and verifying the result locally. Use when setting up link previews,
  og:image, favicons, social sharing metadata, or when a shared link "looks
  wrong" on a platform.
---

# Share Ready

Make a site's link previews and browser presentation complete: audit what
exists, implement what's missing in the project's idiomatic way, generate the
image assets, and verify everything end-to-end.

## Workflow

Five phases, in order. Don't skip the audit — most projects have partial
metadata, and duplicating tags is itself a bug (scrapers pick one arbitrarily).

### Phase 1 — Detect the framework

Check, in order: `next.config.*` (Next.js — App Router if `app/` exists),
`astro.config.*` (Astro), `nuxt.config.*` (Nuxt), `svelte.config.*`
(SvelteKit), `vite.config.*` + `index.html` (Vite SPA), plain `*.html`
(static). The implementation route for each is in
[references/frameworks.md](references/frameworks.md) — read it before
writing any code in Phase 4.

### Phase 2 — Audit what exists

Find the current `<head>` (or metadata config) and every existing asset.
Build a three-column table: **tag/asset → present? → correct?**, covering
every row of the checklist in
[references/checklist.md](references/checklist.md). "Present but wrong"
matters as much as missing: relative `og:image` URLs, SVG og:images,
oversized images, duplicate tags, `twitter:card` absent so X renders a small
summary instead of a large card.

Show the audit table to the user before changing anything.

### Phase 3 — Gather content: infer first, ask only gaps

Infer from the repo before asking anything:

| Field | Infer from |
|---|---|
| Site name | `package.json` name, README H1, existing `<title>` |
| Description | `package.json` description, README first paragraph, hero copy |
| Canonical URL | `homepage` in package.json, CNAME file, deploy config, README links |
| Theme color | CSS custom props / tailwind config primary color, existing `theme-color` |
| Source logo | `logo*`, `icon*` in `public/`, `assets/`, `static/`, root; existing favicon |
| Locale | `<html lang>`, i18n config |

Then ask the user — one batched round of questions — **only** the fields
that are missing or ambiguous — typically: marketing-quality description (the inferred
one is often dev-facing), production URL if not deployed yet, X/Twitter
handle (`twitter:site`), and which image to use as the icon source if none
found. Propose the inferred values as defaults so a single "looks good"
answer can approve everything.

### Phase 4 — Implement

Write the complete metadata set using the framework-idiomatic route from
[references/frameworks.md](references/frameworks.md). The canonical target —
every tag, attribute, and recommended value — is
[references/checklist.md](references/checklist.md). Rules that apply
regardless of framework:

- **Fix, don't append.** Replace wrong/duplicate tags; never leave two
  `og:title`s in the document. When a replacement orphans an old asset file
  (a retired favicon, a superseded og image), list it in the report so the
  user can delete it — don't delete user-created files yourself.
- **`og:image` and `og:url` must be absolute URLs** (scheme + host). This is
  the single most common breakage.
- **Per-page vs site-wide.** Site-wide defaults (site_name, favicon,
  theme-color, manifest) go in the root layout/template; page-level tags
  (title, description, og:title, og:image, canonical) should be overridable
  per page. For content sites, wire the per-page mechanism, don't hardcode.
- Platform quirks that shape values (WhatsApp image weight, Discord
  `theme_color`, iMessage rules) are in
  [references/platforms.md](references/platforms.md) — consult it when the
  user cares about a specific platform.

**Assets.** Generate what the audit marked missing:

- Favicons/app icons from the source logo:
  `scripts/generate-favicons.sh <logo> <public-dir> --pad-maskable`
  (ImageMagick, falls back to npx sharp-cli). If the logo is an SVG, also
  ship it directly as `<link rel="icon" type="image/svg+xml">`.
- og:image 1200×630: copy `assets/og-template.html` into the project (keep
  the filled copy committed so the card is regenerable), fill brand
  colors/copy, render with `scripts/render-og-image.mjs <template> <out.png>`.
  The script imports `playwright` from the project — `npm i -D playwright`
  if absent (browser download can be skipped when a system Chromium exists;
  the script falls back to it automatically). In Next.js App Router prefer
  the native `opengraph-image.tsx` + `ImageResponse` route instead — see
  frameworks.md. If the user already has a designed og:image, use it —
  never overwrite existing brand assets, only add missing ones.
- `site.webmanifest` with `name`, `short_name`, `icons` (192, 512, and a
  `purpose: "maskable"` 512), `theme_color`, `background_color`,
  `display: "standalone"`.

### Phase 5 — Verify

1. Start the dev server (or build+preview for SSG so meta tags are in the
   actual HTML response, not client-rendered — scrapers don't run JS).
2. Run `node scripts/verify-share-ready.mjs <url>` — it parses the rendered
   head, checks every required tag, fetches each asset (status,
   content-type, weight), and validates the manifest. Fix every FAIL; report
   WARNs to the user with a recommendation. On a not-yet-deployed site the
   production og:image URL can't resolve — the script detects this (same
   path serves locally) and reports it as a WARN to re-verify after deploy,
   not a FAIL.
3. Spot-check with `curl -A "facebookexternalhit/1.1" <url>` that the tags
   are present in the raw HTML for a scraper user-agent.
4. Close with the **post-deploy checklist** (these need a public URL):
   - Facebook Sharing Debugger — also the way to bust FB/WhatsApp's cache
     ("Scrape Again")
   - LinkedIn Post Inspector — busts LinkedIn's ~7-day cache
   - X/Twitter: paste the URL in a draft post to preview
   - Discord/Slack/Telegram: paste in a private channel/saved messages
   - Remind the user: scrapers cache aggressively — after changing an
     og:image, either bust caches via the debuggers or version the image
     URL (`og.png?v=2`).

## Scope

In scope: OG core + image tags, Twitter/X cards, title/description, favicons
(ico/PNG/SVG/apple-touch-icon), theme-color, canonical, web app manifest,
per-platform preview quirks. Out of scope (mention, don't implement unless
asked): JSON-LD structured data, oEmbed endpoints, robots/sitemap, analytics.
