// ---------------------------------------------------------------------------
// ห้องแล็บตรวจเลือดผู้ป่วยนอก (Lab Q1 · คิวและคอขวด)
// คิวคือ "แถว" จึงวาดเป็นช่องยาวที่คนต่อแถวกันจริง ๆ ไม่ใช่กราฟแท่ง
// หน่วย ซม. · x ไปทางขวาของผู้ชม · z ขึ้น · ของออกแบบเอง ไม่ใช่ยี่ห้อจริง
// ---------------------------------------------------------------------------
const QC = {
  body: { light: '#4a5160', mid: '#333a46', dark: '#22262f' },
  deck: { light: '#5d6373', mid: '#424857', dark: '#2c313c' },
  glass: { light: '#eaf6fa', mid: '#cbe4eb', dark: '#9cbfca' },
  seat: { light: '#8fd8e8', mid: '#56bfd6', dark: '#2f8da3' },
  skin: { light: '#ffd9a8', mid: '#f3b26a', dark: '#c88640' },
  hot: { light: '#ff9e93', mid: '#ef6a5c', dark: '#b84436' },
  ok: { light: '#e4fb9a', mid: '#c8f04a', dark: '#8fb424' },
  tube: { light: '#ffe6ad', mid: '#ffcf6b', dark: '#c99c33' },
  pale: { light: '#f6f7f9', mid: '#d7dbe1', dark: '#a7aebb' },
  sign: { light: '#ffd79a', mid: '#f0a93f', dark: '#b87a1d' },
};
// เรขาคณิตที่ทั้ง asset และ demo ใช้ร่วมกัน
const QG = {
  sign: [-27, 0, 0],
  belt: { x0: -25, x1: -19, z: 6.0, half: 3.0 },
  lane: { x0: -18, x1: 0.8, y0: -3.8, y1: 3.8, z0: 3.4, z1: 5.9, in: 0.55 },
  booth: { x0: 3.2, pitch: 2.9, cols: 4, rows: 4, z: 2.3 },
  rail: { x0: 16, x1: 20.5, z: 5.2 },
  lab: { x0: 22, x1: 31.5, y0: -7.5, y1: 7.5 },
  clock: [-3, 11.2, 0],
};
// ตำแหน่งยืนของคนที่ i ในแถว (0 = หัวแถว ติดประตูจุดเจาะ)
const QL_PITCH = 1.1, QL_ROWS = [-2.8, -1.4, 0, 1.4, 2.8], QL_COLS = 16;
const QL_CAP = QL_COLS * QL_ROWS.length;          // 80 คนในช่องแถว
const QL_HEAD = QG.lane.x1 - QG.lane.in - 0.4;
const QL_OUT = [-5.4, 5.4], QL_OCOLS = 17;        // ล้นออกมายืนข้างช่อง
const QL_MAX = QL_CAP + QL_OUT.length * QL_OCOLS; // 114 คนที่วาดได้
function qLanePos(i) {
  if (i < QL_CAP) {
    const col = Math.floor(i / QL_ROWS.length), row = i % QL_ROWS.length;
    return [QL_HEAD - col * QL_PITCH, QL_ROWS[row], QG.lane.z0 + 0.35, 0];
  }
  const j = i - QL_CAP, col = Math.floor(j / QL_OUT.length), row = j % QL_OUT.length;
  return [QL_HEAD - 0.4 - col * QL_PITCH, QL_OUT[row], 0.1, 1];
}
// ตำแหน่ง x ของท้ายแถวเมื่อมี n คน (ใช้ทั้งไม้บรรทัดและลูกศร)
const qLaneX = (n) => QL_HEAD - (Math.min(n, QL_CAP) / QL_ROWS.length) * QL_PITCH;
// เก้าอี้เจาะเลือดตัวที่ k (เรียงเป็นตาราง cols × rows)
function qBoothPos(k) {
  const B = QG.booth, col = k % B.cols, row = Math.floor(k / B.cols);
  return [B.x0 + col * B.pitch, (row - (B.rows - 1) / 2) * B.pitch, 0];
}
const QB_MAX = QG.booth.cols * QG.booth.rows;      // 16 เก้าอี้

