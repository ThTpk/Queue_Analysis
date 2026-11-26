// ---------------------------------------------------------------------------
// Lab Q1 · คิวตรวจเลือด. เช้าเดียวกัน คนกลุ่มเดียวกัน เปลี่ยนแค่จำนวนโต๊ะกับเวลาเปิด
// 7 โต๊ะ (ของจริง) · 11 โต๊ะ (ตามแผน) · 16 โต๊ะ (ทุ่มเงิน) · 9 โต๊ะแต่เปิดเร็วขึ้น 30 นาที
// แล้วผู้ชมลองเอง: หมุนโต๊ะ เลื่อนเวลาเปิด กด P เพื่อเปิดบริการหนึ่งเช้า
// ---------------------------------------------------------------------------
const QCH = [
  { id: 'real', btn: '7 โต๊ะ · ของจริง', c: 7, op: 390,
    tip: ['เปิดจริงแค่ 7 โต๊ะ ตั้งแต่ 06:30', 'คนมาเร็วกว่าที่ระบายได้ คิวจึงโตไม่หยุด'] },
  { id: 'cfg', btn: '11 โต๊ะ · ตามแผน', c: 11, op: 390,
    tip: ['เปิดครบ 11 โต๊ะตามที่แผนเขียนไว้', 'คิวสั้นลงครึ่งหนึ่ง แต่ยังไม่หมดจนถึง 08:14'] },
  { id: 'max', btn: '16 โต๊ะ · ทุ่มเงิน', c: 16, op: 390,
    tip: ['เติมจนเต็มห้อง 16 โต๊ะ จ่ายเพิ่มเท่าตัว', 'คิว 50 คนที่รอตั้งแต่ก่อนเปิด ยังอยู่ที่เดิม'] },
  { id: 'early', btn: '9 โต๊ะ · เปิด 06:00', c: 9, op: 360,
    tip: ['เปิดเร็วขึ้นครึ่งชั่วโมง ใช้โต๊ะน้อยกว่าเดิม', 'ไม่มีคิวตั้งต้น จึงไม่มีอะไรให้ไล่ตาม'] },
];
const QCK = { lime: BAY_BG.lime, amber: BAY_BG.amber, coral: BAY_BG.coral };
const Q_LEAD = 1.0, Q_HOLD = 3.0, Q_RATE = 60, Q_LIVE_RATE = 60;   // นาทีจำลองต่อวินาทีวิดีโอ
const Q_VID = (QS.T1 - QS.T0) / Q_RATE;                             // 6 วินาทีต่อหนึ่งเช้า
const qClock = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function qInsts() {
  return [
    place('qPrepa', 'sign', { code: "ทางเข้า(416 /* ราย/วัน */);" }),
    place('qNaalika', 'clock', { code: 'นาฬิกา(06:00);' }),
    place('qSaiphan', 'belt', { code: 'ทางเดินเข้า();' }),
    place('qChong', 'lane', { code: 'แถวคอย(/* คิว = แถว */);' }),
    place('qJaolueat', 'booth', { code: 'จุดเจาะเลือด(7 /* โต๊ะ */, 4.2 /* นาที */);' }),
    place('qRang', 'rail', { code: 'รางส่งสิ่งส่งตรวจ(4 /* นาที */);' }),
    place('qHongLab', 'lab', { code: 'ห้องแล็บ(เคมี 62%, โลหิต 38%);' }),
  ];
}

function qTimeline(params) {
  const insts = qInsts(), byId = Object.fromEntries(insts.map(i => [i.id, i]));
  const overview = fitCam([[-28, -11, 0], [32, 8, 0], [-27, 0, 7.5], [0, 0, 10], [14, 6, 3], [30, 0, 8]], 0.95);
  const close = fitCam([[-19, -6, 0], [16, 6, 0], [-18, 0, 10], [0, 0, 10], [14, 5, 4]], 1.0);
  const base = { insts, byId, overview, close, desk: params.desk ?? 7, open: params.open ?? 390 };
  if (params.live) return Object.assign(base, { T: { end: 1800, caption: null, labelsOut: 0 }, sched: {}, total: insts.length, CH: [], live: true, tabs: [], tabAt: () => 0 });
  const { sched, end, total } = scheduleBuild(insts, 0.35);
  let t = end + 0.6;
  const CH = QCH.map(ch => {
    const o = Object.assign({}, ch, { t0: t, vid: Q_VID, run: qRun(ch.c, ch.op) });
    t += Q_LEAD + Q_VID + Q_HOLD; o.t1 = t; return o;
  });
  const T = { buildEnd: end, caption: t + 0.2 }; T.end = T.caption + 5.2; T.labelsOut = CH[0].t0 + 0.4;
  return Object.assign(base, { T, sched, total, CH, live: false, tabs: [], tabAt: () => 0 });
}
function qChapter(TL, t) { for (let k = TL.CH.length - 1; k >= 0; k--) if (t >= TL.CH[k].t0) return k; return -1; }

