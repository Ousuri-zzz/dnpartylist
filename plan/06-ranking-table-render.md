## 📁 ไฟล์ 06-ranking-table-render.md

### 🎯 จุดประสงค์
แสดงตารางจัดอันดับตัวละครในหน้า `/ranking` โดยแสดงข้อมูลครบทุกคอลัมน์, จัดเรียงตามค่าที่เลือก, และตกแต่ง UI ให้สวยงาม อ่านง่าย และรองรับมือถือ

---

### 📊 คอลัมน์ในตาราง
| คอลัมน์ | ตัวอย่างค่า |
|----------|---------------|
| 🏅 Rank     | 1, 2, 3, ... |
| 👤 Discord  | Ousuri#1234 |
| 🎮 Character| Lumiere     |
| 🧙 Subclass | Elemental Lord |
| ⚔️ ATK      | 3.2M         |
| ❤️ HP       | 5.6M         |
| 🛡️ DEF%     | 72%          |
| 🎯 CRI%     | 88%          |
| 🔥 ELE%     | 55%          |
| 💥 FD%      | 145%         |
| 📈 Score    | 6,915,420    |

---

### ✅ ฟีเจอร์ UI ที่ต้องมี
- แสดงเลขลำดับ (`index + 1`)
- ค่าต่าง ๆ ใช้การจัด format:
  - ATK / HP → แสดง `K` / `M`
  - ค่า % → ต่อท้ายด้วย `%`
- แถวของผู้ใช้ปัจจุบัน → เน้นด้วย `bg-yellow-100` หรือเส้นขอบ
- พื้นหลังของแถว → ใช้สีพาสเทลประจำอาชีพย่อย (ตามระบบเดิม)
- เมื่อ hover → มี effect จางหรือ enlarge เล็กน้อย

---

### 📦 การแสดงข้อมูลแบบ Loop
```tsx
{sortedCharacters.map((char, index) => (
  <tr key={char.id} className={`bg-${jobColorMap[char.job]}-50 hover:bg-opacity-20`}>
    <td>{index + 1}</td>
    <td>{char.discordName}</td>
    <td>{char.name}</td>
    <td>{char.job}</td>
    <td>{formatNumber(char.stats.atk)}</td>
    <td>{formatNumber(char.stats.hp)}</td>
    <td>{char.stats.def}%</td>
    <td>{char.stats.cri}%</td>
    <td>{char.stats.ele}%</td>
    <td>{char.stats.fd}%</td>
    <td>{formatNumber(calculateStatScoreByJob(char.stats, char.job))}</td>
  </tr>
))}
```
> หมายเหตุ: ใช้ `jobColorMap` เพื่อระบายสีพื้นหลังแต่ละอาชีพ

---

### 📱 รองรับมือถือ (responsive)
- ใช้ `overflow-x-auto` ครอบตารางใน container
- Font ขนาดไม่เล็กเกินไป และมี `min-w-[1200px]` เพื่อไม่บีบข้อมูลจนอ่านยาก
- ใช้ Tailwind เช่น `text-sm md:text-base`, `px-2 md:px-4`

---

ขั้นตอนถัดไป: สรุปผลและแนบตัวอย่างวิธีใช้งานทั้งหมด → จะเก็บใน `07-ranking-summary.md`
