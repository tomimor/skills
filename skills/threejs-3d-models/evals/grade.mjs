#!/usr/bin/env node
// Grades threejs-3d-models eval runs. For each run it builds the project,
// serves the production build, and measures behavior in headless Chromium with
// WebGL instrumentation (draw calls, live contexts, context evictions, layout
// shift). Writes <run>/grading.json and review artifacts into <run>/outputs/.
// Usage: node grade.mjs <iteration-dir> [run-path-filter] [--port-base N]
// Expects <iteration-dir>/../fixtures (from setup-fixtures.sh) and, per run,
// eval-<id>-<name>/<config>/run-1/{project/, outputs/SUMMARY.md, timing.json}.
import { spawn, execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const args = process.argv.slice(2);
const iterationDir = args[0];
const filter = args[1] && !args[1].startsWith('--') ? args[1] : '';
const portBase = Number(args[args.indexOf('--port-base') + 1]) || 6100;
const WS = dirname(iterationDir.replace(/\/$/, ''));
const FIXTURES = join(WS, 'fixtures');
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

// Playwright from this folder's node_modules, or a global install on NODE_PATH.
const pw = await import('playwright').catch(() => import(pathToFileURL(createRequire(join(process.cwd(), 'noop.js')).resolve('playwright')).href));
const { chromium } = pw.chromium ? pw : pw.default;
const systemChromium = () => {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const c of ['/opt/pw-browsers/chromium', 'chromium', 'chromium-browser', 'google-chrome']) {
    try {
      const p = c.startsWith('/') ? c : execFileSync('sh', ['-c', `command -v ${c}`], { encoding: 'utf8' }).trim();
      if (p && existsSync(p)) return p;
    } catch {}
  }
  return undefined;
};
const launch = (args) => chromium.launch({ args }).catch((e) => {
  const executablePath = systemChromium();
  if (!executablePath) throw e;
  return chromium.launch({ args, executablePath });
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INSTRUMENT = `(() => {
  const s = { entries: [], draws: 0, drawFrames: 0, cls: 0, maxLive: 0, ticks: 0 };
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
  s.live = () => s.entries.filter((e) => e.drawn && !e.lost && e.ref.deref()).length;
  s.canvases = () => s.entries.filter((e) => e.drawn && !e.lost).flatMap((e) => [e.ref.deref(), ...e.surfaces.map((r) => r.deref())]).filter((c) => c?.isConnected);
  setInterval(() => { s.maxLive = Math.max(s.maxLive, s.live()); }, 50);
  try {
    new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) s.cls += e.value; })
      .observe({ type: 'layout-shift', buffered: true });
  } catch {}
})();`;

// ---------- infrastructure ----------

function build(project) {
  const r = spawnSync('npx', ['vite', 'build', '--logLevel', 'error'], { cwd: project, encoding: 'utf8', timeout: 300_000 });
  return { ok: r.status === 0, log: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().slice(-2000) };
}

async function serve(project, port) {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { cwd: project, stdio: 'ignore', detached: true });
  const url = `http://localhost:${port}/`;
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    await sleep(250);
  }
  return { url, stop: () => { try { process.kill(-proc.pid, 'SIGTERM'); } catch {} } };
}

async function open(browser, url, contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...contextOptions });
  await context.addInitScript(INSTRUMENT);
  const page = await context.newPage();
  const log = { errors: [], warnings: [], pageErrors: [], glb: [], jsBytes: 0 };
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error') log.errors.push(t);
    else if (m.type() === 'warning') log.warnings.push(t);
  });
  page.on('pageerror', (e) => log.pageErrors.push(e.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  const reqs = new Map();
  cdp.on('Network.responseReceived', (e) => reqs.set(e.requestId, e.response.url));
  cdp.on('Network.loadingFinished', (e) => {
    const u = reqs.get(e.requestId) ?? '';
    if (/\.glb(\?|$)/.test(u)) log.glb.push({ url: new URL(u).pathname, bytes: e.encodedDataLength });
  });
  await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  return { context, page, log, cdp };
}

const gl = (page) => page.evaluate(() => ({ draws: __gl.draws, live: __gl.live(), maxLive: __gl.maxLive, created: __gl.entries.length, drawnContexts: __gl.entries.filter((e) => e.drawn).length, lost: __gl.entries.filter((e) => e.lost).length, cls: __gl.cls }));
const waitForDraws = (page, timeout = 90_000) => page.waitForFunction(() => __gl.draws > 0, null, { timeout }).then(() => true, () => false);
async function drawsOver(page, ms) {
  const a = await page.evaluate(() => __gl.draws);
  await page.waitForTimeout(ms);
  return (await page.evaluate(() => __gl.draws)) - a;
}
// Draw calls over a window in which the page was demonstrably producing frames
// (>= 5 rAF ticks per second). Software GL can stall the whole page for
// seconds; a stalled window would make an always-rendering page look idle.
async function responsiveDraws(page, ms = 2000, attempts = 8) {
  let last = { draws: 0, frames: 0, ticks: 0 };
  for (let i = 0; i < attempts; i++) {
    const a = await page.evaluate(() => [__gl.draws, __gl.drawFrames, __gl.ticks]);
    await page.waitForTimeout(ms);
    const b = await page.evaluate(() => [__gl.draws, __gl.drawFrames, __gl.ticks]);
    last = { draws: b[0] - a[0], frames: b[1] - a[1], ticks: b[2] - a[2] };
    if (last.ticks >= (ms / 1000) * 5) return { ...last, stalled: false };
  }
  return { ...last, stalled: true };
}
// Wait until the page stops issuing draw calls for a whole second (or give up).
async function settle(page, maxMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if ((await drawsOver(page, 1000)) === 0) return true;
  }
  return false;
}

