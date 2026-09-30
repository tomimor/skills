#!/usr/bin/env node
// Bundle a scene into one self-contained player.html: the captured states
// (screenshots + geometry) inlined, plus the kit, the scene and the engine.
//
//   node build.mjs <workdir> [--scene <workdir>/scene.js] [--out <workdir>/player.html]
//   <workdir>/states/ holds s0.png + s0.json, s1.png + s1.json, ... from capture.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { die, parseArgs, SKILL_DIR } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), { scene: '', out: '' });
if (!args._[0]) die('usage: build.mjs <workdir> [--scene file] [--out file]');
const work = resolve(args._[0]);
const statesDir = join(work, 'states');
if (!existsSync(statesDir)) die(`${statesDir} not found (capture.mjs --out ${statesDir}/s0 ...)`);

const ids = readdirSync(statesDir).map(f => /^s(\d+)\.png$/.exec(f)).filter(Boolean).map(m => +m[1]).sort((x, y) => x - y);
if (!ids.length) die(`no states in ${statesDir} (expected s0.png + s0.json, s1.png + s1.json, ...)`);
ids.forEach((id, i) => { if (id !== i) die(`states must be numbered s0..sN without gaps; s${i} is missing`); });

const states = ids.map(i => {
  const png = readFileSync(join(statesDir, `s${i}.png`));
  const jsonPath = join(statesDir, `s${i}.json`);
  if (!existsSync(jsonPath)) die(`${jsonPath} is missing (capture.mjs writes the .png and the .json together)`);
  const geom = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const pw = png.readUInt32BE(16), ph = png.readUInt32BE(20);
  if (pw !== geom.viewport.w || ph !== geom.viewport.h) die(`s${i}.png is ${pw}x${ph} but was captured for ${geom.viewport.w}x${geom.viewport.h}`);
  return { id: `s${i}`, src: `data:image/png;base64,${png.toString('base64')}`, geom };
});
const vp = states[0].geom.viewport;
for (const s of states) {
  if (s.geom.viewport.w !== vp.w || s.geom.viewport.h !== vp.h) die(`${s.id} is ${s.geom.viewport.w}x${s.geom.viewport.h}, s0 is ${vp.w}x${vp.h}: capture every state at the same viewport`);
}

const scenePath = resolve(args.scene || join(work, 'scene.js'));
if (!existsSync(scenePath)) die(`${scenePath} not found (copy ${join(SKILL_DIR, 'template/scene.js')} and edit it)`);
const script = (file, name) => {
  const code = readFileSync(file, 'utf8');
  if (/<\/script/i.test(code)) die(`${name} contains "</script", which would end the inline script`);
  return `<script>\n${code}\n</script>`;
};
const inline = [
  `<script>window.BP_STATES = ${JSON.stringify(states).replace(/</g, '\\u003c')};</script>`,
  script(join(SKILL_DIR, 'template/kit.js'), 'kit.js'),
  script(scenePath, 'scene.js'),
  script(join(SKILL_DIR, 'template/engine.js'), 'engine.js'),
].join('\n');
const html = readFileSync(join(SKILL_DIR, 'template/player.html'), 'utf8').replace('<!--BP:INLINE-->', () => inline);
const out = resolve(args.out || join(work, 'player.html'));
writeFileSync(out, html);
console.log(`wrote ${out}: ${states.length} states at ${vp.w}x${vp.h}, ${(Buffer.byteLength(html) / 1e6).toFixed(1)} MB`);
