#!/usr/bin/env node
// Technical SEO/GEO audit of a live site (local dev server or production).
// Usage: node audit-site.mjs <url> [--pages N] [--local]
//   --pages N  sample up to N URLs from the sitemap for page-level checks (default 5)
//   --local    dev-server mode: skip host/HTTPS/HSTS checks that only make sense in production
// Checks protocol/host canonicalization, robots.txt (incl. AI crawler rules),
// sitemap validity, per-page indexability (title, canonical, meta robots,
// JSON-LD, hreflang, rendering), security/caching headers, 404 behavior.
// Exits 1 if any FAIL. No dependencies (Node 18+).

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
const LOCAL = args.includes('--local');
const PAGES = parseInt(args[args.indexOf('--pages') + 1], 10) || 5;

if (!url) {
  console.error('Usage: node audit-site.mjs <url> [--pages N] [--local]');
  process.exit(2);
}

const base = new URL(url);
const results = [];
let section = '';
const add = (level, name, detail = '') => results.push({ level, section, name, detail });
const ok = (name, detail) => add('OK', name, detail);
const warn = (name, detail) => add('WARN', name, detail);
const fail = (name, detail) => add('FAIL', name, detail);
const info = (name, detail) => add('INFO', name, detail);

const UA = 'Mozilla/5.0 (compatible; seo-geo-audit/1.0)';
const get = (u, opts = {}) =>
  fetch(u, {
    redirect: 'manual',
    headers: { 'user-agent': UA, 'accept-encoding': 'gzip, br', ...opts.headers },
    signal: AbortSignal.timeout(opts.timeout ?? 15000),
    ...opts,
  });

// Follow redirects manually so we can count hops and inspect each.
async function follow(u, maxHops = 10) {
  const hops = [];
  let current = u;
  for (let i = 0; i < maxHops; i++) {
    const res = await get(current);
    hops.push({ url: current, status: res.status, location: res.headers.get('location') });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), current).href;
    } else {
      return { final: res, hops, finalUrl: current };
    }
  }
  return { final: null, hops, finalUrl: current };
}

const parseAttrs = (tag) => {
  const attrs = {};
  for (const m of tag.matchAll(/([a-zA-Z-]+)\s*=\s*["']([^"']*)["']/g)) attrs[m[1].toLowerCase()] = m[2];
  return attrs;
};

// ---------------------------------------------------------------- 1. host & protocol
section = 'Host & protocol';
let home, homeHtml, finalUrl;
try {
  const r = await follow(base.href);
  home = r.final;
  finalUrl = new URL(r.finalUrl);
  if (!home) fail('homepage fetch', `redirect loop or >10 hops: ${r.hops.map((h) => h.status).join(' → ')}`);
  else if (home.status !== 200) fail('homepage fetch', `status ${home.status}`);
  else {
    ok('homepage fetch', `${home.status} at ${r.finalUrl}`);
    if (r.hops.length > 2) warn('redirect chain', `${r.hops.length - 1} hops to reach final URL — collapse to one redirect`);
  }
  homeHtml = home && home.status === 200 ? await home.text() : '';
} catch (e) {
  console.error(`FAIL cannot reach ${base.href}: ${e.message}`);
  process.exit(1);
}