// Marks and returns the rect of the largest connected canvas that has drawn.
async function mainCanvas(page) {
  return page.evaluate(() => {
    const canvases = __gl.canvases();
    let best = null;
    for (const c of canvases) {
      const r = c.getBoundingClientRect();
      if (!best || r.width * r.height > best.area) best = { c, area: r.width * r.height };
    }
    if (!best) return null;
    document.querySelectorAll('[data-grade-target]').forEach((el) => el.removeAttribute('data-grade-target'));
    best.c.setAttribute('data-grade-target', '');
    const r = best.c.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, scrollY: window.scrollY, pixelWidth: best.c.width };
  });
}

// Review artifacts only: a slow software-GL page must not abort grading.
async function saveShot(page, path, options = {}) {
  try { writeFileSync(path, await page.screenshot({ timeout: 120_000, ...options })); } catch {}
}

async function shotOf(page, rect) {
  const clip = { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: Math.max(1, Math.min(rect.width, 1280)), height: Math.max(1, Math.min(rect.height, 800)) };
  return page.screenshot({ clip, timeout: 120_000 });
}

async function meanAbsDiff(a, b) {
  const [ra, rb] = await Promise.all([a, b].map((buf) => sharp(buf).resize(200, 200, { fit: 'fill' }).removeAlpha().raw().toBuffer()));
  let sum = 0;
  for (let i = 0; i < ra.length; i++) sum += Math.abs(ra[i] - rb[i]);
  return sum / ra.length;
}

async function scrolledBy(page, before, min = 100) {
  let moved = 0;
  for (let i = 0; i < 25 && moved < min; i++) {
    await page.waitForTimeout(200);
    moved = (await page.evaluate(() => scrollY)) - before;
  }
  return moved;
}

async function scrollToCanvasTop(page) {
  await page.evaluate(() => document.querySelector('[data-grade-target]')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
}

async function touchSwipe(context, page, x, y0, x1, y1) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + ((x1 - x) * i) / 12, y: y0 + ((y1 - y0) * i) / 12 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(800);
}

const DEPRECATION = /deprecated|has been removed|has been renamed|no longer supported/i;
const threeDeprecations = (log) => [...log.warnings, ...log.errors].filter((t) => DEPRECATION.test(t) && /THREE|three|Clock|RGBELoader|ShadowMap|WebGLRenderer|Loader/.test(t));
const realErrors = (log) => [...log.errors.filter((t) => !/favicon/.test(t)), ...log.pageErrors];

