#!/usr/bin/env node
// Capture one state of a screen: a viewport screenshot (<out>.png) and the DOM
// geometry the blueprint is drawn from (<out>.json).
//
//   node capture.mjs --url http://localhost:4400/settings/members --out work/states/s0
//     [--viewport 1440x900]           the real UI is shown 1:1 at this size
//     [--time 2026-01-01T12:00:00Z]   frozen Date.now(); "real" to keep the clock
//     [--setup setup.mjs]             module whose default export (page, { advance }) logs in, opens a menu...
//     [--wait "<selector>"]           wait until this is visible
//     [--scroll "<selector>" | <y>]   scroll before capturing
//     [--hide "<sel>,<sel>"]          visibility:hidden for dev badges, cookie banners...
//     [--wait-until networkidle|load]  use load when the app long-polls
//     [--settle 400] [--color-scheme light|dark] [--timeout 60000]
// Waits for the dev server to answer (up to --timeout), so it can run right
// after the server is started.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { die, launch, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), {
  url: '', out: '', viewport: '1440x900', time: '2026-01-01T12:00:00Z', setup: '', wait: '', scroll: '',
  hide: '', settle: '400', colorScheme: 'light', timeout: '60000', waitUntil: 'networkidle',
});
if (!args.url || !args.out) die('usage: capture.mjs --url <url> --out <dir/name> [--viewport 1440x900] [--setup setup.mjs] [--wait <selector>]');
const [vw, vh] = args.viewport.split('x').map(Number);
if (!vw || !vh) die(`bad --viewport ${args.viewport} (expected WIDTHxHEIGHT)`);
const timeout = +args.timeout;
const frozen = args.time !== 'real';
if (frozen && Number.isNaN(Date.parse(args.time))) die(`bad --time ${args.time} (an ISO date, or "real")`);

