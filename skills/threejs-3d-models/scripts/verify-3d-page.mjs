#!/usr/bin/env node
// Automated Phase 5 checks for any page with three.js/WebGL content. It
// instruments WebGL in headless Chromium (draw calls, live contexts,
// evictions) and reports PASS/WARN/FAIL for: rendering, console errors and
// three.js deprecations, GLB weight, layout shift, idle and offscreen
// rendering, prefers-reduced-motion, wheel and touch scrolling over the
// canvas, pinch-zoom, pixel-ratio cap, context count, accessible name, LCP on
// a throttled phone, and the no-WebGL fallback. Exit code 1 when anything
// FAILs.
// Usage: node verify-3d-page.mjs <url> [--json report.json]
// Requires playwright (a project devDependency, or set NODE_PATH to a global
// install). Serve a production build (vite build && vite preview) for
// realistic numbers.

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const pw = await import('playwright').catch(() => {
  const req = createRequire(join(process.cwd(), 'noop.js'));
  return import(pathToFileURL(req.resolve('playwright')).href);
}).catch(() => {
  console.error('playwright not found: `npm i -D playwright` in the project, or set NODE_PATH to a global node_modules that has it.');
  process.exit(2);
});
const { chromium } = pw.chromium ? pw : pw.default;

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--'));
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
if (!url) {
  console.error('Usage: node verify-3d-page.mjs <url> [--json report.json]');
  process.exit(2);
}