function entryScriptsContainThree(project) {
  const dist = join(project, 'dist');
  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const refs = [...html.matchAll(/<(?:script[^>]*src|link[^>]*rel="modulepreload"[^>]*href)="([^"]+\.js)"/g)].map((m) => m[1]);
  const hits = [];
  let gz = 0;
  for (const ref of refs) {
    const file = join(dist, ref.replace(/^\//, ''));
    if (!existsSync(file)) continue;
    const code = readFileSync(file);
    gz += gzipSync(code).length;
    if (code.includes('WebGLRenderer') || code.includes('WebGLRenderingContext')) hits.push(basename(file));
  }
  const anyThree = readdirSync(join(dist, 'assets')).filter((f) => f.endsWith('.js')).some((f) => readFileSync(join(dist, 'assets', f)).includes('WebGLRenderer'));
  return { refs, hits, gzKB: Math.round(gz / 1024), anyThree };
}

function diffAgainstFixture(fixture, project) {
  const r = spawnSync('diff', ['-ruN', '--exclude=node_modules', '--exclude=dist', '--exclude=.vite', '--exclude=package-lock.json', fixture, project], { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  const out = (r.stdout ?? '').replaceAll(fixture, 'a').replaceAll(project, 'b');
  return out.length > 250_000 ? `${out.slice(0, 250_000)}\n... (truncated)` : out;
}

// ---------- expectation helper ----------

class Grade {
  constructor() { this.expectations = []; this.metrics = {}; }
  add(text, passed, evidence) { this.expectations.push({ text, passed: Boolean(passed), evidence: String(evidence) }); }
  async check(text, fn) {
    try {
      const [passed, evidence] = await fn();
      this.add(text, passed, evidence);
    } catch (error) {
      this.add(text, false, `check failed to run: ${error.message.split('\n')[0]}`);
    }
  }
}

// ---------- shared browser checks ----------

async function loadAndRender(browser, url, g, label = 'page') {
  const s = await open(browser, url);
  const drew = await waitForDraws(s.page);
  await s.page.waitForLoadState('networkidle').catch(() => {});
  await s.page.waitForTimeout(2500);
  g.metrics[`${label}_gl_after_load`] = await gl(s.page);
  return { ...s, drew };
}

async function checkOffscreenIdle(page) {
  if ((await page.evaluate(() => __gl.draws)) === 0) return { inView: false, draws: 0, never: true };
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1500);
  const inView = await page.evaluate(() => __gl.canvases().some((c) => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.width > 0; }));
  const r = await responsiveDraws(page);
  return { inView, draws: r.draws, frames: r.frames, stalled: r.stalled };
}

async function checkReducedMotionIdle(browser, url, g, prepare) {
  const s = await open(browser, url, { reducedMotion: 'reduce' });
  try {
    if (prepare) await prepare(s.page);
    const drew = await waitForDraws(s.page);
    await s.page.waitForLoadState('networkidle').catch(() => {});
    await s.page.waitForTimeout(4000);
    const r = await responsiveDraws(s.page);
    g.metrics.reduced_motion = { drew, idleDrawsIn2s: r.draws, drawFramesIn2s: r.frames, rafTicks: r.ticks, stalled: r.stalled };
    if (!drew) {
      // Showing still images instead of 3D under reduced motion also stops the motion; a blank page doesn't.
      const stills = await s.page.evaluate(() => [...document.images].filter((i) => {
        const b = i.getBoundingClientRect(), cs = getComputedStyle(i);
        return i.complete && i.naturalWidth > 0 && b.width >= 100 && b.height >= 100 && b.bottom > 0 && b.top < innerHeight && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0';
      }).length);
      g.metrics.reduced_motion.stillImagesInView = stills;
      return [stills > 0 && !r.stalled, `no 3D drawn under prefers-reduced-motion; ${stills} still image(s) ≥ 100 px in view instead`];
    }
    return [r.frames < 5 && !r.stalled, drew ? `with prefers-reduced-motion: ${r.frames} frames with draw calls in 2 s (${r.draws} draw calls; rAF ticks ${r.ticks}${r.stalled ? ', page never responsive' : ''})` : 'nothing rendered under reduced motion'];
  } finally { await s.context.close(); }
}

async function checkDprCap(browser, url, g, prepare) {
  const s = await open(browser, url, { deviceScaleFactor: 3 });
  try {
    if (prepare) await prepare(s.page);
    await waitForDraws(s.page);
    await s.page.waitForTimeout(2500);
    const ratio = await s.page.evaluate(() => Math.max(0, ...__gl.canvases().filter((c) => c.clientWidth > 0).map((c) => c.width / c.getBoundingClientRect().width)));
    g.metrics.dpr3_canvas_ratio = ratio;
    return [ratio > 0 && ratio <= 2.05, `canvas backing-store ratio on a 3x device: ${ratio.toFixed(2)}`];
  } finally { await s.context.close(); }
}

async function checkWheelScroll(page) {
  const rect = await mainCanvas(page);
  if (!rect) return [false, 'no rendered canvas found'];
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const r = await mainCanvas(page);
  const x = r.x + r.width / 2, y = Math.min(r.y + r.height / 2, 780);
  await page.mouse.move(x, y);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 400);
  const moved = await scrolledBy(page, before);
  return [moved > 100, `wheel over the 3D canvas moved the page by ${Math.round(moved)} px`];
}

async function checkTouchScroll(browser, url, g, prepare) {
  const s = await open(browser, url, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    if (prepare) await prepare(s.page);
    await waitForDraws(s.page);
    await s.page.waitForTimeout(3000);
    await s.page.evaluate(() => window.scrollTo(0, 0));
    await s.page.waitForTimeout(300);
    const r = await mainCanvas(s.page);
    if (!r) return [false, 'no rendered canvas on mobile'];
    const cx = r.x + r.width / 2;
    const top = Math.max(r.y + 20, 20), bottom = Math.min(r.y + r.height - 20, 820);
    if (bottom - top < 120) return [false, `canvas too small or off-screen for a swipe (${Math.round(r.height)} px tall)`];
    const before = await s.page.evaluate(() => scrollY);
    await touchSwipe(s.context, s.page, cx, bottom, cx, top);
    const moved = await scrolledBy(s.page, before, 50);
    const ta = await s.page.evaluate(() => getComputedStyle(document.querySelector('[data-grade-target]')).touchAction);
    g.metrics.mobile_touch = { scrolled: moved, touchAction: ta };
    return [moved > 50, `vertical swipe over the canvas scrolled ${Math.round(moved)} px (canvas touch-action: ${ta})`];
  } finally { await s.context.close(); }
}

// Two fingers spreading over the canvas should zoom the page, as they would over a photo.
async function checkPinchZoom(browser, url, g, prepare) {
  const s = await open(browser, url, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    if (prepare) await prepare(s.page);
    await waitForDraws(s.page);
    await s.page.waitForTimeout(3000);
    await s.page.evaluate(() => window.scrollTo(0, 0));
    await s.page.waitForTimeout(300);
    const r = await mainCanvas(s.page);
    if (!r) return [false, 'no rendered canvas on mobile'];
    const top = Math.max(r.y, 40), bottom = Math.min(r.y + r.height, 800);
    if (bottom - top < 60) return [false, `canvas not in view for a pinch (${Math.round(r.height)} px tall at y=${Math.round(r.y)})`];
    const cx = r.x + r.width / 2, cy = (top + bottom) / 2;
    const cdp = await s.context.newCDPSession(s.page);
    const fingers = (type, spread) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: cx - spread, y: cy, id: 0 }, { x: cx + spread, y: cy, id: 1 }] });
    await fingers('touchStart', 20);
    for (let i = 1; i <= 15; i++) { await fingers('touchMove', 20 + i * 6); await s.page.waitForTimeout(16); }
    await fingers('touchEnd');
    await s.page.waitForTimeout(800);
    const scale = await s.page.evaluate(() => visualViewport.scale);
    const ta = await s.page.evaluate(() => getComputedStyle(document.querySelector('[data-grade-target]')).touchAction);
    g.metrics.mobile_pinch = { pageScale: scale, touchAction: ta };
    return [scale > 1.2, `two-finger pinch over the canvas: page scale 1.00 → ${scale.toFixed(2)} (canvas touch-action: ${ta})`];
  } finally { await s.context.close(); }
}

