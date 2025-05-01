## 📁 ไฟล์ 02-score-calculation.md

### 📌 จุดประสงค์
กำหนดสูตรการคำนวณ "คะแนนรวม" (Stat Score) โดยใช้ค่าน้ำหนักตามจุดเด่นของแต่ละอาชีพ เพื่อให้การจัดอันดับมีความยุติธรรมข้ามสายอาชีพ

---

### 📦 ค่าที่ใช้ในการคำนวณ
ค่าทั้งหมดจาก Firebase ตัวละคร:
- ATK → ค่าตัวเต็ม เช่น 3,200,000
- HP → ค่าตัวเต็ม เช่น 5,600,000
- DEF%, CRI%, ELE%, FD% → เป็นเปอร์เซ็นต์ เช่น 72, 88, 55, 145

---

### 🧮 สูตรคำนวณ (Stat Score)
ค่าคะแนนรวมจะใช้สูตร:
```ts
score = 
  atk * weight.atk +
  hp * weight.hp +
  def * 10000 * weight.def +
  cri * 10000 * weight.cri +
  ele * 10000 * weight.ele +
  fd  * 10000 * weight.fd
```
> หมายเหตุ: ค่าที่เป็น % จะ乘 10000 เพื่อให้มีระดับใกล้เคียง ATK/HP

---

### 🧙‍♂️ ค่าน้ำหนักตามอาชีพย่อย (Job Weight)
```ts
const jobWeights = {
  "Sword Master":     { atk: 1.0, hp: 0.2, def: 0.3, cri: 0.6, ele: 0.2, fd: 0.7 },
  "Mercenary":        { atk: 0.6, hp: 1.0, def: 0.8, cri: 0.2, ele: 0.1, fd: 0.3 },
  "Bowmaster":        { atk: 1.0, hp: 0.3, def: 0.2, cri: 0.8, ele: 0.6, fd: 0.4 },
  "Acrobat":          { atk: 0.7, hp: 0.3, def: 0.3, cri: 1.0, ele: 0.8, fd: 0.3 },
  "Force User":       { atk: 0.5, hp: 0.3, def: 0.2, cri: 0.6, ele: 1.0, fd: 0.8 },
  "Elemental Lord":   { atk: 0.6, hp: 0.3, def: 0.3, cri: 0.5, ele: 1.0, fd: 1.0 },
  "Paladin":          { atk: 0.2, hp: 1.0, def: 1.0, cri: 0.1, ele: 0.1, fd: 0.2 },
  "Priest":           { atk: 0.3, hp: 1.0, def: 1.0, cri: 0.1, ele: 0.2, fd: 0.2 },
  "Engineer":         { atk: 0.6, hp: 0.6, def: 0.4, cri: 0.7, ele: 0.5, fd: 1.0 },
  "Alchemist":        { atk: 0.3, hp: 0.8, def: 0.7, cri: 0.3, ele: 0.4, fd: 1.0 },
};
```

---

### 🧪 ตัวอย่างการใช้งาน
```ts
const score = calculateStatScoreByJob(stats, job);
```

โดย `calculateStatScoreByJob()` จะรับ stat ตัวละคร + อาชีพ แล้วคืนค่า `score: number`

---

ขั้นตอนถัดไป: สร้างตารางแสดง Ranking พร้อมระบบกรอง Dropdown → จะจัดเก็บในไฟล์ `03-ranking-table-ui.md`
