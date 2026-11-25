/* ============================================================
   charts.js — กราฟ SVG ขนาดเล็ก ไม่พึ่งไลบรารีภายนอก
   ใช้สี CSS variable จึงเปลี่ยนตามธีมสว่าง/มืดเอง
   ============================================================ */
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const SERIES = ['var(--s1)','var(--s2)','var(--s3)','var(--s4)',
                  'var(--s5)','var(--s6)','var(--s7)','var(--s8)'];

  function el(tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  const nice = v => {
    if (!Number.isFinite(v) || v === 0) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(Math.abs(v))));
    const f = Math.abs(v) / e;
    const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return m * e * Math.sign(v);
  };
  const ticks = (lo, hi, n) => {
    const step = nice((hi - lo) / Math.max(n, 1));
    const start = Math.ceil(lo / step) * step;
    const out = [];
    for (let v = start; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < 1e-12 ? 0 : v);
    return out;
  };
  const tnum = v => {
    const a = Math.abs(v);
    if (a >= 1000) return (v / 1000).toFixed(a >= 10000 ? 0 : 1) + 'k';
    if (a >= 10) return String(Math.round(v));
    if (a >= 1) return v.toFixed(1).replace(/\.0$/, '');
    if (a === 0) return '0';
    return v.toFixed(2).replace(/0$/, '');
  };

  /* ---------------------------------------------------------- base frame */
  function frame(opt) {
    const W = opt.width || 680, H = opt.height || 300;
    const m = Object.assign({ t: 14, r: 16, b: 34, l: 48 }, opt.margin || {});
    const svg = el('svg', {
      viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img',
      'aria-label': opt.label || '', preserveAspectRatio: 'xMidYMid meet',
      style: `max-height:${H}px`,
    });
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const g = el('g', { transform: `translate(${m.l},${m.t})` });
    svg.appendChild(g);
    return { svg, g, W, H, m, iw, ih };
  }

  function axes(f, sx, sy, opt) {
    const { g, iw, ih } = f;
    const xt = opt.xticks || ticks(opt.x0, opt.x1, opt.nx || 6);
    const yt = opt.yticks || ticks(opt.y0, opt.y1, opt.ny || 5);
    yt.forEach(v => {
      const y = sy(v);
      if (y < -1 || y > ih + 1) return;
      g.appendChild(el('line', { x1: 0, x2: iw, y1: y, y2: y,
        stroke: 'var(--line)', 'stroke-width': v === 0 ? 1.4 : 1,
        'stroke-dasharray': v === 0 ? null : '2 4' }));
      g.appendChild(el('text', { x: -9, y: y + 4, 'text-anchor': 'end',
        fill: 'var(--ink-faint)', 'font-size': 11, 'font-family': 'var(--mono)' },
        (opt.yfmt || tnum)(v)));
    });
    xt.forEach(v => {
      const x = sx(v);
      if (x < -1 || x > iw + 1) return;
      g.appendChild(el('line', { x1: x, x2: x, y1: ih, y2: ih + 5, stroke: 'var(--line)' }));
      g.appendChild(el('text', { x, y: ih + 19, 'text-anchor': 'middle',
        fill: 'var(--ink-faint)', 'font-size': 11, 'font-family': 'var(--mono)' },
        (opt.xfmt || tnum)(v)));
    });
    g.appendChild(el('line', { x1: 0, x2: iw, y1: ih, y2: ih, stroke: 'var(--line)', 'stroke-width': 1.2 }));
    if (opt.xlabel) f.svg.appendChild(el('text', {
      x: f.m.l + iw / 2, y: f.H - 2, 'text-anchor': 'middle',
      fill: 'var(--ink-faint)', 'font-size': 11.5 }, opt.xlabel));
    if (opt.ylabel) f.svg.appendChild(el('text', {
      x: 11, y: f.m.t + ih / 2, 'text-anchor': 'middle', fill: 'var(--ink-faint)',
      'font-size': 11.5, transform: `rotate(-90 11 ${f.m.t + ih / 2})` }, opt.ylabel));
  }

  /* ---------------------------------------------------------- line chart */
  /**
   * lineChart({series:[{name,points:[[x,y],...],color,dash,width,fill}], ...})
   */
  function lineChart(opt) {
    const f = frame(opt);
    const all = [];
    opt.series.forEach(s => s.points.forEach(p => {
      if (Number.isFinite(p[0]) && Number.isFinite(p[1])) all.push(p);
    }));
    const x0 = opt.x0 != null ? opt.x0 : Math.min(...all.map(p => p[0]));
    const x1 = opt.x1 != null ? opt.x1 : Math.max(...all.map(p => p[0]));
    const y0 = opt.y0 != null ? opt.y0 : 0;
    const y1 = opt.y1 != null ? opt.y1 : nice(Math.max(...all.map(p => p[1])) * 1.08) || 1;
    const sx = v => ((v - x0) / (x1 - x0 || 1)) * f.iw;
    const sy = v => f.ih - ((v - y0) / (y1 - y0 || 1)) * f.ih;

    axes(f, sx, sy, Object.assign({ x0, x1, y0, y1 }, opt));

    (opt.bands || []).forEach(b => {
      f.g.appendChild(el('rect', { x: sx(b.from), y: 0, width: Math.max(sx(b.to) - sx(b.from), 1),
        height: f.ih, fill: b.color || 'var(--accent)', opacity: b.opacity == null ? .07 : b.opacity }));
      if (b.label) f.g.appendChild(el('text', { x: (sx(b.from) + sx(b.to)) / 2, y: 13,
        'text-anchor': 'middle', fill: 'var(--ink-faint)', 'font-size': 10.5 }, b.label));
    });
    (opt.rules || []).forEach(r => {
      if (r.y != null) {
        f.g.appendChild(el('line', { x1: 0, x2: f.iw, y1: sy(r.y), y2: sy(r.y),
          stroke: r.color || 'var(--bad)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }));
        if (r.label) f.g.appendChild(el('text', { x: f.iw - 3, y: sy(r.y) - 5, 'text-anchor': 'end',
          fill: r.color || 'var(--bad)', 'font-size': 10.5, 'font-weight': 600 }, r.label));
      }
      if (r.x != null) {
        f.g.appendChild(el('line', { x1: sx(r.x), x2: sx(r.x), y1: 0, y2: f.ih,
          stroke: r.color || 'var(--bad)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }));
        if (r.label) f.g.appendChild(el('text', { x: sx(r.x) + 5, y: 12,
          fill: r.color || 'var(--bad)', 'font-size': 10.5, 'font-weight': 600 }, r.label));
      }
    });

    /* พื้นที่ระหว่างสองเส้น (ใช้ในบทกฎของลิตเติล) */
    if (opt.between) {
      const cl = v => Math.min(Math.max(v, y0), y1);
      const up = opt.between.a.map(p => [sx(p[0]), sy(cl(p[1]))]);
      const dn = opt.between.b.map(p => [sx(p[0]), sy(cl(p[1]))]).reverse();
      if (up.length && dn.length) {
        const d = up.map((p, j) => (j ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ') +
          ' ' + dn.map(p => 'L' + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ') + ' Z';
        f.g.appendChild(el('path', { d, fill: opt.between.color || 'var(--s1)',
          opacity: opt.between.opacity == null ? .22 : opt.between.opacity, stroke: 'none' }));
      }
    }

    opt.series.forEach((s, i) => {
      const col = s.color || SERIES[i % SERIES.length];
      const pts = s.points.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
        .map(p => [sx(p[0]), sy(Math.min(Math.max(p[1], y0), y1))]);
      if (!pts.length) return;
      const d = pts.map((p, j) => (j ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
      if (s.fill) f.g.appendChild(el('path', {
        d: d + ` L ${pts[pts.length - 1][0].toFixed(2)} ${f.ih} L ${pts[0][0].toFixed(2)} ${f.ih} Z`,
        fill: col, opacity: .13 }));
      f.g.appendChild(el('path', { d, fill: 'none', stroke: col,
        'stroke-width': s.width || 2, 'stroke-dasharray': s.dash || null,
        'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      if (s.dots) pts.forEach(p => f.g.appendChild(el('circle', {
        cx: p[0], cy: p[1], r: s.dots === true ? 2.6 : s.dots, fill: col })));
      if (s.endLabel && pts.length) {
        const last = pts[pts.length - 1];
        f.g.appendChild(el('text', { x: last[0] - 4, y: last[1] - 8, 'text-anchor': 'end',
          fill: col, 'font-size': 11, 'font-weight': 600 }, s.endLabel));
      }
    });
    return f.svg;
  }

  /* ---------------------------------------------------------- bar chart */
  /** barChart({labels:[], series:[{name,values,color}], stacked, horizontal}) */
  function barChart(opt) {
    const f = frame(Object.assign({}, opt,
      { margin: Object.assign({ t: 14, r: 16, b: 46, l: 48 }, opt.margin || {}) }));
    const n = opt.labels.length;
    const S = opt.series;
    const maxV = opt.y1 != null ? opt.y1 : nice(Math.max(.0001, ...(opt.stacked
      ? opt.labels.map((_, i) => S.reduce((a, s) => a + (s.values[i] || 0), 0))
      : S.flatMap(s => s.values.filter(Number.isFinite)))) * 1.08);
    const sy = v => f.ih - (v / (maxV || 1)) * f.ih;
    const bandW = f.iw / n;
    const pad = bandW * .22;
    const inner = bandW - pad * 2;
    const bw = opt.stacked ? inner : inner / S.length;

    ticks(0, maxV, opt.ny || 5).forEach(v => {
      f.g.appendChild(el('line', { x1: 0, x2: f.iw, y1: sy(v), y2: sy(v),
        stroke: 'var(--line)', 'stroke-dasharray': v === 0 ? null : '2 4' }));
      f.g.appendChild(el('text', { x: -9, y: sy(v) + 4, 'text-anchor': 'end',
        fill: 'var(--ink-faint)', 'font-size': 11, 'font-family': 'var(--mono)' },
        (opt.yfmt || tnum)(v)));
    });
    (opt.rules || []).forEach(r => {
      f.g.appendChild(el('line', { x1: 0, x2: f.iw, y1: sy(r.y), y2: sy(r.y),
        stroke: r.color || 'var(--bad)', 'stroke-width': 1.3, 'stroke-dasharray': '5 4' }));
      if (r.label) f.g.appendChild(el('text', { x: f.iw - 3, y: sy(r.y) - 5, 'text-anchor': 'end',
        fill: r.color || 'var(--bad)', 'font-size': 10.5, 'font-weight': 600 }, r.label));
    });

    opt.labels.forEach((lab, i) => {
      let acc = 0;
      S.forEach((s, k) => {
        const v = s.values[i];
        if (!Number.isFinite(v)) return;
        const col = (s.colors && s.colors[i]) || s.color || SERIES[k % SERIES.length];
        const x = i * bandW + pad + (opt.stacked ? 0 : k * bw);
        const y = opt.stacked ? sy(acc + v) : sy(Math.max(v, 0));
        const h = Math.max(Math.abs(sy(0) - sy(Math.abs(v))), 1);
        f.g.appendChild(el('rect', { x, y, width: Math.max(bw - (opt.stacked ? 0 : 1.5), 1),
          height: h, fill: col, rx: 3, opacity: s.opacity || 1 }));
        if (opt.valueLabels && !opt.stacked)
          f.g.appendChild(el('text', { x: x + bw / 2, y: y - 4, 'text-anchor': 'middle',
            fill: 'var(--ink-soft)', 'font-size': 10, 'font-family': 'var(--mono)' },
            (opt.vfmt || tnum)(v)));
        acc += v;
      });
      const tx = i * bandW + bandW / 2;
      const t = el('text', { x: tx, y: f.ih + 16, 'text-anchor': 'middle',
        fill: 'var(--ink-soft)', 'font-size': 10.5 }, lab);
      if (opt.rotate) t.setAttribute('transform', `rotate(-38 ${tx} ${f.ih + 16})`),
        t.setAttribute('text-anchor', 'end');
      f.g.appendChild(t);
    });
    f.g.appendChild(el('line', { x1: 0, x2: f.iw, y1: f.ih, y2: f.ih, stroke: 'var(--line)', 'stroke-width': 1.2 }));
    if (opt.xlabel) f.svg.appendChild(el('text', { x: f.m.l + f.iw / 2, y: f.H - 2,
      'text-anchor': 'middle', fill: 'var(--ink-faint)', 'font-size': 11.5 }, opt.xlabel));
    if (opt.ylabel) f.svg.appendChild(el('text', { x: 11, y: f.m.t + f.ih / 2,
      'text-anchor': 'middle', fill: 'var(--ink-faint)', 'font-size': 11.5,
      transform: `rotate(-90 11 ${f.m.t + f.ih / 2})` }, opt.ylabel));
    return f.svg;
  }

  /** histogram({values, bins, ...}) */
  function histogram(opt) {
    const v = opt.values.filter(Number.isFinite);
    const nb = opt.bins || 24;
    const lo = opt.x0 != null ? opt.x0 : Math.min(...v, 0);
    const hi = opt.x1 != null ? opt.x1 : Math.max(...v, 1);
    const w = (hi - lo) / nb || 1;
    const counts = new Array(nb).fill(0);
    v.forEach(x => {
      let k = Math.floor((x - lo) / w);
      if (k < 0) k = 0; if (k >= nb) k = nb - 1;
      counts[k]++;
    });
    const labels = counts.map((_, i) => (i % Math.ceil(nb / 8) === 0 ? tnum(lo + i * w) : ''));
    return barChart(Object.assign({}, opt, {
      labels, series: [{ values: counts, color: opt.color || 'var(--s1)' }],
      ylabel: opt.ylabel || 'จำนวนราย',
    }));
  }

  /** utilBar — แถบ ρ พร้อมเส้นเกณฑ์ (ใช้ซ้ำหลายหน้า) */
  function utilBar(r, cap) {
    const pctWrap = document.createElement('div');
    pctWrap.style.cssText = 'position:relative;height:9px;border-radius:5px;overflow:hidden;' +
      'background:var(--bg-sunken);border:1px solid var(--line)';
    const v = Math.min(Math.max(r || 0, 0), 1.25) / 1.25;
    const col = r >= 1 ? 'var(--bad)' : r > (cap || .85) ? 'var(--warn)' : 'var(--ok)';
    const bar = document.createElement('i');
    bar.style.cssText = `position:absolute;inset:0 auto 0 0;width:${(v * 100).toFixed(1)}%;background:${col}`;
    pctWrap.appendChild(bar);
    if (cap) {
      const m = document.createElement('i');
      m.style.cssText = `position:absolute;top:0;bottom:0;left:${((cap / 1.25) * 100).toFixed(1)}%;` +
        'width:2px;background:var(--ink-faint);opacity:.75';
      pctWrap.appendChild(m);
    }
    return pctWrap;
  }

  function legend(items) {
    const d = document.createElement('div');
    d.className = 'legend';
    items.forEach((it, i) => {
      const s = document.createElement('span');
      const ic = document.createElement('i');
      ic.style.background = it.color || SERIES[i % SERIES.length];
      if (it.dash) { ic.style.height = '0'; ic.style.borderTop = `2px dashed ${it.color}`; ic.style.borderRadius = '0'; }
      s.appendChild(ic); s.appendChild(document.createTextNode(it.name));
      d.appendChild(s);
    });
    return d;
  }

  /** mount(host, svg) — ล้างแล้วใส่ใหม่ */
  function mount(host, node) {
    const h = typeof host === 'string' ? document.getElementById(host) : host;
    if (!h) return;
    h.replaceChildren(node);
    return h;
  }

  global.Chart = { lineChart, barChart, histogram, utilBar, legend, mount, el, ticks, nice, SERIES, tnum };
})(typeof window !== 'undefined' ? window : globalThis);
