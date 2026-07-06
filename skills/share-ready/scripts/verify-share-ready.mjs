#!/usr/bin/env node
// Verify a page's sharing/browser metadata end-to-end.
// Usage: node verify-share-ready.mjs <url>
// Fetches the rendered HTML, parses <head>, checks required tags, then
// requests every referenced asset (favicons, og:image, manifest) and
// validates status, content-type, and og:image weight.
// Exits 1 if any FAIL. No dependencies (Node 18+).

const url = process.argv[2];
if (!url) {
  console.error('Usage: node verify-share-ready.mjs <url>');
  process.exit(2);
}

const results = [];
const add = (level, name, detail) => results.push({ level, name, detail });

const res = await fetch(url, { redirect: 'follow' });
if (!res.ok) {
  console.error(`FAIL page fetch: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const html = await res.text();
const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [, html])[1];

const metas = {};
for (const m of head.matchAll(/<meta\s+[^>]*>/gi)) {
  const tag = m[0];
  const key =
    tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
  const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
  if (key !== undefined) {
    if (key in metas) add('WARN', `duplicate meta: ${key}`, 'scrapers may pick either one');
    metas[key] = content ?? '';
  }
}
const links = {};
for (const m of head.matchAll(/<link\s+[^>]*>/gi)) {
  const tag = m[0];
  const rel = tag.match(/rel\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
  const href = tag.match(/href\s*=\s*["']([^"']*)["']/i)?.[1];
  if (rel) (links[rel] ??= []).push(href ?? '');
}
const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();

// --- required tags ---
const check = (cond, name, okDetail, failDetail) =>
  add(cond ? 'OK' : 'FAIL', name, cond ? okDetail : failDetail);

check(!!title, '<title>', title, 'missing');
if (title && title.length > 60) add('WARN', '<title> length', `${title.length} chars — may truncate in tabs/SERPs (keep ≲60)`);

const desc = metas['description'];
check(!!desc, 'meta description', `${desc?.length} chars`, 'missing');
if (desc && (desc.length < 50 || desc.length > 160)) add('WARN', 'description length', `${desc.length} chars — aim for 50–160`);

for (const t of ['og:title', 'og:description', 'og:image', 'og:url', 'og:type', 'og:site_name']) {
  check(!!metas[t], t, metas[t], 'missing');
}
check(!!metas['twitter:card'], 'twitter:card', metas['twitter:card'], "missing — X falls back to OG but card type won't be summary_large_image");
if (metas['twitter:card'] && !['summary', 'summary_large_image', 'app', 'player'].includes(metas['twitter:card']))
  add('FAIL', 'twitter:card value', `"${metas['twitter:card']}" is not a valid card type`);

if (!metas['og:image:width'] || !metas['og:image:height'])
  add('WARN', 'og:image:width/height', 'missing — first-share render on Facebook/WhatsApp may skip the image until the scraper fetches it');

check(!!links['canonical']?.length, 'link rel=canonical', links['canonical']?.[0], 'missing');
check(!!links['icon']?.length || !!links['shortcut icon']?.length, 'favicon link', (links['icon'] || links['shortcut icon'])?.join(', '), 'missing');
check(!!links['apple-touch-icon']?.length, 'apple-touch-icon', links['apple-touch-icon']?.[0], 'missing — iOS share sheet / home screen falls back to a page screenshot');
check(!!links['manifest']?.length, 'link rel=manifest', links['manifest']?.[0], 'missing');
check(!!metas['theme-color'], 'theme-color', metas['theme-color'], 'missing');

// --- fetch every referenced asset ---
const abs = (u) => new URL(u, url).href;
const assets = new Map(); // href -> label
for (const [rel, hrefs] of Object.entries(links))
  if (['icon', 'shortcut icon', 'apple-touch-icon', 'manifest'].includes(rel))
    hrefs.filter(Boolean).forEach((h) => assets.set(h, `link[${rel}]`));
if (metas['og:image']) assets.set(metas['og:image'], 'og:image');
if (metas['twitter:image']) assets.set(metas['twitter:image'], 'twitter:image');

for (const [href, label] of assets) {
  let target;
  try {
    target = abs(href);
  } catch {
    add('FAIL', `${label} URL`, `unparseable href "${href}"`);
    continue;
  }
  if ((label === 'og:image' || label === 'twitter:image') && !/^https?:\/\//.test(href))
    add('FAIL', `${label} absolute URL`, `"${href}" is relative — scrapers require an absolute URL`);
  try {
    const r = await fetch(target, { redirect: 'follow' });
    const type = r.headers.get('content-type') || '?';
    const bytes = (await r.arrayBuffer()).byteLength;
    if (!r.ok) {
      add('FAIL', `${label} fetch`, `${target} → ${r.status}`);
      continue;
    }
    add('OK', `${label} fetch`, `${target} → ${r.status} ${type} ${(bytes / 1024).toFixed(0)}KB`);
    if (label === 'og:image') {
      if (bytes > 5 * 1024 * 1024) add('FAIL', 'og:image weight', `${(bytes / 1048576).toFixed(1)}MB — several scrapers cap at ~5MB (WhatsApp far less)`);
      else if (bytes > 600 * 1024) add('WARN', 'og:image weight', `${(bytes / 1024).toFixed(0)}KB — WhatsApp may skip images this heavy; aim <600KB`);
      if (/svg/.test(type)) add('FAIL', 'og:image format', 'SVG is not rendered by scrapers — use PNG/JPEG/WebP');
    }
    if (label === 'link[manifest]') {
      try {
        const man = JSON.parse(new TextDecoder().decode(await (await fetch(target)).arrayBuffer()));
        const sizes = (man.icons || []).map((i) => i.sizes);
        if (!sizes.includes('192x192') || !sizes.includes('512x512'))
          add('WARN', 'manifest icons', `sizes present: [${sizes}] — installable PWAs need 192x192 and 512x512`);
        if (!(man.icons || []).some((i) => (i.purpose || '').includes('maskable')))
          add('WARN', 'manifest maskable', 'no maskable icon — Android may letterbox the icon');
        for (const k of ['name', 'short_name']) if (!man[k]) add('WARN', `manifest ${k}`, 'missing');
      } catch {
        add('FAIL', 'manifest JSON', 'did not parse as JSON');
      }
    }
  } catch (e) {
    add('FAIL', `${label} fetch`, `${target} → ${e.message}`);
  }
}

// --- report ---
const pad = (s) => s.padEnd(4);
let fails = 0;
for (const { level, name, detail } of results) {
  if (level === 'FAIL') fails++;
  console.log(`${pad(level)} ${name}${detail ? ` — ${detail}` : ''}`);
}
console.log(`\n${results.filter((r) => r.level === 'OK').length} ok, ${results.filter((r) => r.level === 'WARN').length} warn, ${fails} fail`);
process.exit(fails ? 1 : 0);
