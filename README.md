# ทฤษฎีคิวเพื่อการหาคอขวด — กรณีศึกษา FlowLens

เว็บไซต์เรียนรู้ภาษาไทยว่าด้วย **ทฤษฎีคิว (Queueing Theory)** ที่ใช้จริง
ในการวิเคราะห์หาคอขวดของระบบบริการ โดยเดินตามกรณีศึกษา **FlowLens** —
โปรแกรมวิเคราะห์คอขวดงานตรวจเลือดโรงพยาบาล

ทุกสูตรมีตัวอย่างคำนวณทีละบรรทัด ทุกบทมีห้องทดลองแบบโต้ตอบ
และมีเครื่องจำลองเหตุการณ์ (discrete-event simulation) ที่รันทั้งระบบ 8 หน่วยในเบราว์เซอร์

## เนื้อหา

| ส่วน | หน้า |
| --- | --- |
| หน้าแรก | `index.html` |
| บทที่ 1 ศัพท์และสัญกรณ์พื้นฐาน | `theory/01-basics.html` |
| บทที่ 2 กฎของลิตเติล | `theory/02-littles-law.html` |
| บทที่ 3 ความผันแปรและสมการ VUT | `theory/03-variability.html` |
| บทที่ 4 M/M/1, M/M/c และ Erlang-C | `theory/04-mmc.html` |
| บทที่ 5 G/G/c, Sakasegawa และเปอร์เซ็นไทล์ | `theory/05-ggc.html` |
| บทที่ 6 เครือข่ายคิว | `theory/06-network.html` |
| บทที่ 7 หาคอขวด 5 วิธี + Bottleneck Score | `theory/07-bottleneck.html` |
| บทที่ 8 คำนวณกำลังคน | `theory/08-staffing.html` |
| บทที่ 9 เมื่อสูตรใช้ไม่ได้ (fluid model, การจำลอง) | `theory/09-nonstationary.html` |
| กรณีศึกษา FlowLens ทีละขั้น | `case/flowlens.html` |
| ห้องทดลอง — เครื่องคิดเลขคิว | `sim/calculator.html` |
| ห้องทดลอง — จุดบริการเดี่ยว (เคลื่อนไหว) | `sim/station.html` |
| ห้องทดลอง — จำลองทั้งระบบ 8 หน่วย | `sim/network.html` |
| ห้องทดลอง — วางแผนโต๊ะรายช่วงเวลา | `sim/staffing.html` |

## ทฤษฎีที่ครอบคลุม

- ตัวแปรพื้นฐาน λ, μ, c, ρ, offered load, Kendall notation, เงื่อนไขเสถียร, PASTA
- **กฎของลิตเติล** L = λW พร้อมบทพิสูจน์เชิงพื้นที่
- **ความผันแปร** ca², cs² และสมการ **VUT ของ Kingman**
- **กระบวนการเกิด–ตาย**, M/M/1, M/M/c, **Erlang-B / Erlang-C** (สูตรเวียน), service level
- ผลของ **การรวมคิว (pooling)** และการประหยัดต่อขนาด
- **Sakasegawa / Allen–Cunneen** สำหรับ G/G/c และวิธีประมาณเปอร์เซ็นไทล์ของเวลารอ
- **เครือข่ายคิว** — สมการสมดุลการไหล, Jackson network, ทฤษฎีบทของ Burke,
  การแตกตัวของความผันแปร (cd²), ผลของงานทำซ้ำ, คอขวดที่ย้ายที่
- **การหาคอขวด** 5 วิธี — การใช้กำลัง, สัดส่วนเวลารอ, ความไวต่อปริมาณงาน,
  Active Period Method, shadow price จากการจำลอง
- **Bottleneck Score** และการจัดสาเหตุ 7 ประเภท, starving / blocking
- **Theory of Constraints** — 5 Focusing Steps
- **การคำนวณกำลังคน** — Erlang-C ย้อนกลับ, square-root staffing,
  SIPP / Lag SIPP, การจัดกะแบบ set covering
- **ระบบที่ไม่นิ่ง** — fluid model, ρ ≥ 1 ชั่วคราว, อาการคิวค้าง,
  discrete-event simulation และการตรวจความเหมือนจริง (รวม KS test)

## ที่มาของตัวเลข

ตัวเลขทุกตัวในเว็บนี้มาจากชุดข้อมูล `samples/demo_basic` ของโปรเจกต์ FlowLens
(20 วันทำการ · ผู้ป่วย 8,329 ราย · seed 42) ซึ่งเป็นข้อมูลสังเคราะห์ที่มี **เฉลยกำกับ**

- โครงสร้างหน่วยบริการ โต๊ะ กะ ต้นทุน เส้นทางงาน → `config.yaml`
- เวลาบริการจริง (mean, cv), ρ รายชั่วโมง, เวลารอ, ความยาวคิว, TAT,
  โปรไฟล์การมาถึง, ปัญหาที่ฝังไว้ → `answer_key.json`

คอขวดที่เฉลยระบุไว้คือ **จุดเจาะเลือด (PHLEB)** เพราะเปิดจริงเพียง 7 โต๊ะ
ช่วง 06:30–09:00 ขณะที่ config ประกาศไว้ 11 โต๊ะ

สูตรใน `assets/js/queue.js` พอร์ตตรงจาก `flowlens/core/analysis/queueing.py`
และสูตรคะแนนคอขวดจาก `flowlens/core/analysis/bottleneck.py`

## โครงสร้างไฟล์

```
index.html                   หน้าแรก
theory/                      บทเรียน 9 บท
case/flowlens.html           กรณีศึกษาเต็ม
sim/                         ห้องทดลอง 4 ชุด
assets/css/site.css          ระบบดีไซน์ทั้งเว็บ (รองรับธีมสว่าง/มืด)
assets/js/queue.js           สูตรทฤษฎีคิวทั้งหมด
assets/js/des.js             เครื่องจำลองเหตุการณ์ไม่ต่อเนื่อง
assets/js/charts.js          กราฟ SVG ขนาดเล็ก ไม่พึ่งไลบรารีภายนอก
assets/js/flowmap.js         ผังการไหลของระบบ
assets/js/flowlens-data.js   ข้อมูลกรณีศึกษา
assets/js/site.js            เมนู สารบัญ ปุ่มสลับธีม
```

ไม่มี build step ไม่มี dependency ที่ต้องติดตั้ง — เป็น HTML/CSS/JS ล้วน
โหลดฟอนต์จาก Google Fonts และ KaTeX จาก CDN (ถ้าไม่มีอินเทอร์เน็ต
เนื้อหายังอ่านได้ครบ เพียงแต่สูตรจะแสดงเป็นข้อความ TeX)

## ดูเว็บ

เผยแพร่ด้วย GitHub Pages — เปิด **Settings → Pages → Source: Deploy from a branch →
Branch: `main` / `(root)`**

ดูในเครื่องตัวเอง:

```powershell
python -m http.server 8777
```

แล้วเปิด <http://localhost:8777>

## สิทธิ์การใช้งาน

เนื้อหาและโค้ดในรีโปนี้จัดทำเพื่อการศึกษา
