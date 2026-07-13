#!/usr/bin/env node
// Technical SEO/GEO audit of a live site (local dev server or production).
// Usage: node audit-site.mjs <url> [--pages N] [--local]
//   --pages N  sample up to N URLs from the sitemap for page-level checks (default 5)
//   --local    dev-server mode: skip host/HTTPS/HSTS checks that only make sense in
//              production, downgrade noindex/header findings to informational, and
//              resolve production URLs (sitemap, canonicals) against the local origin
// Checks protocol/host canonicalization, robots.txt (incl. AI crawler rules),
// sitemap validity, per-page indexability (title, canonical, meta robots,
// JSON-LD, hreflang, rendering), security/caching headers, 404 behavior.
// Exit codes: 0 = no FAILs, 1 = at least one FAIL, 2 = could not run/complete.
// No dependencies (Node 18+).

const args = process.argv.slice(2);
let LOCAL = false;
let PAGES = 5;
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--local') LOCAL = true;
  else if (a === '--pages') PAGES = parseInt(args[++i], 10);
  else if (a.startsWith('--pages=')) PAGES = parseInt(a.slice(8), 10);
  else if (a.startsWith('--')) { console.error(`Unknown flag "${a}"`); process.exit(2); }
  else positional.push(a);
}
const url = positional[0];

if (!url) {
  console.error('Usage: node audit-site.mjs <url> [--pages N] [--local]');
  process.exit(2);
}
if (!Number.isInteger(PAGES) || PAGES < 0) {
  console.error('Invalid --pages value; expected a non-negative integer');
  process.exit(2);
}

let base;
try {
  base = new URL(url);
  if (!/^https?:$/.test(base.protocol)) throw new Error('not http(s)');
} catch {
  console.error(`Invalid URL "${url}" — include the scheme, e.g. https://example.com`);
  process.exit(2);
}
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
    ...opts,
    headers: { 'user-agent': UA, 'accept-encoding': 'gzip, br', ...opts.headers },
    signal: AbortSignal.timeout(opts.timeout ?? 15000),
  });

