## 📁 ไฟล์ 05-ranking-data-fetch.md (อัปเดต)

### 🎯 จุดประสงค์
โหลดข้อมูลตัวละครทั้งหมดจาก Firebase Realtime Database แล้วจัดเรียงลำดับตามค่าที่ผู้ใช้เลือก (เช่น Score, ATK, HP, FD%) พร้อมระบบกรองตามอาชีพย่อยที่กำหนด

---

### 📦 โครงสร้างข้อมูลตัวละคร (จาก Firebase)
```ts
{
  name: string,
  job: string,
  discordName: string,
  stats: {
    atk: number,
    hp: number,
    def: number,
    cri: number,
    ele: number,
    fd: number
  }
}
```

### ✅ ขั้นตอนการทำงาน
1. ดึงข้อมูลทั้งหมดจาก path `/characters` จาก Firebase Realtime Database
2. กรองเฉพาะตัวละครที่ `job` อยู่ใน `jobWhitelist` (10 อาชีพย่อย)
3. หากผู้ใช้เลือก "Score" → คำนวณคะแนนรวมโดยใช้สูตรจาก `02-score-calculation.md`
4. หากเลือกค่าอื่น → ใช้ค่าจาก `stats.[field]` โดยตรง เช่น `stats.fd`
5. เรียงลำดับจากมาก → น้อย ตามค่าที่เลือก
6. หากเลือกกรองอาชีพเฉพาะ → แสดงเฉพาะตัวละครที่ตรงอาชีพนั้น

---

### 🧠 ตัวอย่างโค้ดดึงข้อมูลจาก Firebase (Client SDK)
```ts
import { getDatabase, ref, get } from 'firebase/database';

const db = getDatabase();
const snapshot = await get(ref(db, '/characters'));
const characters = snapshot.exists() ? Object.values(snapshot.val()) : [];
```

### 📃 jobWhitelist (สำหรับกรองอาชีพ)
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

### 🧠 ตัวอย่างการกรองและจัดอันดับ
```ts
const filtered = characters.filter((c) => jobWhitelist.includes(c.job));
const sorted = filtered.sort((a, b) => {
  const aValue = selectedStat === 'score'
    ? calculateStatScoreByJob(a.stats, a.job)
    : a.stats[selectedStat];

  const bValue = selectedStat === 'score'
    ? calculateStatScoreByJob(b.stats, b.job)
    : b.stats[selectedStat];

  return bValue - aValue; // มากไปน้อย
});
```
> หมายเหตุ: ใช้ `calculateStatScoreByJob()` จากไฟล์ 02

---

### 🧩 คำแนะนำเพิ่มเติม
- ให้ใช้ `useEffect + useState` หากเป็น React Client Component
- หากใช้ Server Component (Next.js) → ใช้ `getServerSideProps()` หรือ async ใน `app/ranking/page.tsx`

---

ขั้นตอนถัดไป: แสดงข้อมูลเรียงลำดับในตารางพร้อมจัดรูปแบบ + เพิ่มเลข Rank และแสดง Score → เก็บใน `06-ranking-table-render.md`