// ---- ป้ายทางเข้า: คนมาจากไหน วันละกี่ราย --------------------------------------
defineAsset('qPrepa', {
  name: 'ทางเข้าผู้ป่วยนอก', label: 'ผู้ป่วยนอก · 416 ราย/วัน', group: 'floor', layer: 0,
  O: [0, 0, 0], anchor: [QG.sign[0], 0, 7.2], ring: [2.2, 2.2, 0.02], lab: [0, 3.8, 2.6], dropH: 6,
  floorShadow: (xf) => [cylCorners(xf, [QG.sign[0], 0, 1.5], 'z', 0.7, 3), boxCorners(xf, [QG.sign[0] - 0.4, -4.6, 3], [QG.sign[0] + 0.4, 4.6, 7.2])],
  draw(G, xf, st) {
    const x = QG.sign[0];
    drawCyl(G, xf, [x, 0, 1.5], 'z', 0.7, 3, M.steel, { seg: 16, lw: 1.5 });
    drawBox(G, xf, [x - 0.4, -4.6, 3], [x + 0.4, 4.6, 7.2], QC.sign, {
      lw: 2,
      px: (c) => {
        ptxt(c, 'ผู้ป่วยนอก', 0.7, 1.2, 1.25, INK, 700, 'left');
        ptxt(c, '416 ราย/วัน', 0.7, 2.7, 0.78, 'rgba(29,32,51,0.72)', 700, 'left');
        const lam = (st.lamNow || 0);
        ptxt(c, `ตอนนี้ ${lam.toFixed(2)} ราย/นาที`, 0.7, 3.9, 0.78, lam > 2 ? '#b8322a' : 'rgba(29,32,51,0.6)', 700, 'left');
      },
    });
  },
});

// ---- นาฬิกาห้องแล็บ + ป้ายเปิด/ปิด ---------------------------------------------
defineAsset('qNaalika', {
  name: 'นาฬิกาและป้ายเปิดบริการ', label: 'เวลา', group: 'floor', layer: 0,
  O: [0, 0, 0], anchor: [QG.clock[0], QG.clock[1], 5.2], ring: [4.6, 1.6, 0.02], lab: [0, 2.6, 2.4], dropH: 5,
  floorShadow: (xf) => [boxCorners(xf, [QG.clock[0] - 4.2, QG.clock[1] - 0.5, 0], [QG.clock[0] + 4.2, QG.clock[1] + 0.5, 1.0]),
    boxCorners(xf, [QG.clock[0] - 4.2, QG.clock[1] - 0.45, 1.0], [QG.clock[0] + 4.2, QG.clock[1] + 0.45, 5.0])],
  draw(G, xf, st) {
    const [x, y] = QG.clock, open = !!st.svcOpen;
    drawBox(G, xf, [x - 4.2, y - 0.5, 0], [x + 4.2, y + 0.5, 1.0], M.steel, { lw: 1.4 });
    drawBox(G, xf, [x - 4.2, y - 0.45, 1.0], [x + 4.2, y + 0.45, 5.0], QC.body, {
      lw: 1.9,
      py: (c) => {
        c.fillStyle = '#10141a'; prect(c, 0.45, 0.35, 5.2, 1.9, 0.26); c.fill();
        ptxt(c, st.clock || '06:00', 3.05, 1.3, 1.5, '#c8f04a', 700, 'center');
        c.fillStyle = open ? '#c8f04a' : '#ef6a5c'; prect(c, 5.2, 0.35, 3.0, 1.9, 0.26); c.fill();
        ptxt(c, open ? 'เปิดแล้ว' : 'ยังไม่เปิด', 6.7, 1.3, 0.7, INK, 700, 'center');
        ptxt(c, st.openTxt || '', 0.45, 3.1, 0.74, 'rgba(223,227,234,0.78)', 700, 'left');
      },
    });
  },
});

