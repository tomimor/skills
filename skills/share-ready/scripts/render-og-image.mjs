#!/usr/bin/env node
// Render an HTML template to a 1200x630 og-image PNG via Playwright.
// Usage: node render-og-image.mjs <template.html> <output.png>
// Requires playwright (npx playwright, or a project devDependency). If the
// environment pre-installs Chromium, PLAYWRIGHT_BROWSERS_PATH already points
// at it; otherwise `npx playwright install chromium` once.

import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
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

const [template, output] = process.argv.slice(2);
if (!template || !output) {
  console.error('Usage: node render-og-image.mjs <template.html> <output.png>');
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

const browser = await chromium.launch().catch((e) => {
  const executablePath = systemChromium();
  if (!executablePath) throw e;
  return chromium.launch({ executablePath });
});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(resolve(template)).href, { waitUntil: 'networkidle' });
await page.screenshot({ path: output, type: 'png' });
await browser.close();
console.log(`Rendered ${output} (1200x630)`);
