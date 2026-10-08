#!/usr/bin/env node
// Capture a website's design evidence for a design-md reference.
// Usage: node capture.mjs <url> <out-dir> [--prefix <name>]
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    const globalRoot = execSync('npm root -g').toString().trim();
    return createRequire(path.join(globalRoot, 'noop.js'))('playwright');
  }
}
const { chromium } = await loadPlaywright();

const [url, outDir, ...rest] = process.argv.slice(2);
if (!url || !outDir) {
  console.error('Usage: node capture.mjs <url> <out-dir> [--prefix <name>]');
  process.exit(1);
}
const prefixIdx = rest.indexOf('--prefix');
const prefix = prefixIdx >= 0 ? `${rest[prefixIdx + 1]}-` : '';

const shotsDir = path.join(outDir, 'screenshots');
const assetsDir = path.join(outDir, 'assets');
for (const d of ['images', 'svg', 'fonts', 'icons', 'css', 'media']) {
  await fs.mkdir(path.join(assetsDir, d), { recursive: true });
}
await fs.mkdir(shotsDir, { recursive: true });

const launchOpts = {};
try {
  await fs.access('/opt/pw-browsers/chromium');
  launchOpts.executablePath = '/opt/pw-browsers/chromium';
} catch {}
const browser = await chromium.launch(launchOpts);

const responses = new Map();
const failedHosts = new Set();
const KIND_BY_TYPE = [
  [/font|woff|ttf|otf/, 'fonts'],
  [/svg/, 'svg'],
  [/image/, 'images'],
  [/css/, 'css'],
  [/video|audio/, 'media'],
];

function kindFor(resUrl, contentType) {
  const probe = `${contentType} ${resUrl.split('?')[0]}`.toLowerCase();
  if (/favicon|apple-touch|\/icon/.test(probe)) return 'icons';
  for (const [re, kind] of KIND_BY_TYPE) if (re.test(probe)) return kind;
  return null;
}

function fileNameFor(resUrl, kind) {
  const u = new URL(resUrl);
  let base = path.basename(u.pathname) || 'index';
  base = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  if (!path.extname(base)) {
    const ext = { fonts: '.woff2', svg: '.svg', css: '.css', images: '.img', icons: '.ico', media: '.bin' }[kind];
    base += ext;
  }
  const hash = crypto.createHash('sha1').update(resUrl).digest('hex').slice(0, 6);
  return `${prefix}${hash}-${base}`;
}

async function savePage(page) {
  page.on('requestfailed', (req) => {
    try { failedHosts.add(new URL(req.url()).host); } catch {}
  });
  page.on('response', async (res) => {
    const resUrl = res.url();
    if (responses.has(resUrl) || resUrl.startsWith('data:')) return;
    const kind = kindFor(resUrl, res.headers()['content-type'] || '');
    if (!kind || res.status() >= 400) return;
    try {
      const body = await res.body();
      if (body.length > 15 * 1024 * 1024) return;
      const file = path.join(kind, fileNameFor(resUrl, kind));
      await fs.writeFile(path.join(assetsDir, file), body);
      responses.set(resUrl, { file: `assets/${file}`, bytes: body.length, type: res.headers()['content-type'] });
    } catch {}
  });
}

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.8;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 250));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
];

let data;
for (const vp of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    deviceScaleFactor: vp.deviceScaleFactor || 1,
  });
  const page = await ctx.newPage();
  await savePage(page);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => page.waitForTimeout(5000));
  await scrollThrough(page);
  await page.screenshot({ path: path.join(shotsDir, `${prefix}${vp.name}-fold.png`) });
  await page.screenshot({ path: path.join(shotsDir, `${prefix}${vp.name}-full.png`), fullPage: true });

  if (vp.name === 'desktop') {
    data = await page.evaluate(extractDesign);
    // Section-level screenshots make component crops easy to reference from DESIGN.md.
    const sections = await page.$$('header, nav, main > section, main > div > section, section, footer');
    let i = 0;
    for (const el of sections.slice(0, 30)) {
      const box = await el.boundingBox();
      if (!box || box.height < 40) continue;
      await el.screenshot({ path: path.join(shotsDir, `${prefix}section-${String(++i).padStart(2, '0')}.png`) }).catch(() => {});
    }
    // Hover states of the first few buttons/links.
    const ctas = await page.$$('a[class*="button" i], a[class*="btn" i], button');
    let h = 0;
    for (const el of ctas.slice(0, 6)) {
      if (!(await el.isVisible())) continue;
      await el.scrollIntoViewIfNeeded();
      await el.hover().catch(() => {});
      await page.waitForTimeout(400);
      await el.screenshot({ path: path.join(shotsDir, `${prefix}hover-${++h}.png`) }).catch(() => {});
    }
  }
  await ctx.close();
}
await browser.close();

for (const [i, svg] of (data.inlineSvgs || []).entries()) {
  await fs.writeFile(path.join(assetsDir, 'svg', `${prefix}inline-${String(i + 1).padStart(2, '0')}.svg`), svg);
}
data.inlineSvgCount = data.inlineSvgs.length;
delete data.inlineSvgs;
data.url = url;
data.capturedAt = new Date().toISOString();
data.downloadedAssets = Object.fromEntries(responses);
data.failedHosts = [...failedHosts];