// live: กด P หนึ่งครั้ง = เปิดบริการหนึ่งเช้า ด้วยค่าที่ตั้งไว้ ณ วินาทีนั้น
function qLiveRuns(params) {
  const out = []; let prev = 0;
  for (const e of LIVE.ev) {
    if (e[1] === 'run' && e[2] === 1 && e[0] >= prev) {
      const c = liveVal(LIVE.ev, 'desk', e[0], params.desk ?? 7);
      const op = liveVal(LIVE.ev, 'open', e[0], params.open ?? 390);
      out.push({ tp: e[0], c: Math.round(c), op: Math.round(op) });
      prev = e[0] + Q_VID + 0.3;
    }
  }
  return out;
}

function qState(TL, t) {
  const st = { t };
  partsAt(TL, t, st);
  let k = -1, ch = null, u = 0, cur = null, tm = QS.T0, run = null, done = false;

  if (TL.live) {
    const runs = qLiveRuns({ desk: TL.desk, open: TL.open });
    cur = runs.filter(r => r.tp <= t).pop();
    st.deskNow = Math.round(liveVal(LIVE.ev, 'desk', t, TL.desk));
    st.openNow = Math.round(liveVal(LIVE.ev, 'open', t, TL.open));
    if (cur) {
      tm = Math.min(QS.T1, QS.T0 + (t - cur.tp) * Q_LIVE_RATE);
      run = qRun(cur.c, cur.op); done = tm >= QS.T1 - 0.01;
    } else { run = qRun(st.deskNow, st.openNow); tm = QS.T0; }
    st.tally = runs.filter(r => r.tp <= t).map(r => ({ c: r.c, op: r.op, run: qRun(r.c, r.op) })).slice(-4);
    st.cam = TL.close;
  } else {
    k = qChapter(TL, t); ch = TL.CH[k]; u = ch ? t - ch.t0 : 0;
    if (ch) {
      tm = clamp(QS.T0 + (u - Q_LEAD) * Q_RATE, QS.T0, QS.T1);
      run = ch.run; done = u >= Q_LEAD + Q_VID;
      cur = { c: ch.c, op: ch.op };
    } else { run = qRun(QCH[0].c, QCH[0].op); }
    st.tally = TL.CH.slice(0, Math.max(0, k + 1)).map((c, i) => ({ c: c.c, op: c.op, run: c.run, done: i < k || done }));
    st.cam = mixCam(TL.overview, TL.close, easeInOut(seg(t, TL.CH[0].t0 - 0.6, TL.CH[0].t0 + 0.8)));
    if (t >= TL.T.caption - 0.5) st.cam = mixCam(TL.close, TL.overview, easeInOut(seg(t, TL.T.caption - 0.5, TL.T.caption + 1.0)));
  }

  const c = cur ? cur.c : (st.deskNow || 7), op = cur ? cur.op : (st.openNow || 390);
  const s = qAt(c, op, tm);
  st.k = k; st.ch = ch; st.u = u; st.run = run; st.cur = cur; st.doneRun = done;
  st.tm = tm; st.clock = qClock(tm); st.svcOpen = tm >= op;
  st.openTxt = `เปิด ${qClock(op)} · ${c} โต๊ะ`;
  st.qN = s.Q; st.lamNow = s.lam; st.capNow = s.cap; st.waitNow = s.wait;
  st.nDesk = s.n; st.busyN = Math.round(Math.min(s.n, s.rho * s.n));
  st.rhoNow = s.rho;
  st.phase = (t * 0.85) % 1;
  st.onRail = st.busyN > 0 ? 3 : 0;
  st.labOn = st.busyN > 0;
  st.donePx = run ? Math.max(0, (run.served || 0) * clamp((tm - QS.T0) / (QS.T1 - QS.T0)) ) : 0;
  // จำนวนที่ส่งผลไปแล้ว: อินทิเกรตจากตัวอย่างจนถึงเวลานี้
  if (run) {
    let acc = 0;
    for (const p of run.S) { if (p.t > tm) break; acc += Math.min(p.cap, p.Q / 0.5 + p.lam) * 0.5; }
    st.donePx = acc;
  }
  return st;
}