async function checkNoWebglFallback(url, selectorForArea) {
  const browser = await launch(['--disable-webgl', '--disable-3d-apis']);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    const img = await page.evaluate((sel) => {
      const area = document.querySelector(sel) ?? document.body;
      return [...area.querySelectorAll('img')].some((i) => { const r = i.getBoundingClientRect(); const st = getComputedStyle(i); return i.complete && i.naturalWidth > 0 && r.width > 100 && r.height > 100 && st.visibility !== 'hidden' && st.display !== 'none' && Number(st.opacity) > 0.1; });
    }, selectorForArea);
    return [img, `without WebGL: visible image in ${selectorForArea}: ${img}; uncaught errors: ${errors.length ? errors.join(' | ').slice(0, 200) : 'none'}`];
  } finally { await browser.close(); }
}

// ---------- eval-specific graders ----------

async function gradeProductPage(project, url, browser, g, out) {
  const s = await loadAndRender(browser, url, g);
  try {
    await g.check('The page builds and the 3D view renders the helmet with no console errors', async () => {
      const errs = realErrors(s.log);
      return [s.drew && errs.length === 0, `rendered: ${s.drew}; errors: ${errs.length ? errs.join(' | ').slice(0, 300) : 'none'}`];
    });
    await g.check('No three.js deprecation warnings in the console', async () => {
      if (!s.drew) return [false, 'nothing rendered'];
      const d = threeDeprecations(s.log);
      return [d.length === 0, d.length ? d.join(' | ').slice(0, 300) : 'none'];
    });
    await g.check('The helmet the page downloads is optimized (< 2 MB transferred; the source export is 3.8 MB)', async () => {
      const total = s.log.glb.reduce((a, b) => a + b.bytes, 0);
      return [total > 0 && total < 2 * 1024 * 1024, `GLB bytes transferred: ${(total / 1024).toFixed(0)} KB (${s.log.glb.map((x) => x.url).join(', ') || 'none'})`];
    });
    await g.check('three.js is code-split out of the entry bundle (loaded with a dynamic import)', async () => {
      const r = entryScriptsContainThree(project);
      if (!r.anyThree) return [false, 'three.js is not in the build at all'];
      return [r.hits.length === 0, `entry scripts: ${r.refs.join(', ')} (${r.gzKB} KB gzip); contain WebGLRenderer: ${r.hits.join(', ') || 'no'}`];
    });
    await g.check('Layout is stable while the 3D view loads (CLS < 0.05)', async () => {
      if (!s.drew) return [false, 'nothing rendered'];
      const cls = (await gl(s.page)).cls;
      return [cls < 0.05, `cumulative layout shift: ${cls.toFixed(3)}`];
    });
    const rect = await mainCanvas(s.page);
    if (rect) await saveShot(s.page, join(out, 'desktop-3d-view.png'), { clip: { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: Math.min(rect.width, 1280), height: Math.min(rect.height, 800) } });
    await g.check('Dragging horizontally rotates the helmet', async () => {
      if (!rect) return [false, 'no rendered canvas'];
      await scrollToCanvasTop(s.page);
      const r = await mainCanvas(s.page);
      const a = await shotOf(s.page, r);
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
      await s.page.mouse.move(cx - 80, cy); await s.page.mouse.down();
      for (let i = 1; i <= 10; i++) { await s.page.mouse.move(cx - 80 + i * 16, cy); await s.page.waitForTimeout(16); }
      await s.page.mouse.up(); await s.page.waitForTimeout(1500);
      const d = await meanAbsDiff(a, await shotOf(s.page, await mainCanvas(s.page)));
      return [d > 2, `mean pixel difference after a 160 px drag: ${d.toFixed(2)}`];
    });
    await g.check('Keyboard users can reach the 3D view and rotate it with arrow keys', async () => {
      await s.page.evaluate(() => { window.scrollTo(0, 0); document.activeElement?.blur(); });
      let reached = false;
      for (let i = 0; i < 25 && !reached; i++) {
        await s.page.keyboard.press('Tab');
        reached = await s.page.evaluate(() => { const c = document.querySelector('[data-grade-target]'); const a = document.activeElement; return !!(c && a && a !== document.body && (a === c || a.contains(c))); });
      }
      if (!reached) return [false, 'Tab never focused the 3D view or its container'];
      const r = await mainCanvas(s.page);
      const a = await shotOf(s.page, r);
      for (let i = 0; i < 3; i++) await s.page.keyboard.press('ArrowLeft');
      await s.page.waitForTimeout(1500);
      const d = await meanAbsDiff(a, await shotOf(s.page, await mainCanvas(s.page)));
      return [d > 2, `focused the 3D view; mean pixel difference after 3× ArrowLeft: ${d.toFixed(2)}`];
    });
    await g.check('The 3D view has an accessible name (aria-label / labelled role=img on the canvas or its container)', async () => {
      const name = await s.page.evaluate(() => {
        let el = document.querySelector('[data-grade-target]');
        for (let i = 0; el && i < 5; i++, el = el.parentElement) {
          const label = el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent);
          if (label?.trim()) return `${el.tagName.toLowerCase()}${el.getAttribute('role') ? `[role=${el.getAttribute('role')}]` : ''}: "${label.trim()}"`;
        }
        return null;
      });
      return [Boolean(name), name ?? 'no aria-label/aria-labelledby on the canvas or its 4 nearest ancestors'];
    });
    await g.check('Mouse-wheel over the 3D view scrolls the page (zoom does not hijack scrolling)', () => checkWheelScroll(s.page));
    await g.check('The 3D view stops rendering when scrolled out of view', async () => {
      const r = await checkOffscreenIdle(s.page);
      if (r.never) return [false, 'nothing rendered'];
      return [!r.inView && r.frames < 5 && !r.stalled, `canvas in view after scrolling to the bottom: ${r.inView}; frames with draw calls in 2 s: ${r.frames} (${r.draws} draw calls)${r.stalled ? ' (page never responsive)' : ''}`];
    });
  } finally { await s.context.close(); }
  await g.check('With prefers-reduced-motion, an idle 3D view stops rendering (no continuous draw loop)', () => checkReducedMotionIdle(browser, url, g));
  await g.check('A vertical swipe over the 3D view scrolls the page on a phone', () => checkTouchScroll(browser, url, g));
  await g.check('A pinch over the 3D view zooms the page on a phone, as over a photo', () => checkPinchZoom(browser, url, g));
  await g.check('The canvas pixel ratio is capped at 2 on a 3× display', () => checkDprCap(browser, url, g));
  await g.check('Without WebGL, the gallery still shows a product image and nothing throws', () => checkNoWebglFallback(url, '.gallery'));
}

