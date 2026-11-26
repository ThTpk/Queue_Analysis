// ---------------------------------------------------------------------------
// Lab Q1 · คิวตรวจเลือด. ตัวแปรเดียวที่ขยับคือ "จำนวนโต๊ะเจาะเลือดช่วงเช้า"
// มันตัดสินว่ากำลังระบาย c/E[S] สู้กับคนที่มาถึง λ(t) ไหวหรือไม่
// และคิวที่เหลือค้างคือเวลาที่ผู้ป่วยต้องรอ  ที่มาของตัวเลข: ดู note ใน demo.json
// ---------------------------------------------------------------------------
const QS = {
  ES: 4.2,                 // เวลาเจาะเลือดเฉลี่ย นาที/ราย (วัดได้ 4.1611, cv 0.4482)
  CV: 0.4482,              // ความผันแปรของเวลาบริการ -> cs² = 0.2009
  OPEN: 390, CLOSE: 990,   // เปิด 06:30 ปิด 16:30 (นาทีของวัน)
  T0: 360, T1: 720,        // ช่วงที่ห้องทดลองนี้จำลอง: 06:00 – 12:00
  PEAK0: 390, PEAK1: 540,  // กะพีคตาม config: 06:30 – 09:00
  BASE: 6,                 // โต๊ะนอกกะพีค
  REAL: 7, CFG: 11,        // เปิดจริง 7 โต๊ะ · config ประกาศ 11 โต๊ะ
  COST: 250,               // บาท/โต๊ะ/ชั่วโมง
  RHOMAX: 0.85,            // เพดานที่ config ตั้งไว้
  DAY: 416.45,             // ผู้ป่วยต่อวัน
};
// ผู้ป่วยที่มาถึงในแต่ละช่วง 30 นาที (ราย/วัน) — ค่าจริง 20 วันทำการ
// 06:00 คือคนที่มายืนรอก่อนเปิดบริการ 49.55 ราย
const Q_PROF = {
  360: 49.55, 390: 84.40, 420: 74.65, 450: 49.55, 480: 32.25, 510: 18.90,
  540: 12.25, 570: 12.90, 600: 9.35, 630: 12.30, 660: 11.55, 690: 11.40,
  720: 11.70, 750: 9.30, 780: 6.85, 810: 5.55, 840: 2.75, 870: 1.25,
};
// λ(t) ราย/นาที ที่นาที t ของวัน
const qLam = (t) => (Q_PROF[Math.floor(t / 30) * 30] || 0) / 30;
// โต๊ะที่เปิดอยู่ ณ เวลา t เมื่อกะพีคเปิด c โต๊ะ และเริ่มให้บริการเวลา op
// ก่อนเวลาเปิด = 0 โต๊ะ (คนมายืนรอหน้าห้องได้ แต่ยังไม่มีใครรับ)
const qServers = (c, t, op) => (t < op ? 0 : t < QS.PEAK1 ? c : QS.BASE);
// กำลังระบาย ราย/นาที
const qCap = (c, t, op) => qServers(c, t, op) / QS.ES;
// โต๊ะ-นาทีที่ใช้ไปทั้งช่วง (ใช้คิดค่าใช้จ่าย)
function qDeskMin(c, op) {
  let d = 0;
  for (let t = QS.T0; t <= QS.T1 + 1e-9; t += 0.5) d += qServers(c, t, op) * 0.5;
  return d;
}

// เดินแบบจำลองของไหลทั้งช่วง: dQ/dt = λ(t) − μc(t) แต่ลงต่ำกว่าศูนย์ไม่ได้
// คืนตัวอย่างทุก ๆ ครึ่งนาที + สรุปของทั้งช่วง  (เก็บ cache ไว้เพราะเรียกทุกเฟรม)
const Q_CACHE = new Map();
function qRun(c, op) {
  const C = Math.round(c), OP = Math.round(op ?? QS.OPEN), key = C + '@' + OP;
  if (Q_CACHE.has(key)) return Q_CACHE.get(key);
  const dt = 0.5, S = [];
  let Q = 0, area = 0, served = 0, qMax = 0, qMaxT = QS.T0, clearT = null;
  for (let t = QS.T0; t <= QS.T1 + 1e-9; t += dt) {
    const lam = qLam(t), cap = qCap(C, t, OP), n = qServers(C, t, OP);
    const out = Math.min(cap, Q / dt + lam);         // ระบายได้ไม่เกินที่มีอยู่จริง
    const busy = cap > 0 ? Math.min(1, out / cap) : 0;
    S.push({ t, Q, lam, cap, n, rho: busy, wait: cap > 0 ? Q / cap : Infinity });
    if (Q > qMax) { qMax = Q; qMaxT = t; }
    if (Q >= 0.5) clearT = t + dt;                   // ครั้งสุดท้ายที่ยังมีคนรอ = เวลาที่คิวหมดจริง
    area += Q * dt; served += out * dt;
    Q = Math.max(0, Q + (lam - cap) * dt);
  }
  const arrived = Object.keys(Q_PROF).map(Number)
    .filter(b => b >= QS.T0 && b < QS.T1).reduce((a, b) => a + Q_PROF[b], 0);
  const live = S.filter(s => s.n > 0);
  const deskMin = qDeskMin(C, OP);
  const r = {
    c: C, op: OP, S, qMax, qMaxT, clearT, arrived, served,
    waitMean: area / Math.max(arrived, 1),           // พื้นที่ใต้กราฟคิว ÷ จำนวนคน
    cost: (deskMin / 60) * QS.COST,
    extra: ((deskMin - qDeskMin(QS.REAL, QS.OPEN)) / 60) * QS.COST,
    rhoAvg: live.reduce((x, s) => x + s.rho, 0) / Math.max(live.length, 1),
    qOpen: 0,
  };
  r.qOpen = (S.find(s => s.t >= OP) || { Q: 0 }).Q;   // คิวที่รออยู่แล้วตอนเปิดประตู
  r.res = qVerdict(r);
  Q_CACHE.set(key, r);
  return r;
}
// คำตัดสินของแผน: ดูทั้งเวลารอที่เกิด และโต๊ะที่เปิดทิ้งไว้เปล่า ๆ
const qVerdict = (r) =>
  r.waitMean >= 25 ? ['คิวล้น', 'คนมาเร็วกว่าที่ระบายได้ คิวโตไม่หยุด', 'coral']
  : r.waitMean >= 10 ? ['ยังรอนาน', 'คิวยังสะสมช่วงเช้า ยังไม่พอ', 'amber']
  : r.rhoAvg < 0.42 ? ['เปิดเกินจำเป็น', 'คิวหมดแล้ว แต่โต๊ะว่างเกินครึ่งเวลา', 'amber']
  : ['พอดี', 'คิวสั้น และโต๊ะไม่ว่างเปล่า', 'lime'];

// สถานะ ณ นาที tm ของวัน
function qAt(c, op, tm) {
  const r = qRun(c, op), i = Math.max(0, Math.min(r.S.length - 1, Math.round((tm - QS.T0) / 0.5)));
  const s = r.S[i];
  return Object.assign({}, s, { run: r, open: tm >= r.op, tm });
}
// ตรวจด้วยมือ: 7 โต๊ะ ระบาย 7/4.2 = 1.667 ราย/นาที ขณะที่ 06:30–07:00 คนมา 84.4/30 = 2.813
// ส่วนเกิน 1.146 ราย/นาที × 30 นาที = คิวเพิ่ม 34 คน ทับกับ 49.55 คนที่รออยู่ก่อนเปิด
