# Framework implementations

How to implement the canonical checklist per framework. Detect first
(SKILL.md Phase 1), then use only the matching section.

## Next.js App Router (Metadata API)

Prefer the typed APIs over hand-written `<meta>` tags.

### Site-wide defaults — `app/layout.tsx`

```tsx
import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: { default: 'Site Name', template: '%s — Site Name' },
  description: 'Marketing description.',
  openGraph: {
    type: 'website',
    siteName: 'Site Name',
    title: 'Site Name',
    description: 'Marketing description.',
    url: '/',
  },
  twitter: { card: 'summary_large_image', site: '@handle' },
  alternates: { canonical: '/' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1220' },
  ],
  colorScheme: 'light dark',
}
```

Gotchas (verified against the Next.js docs):

- **Always set `metadataBase`.** The docs claim a missing one is a build
  error, but the implementation actually falls back to a default
  (localhost/deploy URL) — worse, because relative `og:image`s then silently
  resolve against the wrong host in some environments. Set it once in the
  root layout; relative paths compose against it.
- **`themeColor`, `colorScheme`, `viewport` inside `metadata` are deprecated**
  (since Next 14) — they belong in the separate `viewport`/`generateViewport`
  export.
- **Merging is shallow, per segment.** A child page that defines its own
  `openGraph` replaces the parent's whole `openGraph` object — repeat
  `siteName`/`type` or centralize in a helper.
- Per-page: export `metadata` or `generateMetadata()` from each `page.tsx`
  with `title`, `description`, `openGraph`, `alternates.canonical`.

### File conventions (icons & og:image) — preferred over the config object

Files in `app/` auto-inject the tags and **override** the metadata object:

- `app/icon.svg` (or `icon.png`) → favicon links
- `app/apple-icon.png` → apple-touch-icon
- `app/opengraph-image.png` / `app/twitter-image.png` → static share images
  (build fails over the platform caps: 8MB OG, 5MB Twitter)
- `app/opengraph-image.alt.txt` → `og:image:alt`
- `app/manifest.ts` → typed web manifest

Dynamic og:image — `app/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0b1220', color: '#f8fafc', alignItems: 'center', justifyContent: 'center', fontSize: 76 }}>
      Site Name
    </div>,
    size,
  )
}
```

Statically optimized at build time unless it touches request-time APIs. Works
per route segment, so `app/blog/[slug]/opengraph-image.tsx` gives every post
its own card. When using this, skip `scripts/render-og-image.mjs`.

Note: Next.js streams metadata for JS-executing bots but serves it in the
`<head>` for HTML-only scrapers (facebookexternalhit etc.) via user-agent
detection — no extra work needed, but verify with the curl spot-check.

### Next.js Pages Router

No Metadata API — use `next/head` in `_app.tsx`/pages, or the `next-seo`
package. Same tags as the canonical head block.

## Astro

No built-in meta API; components own the head. Create
`src/components/SEO.astro`:

```astro
---
const { title, description, image = '/og.png', type = 'website' } = Astro.props
const canonical = new URL(Astro.url.pathname, Astro.site)  // requires `site` in astro.config
const imageURL = new URL(image, Astro.site)
---
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={canonical} />
<meta property="og:type" content={type} />
<meta property="og:site_name" content="Site Name" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:image" content={imageURL} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
```

Use it in the base layout's `<head>` with per-page props. **Set `site` in
`astro.config.mjs`** — it's what makes URLs absolute. Static assets
(favicons, manifest, og.png) go in `public/`. The `astro-seo` package is a
maintained alternative.

## Nuxt

Use `useSeoMeta()` (per page) + `app.head` in `nuxt.config.ts` for
site-wide favicon/manifest/theme-color links. `useSeoMeta({ ogImage, ogTitle,
twitterCard, ... })` is typed and XSS-safe. Absolute og:image: compose from
`useRuntimeConfig().public.siteUrl` or use the `@nuxtjs/seo` module.

## SvelteKit

`<svelte:head>` in `+layout.svelte` for site-wide tags and in `+page.svelte`
for per-page overrides, fed from `+page.ts` `load` data. Assets in `static/`.
Ensure prerendering or SSR is on for shared routes — scrapers don't run JS.

## Vite SPA / plain HTML

Everything goes directly in `index.html`'s `<head>` — use the canonical head
block from checklist.md verbatim, assets in `public/` (Vite) or the web root.

**SPA warning (applies to any client-rendered site):** scrapers do not
execute JavaScript. `react-helmet` and friends do nothing for link previews.
The share-critical tags must be in the served HTML: prerender (SSG),
render at the edge, or accept a single site-wide card for all routes. Say
this to the user explicitly if their per-route previews can't work.