// ---- สายพานผู้ป่วยขาเข้า -------------------------------------------------------
defineAsset('qSaiphan', {
  name: 'ทางเดินเข้าห้องเจาะเลือด', label: 'ทางเข้า', group: 'floor', layer: 1,
  O: [0, 0, 0], anchor: [(QG.belt.x0 + QG.belt.x1) / 2, 0, QG.belt.z], ring: [4.6, 3.6, 0.02], lab: [0, -4.4, 2.8], dropH: 6,
  floorShadow: (xf) => [boxCorners(xf, [QG.belt.x0, -QG.belt.half, 4.8], [QG.belt.x1, QG.belt.half, QG.belt.z]),
    ...[[QG.belt.x0 + 1, -2.2], [QG.belt.x0 + 1, 2.2], [QG.belt.x1 - 1, -2.2], [QG.belt.x1 - 1, 2.2]].map(([x, y]) => cylCorners(xf, [x, y, 2.4], 'z', 0.4, 4.8))],
  draw(G, xf, st) {
    const B = QG.belt;
    for (const [x, y] of [[B.x0 + 1, -2.2], [B.x0 + 1, 2.2], [B.x1 - 1, -2.2], [B.x1 - 1, 2.2]])
      drawCyl(G, xf, [x, y, 2.4], 'z', 0.4, 4.8, M.steel, { seg: 14, lw: 1.3 });
    drawBox(G, xf, [B.x0, -B.half, 4.8], [B.x1, B.half, B.z], QC.deck, {
      lw: 2,
      top: (c) => {
        const L = B.x1 - B.x0, W = B.half * 2;
        c.fillStyle = 'rgba(16,18,24,0.42)'; prect(c, 0.4, 0.5, L - 0.8, W - 1.0, 0.3); c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 0.07;
        const sh = ((st.t || 0) * 1.4) % 0.9;
        for (let x = 0.6 + sh; x < L - 0.4; x += 0.9) { c.beginPath(); c.moveTo(x, 0.7); c.lineTo(x, W - 0.7); c.stroke(); }
        ptxt(c, '→ ต่อแถว', 0.9, W / 2, 0.78, 'rgba(236,240,246,0.8)', 700, 'left');
      },
    });
  },
});

