/*
 * grid_audit_core.js — the single source of truth for grid measurement.
 *
 * Defines window.__gridAudit(opts) -> a JSON-serializable report for ONE viewport.
 * Pure in-page DOM/canvas work, no dependencies. Two consumers:
 *   1. scripts/audit_grid.mjs  — injects this file into a headless browser (CI path).
 *   2. A browser-eval MCP tool  — paste this file, then call __gridAudit({...}) (no install).
 *
 * It MEASURES and REPORTS only. It never judges appropriateness — that is the agent's
 * job, using grid-discipline.md. Mechanical facts in, raw numbers out.
 */
(function () {
  window.__gridAudit = function (opts) {
    opts = opts || {};
    var TOL_EXPLICIT = opts.explicitTolPx != null ? opts.explicitTolPx : 2;
    var TOL_INFERRED = opts.inferredTolPx != null ? opts.inferredTolPx : 6;
    var DISPLAY_MIN = opts.displayMinPx != null ? opts.displayMinPx : 40;
    var MAX_ELEMENTS = 6000;

    var vw = window.innerWidth;
    var scrollY = window.scrollY || 0;
    var all = Array.prototype.slice.call(document.querySelectorAll('body *'), 0, MAX_ELEMENTS);

    // ---------- helpers ----------
    function cs(el) { return getComputedStyle(el); }
    function vis(el) {
      var s = cs(el);
      if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false;
      var r = el.getBoundingClientRect();
      return r.width > 1 && r.height > 1;
    }
    function hasText(el) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var n = el.childNodes[i];
        if (n.nodeType === 3 && n.textContent.trim().length > 1) return true;
      }
      return false;
    }
    function path(el) {
      if (!el || el === document.body) return 'body';
      var sel = el.tagName.toLowerCase();
      if (el.id) return sel + '#' + el.id;
      if (el.className && typeof el.className === 'string') {
        var c = el.className.trim().split(/\s+/).slice(0, 2).join('.');
        if (c) sel += '.' + c;
      }
      var p = el.parentElement;
      if (p) {
        var same = Array.prototype.filter.call(p.children, function (x) { return x.tagName === el.tagName; });
        if (same.length > 1) sel += ':nth-of-type(' + (same.indexOf(el) + 1) + ')';
      }
      return sel;
    }
    function round(n) { return Math.round(n * 100) / 100; }
    function nearest(arr, x) {
      var best = Infinity, bx = null;
      for (var i = 0; i < arr.length; i++) { var d = Math.abs(arr[i] - x); if (d < best) { best = d; bx = arr[i]; } }
      return { d: best, x: bx };
    }
    function parseRGB(s) {
      var m = s && s.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      var p = m[1].split(',').map(function (x) { return parseFloat(x); });
      return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] };
    }
    function isGrey(c) { if (!c) return true; var mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b); return (mx - mn) <= 16; }
    function hue(c) {
      var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 0;
      if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
      return Math.round(h / 15) * 15; // bucket to 15deg
    }

    var visible = all.filter(vis);
    var texts = visible.filter(hasText);

    // ---------- detect explicit CSS-grid containers ----------
    function gridConts() {
      var out = [];
      for (var i = 0; i < visible.length; i++) {
        var el = visible[i], s = cs(el);
        if (s.display.indexOf('grid') === -1) continue;
        var tracks = s.gridTemplateColumns.split(' ').map(parseFloat).filter(function (x) { return !isNaN(x); });
        if (tracks.length < 3) continue;
        var r = el.getBoundingClientRect();
        if (r.width < vw * 0.4) continue;
        out.push({ el: el, s: s, tracks: tracks, r: r, area: r.width * r.height });
      }
      out.sort(function (a, b) { return b.area - a.area; });
      return out;
    }
    function linesOf(g) {
      var padL = parseFloat(g.s.paddingLeft) || 0, bL = parseFloat(g.s.borderLeftWidth) || 0;
      var gap = g.s.columnGap === 'normal' ? 0 : (parseFloat(g.s.columnGap) || 0);
      var x = g.r.left + bL + padL, lines = [];
      for (var i = 0; i < g.tracks.length; i++) { var w = g.tracks[i]; lines.push({ start: x, end: x + w, col: i + 1 }); x = x + w + gap; }
      return lines;
    }

    // ---------- inferred grid via edge clustering ----------
    function cluster(vals, tol) {
      var s = vals.slice().sort(function (a, b) { return a - b; }), out = [];
      for (var i = 0; i < s.length; i++) {
        var last = out[out.length - 1];
        if (last && (s[i] - last.sum / last.n) <= tol) { last.sum += s[i]; last.n++; }
        else out.push({ sum: s[i], n: 1 });
      }
      return out.map(function (o) { return { x: o.sum / o.n, n: o.n }; })
        .filter(function (o) { return o.n >= 2; }).sort(function (a, b) { return b.n - a.n; });
    }
    function contentBlocks() {
      return visible.filter(function (el) {
        var r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 12 || r.width > vw * 0.98) return false;
        var tag = el.tagName.toLowerCase();
        if (!/^(p|h1|h2|h3|h4|img|figure|li|blockquote|section|article|div)$/.test(tag)) return false;
        return hasText(el) || tag === 'img' || tag === 'figure' || el.querySelector('img');
      });
    }

    var gconts = gridConts();
    var mode, gridInfo, columnViolations = [], tested = 0;

    if (gconts.length) {
      mode = 'explicit';
      var main = gconts[0];
      gridInfo = { columns: main.tracks.length, confidence: 'high', source: 'css-grid:' + path(main.el) };
      for (var gi = 0; gi < gconts.length; gi++) {
        var g = gconts[gi], lines = linesOf(g);
        var starts = lines.map(function (l) { return l.start; });
        var ends = lines.map(function (l) { return l.end; });
        var items = Array.prototype.filter.call(g.el.children, function (c) {
          return vis(c) && (hasText(c) || c.querySelector('img') || c.tagName === 'IMG' || c.tagName === 'FIGURE');
        });
        for (var k = 0; k < items.length; k++) {
          var it = items[k], r = it.getBoundingClientRect();
          tested++;
          var nl = nearest(starts, r.left), nr = nearest(ends, r.right);
          if (nl.d > TOL_EXPLICIT) columnViolations.push({ selector: path(it), side: 'left', offsetPx: round(nl.d), actualX: round(r.left), expectedX: round(nl.x) });
          if (nr.d > TOL_EXPLICIT) columnViolations.push({ selector: path(it), side: 'right', offsetPx: round(nr.d), actualX: round(r.right), expectedX: round(nr.x) });
        }
      }
    } else {
      mode = 'inferred';
      var blocks = contentBlocks();
      var lefts = blocks.map(function (b) { return b.getBoundingClientRect().left; });
      var rights = blocks.map(function (b) { return b.getBoundingClientRect().right; });
      var clL = cluster(lefts, TOL_INFERRED), clR = cluster(rights, TOL_INFERRED);
      var startX = clL.map(function (o) { return o.x; }), endX = clR.map(function (o) { return o.x; });
      var aligned = 0;
      for (var b = 0; b < blocks.length; b++) {
        var rr = blocks[b].getBoundingClientRect();
        tested++;
        var L = nearest(startX, rr.left), R = nearest(endX, rr.right);
        var ok = L.d <= TOL_INFERRED && R.d <= TOL_INFERRED;
        if (ok) aligned++;
        else columnViolations.push({ selector: path(blocks[b]), side: L.d > R.d ? 'left' : 'right', offsetPx: round(Math.max(L.d, R.d)), actualX: round(L.d > R.d ? rr.left : rr.right), expectedX: round(L.d > R.d ? L.x : R.x) });
      }
      gridInfo = {
        columns: clL.length, confidence: tested ? (aligned / tested >= 0.8 ? 'medium' : 'low') : 'low',
        source: 'inferred edges', alignedRate: tested ? round(aligned / tested) : 0,
        candidateStarts: startX.slice(0, 12).map(round)
      };
    }

    // ---------- baseline (line-height rhythm) ----------
    var lhCount = {};
    for (var t = 0; t < texts.length; t++) {
      var lh = Math.round(parseFloat(cs(texts[t]).lineHeight));
      if (lh > 0) lhCount[lh] = (lhCount[lh] || 0) + 1;
    }
    var baseline = null, bestCov = 0;
    [8, 6, 4, 12].forEach(function (cand) {
      var cov = 0, tot = 0;
      for (var t = 0; t < texts.length; t++) {
        var lh = Math.round(parseFloat(cs(texts[t]).lineHeight));
        if (lh <= 0) continue; tot++;
        if (lh % cand <= 1) cov++;
      }
      var rate = tot ? cov / tot : 0;
      if (rate > bestCov + 0.001 && rate >= 0.5) { bestCov = rate; baseline = cand; }
    });
    var declaredBl = parseFloat(cs(document.documentElement).getPropertyValue('--bl') || cs(document.documentElement).getPropertyValue('--baseline'));
    if (!isNaN(declaredBl) && declaredBl > 0) baseline = declaredBl;
    var baselineViolations = [];
    if (baseline) {
      for (var t2 = 0; t2 < texts.length; t2++) {
        var s2 = cs(texts[t2]), lh2 = parseFloat(s2.lineHeight);
        if (!(lh2 > 0)) continue;
        if (Math.round(lh2) % baseline > 1 && parseFloat(s2.fontSize) >= 14) {
          baselineViolations.push({ selector: path(texts[t2]), lineHeightPx: round(lh2), baselinePx: baseline });
        }
      }
    }
    var baselineInfo = { unit: baseline, lineHeightMultipleRate: round(bestCov), confidence: bestCov >= 0.7 ? 'high' : bestCov >= 0.5 ? 'medium' : 'low' };

    // ---------- optical ink alignment (display type) ----------
    var cvs = document.createElement('canvas'), ctx = cvs.getContext('2d');
    var opticalViolations = [];
    for (var d = 0; d < texts.length; d++) {
      var el2 = texts[d], s3 = cs(el2);
      if (parseFloat(s3.fontSize) < DISPLAY_MIN) continue;
      if (s3.textAlign !== 'left' && s3.textAlign !== 'start' && s3.textAlign !== '') continue;
      var ch = (el2.textContent || '').trim().charAt(0);
      if (!ch) continue;
      if (s3.textTransform === 'uppercase') ch = ch.toUpperCase();
      ctx.font = s3.fontStyle + ' ' + s3.fontWeight + ' ' + s3.fontSize + ' ' + s3.fontFamily;
      ctx.textAlign = 'left';
      var abl = ctx.measureText(ch).actualBoundingBoxLeft;
      if (isFinite(abl) && Math.abs(abl) > 2) {
        opticalViolations.push({ selector: path(el2), inkOffsetPx: round(abl), fontSizePx: round(parseFloat(s3.fontSize)) });
      }
    }

    // ---------- principled signals (Vignelli lens, measured) ----------
    var sizeCount = {};
    for (var f = 0; f < texts.length; f++) { var fs = Math.round(parseFloat(cs(texts[f]).fontSize)); if (fs) sizeCount[fs] = (sizeCount[fs] || 0) + 1; }
    var fontSizes = Object.keys(sizeCount).map(function (k) { return { px: +k, count: sizeCount[k] }; }).sort(function (a, b) { return b.px - a.px; });

    var bodyPs = texts.filter(function (e) { return e.tagName === 'P'; }).map(function (e) { return parseFloat(cs(e).fontSize); }).sort(function (a, b) { return a - b; });
    var bodySize = bodyPs.length ? bodyPs[Math.floor(bodyPs.length / 2)] : null;
    var heads = texts.filter(function (e) { return /^H[1-3]$/.test(e.tagName); }).map(function (e) { return parseFloat(cs(e).fontSize); });
    var headSize = heads.length ? Math.max.apply(null, heads) : null;
    var headBodyRatio = (bodySize && headSize) ? round(headSize / bodySize) : null;

    var justified = texts.filter(function (e) { return cs(e).textAlign === 'justify'; }).map(path).slice(0, 20);

    var hues = {}, families = {};
    for (var c = 0; c < texts.length; c++) {
      var col = parseRGB(cs(texts[c]).color);
      if (col && !isGrey(col)) hues[hue(col)] = (hues[hue(col)] || 0) + 1;
      var fam = (cs(texts[c]).fontFamily || '').split(',')[0].replace(/["']/g, '').trim();
      if (fam) families[fam] = (families[fam] || 0) + 1;
    }
    var accentHues = Object.keys(hues).map(function (h) { return { hue: +h, count: hues[h] }; }).sort(function (a, b) { return b.count - a.count; });

    // average measure (characters per line) for paragraphs
    var chs = [];
    for (var pIdx = 0; pIdx < texts.length; pIdx++) {
      var e3 = texts[pIdx]; if (e3.tagName !== 'P') continue;
      var fs2 = parseFloat(cs(e3).fontSize), w = e3.getBoundingClientRect().width;
      if (fs2 > 0 && w > 0) chs.push(w / (fs2 * 0.5));
    }
    var avgMeasureCh = chs.length ? round(chs.reduce(function (a, b) { return a + b; }, 0) / chs.length) : null;

    return {
      width: vw,
      mode: mode,
      grid: gridInfo,
      baseline: baselineInfo,
      counts: { elements: visible.length, textBlocks: texts.length, itemsTested: tested },
      columnViolations: columnViolations.sort(function (a, b) { return b.offsetPx - a.offsetPx; }).slice(0, 40),
      baselineViolations: baselineViolations.slice(0, 40),
      opticalViolations: opticalViolations.sort(function (a, b) { return b.inkOffsetPx - a.inkOffsetPx; }).slice(0, 20),
      principled: {
        fontSizes: fontSizes,
        distinctTextSizes: fontSizes.length,
        bodySizePx: bodySize ? round(bodySize) : null,
        headBodyRatio: headBodyRatio,
        justifiedSelectors: justified,
        accentHues: accentHues,
        fontFamilies: Object.keys(families),
        avgMeasureCh: avgMeasureCh
      }
    };
  };
})();
