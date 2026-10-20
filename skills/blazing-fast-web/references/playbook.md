# Blazing Fast Web — playbook

Detection recipes and fixes per front, with stack-specific commands. Read the
section for the front you're working on.

## Contents

1. [Re-renders](#1-re-renders)
2. [Bundle and lazy loading](#2-bundle-and-lazy-loading)
3. [Requests and caching](#3-requests-and-caching)
4. [Queries and N+1](#4-queries-and-n1)
5. [Images, fonts and scripts](#5-images-fonts-and-scripts)
6. [Measurement recipes](#6-measurement-recipes)

## 1. Re-renders

**Find them**
- React DevTools Profiler → record the interaction → sort by "render
  duration"; enable "Record why each component rendered".
- `react-scan` (`npx react-scan@latest <url>`) highlights components that
  re-render with identical props.
- Through Chrome DevTools MCP: record a performance trace during the
  interaction and look for long tasks (>50 ms) in the "Interactions" track.

**Common causes → fix**

| Cause | Fix |
|---|---|
| Context value is a new object every render | `useMemo` the value, or split into state + dispatch contexts |
| Global store subscribed whole (`useStore()`) | Subscribe to a slice: `useStore(s => s.count)` |
| State lives too high (input state in a page component) | Move it into the component that uses it |
| Inline object/array/function props to a memoized child | Stabilize with `useMemo`/`useCallback`, or drop the `memo` |
| Long list renders every row | Virtualize (`@tanstack/react-virtual`, `react-window`) |
| Expensive derived data recalculated each render | `useMemo`, or compute on the server |
| Keystroke triggers heavy work | `useDeferredValue` / `startTransition`, or debounce |
| Index as `key` in reorderable lists | Stable ids |

React Compiler (React 19+) auto-memoizes; if the project uses it, don't
hand-add `memo`/`useMemo`, look for the patterns it can't fix (state too
high, context shape, list size).

Vue: `v-memo`, `shallowRef` for big objects, computed instead of methods in
templates. Svelte: check reactive statements that depend on whole objects.

## 2. Bundle and lazy loading

**Find it**
- Next.js: `ANALYZE=true next build` with `@next/bundle-analyzer`; the
  build output lists First Load JS per route.
- Vite/Rollup: `rollup-plugin-visualizer`; webpack: `webpack-bundle-analyzer`.
- Any build with sourcemaps: `npx source-map-explorer dist/**/*.js`.
- Coverage: Chrome DevTools coverage on load → unused bytes per file.
- Dep cost before adding/keeping: bundlephobia / `npx pkg-size <pkg>`.

**Fix**

```tsx
// React
const Chart = lazy(() => import('./Chart'));
<Suspense fallback={<ChartSkeleton />}><Chart /></Suspense>

// Next.js
const Editor = dynamic(() => import('./Editor'), { ssr: false, loading: () => <Skeleton /> });

// Load on interaction
const openModal = async () => { const { Modal } = await import('./Modal'); ... };
```

| Heavy dep | Lighter option |
|---|---|
| `moment` | `date-fns` (tree-shaken) or `Intl` / `Temporal` |
| `lodash` (full import) | `lodash-es` named imports or native |
| Icon packs as one import | Per-icon imports |
| Big chart/editor/map libs | Lazy-load on the route or on interaction |

Also: remove dead deps (`npx knip`), check `sideEffects: false` for your own
packages, avoid barrel files that defeat tree-shaking, and in RSC frameworks
keep heavy logic in server components.

## 3. Requests and caching

**Find it**
- Network waterfall (DevTools MCP): chains where B starts only after A ends
  without needing A's data; the same URL requested twice; JSON payloads >100 KB.
- Response headers on static assets: hashed files should be
  `Cache-Control: public, max-age=31536000, immutable`.
- Repeat visit: reload with cache enabled and compare bytes transferred.

**Fix**
- Parallelize: `Promise.all` for independent fetches; in Next.js start
  fetches before awaiting.
- Dedupe and cache on the client: TanStack Query / SWR with sensible
  `staleTime`; prefetch on hover or route intent.
- Server/framework cache: Next.js `fetch` cache / `revalidate`, Remix
  loaders with headers, HTTP caching for public GETs.
- CDN: cache HTML that can be cached (`s-maxage` + `stale-while-revalidate`),
  always cache static assets.
- Trim payloads: select only fields used, paginate, compress (brotli).
- Never cache per-user data in a shared cache. Check `Vary` and
  `private` on authenticated responses.

## 4. Queries and N+1

**Find it**
- Sentry MCP: search issues of type "N+1 Query" and "Slow DB Query";
  open the slowest transactions and read their spans.
- Turn on query logging and hit the endpoint once:
  - Prisma: `new PrismaClient({ log: ['query'] })`
  - Django: `django-debug-toolbar` or `connection.queries`; `nplusone`
  - Rails: logs or `bullet` gem
  - Sequelize/TypeORM/Drizzle: `logging: true`
  - Laravel: `DB::listen` or Telescope; `Model::preventLazyLoading()`
- Count queries per request. N similar queries differing only by id = N+1.
- `EXPLAIN ANALYZE <query>` on the slow ones: look for `Seq Scan` on big
  tables, high row estimates, sorts on disk.

**Fix**

| ORM | Eager load |
|---|---|
| Prisma | `include` / nested `select` |
| Django | `select_related` (FK), `prefetch_related` (M2M/reverse) |
| Rails | `includes` / `preload` |
| Sequelize | `include` |
| Drizzle | relational `with` or a join |
| GraphQL | DataLoader per request |

Then: add indexes for `WHERE`, `JOIN` and `ORDER BY` columns (composite in
the order of selectivity), select only needed columns, paginate with keyset
for deep pages, cache read-mostly hot queries (Redis/KV) with explicit
invalidation. Migrations that add indexes on big tables should be
non-blocking (`CREATE INDEX CONCURRENTLY` in Postgres).

## 5. Images, fonts and scripts

**Images**
- Use the framework component (`next/image`, `@unpic/react`, Nuxt Image) or
  `<picture>` with AVIF/WebP + `srcset`/`sizes`.
- Always set `width`/`height` (or `aspect-ratio`) to prevent CLS.
- LCP image: `fetchpriority="high"`, no `loading="lazy"`, consider
  `<link rel="preload" as="image">`.
- Everything below the fold: `loading="lazy" decoding="async"`.
- Serve at displayed size; don't ship a 3000 px image into a 400 px slot.

**Fonts**
- Self-host (`next/font`, `@fontsource`) instead of third-party CSS.
- WOFF2 only, subset to used characters, few weights (or one variable font).
- `font-display: swap` (or `optional`), preload only the font used above the
  fold, use `size-adjust` fallbacks to avoid layout shift.

**Scripts**
- Inventory third parties (DevTools MCP: third-party summary in the trace).
  Remove what nobody uses.
- `defer` by default; `async` for independent scripts.
- Load analytics/chat/widgets after interaction or idle
  (`next/script strategy="lazyOnload"`, Partytown for worker offload).
- Inline critical CSS, defer the rest; drop unused CSS (coverage).

## 6. Measurement recipes

**Lab, per page (Chrome DevTools MCP)**
1. Open the production URL in a fresh context (cache cleared for cold load).
2. Run Lighthouse (mobile) → record score, LCP, TBT, CLS, FCP.
3. Record a performance trace for load and for the key interaction → LCP
   element, INP, long tasks, main-thread breakdown.
4. Network: count requests, transfer size, slowest request.
5. Repeat 3 times, take the median.

**Flow timing (Playwright MCP or script)**

```ts
const t0 = Date.now();
await page.goto(url);
await page.getByRole('button', { name: 'Search' }).click();
await page.getByTestId('results').waitFor();
console.log('flow ms', Date.now() - t0);
const vitals = await page.evaluate(() => performance.getEntriesByType('navigation')[0].toJSON());
```

Count requests in the flow with `page.on('request', ...)`. Run with the same
CPU/network throttling each time (CDP `Emulation.setCPUThrottlingRate`,
`Network.emulateNetworkConditions`).

**Production (Sentry MCP)**
- Web Vitals by route (p75), slowest transactions, endpoint p95.
- After deploy: compare the same route's p75 for the week before vs after,
  and check that N+1 / slow-query issues are resolved and don't reappear.

**Noise**: if 3 runs spread more than the gain, run 5 more or call it noise.
