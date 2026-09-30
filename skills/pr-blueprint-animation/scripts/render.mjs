#!/usr/bin/env node
// Render player.html frame by frame. First checks that every rest frame shows
// its state screenshot pixel for pixel, then writes a filmstrip of each step's
// key frames, then encodes the video (MP4 + GIF, or WebM with Playwright's own
// ffmpeg). Exits 1 if a rest frame fails or the player throws.
//
//   node render.mjs <player.html> [--out <dir>] [--fps 30] [--gif-fps 12] [--gif-width 800]
//     [--no-video] [--no-gif] [--no-filmstrip] [--ffmpeg <path>] [--tolerance 0.0005]
//   node render.mjs <player.html> --at 4.8,12.4   only write those moments (out/at-<t>.png)
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { comparePngs, die, findFfmpeg, launch, loadPlaywright, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), {
  out: '', fps: '30', gifFps: '12', gifWidth: '800', video: true, gif: true, filmstrip: true, ffmpeg: '', tolerance: '0.0005', at: '',
});
if (!args._[0]) die('usage: render.mjs <player.html> [--out dir] [--fps 30] [--no-video]');
const player = resolve(args._[0]);
const out = resolve(args.out || join(dirname(player), 'out'));
mkdirSync(out, { recursive: true });
const fps = +args.fps;
const mb = f => `${(statSync(f).size / 1e6).toFixed(1)} MB`;

