# Framework fix routes

Where each audit fix lives per framework. Always prefer the framework's
first-party mechanism over hand-rolled `<head>` tags or static files that
drift.

## Next.js (App Router)

| Fix | Route |
|---|---|
| Per-page metadata | `export const metadata` / `generateMetadata()` in `page.tsx`/`layout.tsx`; set `metadataBase` in the root layout so relative OG/canonical URLs resolve absolute |
| Canonical | `metadata.alternates.canonical` |
| Sitemap | `app/sitemap.ts` returning `MetadataRoute.Sitemap` (dynamic routes: generate entries from the data source) |
| robots.txt | `app/robots.ts` returning `MetadataRoute.Robots` |
| Redirects | `redirects()` in `next.config.*` (308/307); host-level www/apex at the platform (vercel.json / DNS) |
| Rendering | Public pages: static by default — avoid making them dynamic accidentally (no cookies()/headers() in shared layouts); check with `next build` output (○/●) |
| hreflang | `metadata.alternates.languages` |
| JSON-LD | `<script type="application/ld+json">` rendered in the page component |

Pages Router: `next-seo` or hand-rolled `<Head>`; `next-sitemap` for sitemap+robots.

## Astro

| Fix | Route |
|---|---|
| Per-page metadata | Layout props → `<title>`, `<meta>`, `<link rel="canonical" href={new URL(Astro.url.pathname, Astro.site)}>` |
| Sitemap | `@astrojs/sitemap` integration; **requires `site` in `astro.config`** — setting `site` is usually finding #1 |
| robots.txt | `public/robots.txt` (static) or `astro-robots-txt` |
| Redirects | `redirects` in `astro.config`, or platform config |
| Rendering | Static by default — keep it; use `server` output only where needed |

## Nuxt 3

| Fix | Route |
|---|---|
| Per-page metadata | `useSeoMeta()` / `useHead()`; canonical via `useHead({ link: [...] })` |
| Sitemap + robots | `@nuxtjs/sitemap` and `@nuxtjs/robots` modules (both read `site.url` config) |
| Rendering | SSR is default — don't disable it (`ssr: false` makes the site CSR); prerender static routes via `nitro.prerender` |
| Redirects | `routeRules` (`{ '/old': { redirect: { to: '/new', statusCode: 301 } } }`) |

## SvelteKit

| Fix | Route |
|---|---|
| Per-page metadata | `<svelte:head>` in `+page.svelte`, values from `load` |
| Sitemap | `src/routes/sitemap.xml/+server.ts` generating XML from the router/data |
| Rendering | `export const prerender = true` in root `+layout.ts` for static sites; SSR is on by default — don't turn off `ssr` for public pages |
| robots.txt | `static/robots.txt` |

## Vite SPA (React/Vue, no meta-framework)

The audit will flag CSR as a FAIL. Fix options, best first:

1. **Migrate public pages to a meta-framework** (Next/Astro/Nuxt) — only
   with user buy-in; it's a project-level decision.
2. **Prerender at build**: `vite-plugin-prerender` / `vite-ssg` (Vue) —
   good for a known, finite route list (marketing pages).
3. **Accept CSR** for app-behind-login; then only the public shell
   (landing page) needs SSG treatment.

Per-page tags via `react-helmet-async` / `@vueuse/head` only help
crawlers that render JS (Google, Applebot) — they do nothing for GPTBot,
ClaudeBot, or PerplexityBot. Say this explicitly when reporting.

## Static HTML

Everything is hand-authored: per-page `<title>`/meta/canonical in each
file, `robots.txt` and `sitemap.xml` at the root (generate the sitemap
with a small build script rather than hand-editing). Host-level redirects
via the platform (`_redirects` on Netlify/Cloudflare Pages, `vercel.json`
on Vercel, nginx `return 301`).

## Host-level canonicalization snippets

| Platform | www/apex + https |
|---|---|
| Vercel | Add both domains; Vercel 308s the non-primary automatically; https enforced |
| Netlify | Primary domain setting → automatic 301; or `_redirects`: `https://www.example.com/* https://example.com/:splat 301!` |
| Cloudflare | Redirect Rules (or Bulk Redirects) apex↔www; "Always Use HTTPS" on |
| nginx | Separate `server` block for the alternate host: `return 308 https://example.com$request_uri;` plus port-80 block doing the same |

Trailing slash: configure once (`trailingSlash` in Next/Astro config,
platform "Pretty URLs" settings) and make sitemap + canonicals emit the
same form.
