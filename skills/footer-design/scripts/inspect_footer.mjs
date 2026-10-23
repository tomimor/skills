#!/usr/bin/env node
// Inspect the footer of a live site: screenshots at desktop + mobile widths and a
// compact outline of its structure with the computed styles that matter for a rebuild.
// Usage: node inspect_footer.mjs <url> [out-dir] [--selector "css"] [--wait ms]
// Works on live sites and on your own build (http://localhost:3000, file:///path/index.html), so the
// same framing can be used to compare a rebuild with the source (footer_design.py compare).
// Requires playwright (project devDependency or npx). Set CHROME_PATH to use an existing
// Chromium/Chrome binary; HTTPS_PROXY is passed to the browser when set.

import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';

const pw = await import('playwright').catch(() => {
  const req = createRequire(join(process.cwd(), 'noop.js'));
  return import(pathToFileURL(req.resolve('playwright')).href);
}).catch(() => {
  console.error('playwright not found. Run from a project that has it, or `npm i -D playwright` first.\n'
    + 'Without it, estimate measurements from the footer.design screenshots instead.');
  process.exit(1);
});
const { chromium } = pw.chromium ? pw : pw.default;

const args = process.argv.slice(2);
const selIdx = args.indexOf('--selector');
const selector = selIdx !== -1 ? args.splice(selIdx, 2)[1] : null;
const waitIdx = args.indexOf('--wait');
const settle = waitIdx !== -1 ? Number(args.splice(waitIdx, 2)[1]) || 1500 : 1500;
const [url, outArg = 'footer-inspect'] = args;
if (!url) {
  console.error('Usage: node inspect_footer.mjs <url> [out-dir] [--selector "css"] [--wait ms]');
  process.exit(2);
}
const out = resolve(outArg);
mkdirSync(out, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

// Runs in the page. Finds the footer, marks it for the screenshot, and walks it into a trimmed outline.
function outline(sel) {
  const lowest = (els) => els
    .filter((el) => el.getBoundingClientRect().height > 40)
    // lowest on the page; on a tie, the outermost
    .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom
      || b.getBoundingClientRect().height - a.getBoundingClientRect().height)[0] || null;
  const pick = () => {
    if (sel) { try { return document.querySelector(sel); } catch { return null; } }
    // semantic markup first; class/id matches can hit wrappers like "has-footer" that hold the whole page
    return lowest([...document.querySelectorAll('footer, [role="contentinfo"]')])
      || lowest([...document.querySelectorAll('[class*="footer" i], [id*="footer" i]')]
        .filter((el) => !el.querySelector('main, h1, footer')));
  };
  const root = pick();
  if (!root) return null;
  document.querySelectorAll('[data-footer-inspect]').forEach((el) => el.removeAttribute('data-footer-inspect'));
  root.setAttribute('data-footer-inspect', '');
  const KEYS = ['display', 'position', 'gridTemplateColumns', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
    'padding', 'margin', 'width', 'maxWidth', 'height', 'color', 'backgroundColor', 'backgroundImage', 'border',
    'borderRadius', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform',
    'opacity', 'transform', 'transition', 'animation', 'mixBlendMode', 'overflow', 'boxShadow', 'textShadow',
    'fontStyle', 'textDecorationLine', 'zIndex', 'objectFit'];
  const DEFAULTS = { display: 'block', position: 'static', gridTemplateColumns: 'none', flexDirection: 'row',
    justifyContent: 'normal', alignItems: 'normal', gap: 'normal', padding: '0px', margin: '0px', maxWidth: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', borderRadius: '0px', letterSpacing: 'normal',
    textTransform: 'none', opacity: '1', transform: 'none', transition: 'all', animation: 'none',
    mixBlendMode: 'normal', overflow: 'visible', boxShadow: 'none', textShadow: 'none', fontStyle: 'normal',
    textDecorationLine: 'none', zIndex: 'auto', objectFit: 'fill' };
  const TEXT_KEYS = ['fontFamily', 'fontSize', 'fontWeight', 'color'];
  const pseudo = (el, which) => {
    const ps = getComputedStyle(el, which);
    if (!ps.content || ps.content === 'none' || ps.content === 'normal') return null;
    const out = { content: ps.content.slice(0, 40) };
    for (const k of ['width', 'height', 'position', 'backgroundColor', 'backgroundImage', 'boxShadow', 'border',
      'borderRadius', 'transform']) {
      if (ps[k] && ps[k] !== DEFAULTS[k] && ps[k] !== 'auto' && !/^0px/.test(ps[k])) out[k] = ps[k];
    }
    return out;
  };
  const media = [];
  const stats = { fonts: {}, colors: {}, backgrounds: {}, shadows: 0, moving: 0, negativeMargins: [] };
  const bump = (o, k) => { o[k] = (o[k] || 0) + 1; };
  const INHERITED = ['color', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'textTransform'];
  const parentStyle = new WeakMap();
  const ownTextOf = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
  const MAX_NODES = 400;
  let count = 0;
  const walk = (el, depth) => {
    if (count++ > MAX_NODES || depth > 12) return null;
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
      if (INHERITED.includes(k) && inherited[k] === v && !(ownTextOf(el) && TEXT_KEYS.includes(k))) continue;
      if (k === 'width' || k === 'height') v = `${Math.round(k === 'width' ? r.width : r.height)}px`;
      style[k] = v;
    }
    parentStyle.set(el, Object.fromEntries(INHERITED.map((k) => [k, cs[k]])));
    const node = { tag: el.tagName.toLowerCase() };
    if (el.className && typeof el.className === 'string') node.class = el.className.trim().split(/\s+/).slice(0, 3).join(' ');
    if (el.tagName === 'A') node.href = el.getAttribute('href');
    if (['IMG', 'VIDEO', 'CANVAS', 'SVG', 'svg', 'IFRAME', 'INPUT', 'BUTTON'].includes(el.tagName)) node.media = true;
    const ownText = ownTextOf(el);
    if (ownText) {
      node.text = ownText.slice(0, 120);
      bump(stats.fonts, `${cs.fontFamily.split(',')[0].replace(/["']/g, '')} ${cs.fontWeight} ${cs.fontSize}${cs.fontStyle === 'italic' ? ' italic' : ''}`);
      bump(stats.colors, cs.color);
    }
    if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bump(stats.backgrounds, cs.backgroundColor);
    if (cs.boxShadow !== 'none' || cs.textShadow !== 'none') stats.shadows++;
    if ((cs.animationName && cs.animationName !== 'none') || !/^all 0s|^none/.test(cs.transition)) stats.moving++;
    if (parseFloat(cs.marginTop) < -20) stats.negativeMargins.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} margin-top ${cs.marginTop}`);
    for (const which of ['::before', '::after']) {
      const pz = pseudo(el, which);
      if (pz) {
        node[which.slice(2)] = pz;
        if (pz.boxShadow) stats.shadows++;
      }
    }
    const tag = el.tagName.toLowerCase();
    if (['img', 'video', 'canvas', 'svg', 'iframe', 'picture'].includes(tag) && r.width * r.height > 2500) {
      const src = el.currentSrc || el.getAttribute('src') || '';
      media.push(`${tag} ${Math.round(r.width)}x${Math.round(r.height)}${src ? ' ' + src.split('/').pop().split('?')[0].slice(0, 60) : ''}`);
    }
    if (Object.keys(style).length) node.style = style;
    if (el.tagName.toLowerCase() !== 'svg') {
      const kids = [...el.children].map((c) => walk(c, depth + 1)).filter(Boolean);
      if (kids.length) node.children = kids;
    }
    if (!r.width && !r.height && !node.children && !node.text) return null;
    return node;
  };
  const r = root.getBoundingClientRect();
  const tree = walk(root, 0);
  // parts of the footer can overlap the section above (negative margins, absolutely placed cards)
  let top = r.top, bottom = r.bottom;
  for (const el of root.querySelectorAll('*')) {
    const b = el.getBoundingClientRect();
    if (b.width < 2 || b.height < 2 || getComputedStyle(el).visibility === 'hidden') continue;
    top = Math.min(top, b.top);
    bottom = Math.max(bottom, b.bottom);
  }
  top = Math.max(top, r.top - 600);
  // regions: descend through single-child wrappers, then list the children
  let region = root;
  while (region.children.length === 1) region = region.children[0];
  const regions = [...region.children].map((c) => {
    const b = c.getBoundingClientRect();
    const label = c.tagName.toLowerCase() + (typeof c.className === 'string' && c.className ? '.' + c.className.trim().split(/\s+/)[0] : '');
    return `${label} at y=${Math.round(b.top - r.top)} ${Math.round(b.width)}x${Math.round(b.height)}`;
  }).filter((x) => !/ 0x0$/.test(x));
  let bgEl = root, bg = 'rgba(0, 0, 0, 0)';
  while (bgEl && (bg = getComputedStyle(bgEl).backgroundColor) === 'rgba(0, 0, 0, 0)') bgEl = bgEl.parentElement;
  const top8 = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} (${v})`);
  const summary = {
    background: bg,
    regions,
    type: top8(stats.fonts),
    text_colors: top8(stats.colors),
    backgrounds: top8(stats.backgrounds),
    media,
    shadows: stats.shadows,
    animated_or_transitioned: stats.moving,
    negative_margins: stats.negativeMargins.slice(0, 5),
    overlap_above_px: Math.round(r.top - top),
  };
  return {
    clip: { x: 0, y: Math.round(top + scrollY), width: document.documentElement.clientWidth, height: Math.round(bottom - top) },
    summary,
    selector: sel || (root.id ? `#${root.id}` : root.tagName.toLowerCase() + (root.className ? '.' + String(root.className).trim().split(/\s+/)[0] : '')),
    box: { top: Math.round(r.top + scrollY), height: Math.round(r.height), width: Math.round(r.width) },
    fonts: [...new Set([...root.querySelectorAll('*')].map((e) => getComputedStyle(e).fontFamily))].slice(0, 6),
    tree,
    ...(count > MAX_NODES && { truncated: `outline stops after ${MAX_NODES} nodes; screenshot shows the rest` }),
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
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    } catch (e) {
      console.error(`could not load ${url}: ${e.message.split('\n')[0]}`);
      process.exitCode = 1;
      break;
    }
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // scroll in steps so lazy content and scroll-triggered footers render; capped for infinite feeds
    await page.evaluate(async () => {
      for (let y = 0, i = 0; y < document.documentElement.scrollHeight && i < 80; y += innerHeight * 0.8, i++) {
        scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      scrollTo(0, document.documentElement.scrollHeight);
    });
    await page.waitForTimeout(settle); // let scroll-triggered animations and physics settle
    const data = await page.evaluate(outline, selector);
    report.viewports[vp.name] = data;
    const shot = join(out, `footer-${vp.name}.png`);
    const miss = selector ? `--selector "${selector}" matched nothing or is invalid` : 'no footer found, pass --selector';
    let note = data ? `${data.selector} ${data.box.width}x${data.box.height}` : miss;
    if (data) {
      // fixed/sticky headers, cookie bars and chat bubbles would otherwise sit on top of the footer
      await page.evaluate(() => {
        const root = document.querySelector('[data-footer-inspect]');
        for (const el of document.querySelectorAll('body *')) {
          const pos = getComputedStyle(el).position;
          if ((pos === 'fixed' || pos === 'sticky') && !root.contains(el) && !el.contains(root)) el.style.visibility = 'hidden';
        }
      });
    }
    const shotOk = data && await page.screenshot({ path: shot, fullPage: true, clip: data.clip, timeout: 30000 })
      .then(() => true, () => false);
    if (!shotOk) {
      await page.screenshot({ path: shot });
      if (data) note += ' (element screenshot failed, saved the viewport instead)';
    }
    console.log(`${vp.name}: ${note} -> ${shot}`);
    await page.close();
  }
} finally {
  await browser.close();
}
if (!process.exitCode) {
  const file = join(out, 'footer-outline.json');
  writeFileSync(file, JSON.stringify(report, null, 2));
  const lines = [`Footer inspection of ${url}`, ''];
  for (const [name, d] of Object.entries(report.viewports)) {
    if (!d) { lines.push(`${name}: no footer found`, ''); continue; }
    const s = d.summary;
    lines.push(`${name.toUpperCase()} ${d.box.width}x${d.box.height} (${d.selector}), background ${s.background}`);
    if (s.overlap_above_px > 0) lines.push(`  extends ${s.overlap_above_px}px into the section above (included in the screenshot)`);
    lines.push('  regions:', ...s.regions.map((x) => `    ${x}`));
    lines.push('  type (family weight size, by count):', ...s.type.map((x) => `    ${x}`));
    lines.push(`  text colors: ${s.text_colors.join(', ')}`);
    if (s.backgrounds.length) lines.push(`  backgrounds: ${s.backgrounds.join(', ')}`);
    if (s.media.length) lines.push('  artwork (rebuild or substitute):', ...s.media.map((x) => `    ${x}`));
    if (s.negative_margins.length) lines.push(`  negative margins: ${s.negative_margins.join('; ')}`);
    lines.push(`  ${s.shadows} shadowed elements, ${s.animated_or_transitioned} animated or transitioned elements`);
    if (d.truncated) lines.push(`  ${d.truncated}`);
    lines.push('');
  }
  lines.push('Full tree with computed styles: footer-outline.json');
  writeFileSync(join(out, 'footer-summary.txt'), lines.join('\n'));
  console.log(`summary -> ${join(out, 'footer-summary.txt')}\noutline -> ${file}`);
}
