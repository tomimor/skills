#!/usr/bin/env node
// Capture one state of a screen: a viewport screenshot (<out>.png) and the DOM
// geometry the blueprint is drawn from (<out>.json).
//
//   node capture.mjs --url http://localhost:4400/settings/members --out work/states/s0
//     [--viewport 1440x900]           the real UI is shown 1:1 at this size
//     [--time 2026-01-01T12:00:00Z]   frozen Date.now(); "real" to keep the clock
//     [--setup setup.mjs]             module whose default export(page) logs in, opens a menu...
//     [--wait "<selector>"]           wait until this is visible
//     [--scroll "<selector>" | <y>]   scroll before capturing
//     [--hide "<sel>,<sel>"]          visibility:hidden for dev badges, cookie banners...
//     [--wait-until networkidle|load]  use load when the app long-polls
//     [--settle 400] [--color-scheme light|dark] [--timeout 60000]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { die, launch, loadPlaywright, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), {
  url: '', out: '', viewport: '1440x900', time: '2026-01-01T12:00:00Z', setup: '', wait: '', scroll: '',
  hide: '', settle: '400', colorScheme: 'light', timeout: '60000', waitUntil: 'networkidle',
});
if (!args.url || !args.out) die('usage: capture.mjs --url <url> --out <dir/name> [--viewport 1440x900] [--setup setup.mjs] [--wait <selector>]');
const [vw, vh] = args.viewport.split('x').map(Number);
if (!vw || !vh) die(`bad --viewport ${args.viewport} (expected WIDTHxHEIGHT)`);
const timeout = +args.timeout;

