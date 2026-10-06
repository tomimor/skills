#!/usr/bin/env node
// Render player.html frame by frame. First checks that every rest frame shows
// its state screenshot (at most --max-diff of the pixels may differ by more
// than 16 levels, which allows for anti-aliasing), then writes a filmstrip of
// each step's key frames, then encodes the video: MP4 (H.264) + GIF with a full
// ffmpeg, else WebM with Playwright's own ffmpeg. Exits 1 if a rest frame fails
// or the player throws.
//
//   node render.mjs <player.html> [--out <dir>] [--fps 30] [--gif-fps 12] [--gif-width 800]
//     [--no-video] [--no-gif] [--no-filmstrip] [--ffmpeg <path>] [--max-diff 0.0005]
//   node render.mjs <player.html> --at 4.8,12.4   only write those moments (out/at-<t>.png)
//   node render.mjs <player.html> --gif-only      rebuild out/blueprint.gif from the video, e.g. smaller
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { comparePngs, die, findFfmpeg, launch, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), {
  out: '', fps: '30', gifFps: '12', gifWidth: '800', video: true, gif: true, gifOnly: false, filmstrip: true,
  ffmpeg: '', maxDiff: '0.0005', at: '',
});
if (!args._[0]) die('usage: render.mjs <player.html> [--out dir] [--fps 30] [--no-video]');
const player = resolve(args._[0]);
const out = resolve(args.out || join(dirname(player), 'out'));
mkdirSync(out, { recursive: true });
const fps = +args.fps;
const mb = f => `${(statSync(f).size / 1e6).toFixed(1)} MB`;

// Run ffmpeg; `feed(write)` streams frames into it. A crash mid-stream reports
// ffmpeg's own error instead of hanging or failing with EPIPE.
async function run(bin, argv, feed) {
  const proc = spawn(bin, argv, { stdio: [feed ? 'pipe' : 'ignore', 'ignore', 'pipe'] });
  let err = '', code = null;
  proc.stderr.on('data', d => { err += d; });
  const closed = once(proc, 'close').then(([c]) => { code = c; });
  const fail = () => die(`ffmpeg failed (exit ${code}): ${err.trim().split('\n').slice(-4).join(' | ') || 'no output'}`);
  if (feed) {
    proc.stdin.on('error', () => {});
    await feed(async buf => {
      if (code !== null) { await closed; fail(); }
      if (!proc.stdin.write(buf)) await Promise.race([once(proc.stdin, 'drain').catch(() => {}), closed]);
      if (code !== null) { await closed; fail(); }
    });
    proc.stdin.end();
  }
  await closed;
  if (code !== 0) fail();
}

// GIF from the encoded video: RGB before scaling, a palette from every pixel and
// no dithering, so flat UI colours stay flat. Never upscales a narrow canvas.
async function makeGif(ff, video) {
  const gif = join(out, 'blueprint.gif');
  await run(ff.bin, ['-y', '-loglevel', 'error', '-i', video, '-vf',
    `fps=${args.gifFps},format=rgb24,scale=w=min(${args.gifWidth}\\,iw):h=-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`,
    '-loop', '0', gif]);
  console.log(`gif: ${gif} (${mb(gif)})`);
}

if (args.gifOnly) {
  const ff = findFfmpeg(args.ffmpeg);
  if (!ff || !ff.full) die('--gif-only needs a full ffmpeg (install it, or pip install imageio-ffmpeg, or pass --ffmpeg <path>)');
  const video = ['blueprint.mp4', 'blueprint.webm'].map(f => join(out, f)).find(existsSync);
  if (!video) die(`no ${join(out, 'blueprint.mp4')} to make the GIF from: render the video first`);
  await makeGif(ff, video);
  process.exit(0);
}

const browser = await launch();
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
      const c = await comparePngs(helper, shot, src, { ignoreCorner: 24, crop: meta.view });
      const ok = !c.error && c.ratio <= +args.maxDiff;
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
      const cols = Math.max(...meta.keyframes.map(k => k.frames.length));
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
      await helper.setViewportSize({ width: cols * (cw + 12) + 12, height: 400 });
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
        const even = ['-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2'];
        const pipe = codec => ['-f', 'image2pipe', '-framerate', String(fps), '-c:v', codec, '-i', 'pipe:0'];
        let file, enc, jpeg = false;
        if (ff.full && ff.h264) {
          file = 'blueprint.mp4';
          enc = [...pipe('png'), ...even, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
        } else if (ff.full && (ff.vp9 || ff.vp8)) {
          file = 'blueprint.webm';
          enc = [...pipe('png'), ...even, '-c:v', ff.vp9 ? 'libvpx-vp9' : 'libvpx', '-b:v', '0', '-crf', '24', '-pix_fmt', 'yuv420p'];
          console.log('note: this ffmpeg has no H.264 encoder (libx264), so the video is WebM');
        } else if (ff.full) {
          file = 'blueprint.mp4';
          enc = [...pipe('png'), ...even, '-c:v', 'mpeg4', '-q:v', '2', '-pix_fmt', 'yuv420p'];
          console.log('warning: this ffmpeg has no H.264 or VP8/VP9 encoder; the MPEG-4 video may not play in browsers or on GitHub');
        } else {
          file = 'blueprint.webm';
          jpeg = true;
          enc = [...pipe('mjpeg'), ...even, '-c:v', 'libvpx', '-b:v', '8M', '-crf', '6', '-qmin', '0', '-qmax', '40', '-deadline', 'good', '-cpu-used', '4', '-pix_fmt', 'yuv420p'];
          console.log('note: only Playwright\'s ffmpeg found, so the video is WebM (VP8) and there is no GIF');
        }
        file = join(out, file);
        const t0 = Date.now();
        await run(ff.bin, ['-y', '-loglevel', 'error', ...enc, file], async write => {
          for (let f = 0; f <= N; f++) {
            await seek(f / fps);
            await write(await page.screenshot(jpeg ? { type: 'jpeg', quality: 92 } : { type: 'png' }));
            if (f % Math.max(1, Math.round(N / 10)) === 0) {
              if (process.stdout.isTTY) process.stdout.write(`\r  frames ${f}/${N}`);
              else console.log(`  frames ${f}/${N}`);
            }
          }
        });
        checkErrors();
        console.log(`${process.stdout.isTTY ? '\r' : ''}video: ${file} (${N + 1} frames at ${fps} fps, ${mb(file)}, ${((Date.now() - t0) / 1000).toFixed(0)} s)`);
        if (args.gif && ff.full) await makeGif(ff, file);
      }
    }
  }
} finally {
  await browser.close();
}
if (failed) die(`${failed} rest frame(s) do not match their state screenshots (see ${join(out, 'qa.txt')})`);