if (!LOCAL) {
  if (finalUrl.protocol !== 'https:') fail('HTTPS', `site resolves to ${finalUrl.protocol}//`);
  else ok('HTTPS', 'final URL is https');

  // http:// variant should 301/308 to https
  try {
    const httpVariant = new URL(finalUrl.href);
    httpVariant.protocol = 'http:';
    const r = await get(httpVariant.href);
    if ([301, 308].includes(r.status)) ok('http→https redirect', `${r.status}`);
    else if ([302, 307].includes(r.status)) warn('http→https redirect', `${r.status} temporary — use 301/308`);
    else if (r.status === 200) fail('http→https redirect', 'http:// serves 200 — duplicate protocol versions');
    else info('http→https redirect', `status ${r.status}`);
  } catch { info('http→https redirect', 'http variant unreachable (fine if port 80 closed)'); }

  // www/apex duplicate host
  try {
    const alt = new URL(finalUrl.href);
    alt.hostname = alt.hostname.startsWith('www.') ? alt.hostname.slice(4) : `www.${alt.hostname}`;
    const r = await get(alt.href, { timeout: 8000 });
    if (r.status >= 300 && r.status < 400) {
      const loc = new URL(r.headers.get('location') ?? '', alt.href);
      if (loc.hostname === finalUrl.hostname) ok('www/apex canonical host', `${alt.hostname} → ${finalUrl.hostname} (${r.status})`);
      else warn('www/apex canonical host', `${alt.hostname} redirects to ${loc.hostname}, not ${finalUrl.hostname}`);
    } else if (r.status === 200) fail('www/apex canonical host', `${alt.hostname} also serves 200 — duplicate hosts, pick one and 301 the other`);
    else info('www/apex canonical host', `${alt.hostname}: status ${r.status}`);
  } catch { info('www/apex canonical host', 'alternate host does not resolve — no duplicate-host risk'); }

  const hsts = home.headers.get('strict-transport-security');
  if (hsts) ok('HSTS', hsts);
  else warn('HSTS', 'no Strict-Transport-Security header');
}

// ---------------------------------------------------------------- 2. robots.txt
section = 'robots.txt';
const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent', 'Bytespider',
];
let sitemapUrls = [];
try {
  const r = await get(new URL('/robots.txt', finalUrl.origin).href, { redirect: 'follow' });
  if (r.status >= 500) fail('robots.txt', `status ${r.status} — Google treats a 5xx robots.txt as "do not crawl the site"`);
  else if (r.status === 404) warn('robots.txt', '404 — crawlers assume everything allowed; add one to declare sitemap + AI-crawler policy');
  else if (r.status !== 200) info('robots.txt', `status ${r.status}`);
  else {
    const text = await r.text();
    ok('robots.txt', `200, ${text.length} bytes`);
    // parse into groups
    const groups = []; // {agents: [], rules: [{type, value}]}
    let current = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/#.*$/, '').trim();
      const m = line.match(/^([a-zA-Z-]+)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1].toLowerCase(), value = m[2].trim();
      if (key === 'user-agent') {
        if (!current || current.rules.length) { current = { agents: [], rules: [] }; groups.push(current); }
        current.agents.push(value.toLowerCase());
      } else if (key === 'disallow' || key === 'allow') {
        current?.rules.push({ type: key, value });
      } else if (key === 'sitemap') {
        sitemapUrls.push(value);
      }
    }
    const groupFor = (agent) => {
      const a = agent.toLowerCase();
      // longest-match agent token wins; '*' as fallback
      let best = null, bestLen = -1;
      for (const g of groups) for (const ga of g.agents) {
        if (ga === '*' && bestLen < 0) best = g;
        else if (a.includes(ga) && ga.length > bestLen) { best = g; bestLen = ga.length; }
      }
      return best;
    };
    const star = groupFor('anybot');
    if (star?.rules.some((r2) => r2.type === 'disallow' && r2.value === '/'))
      fail('global disallow', 'User-agent: * / Disallow: / — the whole site is blocked from crawling');
    else ok('global rules', 'no blanket Disallow: / for *');
    if (sitemapUrls.length) ok('Sitemap directive', sitemapUrls.join(', '));
    else warn('Sitemap directive', 'no Sitemap: line in robots.txt');
    const blocked = [], allowed = [];
    for (const bot of AI_CRAWLERS) {
      const g = groupFor(bot);
      const isBlocked = g?.rules.some((r2) => r2.type === 'disallow' && r2.value === '/') &&
        !g?.rules.some((r2) => r2.type === 'allow' && r2.value === '/');
      (isBlocked ? blocked : allowed).push(bot);
    }
    info('AI crawlers allowed', allowed.join(', ') || 'none');
    if (blocked.length) info('AI crawlers blocked', `${blocked.join(', ')} — intentional? Blocking these removes the site from AI answers/citations`);
  }
} catch (e) { fail('robots.txt', `fetch error: ${e.message}`); }

