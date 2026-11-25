/* ============================================================
   flowmap.js — ผังการไหลของระบบ FlowLens (8 หน่วย)
   ระบายสีตามค่าที่ส่งเข้ามา (ρ, คะแนนคอขวด, เวลารอ ...)
   ใช้ซ้ำได้ทั้งหน้าแรก หน้ากรณีศึกษา และหน้าจำลอง
   ============================================================ */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a, x) => {
    const n = document.createElementNS(NS, t);
    for (const k in a) if (a[k] != null) n.setAttribute(k, a[k]);
    if (x != null) n.textContent = x;
    return n;
  };

  /* ตำแหน่งบนผัง (viewBox 1000 x 330) */
  const POS = {
    ARRIVAL:   { x: 18,  y: 135, w: 74,  h: 54, kind: 'io',   label: 'ผู้ป่วยมาถึง' },
    REG:       { x: 124, y: 135, w: 108, h: 62 },
    PHLEB:     { x: 264, y: 135, w: 108, h: 62 },
    TRANSPORT: { x: 404, y: 135, w: 96,  h: 62, kind: 'move' },
    RECEIVE:   { x: 532, y: 135, w: 108, h: 62 },
    CHEM:      { x: 672, y: 64,  w: 108, h: 62 },
    HEMA:      { x: 672, y: 206, w: 108, h: 62 },
    VERIFY:    { x: 812, y: 135, w: 100, h: 62 },
    RESULT:    { x: 944, y: 135, w: 46,  h: 62, kind: 'io',   label: 'ส่งผล' },
  };
  const EDGES = [
    ['ARRIVAL', 'REG'], ['REG', 'PHLEB'], ['PHLEB', 'TRANSPORT'],
    ['TRANSPORT', 'RECEIVE'],
    ['RECEIVE', 'CHEM', '62%'], ['RECEIVE', 'HEMA', '38%'],
    ['CHEM', 'VERIFY'], ['HEMA', 'VERIFY'], ['VERIFY', 'RESULT'],
  ];

  function scaleColor(v, mode) {
    if (!Number.isFinite(v)) return { fill: 'var(--bg-sunken)', stroke: 'var(--line)', ink: 'var(--ink-faint)' };
    let band;
    if (mode === 'rho')       band = v >= 1 ? 3 : v > 0.85 ? 2 : v > 0.6 ? 1 : 0;
    else if (mode === 'score')band = v >= 0.6 ? 3 : v >= 0.4 ? 2 : v >= 0.25 ? 1 : 0;
    else                      band = v >= 30 ? 3 : v >= 10 ? 2 : v >= 3 ? 1 : 0;
    return [
      { fill: 'var(--ok-soft)',     stroke: 'color-mix(in srgb, var(--ok) 45%, transparent)',   ink: 'var(--ok)' },
      { fill: 'var(--bg-sunken)',   stroke: 'var(--line)',                                       ink: 'var(--ink-soft)' },
      { fill: 'var(--warn-soft)',   stroke: 'color-mix(in srgb, var(--warn) 50%, transparent)', ink: 'var(--warn)' },
      { fill: 'var(--bad-soft)',    stroke: 'color-mix(in srgb, var(--bad) 60%, transparent)',  ink: 'var(--bad)' },
    ][band];
  }

  /**
   * draw(host, opt)
   * opt = {
   *   values: {REG: 0.99, ...},  mode: 'rho'|'score'|'wait',
   *   sub:    {REG: '9 โต๊ะ', ...},      // บรรทัดเล็กในกล่อง
   *   badge:  {REG: '1', ...},           // ป้ายมุมขวา (อันดับ)
   *   onClick: id => {},
   *   highlight: 'PHLEB',
   *   queues: {REG: 12, ...}             // จำนวนคนรอ แสดงเป็นจุด
   * }
   */
  function draw(host, opt) {
    opt = opt || {};
    const h = typeof host === 'string' ? document.getElementById(host) : host;
    if (!h) return;
    const vals = opt.values || {};
    const mode = opt.mode || 'rho';
    const svg = el('svg', { viewBox: '0 0 1000 330', class: 'chart', role: 'img',
      'aria-label': 'ผังการไหลของงานตรวจเลือด 8 หน่วย' });

    const defs = el('defs');
    ['var(--ink-faint)', 'var(--bad)'].forEach((c, i) => {
      const m = el('marker', { id: 'arw' + i, viewBox: '0 0 10 10', refX: 9, refY: 5,
        markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
      m.appendChild(el('path', { d: 'M 0 1 L 9 5 L 0 9 z', fill: c }));
      defs.appendChild(m);
    });
    svg.appendChild(defs);

    /* ---- เส้นเชื่อม ---- */
    EDGES.forEach(([a, b, lab]) => {
      const A = POS[a], B = POS[b];
      const x1 = A.x + A.w, y1 = A.y + A.h / 2;
      const x2 = B.x,       y2 = B.y + B.h / 2;
      const hot = opt.highlight && (a === opt.highlight || b === opt.highlight);
      const mid = (x1 + x2) / 2;
      const d = Math.abs(y1 - y2) < 2
        ? `M ${x1} ${y1} L ${x2} ${y2}`
        : `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
      svg.appendChild(el('path', { d, fill: 'none',
        stroke: hot ? 'var(--bad)' : 'var(--ink-faint)',
        'stroke-width': hot ? 2.2 : 1.5, opacity: hot ? 1 : .55,
        'marker-end': `url(#arw${hot ? 1 : 0})` }));
      if (lab) svg.appendChild(el('text', { x: mid, y: (y1 + y2) / 2 - 6,
        'text-anchor': 'middle', 'font-size': 11, fill: 'var(--ink-faint)',
        'font-family': 'var(--mono)' }, lab));
    });

    /* ---- วงวนเจาะซ้ำ ---- */
    if (opt.rework) {
      const P = POS.PHLEB;
      svg.appendChild(el('path', {
        d: `M ${P.x + 24} ${P.y} C ${P.x + 4} ${P.y - 44}, ${P.x + P.w - 4} ${P.y - 44}, ${P.x + P.w - 24} ${P.y}`,
        fill: 'none', stroke: 'var(--s5)', 'stroke-width': 1.6, 'stroke-dasharray': '4 3',
        'marker-end': 'url(#arw0)' }));
      svg.appendChild(el('text', { x: P.x + P.w / 2, y: P.y - 48, 'text-anchor': 'middle',
        'font-size': 11, fill: 'var(--s5)' }, 'เจาะซ้ำ ' + opt.rework));
    }

    /* ---- กล่องหน่วย ---- */
    Object.keys(POS).forEach(id => {
      const P = POS[id];
      const u = (global.FL && global.FL.byId[id]) || null;
      const g = el('g', { class: 'fm-node', 'data-id': id });
      if (P.kind === 'io') {
        g.appendChild(el('rect', { x: P.x, y: P.y, width: P.w, height: P.h, rx: 10,
          fill: 'var(--bg-sunken)', stroke: 'var(--line)', 'stroke-dasharray': '4 3' }));
        g.appendChild(el('text', { x: P.x + P.w / 2, y: P.y + P.h / 2 + 4, 'text-anchor': 'middle',
          'font-size': 11.5, fill: 'var(--ink-faint)' }, P.label));
        svg.appendChild(g);
        return;
      }
      const v = vals[id];
      const col = scaleColor(v, mode);
      const isHot = opt.highlight === id;
      g.appendChild(el('rect', { x: P.x, y: P.y, width: P.w, height: P.h, rx: 11,
        fill: col.fill, stroke: isHot ? 'var(--bad)' : col.stroke,
        'stroke-width': isHot ? 2.4 : 1.4 }));
      g.appendChild(el('text', { x: P.x + P.w / 2, y: P.y + 21, 'text-anchor': 'middle',
        'font-size': 12.5, 'font-weight': 600, fill: 'var(--ink)' },
        (u && u.short) || id));
      const sub = (opt.sub && opt.sub[id]) != null ? opt.sub[id]
        : Number.isFinite(v) ? (mode === 'rho' ? 'ρ ' + v.toFixed(2)
          : mode === 'score' ? 'B ' + v.toFixed(2) : v.toFixed(0) + ' น.') : '';
      g.appendChild(el('text', { x: P.x + P.w / 2, y: P.y + 38, 'text-anchor': 'middle',
        'font-size': 11, fill: col.ink, 'font-family': 'var(--mono)', 'font-weight': 600 }, sub));
      /* แถบ ρ ใต้ชื่อ */
      if (Number.isFinite(v) && mode !== 'wait') {
        const bw = P.w - 26;
        g.appendChild(el('rect', { x: P.x + 13, y: P.y + 46, width: bw, height: 5, rx: 2.5,
          fill: 'var(--bg-elev)', stroke: 'var(--line)', 'stroke-width': .8 }));
        const frac = Math.min(Math.max(v / (mode === 'rho' ? 1.2 : 1), 0), 1);
        g.appendChild(el('rect', { x: P.x + 13, y: P.y + 46, width: Math.max(bw * frac, 1),
          height: 5, rx: 2.5, fill: col.ink }));
      }
      if (opt.badge && opt.badge[id] != null) {
        g.appendChild(el('circle', { cx: P.x + P.w - 9, cy: P.y + 9, r: 10,
          fill: 'var(--bg-elev)', stroke: col.ink, 'stroke-width': 1.5 }));
        g.appendChild(el('text', { x: P.x + P.w - 9, y: P.y + 13, 'text-anchor': 'middle',
          'font-size': 11, 'font-weight': 700, fill: col.ink, 'font-family': 'var(--mono)' },
          String(opt.badge[id])));
      }
      /* คนรอ แสดงเป็นจุดใต้กล่อง */
      const q = opt.queues && opt.queues[id];
      if (q) {
        const n = Math.min(q, 30);
        for (let i = 0; i < n; i++) {
          g.appendChild(el('circle', { cx: P.x + 6 + (i % 15) * 7, cy: P.y + P.h + 9 + Math.floor(i / 15) * 7,
            r: 2.6, fill: 'var(--s2)', opacity: .85 }));
        }
        if (q > 30) g.appendChild(el('text', { x: P.x + P.w - 2, y: P.y + P.h + 26,
          'text-anchor': 'end', 'font-size': 10.5, fill: 'var(--s2)',
          'font-family': 'var(--mono)' }, '+' + (q - 30)));
      }
      if (opt.onClick) {
        g.style.cursor = 'pointer';
        g.addEventListener('click', () => opt.onClick(id));
        g.appendChild(el('title', {}, (u && u.name) || id));
      }
      svg.appendChild(g);
    });

    /* ---- ป้ายขั้นตอน ---- */
    [['ก่อนวิเคราะห์ (pre-analytic)', 124, 620], ['วิเคราะห์', 672, 108], ['หลังวิเคราะห์', 812, 178]]
      .forEach(([lab, x, w]) => {
        svg.appendChild(el('text', { x: x + w / 2, y: 318, 'text-anchor': 'middle',
          'font-size': 11, fill: 'var(--ink-faint)', 'letter-spacing': '.04em' }, lab));
      });

    h.replaceChildren(svg);
    return svg;
  }

  global.FlowMap = { draw, POS, EDGES };
})(typeof window !== 'undefined' ? window : globalThis);
