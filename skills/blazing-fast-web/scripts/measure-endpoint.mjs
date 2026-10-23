#!/usr/bin/env node
// Latency and payload of one HTTP endpoint. Start the server yourself first;
// the first request is reported separately (cold caches) from the rest.
//
//   node measure-endpoint.mjs <url> [--runs 10] [--header "Name: value"] [--out results.json]
//
// Prints JSON: firstMs, p50Ms, p95Ms, status, wireBytes (as sent, compressed),
// bodyBytes (decoded), content-encoding, cache-control, etag, and whether a
// conditional request with the ETag returns 304.
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import fs from 'node:fs';

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a));
if (!url) { console.error('usage: measure-endpoint.mjs <url> [options]'); process.exit(2); }
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const runs = Number(opt('runs', 10));
const extra = {};
args.forEach((a, i) => { if (a === '--header') { const [k, ...v] = args[i + 1].split(':'); extra[k.trim()] = v.join(':').trim(); } });
const lib = url.startsWith('https') ? https : http;

function get(headers = {}) {
  return new Promise((resolve, reject) => {
    const t = performance.now();
    lib.get(url, { headers: { 'accept-encoding': 'br, gzip, deflate', ...extra, ...headers } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ ms: performance.now() - t, res, wire: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}
const decode = (enc, b) => (enc === 'br' ? zlib.brotliDecompressSync(b) : enc === 'gzip' ? zlib.gunzipSync(b) : enc === 'deflate' ? zlib.inflateSync(b) : b);
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };

const first = await get();
const times = [];
let last = first;
for (let i = 0; i < runs; i++) { last = await get(); times.push(last.ms); }
const h = last.res.headers;
const out = {
  url, status: last.res.statusCode,
  firstMs: Math.round(first.ms), p50Ms: Math.round(pct(times, 50)), p95Ms: Math.round(pct(times, 95)),
  wireBytes: last.wire.length, bodyBytes: decode(h['content-encoding'], last.wire).length,
  contentEncoding: h['content-encoding'] || null, cacheControl: h['cache-control'] || null, etag: h.etag || null,
};
if (h.etag) out.conditional304 = (await get({ 'if-none-match': h.etag })).res.statusCode === 304;
const f = opt('out', null);
if (f) fs.writeFileSync(f, JSON.stringify({ ...out, samplesMs: times }, null, 2));
console.log(JSON.stringify(out));
