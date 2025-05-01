สร้างหรือปรับ Dark Mode สำหรับเว็บ DNPartyList ตามรายละเอียดต่อไปนี้ พร้อมปรับทุก component ที่มีอยู่ให้รองรับได้โดยไม่เสีย contrast หรือความชัดเจน:
🌓 โปรดเพิ่ม Dark Mode ให้กับโปรเจกต์ DNPartyList โดยมีรายละเอียดดังนี้:

## 🔧 การตั้งค่า Tailwind
- ตั้งค่า `darkMode: 'class'` ในไฟล์ `tailwind.config.js`
- เพิ่มชุดสีใหม่สำหรับแต่ละอาชีพที่เหมาะกับ dark mode โดยใช้ `extend.colors` เช่น:
  ```ts
  colors: {
    warrior: '#FF6B6B',
    warriorDark: '#E74C3C',
    archer: '#4ECDC4',
    archerDark: '#1ABC9C',
    sorceress: '#A29BFE',
    sorceressDark: '#9B59B6',
    cleric: '#5DADE2',
    clericDark: '#3498DB',
    academic: '#F9E79F',
    academicDark: '#F39C12',
  }

🎨 ปรับ UI ทั้งหมดให้รองรับ Dark Mode
เปลี่ยนพื้นหลังให้เป็น dark:bg-gray-900 หรือ dark:bg-[#121212]

เปลี่ยนข้อความให้เป็น dark:text-white หรือ dark:text-gray-100

ปรับกล่องและปุ่มให้ดูชัดในทั้งสองโหมด โดยใช้คลาส dark: กับ bg, text, border, shadow

ให้ Card, Modal, Checklist, Navbar, ปุ่มทุกชนิด ใช้สีที่อ่านง่ายบนพื้นหลังเข้ม

🧩 เพิ่มปุ่ม Toggle Dark Mode
สร้างปุ่ม Toggle (icon ☀️/🌙 หรือข้อความ Light/Dark)

ปุ่มสามารถวางไว้ใน Navbar หรือมุมขวาบนของทุกหน้า

เมื่อคลิกแล้วให้เพิ่ม/ลบ class dark ที่ <html>

เก็บสถานะไว้ใน localStorage เช่น theme = 'dark' หรือ 'light' และโหลดค่าดังกล่าวใน useEffect เพื่อคงโหมดเดิมเมื่อ refresh

🧪 ตัวอย่าง UI
โปรดอัปเดตทุกหน้าหลักในระบบ:

หน้า /mypage: card ตัวละครต้องอ่าน stat ชัด

หน้า /party: รายชื่อสมาชิกปาร์ตี้, พื้นหลัง card

Modal และ input: มี contrast ชัดเจนใน dark

Checklist: สีที่ติ๊กแล้วต้องยังแยก Daily/Weekly และแสดงสีตามอาชีพได้ชัดเจนแม้ใน dark

❌ ข้อห้าม
ห้ามใช้สีพาสเทลจางใน dark mode เพราะจะอ่านยาก

อย่าเปลี่ยนระบบ logic ใด ๆ หรือโครงสร้าง component โดยไม่จำเป็น

---

## 🧠 เคล็ดลับเพิ่มเติม:
หากใช้กับ Cursor:
- สร้างไฟล์ใหม่ชื่อ `theme-toggle.tsx` (หรือ `ThemeSwitcher.tsx`)
- ใน `layout.tsx` หรือ `_app.tsx` ใช้ `useEffect` ใส่/ลบ class `dark` บน `<html>`
- ตั้งค่าเบื้องต้นใน `tailwind.config.js` ตาม prompt นี้

---

หากต้องการให้ผมเขียนโค้ดตัวอย่างให้บางส่วน เช่นปุ่ม Toggle หรือ config Tailwind ก็บอกได้เลยครับ  
ต้องการไหมครับ?

