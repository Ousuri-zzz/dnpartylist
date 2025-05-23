## 📁 ไฟล์ 03-ranking-table-ui.md (อัปเดต)

### 🎯 จุดประสงค์
สร้าง UI ตารางจัดอันดับตัวละครในหน้า `/ranking` โดยมีระบบกรองอาชีพและประเภทสเตตัส พร้อมแสดงคอลัมน์ครบถ้วน และดีไซน์ให้ทันสมัย สวยงาม อ่านง่าย รองรับทั้งมือถือและเดสก์ท็อป

---

### 📊 คอลัมน์ในตาราง (เรียงตามนี้)
| คอลัมน์ | ไอคอน | คำอธิบาย |
|----------|--------|------------|
| Rank     | 🏅     | ลำดับที่จัดอันดับตามค่าที่เลือก |
| Discord  | 👤     | ชื่อ Discord ของเจ้าของตัวละคร |
| Character| 🎮     | ชื่อตัวละคร |
| Subclass | 🧙     | อาชีพย่อย (10 อาชีพย่อยที่กำหนดไว้ใน jobWhitelist) |
| ATK      | ⚔️     | พลังโจมตี (แสดงแบบ 1.2M) |
| HP       | ❤️     | พลังชีวิต (แสดงแบบ 850K) |
| DEF%     | 🛡️     | พลังป้องกัน (%) |
| CRI%     | 🎯     | อัตราคริติคอล (%) |
| ELE%     | 🔥     | ค่าธาตุ (%) |
| FD%      | 💥     | Final Damage (%) |
| Score    | 📈     | คะแนนรวมตามสูตรเฉพาะอาชีพ (แสดงเมื่อเลือกจัดอันดับแบบ Score)

---

### 🔽 ระบบกรอง (อยู่ด้านบนของตาราง)
1. **Dropdown เลือกอาชีพ**
   - รายการ: "ทั้งหมด" + 10 อาชีพย่อย (อิงจาก `jobWhitelist` ด้านล่าง)
   - ค่า default: "ทั้งหมด"

2. **Dropdown เลือกค่าที่ใช้จัดอันดับ**
   - รายการ: Score, ATK, HP, DEF%, CRI%, ELE%, FD%
   - ค่า default: Score

3. **ช่องค้นหา** (เสริม)
   - พิมพ์ชื่อ Discord หรือชื่อตัวละคร → กรองผลลัพธ์

---

### 📦 jobWhitelist (สำหรับกรองและจัดอันดับ)
```ts
const jobWhitelist = [
  "Sword Master",
  "Mercenary",
  "Bowmaster",
  "Acrobat",
  "Force User",
  "Elemental Lord",
  "Paladin",
  "Priest",
  "Engineer",
  "Alchemist"
];
```

---

### 🎨 การออกแบบด้วย Tailwind CSS
- พื้นหลังสีพาสเทล (แตกต่างตามอาชีพย่อย)
- กรอบโค้ง (`rounded-2xl`), มีเงา (`shadow-md`), padding สวยงาม
- เพิ่ม `hover:bg-opacity-10` เมื่อ mouse ชี้ที่ row
- เน้น row ของตัวละครของผู้ใช้ (เช่น `bg-yellow-100`)
- Responsive เต็มรูปแบบ (แถวปรับขนาดได้เมื่อใช้มือถือ)

---

### 🧩 การแสดงผล Score
- คำนวณด้วยฟังก์ชันจากไฟล์ `02-score-calculation.md`
- ถ้าเลือกจัดอันดับด้วย Score → ใช้ฟิลด์นี้จัดอันดับและแสดงด้วย
- ถ้าเลือกค่าสเตตัสอื่น → ยังแสดง Score อยู่ แต่ไม่ต้องจัดอันดับตามมัน

---

ขั้นตอนถัดไป: สร้างระบบเชื่อมโยงหน้า `/ranking` เข้ากับ Navbar พร้อมไอคอน 📊 → จะจัดเก็บในไฟล์ `04-ranking-navbar.md`