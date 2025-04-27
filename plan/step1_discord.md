# 🧍‍♂️ DNPartyList – Prompt ระบบผู้ใช้ (Google Login + Discord + Dropdown)

ไฟล์นี้ใช้สำหรับ Cursor เพื่อสร้างระบบผู้ใช้ครบทุกส่วนอย่างละเอียด ตามที่ออกแบบไว้ในโปรเจกต์ DNPartyList

---

## ✅ เป้าหมายของระบบ

1. ให้ผู้ใช้สามารถล็อกอินด้วย Google (Firebase Auth)
2. เมื่อ login ครั้งแรก → กรอกชื่อ Discord ที่ใช้ในระบบ
3. หลัง login แล้ว → แสดงชื่อ Discord ที่มุมขวาบน พร้อมเมนู Dropdown
4. ข้อมูลทั้งหมดเก็บใน Firebase Realtime Database (เฉพาะฝั่ง client)
5. UI ใช้งานง่าย สบายตา รองรับทุกขนาดหน้าจอ

---

## ✅ รายละเอียดฟังก์ชัน

### 🔐 Login ด้วย Google (Firebase Auth)
- ใช้ Firebase Authentication ฝั่ง client
- เมื่อล็อกอินสำเร็จ → เก็บ `uid` สำหรับใช้งานทุกระบบ
- ใช้ GoogleAuthProvider จาก `firebase/auth`

### 💬 กรอกชื่อ Discord
- หลัง login ครั้งแรก → เปิด Modal ให้กรอกชื่อ Discord
- บันทึกชื่อไว้ที่:
  ```js
  users/[uid]/meta/discord
  ```
- ใช้ชื่อนี้แสดงแทนผู้ใช้งานในทุกจุดของระบบ (รวมถึงตัวละคร / ปาร์ตี้)

### ☰ เมนู Discord Dropdown (มุมขวาบน)
- เมื่อคลิกชื่อ Discord → แสดง Dropdown menu (ใช้ shadcn/ui หรือ Radix UI)
- ภายในเมนูประกอบด้วย:
  1. ✏️ เปลี่ยนชื่อ Discord → เปิด Modal ใหม่สำหรับแก้ไข
  2. 🔄 Reset Day → เรียกฟังก์ชันรีเซ็ต Checklist รายวัน
  3. 🔁 Reset Week → เรียกฟังก์ชันรีเซ็ต Checklist รายสัปดาห์
  4. 🚪 Logout

- UI: ปุ่มโค้งมน สีพาสเทล มี icon สวยงาม

---

## ✅ รายละเอียด Firebase

- ต้องใช้เฉพาะ Firebase Client SDK
  - `firebase/auth` → login/logout
  - `firebase/database` → get/set/update ชื่อ Discord
- ห้ามใช้ Firebase Admin SDK หรือ server-side SDK ใด ๆ

### โครงสร้างข้อมูล:
```json
users: {
  [uid]: {
    meta: {
      discord: "ชื่อ Discord ของผู้ใช้"
    }
  }
}
```

---

## ✅ UI/UX

- ใช้ Font: `Prompt` หรือ `Noto Sans Thai`
- Dropdown รองรับ Responsive ทุกขนาดจอ
- Modal ใส่ transition สวยงาม
- ใช้ Toast แจ้งเตือนหลังเปลี่ยนชื่อสำเร็จ เช่น: “อัปเดตชื่อ Discord เรียบร้อยแล้ว!”

---

## 🧠 หมายเหตุสำหรับ Cursor

- ตรวจสอบว่า user login หรือยัง → หากยังไม่ login ให้ redirect ไป `/login`
- หาก login แล้วแต่ยังไม่มีชื่อ Discord → เปิด Modal ทันที
- ให้จำชื่อ Discord ไว้ใน context เพื่อใช้ในหน้าอื่น (เช่น `/mypage`, `/party`)