async function gradeReactGallery(project, url, browser, g, out) {
  const collection = `${url}#/collection`;
  const s = await open(browser, collection);
  try {
    const drew = await waitForDraws(s.page);
    await s.page.waitForLoadState('networkidle').catch(() => {});
    await s.page.waitForTimeout(6000);
    g.metrics.collection_after_load = await gl(s.page);
    await saveShot(s.page, join(out, 'collection-top.png'));
    await g.check('The collection renders 3D models in the cards with no console errors', async () => {
      const errs = realErrors(s.log);
      return [drew && errs.length === 0, `rendered: ${drew}; errors: ${errs.length ? errs.join(' | ').slice(0, 300) : 'none'}`];
    });
    await g.check('No card in view is blank once models load (each shows a render or its thumbnail)', async () => {
      if (!drew) return [false, 'nothing rendered'];
      const rects = await s.page.evaluate(() => [...document.querySelectorAll('.card')].map((c) => {
        const m = c.querySelector('.card-media') ?? c.firstElementChild ?? c; const r = m.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }).filter((r) => r.y >= 0 && r.y + r.height <= innerHeight && r.width > 40));
      const shot = await s.page.screenshot({ timeout: 120_000 });
      let blank = 0;
      for (const r of rects) {
        const stats = await sharp(shot).extract({ left: Math.round(r.x + r.width * 0.15), top: Math.round(r.y + r.height * 0.15), width: Math.round(r.width * 0.7), height: Math.round(r.height * 0.7) }).stats();
        if (Math.max(...stats.channels.slice(0, 3).map((c) => c.stdev)) < 3) blank++;
      }
      return [rects.length > 0 && blank === 0, `cards fully in view: ${rects.length}; blank: ${blank}`];
    });
    await g.check('Scrolling through all 24 cards never exceeds 16 live WebGL contexts or triggers context eviction', async () => {
      if (!drew) return [false, 'nothing rendered'];
      const h = await s.page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y <= h; y += 300) { await s.page.evaluate((y) => window.scrollTo(0, y), y); await s.page.waitForTimeout(350); }
      await s.page.waitForTimeout(3000);
      for (let y = h; y >= 0; y -= 600) { await s.page.evaluate((y) => window.scrollTo(0, y), y); await s.page.waitForTimeout(250); }
      await s.page.waitForTimeout(2000);
      const st = await gl(s.page);
      const evictions = s.log.warnings.filter((t) => /Too many active WebGL contexts/i.test(t)).length;
      g.metrics.collection_after_scroll = st;
      return [st.maxLive <= 16 && evictions === 0, `max live contexts: ${st.maxLive}; contexts created: ${st.created}; eviction warnings: ${evictions}`];
    });
    await g.check('Five Home ↔ Collection round trips cause no context evictions, and Home ends with at most 1 live context', async () => {
      if (!drew) return [false, 'nothing rendered'];
      for (let i = 0; i < 5; i++) {
        await s.page.evaluate(() => { location.hash = '#/'; });
        await s.page.waitForTimeout(800);
        await s.page.evaluate(() => { location.hash = '#/collection'; });
        await s.page.waitForTimeout(2500);
      }
      await s.page.evaluate(() => { location.hash = '#/'; });
      await s.page.waitForTimeout(2000);
      const st = await gl(s.page);
      const evictions = s.log.warnings.filter((t) => /Too many active WebGL contexts/i.test(t)).length;
      g.metrics.after_navigation = { ...st, evictions };
      return [evictions === 0 && st.live <= 1, `live contexts on Home: ${st.live}; total created: ${st.created}; eviction warnings (whole session): ${evictions}`];
    });
    await g.check('The Home view stops rendering after navigating away from the collection', async () => {
      if (!drew) return [false, 'nothing rendered'];
      const r = await responsiveDraws(s.page);
      return [r.frames < 5 && !r.stalled, `frames with draw calls in 2 s on Home: ${r.frames} (${r.draws} draw calls; rAF ticks ${r.ticks})`];
    });
  } finally { await s.context.close(); }
  await g.check('three.js is code-split out of the entry bundle (Home does not download it)', async () => {
    const r = entryScriptsContainThree(project);
    if (!r.anyThree) return [false, 'three.js is not in the build at all'];
    return [r.hits.length === 0, `entry scripts: ${r.refs.join(', ')}; contain WebGLRenderer: ${r.hits.join(', ') || 'no'}`];
  });
  await g.check('With prefers-reduced-motion, the collection stops animating (no continuous draw loop)', () => checkReducedMotionIdle(browser, collection, g));
}

