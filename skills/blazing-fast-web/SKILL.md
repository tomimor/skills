---
name: blazing-fast-web
description: >-
  Makes a web app measurably faster across five fronts (unnecessary
  re-renders, bundle size and lazy loading, requests and caching, slow
  queries and N+1, images/fonts/scripts), measuring every change before
  and after with Chrome DevTools, Playwright, and Sentry MCPs and keeping
  only what the numbers prove. Use when the user says an app, page,
  endpoint, or interaction is slow or janky, or asks to speed it up, cut
  bundle size, reduce re-renders, fix N+1 queries, add caching, or improve
  Core Web Vitals or Lighthouse scores, even if they don't say
  "performance".
---

# Blazing Fast Web

Make the app faster in ways a user can feel, and prove every gain with
numbers. Five fronts, one rule.

## The rule: measure before and after every change

No optimization ships without a before number and an after number for the
same metric, taken the same way. If you can't measure it, you can't claim it.

- **One change per measurement.** Bundle two fixes and you can't tell which
  one helped (or which one hurt).
- **Same conditions both times.** Same build mode (production, never dev),
  same URL and data, same throttling, same machine. Run each measurement
  3 times and use the median.
- **Keep or revert.** If the after number isn't better beyond noise, revert
  the change. "Should be faster" is not a result.
