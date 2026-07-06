# Per-platform behavior, quirks, and cache busting

What each platform actually reads and where previews silently break. Consult
when the user cares about a specific platform or a preview "looks wrong"
somewhere specific. Platform behavior is largely empirical (observed, not
spec'd) and changes without notice — when a specific limit matters, confirm
with that platform's validator rather than trusting the number.

Universal facts first:

- **No scraper executes JavaScript.** Tags must be in the served HTML.
- **Every platform caches previews** — see the cache table at the bottom.
- 1200×630 (1.91:1) og:image works everywhere; platform-specific sizes below
  are only for squeezing out the last detail.

## Facebook / Messenger

- Full OG support; this is the reference implementation.
- Without `og:image:width`/`og:image:height`, the **first** share of a URL
  may render without image (scrape is async) — declaring dimensions fixes it.
- Image: ≥600×315 recommended, 1200×630 ideal, 8MB cap.
- Cache ~7 days; bust via Sharing Debugger "Scrape Again" (or the Batch
  Invalidator for many URLs). Even after a re-scrape, CDN image propagation
  can lag up to ~24h.

## WhatsApp

- Uses the Facebook scraper but is the most fragile consumer:
  - `og:title`, `og:description`, `og:url` must be present and **non-empty**.
  - All meta tags must appear **within the first 300KB** of the HTML.
  - Heavy og:images get silently dropped — keep **<600KB**; small previews
    may crop square from the center, so keep key content centered.
- Shares Facebook's cache: bust via the Sharing Debugger too.

## iMessage (Apple)

- Builds the card almost entirely from `og:title` + `og:image`
  (`og:site_name` shows as subtitle; description mostly ignored).
- Titles clip around ~44 characters — front-load meaning.
- Crops vary by context; square-safe art survives best. Animated GIFs play.
- Supports the same tags via Slack/Discord-style fallbacks to `<title>` if OG
  is missing, but the result is ugly — always set OG.

## X / Twitter

- Reads `twitter:*` first, falls back to `og:*` per field. The one tag that
  has no OG fallback is **`twitter:card`** — without it you get the small
  summary layout instead of the large image.
- `summary_large_image`: ~2:1 render, 1200×630 fine, 5MB cap, min 300×157.
- `summary`: square, min 144×144 — use for logo-style cards.
- No public card validator anymore; preview by pasting the URL in a draft
  post. Cache ~30 days, self-expires (versioned image URL is the reliable
  bust).

## LinkedIn

- Standard OG. 1200×627 documented, 1200×630 fine. Min 200px wide.
- Cache ~7 days; bust with the Post Inspector
  (linkedin.com/post-inspector) — also shows scrape errors. The refresh
  applies to future shares only; already-published posts keep the old
  preview.

## Discord

- OG + Twitter hybrid: `twitter:card: summary_large_image` toggles the big
  image layout; otherwise the og:image renders as a small thumbnail.
- **`<meta name="theme-color">` colors the embed's left accent strip** — free
  branding.
- Animated GIF og:images animate. `og:site_name` shows above the title.

## Slack

- OG first, falls back to Twitter tags, then oEmbed, then HTML title.
- Shows favicon + og:site_name in the unfurl header — a broken favicon is
  visible here.
- Bust cache by editing the message or with `/collapse` + repost; Slack
  respects the FB debugger's re-scrape too (own scraper, short cache).

## Telegram

- Requires **HTTPS** for both page and image; no JS execution.
- Minimum for a full card: `og:title` + `og:image`. Instant View aside,
  behavior is close to spec.
- Bust cache by sending the URL to the @WebpageBot with "refresh".

## Google Search (bonus — affects "preview" in SERPs)

- `<title>`/`meta description` are the snippet inputs. Large image previews
  in Discover require `max-image-preview:large` **plus** images ≥1200px
  wide; the same robots rule now also governs image previews in AI
  Overviews.
- `rel=canonical` mismatch with og:url can split preview equity across URL
  variants.

## Cache-busting cheat sheet

| Platform | Cache | Bust |
|---|---|---|
| Facebook/WhatsApp | ~7 days | Sharing Debugger → Scrape Again |
| LinkedIn | ~7 days | Post Inspector |
| X/Twitter | ~30 days | no tool — version the image URL (`og.png?v=2`) |
| Slack | short | edit message / repost |
| Telegram | days | @WebpageBot → refresh |
| Discord | ~30 min–hours | re-post, or version the URL |

**The universal bust:** change the asset URL. When updating an og:image,
prefer a new filename/query param over overwriting the old file — every
cache misses at once and you don't chase debuggers.
