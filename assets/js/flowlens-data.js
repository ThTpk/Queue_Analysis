/* ============================================================
   flowlens-data.js — ข้อมูลกรณีศึกษา FlowLens (ชุด demo_basic)

   ที่มาของตัวเลขทุกตัวในไฟล์นี้
   • โครงสร้างหน่วย/โต๊ะ/กะ/ต้นทุน/เส้นทาง
       flowlens/samples/demo_basic/config.yaml
   • เวลาบริการจริง (mean, cv), ρ รายชั่วโมง, เวลารอ, คิว, TAT, โปรไฟล์คนมา
       flowlens/samples/demo_basic/answer_key.json  (seed 42, 20 วันทำการ,
       2026-01-05 ถึง 2026-01-30, ผู้ป่วย 8,329 ราย = 416.45 ราย/วัน)
   • ปัญหาที่ฝังไว้ในชุดข้อมูล
       planted_problems: understaffed @ PHLEB — เปิดจริงแค่ 7 โต๊ะ ช่วง 06:30–09:00
       ขณะที่ config ประกาศไว้ 11 โต๊ะ
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------- โครงการ */
  const project = {
    name: 'OPD Blood Test',
    openFrom: 6 * 60 + 30,     // 06:30
    openTo: 16 * 60 + 30,      // 16:30
    days: 20,
    patientsTotal: 8329,
    patientsPerDay: 416.45,
    tat: { p50: 71.97, p90: 96.75, mean: 65.90 },
    targets: { maxUtilization: 0.85 },
    weights: { utilization: 0.4, wait_share: 0.4, wait_growth: 0.2 },
  };

  /* ---------------------------------------------------------- หน่วยบริการ */
  /* serversBase / schedule มาจาก config.yaml
     serversReal = จำนวนที่ "เปิดจริง" ในข้อมูล (ต่างจาก config เฉพาะ PHLEB) */
  const units = [
    {
      id: 'REG', name: 'ลงทะเบียน', short: 'ลงทะเบียน', stage: 'pre', type: 'service',
      serviceMean: 2.4, cv: 0.35, serversBase: 4,
      schedule: [{ from: 390, to: 540, servers: 9 }],
      valueAdded: false, cost: 180,
      truth: { rhoPeak: 0.9966, rhoPeakHour: 6, rhoMean: 0.2464,
               waitMean: 3.951, waitP50: 0.0, waitP90: 13.998, waitShare: 0.1056,
               queueMax: 59, queueP90: 4.1, serviceMean: 2.4112, serviceCv: 0.3497,
               events: 8329 },
      rhoByHour: { 6: .9966, 7: .6556, 8: .2329, 9: .2548, 10: .2229, 11: .2325,
                   12: .2104, 13: .1246, 14: .0446, 15: 0, 16: 0 },
    },
    {
      id: 'PHLEB', name: 'จุดเจาะเลือด', short: 'เจาะเลือด', stage: 'pre', type: 'service',
      serviceMean: 4.2, cv: 0.45, serversBase: 6,
      schedule: [{ from: 390, to: 540, servers: 11 }],   // config ประกาศ 11
      serversRealPeak: 7,                                 // แต่ข้อมูลเห็น 7
      valueAdded: true, cost: 250,
      truth: { rhoPeak: 1.0, rhoPeakHour: 7, rhoMean: 0.4405,
               waitMean: 31.385, waitP50: 31.025, waitP90: 66.271, waitShare: 0.8388,
               queueMax: 140, queueP90: 88.0, serviceMean: 4.1611, serviceCv: 0.4482,
               events: 8329 },
      rhoByHour: { 6: .9488, 7: 1.0, 8: 1.0, 9: .8829, 10: .3422, 11: .2611,
                   12: .2519, 13: .1451, 14: .0556, 15: .0003, 16: 0 },
      planted: 'understaffed',
    },
    {
      id: 'TRANSPORT', name: 'ส่งสิ่งส่งตรวจ', short: 'ขนส่ง', stage: 'pre', type: 'transport',
      serviceMean: 4.0, cv: 0.25, serversBase: 1, schedule: [],
      valueAdded: false, cost: 0, mode: 'continuous',
      truth: { rhoPeak: NaN, waitMean: 0, waitP50: 0, waitP90: 0, waitShare: 0,
               serviceMean: 3.9825, serviceCv: 0.2484, events: 8329 },
      rhoByHour: {},
    },
    {
      id: 'RECEIVE', name: 'รับและปั่นแยกสิ่งส่งตรวจ', short: 'รับ/ปั่นแยก', stage: 'pre', type: 'service',
      serviceMean: 3.0, cv: 0.40, serversBase: 4,
      schedule: [{ from: 420, to: 600, servers: 8 }],
      valueAdded: false, cost: 200,
      truth: { rhoPeak: 0.7017, rhoPeakHour: 6, rhoMean: 0.3399,
               waitMean: 0.325, waitP50: 0, waitP90: 0.879, waitShare: 0.0087,
               queueMax: 14, queueP90: 0, serviceMean: 3.0110, serviceCv: 0.4023,
               events: 8329 },
      rhoByHour: { 6: .7017, 7: .6984, 8: .6149, 9: .5241, 10: .3968, 11: .2881,
                   12: .2798, 13: .1710, 14: .0773, 15: .0037, 16: 0 },
    },
    {
      id: 'CHEM', name: 'เครื่องเคมีคลินิก', short: 'เคมีคลินิก', stage: 'analytic', type: 'service',
      serviceMean: 15.0, cv: 0.25, serversBase: 20, schedule: [],
      valueAdded: true, cost: 400,
      truth: { rhoPeak: 0.8148, rhoPeakHour: 7, rhoMean: 0.3226,
               waitMean: 0.082, waitP50: 0, waitP90: 0, waitShare: 0.0014,
               queueMax: 6, queueP90: 0, serviceMean: 14.9453, serviceCv: 0.2470,
               events: 5175 },
      rhoByHour: { 6: .2400, 7: .8148, 8: .7711, 9: .6598, 10: .2937, 11: .1959,
                   12: .1828, 13: .1234, 14: .0580, 15: .0053, 16: 0 },
      downtime: { type: 'qc', at: 360, minutes: 20 },
    },
    {
      id: 'HEMA', name: 'เครื่องโลหิตวิทยา', short: 'โลหิตวิทยา', stage: 'analytic', type: 'service',
      serviceMean: 8.0, cv: 0.30, serversBase: 7, schedule: [],
      valueAdded: true, cost: 350,
      truth: { rhoPeak: 0.76, rhoPeakHour: 7, rhoMean: 0.3010,
               waitMean: 0.410, waitP50: 0, waitP90: 1.632, waitShare: 0.0041,
               queueMax: 7, queueP90: 0, serviceMean: 8.0014, serviceCv: 0.2985,
               events: 3154 },
      rhoByHour: { 6: .2658, 7: .7600, 8: .7194, 9: .6486, 10: .2811, 11: .1595,
                   12: .1615, 13: .0994, 14: .0446, 15: .0026, 16: 0 },
    },
    {
      id: 'VERIFY', name: 'ทวนสอบและยืนยันผล', short: 'ทวนสอบผล', stage: 'post', type: 'service',
      serviceMean: 2.0, cv: 0.50, serversBase: 3,
      schedule: [{ from: 480, to: 720, servers: 6 }],
      valueAdded: true, cost: 320,
      truth: { rhoPeak: 0.9614, rhoPeakHour: 7, rhoMean: 0.3103,
               waitMean: 1.480, waitP50: 0, waitP90: 6.483, waitShare: 0.0395,
               queueMax: 27, queueP90: 1.0, serviceMean: 1.9990, serviceCv: 0.5029,
               events: 8329 },
      rhoByHour: { 6: .1695, 7: .9614, 8: .6492, 9: .5031, 10: .2392, 11: .1389,
                   12: .2558, 13: .1697, 14: .0883, 15: .0100, 16: 0 },
    },
    {
      id: 'RESULT', name: 'ส่งผลเข้า HIS', short: 'ส่งผล', stage: 'post', type: 'service',
      serviceMean: 0.6, cv: 0.30, serversBase: 2, schedule: [],
      valueAdded: false, cost: 180,
      truth: { rhoPeak: 0.5787, rhoPeakHour: 8, rhoMean: 0.2081,
               waitMean: 0.070, waitP50: 0, waitP90: 0.281, waitShare: 0.0019,
               queueMax: 6, queueP90: 0, serviceMean: 0.5985, serviceCv: 0.3012,
               events: 8329 },
      rhoByHour: { 6: .0560, 7: .4242, 8: .5787, 9: .4629, 10: .2117, 11: .1221,
                   12: .1225, 13: .0783, 14: .0442, 15: .0063, 16: 0 },
    },
  ];

  const byId = {};
  units.forEach(u => { byId[u.id] = u; });

  /* ---------------------------------------------------------- เส้นทางงาน */
  const routes = [
    { from: 'ARRIVAL',   to: 'REG',       p: 1.00 },
    { from: 'REG',       to: 'PHLEB',     p: 1.00 },
    { from: 'PHLEB',     to: 'TRANSPORT', p: 1.00 },
    { from: 'TRANSPORT', to: 'RECEIVE',   p: 1.00 },
    { from: 'RECEIVE',   to: 'CHEM',      p: 0.62 },
    { from: 'RECEIVE',   to: 'HEMA',      p: 0.38 },
    { from: 'CHEM',      to: 'VERIFY',    p: 1.00 },
    { from: 'HEMA',      to: 'VERIFY',    p: 1.00 },
    { from: 'VERIFY',    to: 'RESULT',    p: 1.00 },
    { from: 'RESULT',    to: 'EXIT',      p: 1.00 },
  ];
  const order = ['REG', 'PHLEB', 'TRANSPORT', 'RECEIVE', 'CHEM', 'HEMA', 'VERIFY', 'RESULT'];

  /* ---------------------------------------------------------- คนมาถึง */
  /* arrival_true.normal.profile — ราย/วัน ต่อช่วง 30 นาที (คีย์ = นาทีของวัน)
     06:00 คือช่วงก่อนเปิดบริการ คนมารอหน้าห้องแล้ว 49.55 ราย/วัน */
  const arrivalProfile30 = {
    360: 49.55, 390: 84.40, 420: 74.65, 450: 49.55, 480: 32.25, 510: 18.90,
    540: 12.25, 570: 12.90, 600: 9.35, 630: 12.30, 660: 11.55, 690: 11.40,
    720: 11.70, 750: 9.30, 780: 6.85, 810: 5.55, 840: 2.75, 870: 1.25,
  };
  const arrivalBins = Object.keys(arrivalProfile30).map(Number).sort((a, b) => a - b);

  /** λ ที่ประตู (ราย/นาที) ณ เวลา t นาทีของวัน */
  function arrivalRate(t) {
    const b = Math.floor(t / 30) * 30;
    return (arrivalProfile30[b] || 0) / 30;
  }

  /** จำนวนโต๊ะที่ "เปิดจริง" ของหน่วย u ณ เวลา t (ใช้ serversRealPeak ถ้ามี) */
  function serversAt(u, t, useConfig) {
    for (const s of u.schedule || []) {
      if (t >= s.from && t < s.to) {
        return (!useConfig && u.serversRealPeak != null) ? u.serversRealPeak : s.servers;
      }
    }
    return u.serversBase;
  }

  /** λ ที่แต่ละหน่วยได้รับ (ราย/นาที) ณ เวลา t — สมมติ steady state ของช่วงนั้น */
  function unitLambdaAt(t, reworkRate) {
    const lam0 = arrivalRate(t);
    const r = reworkRate || 0;
    const ext = { REG: lam0 };
    const rts = routes
      .filter(x => x.from !== 'ARRIVAL' && x.to !== 'EXIT')
      .map(x => ({ from: x.from, to: x.to, p: x.p }));
    if (r > 0) rts.push({ from: 'PHLEB', to: 'PHLEB', p: r });
    return global.Q.solveFlow(order, ext, rts);
  }

  /** สัดส่วนเวลารอของแต่ละหน่วย (ค่าจริงจาก answer_key) */
  const waitShares = {};
  units.forEach(u => { waitShares[u.id] = u.truth.waitShare; });

  /** ความชันเวลารอต่อจำนวนคน (นาที/ราย) — ประมาณจากคิวจริง เพื่อใช้ใน Bottleneck Score
      คำนวณแบบเดียวกับ flowlens :: wait_growth แต่สรุปมาเป็นค่าเดียวต่อหน่วย */
  const waitGrowth = {
    REG: 0.019, PHLEB: 0.181, TRANSPORT: 0.0, RECEIVE: 0.002,
    CHEM: 0.001, HEMA: 0.002, VERIFY: 0.009, RESULT: 0.0005,
  };

  /** ข้อมูลพร้อมใช้สำหรับคำนวณ Bottleneck Score */
  function scoreInput() {
    return units.map(u => ({
      unit: u.id, name: u.name,
      rho_peak: u.truth.rhoPeak,
      wait_share: u.truth.waitShare,
      wait_growth: waitGrowth[u.id],
      wait_p90: u.truth.waitP90,
    }));
  }

  /* ---------------------------------------------------------- สาเหตุ 7 แบบ */
  const causeCatalog = [
    { key: 'capacity',       name: 'กำลังไม่พอ',           theory: 'Queueing, TOC',
      fix: 'เพิ่มโต๊ะเฉพาะช่วงพีค ตามจำนวนที่คำนวณได้' },
    { key: 'shift_mismatch', name: 'คนไม่ตรงกับช่วงคนมา',  theory: 'Queueing',
      fix: 'เลื่อนกะเข้าเร็วขึ้น ย้ายคนจากช่วงว่างมาช่วงพีค' },
    { key: 'variability',    name: 'ความผันแปรสูง',        theory: 'Lean, Six Sigma',
      fix: 'standard work, 5S, ถ่ายทอดวิธีจากคนที่เร็วสุด แยกคิวเคสยาก' },
    { key: 'batching',       name: 'ส่งเป็นชุด',            theory: 'Lean',
      fix: 'ส่งทีละหลอด ลดขนาดชุด หรือใช้ท่อลม' },
    { key: 'rework',         name: 'งานทำซ้ำ',             theory: 'Six Sigma',
      fix: 'ทำ DMAIC กับสาเหตุอันดับต้นของ Pareto' },
    { key: 'downtime',       name: 'เครื่องหยุดช่วงพีค',    theory: 'TOC',
      fix: 'ย้าย QC ไปก่อนเปิดบริการ สลับเครื่องสำรอง' },
    { key: 'blocking',       name: 'หน่วยถัดไปบล็อก',       theory: 'TOC',
      fix: 'แก้ที่หน่วยถัดไป ไม่ใช่หน่วยนี้' },
  ];

  global.FL = {
    project, units, byId, routes, order,
    arrivalProfile30, arrivalBins, arrivalRate,
    serversAt, unitLambdaAt, waitShares, waitGrowth, scoreInput, causeCatalog,
  };
})(typeof window !== 'undefined' ? window : globalThis);
