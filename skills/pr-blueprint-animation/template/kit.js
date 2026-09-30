/* Blueprint kit for pr-blueprint-animation: phase timing, SVG drawing
 * primitives, geometry matching between captured states, and the frame
 * renderer the player runs. Plain browser JS; build.mjs inlines it.
 *
 * Adapted from example-scene.jsx in "Blueprint Before/After" by Oğuz
 * (@moguzbulbul), https://github.com/moguzbulbul/blueprint-animation,
 * licensed under CC BY-NC 4.0. Changes: React/JSX ported to SVG strings; the
 * real UI is shown as captured screenshots of each state instead of rebuilt
 * components; wires come from captured DOM geometry; construct motion is
 * derived by matching elements between consecutive states.
 */
(function (G) {
  'use strict';

  const BP = { bg: '#FFFFFF', line: '#0B8FC2', fill: '#2ACCFF14', accent: '#FFB547', ink: '#1F2328', mute: '#57606A' };
  const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
  const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Liberation Sans', sans-serif";

  const Easing = {
    linear: x => x,
    easeOutCubic: x => 1 - Math.pow(1 - x, 3),
    easeInOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    easeInOutQuad: x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  };
  const M = { enter: Easing.easeOutCubic, move: Easing.easeInOutCubic, draw: Easing.easeInOutQuad };
  const cl = v => Math.max(0, Math.min(1, v));
  const tw = (t, a, b, ease) => (ease || M.move)(cl((t - a) / (b - a)));
  const lerp = (a, b, p) => a + (b - a) * p;
  const LR = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });
  const n = v => +(+v).toFixed(2);

  // Local step time t = authored seconds / K. All choreography reads from these.
  function phases(T, start, dur, c1, K) {
    const t = (T - start) / K;
    return {
      t,
      focus: tw(t, 0, 0.4, M.enter) * (1 - tw(t, dur - 0.6, dur, M.enter)),
      hl: tw(t, 0.1, 0.7, M.draw),
      call: tw(t, 0.2, 0.6, M.enter) * (1 - tw(t, dur - 0.5, dur - 0.1, M.enter)),
      bp: tw(t, 0.9, 0.95, M.enter) * (1 - tw(t, c1 + 0.85, c1 + 0.9, M.enter)),
      wipe: tw(t, 0.95, 1.75, M.move),
      rev: tw(t, c1 + 0.05, c1 + 0.85, M.move),
      cdim: tw(t, 1.75, 2.2, M.move) * (1 - tw(t, c1 - 0.4, c1 - 0.05, M.move)),
      lines: tw(t, 1.2, 2.0, M.draw),
      p: tw(t, 1.9, c1, M.move),
      before: 1 - tw(t, 1.75, 1.8, M.enter),
      after: tw(t, c1 - 0.05, c1, M.enter),
      fix: tw(t, c1 + 0.45, c1 + 1.05, M.enter),
    };
  }

  // ---------- SVG primitives (app coordinates) ----------
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function el(tag, a, inner) {
    let s = '<' + tag;
    for (const k in a) {
      const v = a[k];
      if (v == null || v === false) continue;
      s += ` ${k}="${typeof v === 'number' ? n(v) : esc(v)}"`;
    }
    return inner == null ? s + '/>' : `${s}>${inner}</${tag}>`;
  }

  // Blueprint text is not the app's font: squeeze it when it would overflow.
  const fitFor = (txt, fs, max) => (max > 4 && txt.length * fs * 0.56 > max ? max : null);

  function textAt(x, cy, txt, o) {
    const fs = o.fs || 12, big = fs >= 22;
    const a = {
      x, y: cy + fs * 0.35, 'font-family': SANS, 'font-size': fs, 'font-weight': o.fw || 500,
      fill: big ? 'none' : BP.line, stroke: big ? BP.line : null, 'stroke-width': big ? 0.9 : null,
      'text-anchor': o.anchor || null,
    };
    if (o.fit) { a.textLength = o.fit; a.lengthAdjust = 'spacingAndGlyphs'; }
    return el('text', a, esc(txt));
  }

  function handles(r) {
    let s = '';
    for (const [x, y] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) {
      s += el('rect', { x: x - 2.5, y: y - 2.5, width: 5, height: 5, fill: '#FFFFFF', stroke: BP.line, 'stroke-width': 1 });
    }
    return s;
  }

  // A wire: the element's exact rect, its real text, optional handles. `q` is
  // the move progress: text hides while the wire moves (0.15 < q < 0.85).
  function wire(r, o = {}) {
    const op = o.op == null ? 1 : o.op;
    if (!r || r.w < 0.5 || r.h < 0.5 || op < 0.01) return '';
    const rx = o.round ? r.h / 2 : Math.max(0, Math.min(o.rx == null ? 3 : o.rx, r.h / 2, r.w / 2));
    let s = el('rect', {
      x: r.x, y: r.y, width: r.w, height: r.h, rx,
      fill: o.dashed || o.hollow ? 'none' : BP.fill, stroke: BP.line, 'stroke-width': 1, 'stroke-dasharray': o.dashed ? '5 4' : null,
    });
    if (o.icon === 'circle') {
      const d = Math.min(r.w, r.h);
      s += el('circle', { cx: r.x + r.w / 2, cy: r.y + r.h / 2, r: Math.max(1.5, d / 2 - Math.max(3, d * 0.22)), fill: 'none', stroke: BP.line, 'stroke-width': 1 });
    } else if (o.icon === 'cross') {
      s += el('path', { d: `M${n(r.x)} ${n(r.y)}L${n(r.x + r.w)} ${n(r.y + r.h)}M${n(r.x + r.w)} ${n(r.y)}L${n(r.x)} ${n(r.y + r.h)}`, stroke: BP.line, 'stroke-width': 0.6, opacity: 0.6 });
    }
    const tOp = o.q == null ? 1 : cl((Math.abs(o.q - 0.5) - 0.35) / 0.15);
    if (o.text && tOp > 0.01) {
      const fs = o.fs || 12, cy = r.y + r.h / 2;
      let t;
      if (o.align === 'fit') t = textAt(o.tx == null ? r.x : o.tx, cy, o.text, { fs, fw: o.fw, fit: o.tw || r.w });
      else if (o.align === 'left') {
        const p = o.pad == null ? 8 : Math.max(4, o.pad);
        t = textAt(r.x + p, cy, o.text, { fs, fw: o.fw, fit: fitFor(o.text, fs, r.w - p - 4) });
      } else t = textAt(r.x + r.w / 2, cy, o.text, { fs, fw: o.fw, anchor: 'middle', fit: fitFor(o.text, fs, r.w - 8) });
      s += tOp < 0.99 ? `<g opacity="${n(tOp)}">${t}</g>` : t;
    }
    if (o.handles) s += handles(r);
    if (o.label) s += el('text', { x: r.x + 8, y: r.y + r.h / 2 + 4, fill: BP.line, 'font-family': MONO, 'font-size': 11, 'letter-spacing': '0.06em' }, esc(o.label));
    return op < 0.999 ? `<g opacity="${n(op)}">${s}</g>` : s;
  }

  const guide = (x1, y1, x2, y2, op = 1) => (op < 0.01 ? '' : el('line', { x1, y1, x2, y2, stroke: BP.line, 'stroke-width': 1, 'stroke-dasharray': '2 4', opacity: op * 0.7 }));

  function line(d, draw, o = {}) {
    const op = o.op == null ? 1 : o.op;
    if (draw <= 0.001 || op < 0.01) return '';
    return el('path', {
      d, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 - draw, fill: 'none',
      stroke: o.color || BP.line, 'stroke-width': 1.3, opacity: op, 'marker-end': o.arrow && draw > 0.95 ? 'url(#bpArrow)' : null,
    });
  }

  function label(x, y, txt, o = {}) {
    const op = o.op == null ? 1 : o.op;
    if (op < 0.01) return '';
    return el('text', { x, y, fill: o.color || BP.line, 'font-family': MONO, 'font-size': o.size || 12, 'letter-spacing': '0.06em', 'text-anchor': o.anchor || null, opacity: op }, esc(txt));
  }

  function dimH(x1, x2, y, txt, draw, o = {}) {
    const op = o.op == null ? 1 : o.op;
    if (draw <= 0.001 || op < 0.01) return '';
    return `<g opacity="${n(op)}">${line(`M${n(x1)} ${n(y)}H${n(x2)}`, draw)}`
      + el('path', { d: `M${n(x1)} ${n(y - 6)}V${n(y + 6)}M${n(x2)} ${n(y - 6)}V${n(y + 6)}`, stroke: BP.line, 'stroke-width': 1.3, opacity: draw })
      + (txt ? label((x1 + x2) / 2, y - 10, txt, { anchor: 'middle', op: draw }) : '') + '</g>';
  }

  function dimV(y1, y2, x, txt, draw, o = {}) {
    const op = o.op == null ? 1 : o.op;
    if (draw <= 0.001 || op < 0.01) return '';
    const left = o.side === 'left';
    return `<g opacity="${n(op)}">${line(`M${n(x)} ${n(y1)}V${n(y2)}`, draw)}`
      + el('path', { d: `M${n(x - 6)} ${n(y1)}H${n(x + 6)}M${n(x - 6)} ${n(y2)}H${n(x + 6)}`, stroke: BP.line, 'stroke-width': 1.3, opacity: draw })
      + (txt ? label(left ? x - 10 : x + 10, (y1 + y2) / 2 + 4, txt, { anchor: left ? 'end' : null, op: draw }) : '') + '</g>';
  }

  function num(x, y, k, op = 1) {
    if (op < 0.01) return '';
    return `<g opacity="${n(op)}">${el('circle', { cx: x, cy: y, r: 11, fill: BP.bg, stroke: BP.accent, 'stroke-width': 1.3 })}`
      + `${el('text', { x, y: y + 4, fill: BP.accent, 'font-family': MONO, 'font-size': 11, 'text-anchor': 'middle' }, esc(k))}</g>`;
  }

  // A dashed rect around a group, with its name above it.
  function group(r, txt, op = 1, o = {}) {
    if (!r || op < 0.01) return '';
    return `<g opacity="${n(op)}">${el('rect', { x: r.x, y: r.y, width: r.w, height: r.h, rx: o.rx == null ? 8 : o.rx, fill: 'none', stroke: BP.line, 'stroke-width': 1, 'stroke-dasharray': '5 4' })}`
      + (txt ? label(r.x, r.y - 8, txt) : '') + '</g>';
  }

  const curve = (a, b) => `M${n(a.x)} ${n(a.y)}C${n(a.x)} ${n((a.y + b.y) / 2)} ${n(b.x)} ${n((a.y + b.y) / 2)} ${n(b.x)} ${n(b.y)}`;
  const ctr = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const pad = (r, px, py = px) => ({ x: r.x - px, y: r.y - py, w: r.w + 2 * px, h: r.h + 2 * py });
  function union(list) {
    const L = (list || []).filter(Boolean);
    if (!L.length) return null;
    const x = Math.min(...L.map(r => r.x)), y = Math.min(...L.map(r => r.y));
    return { x, y, w: Math.max(...L.map(r => r.x + r.w)) - x, h: Math.max(...L.map(r => r.y + r.h)) - y };
  }
  const clampRect = (r, W, H) => {
    const x = Math.max(0, r.x), y = Math.max(0, r.y);
    return { x, y, w: Math.min(W, r.x + r.w) - x, h: Math.min(H, r.y + r.h) - y };
  };
  const inside = (e, F, m = 6) => {
    const c = ctr(e);
    return c.x >= F.x - m && c.x <= F.x + F.w + m && c.y >= F.y - m && c.y <= F.y + F.h + m;
  };

  // ---------- captured geometry -> wires ----------
  const Z = { box: 0, rule: 1, img: 2, ctl: 3, text: 4 };
  const area = e => e.w * e.h;
  const drawOrder = (a, b) => (Z[a.t] - Z[b.t]) || (a.t === 'box' ? area(b) - area(a) : 0);
  const roundish = e => e.r >= Math.min(e.w, e.h) / 2 - 0.5;
  const ctlFs = v => Math.max(9, Math.min(18, (v || 13) * 0.95));

  // One captured element as a wire. o.r overrides the rect (for motion).
  function drawEl(e, o = {}) {
    const r = o.r || e;
    const op = o.op == null ? 1 : o.op;
    if (op < 0.01) return '';
    const txt = o.text != null ? o.text : e.txt;
    switch (e.t) {
      case 'rule':
        return el('line', { x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y + r.h, stroke: BP.line, 'stroke-width': 1, opacity: op * 0.8 });
      case 'box':
        return wire(r, { op, handles: o.handles, rx: e.r, round: roundish(e) });
      case 'img':
        return wire(r, { op, handles: o.handles, rx: e.r, icon: Math.max(e.w, e.h) <= 40 ? 'circle' : 'cross' });
      case 'ctl':
        return wire(r, {
          op, q: o.q, handles: o.handles, rx: e.r, round: roundish(e), text: txt || null,
          align: e.al === 'l' ? 'left' : 'center', pad: e.pl, fs: ctlFs(e.fs), fw: 500, icon: txt ? null : 'circle',
        });
      case 'text':
        return wire(pad(r, 3, 1.5), { op, q: o.q, handles: o.handles, rx: 2, text: txt, align: 'fit', tx: r.x, tw: r.w, fs: e.fs, fw: e.fw >= 600 ? 600 : 500 });
      default:
        return '';
    }
  }

  const overlap = (p, q) => {
    const w = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), h = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
    const i = Math.max(0, w) * Math.max(0, h);
    return i / (p.w * p.h + q.w * q.h - i || 1);
  };

  // Match elements of two states: unchanged, restyled (same box, new colours
  // or weight), moved (push = translated only), removed, added. Keys first;
  // then leftovers of one kind that sit in the same place (a container whose
  // text-derived key changed, a label whose text changed) are paired too.
  function diffStates(A, B) {
    const D = { same: [], restyled: [], moved: [], removed: [], added: [] };
    const pair = (a, b) => {
      const dPos = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
      const dSize = Math.max(Math.abs(a.w - b.w), Math.abs(a.h - b.h));
      const look = (a.txt || '') === (b.txt || '') && Math.abs((a.r || 0) - (b.r || 0)) < 1;
      if (dPos <= 0.5 && dSize <= 0.5 && look) {
        const style = a.bg === b.bg && a.bc === b.bc && a.c === b.c && a.fw === b.fw && a.sh === b.sh;
        (style ? D.same : D.restyled).push(b);
      } else D.moved.push({ a, b, push: dSize <= 1 && look });
    };
    const byKey = new Map(B.els.map(e => [e.k, e]));
    const used = new Set();
    let left = [];
    for (const a of A.els) {
      const b = byKey.get(a.k);
      if (!b || b.t !== a.t || used.has(b)) { left.push(a); continue; }
      used.add(b);
      pair(a, b);
    }
    let fresh = B.els.filter(b => !used.has(b));
    const cands = [];
    for (const a of left) {
      if (a.t === 'rule') continue;
      for (const b of fresh) if (b.t === a.t) { const s = overlap(a, b); if (s >= 0.6) cands.push([s, a, b]); }
    }
    cands.sort((p, q) => q[0] - p[0]);
    const takenA = new Set(), takenB = new Set();
    for (const [, a, b] of cands) {
      if (takenA.has(a) || takenB.has(b)) continue;
      takenA.add(a); takenB.add(b);
      pair(a, b);
    }
    D.removed = left.filter(a => !takenA.has(a));
    D.added = fresh.filter(b => !takenB.has(b));
    return D;
  }

  // Lookups for marks: find('Invite member'), find('ctl:Export CSV'), within(rect).
  function geo(state) {
    const els = state.els;
    const hit = (q, e) => (typeof q === 'function' ? q(e) : e.k === q || (e.txt || '').toLowerCase() === String(q).toLowerCase());
    const all = (q, kind) => {
      const ok = e => !kind || e.t === kind;
      let r = els.filter(e => ok(e) && hit(q, e));
      if (!r.length && typeof q === 'string') {
        const s = q.toLowerCase();
        r = els.filter(e => ok(e) && ((e.txt || '').toLowerCase().includes(s) || e.k.toLowerCase().includes(s)));
      }
      return r;
    };
    return {
      els, W: state.viewport.w, H: state.viewport.h, all,
      find: (q, kind) => all(q, kind)[0] || null,
      get(q, kind) {
        const e = all(q, kind)[0];
        if (!e) throw new Error(`no captured element matches ${JSON.stringify(q)}${kind ? ` (${kind})` : ''}`);
        return e;
      },
      within: (r, kind) => els.filter(e => (!kind || e.t === kind) && inside(e, r, 0)),
    };
  }

  // Spread start times over groups (rows) so the last one ends by e0.
  function stagger(list, key, s0, e0, dur, gMax) {
    if (!list.length) return;
    const keys = [...new Set(list.map(key))].sort((a, b) => a - b);
    const span = Math.max(0.3, e0 - s0);
    const g = keys.length > 1 ? Math.min(gMax, Math.max(0, (span - dur) / (keys.length - 1))) : 0;
    const d = Math.max(0.25, Math.min(dur, span - g * (keys.length - 1)));
    for (const it of list) { it.s = s0 + keys.indexOf(key(it)) * g; it.d = d; }
  }
  const rowOf = e => Math.round((e.y + e.h / 2) / 14);

  // Redesign step: state A -> state B. Unchanged elements are a cached static
  // layer; everything else moves: pushes first, then removals (collapse in
  // place, or fly into st.into), changes, and arrivals, staggered by row.
  function planRedesign(st, A, B) {
    const W = A.viewport.w, H = A.viewport.h;
    const Ag = geo(A), Bg = geo(B);
    const D = diffStates(A, B);
    const core = [...D.moved.filter(m => !m.push).flatMap(m => [m.a, m.b]), ...D.removed, ...D.added, ...D.restyled].filter(e => e.t !== 'rule');
    const auto = union(core.length ? core : D.moved.flatMap(m => [m.a, m.b]));
    const F = st.focus || clampRect(pad(auto || { x: 0, y: 0, w: W, h: H }, 16), W, H);
    const inF = e => inside(e, F);

    // st.into: removed wires in focus fly into a new element ('nearest' added
    // one, or a key) instead of collapsing in place.
    const flyKinds = { ctl: 1, img: 1, box: 1 };
    const addedF = D.added.filter(e => inF(e) && flyKinds[e.t]);
    const target = a => {
      if (!st.into || !flyKinds[a.t] || !inF(a)) return null;
      let best = null;
      if (st.into !== 'nearest') best = Bg.find(st.into);
      else {
        let bd = Infinity;
        for (const b of addedF) {
          const d = Math.hypot(ctr(b).x - ctr(a).x, ctr(b).y - ctr(a).y);
          if (d < bd) { bd = d; best = b; }
        }
      }
      return best && area(a) <= 16 * Math.max(1, area(best)) ? best : null;
    };

    const pushes = D.moved.filter(m => m.push).map(m => ({ kind: 'move', a: m.a, b: m.b }));
    const moves = D.moved.filter(m => !m.push).map(m => ({ kind: 'move', a: m.a, b: m.b }));
    const outs = D.removed.map(a => ({ kind: 'out', a, to: target(a) }));
    const targets = new Set(outs.map(o => o.to).filter(Boolean));
    const early = D.added.filter(b => targets.has(b)).map(b => ({ kind: 'in', b }));
    const ins = D.added.filter(b => !targets.has(b)).map(b => ({ kind: 'in', b }));
    const rest = D.restyled.filter(inF).map(b => ({ kind: 'restyle', b }));
    // Translations are context when the step also adds, removes or reshapes
    // something in focus: they draw dimmed. A step of pure moves keeps them.
    const hasCore = [...moves, ...outs, ...early, ...ins, ...rest].some(it => inF(it.b || it.a));
    for (const it of pushes) it.context = hasCore;

    const Ts = 1.9, Te = st.c1 - 0.1;
    stagger(pushes, () => 0, Ts, Te, 0.6, 0);
    const outS = Ts + (early.length ? 0.3 : 0.05);
    stagger(outs, it => rowOf(it.a), outS, Math.min(Te, outS + 1.1), 0.55, 0.06);
    // Each target appears once the wires flying into it have left and hidden
    // their labels, so it never sits on their text.
    for (const it of early) {
      it.s = Math.min(...outs.filter(o => o.to === it.b).map(o => o.s)) + 0.12;
      it.d = 0.4;
    }
    stagger(moves, it => rowOf(it.b), Ts + (pushes.length ? 0.45 : 0.1), Te, 0.7, 0.1);
    stagger(ins, it => rowOf(it.b), Ts + (pushes.length ? 0.65 : 0.25) + (outs.length ? 0.2 : 0), Te, 0.55, 0.08);
    for (const it of rest) { it.s = Ts; it.d = 0.01; }

    let hset;
    if (st.handles) hset = new Set(st.handles.flatMap(q => [...Bg.all(q), ...Ag.all(q)]));
    else {
      const pick = [...targets, ...rest.map(r => r.b)];
      if (!pick.length) {
        const cand = [...moves.map(m => m.b), ...ins.map(i => i.b)].filter(e => inF(e) && e.t !== 'text' && e.t !== 'rule').sort((p, q) => area(q) - area(p));
        if (cand[0]) pick.push(cand[0]);
      }
      hset = new Set(pick.slice(0, 3));
    }

    const items = [...pushes, ...moves, ...outs, ...early, ...ins, ...rest];
    for (const it of items) {
      const e = it.b || it.a;
      it.e = e;
      it.focus = !it.context && (inF(e) || (it.a ? inF(it.a) : false));
      it.hd = hset.has(e) || (it.a ? hset.has(it.a) : false);
    }
    items.sort((p, q) => drawOrder(p.e, q.e));
    const staticSvg = [...D.same, ...D.restyled.filter(e => !inF(e))].sort(drawOrder).map(e => drawEl(e)).join('');

    function draw(t, wantFocus) {
      let s = '';
      for (const it of items) {
        if (it.focus !== wantFocus) continue;
        const q = tw(t, it.s, it.s + it.d);
        if (it.kind === 'move') {
          s += drawEl(it.b, { r: LR(it.a, it.b, q), q, text: q < 0.5 ? it.a.txt : it.b.txt, handles: it.hd });
        } else if (it.kind === 'out') {
          if (q >= 1) continue;
          const a = it.a;
          // Leaving wires hide their text for good; it never fades back in.
          const qt = Math.min(q, 0.5);
          if (it.to) {
            const c = ctr(it.to);
            s += drawEl(a, { r: LR(a, { x: c.x, y: c.y, w: 0, h: 0 }, q), q: qt, op: 1 - q * 0.7 });
          } else {
            s += drawEl(a, { r: a.t === 'rule' ? a : { x: a.x, y: a.y + (a.h / 2) * q, w: a.w, h: a.h * (1 - q) }, q: qt, op: 1 - q });
          }
        } else if (it.kind === 'in') {
          if (q <= 0) continue;
          const b = it.b, grow = !!flyKinds[b.t];
          // Arriving wires show their text only once settled.
          s += drawEl(b, { r: grow ? { x: b.x, y: b.y, w: b.w * q, h: b.h } : b, q: Math.max(q, 0.5), op: tw(t, it.s, it.s + Math.min(it.d, 0.4)), handles: it.hd && q > 0.5 });
        } else {
          s += drawEl(it.b, { handles: it.hd });
        }
      }
      return s;
    }
    return { F, A: Ag, B: Bg, D, staticSvg, animOut: t => draw(t, false), animIn: t => draw(t, true) };
  }

  // Explain step: one state; the module's wires never move, marks draw the why.
  function planExplain(st, S) {
    const Sg = geo(S);
    const F = st.focus;
    if (!F) throw new Error(`step "${st.key}": Explain mode needs a focus rect`);
    const inF = e => inside(e, F);
    const hset = new Set((st.handles || []).flatMap(q => Sg.all(q)));
    const staticSvg = S.els.filter(e => !inF(e)).sort(drawOrder).map(e => drawEl(e)).join('');
    const focusSvg = S.els.filter(inF).sort(drawOrder).map(e => drawEl(e, { handles: hset.has(e) })).join('');
    return { F, A: Sg, B: Sg, staticSvg, animOut: () => '', animIn: () => focusSvg };
  }

  // ---------- the piece ----------
  function makeRenderer(SCENE, STATES) {
    if (!SCENE || !Array.isArray(SCENE.steps) || !SCENE.steps.length) throw new Error('SCENE.steps is empty');
    if (!STATES || !STATES.length) throw new Error('no states: capture at least s0');
    const K = SCENE.K || 1.4;
    const W = STATES[0].geom.viewport.w, H = STATES[0].geom.viewport.h;
    const explain = SCENE.mode === 'explain' || STATES.length === 1;
    if (!explain && STATES.length !== SCENE.steps.length + 1) {
      throw new Error(`${SCENE.steps.length} steps need ${SCENE.steps.length + 1} states (s0..s${SCENE.steps.length}), found ${STATES.length}`);
    }
    const steps = SCENE.steps.map((st, i) => ({ dur: 5, c1: 3.2, ...st, key: st.key || `step${i + 1}`, n: st.n || String(i + 1).padStart(2, '0') }));
    const scenes = [
      { name: 'Before', dur: SCENE.holdBefore == null ? 1.5 : SCENE.holdBefore },
      ...steps.map(st => ({ name: st.key, dur: st.dur * K })),
      { name: 'After', dur: SCENE.holdAfter == null ? 5 : SCENE.holdAfter },
    ];
    const CUES = {};
    let total = 0;
    for (const sc of scenes) {
      if (sc.name in CUES) throw new Error(`duplicate step key "${sc.name}"`);
      CUES[sc.name] = total;
      total += sc.dur;
    }
    const geoms = STATES.map(s => s.geom);
    const plans = [];
    const plan = i => plans[i] || (plans[i] = explain ? planExplain(steps[i], geoms[0]) : planRedesign(steps[i], geoms[i], geoms[i + 1]));

    const wide = W >= 1000;
    const AX = 80, AY = 100, bandH = wide ? 100 : 230;
    const canvas = { w: W + 2 * AX, h: AY + H + 40 + bandH + 60 };
    const app = { x: AX, y: AY, w: W, h: H };

    const defs = (top, bot) => `<defs><clipPath id="bpClip">${el('rect', { x: -20, y: top, width: W + 40, height: Math.max(0, bot - top) })}</clipPath>`
      + '<linearGradient id="bpScan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2ACCFF" stop-opacity="0"/><stop offset="1" stop-color="#2ACCFF" stop-opacity="0.16"/></linearGradient>'
      + `<marker id="bpArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${BP.line}"/></marker></defs>`;

    const scan = y => `<g opacity="${n(Math.sin(Math.PI * cl(y / H)))}">${el('rect', { x: 0, y: y - 40, width: W, height: 40, fill: 'url(#bpScan)' })}${el('line', { x1: 0, y1: y, x2: W, y2: y, stroke: BP.line, 'stroke-width': 1.5 })}</g>`;

    function focus(ph, st, P) {
      const { x, y, w, h } = P.F;
      let s = el('path', { d: `M0 0H${W}V${H}H0Z M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${n(-w)}Z`, 'fill-rule': 'evenodd', fill: '#FFFFFF', opacity: 0.78 * ph.focus * (1 - ph.wipe) });
      s += el('rect', { x, y, width: w, height: h, rx: 8, fill: 'none', stroke: '#999999', 'stroke-width': 1.2, pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 - ph.hl, opacity: ph.focus * (1 - ph.wipe) });
      const on = ph.wipe * (1 - ph.rev);
      if (on > 0.001) {
        s += el('path', {
          d: `M${n(x)} ${n(y + 14)}V${n(y)}H${n(x + 14)}M${n(x + w - 14)} ${n(y)}H${n(x + w)}V${n(y + 14)}M${n(x + w)} ${n(y + h - 14)}V${n(y + h)}H${n(x + w - 14)}M${n(x + 14)} ${n(y + h)}H${n(x)}V${n(y + h - 14)}`,
          fill: 'none', stroke: BP.line, 'stroke-width': 2, opacity: on,
        });
        let inner = P.animIn(ph.t);
        if (st.marks) inner += st.marks(ph, P.A, P.B, Kit) || '';
        s += `<g opacity="${n(on)}" clip-path="url(#bpClip)">${inner}</g>`;
      }
      return s;
    }

    function band(PH, endFade) {
      for (let i = 0; i < steps.length; i++) {
        const ph = PH[i];
        if (ph.call <= 0.001) continue;
        const st = steps[i];
        const a = st.prob != null ? st.prob : st.what || '', b = st.fix != null ? st.fix : st.why || '';
        const fsz = wide ? 24 : 19, lh = wide ? 32 : 26;
        return `<div style="opacity:${n(ph.call * endFade)};transform:translateY(${n((1 - ph.call) * 12)}px);display:grid;grid-template-columns:${wide ? '240px minmax(0,1fr) minmax(0,1fr)' : '1fr'};gap:${wide ? 32 : 10}px;align-items:start">`
          + `<span style="display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;letter-spacing:.06em;color:${BP.mute};padding-top:4px"><span style="width:28px;height:28px;border-radius:999px;background:${BP.ink};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:none">${esc(st.n)}</span>${esc(String(st.name || st.key).toUpperCase())}</span>`
          + `<span style="font-size:${fsz}px;line-height:${lh}px;color:${BP.ink}">${esc(a)}</span>`
          + `<span style="font-size:${fsz}px;line-height:${lh}px;color:${BP.line};opacity:${n(ph.fix)};transform:translateX(${n((1 - ph.fix) * -8)}px)">${esc(b)}</span></div>`;
      }
      return '';
    }

    function frame(T) {
      const PH = steps.map(st => phases(T, CUES[st.key], st.dur, st.c1, K));
      let bpAll = 0;
      for (const p of PH) bpAll = Math.max(bpAll, p.bp);
      const act = PH.findIndex(p => p.bp > 0.001);
      const wipe = act >= 0 ? PH[act].wipe : 0, rev = act >= 0 ? PH[act].rev : 0;
      const clipTop = rev > 0 ? H * rev : -20, clipBot = wipe >= 1 ? H + 20 : H * wipe;
      const scanY = wipe > 0 && wipe < 1 ? H * wipe : rev > 0 && rev < 1 ? H * rev : -1;
      const endFade = 1 - tw(T, total - 1.1, total - 0.05, M.move);
      const appIn = tw(T, 0, 0.5 * K, M.enter);
      const zoom = lerp(1, 0.96, tw(T, CUES.After + 0.5 * K, CUES.After + 3 * K, M.move));
      // The real UI swaps to the next state only while the blueprint covers it.
      let state = 0;
      if (!explain) PH.forEach((p, i) => { if (p.t >= steps[i].c1 - 0.025) state = i + 1; });

      let svg = defs(clipTop, clipBot);
      if (act >= 0 && bpAll > 0.001) {
        const P = plan(act), ph = PH[act];
        svg += `<g clip-path="url(#bpClip)">${el('rect', { x: 0, y: 0, width: W, height: H, fill: '#FFFFFF', opacity: bpAll })}`
          + `<g opacity="${n(bpAll * lerp(0.7, 0.3, ph.cdim))}">${P.staticSvg}${P.animOut(ph.t)}</g></g>`;
      }
      if (scanY >= 0) svg += scan(scanY);
      PH.forEach((ph, i) => { if (ph.focus > 0.001) svg += focus(ph, steps[i], plan(i)); });
      return { state, appOpacity: n(appIn * endFade), zoom: n(zoom), svg, band: band(PH, endFade) };
    }

    // Frames for the filmstrip: problem, blueprint-in, mid-construct, reveal, hold.
    const keyframes = () => steps.map(st => ({
      key: st.key, n: st.n, name: st.name || st.key,
      frames: [['focus', 0.6], ['blueprint in', 1.35], [explain ? 'annotate' : 'construct', (1.9 + st.c1) / 2], ['reveal', st.c1 + 0.45], ['hold', st.dur - 0.9]]
        .map(([name, t]) => ({ name, T: n(CUES[st.key] + t * K) })),
    }));

    // Frames where a state must show at rest, pixel for pixel.
    const rest = () => [
      { T: n(Math.max(0.5 * K + 0.05, CUES[steps[0].key] - 0.1)), state: 0, why: 'before step 1' },
      ...steps.map((st, i) => ({
        T: n(i + 1 < steps.length ? CUES[steps[i + 1].key] - 0.05 : CUES.After + 0.25),
        state: explain ? 0 : i + 1,
        why: `after step ${i + 1}`,
      })),
    ];

    // Surface scene errors at load: plan every step and run its marks once.
    steps.forEach((st, i) => {
      const P = plan(i);
      if (!st.marks) return;
      try { st.marks(phases(CUES[st.key] + ((1.9 + st.c1) / 2) * K, CUES[st.key], st.dur, st.c1, K), P.A, P.B, Kit); }
      catch (e) { throw new Error(`step "${st.key}" marks: ${e.message}`); }
    });
    return { W, H, K, total, CUES, steps, canvas, app, explain, frame, keyframes, rest, plan };
  }

  const Kit = {
    BP, MONO, SANS, Easing, M, cl, tw, lerp, LR, phases, el, esc, wire, handles, guide, line, label,
    dimH, dimV, num, group, curve, ctr, pad, union, drawEl, diffStates, geo, makeRenderer,
  };
  G.BPKit = Kit;
})(window);
