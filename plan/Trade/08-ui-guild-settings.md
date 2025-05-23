## 👑 UI หน้าจัดการกิลด์ (Guild Settings UI)

หน้านี้เปิดให้หัวกิลด์สามารถจัดการสิทธิ์ของหัวกิลด์คนอื่น ๆ และเปลี่ยนรหัสยืนยันกิลด์ (secretKey) ได้ โดยใช้ข้อมูลจาก `/guildSettings/[guildName]`

---

## ✅ ที่อยู่หน้าเว็บ

```
/guild/settings
```

---

## ✅ เงื่อนไขการเข้าถึง

* ต้อง login ด้วย Google และมี Discord ID
* ต้องเป็นหัวกิลด์ (`discordId in leaders` ของกิลด์ตนเอง)

---

## ✅ โครงสร้าง UI

### 1. หัวหน้าเพจ

* ชื่อ: `⚙️ ตั้งค่ากิลด์`
* แสดงชื่อกิลด์ (จาก guildSettings)

### 2. รายชื่อหัวกิลด์ปัจจุบัน

* ดึงจาก `/guildSettings/[guildName]/leaders`
* แสดงชื่อ + Discord ID
* แต่ละรายชื่อมี:

  * ปุ่ม `ลบสิทธิ์` (ยกเว้นตนเอง)

### 3. เพิ่มหัวกิลด์ใหม่

* ช่องกรอก Discord ID ใหม่
* ปุ่ม `เพิ่มหัวกิลด์`
* เมื่อกด → อัปเดต leaders object และแสดง Toast สำเร็จ

### 4. เปลี่ยนรหัส secretKey

* ช่องกรอกรหัสใหม่ (input)
* ปุ่ม `เปลี่ยนรหัสกิลด์`
* เมื่อเปลี่ยนสำเร็จ Toast: "เปลี่ยนรหัสแล้ว ✅"

---

## ✅ รูปแบบข้อมูลที่ใช้

```json
/guildSettings/[guildName] {
  secretKey: "galaxy2025!auth",
  leaders: {
    "123456": "Ousuri",
    "789000": "Sakura"
  }
}
```

---

## 🧠 หมายเหตุ

* ป้องกันการลบตัวเอง → ต้องให้หัวกิลด์คนอื่นลบ
* หาก leaders ว่างเปล่า → เปิดให้ผู้กรอกรหัสที่ถูกต้องรับสิทธิ์คนแรกได้
* รองรับ Toast ทุกการดำเนินการ: เพิ่ม/ลบ/เปลี่ยนรหัส
* หากไม่ใช่หัวกิลด์ → redirect ออกทันที