- **Log everything** in the results ledger (see [Report](#report)).

## Tools

Prefer these MCPs when connected; fall back to CLIs when not.

| Tool | Use it for | Fallback |
|---|---|---|
| **Chrome DevTools MCP** | Performance traces (LCP, INP, CLS, long tasks), Lighthouse, network waterfall, coverage (unused JS/CSS), React Profiler via the page | `npx lighthouse <url> --output=json` (mobile by default) or a Playwright + CDP trace |
| **Playwright MCP** | Driving real user flows (login → search → checkout) repeatably, timing them, counting requests per flow | `npx playwright test` with a timing script |
| **Sentry MCP** | Production truth: slowest transactions, p75/p95, N+1 query and slow-DB-query issues, Web Vitals by route, regressions after deploys | APM/logs the project already has; DB slow-query log |

Before starting, check which are available. If none are, say so and use the
fallbacks; never skip measuring because a tool is missing.

## Phase 0 — Scope

1. **Detect the stack**: framework (Next.js, Remix, Vite + React, Vue,
   SvelteKit…), rendering mode (SSR/SSG/SPA), bundler, ORM/DB, hosting/CDN.
2. **Pick 2–4 target flows** that matter to users: the landing page, the
   main logged-in screen, the heaviest interaction. Ask the user if unclear.
   If Sentry is connected, let it pick: the routes with the worst p75 and
   the most traffic.
3. **Set the goals** for each flow and confirm them with the user. Default:
   Core Web Vitals "good" (LCP < 2.5 s, INP < 200 ms, CLS < 0.1) and API
   p95 < 200 ms. Goals tell you when to stop.
4. **Build for production** and run it locally (or use a staging URL).
   The dev server ships unminified code and extra checks, so its numbers
   don't reflect what users get.

## Phase 1 — Baseline

For each target flow capture, 3 runs, median:

- **Web Vitals**: LCP, INP (or TBT in lab), CLS, TTFB, FCP.
- **Lighthouse performance score** (mobile preset, throttled).
- **JS shipped**: total and per-route JS (gzip/brotli), largest chunks,
  unused-JS % from coverage.
- **Requests**: count, total transfer, duplicate requests, cache hit ratio.
- **Flow time**: Playwright timing from first action to the result visible.
- **Server**: API p50/p95 for the endpoints the flow hits; query count per
  request.
- **Production** (if Sentry): p75 per route, top slow transactions, open
  N+1 / slow-query issues.

Write the baseline into the ledger before touching code.

## Phase 2 — Find and fix, five fronts

Hunt across all five, then fix in order of **impact on the target flows**,
biggest first. Detailed detection recipes and fixes per stack are in
[references/playbook.md](references/playbook.md).

### 1. Unnecessary re-renders
- **Detect**: React Profiler / "Highlight updates" (or Vue devtools) while
  running the flow; look for components re-rendering with unchanged props,
  whole trees re-rendering on each keystroke, context providers with new
  object values every render, long tasks during interaction (INP).
- **Fix**: move state down or lift content up, split contexts, stabilize
  props (memo, `useMemo`/`useCallback` only where the profiler proves it),
  virtualize long lists, debounce expensive inputs, use selectors in stores.
- **Measure**: render count and commit duration for the interaction; INP.

### 2. Bundle size and lazy loading
- **Detect**: bundle analyzer (`@next/bundle-analyzer`,
  `rollup-plugin-visualizer`, `source-map-explorer`), coverage tab for
  unused JS, heavy deps (moment, lodash full, chart/editor/map libs) in the
  initial chunk.
- **Fix**: route-level code splitting, `React.lazy`/`next/dynamic` for
  below-the-fold and on-interaction UI (modals, editors, charts), lighter
  replacements, named imports for tree-shaking, move work to the server
  (RSC/SSR) where the framework allows.
- **Measure**: initial JS per route (compressed), TBT, LCP.

### 3. Requests and caching
- **Detect**: network waterfall for request chains, duplicate fetches,
  over-fetching (large payloads, unused fields), no-cache headers on static
  assets, client fetches that could be server-side, missing compression.
- **Fix**: parallelize independent requests, dedupe with a data-fetching
  cache (TanStack Query, SWR, framework cache), prefetch on intent,
  `Cache-Control` with immutable hashed assets, CDN/edge caching,
  `stale-while-revalidate`, paginate and trim payloads, brotli.
- **Measure**: request count and bytes per flow, TTFB, flow time, repeat-
  visit load time.

### 4. Slow queries and N+1
- **Detect**: Sentry N+1 / slow-DB issues; ORM query logging while running
  one request (count queries — a list of 50 items making 51 queries is
  N+1); `EXPLAIN ANALYZE` on the slowest ones; missing indexes on filter,
  join and sort columns.
- **Fix**: eager loading / joins (`include`, `select_related`,
  `prefetch_related`, DataLoader), add the right index, select only needed
  columns, paginate, cache hot read-mostly results.
- **Measure**: queries per request, query time, endpoint p95.

### 5. Images, fonts and scripts
- **Detect**: Lighthouse opportunities, LCP element, oversized images,
  layout shifts, render-blocking CSS/JS, font swaps, third-party scripts on
  the main thread.
- **Fix**: modern formats (AVIF/WebP) with `srcset`/`sizes`, explicit
  width/height, `loading="lazy"` below the fold and `fetchpriority="high"`
  on the LCP image (never lazy-load it); self-host and subset fonts,
  `font-display: swap`, preload only the critical font; `defer`/`async`
  scripts, load third parties after interaction or via a worker (Partytown),
  drop scripts nobody uses.
- **Measure**: LCP, CLS, bytes of images/fonts, main-thread time from third
  parties.

## Phase 3 — The loop

For each candidate fix, in impact order:

1. State the hypothesis: "Lazy-loading the chart lib cuts `/dashboard`
   initial JS by ~180 KB and LCP by ~300 ms."
2. Make the **single** change.
3. Re-measure the exact metrics from the baseline, same conditions.
4. Run the project's tests/typecheck; replay the Playwright flow to confirm
   nothing broke visually or functionally.
5. Keep it if it beats noise (rule of thumb: >5% or clearly outside the
   spread of the 3 runs); otherwise revert. Log either way.

Stop when the target flows hit the goals set in Phase 0, or when the
remaining fixes cost more than they buy. Say which.

## Report

End with the ledger and a short summary:

```markdown
## Performance results — <app>, <date>

Conditions: production build, Chrome mobile throttling, median of 3 runs.

| # | Change | Metric | Before | After | Δ | Kept |
|---|--------|--------|--------|-------|---|------|
| 1 | Lazy-load chart lib on /dashboard | Initial JS (br) | 412 KB | 231 KB | −44% | ✅ |
| 1 |  | LCP | 3.1 s | 2.6 s | −16% | |
| 2 | Fix N+1 in /api/orders (include items) | Queries/request | 51 | 2 | −96% | ✅ |
| 3 | memo on <Row> | Commit time on type | 18 ms | 17 ms | noise | ❌ reverted |

**Overall** (target flows): LCP 3.1 → 2.2 s · INP 340 → 150 ms · JS 412 → 231 KB · /api/orders p95 900 → 120 ms

**Next** (not done, ranked): …
```

If Sentry is connected, add a follow-up: compare production p75 for the
touched routes a few days after deploy.

## Guardrails

- Never trade correctness for speed: caching must respect auth and
  invalidation; lazy-loaded UI needs a loading state; no removed features.
- No premature `memo` everywhere. Only memoize what the profiler flagged.
- Don't change many things at once to "save time". It costs the proof.
- Related skills: `benchmark` (regression baselines over time),
  `web-perf` (Core Web Vitals audit deep-dive).