// ---- ช่องแถวคอย: คิวคือแถว วาดเป็นช่องยาวมีไม้บรรทัดบอก "คน" และ "นาทีที่ต้องรอ" ----
// st.qN = จำนวนคนในแถว · st.waitNow = นาทีที่คนต่อท้ายแถวตอนนี้ต้องรอ · st.capNow = ราย/นาทีที่ระบายได้
defineAsset('qChong', {
  name: 'ช่องแถวคอยเจาะเลือด', label: 'แถวคอย', group: 'floor', layer: 2,
  O: [0, 0, 0], anchor: [(QG.lane.x0 + QG.lane.x1) / 2, 0, QG.lane.z1], ring: [9.8, 4.2, 1.5], lab: [0, 5.0, 2.6], dropH: 8,
  floorShadow: (xf) => [boxCorners(xf, [QG.lane.x0 - 0.5, QG.lane.y0 - 0.5, 0], [QG.lane.x1 + 0.5, QG.lane.y1 + 0.5, QG.lane.z1])],
  draw(G, xf, st) {
    const L = QG.lane, head = L.x1 - L.in - 0.4;
    // ฐานทึบ + ไม้บรรทัด: อ่านตัวเลขได้เพราะอยู่บนพื้นทึบ ไม่ใช่บนกระจก
    drawBox(G, xf, [L.x0 - 0.5, L.y0 - 0.5, 0], [L.x1 + 0.5, L.y1 + 0.5, L.z0], QC.body, {
      lw: 2, topM: M.steel,
      py: (c) => {
        const U = (n) => qLaneX(n) - (L.x0 - 0.5);
        ptxt(c, 'ความยาวของแถว', U(0) + 0.6, 1.0, 0.62, 'rgba(223,227,234,0.5)', 700, 'left');
        for (const n of [0, 20, 40, 60, 80]) {
          const u = U(n), hot = n >= 40;
          c.strokeStyle = hot ? 'rgba(255,124,108,0.85)' : 'rgba(255,255,255,0.36)'; c.lineWidth = 0.09;
          c.beginPath(); c.moveTo(u, 0.25); c.lineTo(u, 1.0); c.stroke();
          ptxt(c, `${n}`, u, 1.65, 0.9, hot ? '#ff9e93' : '#dfe3ea', 700, 'center');
        }
        ptxt(c, 'คน', U(0) + 0.9, 1.65, 0.68, 'rgba(223,227,234,0.6)', 700, 'left');
        // ลูกศรชี้ท้ายแถวตอนนี้
        const n = st.qN || 0;
        if (n > 0.5) {
          const u = U(n);
          c.fillStyle = n > QL_CAP ? '#ff5c4c' : n > 40 ? '#ffcf6b' : '#c8f04a';
          c.beginPath(); c.moveTo(u, 0.15); c.lineTo(u - 0.44, -0.7); c.lineTo(u + 0.44, -0.7); c.closePath(); c.fill();
          c.strokeStyle = INK; c.lineWidth = 0.08; c.stroke();
        }
      },
    });
    // ผนังกระจกสองข้าง (โปร่ง เห็นคนในแถว)
    for (const y of [L.y0, L.y1]) {
      const s = y === L.y0 ? -1 : 1;
      drawBox(G, xf, [L.x0, y, L.z0], [L.x1, y + s * 0.3, L.z1], QC.glass, { lw: 1.2, alpha: 0.5 });
    }
    // ประตูทางออกของแถว: ไปจุดเจาะ
    drawBox(G, xf, [L.x1, L.y0, L.z0], [L.x1 + 0.5, L.y1, L.z1 + 0.6], QC.body, {
      lw: 1.6,
      px: (c) => {
        ptxt(c, 'เรียกคิว', 0.5, 1.6, 0.8, '#c8f04a', 700, 'left');
        ptxt(c, `${(st.capNow || 0).toFixed(2)} ราย/นาที`, 0.5, 3.0, 0.66, 'rgba(223,227,234,0.7)', 700, 'left');
      },
    });
  },
});

// ---- แถวเก้าอี้เจาะเลือด: ตาราง 4×4 เปิดได้สูงสุด 16 ตัว -------------------------
// st.nDesk = เปิดกี่ตัว · st.busyN = ไม่ว่างกี่ตัว · st.phase = เฟสของคนที่กำลังเจาะ
defineAsset('qJaolueat', {
  name: 'จุดเจาะเลือด', label: 'จุดเจาะเลือด · 4.2 นาที/ราย', group: 'floor', layer: 3,
  O: [0, 0, 0], anchor: [QG.booth.x0 + QG.booth.pitch * 1.5, 0, 5.4], ring: [7.2, 6.4, 0.02], lab: [0, -6.6, 3.0], dropH: 7,
  floorShadow: (xf) => {
    const o = [];
    for (let k = 0; k < QB_MAX; k++) { const [x, y] = qBoothPos(k); o.push(boxCorners(xf, [x - 1.15, y - 1.15, 0], [x + 1.15, y + 1.15, QG.booth.z])); }
    return o;
  },
  draw(G, xf, st) {
    const nD = Math.round(st.nDesk || 0), nB = Math.round(st.busyN || 0), Z = QG.booth.z;
    for (let k = 0; k < QB_MAX; k++) {
      const [x, y] = qBoothPos(k), open = k < nD, busy = k < nB;
      // ฐานเก้าอี้
      drawBox(G, xf, [x - 1.15, y - 1.15, 0], [x + 1.15, y + 1.15, Z], open ? QC.seat : QC.pale, {
        lw: 1.5, alpha: open ? 1 : 0.42,
        top: (c) => {
          if (!open) { ptxt(c, 'ปิด', 1.15, 1.15, 0.62, 'rgba(29,32,51,0.45)', 700, 'center'); return; }
          c.fillStyle = busy ? '#c8f04a' : 'rgba(255,253,248,0.9)'; pcirc(c, 1.15, 0.5, 0.26); c.fill();
          c.lineWidth = 0.07; c.strokeStyle = INK; c.stroke();
          ptxt(c, String(k + 1), 1.15, 1.5, 0.72, 'rgba(29,32,51,0.72)', 700, 'center');
        },
      });
      if (!open) continue;
      // พนักพิงเก้าอี้ + ที่วางแขน
      drawBox(G, xf, [x + 0.65, y - 1.0, Z], [x + 1.1, y + 1.0, Z + 2.0], QC.seat, { lw: 1.3 });
      drawBox(G, xf, [x - 1.0, y - 0.28, Z], [x + 0.6, y + 0.28, Z + 0.5], M.steel, { lw: 1.2 });
      if (busy) {
        // ผู้ป่วยที่กำลังถูกเจาะ: ตัวโทเคน + หลอดเลือดที่ค่อย ๆ เต็ม
        drawCyl(G, xf, [x - 0.2, y, Z + 0.5], 'z', 0.52, 1.5, QC.skin, { seg: 14, lw: 1.2 });
        drawSphere(G, xf, [x - 0.2, y, Z + 2.3], 0.46, QC.skin, { lw: 1.1 });
        const fill = clamp(((st.phase || 0) + k * 0.17) % 1);
        drawCyl(G, xf, [x + 0.45, y + 0.62, Z + 0.5], 'z', 0.22, 0.25 + 1.0 * fill, QC.tube, { seg: 10, lw: 1 });
      }
    }
  },
});

