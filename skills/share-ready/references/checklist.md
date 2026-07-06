# The complete checklist

Every tag/asset the audit (Phase 2) checks and the implementation (Phase 4)
targets. The canonical head block at the bottom is the framework-neutral
reference — frameworks.md maps it to each framework's API.

## Title & description

| Item | Recommended | Notes |
|---|---|---|
| `<title>` | ≤60 chars, brand last (`Page — Site`) | Browser tab text; also the fallback for og:title |
| `<meta name="description">` | 50–160 chars, marketing copy | Fallback for og:description; shown in SERPs |

## Open Graph (link previews everywhere)

Used by Facebook, WhatsApp, LinkedIn, Discord, Slack, Telegram, iMessage —
and by X when no twitter:* tags exist.

| Tag | Value | Notes |
|---|---|---|
| `og:title` | ≤60 chars | Platforms truncate around 55–70 |
| `og:description` | ≤110 chars for safety | Often hidden on mobile feeds |
| `og:image` | **Absolute URL**, 1200×630 PNG/JPEG/WebP | #1 breakage: relative URLs and SVG are ignored by scrapers |
| `og:image:width` / `og:image:height` | `1200` / `630` | Lets FB/WhatsApp render the image on first share, before the async scrape finishes |
| `og:image:alt` | Short description | Accessibility in feeds |
| `og:url` | Absolute canonical URL | Should match `rel=canonical` |
| `og:type` | `website` (or `article` for posts) | `article` unlocks `article:published_time` etc. |
| `og:site_name` | Brand name | Shown above the title on several platforms |
| `og:locale` | e.g. `es_AR`, `en_US` | Optional but cheap |

**og:image constraints:** 1200×630 (1.91:1) is the universal size. Minimum
200×200; Facebook recommends ≥600×315. Keep weight well under ~5MB (hard cap
on several scrapers) and ideally **<600KB so WhatsApp doesn't silently drop
it**. Text on the image must survive downscaling to ~500px wide.

## Twitter / X cards

X reads OG tags as fallback, but without `twitter:card` you get the small
summary card instead of the large image.

| Tag | Value | Notes |
|---|---|---|
| `twitter:card` | `summary_large_image` | Or `summary` for square-logo style |
| `twitter:site` | `@brandhandle` | Optional; attribution |
| `twitter:title` / `twitter:description` / `twitter:image` | Omit if same as OG | X falls back to og:* — don't duplicate for no reason |

`summary_large_image` renders ~2:1; the 1200×630 og:image works. 5MB max.

## Favicons & app icons (the minimal modern set)

Five files + manifest cover everything — dozens of sizes are obsolete since
browsers resize what you ship:

| File | Size | Purpose |
|---|---|---|
| `favicon.ico` | multi-size 16/32/48 at site root | Legacy browsers, old crawlers, tools that hit `/favicon.ico` blind |
| `icon.svg` | vector | Modern browsers; supports dark mode via internal `@media (prefers-color-scheme)` CSS |
| `apple-touch-icon.png` | 180×180, **opaque** | iOS home screen/share sheet; iOS puts black behind alpha — flatten on a background, ~20px padding looks best |
| `icon-192.png` | 192×192 | Manifest: Android home screen |
| `icon-512.png` | 512×512 | Manifest: splash screen |
| `icon-maskable-512.png` | 512×512, art within center 80% | Manifest `purpose: "maskable"`: Android adaptive icons. Safe zone = centered circle, radius 40% of width (409px on 512). Check at maskable.app |

```html
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

The explicit `sizes="32x32"` on the ICO line is deliberate — it works around
Chrome preferring the ICO over the higher-quality SVG.

## Web app manifest

`<link rel="manifest" href="/site.webmanifest" />` on **every** page.
Preferred extension `.webmanifest` (served as `application/manifest+json`);
`manifest.json` also works.

```json
{
  "name": "Full Site Name",
  "short_name": "Site",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "theme_color": "#0b1220",
  "background_color": "#0b1220",
  "display": "standalone",
  "start_url": "/"
}
```

- `short_name` ≤12 chars or launchers truncate it.
- Don't add legacy `apple-mobile-web-app-capable` meta tags — the manifest
  replaced them.
- HTML `<meta name="theme-color">` overrides the manifest's `theme_color`
  when both exist.

## Browser chrome

```html
<meta name="theme-color" content="#0b1220" />
<!-- or light/dark aware: -->
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0b1220" />
```

Colors the Android Chrome toolbar / installed-PWA title bar / Safari chrome.
Any valid CSS color; the `media` attribute takes any media query. Support is
uneven: Firefox and regular desktop Chrome tabs ignore it (desktop Chrome
applies it only to installed PWAs), and alpha values are ignored — don't
treat it as guaranteed, treat it as free polish. The manifest's `theme_color`
additionally rejects transparency and CSS variables. Pair with
`<meta name="color-scheme" content="light dark">` so native form controls
match.

## Canonical

```html
<link rel="canonical" href="https://example.com/page" />
```

Absolute URL, one per page, matching `og:url`. Prevents split previews/SEO
across `www`/non-www and trailing-slash variants.

## Canonical head block (framework-neutral)

```html
<title>Page Title — Site Name</title>
<meta name="description" content="50–160 char marketing description." />
<link rel="canonical" href="https://example.com/" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="Site Name" />
<meta property="og:title" content="Page Title" />
<meta property="og:description" content="Description for the share card." />
<meta property="og:url" content="https://example.com/" />
<meta property="og:image" content="https://example.com/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="What the image shows" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@handle" />

<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#0b1220" />
<meta name="color-scheme" content="light dark" />
```
