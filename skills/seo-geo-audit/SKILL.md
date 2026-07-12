---
name: seo-geo-audit
description: >-
  Audits and fixes a website's technical SEO and GEO (AI answer engine)
  setup: crawlability, indexability, sitemaps, robots.txt + AI crawler
  policy, canonicals, structured data, rendering strategy, hreflang,
  Core Web Vitals basics, and search-engine verification. Use when
  launching a new site, checking why pages aren't indexed or cited by
  AI engines, setting up robots.txt/sitemap/canonical tags, or when the
  user mentions technical SEO, GEO, AI crawlers, or indexing.
---

# SEO/GEO Technical Audit

Find and fix the technical gaps that keep a site from being crawled,
indexed, and cited — by search engines and by AI answer engines. Scope is
**technical setup only**: no content strategy, keywords, or link building.

One principle drives modern GEO: **most AI crawlers do not execute
JavaScript**, and they read the raw HTML response. A site that serves its
content server-rendered, with clean URLs, working status codes, and an
accurate sitemap, is optimized for both Google and AI engines at once.
Everything in this skill serves that goal.

## Workflow

Six phases, in order. Never fix before showing the audit — most projects
have partial setup, and some "gaps" (a noindex, a blocked AI crawler) are
deliberate choices to confirm, not bugs.

### Phase 1 — Detect the project context

Identify:

- **Framework**: check for `next.config.*` (Next.js — App Router if
  `app/`), `astro.config.*` (Astro), `nuxt.config.*` (Nuxt),
  `svelte.config.*` (SvelteKit), `vite.config.*` + `index.html` (Vite
  SPA), plain `*.html` (static). Fix routes per framework are in
  [references/frameworks.md](references/frameworks.md).
- **Rendering mode**: SSR, SSG, or client-side rendered. A CSR-only app is
  the single biggest GEO gap (see Phase 3).
- **Production URL**: `homepage` in package.json, CNAME, deploy config,
  README. Ask if not inferable and not obviously pre-launch.
- **Hosting**: Vercel/Netlify/Cloudflare/nginx — determines where
  redirects, headers, and host canonicalization get fixed.

### Phase 2 — Run the scripted audit

Start the site (dev server, or **build + preview for SSG/SSR so the
audited HTML is what production serves**, not dev-mode output), then run
the audit script **from this skill's directory** (the project is the cwd,
so use the script's full path):

```bash
node <this-skill-dir>/scripts/audit-site.mjs <url> --local          # local dev/preview
node <this-skill-dir>/scripts/audit-site.mjs <prod-url> --pages 10  # deployed site
```

(Node 18+, no dependencies. `--pages N` controls how many sitemap URLs
get page-level checks; default 5.)

Environment notes:

- **Static site, no server**: serve the output dir first —
  `python3 -m http.server 8080 -d <dir>` or `npx serve <dir>`.
- **Monorepo**: ask which app/site to audit if more than one has a web
  build.
- **Bot protection / auth wall**: the script may get 403s or challenge
  pages. Don't fight it — fall back to the Phase 3 source-only audit and
  say why. (Also note the finding itself: aggressive bot protection
  blocks AI crawlers too.)

The script checks host/protocol canonicalization, robots.txt (including
per-AI-crawler policy), sitemap validity, per-page indexability (title,
canonical, meta robots, JSON-LD, hreflang, server-rendered content),
soft-404s, trailing slashes, and compression/caching headers. `--local`
skips HTTPS/host checks that only make sense in production and downgrades
noindex to informational. Exit 1 means at least one FAIL.

### Phase 3 — Source-level audit (what the script can't see)

Check in the repo:

1. **Sitemap wiring** — is the sitemap generated (framework route/plugin)
   or a stale hand-written file? Generated wins: it stays correct as pages
   are added.
2. **Per-page metadata mechanism** — can every page set its own title,
   description, and canonical, or is it hardcoded in one layout?
3. **Structured data coverage** — Organization/WebSite on the home page;
   the matching page-type schema (Article, Product, FAQPage,
   BreadcrumbList) wherever the type applies. JSON-LD, not microdata.