// ---- รางส่งสิ่งส่งตรวจไปห้องแล็บ -------------------------------------------------
defineAsset('qRang', {
  name: 'รางส่งสิ่งส่งตรวจ', label: 'ส่งสิ่งส่งตรวจ · 4 นาที', group: 'floor', layer: 2,
  O: [0, 0, 0], anchor: [(QG.rail.x0 + QG.rail.x1) / 2, 0, QG.rail.z], ring: [2.6, 2.2, 0.02], lab: [0, -3.6, 2.6], dropH: 6,
  floorShadow: (xf) => [boxCorners(xf, [QG.rail.x0, -1.5, QG.rail.z - 1.1], [QG.rail.x1, 1.5, QG.rail.z]),
    ...[[QG.rail.x0 + 0.8, 0], [QG.rail.x1 - 0.8, 0]].map(([x, y]) => cylCorners(xf, [x, y, 2.7], 'z', 0.35, 5.4))],
  draw(G, xf, st) {
    const R = QG.rail;
    for (const x of [R.x0 + 0.8, R.x1 - 0.8]) drawCyl(G, xf, [x, 0, 2.7], 'z', 0.35, 5.4, M.steel, { seg: 12, lw: 1.2 });
    drawBox(G, xf, [R.x0, -1.5, R.z - 1.1], [R.x1, 1.5, R.z], QC.deck, {
      lw: 1.6,
      top: (c) => {
        c.fillStyle = 'rgba(16,18,24,0.4)'; prect(c, 0.3, 0.4, R.x1 - R.x0 - 0.6, 2.2, 0.25); c.fill();
        ptxt(c, '→ ห้องแล็บ', 0.6, 1.5, 0.66, 'rgba(236,240,246,0.78)', 700, 'left');
      },
    });
    // หลอดเลือดที่กำลังวิ่งไปบนราง
    const n = Math.min(Math.round(st.onRail || 0), 5);
    for (let i = 0; i < n; i++) {
      const u = (((st.t || 0) * 0.55 + i * 0.21) % 1);
      drawCyl(G, xf, [R.x0 + 0.7 + u * (R.x1 - R.x0 - 1.4), 0, R.z], 'z', 0.23, 1.1, QC.tube, { seg: 10, lw: 1 });
    }
  },
});

