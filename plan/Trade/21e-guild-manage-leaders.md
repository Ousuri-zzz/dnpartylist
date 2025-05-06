# 👑 plan/21e-guild-manage-leaders.md

> เพิ่มระบบจัดการหัวกิลด์ (เพิ่ม/ลบ)  
> ใช้งานในหน้า `/guild/settings` โดยหัวกิลด์ที่มีสิทธิ์

---

## 🎯 เป้าหมาย

- ให้หัวกิลด์สามารถ:
  - ✅ เพิ่มหัวกิลด์คนอื่น
  - ❌ ลบหัวกิลด์ออกจากระบบ
- อ้างอิงข้อมูลจาก `/guild/leaders/[uid]: true`

---

## 👥 Step 1: ดึงรายชื่อหัวกิลด์ทั้งหมด

ดึงจาก path:
```ts
ref(db, "guild/leaders")
```

แสดงเป็นตาราง:
| UID | Discord Name | ปุ่ม |
|-----|--------------|------|
| xxx | Tester       | [ลบหัวกิลด์] |

---

## ➕ Step 2: เพิ่มหัวกิลด์ใหม่

- Input กรอก UID ของผู้ใช้
- Optional: ดึง Discord name จาก `/users/[uid]/meta/discord`
- เมื่อกด "เพิ่ม":

```ts
update(ref(db, `guild/leaders/${newUid}`), true)
```

- แสดง toast สำเร็จ

---

## 🗑️ Step 3: ลบหัวกิลด์

- แสดงปุ่ม "ลบหัวกิลด์" ถ้า `uid !== auth.currentUser.uid` (กันไม่ให้ลบตัวเอง)
- เมื่อกด:

```ts
remove(ref(db, `guild/leaders/${uid}`))
```

- แสดง toast และ refresh list

---

## 🔐 Step 4: เช็คสิทธิ์

ให้ใช้ logic:
```ts
const isLeader = (await get(ref(db, `guild/leaders/${auth.uid}`))).exists()
```

หากไม่ใช่หัวกิลด์ → ห้ามเข้าถึง

---

## ✅ สรุป

| ฟีเจอร์ | ทำงานอย่างไร |
|----------|----------------|
| ดึงหัวกิลด์ทั้งหมด | `/guild/leaders` |
| เพิ่มหัวกิลด์ | `update(..., true)` |
| ลบหัวกิลด์ | `remove(...)` |
| ห้ามลบตัวเอง | เช็คว่า `uid !== auth.uid` |

---

## 🔰 พร้อมทำต่อ

- เพิ่ม UI ยืนยันก่อนลบ
- ปรับให้เฉพาะหัวกิลด์สามารถเห็น section นี้
