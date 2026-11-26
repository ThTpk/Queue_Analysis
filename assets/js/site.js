/* ============================================================
   site.js — โครงร่างเว็บ: เมนู, สารบัญ, ปุ่มสลับธีม, ตัวช่วยเล็ก ๆ
   ทุกหน้าใส่  <body data-page="..." data-base="...">  แล้วไฟล์นี้วาดเมนูให้เอง
   ============================================================ */
(function () {
  'use strict';

  /* เก็บข้อผิดพลาดของหน้าไว้ตรวจสอบ (ไม่แสดงผลต่อผู้ใช้) */
  window.__errs = window.__errs || [];
  window.addEventListener('error', e => {
    window.__errs.push((e.message || 'error') + ' @ ' + (e.filename || '') + ':' + (e.lineno || 0));
  });
  window.addEventListener('unhandledrejection', e => {
    window.__errs.push('promise: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });

  const PAGES = [
    { g: 'เริ่มที่นี่', href: 'index.html', n: '', t: 'หน้าแรก' },
    { g: 'เริ่มที่นี่', href: 'start.html', n: '', t: 'อ่าน 5 นาที',
      d: 'ทั้งเรื่องด้วยภาษาคน ไม่มีสูตรเลย' },
    { g: 'เริ่มที่นี่', href: 'glossary.html', n: '', t: 'อภิธานศัพท์',
      d: 'ความหมายของทุกศัพท์ที่เว็บนี้ใช้' },
    { g: 'ทฤษฎีคิว', href: 'theory/01-basics.html', n: '1', t: 'ศัพท์และสัญกรณ์พื้นฐาน',
      d: 'λ μ c ρ, Kendall notation, เงื่อนไขเสถียร' },
    { g: 'ทฤษฎีคิว', href: 'theory/02-littles-law.html', n: '2', t: 'กฎของลิตเติล',
      d: 'L = λW กฎเดียวที่ใช้ได้กับทุกระบบ' },
    { g: 'ทฤษฎีคิว', href: 'theory/03-variability.html', n: '3', t: 'ความผันแปร',
      d: 'cv², Kingman VUT — ทำไมไม่เต็มกำลังก็ยังรอ' },
    { g: 'ทฤษฎีคิว', href: 'theory/04-mmc.html', n: '4', t: 'M/M/1 และ M/M/c',
      d: 'birth–death, Erlang-C, ผลของการรวมคิว' },
    { g: 'ทฤษฎีคิว', href: 'theory/05-ggc.html', n: '5', t: 'G/G/c และเปอร์เซ็นไทล์',
      d: 'Sakasegawa, Allen–Cunneen, หางของเวลารอ' },
    { g: 'ทฤษฎีคิว', href: 'theory/06-network.html', n: '6', t: 'เครือข่ายคิว',
      d: 'สมดุลการไหล, Jackson, งานทำซ้ำ, การขยายผล' },
    { g: 'ทฤษฎีคิว', href: 'theory/07-bottleneck.html', n: '7', t: 'หาคอขวด',
      d: '5 วิธีชี้ตัว, Active Period, Bottleneck Score' },
    { g: 'ทฤษฎีคิว', href: 'theory/08-staffing.html', n: '8', t: 'คำนวณกำลังคน',
      d: 'Erlang-C ย้อนกลับ, square-root staffing, ต้นทุน' },
    { g: 'ทฤษฎีคิว', href: 'theory/09-nonstationary.html', n: '9', t: 'เมื่อสูตรใช้ไม่ได้',
      d: 'ρ≥1 ชั่วคราว, fluid model, การจำลอง' },
    { g: 'กรณีศึกษา', href: 'case/flowlens.html', n: '', t: 'FlowLens ทีละขั้น',
      d: 'จากข้อมูลดิบถึงข้อเสนอที่วัดผลได้' },
    { g: 'กรณีศึกษา', href: 'case/data-to-formula.html', n: '', t: 'จากไฟล์ถึงสูตร',
      d: 'คอลัมน์ในไฟล์ → λ E[S] cv² c ρ พร้อมวัดความแม่น' },
    { g: 'ห้องทดลอง', href: 'sim/calculator.html', n: '', t: 'เครื่องคิดเลขคิว',
      d: 'ปรับ λ, E[S], c, cv² แล้วดูผลทันที' },
    { g: 'ห้องทดลอง', href: 'sim/station.html', n: '', t: 'จุดบริการเดี่ยว',
      d: 'ดูคิวเกิดขึ้นจริงทีละคน + ตรวจกฎลิตเติล' },
    { g: 'ห้องทดลอง', href: 'sim/network.html', n: '', t: 'จำลองทั้งระบบ FlowLens',
      d: 'ทั้ง 8 หน่วย เดินพร้อมกัน ทฤษฎีเทียบของจริง' },
    { g: 'ห้องทดลอง', href: 'sim/staffing.html', n: '', t: 'วางแผนโต๊ะรายช่วง',
      d: 'เป้าเวลารอ ↔ จำนวนโต๊ะ ↔ ค่าใช้จ่าย' },
    { g: 'ห้องทดลอง', href: 'sim/lab3d.html', n: '', t: 'ห้องทดลอง 3 มิติ',
      d: 'ห้องเจาะเลือดไอโซเมตริก เดินเอง 4 แผน + วิดีโอ' },
  ];

  const base = document.body.dataset.base || '';
  const here = document.body.dataset.page || 'index.html';
  const url = p => base + p;

  /* ---------------------------------------------------------- topbar */
  function topbar() {
    const host = document.querySelector('.topbar-in');
    if (!host) return;
    host.innerHTML =
      '<a class="brand" href="' + url('index.html') + '">' +
        '<span class="brand-mark" aria-hidden="true">Q</span>' +
        '<span>ทฤษฎีคิว &amp; การหาคอขวด</span></a>' +
      '<nav class="topnav" id="topnav" aria-label="เมนูหลัก">' +
        '<a href="' + url('theory/01-basics.html') + '">ทฤษฎี</a>' +
        '<a href="' + url('case/flowlens.html') + '">กรณีศึกษา</a>' +
        '<a href="' + url('sim/network.html') + '">ห้องทดลอง</a>' +
        '<a href="https://github.com/ThTpk/Queue_Analysis">GitHub</a>' +
      '</nav>' +
      '<button class="icon-btn" id="navToggle" aria-expanded="false" ' +
        'aria-label="เปิดเมนู">☰</button>' +
      '<button class="icon-btn" id="themeBtn" aria-label="สลับธีมสว่าง/มืด">◑</button>';

    const grp = here.split('/')[0];
    host.querySelectorAll('.topnav a').forEach(a => {
      const h = a.getAttribute('href');
      if ((grp === 'theory' && h.includes('theory/')) ||
          (grp === 'case' && h.includes('case/')) ||
          (grp === 'sim' && h.includes('sim/'))) a.setAttribute('aria-current', 'page');
    });

    const tn = host.querySelector('#topnav');
    const tg = host.querySelector('#navToggle');
    tg.addEventListener('click', () => {
      const open = tn.classList.toggle('open');
      tg.setAttribute('aria-expanded', String(open));
      const sb = document.querySelector('.sidebar');
      if (sb && window.innerWidth <= 900) sb.hidden = !open;
    });

    const tb = host.querySelector('#themeBtn');
    const stored = (() => { try { return localStorage.getItem('qa-theme'); } catch (e) { return null; } })();
    if (stored) document.documentElement.dataset.theme = stored;
    tb.addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme;
      const sysDark = matchMedia('(prefers-color-scheme: dark)').matches;
      const next = cur ? (cur === 'dark' ? 'light' : 'dark') : (sysDark ? 'light' : 'dark');
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('qa-theme', next); } catch (e) { /* ignore */ }
      document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
    });
  }

  /* ---------------------------------------------------------- sidebar */
  function sidebar() {
    const host = document.querySelector('.sidebar');
    if (!host) return;
    let html = '';
    let group = null;
    PAGES.forEach(p => {
      if (p.g !== group) { group = p.g; html += (html ? '</ol>' : '') + '<h5>' + group + '</h5><ol>'; }
      const cur = p.href === here ? ' aria-current="page"' : '';
      html += '<li><a href="' + url(p.href) + '"' + cur + '>' +
              (p.n ? '<span class="num">' + p.n + '</span>' : '<span class="num">·</span>') +
              '<span>' + p.t + '</span></a></li>';
    });
    html += '</ol>';
    host.innerHTML = html;
    if (window.innerWidth <= 900) host.hidden = true;
  }

  /* ---------------------------------------------------------- pager */
  function pager() {
    const host = document.querySelector('.pager');
    if (!host) return;
    const i = PAGES.findIndex(p => p.href === here);
    if (i < 0) { host.remove(); return; }
    const prev = PAGES[i - 1], next = PAGES[i + 1];
    let html = '';
    if (prev) html += '<a class="prev" href="' + url(prev.href) + '">' +
      '<span class="dir">← ก่อนหน้า</span><span class="ttl">' + prev.t + '</span></a>';
    if (next) html += '<a class="next" href="' + url(next.href) + '">' +
      '<span class="dir">ถัดไป →</span><span class="ttl">' + next.t + '</span></a>';
    host.innerHTML = html;
  }

  /* ---------------------------------------------------------- footer */
  function footer() {
    const host = document.querySelector('footer.site .in');
    if (!host) return;
    host.innerHTML =
      '<span>ทฤษฎีคิวเพื่อการหาคอขวด · กรณีศึกษา FlowLens</span>' +
      '<span>ตัวเลขทุกตัวมาจาก <code>samples/demo_basic</code> ของ FlowLens</span>' +
      '<a href="https://github.com/ThTpk/Queue_Analysis" style="margin-left:auto">ซอร์สโค้ดบน GitHub</a>';
  }

  /* ---------------------------------------------------------- ตัวช่วย */
  /** ผูก slider: Site.slider('id', {fmt, on}) */
  const Site = {
    PAGES: PAGES,
    base: base,
    /** อ่านค่าตัวเลขของ input */
    v: id => parseFloat(document.getElementById(id).value),
    /** ผูก input หลายตัวเข้ากับฟังก์ชันเดียว แล้วเรียกครั้งแรกให้เลย */
    bind(ids, fn) {
      ids.forEach(id => {
        const e = document.getElementById(id);
        if (!e) return;
        e.addEventListener('input', fn);
        e.addEventListener('change', fn);
      });
      fn();
    },
    /** เขียนค่าลงใน element ที่คู่กับ slider (id + 'V') */
    show(id, text) {
      const e = document.getElementById(id + 'V');
      if (e) e.textContent = text;
    },
    /** สร้าง slider + ป้ายค่า แบบสั้น */
    ctrl(id, label, attrs, sub) {
      return '<div class="ctrl"><label for="' + id + '"><span>' + label +
        '</span><span class="val" id="' + id + 'V"></span></label>' +
        '<input type="range" id="' + id + '" ' + attrs + '>' +
        (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
    },
    /** ตารางสเกลสี ρ */
    rhoClass(r, cap) {
      if (!Number.isFinite(r)) return '';
      if (r >= 1) return 'is-bad';
      if (r > (cap == null ? .85 : cap)) return 'is-warn';
      return 'is-ok';
    },
  };
  window.Site = Site;

  /* ---------------------------------------------------------- KaTeX */
  function math() {
    if (!window.renderMathInElement) return;
    try {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
      });
    } catch (e) { /* ไม่มีเน็ตก็ยังอ่านเนื้อหาได้ */ }
  }

  /* ---------------------------------------------------------- สารบัญในหน้า */
  function toc() {
    const host = document.querySelector('[data-toc]');
    if (!host) return;
    const hs = document.querySelectorAll('main h2[id]');
    if (hs.length < 3) { host.remove(); return; }
    let html = '<div class="boxtitle">ในหน้านี้</div><ul style="margin:0;padding-inline-start:1.2em">';
    hs.forEach(h => { html += '<li><a href="#' + h.id + '">' + h.textContent.replace(/^\d+\.\s*/, '') + '</a></li>'; });
    host.innerHTML = html + '</ul>';
    host.className = 'note';
  }

  /** ตัดบรรทัดว่างหัว-ท้ายของบล็อกคำนวณ (เพราะ .calc ใช้ white-space: pre-wrap) */
  function trimCalc() {
    document.querySelectorAll('.calc').forEach(n => {
      n.innerHTML = n.innerHTML.replace(/^[ \t]*\n+/, '').replace(/\n+[ \t]*$/, '');
    });
  }

  function run() { topbar(); sidebar(); pager(); footer(); toc(); trimCalc(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
  window.addEventListener('load', math);
})();