async function gradeLegacyHero(project, url, browser, g, out) {
  const s = await loadAndRender(browser, url, g);
  try {
    await g.check('The hero renders with no console errors', async () => {
      const errs = realErrors(s.log);
      return [s.drew && errs.length === 0, `rendered: ${s.drew}; errors: ${errs.length ? errs.join(' | ').slice(0, 300) : 'none'}`];
    });
    await g.check('No three.js deprecation warnings (Clock, RGBELoader, PCFSoftShadowMap, ...) in the console', async () => {
      if (!s.drew) return [false, 'nothing rendered'];
      const d = threeDeprecations(s.log);
      return [d.length === 0, d.length ? d.join(' | ').slice(0, 400) : 'none'];
    });
    await g.check('The fox is visible in the hero', async () => {
      await s.page.evaluate(() => window.scrollTo(0, 0));
      await s.page.waitForTimeout(500);
      const shot = await s.page.screenshot({ timeout: 120_000 });
      writeFileSync(join(out, 'hero.png'), shot);
      const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let orange = 0;
      for (let i = 0; i < data.length; i += 3) { const [r, gg, b] = [data[i], data[i + 1], data[i + 2]]; if (r > 140 && r - b > 90 && gg > 50 && gg < r - 30) orange++; }
      const share = orange / (info.width * info.height);
      return [share > 0.004, `fox-orange pixels: ${(share * 100).toFixed(2)}% of the viewport`];
    });
    await g.check('The fox animation still plays while the hero is visible (motion allowed)', async () => {
      await s.page.evaluate(() => window.scrollTo(0, 0));
      await s.page.waitForTimeout(800);
      const r = await responsiveDraws(s.page);
      return [r.frames >= 5, `frames with draw calls in 2 s with the hero in view: ${r.frames} (rAF ticks ${r.ticks})`];
    });
    await g.check('Mouse-wheel over the hero scrolls the page (no zoom hijack)', () => checkWheelScroll(s.page));
    await g.check('Rendering stops when the hero is scrolled out of view', async () => {
      const r = await checkOffscreenIdle(s.page);
      if (r.never) return [false, 'nothing rendered'];
      return [!r.inView && r.frames < 5 && !r.stalled, `canvas in view after scrolling to the bottom: ${r.inView}; frames with draw calls in 2 s: ${r.frames} (${r.draws} draw calls)${r.stalled ? ' (page never responsive)' : ''}`];
    });
  } finally { await s.context.close(); }
  await g.check('With prefers-reduced-motion, the hero stops animating (no continuous draw loop)', () => checkReducedMotionIdle(browser, url, g));
  await g.check('A vertical swipe over the hero scrolls the page on a phone', () => checkTouchScroll(browser, url, g));
  await g.check('A pinch over the hero zooms the page on a phone', () => checkPinchZoom(browser, url, g));
  await g.check('The canvas pixel ratio is capped at 2 on a 3× display', () => checkDprCap(browser, url, g));
}

async function readGlb(path) {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'meshopt.decoder': MeshoptDecoder,
    'draco3d.decoder': await draco3d.createDecoderModule(),
  });
  await MeshoptDecoder.ready;
  return io.read(path);
}