await fs.writeFile(path.join(outDir, `${prefix}capture.json`), JSON.stringify(data, null, 2));
console.log(`Saved ${responses.size} assets, ${data.inlineSvgCount} inline SVGs, screenshots in ${shotsDir}`);
if (failedHosts.size) console.warn(`Requests failed for: ${[...failedHosts].join(', ')} (blocked by a network policy?)`);

// Runs in the page.
function extractDesign() {
  const cs = (el) => getComputedStyle(el);
  const pick = (el, props) => {
    const s = cs(el);
    return Object.fromEntries(props.map((p) => [p, s.getPropertyValue(p)]));
  };
  const TYPE = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-transform', 'color'];
  const BOX = ['background-color', 'background-image', 'border', 'border-radius', 'box-shadow', 'padding', 'margin', 'gap', 'max-width', 'backdrop-filter'];
  const MOTION = ['transition', 'animation'];

  const rootVars = {};
  const mediaQueries = new Set();
  const fontFaces = [];
  const keyframes = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => {
      for (const r of list) {
        if (r.selectorText && /(^|,)\s*(:root|html|body)\s*(,|$)/.test(r.selectorText)) {
          for (const prop of r.style) if (prop.startsWith('--')) rootVars[prop] = r.style.getPropertyValue(prop).trim();
        }
        if (r instanceof CSSMediaRule) { mediaQueries.add(r.conditionText || r.media.mediaText); walk(r.cssRules); }
        if (r instanceof CSSFontFaceRule) fontFaces.push(r.cssText);
        if (r instanceof CSSKeyframesRule) keyframes.push(r.cssText.slice(0, 1500));
        if (r.cssRules && !(r instanceof CSSMediaRule) && !(r instanceof CSSKeyframesRule)) walk(r.cssRules);
      }
    };
    walk(rules);
  }

  const colors = {};
  const fonts = {};
  const radii = {};
  const shadows = {};
  const fontSizes = {};
  const bump = (m, k) => { if (k && k !== 'none' && k !== 'rgba(0, 0, 0, 0)' && k !== '0px') m[k] = (m[k] || 0) + 1; };
  const all = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().width > 0);
  for (const el of all) {
    const s = cs(el);
    bump(colors, s.color);
    bump(colors, s.backgroundColor);
    bump(colors, s.borderTopColor !== s.color ? s.borderTopColor : null);
    bump(fonts, `${s.fontFamily} | ${s.fontWeight}`);
    bump(radii, s.borderRadius);
    bump(shadows, s.boxShadow);
    if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) bump(fontSizes, s.fontSize);
  }
  const top = (m, n = 30) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);

  const sample = (selector, n = 4, props = [...TYPE, ...BOX, ...MOTION]) =>
    [...document.querySelectorAll(selector)]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .slice(0, n)
      .map((el) => ({ tag: el.tagName.toLowerCase(), class: el.className?.baseVal ?? el.className, text: el.textContent.trim().slice(0, 80), ...pick(el, props) }));

  const outline = [...document.querySelectorAll('header, nav, section, footer, h1, h2, h3')]
    .filter((el) => el.getBoundingClientRect().width > 0)
    .map((el) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}: ${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 100)}`);

  return {
    title: document.title,
    meta: Object.fromEntries([...document.querySelectorAll('meta[name], meta[property]')].map((m) => [m.getAttribute('name') || m.getAttribute('property'), m.content])),
    links: [...document.querySelectorAll('link[rel*="icon"], link[rel="manifest"], link[rel="stylesheet"], link[rel="preload"]')].map((l) => ({ rel: l.rel, href: l.href })),
    rootVars,
    mediaQueries: [...mediaQueries],
    fontFaces,
    keyframes: keyframes.slice(0, 20),
    frequency: { colors: top(colors), fonts: top(fonts, 15), fontSizes: top(fontSizes, 20), radii: top(radii, 15), shadows: top(shadows, 10) },
    body: pick(document.body, [...TYPE, ...BOX]),
    elements: {
      h1: sample('h1', 2), h2: sample('h2', 4), h3: sample('h3', 4), p: sample('p', 4), small: sample('small, figcaption, [class*="eyebrow" i], [class*="label" i]', 4),
      nav: sample('header, nav', 2, [...BOX, 'position', 'height', 'z-index']),
      navLinks: sample('nav a', 6),
      buttons: sample('button, a[class*="button" i], a[class*="btn" i], [role="button"]', 8),
      inputs: sample('input, textarea, select', 4),
      cards: sample('[class*="card" i], article, li[class]', 6),
      sections: sample('section', 12, [...BOX, 'min-height']),
      footer: sample('footer', 1, [...TYPE, ...BOX]),
      containers: sample('[class*="container" i], [class*="wrapper" i], main > *', 4, ['max-width', 'padding', 'margin', 'display', 'grid-template-columns', 'gap']),
    },
    images: [...document.images].map((i) => ({ src: i.currentSrc || i.src, alt: i.alt, w: i.naturalWidth, h: i.naturalHeight })),
    backgroundImages: [...new Set(all.map((el) => cs(el).backgroundImage).filter((b) => b && b !== 'none'))].slice(0, 40),
    inlineSvgs: [...document.querySelectorAll('svg')].filter((s) => s.getBoundingClientRect().width > 0).slice(0, 80).map((s) => s.outerHTML),
    outline,
  };
}
