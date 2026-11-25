/* ============================================================
   des.js — เครื่องจำลองเหตุการณ์ไม่ต่อเนื่อง (Discrete-Event Simulation)
   ใช้หลักเดียวกับ SimPy ที่ FlowLens ใช้ใน core/simulation/model.py
   แต่เขียนด้วย JS ล้วน ให้รันในเบราว์เซอร์ได้

   สิ่งที่โมเดลนี้ทำ
   • คนมาถึงแบบ Poisson ที่อัตราเปลี่ยนตามเวลา (non-homogeneous) ด้วยวิธี thinning
   • แต่ละหน่วยมีโต๊ะจำนวนหนึ่ง เปลี่ยนตามกะได้ คิวแบบ FIFO
   • เวลาบริการสุ่มจาก lognormal ที่คุม mean และ cv² ได้
   • ส่งต่อตามความน่าจะเป็น รองรับวงวน (เจาะซ้ำ)
   • เก็บสถิติแบบถ่วงเวลา (time-weighted) จึงได้ L, Lq ที่ถูกต้องตามนิยาม
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------- min-heap */
  class Heap {
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(item) {
      const a = this.a; a.push(item);
      let i = a.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (a[p].t <= a[i].t) break;
        [a[p], a[i]] = [a[i], a[p]]; i = p;
      }
    }
    pop() {
      const a = this.a, top = a[0], last = a.pop();
      if (a.length) {
        a[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < a.length && a[l].t < a[m].t) m = l;
          if (r < a.length && a[r].t < a[m].t) m = r;
          if (m === i) break;
          [a[m], a[i]] = [a[i], a[m]]; i = m;
        }
      }
      return top;
    }
    peek() { return this.a[0]; }
  }

  /* ---------------------------------------------------------- station */
  class Station {
    /**
     * cfg: { id, name, serviceMean, scv, servers | serversAt(t),
     *        infinite (ขนส่ง = ไม่มีคิว), capacityCap }
     */
    constructor(cfg) {
      Object.assign(this, cfg);
      this.queue = [];          // entity ที่รออยู่
      this.active = [];         // {e, start, end}
      this.busy = 0;
      this.lastT = 0;
      // สถิติ
      this.accQ = 0;            // ∫ Lq dt
      this.accL = 0;            // ∫ L  dt
      this.accBusy = 0;         // ∫ busy dt      (server-minutes ที่ทำงาน)
      this.accCap = 0;          // ∫ servers dt   (server-minutes ที่เปิด)
      this.waits = [];
      this.svcTimes = [];
      this.arrivals = 0;
      this.departures = 0;
      this.qMax = 0;
      this.byBin = {};          // สถิติราย 15 นาที
    }
    serversNow(t) {
      if (this.infinite) return Infinity;
      return typeof this.serversAt === 'function' ? this.serversAt(t) : this.servers;
    }
    accrue(t) {
      const dt = t - this.lastT;
      if (dt > 0) {
        const c = this.serversNow(this.lastT);
        this.accQ += this.queue.length * dt;
        this.accL += (this.queue.length + this.busy) * dt;
        this.accBusy += this.busy * dt;
        if (Number.isFinite(c)) this.accCap += c * dt;
        const b = Math.floor(this.lastT / 15) * 15;
        const s = (this.byBin[b] = this.byBin[b] || { q: 0, busy: 0, cap: 0, dt: 0, n: 0, wait: 0 });
        s.q += this.queue.length * dt; s.busy += this.busy * dt;
        if (Number.isFinite(c)) s.cap += c * dt;
        s.dt += dt;
      }
      this.lastT = t;
    }
    /** ρ ที่สังเกตได้ = เวลาที่โต๊ะทำงาน / เวลาที่โต๊ะเปิด */
    get rho() { return this.accCap > 0 ? this.accBusy / this.accCap : NaN; }
    get Lq() { return this.lastT > 0 ? this.accQ / this.lastT : 0; }
    get L()  { return this.lastT > 0 ? this.accL / this.lastT : 0; }
  }

  /* ---------------------------------------------------------- sim */
  class Sim {
    /**
     * opt = {
     *   stations: [cfgสถานี...],
     *   routes:   [{from,to,p}],        from 'ARRIVAL' = ประตู, to 'EXIT' = ออก
     *   arrivalRate: t => ราย/นาที,
     *   lamMax: ค่าสูงสุดของ arrivalRate (ใช้ thinning),
     *   tStart, tEnd, seed,
     *   downtime: [{unit, at, minutes}],
     * }
     */
    constructor(opt) {
      this.opt = opt;
      this.reset();
    }

    reset() {
      const o = this.opt;
      /* แยกกระแสเลขสุ่มเป็น 3 สาย (common random numbers)
         เพื่อให้เปลี่ยนจำนวนโต๊ะแล้ว "ผู้ป่วยชุดเดิม" ยังมาเวลาเดิม
         จะได้เทียบสองสถานการณ์กันได้ตรง ๆ ไม่ปนกับความบังเอิญ */
      const seed = o.seed == null ? 42 : o.seed;
      this.randA = global.Q.rng(seed);              // เวลาที่คนมาถึง
      this.randR = global.Q.rng(seed + 7919);       // การเลือกเส้นทาง
      this.randS = global.Q.rng(seed + 104729);     // เวลาบริการ
      this.rand = this.randA;
      this.t = o.tStart || 0;
      this.tEnd = o.tEnd;
      this.ev = new Heap();
      this.st = {};
      this.order = [];
      (o.stations || []).forEach(c => {
        const s = new Station(Object.assign({}, c));
        s.lastT = this.t;
        this.st[s.id] = s; this.order.push(s.id);
      });
      this.entities = [];
      this.finished = [];
      this.nextId = 1;
      this.inTransit = [];           // {e, from, to, start, end}
      this.closed = {};              // หน่วยที่หยุดชั่วคราว
      this.scheduleArrival();
      (o.downtime || []).forEach(d => {
        this.ev.push({ t: d.at, fn: () => { this.closed[d.unit] = true; } });
        this.ev.push({ t: d.at + d.minutes, fn: () => {
          this.closed[d.unit] = false; this.dispatch(d.unit, this.t);
        } });
      });
    }

    /* ---------------- คนมาถึง: Poisson ที่อัตราเปลี่ยนตามเวลา (thinning) */
    scheduleArrival() {
      const o = this.opt;
      /* ถ้าระบุระยะห่างเวลามาถึงเอง ใช้กระบวนการต่ออายุ (renewal) แทน Poisson
         ทำให้ตั้ง ca² เป็นค่าใดก็ได้ ไม่ติดอยู่ที่ 1 */
      if (o.interarrival) {
        const ta = this.t + Math.max(o.interarrival(this.randA), 1e-6);
        if (ta > this.tEnd) return;
        this.ev.push({ t: ta, fn: () => this.arrive(ta) });
        return;
      }
      const lamMax = o.lamMax || 1;
      let t = this.t;
      const step = () => {
        t += global.Q.rexp(this.randA, 1 / lamMax);
        if (t > this.tEnd) return;
        if (this.randA() <= o.arrivalRate(t) / lamMax) {
          this.ev.push({ t, fn: () => this.arrive(t) });
        } else {
          this.ev.push({ t, fn: step });   // ปฏิเสธ แล้วลองใหม่
        }
      };
      step();
    }

    arrive(t) {
      const e = { id: this.nextId++, t0: t, waits: {}, svc: {}, visits: 0, path: [] };
      this.entities.push(e);
      this.scheduleArrival();
      const first = this.route('ARRIVAL');
      if (first) this.enter(first, e, t);
    }

    /* ---------------- ส่งต่อ */
    route(from) {
      const rs = (this.opt.routes || []).filter(r => r.from === from);
      if (!rs.length) return null;
      const tot = rs.reduce((a, r) => a + r.p, 0);
      let x = this.randR() * Math.max(tot, 1);
      for (const r of rs) { x -= r.p; if (x <= 0) return r.to; }
      return tot >= 1 ? rs[rs.length - 1].to : null;   // ถ้า p รวมไม่ถึง 1 ก็ออกจากระบบ
    }

    enter(id, e, t) {
      if (id === 'EXIT' || !this.st[id]) { this.exit(e, t); return; }
      const s = this.st[id];
      s.accrue(t);
      s.arrivals++;
      e.tQueue = t;
      e.path.push(id);
      s.queue.push(e);
      if (s.queue.length > s.qMax) s.qMax = s.queue.length;
      this.dispatch(id, t);
    }

    dispatch(id, t) {
      const s = this.st[id];
      if (!s || this.closed[id]) return;
      const cap = s.serversNow(t);
      while (s.queue.length && s.busy < cap) {
        s.accrue(t);
        const e = s.queue.shift();
        const w = t - e.tQueue;
        e.waits[id] = (e.waits[id] || 0) + w;
        s.waits.push(w);
        const b = Math.floor(t / 15) * 15;
        const bb = (s.byBin[b] = s.byBin[b] || { q: 0, busy: 0, cap: 0, dt: 0, n: 0, wait: 0 });
        bb.n++; bb.wait += w;
        const dur = Math.max(global.Q.rsvc(this.randS, s.serviceMean, s.scv), 0.01);
        s.svcTimes.push(dur);
        e.svc[id] = (e.svc[id] || 0) + dur;
        s.busy++;
        const rec = { e, start: t, end: t + dur };
        s.active.push(rec);
        this.ev.push({ t: t + dur, fn: () => this.complete(id, rec, t + dur) });
      }
    }

    complete(id, rec, t) {
      const s = this.st[id];
      s.accrue(t);
      s.busy--;
      const i = s.active.indexOf(rec);
      if (i >= 0) s.active.splice(i, 1);
      s.departures++;
      const e = rec.e;
      e.visits++;
      const next = this.route(id);
      this.dispatch(id, t);
      if (next === 'EXIT' || next == null) { this.exit(e, t); return; }
      // ถ้ามีเวลาเดินทางระหว่างหน่วย ให้แสดงเป็นการเคลื่อนที่
      const travel = this.opt.travel ? this.opt.travel(id, next) : 0;
      if (travel > 0) {
        const tr = { e, from: id, to: next, start: t, end: t + travel };
        this.inTransit.push(tr);
        this.ev.push({ t: t + travel, fn: () => {
          const k = this.inTransit.indexOf(tr);
          if (k >= 0) this.inTransit.splice(k, 1);
          this.enter(next, e, t + travel);
        } });
      } else {
        this.enter(next, e, t);
      }
    }

    exit(e, t) {
      e.tEnd = t;
      e.tat = t - e.t0;
      this.finished.push(e);
    }

    /* ---------------- เดินเวลา */
    /** เดินจนถึงเวลา tTarget (ไม่เกิน tEnd) */
    runUntil(tTarget) {
      const lim = Math.min(tTarget, this.tEnd);
      let guard = 0;
      while (this.ev.size && this.ev.peek().t <= lim) {
        const e = this.ev.pop();
        this.t = e.t;
        e.fn();
        if (++guard > 4e6) break;
      }
      this.t = lim;
      this.order.forEach(id => this.st[id].accrue(this.t));
      // เปิดโต๊ะเพิ่มตามกะ → ต้องลองจ่ายงานใหม่
      this.order.forEach(id => this.dispatch(id, this.t));
      return this;
    }
    /** เดินให้จบทั้งวัน */
    runAll() { return this.runUntil(this.tEnd); }

    /* ---------------- สรุปผล */
    summary() {
      const Qm = global.Q;
      const units = this.order.map(id => {
        const s = this.st[id];
        const w = Qm.stats(s.waits);
        const sv = Qm.stats(s.svcTimes);
        return {
          unit: id, name: s.name || id,
          arrivals: s.arrivals, departures: s.departures,
          rho: s.rho, Lq: s.Lq, L: s.L, qMax: s.qMax,
          waitMean: w.mean || 0, waitP50: w.p50 || 0, waitP90: w.p90 || 0, waitMax: w.max || 0,
          waitSum: s.waits.reduce((a, b) => a + b, 0),
          svcMean: sv.mean, svcScv: sv.scv,
          inQueue: s.queue.length, inService: s.busy,
        };
      });
      const totWait = units.reduce((a, u) => a + u.waitSum, 0) || 1;
      units.forEach(u => { u.waitShare = u.waitSum / totWait; });
      const tats = this.finished.map(e => e.tat);
      const ts = Qm.stats(tats);
      return {
        t: this.t, units,
        done: this.finished.length,
        inSystem: this.entities.length - this.finished.length,
        tat: { mean: ts.mean, p50: ts.p50, p90: ts.p90, max: ts.max, n: ts.n },
        tats,
      };
    }

    /** ภาพรวมสำหรับวาด — เบา เรียกได้ทุกเฟรม */
    snapshot() {
      return this.order.map(id => {
        const s = this.st[id];
        return {
          id, queue: s.queue.length, busy: s.busy,
          servers: s.serversNow(this.t), active: s.active, rho: s.rho,
          lastWait: s.waits.length ? s.waits[s.waits.length - 1] : 0,
        };
      });
    }
  }

  global.DES = { Sim, Station, Heap };
})(typeof window !== 'undefined' ? window : globalThis);
