// Shared helpers for the pr-blueprint-animation scripts: argument parsing,
// finding Playwright and ffmpeg, and pixel comparison in a Chromium page.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SKILL_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

// --flag value, --flag=value, boolean --flag / --no-flag. Keys are camelCased.
export function parseArgs(argv, spec) {
  const out = { _: [], ...spec };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const eq = a.indexOf('=');
    let key = (eq < 0 ? a.slice(2) : a.slice(2, eq)).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    let neg = false;
    if (!(key in spec) && key.startsWith('no') && key.length > 2) {
      const k2 = key[2].toLowerCase() + key.slice(3);
      if (typeof spec[k2] === 'boolean') { key = k2; neg = true; }
    }
    if (!(key in spec)) throw new Error(`unknown option ${a}`);
    if (typeof spec[key] === 'boolean') out[key] = neg ? false : eq < 0 ? true : a.slice(eq + 1) !== 'false';
    else out[key] = eq < 0 ? argv[++i] : a.slice(eq + 1);
  }
  return out;
}

export function die(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

// The project's Playwright first (its browsers are installed), then one next to
// this skill, then a global install.
export function loadPlaywright() {
  for (const base of [process.cwd(), SKILL_DIR]) {
    for (const mod of ['playwright', 'playwright-core']) {
      try { return createRequire(join(base, 'noop.cjs'))(mod); } catch {}
    }
  }
  try {
    const root = execFileSync('npm', ['root', '-g'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    for (const mod of ['playwright', 'playwright-core']) {
      if (existsSync(join(root, mod))) return createRequire(join(root, 'noop.cjs'))(join(root, mod));
    }
  } catch {}
  die('Playwright not found. Use the project\'s own (npm i -D playwright), or install it globally: npm i -g playwright && npx playwright install chromium');
}

export async function launch(pw) {
  const tries = [{}, { channel: 'chrome' }];
  if (process.env.CHROME_PATH) tries.unshift({ executablePath: process.env.CHROME_PATH });
  let err;
  for (const opts of tries) {
    try { return await pw.chromium.launch({ headless: true, ...opts }); } catch (e) { err = e; }
  }
  die(`could not launch Chromium (${String(err.message).split('\n')[0]}). Run npx playwright install chromium, or set CHROME_PATH.`);
}

function runs(bin, args = ['-hide_banner', '-version']) {
  try { return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return null; }
}

function playwrightBrowsersDir() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) return process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (platform() === 'darwin') return join(homedir(), 'Library/Caches/ms-playwright');
  if (platform() === 'win32') return join(homedir(), 'AppData/Local/ms-playwright');
  return join(homedir(), '.cache/ms-playwright');
}

// A full ffmpeg (H.264 + GIF), else Playwright's bundled build, which can only
// turn JPEG frames into VP8/WebM. Returns null when there is none.
export function findFfmpeg(explicit) {
  const cands = [explicit, process.env.FFMPEG, 'ffmpeg'].filter(Boolean);
  const py = runs('python3', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())']);
  if (py) cands.push(py.trim());
  for (const bin of cands) {
    if (!runs(bin)) continue;
    const enc = runs(bin, ['-hide_banner', '-encoders']) || '';
    if (/\bpng\b/.test(runs(bin, ['-hide_banner', '-decoders']) || '')) {
      return { bin, full: true, h264: /libx264/.test(enc) };
    }
  }
  const dir = playwrightBrowsersDir();
  if (existsSync(dir)) {
    for (const d of readdirSync(dir).filter(n => n.startsWith('ffmpeg')).sort().reverse()) {
      for (const f of ['ffmpeg-linux', 'ffmpeg-mac', 'ffmpeg-win64.exe']) {
        const bin = join(dir, d, f);
        if (existsSync(bin) && runs(bin)) return { bin, full: false, h264: false };
      }
    }
  }
  return null;
}

// Compare two PNGs (buffers or data URLs) in a blank Chromium page. Pixels whose
// channels differ by more than `tol` count as changed. Returns the changed ratio,
// merged bounding boxes of the changed areas and, if asked, a diff image.
export async function comparePngs(page, a, b, { tol = 16, ignoreCorner = 0, cell = 8, merge = 24, diffImage = false } = {}) {
  const url = v => (typeof v === 'string' ? v : `data:image/png;base64,${v.toString('base64')}`);
  return page.evaluate(async ({ a, b, tol, ignoreCorner, cell, merge, diffImage }) => {
    const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('image failed to load')); im.src = src; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    if (A.naturalWidth !== B.naturalWidth || A.naturalHeight !== B.naturalHeight) {
      return { error: `size differs: ${A.naturalWidth}x${A.naturalHeight} vs ${B.naturalWidth}x${B.naturalHeight}` };
    }
    const w = A.naturalWidth, h = A.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(A, 0, 0); const da = cx.getImageData(0, 0, w, h);
    cx.clearRect(0, 0, w, h); cx.drawImage(B, 0, 0); const db = cx.getImageData(0, 0, w, h).data;
    const pa = da.data;
    const rad = ignoreCorner;
    const corner = (x, y) => {
      if (!rad) return false;
      const cx0 = x < rad ? rad : x >= w - rad ? w - rad - 1 : -1;
      const cy0 = y < rad ? rad : y >= h - rad ? h - rad - 1 : -1;
      return cx0 >= 0 && cy0 >= 0 && (x - cx0) ** 2 + (y - cy0) ** 2 > (rad - 1.5) ** 2;
    };
    const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
    const grid = new Uint8Array(gw * gh);
    const mask = diffImage ? new Uint8Array(w * h) : null;
    let diff = 0, counted = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (corner(x, y)) continue;
        counted++;
        const i = (y * w + x) * 4;
        if (Math.abs(pa[i] - db[i]) > tol || Math.abs(pa[i + 1] - db[i + 1]) > tol || Math.abs(pa[i + 2] - db[i + 2]) > tol || Math.abs(pa[i + 3] - db[i + 3]) > tol) {
          diff++;
          grid[((y / cell) | 0) * gw + ((x / cell) | 0)] = 1;
          if (mask) mask[y * w + x] = 1;
        }
      }
    }
    // Connected changed cells -> boxes, then merge boxes closer than `merge` px.
    const seen = new Uint8Array(gw * gh);
    let boxes = [];
    for (let i = 0; i < grid.length; i++) {
      if (!grid[i] || seen[i]) continue;
      let x1 = gw, y1 = gh, x2 = 0, y2 = 0;
      const stack = [i]; seen[i] = 1;
      while (stack.length) {
        const j = stack.pop(); const gx = j % gw, gy = (j / gw) | 0;
        x1 = Math.min(x1, gx); y1 = Math.min(y1, gy); x2 = Math.max(x2, gx); y2 = Math.max(y2, gy);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = gx + dx, ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const k = ny * gw + nx;
          if (grid[k] && !seen[k]) { seen[k] = 1; stack.push(k); }
        }
      }
      boxes.push({ x: x1 * cell, y: y1 * cell, w: Math.min(w, (x2 + 1) * cell) - x1 * cell, h: Math.min(h, (y2 + 1) * cell) - y1 * cell });
    }
    const near = (p, q) => p.x - merge <= q.x + q.w && q.x - merge <= p.x + p.w && p.y - merge <= q.y + q.h && q.y - merge <= p.y + p.h;
    for (let changed = true; changed;) {
      changed = false;
      outer: for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        if (!near(boxes[i], boxes[j])) continue;
        const p = boxes[i], q = boxes[j];
        const x = Math.min(p.x, q.x), y = Math.min(p.y, q.y);
        boxes[i] = { x, y, w: Math.max(p.x + p.w, q.x + q.w) - x, h: Math.max(p.y + p.h, q.y + q.h) - y };
        boxes.splice(j, 1); changed = true; break outer;
      }
    }
    boxes.sort((p, q) => p.y - q.y || p.x - q.x);
    let png = null;
    if (mask) {
      const out = cx.createImageData(w, h); const po = out.data;
      for (let p = 0; p < w * h; p++) {
        const i = p * 4;
        if (mask[p]) { po[i] = 255; po[i + 1] = 0; po[i + 2] = 170; po[i + 3] = 255; }
        else { po[i] = 255 - (255 - pa[i]) * 0.35; po[i + 1] = 255 - (255 - pa[i + 1]) * 0.35; po[i + 2] = 255 - (255 - pa[i + 2]) * 0.35; po[i + 3] = 255; }
      }
      cx.putImageData(out, 0, 0);
      cx.strokeStyle = '#0B8FC2'; cx.lineWidth = 2;
      for (const r of boxes) cx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      png = cv.toDataURL('image/png');
    }
    return { w, h, diff, total: counted, ratio: counted ? diff / counted : 0, boxes, png };
  }, { a: url(a), b: url(b), tol, ignoreCorner, cell, merge, diffImage });
}
