/* Player runtime for pr-blueprint-animation: mounts the stage, drives the
 * timeline and exposes window.BP for render.mjs:
 *   BP.ready      promise, resolves once the state screenshots are decoded
 *   BP.seek(t)    draws time t (seconds) and resolves after it is painted
 *   BP.meta()     canvas/app rects, duration, keyframes and rest frames
 * URL params: ?render=1 (bare 1:1 stage, no controls), ?t=12.5, ?autoplay=0
 */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const RENDER = params.has('render');
  const root = document.getElementById('bp-root');
  if (RENDER) document.body.classList.add('render');

  function fail(err) {
    console.error(err);
    window.BP = Object.assign(window.BP || {}, { error: String((err && err.message) || err), isReady: true });
    root.innerHTML = `<pre class="bp-error">${String((err && err.stack) || err).replace(/[<&]/g, c => (c === '<' ? '&lt;' : '&amp;'))}</pre>`;
  }

  let R;
  try { R = window.BPKit.makeRenderer(window.SCENE, window.BP_STATES); } catch (e) { fail(e); return; }
  const { W, H, canvas: C, app: A, view: V, bandBox: BB } = R;
  document.title = (window.SCENE && window.SCENE.title) || 'Blueprint animation';

  // The card shows the view (a part of the captured screen, or all of it) 1:1.
  root.innerHTML = `<div id="bp-wrap"><div id="bp-stage" style="width:${C.w}px;height:${C.h}px">`
    + `<div id="bp-app" style="left:${A.x}px;top:${A.y}px;width:${A.w}px;height:${A.h}px">`
    + `<div id="bp-card"><svg id="bp-svg" width="${A.w}" height="${A.h}" viewBox="${V.x} ${V.y} ${V.w} ${V.h}"></svg></div></div>`
    + `<div id="bp-band" style="left:${BB.x}px;top:${BB.y}px;width:${BB.w}px"></div></div></div>`
    + (RENDER ? '' : '<div id="bp-bar"><button id="bp-play" type="button" aria-label="Play">▶</button>'
      + '<span id="bp-time"></span><input id="bp-seek" type="range" min="0" step="0.01" aria-label="Playhead"><div id="bp-steps"></div></div>');

  const $ = s => root.querySelector(s);
  const wrap = $('#bp-wrap'), stage = $('#bp-stage'), appEl = $('#bp-app'), card = $('#bp-card'), svg = $('#bp-svg'), bandEl = $('#bp-band');
  const imgs = window.BP_STATES.map(s => {
    const im = new Image(W, H);
    im.alt = '';
    im.className = 'bp-state';
    im.style.left = `${-V.x}px`;
    im.style.top = `${-V.y}px`;
    im.style.visibility = 'hidden';
    im.src = s.src;
    card.insertBefore(im, svg);
    return im;
  });

  let T = 0, playing = false, raf = 0, lastTs = 0, lastSave = 0, ui = null;
  const storeKey = `bp-playhead:${document.title}`;
  const save = () => { try { localStorage.setItem(storeKey, String(T)); } catch (e) { /* storage blocked */ } };

  function apply(fr) {
    for (let i = 0; i < imgs.length; i++) {
      const v = i === fr.state ? 'visible' : 'hidden';
      if (imgs[i].style.visibility !== v) imgs[i].style.visibility = v;
    }
    appEl.style.opacity = String(fr.appOpacity);
    if (svg._last !== fr.svg) { svg.innerHTML = fr.svg; svg._last = fr.svg; }
    if (bandEl._last !== fr.band) { bandEl.innerHTML = fr.band; bandEl._last = fr.band; }
  }

  function draw(t) {
    T = Math.max(0, Math.min(R.total, t));
    try { apply(R.frame(T)); } catch (e) { playing = false; fail(e); return; }
    if (ui) ui.update();
  }

  function tick(ts) {
    if (!playing) return;
    const dt = lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0;
    lastTs = ts;
    draw(T + dt >= R.total ? 0 : T + dt);
    if (ts - lastSave > 500) { lastSave = ts; save(); }
    raf = requestAnimationFrame(tick);
  }
  function play() { if (playing) return; playing = true; lastTs = 0; raf = requestAnimationFrame(tick); if (ui) ui.update(); }
  function pause() { playing = false; cancelAnimationFrame(raf); save(); if (ui) ui.update(); }
  function seek(t) { draw(t); return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res))); }

  function meta() {
    return {
      title: document.title, total: R.total, K: R.K, W, H, canvas: C, app: A, view: V, explain: R.explain,
      cues: R.CUES, states: imgs.length, keyframes: R.keyframes(), rest: R.rest(),
      steps: R.steps.map(s => ({ key: s.key, n: s.n, name: s.name })),
    };
  }

  function fit() {
    if (RENDER) return;
    const s = Math.min(1, (window.innerWidth - 32) / C.w, (window.innerHeight - 96) / C.h);
    stage.style.transform = `scale(${s})`;
    wrap.style.width = `${C.w * s}px`;
    wrap.style.height = `${C.h * s}px`;
  }

  if (!RENDER) {
    const btn = $('#bp-play'), time = $('#bp-time'), range = $('#bp-seek'), chips = $('#bp-steps');
    range.max = String(R.total);
    chips.innerHTML = R.steps.map(s => `<button type="button" data-t="${R.CUES[s.key]}" title="${String(s.name || s.key).replace(/"/g, '&quot;')}">${s.n}</button>`).join('');
    ui = {
      update() {
        btn.textContent = playing ? '❚❚' : '▶';
        btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        time.textContent = `${T.toFixed(1)} / ${R.total.toFixed(1)} s`;
        range.value = String(T);
      },
    };
    btn.addEventListener('click', () => (playing ? pause() : play()));
    stage.addEventListener('click', () => (playing ? pause() : play()));
    range.addEventListener('input', () => { pause(); draw(+range.value); });
    chips.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { pause(); draw(+b.dataset.t); } });
    window.addEventListener('keydown', e => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === ' ') { e.preventDefault(); if (playing) pause(); else play(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { pause(); draw(T + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 5 : 1)); }
      else if (e.key === 'Home') { pause(); draw(0); }
      else if (e.key === 'End') { pause(); draw(R.total); }
    });
    window.addEventListener('resize', fit);
    fit();
  }

  const ready = Promise.all(imgs.map(im => (im.decode ? im.decode() : Promise.resolve()).catch(() => {})));
  window.BP = { ready, isReady: false, error: null, seek, meta, play, pause, stateSrc: i => window.BP_STATES[i].src };
  ready.then(() => {
    let t0 = parseFloat(params.get('t'));
    if (isNaN(t0)) {
      t0 = 0;
      if (!RENDER) { try { t0 = parseFloat(localStorage.getItem(storeKey)) || 0; } catch (e) { /* storage blocked */ } }
    }
    draw(t0);
    window.BP.isReady = true;
    if (!RENDER && params.get('autoplay') !== '0' && !window.BP.error) play();
  });
})();
