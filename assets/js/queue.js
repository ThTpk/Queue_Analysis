/* ============================================================
   queue.js — สูตรทฤษฎีคิวทั้งหมดที่เว็บนี้ใช้
   พอร์ตตรงจาก flowlens/core/analysis/queueing.py (Erlang-C,
   Sakasegawa/Allen-Cunneen, เปอร์เซ็นไทล์ของเวลารอ, หาจำนวนโต๊ะ)
   พร้อมสูตรพื้นฐานอื่น ๆ (M/M/1, Little, Kingman, Jackson)

   หน่วยเวลา: "นาที" ทุกที่
   lam  = λ  อัตราคนมาถึง (ราย/นาที)
   es   = E[S] เวลาบริการเฉลี่ย (นาที/ราย)  →  mu = 1/es
   c    = จำนวนโต๊ะ/เครื่อง (servers)
   ca2  = ca² squared CV ของระยะห่างเวลามาถึง
   cs2  = cs² squared CV ของเวลาบริการ
   ============================================================ */
(function (global) {
  'use strict';

  const MAX_SERVERS_SEARCH = 200;

  /* ---------------------------------------------------------- helpers */
  const isFin = Number.isFinite;

  /** ρ = λ·E[S]/c — สัดส่วนเวลาที่โต๊ะหนึ่งถูกใช้งาน */
  function rho(lam, es, c) {
    if (!(c > 0) || !(es > 0) || lam < 0) return NaN;
    return (lam * es) / c;
  }

  /** a = λ/μ = λ·E[S] — "offered load" หน่วยเป็น erlang */
  function offeredLoad(lam, es) { return lam * es; }

  /* ---------------------------------------------------------- Erlang */

  /**
   * Erlang-B: P(ระบบ M/M/c/c เต็ม) — ใช้สูตรเวียนเพื่อไม่ให้ตัวเลขล้น
   *   B(0,a) = 1 ;  B(c,a) = a·B(c-1,a) / (c + a·B(c-1,a))
   */
  function erlangB(c, a) {
    if (c <= 0) return 1;
    if (a <= 0) return 0;
    let invB = 1;
    for (let i = 1; i <= c; i++) invB = 1 + (invB * i) / a;
    return 1 / invB;
  }

  /**
   * Erlang-C: P(ผู้มาถึงต้องรอ) ใน M/M/c
   *   C(c,a) = B / (1 - ρ(1-B))   โดย ρ = a/c
   * (เหมือน flowlens: core/analysis/queueing.py :: erlang_c)
   */
  function erlangC(c, a) {
    if (c <= 0) return 1;
    if (a <= 0) return 0;
    const r = a / c;
    if (r >= 1) return 1;
    const b = erlangB(c, a);
    const denom = 1 - r * (1 - b);
    return denom > 0 ? b / denom : 1;
  }

  /* ---------------------------------------------------------- M/M/1 */

  /** M/M/1: Wq = ρ·E[S]/(1-ρ) */
  function wqMM1(lam, es) {
    if (!(lam > 0) || !(es > 0)) return 0;
    const r = lam * es;
    if (r >= 1) return Infinity;
    return (r * es) / (1 - r);
  }
  /** M/M/1: W = E[S]/(1-ρ) */
  function wMM1(lam, es) {
    const r = lam * es;
    if (r >= 1) return Infinity;
    return es / (1 - r);
  }
  /** M/M/1: L = ρ/(1-ρ) */
  function lMM1(lam, es) {
    const r = lam * es;
    if (r >= 1) return Infinity;
    return r / (1 - r);
  }
  /** M/M/1: Lq = ρ²/(1-ρ) */
  function lqMM1(lam, es) {
    const r = lam * es;
    if (r >= 1) return Infinity;
    return (r * r) / (1 - r);
  }
  /** M/M/1: P(n คนในระบบ) = (1-ρ)ρⁿ */
  function pnMM1(lam, es, n) {
    const r = lam * es;
    if (r >= 1) return NaN;
    return (1 - r) * Math.pow(r, n);
  }

  /* ---------------------------------------------------------- M/M/c */

  /**
   * M/M/c: Wq = C(c,a) / (c·μ - λ)
   * (flowlens :: wq_mmc)
   */
  function wqMMc(lam, es, c) {
    if (!(lam > 0) || !(es > 0) || !(c > 0)) return 0;
    const mu = 1 / es;
    const a = lam / mu;
    if (a / c >= 1) return Infinity;
    return erlangC(c, a) / (c * mu - lam);
  }

  /** M/M/c: P(รอ) */
  function pWaitMMc(lam, es, c) { return erlangC(c, lam * es); }

  /** M/M/c: P(n คนในระบบ) */
  function pnMMc(lam, es, c, n) {
    const a = lam * es, r = a / c;
    if (r >= 1) return NaN;
    // p0 จากสูตรอนุกรม
    let sum = 0, term = 1;
    for (let k = 0; k < c; k++) {
      if (k > 0) term *= a / k;
      sum += term;
    }
    const tc = term * (a / c);             // a^c/c!
    const p0 = 1 / (sum + tc / (1 - r));
    if (n < c) {
      let t = 1;
      for (let k = 1; k <= n; k++) t *= a / k;
      return p0 * t;
    }
    let fact = 1;
    for (let k = 1; k <= c; k++) fact *= k;
    return (p0 * Math.pow(a, n)) / (fact * Math.pow(c, n - c));
  }

  /* ------------------------------------------------- G/G/c (Sakasegawa) */

  /**
   * Sakasegawa / Allen–Cunneen สำหรับ G/G/c
   *   Wq ≈ ρ^(√(2(c+1))-1) / (c(1-ρ)) · (ca²+cs²)/2 · E[S]
   * (flowlens :: wq_sakasegawa — FlowLens ใช้ตัวนี้เป็นค่าหลัก
   *  เพราะเวลาบริการจริงไม่เป็น exponential)
   */
  function wqGGc(lam, es, c, ca2, cs2) {
    ca2 = ca2 == null ? 1 : ca2;
    cs2 = cs2 == null ? 1 : cs2;
    if (!(lam > 0) || !(es > 0) || !(c > 0)) return 0;
    const r = (lam * es) / c;
    if (r >= 1) return Infinity;
    const power = Math.sqrt(2 * (c + 1)) - 1;
    return (Math.pow(r, power) / (c * (1 - r))) * ((ca2 + cs2) / 2) * es;
  }

  /**
   * Kingman (VUT) สำหรับ G/G/1
   *   Wq ≈ (ca²+cs²)/2 · ρ/(1-ρ) · E[S]
   *        [V]ariability  ·  [U]tilization ·  [T]ime
   */
  function wqKingman(lam, es, ca2, cs2) {
    ca2 = ca2 == null ? 1 : ca2;
    cs2 = cs2 == null ? 1 : cs2;
    const r = lam * es;
    if (r >= 1) return Infinity;
    return ((ca2 + cs2) / 2) * (r / (1 - r)) * es;
  }

  /* ------------------------------------------------- เปอร์เซ็นไทล์ของเวลารอ */

  /**
   * เปอร์เซ็นไทล์ p ของเวลารอ
   * ใช้หาง exponential ของ M/M/c:  P(Wq > t) = C·e^{-(cμ-λ)t}
   *   t_p = ln( C / (1-p) ) / (cμ - λ)
   * แล้วปรับสเกลด้วยอัตราส่วน Wq(G/G/c)/Wq(M/M/c)
   * (flowlens :: wq_percentile — วิธีเดียวกันเป๊ะ)
   */
  function wqPercentile(lam, es, c, p, ca2, cs2) {
    p = p == null ? 0.9 : p;
    ca2 = ca2 == null ? 1 : ca2;
    cs2 = cs2 == null ? 1 : cs2;
    if (!(lam > 0) || !(es > 0) || !(c > 0)) return 0;
    const mu = 1 / es;
    if ((lam * es) / c >= 1) return Infinity;
    const cw = erlangC(c, lam / mu);
    const rate = c * mu - lam;
    const base = cw > 1 - p ? Math.max(0, Math.log(cw / (1 - p)) / rate) : 0;
    const mmc = wqMMc(lam, es, c);
    const ggc = wqGGc(lam, es, c, ca2, cs2);
    const scale = mmc > 0 && isFin(ggc) ? ggc / mmc : 1;
    return base * scale;
  }

  /** P(Wq > t) ใน M/M/c */
  function pWaitOver(lam, es, c, t) {
    if (!(lam > 0) || !(es > 0) || !(c > 0)) return 0;
    const mu = 1 / es;
    if ((lam * es) / c >= 1) return 1;
    return erlangC(c, lam * es) * Math.exp(-(c * mu - lam) * t);
  }

  /** Service level: P(Wq ≤ t) — "รอไม่เกิน t นาที กี่ %" */
  function serviceLevel(lam, es, c, t) { return 1 - pWaitOver(lam, es, c, t); }

  /* ---------------------------------------------------------- Little's Law */

  /** L = λ·W  (ใช้ได้กับทุกระบบที่นิ่งแล้ว ไม่สนการแจกแจง) */
  const little = {
    L:  (lam, W)  => lam * W,
    W:  (L, lam)  => (lam > 0 ? L / lam : NaN),
    lam:(L, W)    => (W > 0 ? L / W : NaN),
    Lq: (lam, Wq) => lam * Wq,
  };

  /* ---------------------------------------------------------- หาจำนวนโต๊ะ */

  /** โต๊ะน้อยที่สุดที่ทำให้ ρ ≤ rhoMax  (flowlens :: min_servers_for_utilization) */
  function minServersForRho(lam, es, rhoMax) {
    if (!(lam > 0) || !(es > 0)) return 0;
    return Math.max(1, Math.ceil((lam * es) / Math.max(rhoMax, 1e-6)));
  }

  /** โต๊ะน้อยที่สุดที่ทำให้เวลารอที่เปอร์เซ็นไทล์ p ผ่านเป้า (flowlens :: min_servers_for_wait) */
  function minServersForWait(lam, es, targetWait, opt) {
    opt = opt || {};
    const p = opt.p == null ? 0.9 : opt.p;
    const ca2 = opt.ca2 == null ? 1 : opt.ca2;
    const cs2 = opt.cs2 == null ? 1 : opt.cs2;
    const rhoMax = opt.rhoMax == null ? 0.999 : opt.rhoMax;
    if (!(lam > 0) || !(es > 0)) return 0;
    const start = minServersForRho(lam, es, rhoMax);
    for (let c = Math.max(1, start); c <= MAX_SERVERS_SEARCH; c++) {
      const w = wqPercentile(lam, es, c, p, ca2, cs2);
      if (isFin(w) && w <= targetWait) return c;
    }
    return MAX_SERVERS_SEARCH;
  }

  /** Square-root staffing: c ≈ a + β√a  (QED regime) */
  function sqrtStaffing(lam, es, beta) {
    const a = lam * es;
    return Math.max(1, Math.ceil(a + (beta == null ? 1 : beta) * Math.sqrt(a)));
  }

  /* ---------------------------------------------------------- Jackson network */

  /**
   * แก้สมการสมดุลการไหล  λ_j = λ0_j + Σ_i λ_i·p_ij
   * nodes: ['REG', ...] ; ext: {REG: 0.6} ; routes: [{from,to,p}]
   * คืน λ ที่แต่ละหน่วยจริง ๆ ได้รับ (รวมงานย้อนกลับ/ทำซ้ำ)
   * ใช้วิธีวนซ้ำ (power iteration) — รองรับวงวนแบบเจาะซ้ำได้
   */
  function solveFlow(nodes, ext, routes, iters) {
    iters = iters || 400;
    const lam = {};
    nodes.forEach(n => { lam[n] = ext[n] || 0; });
    for (let k = 0; k < iters; k++) {
      const next = {};
      nodes.forEach(n => { next[n] = ext[n] || 0; });
      routes.forEach(r => {
        if (next[r.to] == null) return;
        next[r.to] += (lam[r.from] || 0) * r.p;
      });
      let diff = 0;
      nodes.forEach(n => { diff = Math.max(diff, Math.abs(next[n] - lam[n])); lam[n] = next[n]; });
      if (diff < 1e-12) break;
    }
    return lam;
  }

  /** ผลของวงวนทำซ้ำ: λ_eff = λ/(1-r) เมื่อมีโอกาสวนกลับ r */
  function reworkInflation(lam, r) { return r >= 1 ? Infinity : lam / (1 - r); }

  /* ---------------------------------------------------------- สุ่มตัวเลข */

  /** PRNG mulberry32 — ให้ผลซ้ำได้ (เว็บนี้ต้องการตัวเลขเดิมทุกครั้ง) */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /** exponential(mean) */
  function rexp(rand, mean) { return -mean * Math.log(1 - rand()); }
  /** normal(0,1) — Box–Muller */
  function rnorm(rand) {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /** lognormal ที่มี mean, cv ตามต้องการ (FlowLens สร้างข้อมูลตัวอย่างแบบนี้) */
  function rlognorm(rand, mean, cv) {
    if (!(cv > 0)) return mean;
    const s2 = Math.log(1 + cv * cv);
    const mu = Math.log(mean) - s2 / 2;
    return Math.exp(mu + Math.sqrt(s2) * rnorm(rand));
  }
  /** erlang-k (ผลรวม exponential k ตัว) — cv² = 1/k */
  function rerlang(rand, mean, k) {
    let s = 0;
    for (let i = 0; i < k; i++) s += rexp(rand, mean / k);
    return s;
  }
  /** ตัวแปรสุ่มที่กำหนด mean + cv² ได้อิสระ (ใช้ lognormal) */
  function rsvc(rand, mean, scv) { return rlognorm(rand, mean, Math.sqrt(Math.max(scv, 0))); }

  /* ---------------------------------------------------------- สถิติ */

  function quantile(sorted, p) {
    const n = sorted.length;
    if (!n) return NaN;
    if (n === 1) return sorted[0];
    const h = (n - 1) * p;
    const lo = Math.floor(h), hi = Math.ceil(h);
    return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
  }
  function stats(arr) {
    const v = arr.filter(isFin);
    if (!v.length) return { n: 0, mean: NaN, sd: NaN, cv: NaN, scv: NaN,
                            p50: NaN, p90: NaN, p95: NaN, max: NaN };
    const s = v.slice().sort((a, b) => a - b);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = v.length > 1
      ? Math.sqrt(v.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (v.length - 1)) : 0;
    const cv = mean > 0 ? sd / mean : NaN;
    return { n: v.length, mean, sd, cv, scv: cv * cv,
             p50: quantile(s, .5), p90: quantile(s, .9), p95: quantile(s, .95),
             max: s[s.length - 1] };
  }
  /** squared coefficient of variation (flowlens :: _scv — ต้องมี ≥3 ค่า ไม่งั้นคืน 1) */
  function scv(arr) {
    const v = arr.filter(x => isFin(x) && x >= 0);
    if (v.length < 3) return 1;
    const m = v.reduce((a, b) => a + b, 0) / v.length;
    if (!(m > 0)) return 1;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - m) * (b - m), 0) / (v.length - 1));
    return (sd / m) ** 2;
  }
  /** ความชันของเส้นถดถอยเชิงเส้น (flowlens ใช้หา wait_growth) */
  function slope(xs, ys) {
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return NaN;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxy += xs[i] * ys[i]; sxx += xs[i] * xs[i]; }
    const d = n * sxx - sx * sx;
    return d === 0 ? NaN : (n * sxy - sx * sy) / d;
  }

  /* ---------------------------------------------------------- Bottleneck Score */

  /**
   * B(u) = w1·ρ̂_peak + w2·wait_share + w3·ĝ
   * (flowlens :: core/analysis/bottleneck.py — ρ ถูก clip ที่ 1.2 แล้วหารด้วย 1.2,
   *  growth ถูก normalize แบบ min-max ข้ามหน่วย)
   */
  function bottleneckScores(units, weights) {
    const w = weights || { utilization: .4, wait_share: .4, wait_growth: .2 };
    const tot = w.utilization + w.wait_share + w.wait_growth;
    const w1 = w.utilization / tot, w2 = w.wait_share / tot, w3 = w.wait_growth / tot;
    const gs = units.map(u => (isFin(u.wait_growth) ? u.wait_growth : NaN)).filter(isFin);
    const lo = gs.length ? Math.min(...gs) : 0;
    const hi = gs.length ? Math.max(...gs) : 0;
    const norm = g => (!isFin(g) ? 0 : hi > lo ? (g - lo) / (hi - lo) : Math.min(Math.max(g, 0), 1));
    return units.map(u => {
      const rhoTerm = Math.min(Math.max(isFin(u.rho_peak) ? u.rho_peak : 0, 0), 1.2) / 1.2;
      const waitTerm = isFin(u.wait_share) ? u.wait_share : 0;
      const growthTerm = norm(u.wait_growth);
      return Object.assign({}, u, {
        rho_term: rhoTerm, wait_term: waitTerm, growth_term: growthTerm,
        score: w1 * rhoTerm + w2 * waitTerm + w3 * growthTerm,
      });
    }).sort((a, b) => b.score - a.score)
      .map((u, i) => Object.assign(u, { rank: i + 1 }));
  }

  /* ---------------------------------------------------------- format */
  const fmt = {
    n: (x, d) => (isFin(x) ? x.toFixed(d == null ? 1 : d) : '—'),
    i: x => (isFin(x) ? Math.round(x).toLocaleString('th-TH') : '—'),
    pct: (x, d) => (isFin(x) ? (x * 100).toFixed(d == null ? 0 : d) + '%' : '—'),
    min: x => (!isFin(x) ? '∞' : x >= 100 ? Math.round(x) + ' น.' : x.toFixed(1) + ' น.'),
    clock: m => {
      const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60);
      return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    },
  };

  /* ---------------------------------------------------------- export */
  global.Q = {
    rho, offeredLoad, erlangB, erlangC,
    wqMM1, wMM1, lMM1, lqMM1, pnMM1,
    wqMMc, pWaitMMc, pnMMc,
    wqGGc, wqKingman, wqPercentile, pWaitOver, serviceLevel,
    little, minServersForRho, minServersForWait, sqrtStaffing,
    solveFlow, reworkInflation,
    rng, rexp, rnorm, rlognorm, rerlang, rsvc,
    quantile, stats, scv, slope, bottleneckScores, fmt,
    MAX_SERVERS_SEARCH,
  };
})(typeof window !== 'undefined' ? window : globalThis);