// ---- ห้องแล็บปลายน้ำ: ปั่นแยก · เครื่องเคมี · เครื่องโลหิต · ทวนสอบ · ส่งผล -----------
defineAsset('qHongLab', {
  name: 'ห้องแล็บ', label: 'ห้องแล็บ · 5 หน่วยปลายน้ำ', group: 'floor', layer: 1,
  O: [0, 0, 0], anchor: [(QG.lab.x0 + QG.lab.x1) / 2, 0, 8.5], ring: [5.6, 8, 0.02], lab: [0, 9.2, 3.0], dropH: 8,
  floorShadow: (xf) => [boxCorners(xf, [QG.lab.x0, QG.lab.y0, 0], [QG.lab.x1, QG.lab.y1, 1.4]),
    boxCorners(xf, [QG.lab.x0 + 0.6, QG.lab.y0 + 0.8, 1.4], [QG.lab.x0 + 5.2, QG.lab.y0 + 5.6, 7.6]),
    boxCorners(xf, [QG.lab.x0 + 0.6, 1.4, 1.4], [QG.lab.x0 + 5.2, 6.4, 6.2])],
  draw(G, xf, st) {
    const L = QG.lab;
    // โต๊ะยาวของห้องแล็บ
    drawBox(G, xf, [L.x0, L.y0, 0], [L.x1, L.y1, 1.4], QC.pale, {
      lw: 1.8,
      top: (c) => { c.strokeStyle = 'rgba(29,32,51,0.12)'; c.lineWidth = 0.05; for (let u = 1; u < L.x1 - L.x0; u += 1.2) { c.beginPath(); c.moveTo(u, 0.3); c.lineTo(u, L.y1 - L.y0 - 0.3); c.stroke(); } },
    });
    // เครื่องเคมีคลินิก 20 ช่อง (62% ของงาน)
    drawBox(G, xf, [L.x0 + 0.6, L.y0 + 0.8, 1.4], [L.x0 + 5.2, L.y0 + 5.6, 7.6], QC.body, {
      lw: 1.8,
      px: (c) => {
        ptxt(c, 'เคมีคลินิก', 0.4, 1.1, 0.72, '#dfe3ea', 700, 'left');
        ptxt(c, '20 ช่อง · 62%', 0.4, 2.2, 0.56, 'rgba(223,227,234,0.6)', 700, 'left');
        for (let i = 0; i < 10; i++) {
          c.fillStyle = (st.labOn && i < 7) ? '#c8f04a' : 'rgba(255,255,255,0.14)';
          prect(c, 0.5 + i * 0.42, 3.3, 0.3, 0.9, 0.08); c.fill();
        }
      },
    });
    // เครื่องโลหิตวิทยา 7 ช่อง (38%)
    drawBox(G, xf, [L.x0 + 0.6, 1.4, 1.4], [L.x0 + 5.2, 6.4, 6.2], QC.deck, {
      lw: 1.8,
      px: (c) => {
        ptxt(c, 'โลหิตวิทยา', 0.4, 1.0, 0.7, '#dfe3ea', 700, 'left');
        ptxt(c, '7 ช่อง · 38%', 0.4, 2.0, 0.56, 'rgba(223,227,234,0.6)', 700, 'left');
        for (let i = 0; i < 7; i++) {
          c.fillStyle = (st.labOn && i < 5) ? '#7fe6f2' : 'rgba(255,255,255,0.14)';
          prect(c, 0.5 + i * 0.52, 3.0, 0.36, 0.8, 0.08); c.fill();
        }
      },
    });
    // จอส่งผลเข้า HIS
    drawBox(G, xf, [L.x1 - 3.4, -1.6, 1.4], [L.x1 - 0.6, 1.6, 5.4], QC.body, {
      lw: 1.6,
      px: (c) => {
        c.fillStyle = '#10141a'; prect(c, 0.3, 0.4, 2.6, 2.4, 0.2); c.fill();
        ptxt(c, 'ส่งผล', 1.6, 1.1, 0.72, '#c8f04a', 700, 'center');
        ptxt(c, `${Math.round(st.donePx || 0)}`, 1.6, 2.2, 1.0, '#dfe3ea', 700, 'center');
        ptxt(c, '→ HIS', 1.6, 3.5, 0.5, 'rgba(29,32,51,0.6)', 700, 'center');
      },
    });
  },
});