const DEMO = {
  id: 'CIV', num: 'Q1', title: 'คิวตรวจเลือด', tagline: 'มา · ต่อแถว · เจาะ', category: 'โรงพยาบาล', brand: 'SIMULAB',
  plate: ['SIMULAB · คิวตรวจเลือด · LAB Q1', 'Lab Q1 · ทำไมคิวเจาะเลือดยาว ทั้งที่โต๊ะว่างทั้งบ่าย'],
  chips: ['416 ราย/วัน · เจาะ 4.2 นาที/ราย · เปิด 06:30', 'LAB Q1 · ทฤษฎีคิว'],
  caption: 'คิวที่รออยู่ก่อนเปิดประตู เติมโต๊ะเท่าไรก็ลบไม่ได้',
  intro: { seconds: 5, lines: ['ทำไมคิวเจาะเลือดยาวร้อยคน', 'ทั้งที่โต๊ะว่างทั้งบ่าย?'], pill: 'LAB Q1 · คิวและคอขวด', src: (TL) => TL.T.caption, rate: 0.8 },
  major: ['lane', 'booth', 'lab'],
  params: { desk: 7, open: 390 },
  knobs: [
    { key: 'desk', label: 'โต๊ะเจาะเลือด', min: 4, max: 16, step: 1, fmt: (v) => `${v} โต๊ะ · ระบาย ${(v / QS.ES).toFixed(2)} ราย/นาที` },
    { key: 'open', label: 'เปิดบริการ', min: 345, max: 420, step: 15, fmt: (v) => qClock(v) },
  ],
  live: { label: '▶ เปิดบริการหนึ่งเช้า', controls: [{ key: 'run', label: 'เริ่มเช้าใหม่', keys: ['KeyP'], kbd: 'P' }] },
  timeline: (p) => qTimeline(p || {}),
  steps: (TL) => [['0 · สร้างห้องแล็บ', 0], ...TL.CH.map((c, i) => [`${i + 1} · ${c.btn}`, c.t0 - 0.05])],
  state: (TL, t) => qState(TL, t),

  drawScene(G, st, TL) {
    drawTapete(G, st, { x0: -32, x1: 36, y0: -14, y1: 12, plate: 'ห้องเจาะเลือดผู้ป่วยนอก · LAB Q1' });
    const base = new Xf();
    drawAssembly(G, st, TL.insts, base);
    return base;
  },

  // คนที่ยืนรอ: เคลื่อนที่ จึงวาดที่นี่ ไม่ใช่ใน asset
  drawFx(G, st, TL, base) {
    const n = Math.round(st.qN || 0);
    if (n <= 0) return;
    const shown = Math.min(n, QL_MAX);
    for (let i = 0; i < shown; i++) {
      const [x, y, z, outside] = qLanePos(i);
      const hot = i >= QL_CAP;
      const m = hot ? QC.hot : QC.skin;
      drawCyl(G, base, [x, y, z], 'z', 0.33, 0.95, m, { seg: 9, lw: 0.9 });
      if (!outside) drawSphere(G, base, [x, y, z + 1.26], 0.3, m, { lw: 0.8 });
    }
    if (n > QL_MAX) {
      const c = G.ctx, P = G.cam.p(base.p([QG.lane.x0 - 2, 0, 2.4]));
      pill(c, P[0], P[1], `+${n - QL_MAX} คน ล้นออกนอกห้อง`, { align: 'center', valign: 'middle', bg: '#ff9e93', size: 12, padY: 6 });
    }
  },

  labelAlpha(TL, inst, t) { return TL.live ? 0 : labelAlphaDefault(TL, inst, t); },

  drawNotes(G, st, TL) {
    const c = G.ctx, P = (p) => G.cam.p(p), ch = st.ch, u = st.u;
    const fade = (a, b) => seg(u, a, a + 0.25) * (1 - seg(u, b - 0.25, b));
    const cap = !TL.live && st.t >= TL.T.caption - 0.3;

    if (ch && !cap) {
      const endV = Q_LEAD + Q_VID, dur = ch.t1 - ch.t0;
      const tail = [qLaneX(st.qN), 0, QG.lane.z0 + 0.5];
      if (st.qN > 6) callout(c, P([tail[0], tail[1], tail[2] + 1.6]), -230, -52,
        `ท้ายแถว · ${Math.round(st.qN)} คน`, fade(Q_LEAD + 0.5, endV),
        st.qN > 60 ? '#ff9e93' : st.qN > 25 ? '#ffcf6b' : '#c8f04a');
      if (st.nDesk > 0) callout(c, P([QG.booth.x0 + QG.booth.pitch * 1.5, -5.4, 3.2]), 180, 70,
        `${st.nDesk} โต๊ะ · ระบาย ${(st.capNow).toFixed(2)} ราย/นาที`, fade(Q_LEAD + 1.1, endV), '#ffffff');
      if (!st.svcOpen && st.qN > 4) callout(c, P([QG.lane.x1 + 1, 0, QG.lane.z1 + 1.5]), 150, -80,
        `ยังไม่เปิด · รออยู่แล้ว ${Math.round(st.qN)} คน`, fade(0.4, Q_LEAD + 1.2), '#ff9e93');
      if (st.doneRun) {
        const r = ch.run, a = fade(endV, dur);
        callout(c, P([-6, 0, 11.5]), -210, -60,
          `รอเฉลี่ย ${r.waitMean.toFixed(0)} นาที · คิวหมด ${qClock(r.clearT || QS.T1)}`, a,
          r.res[2] === 'lime' ? '#c8f04a' : r.res[2] === 'amber' ? '#ffcf6b' : '#ff9e93');
      }
      tipCard(c, CARD.x + 30, 150, ch.tip, fade(Q_LEAD + 0.5, dur - 0.05),
        `${ch.c} โต๊ะ · เปิด ${qClock(ch.op)}`);
    }

    if (cap) {
      const a = seg(st.t, TL.T.caption + 0.5, TL.T.caption + 0.9);
      TL.CH.forEach((cc, i) => {
        const r = cc.run;
        pill(c, CARD.x + 30, 152 + i * 46,
          `${i + 1} · ${cc.c} โต๊ะ ${qClock(cc.op)} · รอ ${r.waitMean.toFixed(0)} น. · ${r.res[0]}`,
          { bg: QCK[r.res[2]], size: 13.5, padY: 9, alpha: a * seg(st.t, TL.T.caption + 0.5 + i * 0.14, TL.T.caption + 0.8 + i * 0.14) });
      });
    }

    if (TL.live) {
      const r = st.run, running = st.cur && !st.doneRun;
      tipCard(c, CARD.x + 30, 150,
        running ? [`${st.cur.c} โต๊ะ เปิด ${qClock(st.cur.op)} · ${st.clock}`, 'ดูว่าแถวยาวขึ้นหรือสั้นลง']
                : ['หมุนโต๊ะ เลื่อนเวลาเปิด แล้วกด P', 'ลองทำให้รอเฉลี่ยต่ำกว่า 10 นาที'],
        1, 'ตาคุณแล้ว');
      if (st.cur && st.doneRun) {
        callout(c, P([-6, 0, 11.5]), -210, -60,
          `รอเฉลี่ย ${r.waitMean.toFixed(1)} นาที · ${r.res[0]}`, 1,
          r.res[2] === 'lime' ? '#c8f04a' : r.res[2] === 'amber' ? '#ffcf6b' : '#ff9e93');
      }
    }
  },

  drawBays(c, TL, st) {
    const r = st.run, qN = st.qN || 0;
    // BAY 01 · แถวคอยตอนนี้
    const qs = qN >= 60 ? ['ล้น', BAY_BG.coral] : qN >= 25 ? ['ยาว', BAY_BG.amber] : qN >= 1 ? ['สั้น', BAY_BG.lime] : ['ว่าง', BAY_BG.grey];
    let b = bayFrame(c, 0, 'BAY 01 · แถวคอยตอนนี้', qs[0], qs[1]);
    bigValue(c, b, Math.round(qN).toString(), 'คน', `${st.clock} · ${st.svcOpen ? 'เปิดบริการแล้ว' : 'ยังไม่เปิด'}`);
    const bx = b.x + 14, bw = b.w - 28, by = b.y + 128, XQ = (n) => bx + (clamp(n, 0, 120) / 120) * bw;
    c.save();
    for (const [a0, a1, col] of [[0, 15, '#c8f04a'], [15, 40, '#ffcf6b'], [40, 120, '#ff9e93']]) { c.fillStyle = col; c.fillRect(XQ(a0), by, XQ(a1) - XQ(a0), 18); }
    c.lineWidth = 1.5; c.strokeStyle = INK; c.strokeRect(bx, by, bw, 18);
    c.font = `700 9.5px ${FONT_MONO}`; c.fillStyle = '#545867'; c.textAlign = 'center';
    for (const n of [0, 40, 80, 120]) c.fillText(String(n), XQ(n), by + 32);
    c.fillText('คนที่ยืนรอ', XQ(60), by + 46);
    const mx = XQ(qN); c.fillStyle = INK; c.beginPath(); c.moveTo(mx, by - 2); c.lineTo(mx - 7, by - 12); c.lineTo(mx + 7, by - 12); c.closePath(); c.fill(); c.fillRect(mx - 1.5, by - 2, 3, 22);
    c.textAlign = 'left'; c.restore();

    // BAY 02 · คนเข้า เทียบ คนออก
    const lam = st.lamNow || 0, cap = st.capNow || 0, net = lam - cap;
    const b2 = cap <= 0 ? ['ปิดอยู่', BAY_BG.grey]
      : net > 0.02 ? ['เข้ามากกว่าออก', BAY_BG.coral]
      : qN > 5 ? ['กำลังไล่คิวค้าง', BAY_BG.amber]
      : ['ระบายทัน', BAY_BG.lime];
    b = bayFrame(c, 1, 'BAY 02 · เข้า เทียบ ออก', b2[0], b2[1]);
    bigValue(c, b, (net >= 0 ? '+' : '') + net.toFixed(2), 'ราย/นาที', `เข้า ${lam.toFixed(2)} · ออก ${cap.toFixed(2)}`);
    barPair(c, b, [['คนมาถึง λ', clamp(lam / 3, 0, 1)], ['กำลังระบาย μc', clamp(cap / 3, 0, 1)]]);

    // BAY 03 · เส้นคิวทั้งเช้า
    b = bayFrame(c, 2, 'BAY 03 · คิวตลอดเช้า', r && r.clearT ? `หมด ${qClock(r.clearT)}` : '--', r ? QCK[r.res[2]] : BAY_BG.grey);
    bigValue(c, b, (st.svcOpen && isFinite(st.waitNow) ? st.waitNow.toFixed(0) : '—'), 'นาที',
      st.svcOpen ? 'คนที่เพิ่งมาถึงต้องรอเท่านี้' : 'ยังไม่เปิด · ทุกคนรออยู่หน้าห้อง');
    chartBox(c, b);
    if (r) {
      c.save();
      const X = (t) => b.cx + 4 + ((t - QS.T0) / (QS.T1 - QS.T0)) * (b.cw - 8);
      const Y = (q) => b.cy + b.ch - 5 - (clamp(q, 0, 120) / 120) * (b.ch - 12);
      c.beginPath(); c.moveTo(X(QS.T0), Y(0));
      for (const p of r.S) c.lineTo(X(p.t), Y(p.Q));
      c.lineTo(X(QS.T1), Y(0)); c.closePath();
      c.fillStyle = 'rgba(239,106,92,0.18)'; c.fill();
      c.beginPath(); r.S.forEach((p, i) => (i ? c.lineTo(X(p.t), Y(p.Q)) : c.moveTo(X(p.t), Y(p.Q))));
      c.lineWidth = 1.8; c.strokeStyle = QCK[r.res[2]]; c.stroke();
      const mxx = X(st.tm); c.strokeStyle = INK; c.lineWidth = 1.4; c.setLineDash([3, 3]);
      c.beginPath(); c.moveTo(mxx, b.cy + 3); c.lineTo(mxx, b.cy + b.ch - 3); c.stroke(); c.setLineDash([]);
      c.font = `700 9px ${FONT_MONO}`; c.fillStyle = '#6b6f7a';
      c.fillText('06:00', b.cx + 4, b.cy + b.ch + 11); c.textAlign = 'right';
      c.fillText('12:00', b.cx + b.cw - 4, b.cy + b.ch + 11); c.textAlign = 'left';
      c.restore();
    }

    // BAY 04 · สรุปแต่ละแผน
    const last = st.tally.length ? st.tally[st.tally.length - 1] : null;
    const lr = last ? last.run : null;
    b = bayFrame(c, 3, 'BAY 04 · ผลของแต่ละแผน', lr ? lr.res[0] : '--', lr ? QCK[lr.res[2]] : BAY_BG.grey);
    c.save(); c.textBaseline = 'middle'; c.fillStyle = INK; c.font = `700 17px ${FONT_MONO}`;
    c.fillText(lr ? lr.res[0] : 'รอเริ่ม', b.x + 14, b.y + 60);
    c.font = `400 11.5px ${FONT_MONO}`; c.fillStyle = '#6b6f7a';
    c.fillText(lr ? lr.res[1] : 'หมุนโต๊ะ แล้วกด P', b.x + 14, b.y + 84);
    for (let i = 0; i < 4; i++) {
      const s = st.tally[i], x = b.x + 14 + i * 56, y = b.y + 112;
      const rr0 = s ? s.run : null;
      c.fillStyle = rr0 ? QCK[rr0.res[2]] : '#fffdf8'; rr(c, x, y, 50, 74, 8); c.fill();
      c.lineWidth = 1.4; c.strokeStyle = INK; c.stroke();
      c.fillStyle = INK; c.textAlign = 'center'; c.font = `700 10.5px ${FONT_MONO}`;
      c.fillText(s ? `${s.c} โต๊ะ` : `แผน ${i + 1}`, x + 25, y + 15);
      c.font = `400 9px ${FONT_MONO}`;
      c.fillText(s ? qClock(s.op) : '·', x + 25, y + 30);
      c.font = `700 15px ${FONT_MONO}`;
      c.fillText(rr0 ? rr0.waitMean.toFixed(0) : '·', x + 25, y + 50);
      c.font = `400 8.5px ${FONT_MONO}`;
      c.fillText(rr0 ? 'นาที' : '', x + 25, y + 64);
      c.textAlign = 'left';
    }
    c.restore();
  },

  speedBadge(TL, st) {
    if (TL.live) return { txt: `ตาคุณแล้ว · 1 วิ = ${Q_LIVE_RATE} นาที`, bg: BAY_BG.lime };
    const ch = st.ch;
    if (!ch) return st.placedCount < TL.total ? { txt: 'กำลังสร้าง', bg: BAY_BG.amber } : { txt: 'พร้อม', bg: BAY_BG.lime };
    if (st.t >= TL.T.caption) return { txt: '4 แผน · เปิดเร็วชนะการเติมโต๊ะ', bg: BAY_BG.lime };
    if (st.svcOpen && !st.doneRun) return { txt: `1 วินาที = ${Q_RATE} นาที · เร่งเวลา`, bg: BAY_BG.coral };
    return { txt: st.doneRun ? ch.run.res[0] : 'ก่อนเปิดบริการ', bg: st.doneRun ? QCK[ch.run.res[2]] : BAY_BG.amber };
  },

  audioCues(TL) {
    if (TL.live) return [];
    const cu = [];
    for (const ch of TL.CH) {
      const a = ch.t0 + Q_LEAD, b = a + Q_VID;
      cu.push({ type: 'whoosh', t: ch.t0, t1: ch.t0 + 0.9 }, { type: 'power', t: a },
        { type: 'whir', t: a, t1: b, f: 78, gain: 0.045 });
      cu.push({ type: ch.run.res[2] === 'lime' ? 'ding' : 'error', t: b + 0.15 });
    }
    cu.push({ type: 'whoosh', t: TL.T.caption - 0.3, t1: TL.T.caption + 0.9 }, { type: 'caption', t: TL.T.caption });
    return cu;
  },
};