const ORDER = { FAIL: 0, WARN: 1, INFO: 2, OK: 3 };
const ICON = { FAIL: '✗ FAIL', WARN: '! WARN', INFO: 'i INFO', OK: '✓ OK  ' };
function printReport() {
  let lastSection = '';
  for (const r of results) {
    if (r.section !== lastSection) { console.log(`\n== ${r.section} ==`); lastSection = r.section; }
    console.log(`${ICON[r.level]}  ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  const counts = results.reduce((a, r) => ((a[r.level] = (a[r.level] ?? 0) + 1), a), {});
  console.log(`\nSummary: ${Object.entries(counts).sort((a, b) => ORDER[a[0]] - ORDER[b[0]]).map(([k, v]) => `${v} ${k}`).join(', ') || 'nothing checked'}`);
  return counts;
}

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

// handles quoted and unquoted attribute values (minified HTML drops quotes)
const parseAttrs = (tag) => {
  const attrs = {};
  for (const m of tag.matchAll(/([a-zA-Z-]+)\s*=\s*(?:["']([^"']*)["']|([^\s"'>]+))/g))
    attrs[m[1].toLowerCase()] = m[2] ?? m[3];
  return attrs;
};

const decodeEntities = (s) =>
  s.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }[e]));

// ---------------------------------------------------------------- 1. host & protocol
section = 'Host & protocol';
let home, homeHtml, finalUrl;
try {
  const r = await follow(base.href);
  home = r.final;
  finalUrl = new URL(r.finalUrl);
  if (!home) fail('homepage fetch', `redirect loop or >10 hops: ${r.hops.map((h) => h.status).join(' → ')}`);
  else if (home.status !== 200) fail('homepage fetch', `status ${home.status} — fix this first; nothing downstream is meaningful while the homepage errors`);
  else {
    ok('homepage fetch', `${home.status} at ${r.finalUrl}`);
    if (r.hops.length > 2) warn('redirect chain', `${r.hops.length - 1} hops to reach final URL — collapse to one redirect`);
  }
  if (!home || home.status !== 200) { printReport(); process.exit(1); }
  homeHtml = await home.text();
} catch (e) {
  console.error(`Could not fetch ${base.href}: ${e.message}`);
  console.error('If the site sits behind bot protection or auth, audit the source instead (see SKILL.md Phase 3).');
  if (results.length) printReport();
  process.exit(2);
}
// base for site-relative probes — supports subpath deployments (https://user.github.io/repo/)
const siteBase = finalUrl.pathname.endsWith('/') ? finalUrl.href : new URL('.', finalUrl.href).href;
const toLocalUrl = (u) => { try { const p = new URL(u); return new URL(p.pathname + p.search, finalUrl.origin).href; } catch { return u; } };

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
// training-corpus opt-out tokens vs search/answer/live-fetch agents — blocking has
// different consequences per class (see references/geo.md)
const TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'meta-externalagent', 'Bytespider'];
const ANSWER_BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Meta-ExternalFetcher'];
let sitemapUrls = [];
try {
  const r = await get(new URL('/robots.txt', finalUrl.origin).href, { redirect: 'follow' });
  if (r.status >= 500) fail('robots.txt', `status ${r.status} — Google initially treats an erroring robots.txt as full-disallow`);
  else if (r.status === 404) warn('robots.txt', '404 — crawlers assume everything allowed; add one to declare sitemap + AI-crawler policy');
  else if (r.status !== 200) info('robots.txt', `status ${r.status}`);
  else {
    const text = (await r.text()).replace(/^﻿/, '');
    if (/^\s*<(!doctype|html)/i.test(text)) {
      fail('robots.txt', 'returns 200 but the body is HTML — crawlers can\'t parse it; serve plain text');
      throw new Error('skip-robots-parse');
    }
    ok('robots.txt', `200, ${text.length} bytes`);
    // parse into groups; any non-user-agent directive ends the current user-agent run
    const groups = []; // {agents: [], rules: [{type, value}], bodyStarted}
    let current = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/#.*$/, '').trim();
      const m = line.match(/^([a-zA-Z-]+)\s*:\s*(.*)$/);
      if (!m) continue;
      const key = m[1].toLowerCase(), value = m[2].trim();
      if (key === 'user-agent') {
        if (!current || current.bodyStarted) { current = { agents: [], rules: [], bodyStarted: false }; groups.push(current); }
        current.agents.push(value.toLowerCase());
      } else {
        if (current) current.bodyStarted = true;
        if (key === 'disallow' || key === 'allow') current?.rules.push({ type: key, value });
        else if (key === 'sitemap') sitemapUrls.push(value);
      }
    }
    const groupFor = (agent) => {
      const a = agent.toLowerCase();
      // longest matching token wins ('*' as fallback); tokens match as a prefix of the agent name
      let best = null, bestLen = -1;
      for (const g of groups) for (const ga of g.agents) {
        if (ga === '*' && bestLen < 0) best = g;
        else if (ga !== '*' && a.startsWith(ga) && ga.length > bestLen) { best = g; bestLen = ga.length; }
      }
      return best;
    };
    const blockedRoot = (g) => !!g &&
      g.rules.some((r2) => r2.type === 'disallow' && r2.value === '/') &&
      !g.rules.some((r2) => r2.type === 'allow' && r2.value === '/');
    if (blockedRoot(groupFor('anybot')))
      fail('global disallow', 'User-agent: * / Disallow: / — the whole site is blocked from crawling');
    else ok('global rules', 'no blanket Disallow: / for *');
    if (sitemapUrls.length) ok('Sitemap directive', sitemapUrls.join(', '));
    else warn('Sitemap directive', 'no Sitemap: line in robots.txt');
    const blockedT = TRAINING_BOTS.filter((b) => blockedRoot(groupFor(b)));
    const blockedA = ANSWER_BOTS.filter((b) => blockedRoot(groupFor(b)));
    const allowed = [...TRAINING_BOTS, ...ANSWER_BOTS].filter((b) => !blockedT.includes(b) && !blockedA.includes(b));
    info('AI crawlers allowed', allowed.join(', ') || 'none');
    if (blockedT.length) info('AI training bots blocked', `${blockedT.join(', ')} — training opt-out only; does not remove the site from AI answers`);
    if (blockedA.length) info('AI search/answer bots blocked', `${blockedA.join(', ')} — this removes the site from AI answers/citations; intentional?${blockedA.includes('Perplexity-User') ? ' (Perplexity-User ignores robots.txt by design — a rule here is cosmetic)' : ''}`);
  }
} catch (e) { if (e.message !== 'skip-robots-parse') fail('robots.txt', `fetch error: ${e.message}`); }

// ---------------------------------------------------------------- 3. sitemap
section = 'Sitemap';
const sitemapDeclared = sitemapUrls.length > 0;
if (LOCAL) {
  // a local build's robots.txt declares the production sitemap URL — fetch the same path locally
  sitemapUrls = sitemapUrls.map(toLocalUrl);
}
if (!sitemapDeclared) {
  // probe conventional locations: site base (covers subpath deployments) then origin root
  sitemapUrls = [...new Set([new URL('sitemap.xml', siteBase).href, new URL('/sitemap.xml', finalUrl.origin).href])];
}
// fetch a sitemap, transparently handling .xml.gz (file-level gzip)
async function fetchXml(u) {
  const r = await get(u, { redirect: 'follow' });
  if (r.status !== 200) return { status: r.status };
  const buf = new Uint8Array(await r.arrayBuffer());
  let xml;
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const { gunzipSync } = await import('node:zlib');
    xml = gunzipSync(buf).toString('utf8');
  } else {
    xml = new TextDecoder().decode(buf);
  }
  return { status: 200, xml, contentType: r.headers.get('content-type') };
}
const extractLocs = (xml) => [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) => decodeEntities(m[1].trim()));
let pageUrls = [];
let sitemapFound = false;
for (const smUrl of sitemapUrls.slice(0, 3)) {
  try {
    const r = await fetchXml(smUrl);
    if (r.status !== 200) {
      if (sitemapDeclared) fail(`sitemap ${smUrl}`, `declared in robots.txt but returns ${r.status}`);
      continue;
    }
    const xml = r.xml;
    if (!/<(urlset|sitemapindex)[\s>]/i.test(xml)) {
      fail(`sitemap ${smUrl}`, `response is not sitemap XML (content-type: ${r.contentType ?? 'unknown'}) — likely a soft-404 HTML page`);
      continue;
    }
    sitemapFound = true;
    if (xml.length > 50 * 1024 * 1024) fail(`sitemap size`, `${(xml.length / 1e6).toFixed(1)}MB — over the 50MB uncompressed limit`);
    const isIndex = /<sitemapindex[\s>]/i.test(xml);
    let urlsetXml = xml;
    if (isIndex) {
      const children = extractLocs(xml);
      ok(`sitemap index`, `${smUrl}: ${children.length} child sitemaps`);
      if (children[0]) {
        const childUrl = LOCAL ? toLocalUrl(children[0]) : children[0];
        const cr = await fetchXml(childUrl);
        if (cr.status === 200) urlsetXml = cr.xml;
        else { fail('child sitemap', `${childUrl}: status ${cr.status}`); continue; }
      }
    }
    const locs = extractLocs(urlsetXml);
    if (!locs.length) { fail(`sitemap ${smUrl}`, 'no <loc> entries found'); continue; }
    if (!isIndex && locs.length > 50000) fail('sitemap URL count', `${locs.length} — over the 50,000-per-file limit; split into a sitemap index`);
    else ok(`sitemap URLs`, `${locs.length} URLs${isIndex ? ' (first child)' : ''}`);
    const rel = locs.filter((l) => !/^https?:\/\//i.test(l));
    if (rel.length) fail('sitemap <loc> URLs', `${rel.length} relative URLs (must be absolute), e.g. ${rel[0]}`);
    const crossHost = locs.filter((l) => { try { return new URL(l).hostname !== finalUrl.hostname; } catch { return true; } });
    if (LOCAL && crossHost.length === locs.length - rel.length && crossHost.length > 0) {
      // local audit of a build whose sitemap lists production URLs — expected; sample them against the local origin
      info('sitemap host', `sitemap lists ${crossHost[0].split('/')[2] ?? 'production'} URLs (expected for a local build) — sampling their paths against ${finalUrl.origin}`);
    } else if (crossHost.length) warn('sitemap host match', `${crossHost.length} URLs on a different host, e.g. ${crossHost[0]}`);
    const badLastmod = [...urlsetXml.matchAll(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/gi)]
      .map((m) => m[1].trim()).filter((d) => Number.isNaN(Date.parse(d)));
    if (badLastmod.length) warn('sitemap lastmod', `${badLastmod.length} unparseable dates, e.g. "${badLastmod[0]}" — use W3C datetime`);
    pageUrls = locs;
    break;
  } catch (e) { fail(`sitemap ${smUrl}`, `fetch error: ${e.message}`); }
}
if (!sitemapDeclared && !sitemapFound)
  warn('sitemap', 'no sitemap found at conventional paths — optional per Google, but recommended precisely for new sites with few inbound links');
if (!pageUrls.length) info('page sampling', 'no usable sitemap — page-level checks limited to the homepage');

// ---------------------------------------------------------------- 4. page-level checks
section = 'Pages';
const seenTitles = new Map(), seenDescs = new Map();

async function auditPage(pageUrl, html, headers, { isHome }) {
  const p = (name, level, detail) => add(level, `${new URL(pageUrl).pathname} ${name}`, detail);
  const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [, html])[1];

  const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  if (!title) p('<title>', 'FAIL', 'missing');
  else if (title.length > 60) p('<title>', 'WARN', `${title.length} chars — may truncate in SERPs (keep ≲60)`);
  else p('<title>', 'OK', `"${title}"`);
  if (title) seenTitles.set(title, [...(seenTitles.get(title) ?? []), new URL(pageUrl).pathname]);

  const metas = [...head.matchAll(/<meta\s+[^>]*>/gi)].map((m) => parseAttrs(m[0]));
  const metaName = (n) => metas.find((a) => a.name?.toLowerCase() === n)?.content;

  const desc = metaName('description');
  if (!desc) p('meta description', 'WARN', 'missing — search/AI engines will synthesize a snippet');
  else if (desc.length > 160) p('meta description', 'WARN', `${desc.length} chars (keep 50–160)`);
  else if (desc.length < 50) p('meta description', 'INFO', `${desc.length} chars — short (aim for 50–160)`);
  else p('meta description', 'OK', `${desc.length} chars`);
  if (desc) seenDescs.set(desc, [...(seenDescs.get(desc) ?? []), new URL(pageUrl).pathname]);

  // indexability: every meta robots tag + X-Robots-Tag; "none" as a standalone
  // directive means noindex,nofollow ("max-image-preview:none" does not)
  const robotsMetas = metas.filter((a) => a.name?.toLowerCase() === 'robots').map((a) => a.content ?? '');
  const xRobots = headers.get('x-robots-tag') ?? '';
  const hasNoindex = (v) => v.split(',').some((raw) => {
    let t = raw.trim().toLowerCase();
    // strip a user-agent prefix ("googlebot: noindex" in X-Robots-Tag) but keep
    // valued directives (max-image-preview:none is NOT a noindex) intact
    const m = t.match(/^([a-z0-9_*-]+)\s*:\s*(.+)$/);
    if (m && !/^(max-|unavailable_after|crawl-delay)/.test(m[1])) t = m[2].trim();
    return t === 'noindex' || t === 'none';
  });
  const metaNoindex = robotsMetas.find(hasNoindex);
  if (metaNoindex !== undefined) p('meta robots', LOCAL ? 'INFO' : 'FAIL', `"${metaNoindex}" — page is noindexed`);
  if (hasNoindex(xRobots)) p('X-Robots-Tag', LOCAL ? 'INFO' : 'FAIL', `"${xRobots}" — page is noindexed at the header level`);
  if (metaNoindex === undefined && !hasNoindex(xRobots)) p('indexable', 'OK', 'no noindex in meta robots or X-Robots-Tag');

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
      const samePath = canon.pathname.replace(/\/$/, '') === page.pathname.replace(/\/$/, '');
      if (canon.origin === page.origin && samePath) p('canonical', 'OK', 'self-referencing');
      else if (canon.hostname === page.hostname && samePath) {
        if (canon.protocol !== page.protocol)
          p('canonical', 'FAIL', `"${href}" — wrong protocol (${canon.protocol} vs served ${page.protocol}) — canonical must match the served origin`);
        else p('canonical', LOCAL ? 'INFO' : 'WARN', `"${href}" — port differs from the served URL (${canon.port || 'default'} vs ${page.port || 'default'})`);
      } else if (LOCAL && samePath) p('canonical', 'INFO', `points to ${canon.origin}${canon.pathname} — production origin, expected in a local build`);
      else p('canonical', LOCAL ? 'INFO' : 'WARN', `points to ${href} — this page declares itself a duplicate; intended?`);
    }
  }

  // lang & viewport & charset (homepage only to reduce noise)
  if (isHome) {
    const langAttr = parseAttrs(html.match(/<html[^>]*>/i)?.[0] ?? '').lang;
    if (langAttr) p('html lang', 'OK', langAttr);
    else p('html lang', 'WARN', 'missing lang attribute on <html>');
    if (metas.some((a) => a.name?.toLowerCase() === 'viewport')) p('viewport', 'OK', '');
    else p('viewport', 'FAIL', 'no viewport meta — fails mobile-first indexing basics');
    if (/<meta\s+charset/i.test(head) || /charset=/i.test(headers.get('content-type') ?? '')) p('charset', 'OK', '');
    else p('charset', 'WARN', 'no charset declared in meta or Content-Type');
    if (linkTags.some((a) => /icon/.test(a.rel ?? ''))) p('favicon', 'OK', '');
    else {
      const fav = await get(new URL('/favicon.ico', pageUrl).href, { redirect: 'follow', timeout: 8000 }).catch(() => null);
      if (fav?.status === 200 && /image|icon/i.test(fav.headers.get('content-type') ?? ''))
        p('favicon', 'OK', 'default /favicon.ico served (no <link rel=icon>, which is fine)');
      else p('favicon', 'WARN', 'no icon link and no /favicon.ico — favicons show in SERPs and AI citations');
    }
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
    // in --local mode alternates point at production, so match by path only; otherwise host+path
    const hasSelf = hreflangs.some((a) => {
      try {
        const alt = new URL(a.href, pageUrl), page = new URL(pageUrl);
        const samePath = alt.pathname.replace(/\/$/, '') === page.pathname.replace(/\/$/, '');
        return samePath && (LOCAL || alt.hostname === page.hostname);
      } catch { return false; }
    });
    const hasDefault = hreflangs.some((a) => a.hreflang.toLowerCase() === 'x-default');
    p('hreflang', hasSelf ? 'OK' : 'WARN', `${hreflangs.length} alternates${hasSelf ? ', self-referencing' : ' — missing self-reference (required)'}${hasDefault ? ', has x-default' : ', no x-default'}`);
    const bad = hreflangs.filter((a) =>
      !/^[a-z]{2,3}(-[A-Za-z]{4})?(-[A-Za-z]{2}|-\d{3})?$|^x-default$/i.test(a.hreflang) ||
      /-uk$/i.test(a.hreflang)); // the classic: en-UK is invalid, the region code is GB
    if (bad.length) p('hreflang codes', 'FAIL', `invalid codes: ${bad.map((a) => a.hreflang).join(', ')} (use ISO 639-1 language + ISO 3166-1 region, e.g. en-GB not en-UK)`);
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
  const csrMarkers =
    /<div[^>]*id\s*=\s*["']?(root|app|__next|__nuxt|svelte)["']?[^>]*>\s*<\/div>/i.test(html) ||
    /<noscript[^>]*>[^<]*(enable JavaScript|JavaScript is required)/i.test(html);
  if (bodyText.length < 200 && csrMarkers)
    p('server-rendered content', 'FAIL', `empty app-root container and only ${bodyText.length} chars of text in raw HTML — content is client-rendered; most AI crawlers do not execute JS`);
  else if (bodyText.length < 200)
    p('server-rendered content', 'WARN', `only ${bodyText.length} chars of text in raw HTML — thin for search/AI snippets (fine if the page is genuinely minimal)`);
  else p('server-rendered content', 'OK', `${bodyText.length} chars of text in raw HTML`);

  // mixed content: http:// in resource-loading positions only
  // (<a href> links and non-resource <link> rels like alternate/canonical are not mixed content)
  if (new URL(pageUrl).protocol === 'https:') {
    const mixed = [
      ...[...html.matchAll(/<(?:img|script|iframe|source|video|audio|embed|track)[^>]+(?:src|srcset)\s*=\s*["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1]),
      ...[...html.matchAll(/<link\s+[^>]*>/gi)].map((m) => parseAttrs(m[0]))
        .filter((a) => /stylesheet|preload|prefetch|icon|manifest|modulepreload/i.test(a.rel ?? '') && a.href?.startsWith('http://'))
        .map((a) => a.href),
    ];
    if (mixed.length) p('mixed content', 'WARN', `${mixed.length} http:// resources, e.g. ${mixed[0]}`);
  }
}

await auditPage(finalUrl.href, homeHtml, home.headers, { isHome: true });

// in --local mode, sample sitemap paths against the local origin (sitemaps of local builds list production URLs)
const sample = pageUrls
  .map((u) => { try { return LOCAL ? toLocalUrl(u) : new URL(u).href; } catch { return null; } })
  .filter((u) => u && u !== finalUrl.href);
const step = Math.max(1, Math.floor(sample.length / PAGES));
const sampled = sample.filter((_, i) => i % step === 0).slice(0, PAGES);
for (const pUrl of sampled) {
  try {
    const r = await follow(pUrl);
    if (!r.final || r.final.status !== 200) {
      fail(`${new URL(pUrl).pathname}`, `sitemap URL returns ${r.final?.status ?? 'redirect loop'} — sitemaps must list only 200-status canonical URLs`);
      continue;
    }
    if (r.hops.length > 1) warn(`${new URL(pUrl).pathname}`, `sitemap URL redirects (${r.hops.length - 1} hop${r.hops.length > 2 ? 's' : ''}) — list final URLs directly`);
    await auditPage(r.finalUrl, await r.final.text(), r.final.headers, { isHome: false });
  } catch (e) { warn(`${new URL(pUrl).pathname}`, `fetch error: ${e.message}`); }
}

// duplicate titles/descriptions across sampled pages
for (const [t, paths] of seenTitles) if (paths.length > 1)
  warn('duplicate <title>', `"${t}" on ${paths.length} pages (${paths.slice(0, 3).join(', ')}${paths.length > 3 ? ', …' : ''})`);
for (const [d, paths] of seenDescs) if (paths.length > 1)
  warn('duplicate meta description', `shared by ${paths.length} pages (${paths.slice(0, 3).join(', ')}${paths.length > 3 ? ', …' : ''})`);

// ---------------------------------------------------------------- 5. server behavior
section = 'Server behavior';

// 404 handling (probe under the site's base path, not the bare origin — matters for subpath deployments)
try {
  const r = await get(new URL(`definitely-not-a-page-${Date.now()}`, siteBase).href, { redirect: 'follow' });
  if (r.status === 404 || r.status === 410) ok('404 handling', `${r.status} for unknown paths`);
  else if (r.status === 200) fail('404 handling', 'unknown path returns 200 (soft 404) — search engines waste crawl budget and may index junk URLs');
  else warn('404 handling', `unknown path returns ${r.status}`);
} catch (e) { info('404 handling', `error: ${e.message}`); }

// trailing slash consistency (use a sampled non-root path)
const slashProbe = sampled.find((u) => { try { return new URL(u).pathname.length > 1; } catch { return false; } });
if (slashProbe) {
  try {
    const pu = new URL(slashProbe);
    const variant = pu.pathname.endsWith('/') ? pu.pathname.slice(0, -1) : pu.pathname + '/';
    const r = await get(new URL(variant, pu.origin).href);
    if (r.status >= 300 && r.status < 400) ok('trailing slash', `variant redirects (${r.status}) — single canonical form`);
    else if (r.status === 200) warn('trailing slash', `both ${pu.pathname} and ${variant} serve 200 — duplicate URLs unless canonicals disambiguate`);
    else info('trailing slash', `variant returns ${r.status}`);
  } catch { /* skip */ }
} else info('trailing slash', 'not checked — no non-root page available from the sitemap');

// compression + caching + nosniff on the homepage response
// dev/preview servers legitimately skip compression and hardening headers — informational in --local mode
const hdrLevel = LOCAL ? info : warn;
const enc = home.headers.get('content-encoding');
if (enc) ok('compression', enc);
else hdrLevel('compression', 'no content-encoding on HTML — enable gzip/brotli' + (LOCAL ? ' (check production)' : ''));
if ((home.headers.get('x-content-type-options') ?? '').toLowerCase() === 'nosniff') ok('X-Content-Type-Options', 'nosniff');
else hdrLevel('X-Content-Type-Options', 'missing nosniff' + (LOCAL ? ' (check production)' : ''));

// static asset caching: sample one script/css from homepage
const assetUrl = homeHtml.match(/<(?:script[^>]*src|link[^>]*rel=["']stylesheet["'][^>]*href)\s*=\s*["']([^"']+)["']/i)?.[1] ??
  homeHtml.match(/(?:src|href)\s*=\s*["']([^"']+\.(?:js|css))["']/i)?.[1];
if (assetUrl) {
  try {
    const r = await get(new URL(assetUrl, finalUrl.href).href, { redirect: 'follow' });
    const cc = r.headers.get('cache-control') ?? '';
    if (/max-age=(\d{5,})/.test(cc) || /immutable/.test(cc)) ok('asset caching', cc);
    else hdrLevel('asset caching', `Cache-Control: "${cc || '(none)'}" on ${assetUrl} — long-lived caching (immutable + hashed filenames) helps CWV${LOCAL ? ' (check production)' : ''}`);
  } catch { /* skip */ }
}

// ---------------------------------------------------------------- 6. GEO discovery files
section = 'GEO / discovery';
try {
  const r = await get(new URL('llms.txt', siteBase).href, { redirect: 'follow' });
  if (r.status === 200 && /text\/(plain|markdown)/.test(r.headers.get('content-type') ?? '')) info('llms.txt', 'present (emerging convention; no confirmed adoption by major AI engines — harmless, low priority)');
  else info('llms.txt', 'not present (emerging convention; no confirmed adoption by major AI engines — optional)');
} catch { /* skip */ }

// ---------------------------------------------------------------- report
const counts = printReport();
process.exit(counts.FAIL ? 1 : 0);