async function textureSizes(doc) {
  const sizes = [];
  for (const t of doc.getRoot().listTextures()) {
    const img = t.getImage();
    if (!img) continue;
    if (t.getMimeType() === 'image/ktx2') {
      const view = new DataView(img.buffer, img.byteOffset, img.byteLength);
      sizes.push({ mime: 'image/ktx2', w: view.getUint32(20, true), h: view.getUint32(24, true) });
    } else {
      const m = await sharp(Buffer.from(img)).metadata();
      sizes.push({ mime: t.getMimeType(), w: m.width, h: m.height });
    }
  }
  return sizes;
}

async function gradeAssetPipeline(project, url, browser, g, out) {
  const src = (f) => join(FIXTURES, 'asset-pipeline', 'models', f);
  const dst = (f) => join(project, 'public', 'models', f);
  const files = ['chair.glb', 'helmet.glb', 'fox.glb'];
  const docs = {};
  for (const f of files) { try { if (existsSync(dst(f))) docs[f] = await readGlb(dst(f)); } catch (e) { docs[f] = e; } }
  const sizes = Object.fromEntries(files.map((f) => [f, existsSync(dst(f)) ? statSync(dst(f)).size : null]));
  g.metrics.sizes = Object.fromEntries(files.map((f) => [f, { source: statSync(src(f)).size, optimized: sizes[f] }]));
  await g.check('All three optimized models exist in public/models/ with the original file names and parse as valid glTF', async () => {
    const bad = files.filter((f) => !(docs[f] && !(docs[f] instanceof Error)));
    return [bad.length === 0, bad.length ? `missing or invalid: ${bad.map((f) => `${f}${docs[f] instanceof Error ? ` (${docs[f].message.slice(0, 80)})` : ''}`).join(', ')}` : 'chair.glb, helmet.glb, fox.glb present and valid'];
  });
  await g.check('Each model shrank substantially (helmet < 1.5 MB, chair < 1 MB, fox < 110 KB)', async () => {
    const limits = { 'helmet.glb': 1.5 * 1024 * 1024, 'chair.glb': 1024 * 1024, 'fox.glb': 110 * 1024 };
    const rows = files.map((f) => `${f}: ${(statSync(src(f)).size / 1024).toFixed(0)} → ${sizes[f] ? (sizes[f] / 1024).toFixed(0) : '—'} KB`);
    return [files.every((f) => sizes[f] && sizes[f] < limits[f]), rows.join('; ')];
  });
  await g.check('chair.glb keeps all 13 configurator parts as separately named nodes', async () => {
    const doc = docs['chair.glb'];
    if (!doc || doc instanceof Error) return [false, 'chair.glb unreadable'];
    const want = ['Seat', 'Backrest', 'Leg_FL', 'Leg_FR', 'Leg_BL', 'Leg_BR', 'Armrest_L', 'Armrest_R', 'Slat_1', 'Slat_2', 'Slat_3', 'Slat_4', 'Slat_5'];
    const names = new Set(doc.getRoot().listNodes().filter((n) => n.getMesh()).map((n) => n.getName()));
    const missing = want.filter((n) => !names.has(n));
    return [missing.length === 0, missing.length ? `missing named mesh nodes: ${missing.join(', ')} (have: ${[...names].join(', ') || 'none'})` : 'all 13 named parts present'];
  });
  await g.check('fox.glb keeps its 3 animation clips (Survey, Walk, Run)', async () => {
    const doc = docs['fox.glb'];
    if (!doc || doc instanceof Error) return [false, 'fox.glb unreadable'];
    const clips = doc.getRoot().listAnimations().map((a) => a.getName());
    return [['Survey', 'Walk', 'Run'].every((c) => clips.includes(c)), `clips: ${clips.join(', ') || 'none'}`];
  });
  await g.check('No texture larger than 2048 px remains (the chair ships a 4096² texture)', async () => {
    const rows = [];
    let ok = true;
    for (const f of files) {
      const doc = docs[f];
      if (!doc || doc instanceof Error) { ok = false; continue; }
      const t = await textureSizes(doc);
      rows.push(`${f}: ${t.map((x) => `${x.w}×${x.h} ${x.mime.split('/')[1]}`).join(', ') || 'no textures'}`);
      if (t.some((x) => Math.max(x.w, x.h) > 2048)) ok = false;
    }
    return [ok, rows.join('; ')];
  });
  await g.check('Geometry is compressed or quantized in the helmet and fox (Meshopt, Draco, or KHR_mesh_quantization)', async () => {
    const rows = files.map((f) => {
      const doc = docs[f];
      if (!doc || doc instanceof Error) return [f, false, 'unreadable'];
      const ext = doc.getRoot().listExtensionsUsed().map((e) => e.extensionName);
      return [f, ext.some((e) => /meshopt|draco|quantization/i.test(e)), ext.join(', ') || 'none'];
    });
    const required = rows.filter((r) => r[0] !== 'chair.glb');
    return [required.every((r) => r[1]), rows.map((r) => `${r[0]}: ${r[2]}`).join('; ') + ' (chair geometry is 13 boxes, so it is not required)'];
  });
  // Site still works end to end.
  const s = await open(browser, url);
  try {
    const allDrawn = await s.page.waitForFunction(() => __gl.entries.filter((e) => e.drawn).length >= 3, null, { timeout: 90_000 }).then(() => true, () => false);
    await s.page.waitForTimeout(3000);
    g.metrics.site = await gl(s.page);
    await saveShot(s.page, join(out, 'site.png'), { fullPage: true });
    await g.check('The site still loads and renders all three optimized models with no console errors', async () => {
      const errs = realErrors(s.log);
      const n = (await gl(s.page)).drawnContexts;
      return [allDrawn && errs.length === 0, `canvases rendering: ${n}/3; errors: ${errs.length ? errs.join(' | ').slice(0, 300) : 'none'}`];
    });
    await g.check('The configurator still finds every part and a finish change recolors the chair', async () => {
      const parts = await s.page.evaluate(() => window.configuratorParts ? { upholstery: window.configuratorParts.upholstery.length, frame: window.configuratorParts.frame.length } : null);
      if (!parts) return [false, 'configurator never initialised (window.configuratorParts missing)'];
      const el = await s.page.$('#chair-model');
      await el.scrollIntoViewIfNeeded();
      await s.page.waitForTimeout(800);
      const box = await el.boundingBox();
      const a = await shotOf(s.page, box);
      await s.page.click('button[data-finish="rust"]');
      await s.page.waitForTimeout(1500);
      const d = await meanAbsDiff(a, await shotOf(s.page, await el.boundingBox()));
      return [parts.upholstery === 2 && parts.frame === 11 && d > 1, `parts found: upholstery ${parts.upholstery}/2, frame ${parts.frame}/11; pixel change after "Rust": ${d.toFixed(2)}`];
    });
  } finally { await s.context.close(); }
  await g.check('The summary reports the saving for each of the three files', async () => {
    const summary = existsSync(join(out, 'SUMMARY.md')) ? readFileSync(join(out, 'SUMMARY.md'), 'utf8') : '';
    const mentions = files.filter((f) => new RegExp(`${f.replace('.glb', '')}[\\s\\S]{0,200}?\\d+(\\.\\d+)?\\s*(KB|MB|kB|%)`, 'i').test(summary));
    return [mentions.length === 3, `files with a reported size or % in SUMMARY.md: ${mentions.join(', ') || 'none'}`];
  });
}

