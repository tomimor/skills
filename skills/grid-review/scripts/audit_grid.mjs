#!/usr/bin/env node
/*
 * audit_grid.mjs — headless runner for the grid audit (CI path).
 *
 * Usage:
 *   node audit_grid.mjs <url|file> [--widths=1440,1180,768] [--display-min=40] [--json out.json]
 *
 * Auto-detects a driver, in order: playwright, puppeteer, puppeteer-core (+ CHROME env).
 * If none is installed, it prints the Chrome-MCP fallback instructions and exits 2 —
 * the audit logic itself needs no install (see grid_audit_core.js / SKILL.md).
 *
 * It injects grid_audit_core.js and calls __gridAudit() at each width, waiting for
 * document.fonts.ready first so optical-ink measurement uses the real loaded font.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const CORE = readFileSync(resolve(__dir, 'grid_audit_core.js'), 'utf8');

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith('--'));
if (!target) { console.error('usage: node audit_grid.mjs <url|file> [--widths=1440,1180,768]'); process.exit(1); }
const flag = (k, d) => { const a = args.find((x) => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const widths = flag('widths', '1440,1180,768').split(',').map(Number);
const displayMin = Number(flag('display-min', '40'));
const jsonOut = flag('json', null);
const url = /^https?:\/\//.test(target) || target.startsWith('file:') ? target : 'file://' + resolve(target);

async function getDriver() {
  for (const name of ['playwright', 'puppeteer']) {
    try {
      const mod = await import(name);
      const m = mod.default || mod;
      if (name === 'playwright') {
        const browser = await m.chromium.launch();
        return { name, browser, newPage: async () => (await browser.newContext()).newPage() };
      }
      const browser = await m.launch({ args: ['--no-sandbox'] });
      return { name, browser, newPage: () => browser.newPage() };
    } catch { /* try next */ }
  }
  try {
    const pc = (await import('puppeteer-core')).default;
    const chrome = process.env.CHROME;
    if (!chrome) throw new Error('puppeteer-core needs CHROME=<chrome binary path>');
    const browser = await pc.launch({ executablePath: chrome, args: ['--no-sandbox', '--headless=new'] });
    return { name: 'puppeteer-core', browser, newPage: () => browser.newPage() };
  } catch (e) {
    console.error('\nNo headless driver available (' + e.message + ').');
    console.error('Either install one:  npm i -D playwright && npx playwright install chromium');
    console.error('Or use the Chrome-MCP fallback described in SKILL.md (no install needed).');
    process.exit(2);
  }
}

function setViewport(driver, page, w, h) {
  return driver.name === 'playwright' ? page.setViewportSize({ width: w, height: h }) : page.setViewport({ width: w, height: h });
}

const driver = await getDriver();
const runs = [];
for (const w of widths) {
  const page = await driver.newPage();
  await setViewport(driver, page, w, 1000);
  await page.goto(url, { waitUntil: driver.name === 'playwright' ? 'networkidle' : 'networkidle2' });
  await page.evaluate('document.fonts && document.fonts.ready');
  await page.evaluate(CORE);
  const report = await page.evaluate((dm) => window.__gridAudit({ displayMinPx: dm }), displayMin);
  runs.push(report);
  await page.close();
}
await driver.browser.close();

const out = { url, driver: driver.name, runs };
if (jsonOut) { (await import('node:fs')).writeFileSync(jsonOut, JSON.stringify(out, null, 2)); }

// ---- human summary ----
for (const r of runs) {
  console.log(`\n=== ${r.width}px — ${r.mode} grid (${r.grid.confidence} confidence, ${r.grid.columns} cols) ===`);
  console.log(`  column violations: ${r.columnViolations.length} (worst ${r.columnViolations[0]?.offsetPx ?? 0}px)`);
  console.log(`  baseline: ${r.baseline.unit ?? '?'}px unit, ${Math.round((r.baseline.lineHeightMultipleRate || 0) * 100)}% line-heights on rhythm (${r.baseline.confidence})`);
  console.log(`  optical-ink violations: ${r.opticalViolations.length} (worst ${r.opticalViolations[0]?.inkOffsetPx ?? 0}px)`);
  const p = r.principled;
  console.log(`  type sizes: ${p.distinctTextSizes} distinct · head/body ratio: ${p.headBodyRatio ?? '?'} · measure: ${p.avgMeasureCh ?? '?'}ch`);
  console.log(`  justified blocks: ${p.justifiedSelectors.length} · accent hues: ${p.accentHues.length} · families: ${p.fontFamilies.join(', ')}`);
}
console.log(jsonOut ? `\nFull JSON -> ${jsonOut}` : '\n(add --json out.json for the full machine report)');