// Runs in the page. Collects boxes (visible background, border or shadow),
// controls, images, divider rules and text runs, in viewport coordinates.
function extract() {
  const W = innerWidth, H = innerHeight;
  const rnd = v => Math.round(v * 2) / 2;
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const cache = new Map();
  const css = el => { let c = cache.get(el); if (!c) { c = getComputedStyle(el); cache.set(el, c); } return c; };
  const rgba = c => {
    const m = /rgba?\(([^)]+)\)/.exec(c || '');
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const alpha = c => { const p = rgba(c); return p ? p.a : 0; };
  const ckey = c => { const p = rgba(c); return p && p.a > 0.02 ? `${Math.round(p.r)},${Math.round(p.g)},${Math.round(p.b)},${Math.round(p.a * 100) / 100}` : ''; };
  const visible = el => (el.checkVisibility
    ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    : css(el).display !== 'none' && css(el).visibility !== 'hidden' && +css(el).opacity > 0);
  const effBg = el => {
    for (let p = el; p; p = p.parentElement) { const c = css(p).backgroundColor; if (alpha(c) > 0.04) return ckey(c); }
    return '255,255,255,1';
  };
  // Intersect with clipping ancestors (from `from`, inclusive); drop what is
  // off screen or visually hidden (sr-only, clip: rect(0 0 0 0)).
  const zeroClip = c => (/^rect\(0px,? 0px,? 0px,? 0px\)$/.test(c.clip) && c.position !== 'static') || /^inset\(50%/.test(c.clipPath);
  const clip = (from, rc) => {
    let x1 = rc.left, y1 = rc.top, x2 = rc.right, y2 = rc.bottom;
    for (let p = from; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
      const c = css(p);
      if (zeroClip(c)) return null;
      if (c.overflowX !== 'visible' || c.overflowY !== 'visible') {
        const pr = p.getBoundingClientRect();
        if (c.overflowX !== 'visible') { x1 = Math.max(x1, pr.left); x2 = Math.min(x2, pr.right); }
        if (c.overflowY !== 'visible') { y1 = Math.max(y1, pr.top); y2 = Math.min(y2, pr.bottom); }
      }
      if (c.position === 'fixed') break;
    }
    if (x2 - x1 < 2 || y2 - y1 < 2 || x2 <= 0 || y2 <= 0 || x1 >= W || y1 >= H) return null;
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  };

  const CTL = 'button,input,select,textarea,[role=button],[role=tab],[role=menuitem],[role=checkbox],[role=radio],[role=switch],[role=combobox],[role=option],[role=slider]';
  const SKIP = new Set(['script', 'style', 'noscript', 'template', 'link', 'meta', 'title', 'br', 'wbr', 'option', 'source', 'track', 'datalist']);
  const isCtl = el => el.matches(CTL) && !(el.tagName === 'INPUT' && el.type === 'hidden');
  const explicit = el => el.getAttribute('data-bp') || el.getAttribute('data-testid') || el.getAttribute('aria-label')
    || (el.id && !/^:|^[0-9a-f-]{16,}$|[0-9]{4,}/i.test(el.id) ? el.id : '');
  const counts = new Map();
  const keyed = base => { const k = (counts.get(base) || 0) + 1; counts.set(base, k); return k > 1 ? `${base}~${k}` : base; };
  const firstLine = el => norm((el.innerText || '').split('\n').find(s => s.trim()) || '').slice(0, 32);
  const radius = (c, w, h) => {
    const v = c.borderTopLeftRadius || '0px';
    const x = parseFloat(v) || 0;
    return Math.min(v.endsWith('%') ? (x / 100) * Math.min(w, h) : x, h / 2, w / 2);
  };
  const out = [];

  for (const el of document.body.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase();
    if (SKIP.has(tag)) continue;
    if (el.parentElement && el.parentElement.closest('svg')) continue;   // svg internals: the svg is one image
    const rc = el.getBoundingClientRect();
    if (rc.width < 1 || rc.height < 1 || !visible(el)) continue;
    const r = zeroClip(css(el)) ? null : clip(el.parentElement, rc);
    if (!r) continue;
    const inCtl = el.parentElement && el.parentElement.closest(CTL);
    if (inCtl) continue;                                                 // the control draws its own label
    const c = css(el);
    const base = { x: rnd(r.x), y: rnd(r.y), w: rnd(r.w), h: rnd(r.h) };
    const rr = rnd(radius(c, r.w, r.h));
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map(s => parseFloat(c[`border${s}Width`]) > 0
      && !['none', 'hidden'].includes(c[`border${s}Style`]) && alpha(c[`border${s}Color`]) > 0.08);
    const allSides = sides.every(Boolean);
    const bgK = ckey(c.backgroundColor);
    const hasBg = alpha(c.backgroundColor) > 0.04 && bgK !== effBg(el.parentElement || el);
    const shadow = !!c.boxShadow && c.boxShadow !== 'none';

    if (isCtl(el)) {
      const field = tag === 'input' || tag === 'textarea' || tag === 'select';
      const txt = norm(tag === 'select' ? (el.selectedOptions[0] || {}).text
        : tag === 'input' || tag === 'textarea' ? el.value || el.placeholder : el.innerText).slice(0, 60);
      out.push({
        ...base, t: 'ctl', k: keyed(`ctl:${explicit(el) || txt.slice(0, 40) || tag}`), txt, r: rr,
        fs: parseFloat(c.fontSize), fw: +c.fontWeight || 400, al: field ? 'l' : 'c', pl: rnd(parseFloat(c.paddingLeft) || 0),
        bg: bgK, bc: sides.some(Boolean) ? ckey(c.borderTopColor) : '', c: ckey(c.color), sh: shadow ? 1 : 0,
      });
      continue;
    }
    if (tag === 'img' || tag === 'svg' || tag === 'canvas' || tag === 'video' || el.getAttribute('role') === 'img' || /url\(/.test(c.backgroundImage)) {
      const src = (el.currentSrc || el.src || '').split(/[/?#]/).filter(Boolean).pop() || '';
      out.push({ ...base, t: 'img', k: keyed(`img:${explicit(el) || el.getAttribute('alt') || src.slice(0, 40) || tag}`), r: rr });
      continue;
    }
    if (hasBg || allSides || shadow) {
      out.push({ ...base, t: 'box', k: keyed(`box:${explicit(el) || firstLine(el) || tag}`), r: rr, bg: bgK, bc: allSides ? ckey(c.borderTopColor) : '', sh: shadow ? 1 : 0 });
    }
    if (!allSides && sides.some(Boolean)) {
      const owner = explicit(el) || firstLine(el) || tag;
      const bw = s => parseFloat(c[`border${s}Width`]);
      const inY = y => y >= r.y - 1 && y <= r.y + r.h + 1, inX = x => x >= r.x - 1 && x <= r.x + r.w + 1;
      const add = (side, rule) => out.push({ t: 'rule', k: keyed(`rule:${owner}:${side}`), ...rule });
      if (sides[0] && inY(rc.top)) add('t', { x: base.x, y: rnd(rc.top + bw('Top') / 2), w: base.w, h: 0 });
      if (sides[2] && inY(rc.bottom)) add('b', { x: base.x, y: rnd(rc.bottom - bw('Bottom') / 2), w: base.w, h: 0 });
      if (sides[3] && inX(rc.left)) add('l', { x: rnd(rc.left + bw('Left') / 2), y: base.y, w: 0, h: base.h });
      if (sides[1] && inX(rc.right)) add('r', { x: rnd(rc.right - bw('Right') / 2), y: base.y, w: 0, h: base.h });
    }
  }

  // Text: one run per line of each block, merging inline pieces (<b>, <a>...),
  // as rendered (text-transform applied).
  const cased = (s, tt) => (tt === 'uppercase' ? s.toUpperCase() : tt === 'lowercase' ? s.toLowerCase()
    : tt === 'capitalize' ? s.replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()) : s);
  const blockOf = el => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      const d = css(p).display;
      if (d !== 'inline' && d !== 'contents') return p;
    }
    return document.body;
  };
  const frags = new Map();
  const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: t => (/\S/.test(t.data) ? 1 : 3) });
  let order = 0;
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const p = t.parentElement;
    if (!p || SKIP.has(p.tagName.toLowerCase()) || p.closest('svg') || p.closest(CTL) || !visible(p)) continue;
    const c = css(p);
    if (alpha(c.color) < 0.05) continue;
    range.selectNodeContents(t);
    const rects = [...range.getClientRects()].filter(q => q.width >= 1 && q.height >= 1);
    if (!rects.length) continue;
    const pieces = [];
    if (rects.length === 1) pieces.push({ text: t.data, q: rects[0] });
    else {
      // Wrapped text: split into lines character by character.
      let cur = null;
      for (let i = 0; i < t.data.length; i++) {
        range.setStart(t, i); range.setEnd(t, i + 1);
        const q = range.getClientRects()[0];
        if (!q || q.width < 0.1) { if (cur) cur.text += t.data[i]; continue; }
        if (!cur || Math.abs(q.top - cur.q.top) > q.height * 0.5) { cur = { text: '', q: { left: q.left, top: q.top, right: q.right, bottom: q.bottom } }; pieces.push(cur); }
        cur.text += t.data[i];
        cur.q.left = Math.min(cur.q.left, q.left); cur.q.right = Math.max(cur.q.right, q.right);
        cur.q.top = Math.min(cur.q.top, q.top); cur.q.bottom = Math.max(cur.q.bottom, q.bottom);
      }
    }
    const blk = blockOf(p);
    for (const pc of pieces) {
      if (!/\S/.test(pc.text)) continue;
      const cr = clip(p, pc.q);
      if (!cr) continue;
      if (!frags.has(blk)) frags.set(blk, []);
      frags.get(blk).push({ text: cased(pc.text, c.textTransform), x1: cr.x, y1: cr.y, x2: cr.x + cr.w, y2: cr.y + cr.h, fs: parseFloat(c.fontSize), fw: +c.fontWeight || 400, c: ckey(c.color), o: order++ });
    }
  }
  for (const list of frags.values()) {
    list.sort((a, b) => a.o - b.o);
    let run = null;
    const flush = () => {
      if (!run) return;
      const txt = norm(run.text);
      if (txt) out.push({ t: 'text', k: keyed(`text:${txt.slice(0, 48)}`), x: rnd(run.x1), y: rnd(run.y1), w: rnd(run.x2 - run.x1), h: rnd(run.y2 - run.y1), txt: txt.slice(0, 160), fs: run.fs, fw: run.fw, c: run.c });
      run = null;
    };
    for (const f of list) {
      const same = run && Math.abs(f.y1 - run.y1) < Math.max(3, 0.5 * (f.y2 - f.y1)) && f.x1 >= run.x2 - 1 && f.x1 - run.x2 < Math.max(f.fs * 0.9, 10);
      if (!same) { flush(); run = { ...f }; continue; }
      const gap = f.x1 - run.x2;
      run.text += (gap > f.fs * 0.15 && !/\s$/.test(run.text) && !/^\s/.test(f.text) ? ' ' : '') + f.text;
      run.x2 = Math.max(run.x2, f.x2); run.y1 = Math.min(run.y1, f.y1); run.y2 = Math.max(run.y2, f.y2); run.fs = Math.max(run.fs, f.fs);
    }
    flush();
  }
  return out;
}