const GRADERS = { 'product-page': gradeProductPage, 'react-gallery': gradeReactGallery, 'legacy-hero': gradeLegacyHero, 'asset-pipeline': gradeAssetPipeline };

// ---------- main ----------

const runs = [];
for (const evalDir of readdirSync(iterationDir).filter((d) => d.startsWith('eval-')).sort()) {
  for (const config of readdirSync(join(iterationDir, evalDir))) {
    const runDir = join(iterationDir, evalDir, config, 'run-1');
    if (existsSync(join(runDir, 'project')) && runDir.includes(filter)) runs.push({ evalDir, config, runDir });
  }
}

let port = portBase;
for (const { evalDir, config, runDir } of runs) {
  const meta = JSON.parse(readFileSync(join(runDir, 'eval_metadata.json'), 'utf8'));
  const name = meta.eval_name;
  const project = join(runDir, 'project');
  const out = join(runDir, 'outputs');
  mkdirSync(out, { recursive: true });
  const g = new Grade();
  const started = Date.now();
  console.log(`\n=== ${evalDir}/${config}`);
  writeFileSync(join(out, 'changes.diff'), diffAgainstFixture(join(FIXTURES, name), project));
  const b = build(project);
  g.add('The project builds with `vite build`', b.ok, b.ok ? 'build succeeded' : b.log);
  if (b.ok) {
    const server = await serve(project, port++);
    const browser = await launch(GL_ARGS);
    try {
      await GRADERS[name](project, server.url, browser, g, out);
    } catch (error) {
      g.add('Grader completed', false, error.stack?.slice(0, 500));
    } finally {
      await browser.close();
      server.stop();
    }
  }
  const passed = g.expectations.filter((e) => e.passed).length;
  const total = g.expectations.length;
  const timing = existsSync(join(runDir, 'timing.json')) ? JSON.parse(readFileSync(join(runDir, 'timing.json'), 'utf8')) : {};
  const grading = {
    expectations: g.expectations,
    summary: { passed, failed: total - passed, total, pass_rate: total ? Math.round((passed / total) * 100) / 100 : 0 },
    // Schema field names. No total_duration_seconds here, so aggregate_benchmark takes time and tokens from timing.json.
    timing: { executor_duration_seconds: timing.total_duration_seconds ?? 0, grader_duration_seconds: Math.round((Date.now() - started) / 100) / 10 },
    execution_metrics: { total_tool_calls: timing.tool_uses ?? 0, errors_encountered: 0 },
    metrics: g.metrics,
  };
  writeFileSync(join(runDir, 'grading.json'), JSON.stringify(grading, null, 2));
  writeFileSync(join(out, 'checks.json'), JSON.stringify({ expectations: g.expectations, metrics: g.metrics }, null, 2));
  for (const e of g.expectations) console.log(`${e.passed ? 'PASS' : 'FAIL'} ${e.text}\n     ${e.evidence.slice(0, 220)}`);
  console.log(`--> ${passed}/${total}`);
}
