#!/usr/bin/env node
// Pixel-diff two captured states and list the regions that changed. Use it to
// pick each step's focus rect, to check a step changes only what it should,
// and to prove the last state matches the PR head.
//
//   node compare.mjs <a.png> <b.png> [--out diff.png] [--same] [--tolerance 16]
//   --same   exit 1 unless the images match (0 changed pixels)
import { readFileSync, writeFileSync } from 'node:fs';
import { comparePngs, die, launch, loadPlaywright, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { out: '', same: false, tolerance: '16' });
const [a, b] = args._;
if (!a || !b) die('usage: compare.mjs <a.png> <b.png> [--out diff.png] [--same]');

const browser = await launch(loadPlaywright());
try {
  const page = await browser.newPage();
  const c = await comparePngs(page, readFileSync(a), readFileSync(b), { tol: +args.tolerance, diffImage: !!args.out });
  if (c.error) die(c.error);
  console.log(`${c.diff} of ${c.total} px differ (${(c.ratio * 100).toFixed(3)}%)`);
  c.boxes.forEach((r, i) => console.log(`region ${i + 1}: { x: ${r.x}, y: ${r.y}, w: ${r.w}, h: ${r.h} }`));
  if (args.out) {
    writeFileSync(args.out, Buffer.from(c.png.split(',')[1], 'base64'));
    console.log(`diff image: ${args.out}`);
  }
  if (args.same && c.diff) process.exitCode = 1;
} finally {
  await browser.close();
}