const pw = loadPlaywright();
const browser = await launch(pw);
try {
  const context = await browser.newContext({
    viewport: { width: vw, height: vh }, deviceScaleFactor: 1, reducedMotion: 'reduce',
    colorScheme: args.colorScheme, locale: 'en-US', timezoneId: 'UTC',
  });
  const page = await context.newPage();
  if (args.time !== 'real') {
    if (!page.clock) die('--time needs Playwright 1.45 or newer (or pass --time real)');
    await page.clock.setFixedTime(new Date(args.time));
  }
  const res = await page.goto(args.url, { waitUntil: args.waitUntil, timeout });
  if (res && res.status() >= 400) die(`${args.url} answered HTTP ${res.status()}`);
  await page.addStyleTag({
    content: '*,*::before,*::after{transition:none!important;caret-color:transparent!important}'
      + 'html{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}'
      + (args.hide ? `${args.hide}{visibility:hidden!important}` : ''),
  });
  if (args.setup) {
    const mod = await import(pathToFileURL(resolve(args.setup)).href);
    const fn = mod.default || mod.setup;
    if (typeof fn !== 'function') die(`${args.setup} must export a default function (page) => {}`);
    await fn(page);
  }
  if (args.wait) await page.waitForSelector(args.wait, { state: 'visible', timeout });
  if (args.scroll) {
    await page.evaluate(s => {
      const y = Number(s);
      if (!Number.isNaN(y)) window.scrollTo(0, y);
      else { const el = document.querySelector(s); if (!el) throw new Error(`--scroll: no element matches ${s}`); el.scrollIntoView({ block: 'start' }); }
    }, args.scroll);
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => (i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
  });
  await page.waitForTimeout(+args.settle);
  const overlay = await page.evaluate(() => {
    const vite = document.querySelector('vite-error-overlay');
    const next = document.querySelector('nextjs-portal');
    const nextText = next && next.shadowRoot ? next.shadowRoot.textContent || '' : '';
    return vite ? 'Vite error overlay' : /Unhandled Runtime Error|Build Error|Failed to compile/.test(nextText) ? 'Next.js error overlay' : '';
  });
  if (overlay) die(`the page shows a ${overlay}; fix the build before capturing`);
  mkdirSync(dirname(resolve(args.out)), { recursive: true });
  await page.screenshot({ path: `${args.out}.png`, animations: 'disabled' });
  const els = await page.evaluate(extract);
  const kinds = els.reduce((m, e) => ((m[e.t] = (m[e.t] || 0) + 1), m), {});
  writeFileSync(`${args.out}.json`, JSON.stringify({ url: args.url, viewport: { w: vw, h: vh }, time: args.time, els }));
  console.log(`${args.out}.png + .json: ${els.length} elements (${Object.entries(kinds).map(([k, v]) => `${v} ${k}`).join(', ')})`);
} finally {
  await browser.close();
}