async function run(bin, argv, input) {
  const proc = spawn(bin, argv, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
  let err = '';
  proc.stderr.on('data', d => { err += d; });
  if (input) await input(proc.stdin);
  const [code] = await once(proc, 'close');
  if (code !== 0) die(`ffmpeg failed (${code}): ${err.trim().split('\n').slice(-3).join(' | ')}`);
}

const browser = await launch(loadPlaywright());
const errors = [];
let failed = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${pathToFileURL(player).href}?render=1`);
  await page.waitForFunction(() => window.BP && window.BP.isReady, null, { timeout: 60000 });
  const perr = await page.evaluate(() => window.BP.error);
  if (perr) die(`the player failed to start: ${perr}`);
  const meta = await page.evaluate(() => window.BP.meta());
  await page.setViewportSize({ width: meta.canvas.w, height: meta.canvas.h });
  const seek = async t => {
    const err = await page.evaluate(async t => { await window.BP.seek(t); return window.BP.error; }, t);
    if (err) die(`the player failed at ${t.toFixed(2)} s: ${err}`);
  };
  const checkErrors = () => { if (errors.length) die(`the player threw: ${errors[0]}`); };
  console.log(`${meta.title}: ${meta.steps.length} steps, ${meta.states} states, ${meta.total.toFixed(1)} s, canvas ${meta.canvas.w}x${meta.canvas.h}`);

  if (args.at) {
    for (const t of args.at.split(',').map(Number)) {
      if (Number.isNaN(t)) die(`bad --at value in ${args.at}`);
      await seek(t);
      const file = join(out, `at-${t.toFixed(2)}.png`);
      await page.screenshot({ path: file });
      console.log(`frame ${t.toFixed(2)} s: ${file}`);
    }
    checkErrors();
  } else {
    // 1. Rest frames must match the captured states (the swap is invisible).
    const helper = await browser.newPage();
    const report = [];
    const clip = { x: meta.app.x, y: meta.app.y, width: meta.app.w, height: meta.app.h };
    for (const r of meta.rest) {
      await seek(r.T);
      const shot = await page.screenshot({ clip });
      const src = await page.evaluate(i => window.BP.stateSrc(i), r.state);
      const c = await comparePngs(helper, shot, src, { ignoreCorner: 24 });
      const ok = !c.error && c.ratio <= +args.tolerance;
      if (!ok) failed++;
      report.push(`${ok ? 'PASS' : 'FAIL'}  T=${r.T.toFixed(2)}s ${r.why}: matches s${r.state}? ${c.error || `${c.diff} px differ (${(c.ratio * 100).toFixed(3)}%)`}`);
    }
    checkErrors();
    report.forEach(l => console.log(l));
    writeFileSync(join(out, 'qa.txt'), `${report.join('\n')}\n`);

    // 2. Filmstrip: one row per step; full-size key frames go to frames/.
    if (args.filmstrip) {
      mkdirSync(join(out, 'frames'), { recursive: true });
      const cw = 480, ch = Math.round((cw * meta.canvas.h) / meta.canvas.w);
      const rows = [];
      for (const k of meta.keyframes) {
        const cells = [];
        for (const f of k.frames) {
          await seek(f.T);
          const buf = await page.screenshot({ type: 'jpeg', quality: 88 });
          const file = join(out, 'frames', `${k.n}-${f.name.replace(/\s+/g, '-')}.jpg`);
          writeFileSync(file, buf);
          cells.push({ cap: `${f.name} · ${f.T.toFixed(1)}s`, src: `data:image/jpeg;base64,${buf.toString('base64')}` });
        }
        rows.push({ title: `${k.n} ${k.name}`, cells });
      }
      checkErrors();
      const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
      await helper.setViewportSize({ width: 5 * (cw + 12) + 12, height: 400 });
      await helper.setContent(`<body style="margin:0;padding:12px;background:#fff;font:13px/1.4 system-ui,sans-serif;color:#1F2328">${rows.map(r => `<div style="font-weight:600;margin:8px 0 6px">${esc(r.title)}</div><div style="display:flex;gap:12px">${r.cells.map(c => `<figure style="margin:0"><img src="${c.src}" width="${cw}" height="${ch}" style="display:block;border:1px solid #D0D7DE"><figcaption style="color:#57606A;margin-top:4px">${esc(c.cap)}</figcaption></figure>`).join('')}</div>`).join('')}</body>`);
      await helper.evaluate(() => Promise.all([...document.images].map(i => i.decode())));
      const file = join(out, 'filmstrip.png');
      await helper.screenshot({ path: file, fullPage: true });
      console.log(`filmstrip: ${file} (key frames in ${join(out, 'frames')})`);
    }

    // 3. Video, only once the rest frames pass.
    if (args.video && failed) console.log('SKIP  video: fix the failing rest frames first');
    else if (args.video) {
      const ff = findFfmpeg(args.ffmpeg);
      if (!ff) {
        console.log('SKIP  video: no ffmpeg (install it, or pip install imageio-ffmpeg, or pass --ffmpeg <path>)');
      } else {
        const N = Math.floor(meta.total * fps);
        const file = join(out, ff.full ? 'blueprint.mp4' : 'blueprint.webm');
        const enc = ff.full
          ? ['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2',
            ...(ff.h264 ? ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'] : ['-c:v', 'mpeg4', '-q:v', '2'])]
          : ['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libvpx', '-b:v', '8M', '-crf', '6', '-qmin', '0', '-qmax', '40', '-deadline', 'good', '-cpu-used', '4'];
        if (!ff.full) console.log('note: only Playwright\'s ffmpeg found, so the video is WebM (VP8) and there is no GIF');
        const t0 = Date.now();
        await run(ff.bin, ['-y', '-loglevel', 'error', ...enc, file], async stdin => {
          for (let f = 0; f <= N; f++) {
            await seek(f / fps);
            const buf = await page.screenshot(ff.full ? { type: 'png' } : { type: 'jpeg', quality: 92 });
            if (!stdin.write(buf)) await once(stdin, 'drain');
            if (f % Math.max(1, Math.round(N / 10)) === 0) {
              if (process.stdout.isTTY) process.stdout.write(`\r  frames ${f}/${N}`);
              else console.log(`  frames ${f}/${N}`);
            }
          }
          stdin.end();
        });
        checkErrors();
        console.log(`${process.stdout.isTTY ? '\r' : ''}video: ${file} (${N + 1} frames at ${fps} fps, ${mb(file)}, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
        if (args.gif && ff.full) {
          const gif = join(out, 'blueprint.gif');
          await run(ff.bin, ['-y', '-loglevel', 'error', '-i', file, '-vf',
            `fps=${args.gifFps},scale=${args.gifWidth}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`,
            '-loop', '0', gif]);
          console.log(`gif: ${gif} (${mb(gif)})`);
        }
      }
    }
  }
} finally {
  await browser.close();
}
if (failed) die(`${failed} rest frame(s) do not match their state screenshots (see ${join(out, 'qa.txt')})`);