4. **Redirect & host config** — www↔apex and http→https handled at the
   host (301/308), single trailing-slash policy, no redirect chains.
5. **Rendering strategy** — if content is client-rendered, flag it as the
   top finding. Recommendation order: SSG/prerender the public pages >
   SSR > leave CSR (only for app-behind-login). Dynamic rendering
   (bot-sniffing prerender layers) is deprecated by Google — don't build it.
6. **Internal linking mechanics** — real `<a href>` links (not `onClick`
   handlers), History API routing (not `#/` fragments), no orphan pages.
7. **CWV hygiene** — image dimensions set (CLS), modern formats, lazy
   loading below the fold, `font-display: swap`, no render-blocking
   third-party scripts in `<head>`. Full targets in
   [references/checklist.md](references/checklist.md).

The canonical pass/fail bar for every item — with the verified facts and
limits behind it — is [references/checklist.md](references/checklist.md).
For AI-crawler policy decisions (which bots to allow/block and what each
trade-off is), read [references/geo.md](references/geo.md).

### Phase 4 — Report the gaps

Present one table: **finding → severity → why it matters → fix**, ordered
FAIL → WARN → INFO. Separate a **"confirm intent"** group for findings
that may be deliberate (noindex, blocked AI crawlers, staging robots.txt)
and ask about those in one batched question round. Get a go-ahead before
Phase 5.

### Phase 5 — Fix

Implement framework-idiomatically per
[references/frameworks.md](references/frameworks.md). Rules that hold
regardless of framework:

- **Fix, don't append.** Replace wrong tags; never leave two canonicals
  or conflicting robots directives.
- **robots.txt is for crawl control, not de-indexing.** To keep a page
  out of the index use `noindex` (meta or `X-Robots-Tag`) — and the page
  must *not* be robots-blocked, or crawlers never see the noindex.
- **Canonicals and sitemap URLs must be absolute** and agree with each
  other and with the served URL form (host, protocol, trailing slash).
- **Block AI training without killing AI visibility**: training opt-out
  tokens (GPTBot, ClaudeBot, Google-Extended) are separate from
  search/answer fetchers (OAI-SearchBot, Claude-SearchBot,
  PerplexityBot). Blocking everything removes the site from AI answers —
  confirm that's wanted. Details in [references/geo.md](references/geo.md).
- Don't add folklore: no meta keywords, no llms.txt as an "SEO
  requirement" (it's optional — see geo.md), no schema stuffing in the
  hope of AI citations.

### Phase 6 — Verify and hand off

1. Re-run `audit-site.mjs` (same mode as Phase 2) — all FAILs gone, WARNs
   either fixed or explained in the report.
2. For SSG/SSR: `curl -A GPTBot <url>` and confirm the main content is in
   the raw HTML response.
3. Validate structured data (schema.org validator or Rich Results Test)
   if JSON-LD changed.
4. Close with the **post-deploy checklist** (needs the live domain) —
   details for each item are in the "Verification & monitoring" section of
   [references/checklist.md](references/checklist.md):
   - Google Search Console: verify (Domain property = DNS record), submit
     the sitemap.
   - Bing Webmaster Tools: import the verified GSC property.
   - IndexNow: optional, non-Google engines only.
   - Re-run `audit-site.mjs <prod-url>` **without** `--local` to get the
     HTTPS/HSTS/host checks.
   - Watch CWV field data in GSC/CrUX once traffic accrues.

## Scope

In scope: crawlability, indexability, robots.txt, sitemaps, canonicals,
redirects/status codes, structured data, rendering strategy, hreflang,
metadata plumbing, CWV/security-header basics, AI crawler policy,
search-engine verification. Out of scope (mention, don't implement):
content/keywords, link building, blogging cadence, analytics, paid
search. For deep link-preview/favicon work (og:image generation, platform
quirks), hand off to the `share-ready` skill if it's available — this
skill only checks OG presence.