const systemChromium = () => {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const c of ['/opt/pw-browsers/chromium', 'chromium', 'chromium-browser', 'google-chrome']) {
    try {
      const p = c.startsWith('/') ? c : execSync(`command -v ${c}`, { encoding: 'utf8' }).trim();
      if (p && existsSync(p)) return p;
    } catch {}
  }
  return undefined;
};
const launch = (extra = []) => {
  const opts = { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', ...extra] };
  return chromium.launch(opts).catch((e) => {
    const executablePath = systemChromium();
    if (!executablePath) throw e;
    return chromium.launch({ ...opts, executablePath });
  });
};

// Counts draw calls and tracks every WebGL context; a rAF counter proves the
// page is producing frames, since software GL can stall a page for seconds.
const INSTRUMENT = `(() => {
  const s = { entries: [], draws: 0, drawFrames: 0, cls: 0, maxLive: 0, ticks: 0, lastAlloc: 0 };
  let lastDrawTick = -1;
  window.__gl = s;
  const tick = () => { s.ticks++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    const ctx = getContext.call(this, type, attrs);
    if (ctx && /webgl/i.test(String(type)) && !ctx.__entry) {
      const entry = { lost: false, drawn: false, ref: new WeakRef(this), surfaces: [] };
      Object.defineProperty(ctx, '__entry', { value: entry });
      Object.defineProperty(this, '__glEntry', { value: entry });
      s.entries.push(entry);
      this.addEventListener('webglcontextlost', () => { entry.lost = true; });
    }
    return ctx;
  };
  // A 2D canvas that receives frames from a WebGL canvas (shared-renderer setups) is a 3D surface too.
  const drawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (source, ...rest) {
    const entry = source?.__glEntry;
    if (entry && !this.canvas.__surfaceOf) {
      Object.defineProperty(this.canvas, '__surfaceOf', { value: entry });
      entry.surfaces.push(new WeakRef(this.canvas));
    }
    return drawImage.call(this, source, ...rest);
  };
  for (const proto of [window.WebGL2RenderingContext?.prototype, window.WebGLRenderingContext?.prototype]) {
    if (!proto) continue;
    // Shader links and texture/buffer allocations mark loading work; they stop once models are on the GPU.
    for (const fn of ['linkProgram', 'texImage2D', 'texStorage2D', 'compressedTexImage2D', 'texImage3D', 'texStorage3D', 'bufferData']) {
      const original = proto[fn];
      if (!original) continue;
      proto[fn] = function (...a) { s.lastAlloc = performance.now(); return original.apply(this, a); };
    }
    for (const fn of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) {
      const original = proto[fn];
      if (!original) continue;
      proto[fn] = function (...a) {
        s.draws++;
        if (s.ticks !== lastDrawTick) { lastDrawTick = s.ticks; s.drawFrames++; }
        if (this.__entry) this.__entry.drawn = true;
        return original.apply(this, a);
      };
    }
  }
  s.canvases = () => s.entries.filter((e) => e.drawn && !e.lost).flatMap((e) => [e.ref.deref(), ...e.surfaces.map((r) => r.deref())]).filter((c) => c?.isConnected && c.getBoundingClientRect().width > 0 && (c.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? true));
  s.live = () => s.entries.filter((e) => e.drawn && !e.lost && e.ref.deref()).length;
  setInterval(() => { s.maxLive = Math.max(s.maxLive, s.live()); }, 50);
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) s.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  } catch {}
})();`;

const results = [];
const report = (status, name, detail) => {
  results.push({ status, name, detail });
  console.log(`${status.padEnd(4)} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function open(browser, contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...contextOptions });
  await context.addInitScript(INSTRUMENT);
  const page = await context.newPage();
  const log = { errors: [], warnings: [], http: [], glbBytes: 0 };
  page.on('console', (m) => (m.type() === 'error' ? log.errors : m.type() === 'warning' ? log.warnings : []).push(m.text()));
  page.on('pageerror', (e) => log.errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400) log.http.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  page.on('requestfinished', async (r) => {
    if (!/\.glb(\?|$)/.test(r.url())) return;
    try { log.glbBytes += (await r.sizes()).responseBodySize; } catch {}
  });
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  const drew = await page.waitForFunction(() => __gl.draws > 0, null, { timeout: 60_000 }).then(() => true, () => false);
  await page.waitForLoadState('networkidle').catch(() => {});
  // Models parse, upload, and compile after the network goes quiet, and an environment map can draw
  // long before the model does: wait for a visible 3D canvas and 1.5 s without new GPU resources.
  await page.waitForFunction(() => __gl.canvases().length > 0 && performance.now() - __gl.lastAlloc > 1500, null, { timeout: 30_000, polling: 250 }).catch(() => {});
  await page.waitForTimeout(1000);
  return { context, page, log, drew };
}

// Scroll distance (in the tested direction) once it settles; slow pages can take seconds.
async function scrolledBy(page, before, dir) {
  let moved = 0;
  for (let i = 0; i < 25 && moved < 100; i++) {
    await page.waitForTimeout(200);
    moved = ((await page.evaluate(() => scrollY)) - before) * dir;
  }
  return moved;
}

// Draw calls in a window where the page produced frames (>= 5 rAF ticks/s).
async function drawsWhileResponsive(page, ms = 2000) {
  let last = { draws: 0, frames: 0, ticks: 0 };
  for (let i = 0; i < 8; i++) {
    const a = await page.evaluate(() => [__gl.draws, __gl.drawFrames, __gl.ticks]);
    await page.waitForTimeout(ms);
    const b = await page.evaluate(() => [__gl.draws, __gl.drawFrames, __gl.ticks]);
    last = { draws: b[0] - a[0], frames: b[1] - a[1], ticks: b[2] - a[2] };
    if (last.ticks >= (ms / 1000) * 5) return last;
  }
  return { ...last, stalled: true };
}
// 0 frames: idle. A few: sporadic re-renders (resize, late layout). 5+: a render loop.
const loopStatus = (r) => (r.frames >= 5 ? 'FAIL' : r.frames > 0 ? 'WARN' : 'PASS');
const loopDetail = (r, where) => `${r.frames} frames with draw calls in 2 s ${where} (${r.draws} draw calls)`;

async function mainCanvasCenter(page) {
  return page.evaluate(() => {
    const c = __gl.canvases().sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    if (!c) return null;
    c.scrollIntoView({ block: 'center' });
    const r = c.getBoundingClientRect();
    // Scroll whichever way the page has room to go from here.
    const down = document.documentElement.scrollHeight - innerHeight - scrollY > 150;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, top: r.top, bottom: r.bottom, width: r.width, height: r.height, dir: down ? 1 : -1 };
  });
}

const DEPRECATION = /deprecated|has been removed|has been renamed/i;
const browser = await launch();
try {
  // 1. Desktop load: rendering, console, weight, layout shift, a11y, scrolling.
  const d = await open(browser);
  if (!d.drew) {
    report('FAIL', 'Renders', 'no WebGL draw calls within 60 s');
  } else {
    report('PASS', 'Renders', `${await d.page.evaluate(() => __gl.canvases().length)} WebGL canvas(es) drawing`);
    const deprecations = [...d.log.warnings, ...d.log.errors].filter((t) => DEPRECATION.test(t));
    const errors = d.log.errors.filter((t) => !DEPRECATION.test(t));
    report(errors.length ? 'FAIL' : 'PASS', 'Console errors', errors.slice(0, 3).join(' | ') || 'none');
    report(deprecations.length ? 'FAIL' : 'PASS', 'three.js deprecation warnings', deprecations.slice(0, 3).join(' | ') || 'none');
    report(d.log.http.length ? 'FAIL' : 'PASS', 'HTTP errors', d.log.http.slice(0, 5).join(', ') || 'none');
    const mb = d.log.glbBytes / 1024 / 1024;
    report(mb > 5 ? 'FAIL' : mb > 2 ? 'WARN' : 'PASS', 'GLB weight', `${mb.toFixed(2)} MB of .glb downloaded (budget: ≤ 2 MB, ceiling 5 MB)`);
    const cls = await d.page.evaluate(() => __gl.cls);
    report(cls > 0.1 ? 'FAIL' : cls > 0.02 ? 'WARN' : 'PASS', 'Layout shift', `CLS ${cls.toFixed(3)}`);
    const name = await d.page.evaluate(() => {
      const results = [];
      for (const c of __gl.canvases()) {
        let el = c; let label = null;
        for (let i = 0; el && i < 5 && !label; i++, el = el.parentElement) label = el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent?.trim());
        results.push(label);
      }
      return results;
    });
    report(name.every(Boolean) ? 'PASS' : 'WARN', 'Accessible name', name.map((n) => n ? `"${n}"` : 'missing').join(', '));
    const idle = await drawsWhileResponsive(d.page);
    report('INFO', 'Idle rendering (motion allowed)', `${loopDetail(idle, 'with no interaction')}${idle.frames ? ' — fine for animation or auto-rotate; a static model should be 0' : ''}`);
    const c = await mainCanvasCenter(d.page);
    const scrollable = await d.page.evaluate(() => document.documentElement.scrollHeight > innerHeight + 200);
    if (c && scrollable) {
      await d.page.waitForTimeout(500);
      await d.page.mouse.move(c.x, Math.min(Math.max(c.y, 10), 790));
      const before = await d.page.evaluate(() => scrollY);
      await d.page.mouse.wheel(0, 400 * c.dir);
      const moved = await scrolledBy(d.page, before, c.dir);
      report(moved > 100 ? 'PASS' : 'FAIL', 'Wheel over the canvas scrolls the page', `moved ${Math.round(moved)} px`);
    } else report('SKIP', 'Wheel over the canvas scrolls the page', 'page not scrollable');
    // Scroll through the whole page (lazy viewers mount), then leave the canvases offscreen.
    const h = await d.page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= h; y += 400) { await d.page.evaluate((y) => scrollTo(0, y), y); await d.page.waitForTimeout(300); }
    await d.page.waitForTimeout(2500);
    const evictions = d.log.warnings.filter((t) => /Too many active WebGL contexts/.test(t)).length;
    const maxLive = await d.page.evaluate(() => __gl.maxLive);
    report(evictions ? 'FAIL' : maxLive > 8 ? 'WARN' : 'PASS', 'WebGL contexts', `max ${maxLive} live at once; eviction warnings: ${evictions}${maxLive > 8 ? ' (share a renderer or release offscreen viewers)' : ''}`);
    for (const target of [0, h]) {
      await d.page.evaluate((y) => scrollTo(0, y), target);
      await d.page.waitForTimeout(1200);
      const visible = await d.page.evaluate(() => __gl.canvases().some((c) => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }));
      if (visible) continue;
      const off = await drawsWhileResponsive(d.page);
      report(loopStatus(off), 'Stops rendering offscreen', loopDetail(off, 'with every canvas out of view'));
      break;
    }
    if (!results.some((r) => r.name === 'Stops rendering offscreen')) report('SKIP', 'Stops rendering offscreen', 'a canvas stays in view at every scroll position');
  }
  await d.context.close();

  if (d.drew) {
    // 2. Reduced motion: nothing should draw once loaded.
    const rm = await open(browser, { reducedMotion: 'reduce' });
    const r = await drawsWhileResponsive(rm.page);
    report(loopStatus(r), 'prefers-reduced-motion stops self-motion', loopDetail(r, 'while idle'));
    await rm.context.close();

    // 3. Phone: pixel-ratio cap, vertical swipe, and pinch over the canvas.
    const m = await open(browser, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const ratio = await m.page.evaluate(() => Math.max(0, ...__gl.canvases().map((c) => c.width / c.getBoundingClientRect().width)));
    report(ratio <= 2.05 ? 'PASS' : 'FAIL', 'Pixel ratio capped at 2', `backing store is ${ratio.toFixed(2)}× CSS size on a 3× phone`);
    const c = await mainCanvasCenter(m.page);
    if (c && c.height > 160) {
      await m.page.waitForTimeout(500);
      const cdp = await m.context.newCDPSession(m.page);
      const x = c.x, low = Math.min(c.bottom - 20, 820), high = Math.max(c.top + 20, 20);
      // Finger moving up scrolls the page down, and vice versa.
      const [y0, y1] = c.dir > 0 ? [low, high] : [high, low];
      const before = await m.page.evaluate(() => scrollY);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
      for (let i = 1; i <= 12; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y0 + ((y1 - y0) * i) / 12 }] }); await m.page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const moved = await scrolledBy(m.page, before, c.dir);
      report(moved > 50 ? 'PASS' : 'FAIL', 'Vertical swipe over the canvas scrolls the page', `moved ${Math.round(moved)} px`);
      // Pinch over the canvas should zoom the page, as it would over a photo.
      const p = await mainCanvasCenter(m.page);
      const fingers = (type, spread) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: p.x - spread, y: p.y, id: 0 }, { x: p.x + spread, y: p.y, id: 1 }] });
      await fingers('touchStart', 20);
      for (let i = 1; i <= 15; i++) { await fingers('touchMove', 20 + i * 6); await m.page.waitForTimeout(16); }
      await fingers('touchEnd');
      await m.page.waitForTimeout(800);
      const scale = await m.page.evaluate(() => visualViewport.scale);
      report(scale > 1.2 ? 'PASS' : 'WARN', 'Pinch over the canvas zooms the page', scale > 1.2 ? `page scale ${scale.toFixed(2)}` : "page didn't zoom; fine if pinch zooms the model, otherwise use touch-action: pan-y pinch-zoom");
    } else report('SKIP', 'Vertical swipe over the canvas scrolls the page', 'no canvas tall enough on a phone');
    await m.context.close();
  }

  // 4. Throttled phone (Lighthouse's Slow 4G and 4x CPU): when the main image paints, and when 3D shows up.
  const t = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await t.addInitScript(INSTRUMENT);
  await t.addInitScript(() => {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        const el = e.element;
        window.__lcp = { time: e.startTime, what: el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${e.url ? ` ${new URL(e.url).pathname}` : ''}` : e.url || 'removed element' };
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  const tp = await t.newPage();
  const cdp = await t.newCDPSession(tp);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await tp.goto(url, { waitUntil: 'load', timeout: 120_000 });
  const shownAt = await tp.waitForFunction(() => __gl.canvases().length > 0 && performance.now(), null, { timeout: 45_000 }).then((h) => h.jsonValue(), () => null);
  const lcp = await tp.evaluate(() => window.__lcp);
  if (lcp) report(lcp.time <= 2500 ? 'PASS' : 'WARN', 'LCP on a throttled phone', `${Math.round(lcp.time)} ms (${lcp.what}); good is ≤ 2500 ms`);
  else report('WARN', 'LCP on a throttled phone', 'no LCP entry: canvases and low-detail placeholder images are not LCP candidates; give the 3D view a real poster <img>');
  report('INFO', '3D visible on a throttled phone', shownAt ? `${(shownAt / 1000).toFixed(1)} s after navigation` : 'not within 45 s (below the fold, or slow)');
  await t.close();
} finally {
  await browser.close();
}

// 5. No WebGL at all: the page must keep an image in place and not throw.
const noGl = await launch(['--disable-webgl', '--disable-3d-apis']);
try {
  const page = await noGl.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  const images = await page.evaluate(() => [...document.images].filter((i) => { const r = i.getBoundingClientRect(); const s = getComputedStyle(i); return i.complete && i.naturalWidth > 0 && r.width >= 100 && r.height >= 100 && s.visibility !== 'hidden' && s.display !== 'none'; }).length);
  report(errors.length ? 'FAIL' : 'PASS', 'No-WebGL: no uncaught errors', errors.slice(0, 2).join(' | ') || 'none');
  report(images ? 'PASS' : 'WARN', 'No-WebGL: fallback image visible', `${images} image(s) ≥ 100 px visible — check one sits where the model would be`);
} finally {
  await noGl.close();
}

if (jsonOut) await writeFile(jsonOut, JSON.stringify({ url, results }, null, 2));
const failed = results.filter((r) => r.status === 'FAIL').length;
console.log(failed ? `\n${failed} check(s) failed.` : '\nNo failures.');
process.exit(failed ? 1 : 0);