// ---------------------------------------------------------------- 3. sitemap
section = 'Sitemap';
if (!sitemapUrls.length) sitemapUrls = [new URL('/sitemap.xml', finalUrl.origin).href];
let pageUrls = [];
for (const smUrl of sitemapUrls.slice(0, 3)) {
  try {
    const r = await get(smUrl, { redirect: 'follow' });
    if (r.status !== 200) { fail(`sitemap ${smUrl}`, `status ${r.status}`); continue; }
    const xml = await r.text();
    if (!/<(urlset|sitemapindex)[\s>]/i.test(xml)) {
      fail(`sitemap ${smUrl}`, `response is not sitemap XML (content-type: ${r.headers.get('content-type') ?? 'unknown'}) — likely a soft-404 HTML page`);
      continue;
    }
    if (xml.length > 50 * 1024 * 1024) fail(`sitemap size`, `${(xml.length / 1e6).toFixed(1)}MB — over the 50MB uncompressed limit`);
    const isIndex = /<sitemapindex[\s>]/i.test(xml);
    let urlsetXml = xml, childCount = 0;
    if (isIndex) {
      const children = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1]);
      childCount = children.length;
      ok(`sitemap index`, `${smUrl}: ${children.length} child sitemaps`);
      if (children[0]) {
        const cr = await get(children[0], { redirect: 'follow' });
        if (cr.status === 200) urlsetXml = await cr.text();
        else { fail('child sitemap', `${children[0]}: status ${cr.status}`); continue; }
      }
    }
    const locs = [...urlsetXml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => m[1].trim());
    if (!locs.length) { fail(`sitemap ${smUrl}`, 'no <loc> entries found'); continue; }
    if (!isIndex && locs.length > 50000) fail('sitemap URL count', `${locs.length} — over the 50,000-per-file limit; split into a sitemap index`);
    else ok(`sitemap URLs`, `${locs.length} URLs${isIndex ? ' (first child)' : ''}`);
    const rel = locs.filter((l) => !/^https?:\/\//i.test(l));
    if (rel.length) fail('sitemap <loc> URLs', `${rel.length} relative URLs (must be absolute), e.g. ${rel[0]}`);
    const crossHost = locs.filter((l) => { try { return new URL(l).hostname !== finalUrl.hostname; } catch { return true; } });
    if (crossHost.length) warn('sitemap host match', `${crossHost.length} URLs on a different host, e.g. ${crossHost[0]}`);
    const badLastmod = [...urlsetXml.matchAll(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/gi)]
      .map((m) => m[1].trim()).filter((d) => Number.isNaN(Date.parse(d)));
    if (badLastmod.length) warn('sitemap lastmod', `${badLastmod.length} unparseable dates, e.g. "${badLastmod[0]}" — use W3C datetime`);
    pageUrls = locs;
    break;
  } catch (e) { fail(`sitemap ${smUrl}`, `fetch error: ${e.message}`); }
}
if (!pageUrls.length && sitemapUrls.length) warn('sitemap', 'no usable sitemap found — page sampling limited to homepage');

// ---------------------------------------------------------------- 4. page-level checks
section = 'Pages';

