
โปรเจกต์นี้คือเว็บไซต์ชื่อว่า DNPartyList พัฒนาด้วย Next.js + TypeScript + Tailwind CSS + Firebase Realtime Database และ deploy บน Vercel

เป้าหมาย:
สร้างเว็บไซต์สำหรับผู้เล่น Dragon Nest เพื่อ:
- จัดการตัวละคร
- เช็คกิจกรรม Daily / Weekly
- จัดปาร์ตี้ลงดันเจี้ยน
- แชร์ลิงก์ปาร์ตี้ผ่าน Discord
- แสดง Stat ปาร์ตี้แบบกราฟ
- UI สวยงาม สีพาสเทล อ่านง่าย เหมาะกับการใช้งานจริง

✅ เทคโนโลยีที่ใช้:
- Next.js + TypeScript
- Tailwind CSS
- Firebase Auth (Google Login)
- Firebase Realtime Database
- Vercel (auto preview จาก GitHub)

✅ ระบบผู้ใช้:
- Login ด้วย Google (Firebase Auth)
- หลังล็อกอินให้กรอกชื่อ Discord หนึ่งครั้ง ใช้ร่วมกับตัวละครทั้งหมดของผู้ใช้
- ข้อมูลแยกตาม UID และเก็บใน Firebase

✅ ระบบตัวละคร:
- เพิ่ม / แก้ไข / ลบตัวละคร
- ข้อมูลแต่ละตัว:
  - ชื่อตัวละคร
  - อาชีพย่อย (เลือกจาก 8 คลาส: Swordsman, Mercenary, Bowmaster, Acrobat, Force User, Elemental Lord, Paladin, Saint)
  - Stat:
    - ATK
    - CRI%
    - FD
    - Element%
    - HP
    - DEF (P.DEF%, M.DEF%)

📌 รูปแบบการแสดงผล Stat:
ATK: 1.5M        CRI: 85%
FD: 1450         Element: 30%
HP: 6.2M         DEF: P.78% / M.70%

📌 Card UI ของตัวละคร:
- ใช้สีพื้นหลังตาม "อาชีพหลัก" ของอาชีพย่อย:
  - Warrior: แดง (Swordsman, Mercenary)
  - Archer: เขียว (Bowmaster, Acrobat)
  - Sorceress: ม่วง (Force User, Elemental Lord)
  - Cleric: ฟ้า (Paladin, Saint)
- Card UI ต้อง:
  - บรรทัดบนสุด: ชื่อ Discord (เจ้าของตัวละคร)
  - บรรทัดต่อไป: ชื่อตัวละคร | อาชีพย่อย
  - Stat ตาม format ด้านบน
  - Checklist [รายวัน] + [รายสัปดาห์]
  - ปุ่มลบตัวละคร (เฉพาะเจ้าของ)

✅ ระบบ Checklist:
- รายวัน: Daily Quest, FTG 700
- รายสัปดาห์: (แยกเนสต์)
  - Minotaur 7 รอบ
  - Cerberus 5 รอบ
  - Cerberus Hell 2 รอบ
  - Cerberus Challenge 1 รอบ
  - Manticore 3 รอบ
  - Manticore Hell 1 รอบ
  - Apocalypse 3 รอบ
  - Apocalypse Hell 1 รอบ
  - Sea Dragon 1 รอบ
  - Chaos Rift Kamala 3 รอบ
  - Chaos Rift Bairra 3 รอบ
  - Banquet Hall of Darkness 1 รอบ
  - Jealous Albeuteur 1 รอบ
  - Wonderful Theme Park (ไม่ใช้ปาร์ตี้)

🕘 เวลาที่ใช้รีเซ็ต Checklist:
- รายวัน: 09:00 น. ทุกวัน
- รายสัปดาห์: 08:00 น. วันเสาร์
- Checkbox ที่ติ๊กแล้วใช้สีเดียวกับสายอาชีพของตัวละคร

✅ ระบบปาร์ตี้:
- ผู้ใช้สามารถสร้างปาร์ตี้โดยเลือกเนสต์
- รองรับจำนวนคนตามตารางนี้:
[เนื้อหาตารางเนสต์ตามที่คุณระบุไว้ก่อนหน้า]

📌 เงื่อนไข:
- ตัวละคร 1 ตัวอยู่ได้หลายปาร์ตี้ แต่ห้ามซ้ำเนสต์
- หัวปาร์ตี้สามารถลบสมาชิก
- สมาชิกออกเองได้
- ปุ่มเพิ่มสมาชิกจะกลับมาเมื่อมีช่องว่าง

✅ แชร์ลิงก์ปาร์ตี้:
- แชร์ผ่าน /party/[id]
- เข้าผ่าน /join/[id] → redirect หากยังไม่ login หรือยังไม่มีตัวละคร
- ถ้าตัวละครอยู่เนสต์เดียวกันแล้ว ให้ลบจากของเก่าก่อนเพิ่มใหม่

✅ ปุ่ม "เชิญผ่าน Discord":
- กดแล้วให้กรอกชื่อห้อง Discord (optional)
- แสดงข้อความพร้อมลิงก์ปาร์ตี้ เช่น:
[ตัวอย่างข้อความ Discord]

✅ ระบบ Stat ปาร์ตี้:
- แสดงค่าเฉลี่ย: ATK, CRI, HP, P.DEF, M.DEF
- มี min/max stat
- หัวปาร์ตี้สามารถตั้งเป้าหมาย stat ได้
- แสดงด้วย Radar Chart

✅ UX / UI:
- กล่อง Card UI: ขนาดใหญ่, อ่านง่าย, สีพาสเทล, ดูทันสมัย
- ใช้พื้นที่หน้าจอให้เต็ม, ชัดเจน, ตอบสนองไว, ทุกหน้าเชื่อมต่อกันอย่างชาญฉลาด
- ตรงไหนไม่ใช้บ่อยๆควรซ่อน, pop-up ในส่วนที่ทำให้สะดวก
- Font: Prompt หรือ Noto Sans Thai
- Layout ชัดเจน จัดกลางจอ
- ปุ่มทันสมัย, แตะง่าย, shadow-md, rounded-2xl
- Responsive: มือถือ / แท็บเล็ต / PC

✅ ข้อกำหนดทั่วไป:
- ทุกหน้าต้องมีลายเซ็น: “Guild Galaxycat by Ousuri”
- หัวข้อหน้าต้องแสดง:
  - My Page → My Character
  - Party Page → Dragon Nest Party List
⏱️ เริ่มต้นจากการสร้างหน้า mypage.tsx ก่อน พร้อม Card ตัวละคร, Checklist, ปุ่มลบ และระบบแสดง Discord
หากจำเป็นสามารถแยก Component เช่น CharacterCard.tsx, Checklist.tsx, DeleteButton.tsx, DiscordName.tsx ได้เลย
