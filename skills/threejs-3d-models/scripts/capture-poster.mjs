#!/usr/bin/env node
// Capture a <three-model> poster from a running page, using the page's own
// component, CSS size, and framing, so the poster matches the first frame.
// Usage: node capture-poster.mjs <page-url> <out.webp|out.png> [css-selector]
// The selector defaults to "three-model"; the first match is captured. Motion
// is disabled (prefers-reduced-motion), so the frame is the untouched initial view.
// Requires playwright (npx playwright, or a project devDependency). If the
// environment pre-installs Chromium, PLAYWRIGHT_BROWSERS_PATH already points
// at it; otherwise `npx playwright install chromium` once.

import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

// resolve playwright from the project being worked on (cwd), not from this
// script's location inside the skill directory
const pw = await import('playwright').catch(() => {
  const req = createRequire(join(process.cwd(), 'noop.js'));
  return import(pathToFileURL(req.resolve('playwright')).href);
});
const { chromium } = pw.chromium ? pw : pw.default;

const [url, output, selector = 'three-model'] = process.argv.slice(2);
if (!url || !output || !/\.(webp|png)$/.test(output)) {
  console.error('Usage: node capture-poster.mjs <page-url> <out.webp|out.png> [css-selector]');
  process.exit(2);
}

// fall back to a system Chromium when playwright's own download is absent
// (override with CHROMIUM_PATH)
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

// software GL fallback keeps this working on machines and CI without a GPU
const args = ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await chromium.launch({ args }).catch((e) => {
  const executablePath = systemChromium();
  if (!executablePath) throw e;
  return chromium.launch({ args, executablePath });
});
const page = await browser.newPage({ deviceScaleFactor: 2, reducedMotion: 'reduce' });
await page.goto(url);
const element = page.locator(selector).first();
await element.scrollIntoViewIfNeeded();
await page.waitForFunction(
  (sel) => document.querySelector(sel)?.viewer,
  selector,
  { timeout: 120_000 },
);
const type = output.endsWith('.png') ? 'image/png' : 'image/webp';
const { dataUrl, width, height } = await page.evaluate(
  ([sel, type]) => {
    const { snapshot, canvas } = document.querySelector(sel).viewer;
    return { dataUrl: snapshot(type, 0.9), width: canvas.width, height: canvas.height };
  },
  [selector, type],
);
await browser.close();

const bytes = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
await writeFile(output, bytes);
console.log(`Captured ${output} (${width}x${height}, ${(bytes.length / 1024).toFixed(0)} KB, transparent background)`);