function auditPage(pageUrl, html, headers, { isHome }) {
  const p = (name, level, detail) => add(level, `${new URL(pageUrl).pathname} ${name}`, detail);
  const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [, html])[1];

  const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (!title) p('<title>', 'FAIL', 'missing');
  else if (title.length > 60) p('<title>', 'WARN', `${title.length} chars — may truncate in SERPs (keep ≲60)`);
  else p('<title>', 'OK', `"${title}"`);

  const metas = [...head.matchAll(/<meta\s+[^>]*>/gi)].map((m) => parseAttrs(m[0]));
  const meta = (n) => metas.find((a) => (a.name ?? a.property)?.toLowerCase() === n)?.content;

  const desc = meta('description');
  if (!desc) p('meta description', 'WARN', 'missing — search/AI engines will synthesize a snippet');
  else if (desc.length > 160) p('meta description', 'WARN', `${desc.length} chars (keep 50–160)`);
  else p('meta description', 'OK', `${desc.length} chars`);

  // indexability: meta robots + X-Robots-Tag
  const robotsMeta = meta('robots') ?? '';
  const xRobots = headers.get('x-robots-tag') ?? '';
  if (/noindex/i.test(robotsMeta)) p('meta robots', LOCAL ? 'INFO' : 'FAIL', `"${robotsMeta}" — page is noindexed`);
  if (/noindex/i.test(xRobots)) p('X-Robots-Tag', LOCAL ? 'INFO' : 'FAIL', `"${xRobots}" — page is noindexed at the header level`);
  if (!/noindex/i.test(robotsMeta + xRobots)) p('indexable', 'OK', 'no noindex in meta robots or X-Robots-Tag');

  // canonical
  const linkTags = [...head.matchAll(/<link\s+[^>]*>/gi)].map((m) => parseAttrs(m[0]));
  const canonicals = linkTags.filter((a) => a.rel?.toLowerCase() === 'canonical');
  if (!canonicals.length) p('canonical', 'WARN', 'no rel=canonical — add a self-referencing one to guard against URL-parameter duplicates');
  else if (canonicals.length > 1) p('canonical', 'FAIL', `${canonicals.length} canonical tags — search engines ignore conflicting canonicals`);
  else {
    const href = canonicals[0].href ?? '';
    if (!/^https?:\/\//i.test(href)) p('canonical', 'FAIL', `"${href}" is not absolute`);
    else {
      const canon = new URL(href), page = new URL(pageUrl);
      if (canon.hostname === page.hostname && canon.pathname.replace(/\/$/, '') === page.pathname.replace(/\/$/, ''))
        p('canonical', 'OK', 'self-referencing');
      else p('canonical', LOCAL ? 'INFO' : 'WARN', `points to ${href} — this page declares itself a duplicate; intended?`);
    }
  }

  // lang & viewport & charset (homepage only to reduce noise)
  if (isHome) {
    const langAttr = html.match(/<html[^>]*\slang\s*=\s*["']([^"']+)["']/i)?.[1];
    if (langAttr) p('html lang', 'OK', langAttr);
    else p('html lang', 'WARN', 'missing lang attribute on <html>');
    if (metas.some((a) => a.name?.toLowerCase() === 'viewport')) p('viewport', 'OK', '');
    else p('viewport', 'FAIL', 'no viewport meta — fails mobile-first indexing basics');
    if (/<meta\s+charset/i.test(head) || /charset=/i.test(headers.get('content-type') ?? '')) p('charset', 'OK', '');
    else p('charset', 'WARN', 'no charset declared in meta or Content-Type');
    if (linkTags.some((a) => /icon/.test(a.rel ?? ''))) p('favicon', 'OK', '');
    else p('favicon', 'WARN', 'no icon link — favicons show in SERPs and AI citations');
  }

  // H1
  const h1s = [...html.matchAll(/<h1[\s>]/gi)];
  if (!h1s.length) p('h1', 'WARN', 'no <h1>');
  else if (h1s.length > 1) p('h1', 'INFO', `${h1s.length} h1 elements`);
  else p('h1', 'OK', '');

  // JSON-LD
  const ldBlocks = [...html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!ldBlocks.length) p('JSON-LD', 'WARN', 'no structured data — add Organization/WebSite (and page-type schema) as JSON-LD');
  else {
    const types = [];
    let parseErrors = 0;
    for (const [, body] of ldBlocks) {
      try {
        const data = JSON.parse(body);
        const collect = (node) => {
          if (Array.isArray(node)) return node.forEach(collect);
          if (node && typeof node === 'object') {
            if (node['@type']) types.push(...[].concat(node['@type']));
            if (node['@graph']) collect(node['@graph']);
          }
        };
        collect(data);
      } catch { parseErrors++; }
    }
    if (parseErrors) p('JSON-LD', 'FAIL', `${parseErrors}/${ldBlocks.length} blocks fail to parse as JSON`);
    else p('JSON-LD', 'OK', `types: ${[...new Set(types)].join(', ') || '(none declared)'}`);
  }

  // hreflang
  const hreflangs = linkTags.filter((a) => a.rel?.toLowerCase() === 'alternate' && a.hreflang);
  if (hreflangs.length) {
    const hasSelf = hreflangs.some((a) => { try { return new URL(a.href).pathname === new URL(pageUrl).pathname; } catch { return false; } });
    const hasDefault = hreflangs.some((a) => a.hreflang.toLowerCase() === 'x-default');
    p('hreflang', hasSelf ? 'OK' : 'WARN', `${hreflangs.length} alternates${hasSelf ? ', self-referencing' : ' — missing self-reference (required)'}${hasDefault ? ', has x-default' : ', no x-default'}`);
    const bad = hreflangs.filter((a) => !/^[a-z]{2,3}(-[A-Za-z]{2,4})?$|^x-default$/i.test(a.hreflang));
    if (bad.length) p('hreflang codes', 'FAIL', `invalid codes: ${bad.map((a) => a.hreflang).join(', ')} (use ISO 639-1 + optional ISO 3166-1)`);
  }

  // OG basics (full coverage belongs to a share-preview audit)
  if (isHome) {
    const og = (n) => metas.find((a) => a.property?.toLowerCase() === n)?.content;
    if (og('og:title') && og('og:image')) p('Open Graph', 'OK', 'og:title + og:image present');
    else p('Open Graph', 'WARN', 'og:title/og:image incomplete — link previews and some AI surfaces use these');
  }

  // rendering heuristic: is there real content in the raw HTML?
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (bodyText.length < 200)
    p('server-rendered content', 'FAIL', `only ${bodyText.length} chars of text in raw HTML — content is client-rendered; most AI crawlers do not execute JS`);
  else p('server-rendered content', 'OK', `${bodyText.length} chars of text in raw HTML`);

  // mixed content
  if (new URL(pageUrl).protocol === 'https:') {
    const mixed = [...html.matchAll(/(?:src|href)\s*=\s*["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1]);
    if (mixed.length) p('mixed content', 'WARN', `${mixed.length} http:// resources, e.g. ${mixed[0]}`);
  }
}

auditPage(finalUrl.href, homeHtml, home.headers, { isHome: true });

const sample = pageUrls.filter((u) => { try { return new URL(u).href !== finalUrl.href; } catch { return false; } });
const step = Math.max(1, Math.floor(sample.length / PAGES));
const sampled = sample.filter((_, i) => i % step === 0).slice(0, PAGES);
for (const pUrl of sampled) {
  try {
    const r = await follow(pUrl);
    if (!r.final || r.final.status !== 200) {
      fail(`${new URL(pUrl).pathname}`, `sitemap URL returns ${r.final?.status ?? 'redirect loop'} — sitemaps must list only 200-status canonical URLs`);
      continue;
    }
    if (r.hops.length > 1) warn(`${new URL(pUrl).pathname}`, `sitemap URL redirects (${r.hops.length - 1} hop) — list final URLs directly`);
    auditPage(r.finalUrl, await r.final.text(), r.final.headers, { isHome: false });
  } catch (e) { warn(`${pUrl}`, `fetch error: ${e.message}`); }
}

// ---------------------------------------------------------------- 5. server behavior
section = 'Server behavior';

// 404 handling
try {
  const r = await get(new URL(`/definitely-not-a-page-${Date.now()}`, finalUrl.origin).href, { redirect: 'follow' });
  if (r.status === 404 || r.status === 410) ok('404 handling', `${r.status} for unknown paths`);
  else if (r.status === 200) fail('404 handling', 'unknown path returns 200 (soft 404) — search engines waste crawl budget and may index junk URLs');
  else warn('404 handling', `unknown path returns ${r.status}`);
} catch (e) { info('404 handling', `error: ${e.message}`); }

// trailing slash consistency (use a sampled non-root path)
const slashProbe = sampled.find((u) => new URL(u).pathname.length > 1);
if (slashProbe) {
  try {
    const pu = new URL(slashProbe);
    const variant = pu.pathname.endsWith('/') ? pu.pathname.slice(0, -1) : pu.pathname + '/';
    const r = await get(new URL(variant, pu.origin).href);
    if (r.status >= 300 && r.status < 400) ok('trailing slash', `variant redirects (${r.status}) — single canonical form`);
    else if (r.status === 200) warn('trailing slash', `both ${pu.pathname} and ${variant} serve 200 — duplicate URLs unless canonicals disambiguate`);
    else info('trailing slash', `variant returns ${r.status}`);
  } catch { /* skip */ }
}

// compression + caching + nosniff on the homepage response
const enc = home.headers.get('content-encoding');
if (enc) ok('compression', enc);
else warn('compression', 'no content-encoding on HTML — enable gzip/brotli');
if ((home.headers.get('x-content-type-options') ?? '').toLowerCase() === 'nosniff') ok('X-Content-Type-Options', 'nosniff');
else warn('X-Content-Type-Options', 'missing nosniff');

// static asset caching: sample one script/css from homepage
const assetUrl = homeHtml.match(/<(?:script[^>]*src|link[^>]*rel=["']stylesheet["'][^>]*href)\s*=\s*["']([^"']+)["']/i)?.[1] ??
  homeHtml.match(/(?:src|href)\s*=\s*["']([^"']+\.(?:js|css))["']/i)?.[1];
if (assetUrl) {
  try {
    const r = await get(new URL(assetUrl, finalUrl.href).href, { redirect: 'follow' });
    const cc = r.headers.get('cache-control') ?? '';
    if (/max-age=(\d{5,})/.test(cc) || /immutable/.test(cc)) ok('asset caching', cc);
    else warn('asset caching', `Cache-Control: "${cc || '(none)'}" on ${assetUrl} — long-lived caching (immutable + hashed filenames) helps CWV`);
  } catch { /* skip */ }
}

// ---------------------------------------------------------------- 6. GEO discovery files
section = 'GEO / discovery';
try {
  const r = await get(new URL('/llms.txt', finalUrl.origin).href, { redirect: 'follow' });
  if (r.status === 200 && /text\/(plain|markdown)/.test(r.headers.get('content-type') ?? '')) info('llms.txt', 'present (emerging convention; no confirmed adoption by major AI engines — harmless, low priority)');
  else info('llms.txt', 'not present (emerging convention; no confirmed adoption by major AI engines — optional)');
} catch { /* skip */ }

// ---------------------------------------------------------------- report
const ORDER = { FAIL: 0, WARN: 1, INFO: 2, OK: 3 };
const ICON = { FAIL: '✗ FAIL', WARN: '! WARN', INFO: 'i INFO', OK: '✓ OK  ' };
let lastSection = '';
for (const r of results) {
  if (r.section !== lastSection) { console.log(`\n== ${r.section} ==`); lastSection = r.section; }
  console.log(`${ICON[r.level]}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
}
const counts = results.reduce((a, r) => ((a[r.level] = (a[r.level] ?? 0) + 1), a), {});
console.log(`\nSummary: ${Object.entries(counts).sort((a, b) => ORDER[a[0]] - ORDER[b[0]]).map(([k, v]) => `${v} ${k}`).join(', ')}`);
process.exit(counts.FAIL ? 1 : 0);
