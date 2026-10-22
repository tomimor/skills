#!/usr/bin/env node
// Inspect the footer of a live site: screenshots at desktop + mobile widths and a
// compact outline of its structure with the computed styles that matter for a rebuild.
// Usage: node inspect_footer.mjs <url> [out-dir] [--selector "css"]
// Requires playwright (project devDependency or npx). Set CHROME_PATH to use an existing
// Chromium/Chrome binary; HTTPS_PROXY is passed to the browser when set.

import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

const pw = await import('playwright').catch(() => {
  const req = createRequire(join(process.cwd(), 'noop.js'));
  return import(pathToFileURL(req.resolve('playwright')).href);
});
const { chromium } = pw.chromium ? pw : pw.default;

const args = process.argv.slice(2);
const selIdx = args.indexOf('--selector');
const selector = selIdx !== -1 ? args.splice(selIdx, 2)[1] : null;
const [url, outArg = 'footer-inspect'] = args;
if (!url) {
  console.error('Usage: node inspect_footer.mjs <url> [out-dir] [--selector "css"]');
  process.exit(2);
}
const out = resolve(outArg);
mkdirSync(out, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

// Runs in the page. Finds the footer, then walks it into a trimmed outline.
function outline(sel) {
  const pick = () => {
    if (sel) return document.querySelector(sel);
    const cands = [...document.querySelectorAll('footer, [role="contentinfo"], [class*="footer" i], [id*="footer" i]')]
      .filter((el) => el.getBoundingClientRect().height > 40);
    // outermost, lowest on the page
    return cands.sort((a, b) =>
      (b.getBoundingClientRect().bottom + scrollY) - (a.getBoundingClientRect().bottom + scrollY)
      || b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0] || null;
  };
  const root = pick();
  if (!root) return null;
  const KEYS = ['display', 'position', 'gridTemplateColumns', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
    'padding', 'margin', 'width', 'maxWidth', 'height', 'color', 'backgroundColor', 'backgroundImage', 'border',
    'borderRadius', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform',
    'opacity', 'transform', 'transition', 'animation', 'mixBlendMode', 'overflow'];
  const DEFAULTS = { display: 'block', position: 'static', gridTemplateColumns: 'none', flexDirection: 'row',
    justifyContent: 'normal', alignItems: 'normal', gap: 'normal', padding: '0px', margin: '0px', maxWidth: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', borderRadius: '0px', letterSpacing: 'normal',
    textTransform: 'none', opacity: '1', transform: 'none', transition: 'all', animation: 'none',
    mixBlendMode: 'normal', overflow: 'visible' };
  const INHERITED = ['color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform'];
  const parentStyle = new WeakMap();
  let count = 0;
  const walk = (el, depth) => {
    if (count++ > 400 || depth > 12) return null;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return null;
    const r = el.getBoundingClientRect();
    const style = {};
    const inherited = parentStyle.get(el.parentElement) || {};
    for (const k of KEYS) {
      let v = cs[k];
      if (!v || v === DEFAULTS[k]) continue;
      if (k === 'border' && /^0px/.test(v)) continue;
      if (k === 'transition' && /^all 0s/.test(v)) continue;
      if (k === 'animation' && /^none/.test(v)) continue;
      if (INHERITED.includes(k) && inherited[k] === v) continue;
      if (k === 'width' || k === 'height') v = `${Math.round(k === 'width' ? r.width : r.height)}px`;
      style[k] = v;
    }
    parentStyle.set(el, Object.fromEntries(INHERITED.map((k) => [k, cs[k]])));
    const node = { tag: el.tagName.toLowerCase() };
    if (el.className && typeof el.className === 'string') node.class = el.className.trim().split(/\s+/).slice(0, 3).join(' ');
    if (el.tagName === 'A') node.href = el.getAttribute('href');
    if (['IMG', 'VIDEO', 'CANVAS', 'SVG', 'svg', 'IFRAME', 'INPUT', 'BUTTON'].includes(el.tagName)) node.media = true;
    const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (ownText) node.text = ownText.slice(0, 80);
    if (Object.keys(style).length) node.style = style;
    if (el.tagName.toLowerCase() !== 'svg') {
      const kids = [...el.children].map((c) => walk(c, depth + 1)).filter(Boolean);
      if (kids.length) node.children = kids;
    }
    if (!r.width && !r.height && !node.children && !node.text) return null;
    return node;
  };
  const r = root.getBoundingClientRect();
  return {
    selector: sel || (root.id ? `#${root.id}` : root.tagName.toLowerCase() + (root.className ? '.' + String(root.className).trim().split(/\s+/)[0] : '')),
    box: { top: Math.round(r.top + scrollY), height: Math.round(r.height), width: Math.round(r.width) },
    fonts: [...new Set([...root.querySelectorAll('*')].map((e) => getComputedStyle(e).fontFamily))].slice(0, 6),
    tree: walk(root, 0),
  };
}

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH && { executablePath: process.env.CHROME_PATH }),
  ...(proxy && { proxy: { server: proxy } }),
});
const report = { url, viewports: {} };
try {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'no-preference' });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // scroll in steps so lazy content and scroll-triggered footers render
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForTimeout(1500);
    const data = await page.evaluate(outline, selector);
    report.viewports[vp.name] = data;
    const shot = join(out, `footer-${vp.name}.png`);
    if (data) {
      const el = await page.$(data.selector).catch(() => null);
      if (el) await el.screenshot({ path: shot }).catch(() => page.screenshot({ path: shot }));
      else await page.screenshot({ path: shot });
    } else {
      await page.screenshot({ path: shot });
    }
    console.log(`${vp.name}: ${data ? `${data.selector} ${data.box.width}x${data.box.height}` : 'no footer found (pass --selector)'} -> ${shot}`);
    await page.close();
  }
} finally {
  await browser.close();
}
const file = join(out, 'footer-outline.json');
writeFileSync(file, JSON.stringify(report, null, 2));
console.log(`outline -> ${file}`);
