# Prompt สำหรับแก้ระบบรีเซ็ต Checklist และสร้างใหม่แบบ Client-Side

สามารถใช้สั่งให้ Cursor ลบระบบเดิม (ที่ใช้ Firebase Admin SDK) แล้วสร้างระบบรีเซ็ตใหม่ที่ทำงานฝั่ง Client ได้อย่างถูกต้อง

---

## ✅ เป้าหมายของระบบ
- ระบบ checklist รายวัน / รายสัปดาห์ สำหรับตัวละคร
- รองรับรีเซ็ตทั้งแบบอัตโนมัติ (ตามเวลาไทย) และแบบ manual (กดปุ่มเอง)
- เก็บเวลารีเซ็ตล่าสุดไว้ที่ `users/[uid]/meta/`
- ห้ามใช้ Firebase Admin SDK ทุกกรณี (ใช้เฉพาะ Firebase Client SDK)

---

## ✅ โครงสร้าง Firebase ที่ใช้

- Checklist:
  - `users/[uid]/characters/[charId]/checklist/daily`
  - `users/[uid]/characters/[charId]/checklist/weekly`

- เวลาที่รีเซ็ตล่าสุด:
  - `users/[uid]/meta/lastResetDaily`
  - `users/[uid]/meta/lastResetWeekly`

ค่า default: `false` สำหรับทุกกิจกรรม

---

## ✅ รีเซ็ตแบบอัตโนมัติ (Auto Reset)

- ทุกครั้งที่ผู้ใช้เข้า `/mypage` หรือหน้า checklist ใด ๆ:
  1. เรียก `checkAndResetChecklist()`
  2. ตรวจสอบเวลาไทย (timezone +07:00)
     - รายวัน: รีเซ็ตเวลา 09:00 ทุกวัน
     - รายสัปดาห์: รีเซ็ตเวลา 08:00 ทุกวันเสาร์
  3. หากผ่านเวลา → รีเซ็ต checklist เป็น `false`
  4. อัปเดต `lastResetDaily` / `lastResetWeekly` เป็นเวลาปัจจุบัน

---

## ✅ รีเซ็ตแบบ manual (Reset Day / Reset Week)

- ปุ่มอยู่ใน Dropdown บนชื่อ Discord มุมขวาบน
- เมื่อกดแต่ละปุ่ม:
  1. แสดง modal ยืนยัน
  2. ถ้ายืนยัน → เรียก `resetChecklist('daily')` หรือ `resetChecklist('weekly')`
  3. Loop ตัวละครของผู้ใช้ (uid ปัจจุบันเท่านั้น)
  4. รีเซ็ต checklist เป็น false และอัปเดตเวลาล่าสุด

- ปุ่มใช้ชื่อ:
  - `Reset Day`
  - `Reset Week`

- Animation + Toast:
  - “รีเซ็ต Checklist รายวันเรียบร้อยแล้ว!”
  - “รีเซ็ต Checklist รายสัปดาห์เรียบร้อยแล้ว!”

---

## ✅ ฟังก์ชันที่ต้องมี

- `checkAndResetChecklist()` → ทำงานอัตโนมัติเมื่อเข้าเว็บ
- `resetChecklist(type: 'daily' | 'weekly')` → manual reset
- ใช้ Firebase Client SDK (get, update, ref)

---

## ✅ ความปลอดภัย

- ห้ามใช้ Firebase Admin SDK หรือ server-side SDK
- เขียนข้อมูลเฉพาะ user ที่ login อยู่ (`auth.currentUser.uid`)
- ห้ามแตะข้อมูลของ user อื่น

---

## ✅ UI และ UX

- ปุ่ม Dropdown ใช้ shadcn/ui หรือ Radix
- Modal → แบบเดียวกับ confirm ลบตัวละคร
- Font: Prompt หรือ Noto Sans Thai
- ปุ่มโค้งมน สีพาสเทล, มี animation