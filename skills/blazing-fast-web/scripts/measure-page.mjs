#!/usr/bin/env node
// Lab measurement of one page load (and optionally one typing interaction) with
// Playwright + CDP throttling. Prints JSON: per-run values and the median.
//
//   node measure-page.mjs <url> [--runs 3] [--cpu 4] [--net mobile|desktop|none]
//        [--viewport 412x823] [--ready "<css selector>"]
//        [--type "<css selector>" "<text>"] [--out results.json]
//
// --ready  selector that marks "page usable" (default: load event)
// --type   types <text> into <selector> one key at a time after load and
//          reports INP (worst interaction) and long-task time while typing.
// Needs `playwright` resolvable from the current directory or globally.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith('--') && /^https?:/.test(a));
if (!url) { console.error('usage: measure-page.mjs <url> [options]'); process.exit(2); }
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const runs = Number(opt('runs', 3));
const cpu = Number(opt('cpu', 4));
const net = opt('net', 'mobile');
const [vw, vh] = opt('viewport', '412x823').split('x').map(Number);
const ready = opt('ready', null);
const typeIdx = args.indexOf('--type');
const typeSel = typeIdx >= 0 ? args[typeIdx + 1] : null;
const typeText = typeIdx >= 0 ? args[typeIdx + 2] : null;
const outFile = opt('out', null);

function loadPlaywright() {
  for (const base of [process.cwd(), execSync('npm root -g').toString().trim()]) {
    for (const name of ['playwright', '@playwright/test']) {
      try { return createRequire(path.join(base, base === process.cwd() ? 'package.json' : 'x'))(name); } catch {}
    }
  }
  console.error('playwright not found (npm i -D playwright, or install globally)');
  process.exit(2);
}
const { chromium } = loadPlaywright();

const NETS = {
  mobile: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
  desktop: { latency: 40, downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (5 * 1024 * 1024) / 8 },
};
const median = (a) => { const s = a.filter((x) => typeof x === 'number').sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

async function once(browser) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  // Each run uses a fresh context, so the HTTP cache starts empty (a cold load)
  // without disabling it; disabling it makes preloaded resources download twice.
  if (NETS[net]) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETS[net] });
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

  const bytes = { total: 0, script: 0, stylesheet: 0, image: 0, font: 0, document: 0, other: 0 };
  let requests = 0, inflight = 0, lastActivity = Date.now();
  const pending = [];
  page.on('request', () => { inflight++; lastActivity = Date.now(); });
  page.on('requestfailed', () => { inflight--; lastActivity = Date.now(); });
  page.on('requestfinished', (r) => {
    inflight--; lastActivity = Date.now(); requests++;
    pending.push(r.sizes().then((s) => {
      const n = s.responseBodySize + s.responseHeadersSize; const t = r.resourceType();
      bytes.total += n; bytes[t in bytes ? t : 'other'] += n;
    }).catch(() => {}));
  });
  await page.addInitScript(() => {
    const w = window; w.__m = { lcp: 0, cls: 0, tbt: 0, fcp: 0, events: [], longDuringType: 0, typing: false };
    const po = (type, fn) => { try { new PerformanceObserver((l) => l.getEntries().forEach(fn)).observe({ type, buffered: true, ...(type === 'event' ? { durationThreshold: 16 } : {}) }); } catch {} };
    po('largest-contentful-paint', (e) => { w.__m.lcp = e.startTime; });
    po('layout-shift', (e) => { if (!e.hadRecentInput) w.__m.cls += e.value; });
    po('paint', (e) => { if (e.name === 'first-contentful-paint') w.__m.fcp = e.startTime; });
    po('longtask', (e) => { if (w.__m.typing) w.__m.longDuringType += e.duration; else if (w.__m.fcp) w.__m.tbt += Math.max(0, e.duration - 50); });
    po('event', (e) => { if (e.interactionId) w.__m.events.push(e.duration); });
  });

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 180000 });
  if (ready) await page.locator(ready).first().waitFor({ timeout: 180000 });
  const readyMs = Date.now() - t0;
  // network quiet for 1 s (max 120 s) so lazy/late requests are counted
  while (Date.now() - t0 < 120000 && (inflight > 0 || Date.now() - lastActivity < 1000)) await page.waitForTimeout(200);
  await Promise.all(pending);
  const load = await page.evaluate(() => ({ fcp: window.__m.fcp, lcp: window.__m.lcp, cls: window.__m.cls, tbt: window.__m.tbt }));
  const result = { readyMs, ...load, requests, bytes: { ...bytes } };

  if (typeSel) {
    await page.locator(typeSel).first().click();
    await page.evaluate(() => { window.__m.events = []; window.__m.typing = true; window.__m.longDuringType = 0; });
    const tt = Date.now();
    await page.locator(typeSel).first().pressSequentially(typeText, { delay: 120 });
    await page.waitForTimeout(800);
    const ev = await page.evaluate(() => ({ events: window.__m.events, long: window.__m.longDuringType }));
    Object.assign(result, { inp: ev.events.length ? Math.max(...ev.events) : 0, longTasksWhileTypingMs: ev.long, typeMs: Date.now() - tt - 800 });
  }
  await ctx.close();
  return result;
}

const browser = await chromium.launch();
const all = [];
try { for (let i = 0; i < runs; i++) all.push(await once(browser)); }
finally { await browser.close(); }

const keys = Object.keys(all[0]).filter((k) => k !== 'bytes');
const med = Object.fromEntries(keys.map((k) => [k, median(all.map((r) => r[k]))]));
med.bytes = Object.fromEntries(Object.keys(all[0].bytes).map((k) => [k, median(all.map((r) => r.bytes[k]))]));
const out = { url, conditions: { runs, cpu, net, viewport: `${vw}x${vh}` }, median: med, runs: all };
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.median));