// Runs in the page. Collects boxes (visible background, border or shadow),
// controls, images, rules (dividers, one-sided borders) and text runs, in
// viewport coordinates. Elements inside an overlay that covers other content
// (an open menu, a dialog, a sticky bar) get z > 0; the overlay itself is a
// box with oc: 1, and the kit hides lower layers under it.
function extract() {
  const W = innerWidth, H = innerHeight;
  const rnd = v => Math.round(v * 2) / 2;
  const norm = s => (s || '').replace(/\s+/g, ' ').trim();
  const cache = new Map();
  const css = el => { let c = cache.get(el); if (!c) { c = getComputedStyle(el); cache.set(el, c); } return c; };

  // Any CSS colour (rgb(), oklch(), color-mix(), color(display-p3 ...)) as
  // sRGB, read back from a 1x1 canvas.
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const colors = new Map();
  const rgba = c => {
    if (!c) return null;
    if (colors.has(c)) return colors.get(c);
    let p = null;
    const m = /^rgba?\(([\d.\s,/]+)\)$/.exec(c);
    if (m) {
      const v = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
      p = { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 };
    } else if (CSS.supports('color', c)) {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = c;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      p = { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    }
    colors.set(c, p);
    return p;
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
  // off screen or visually hidden (sr-only, clip: rect(0 0 0 0)). Text must be
  // at least 2 px both ways; other elements only one way, so 1 px dividers stay.
  const zeroClip = c => (/^rect\(0px,? 0px,? 0px,? 0px\)$/.test(c.clip) && c.position !== 'static') || /^inset\(50%/.test(c.clipPath);
  const clip = (from, rc, strict) => {
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
    const w = x2 - x1, h = y2 - y1;
    if (w <= 0 || h <= 0 || x2 <= 0 || y2 <= 0 || x1 >= W || y1 >= H) return null;
    if (strict ? w < 2 || h < 2 : w < 2 && h < 2) return null;
    return { x: x1, y: y1, w, h };
  };

  const CTL = 'button,input,select,textarea,[role=button],[role=tab],[role=menuitem],[role=checkbox],[role=radio],[role=switch],[role=combobox],[role=option],[role=slider]';
  const SKIP = new Set(['script', 'style', 'noscript', 'template', 'link', 'meta', 'title', 'br', 'wbr', 'option', 'source', 'track', 'datalist']);
  const isCtl = el => el.matches(CTL) && !(el.tagName === 'INPUT' && el.type === 'hidden');
  const isImg = (el, c) => /^(img|svg|canvas|video|picture)$/i.test(el.tagName) || el.getAttribute('role') === 'img' || /url\(/.test(c.backgroundImage);

  // Overlays: positioned layers with an opaque background that sit on top of
  // content outside their own subtree (menus, popovers, dialogs, sticky bars).
  const positioned = new Map();
  const inLayer = el => {
    if (!el || el === document.body) return false;
    if (positioned.has(el)) return positioned.get(el);
    const v = /^(fixed|absolute|sticky)$/.test(css(el).position) || inLayer(el.parentElement);
    positioned.set(el, v);
    return v;
  };
  const paints = el => {
    const c = css(el);
    if (alpha(c.backgroundColor) > 0.04 || isImg(el, c) || isCtl(el)) return true;
    if (['Top', 'Right', 'Bottom', 'Left'].some(s => parseFloat(c[`border${s}Width`]) > 0 && alpha(c[`border${s}Color`]) > 0.08)) return true;
    for (const t of el.childNodes) if (t.nodeType === 3 && /\S/.test(t.data)) return true;
    return false;
  };
  const occ = new Set();
  const inOcc = el => { for (let p = el.parentElement; p; p = p.parentElement) if (occ.has(p)) return true; return false; };
  for (const el of document.body.querySelectorAll('*')) {
    if (SKIP.has(el.tagName.toLowerCase()) || !inLayer(el) || alpha(css(el).backgroundColor) < 0.85 || inOcc(el)) continue;
    const rc = el.getBoundingClientRect();
    if (rc.width < 8 || rc.height < 8 || !visible(el)) continue;
    const r = clip(el.parentElement, rc, true);
    if (!r) continue;
    let covers = false;
    for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]]) {
      const stack = document.elementsFromPoint(r.x + r.w * fx, r.y + r.h * fy);
      const i = stack.indexOf(el);
      if (i < 0) continue;
      if (stack.slice(i + 1).some(s => !s.contains(el) && !el.contains(s) && paints(s))) { covers = true; break; }
    }
    if (covers) occ.add(el);
  }
  const zs = new Map();
  const zOf = el => {
    if (!el || el === document.body) return 0;
    if (zs.has(el)) return zs.get(el);
    const z = zOf(el.parentElement) + (occ.has(el) ? 1 : 0);
    zs.set(el, z);
    return z;
  };

  // Groups: the row or list item an element belongs to. The kit uses them to
  // keep repeated cells (a role pill, an Edit button) with their own row.
  const ITEM = 'tr,li,[role=row],[role=listitem],[role=option],[role=treeitem],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=article]';
  const reps = new Map();
  const repeated = el => {
    const p = el.parentElement;
    if (!p || p.children.length < 3 || /^(TD|TH)$/.test(el.tagName)) return false;
    let m = reps.get(p);
    if (!m) {
      const by = new Map();
      for (const ch of p.children) { const k = `${ch.tagName}|${ch.getAttribute('class') || ''}`; if (!by.has(k)) by.set(k, []); by.get(k).push(ch); }
      m = new Map();
      // Stacked repeats only: cells side by side in one row are not rows.
      for (const [k, list] of by) m.set(k, list.length >= 3 && new Set(list.slice(0, 40).map(ch => Math.round(ch.getBoundingClientRect().top))).size >= 2);
      reps.set(p, m);
    }
    return m.get(`${el.tagName}|${el.getAttribute('class') || ''}`) || false;
  };
  const gids = new Map();
  let gN = 0;
  const groupOf = el => {
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      if (p.matches(ITEM) || repeated(p)) {
        if (!gids.has(p)) gids.set(p, ++gN);
        return gids.get(p);
      }
    }
    return 0;
  };

  // Keys: data-bp, data-testid, aria-label or a hand-written id, else the
  // element's text. Framework-generated ids (:r1:, radix-:r1:, mui-12) are
  // skipped. Elements with neither get a key from their tag and longest class
  // and an: 1, so the kit pairs them by place, not by key.
  const genId = id => /[:«»]|^_r_|\d/.test(id);
  const explicit = el => el.getAttribute('data-bp') || el.getAttribute('data-testid') || el.getAttribute('aria-label')
    || (el.id && !genId(el.id) ? el.id : '');
  const anon = el => {
    const cls = (el.getAttribute('class') || '').split(/\s+/).filter(s => s && s.length <= 32).sort((p, q) => q.length - p.length)[0];
    return el.tagName.toLowerCase() + (cls ? `.${cls}` : '');
  };
  const counts = new Map();
  const keyed = base => { const k = (counts.get(base) || 0) + 1; counts.set(base, k); return k > 1 ? `${base}~${k}` : base; };
  const firstLine = el => norm((el.innerText || '').split('\n').find(s => s.trim()) || '').slice(0, 32);
  const radius = (c, w, h) => {
    const v = c.borderTopLeftRadius || '0px';
    const x = parseFloat(v) || 0;
    return Math.min(v.endsWith('%') ? (x / 100) * Math.min(w, h) : x, h / 2, w / 2);
  };
  // Shared fields; zero values are left out to keep the JSON small.
  const tags = (rec, el, an) => {
    const z = zOf(el), g = groupOf(el);
    if (z) rec.z = z;
    if (g) rec.g = g;
    if (an) rec.an = 1;
    return rec;
  };
  const NO_TEXT = /^(checkbox|radio|range|color|file|image)$/;
  // Where a control's label sits: fields and menu items start on the left,
  // buttons usually centre it (text-align, or justify-content in a flex box).
  const alignOf = (c, field) => {
    if (field) return 'l';
    const flex = /flex/.test(c.display);
    const v = flex ? c.justifyContent : c.textAlign;
    if (/center/.test(v)) return 'c';
    if (/right|end/.test(v) && !/space/.test(v)) return 'r';
    return 'l';
  };
  const masked = (el, c) => el.type === 'password' || (c.webkitTextSecurity && c.webkitTextSecurity !== 'none');
  const out = [];

  for (const el of document.body.querySelectorAll('*')) {
    const tag = el.tagName.toLowerCase();
    if (SKIP.has(tag)) continue;
    if (el.parentElement && el.parentElement.closest('svg')) continue;   // svg internals: the svg is one image
    const rc = el.getBoundingClientRect();
    if (rc.width <= 0 || rc.height <= 0 || !visible(el)) continue;
    const r = zeroClip(css(el)) ? null : clip(el.parentElement, rc, false);
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
      let txt = '';
      if (tag === 'select') txt = (el.selectedOptions[0] || {}).text || '';
      else if (field) txt = NO_TEXT.test(el.type) ? '' : masked(el, c) ? (el.value ? '••••••••' : el.placeholder) : el.value || el.placeholder;
      else txt = el.innerText;
      txt = norm(txt).slice(0, 60);
      const name = explicit(el) || (field ? el.placeholder || el.getAttribute('name') || (masked(el, c) ? '' : txt) : txt.slice(0, 40));
      out.push(tags({
        ...base, t: 'ctl', k: keyed(`ctl:${name || anon(el)}`), txt, r: rr,
        fs: parseFloat(c.fontSize), fw: +c.fontWeight || 400, al: alignOf(c, field), pl: rnd(parseFloat(c.paddingLeft) || 0), pr: rnd(parseFloat(c.paddingRight) || 0),
        bg: bgK, bc: sides.some(Boolean) ? ckey(c.borderTopColor) : '', c: ckey(c.color), sh: shadow ? 1 : 0,
      }, el, !name));
      continue;
    }
    if (isImg(el, c)) {
      const src = (el.currentSrc || el.src || '').split(/[/?#]/).filter(Boolean).pop() || '';
      const name = explicit(el) || el.getAttribute('alt') || src.slice(0, 40);
      out.push(tags({ ...base, t: 'img', k: keyed(`img:${name || anon(el)}`), r: rr }, el, !name));
      continue;
    }
    const owner = explicit(el) || firstLine(el);
    // A thin filled or outlined element (h-px separator, <hr>) is a rule.
    if ((hasBg || allSides) && Math.min(r.w, r.h) <= 3 && !occ.has(el)) {
      const hz = r.w >= r.h;
      out.push(tags({
        t: 'rule', k: keyed(`rule:${owner || anon(el)}:${hz ? 'h' : 'v'}`),
        ...(hz ? { x: base.x, y: rnd(r.y + r.h / 2), w: base.w, h: 0 } : { x: rnd(r.x + r.w / 2), y: base.y, w: 0, h: base.h }),
      }, el, !owner));
      continue;
    }
    if (hasBg || allSides || shadow || occ.has(el)) {
      const box = tags({ ...base, t: 'box', k: keyed(`box:${owner || anon(el)}`), r: rr, bg: bgK, bc: allSides ? ckey(c.borderTopColor) : '', sh: shadow ? 1 : 0 }, el, !owner);
      if (occ.has(el)) box.oc = 1;
      out.push(box);
    }
    if (!allSides && sides.some(Boolean)) {
      const bw = s => parseFloat(c[`border${s}Width`]);
      const inY = y => y >= r.y - 1 && y <= r.y + r.h + 1, inX = x => x >= r.x - 1 && x <= r.x + r.w + 1;
      const add = (side, rule) => out.push(tags({ t: 'rule', k: keyed(`rule:${owner || anon(el)}:${side}`), ...rule }, el, !owner));
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
      const cr = clip(p, pc.q, true);
      if (!cr) continue;
      if (!frags.has(blk)) frags.set(blk, []);
      frags.get(blk).push({ text: cased(pc.text, c.textTransform), x1: cr.x, y1: cr.y, x2: cr.x + cr.w, y2: cr.y + cr.h, fs: parseFloat(c.fontSize), fw: +c.fontWeight || 400, c: ckey(c.color), o: order++, el: p });
    }
  }
  for (const list of frags.values()) {
    list.sort((a, b) => a.o - b.o);
    let run = null;
    const flush = () => {
      if (!run) return;
      const txt = norm(run.text);
      if (txt) out.push(tags({ t: 'text', k: keyed(`text:${txt.slice(0, 48)}`), x: rnd(run.x1), y: rnd(run.y1), w: rnd(run.x2 - run.x1), h: rnd(run.y2 - run.y1), txt: txt.slice(0, 160), fs: run.fs, fw: run.fw, c: run.c }, run.el, false));
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

const STYLE = '*,*::before,*::after{transition:none!important;caret-color:transparent!important}'
  + 'html{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}'
  + (args.hide ? `${args.hide}{visibility:hidden!important}` : '');

const browser = await launch();
try {
  const context = await browser.newContext({
    viewport: { width: vw, height: vh }, deviceScaleFactor: 1, reducedMotion: 'reduce',
    colorScheme: args.colorScheme, locale: 'en-US', timezoneId: 'UTC',
  });
  // An init script, so the style survives navigations (a login redirect in --setup).
  await context.addInitScript(css => {
    const add = () => {
      if (document.querySelector('style[data-bp-capture]')) return;
      const s = document.createElement('style');
      s.setAttribute('data-bp-capture', '');
      s.textContent = css;
      (document.head || document.documentElement).append(s);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add, { once: true });
    else add();
  }, STYLE);
  const page = await context.newPage();
  let now = Date.parse(args.time);
  if (frozen) {
    if (!page.clock) die('--time needs Playwright 1.45 or newer (or pass --time real)');
    await page.clock.setFixedTime(new Date(now));
  }
  // Moves the frozen clock forward, so code that waits for time to pass
  // (a debounced search, a throttled handler) runs.
  const advance = async ms => {
    if (frozen) { now += ms; await page.clock.setFixedTime(new Date(now)); }
    await page.waitForTimeout(ms + 50);
  };

  const deadline = Date.now() + timeout;
  let res, waiting = false;
  for (;;) {
    try { res = await page.goto(args.url, { waitUntil: args.waitUntil, timeout }); break; } catch (e) {
      if (!/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_EMPTY_RESPONSE|ECONNREFUSED/.test(e.message) || Date.now() > deadline) throw e;
      if (!waiting) { console.log(`waiting for ${args.url} to answer...`); waiting = true; }
      await new Promise(r => setTimeout(r, 500));
    }
  }
  if (res && res.status() >= 400) die(`${args.url} answered HTTP ${res.status()}`);
  if (args.setup) {
    const mod = await import(pathToFileURL(resolve(args.setup)).href);
    const fn = mod.default || mod.setup;
    if (typeof fn !== 'function') die(`${args.setup} must export a default function (page, { advance }) => {}`);
    await fn(page, { advance });
  }
  if (args.wait) await page.waitForSelector(args.wait, { state: 'visible', timeout });
  if (args.scroll) {
    await page.evaluate(s => {
      const y = Number(s);
      if (!Number.isNaN(y)) window.scrollTo(0, y);
      else { const el = document.querySelector(s); if (!el) throw new Error(`--scroll: no element matches ${s}`); el.scrollIntoView({ block: 'start' }); }
    }, args.scroll);
  }
  // Fonts, then the images on screen (lazy ones below the fold never load).
  const stuck = await page.evaluate(async ({ css, ms }) => {
    if (!document.querySelector('style[data-bp-capture]')) {
      const s = document.createElement('style');
      s.setAttribute('data-bp-capture', '');
      s.textContent = css;
      document.head.append(s);
    }
    await document.fonts.ready;
    const onScreen = i => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth; };
    const pending = [...document.images].filter(i => !i.complete && onScreen(i));
    const loaded = Promise.all(pending.map(i => new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); })));
    await Promise.race([loaded, new Promise(r => setTimeout(r, ms))]);
    return pending.filter(i => !i.complete).map(i => i.currentSrc || i.src).slice(0, 3);
  }, { css: STYLE, ms: 5000 });
  if (stuck.length) console.warn(`warning: images still loading after 5 s: ${stuck.join(', ')}`);
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
  const layers = els.filter(e => e.oc).length;
  writeFileSync(`${args.out}.json`, JSON.stringify({ url: args.url, viewport: { w: vw, h: vh }, time: args.time, els }));
  console.log(`${args.out}.png + .json: ${els.length} elements (${Object.entries(kinds).map(([k, v]) => `${v} ${k}`).join(', ')})${layers ? `, ${layers} overlay(s) on top` : ''}`);
} finally {
  await browser.close();
}
