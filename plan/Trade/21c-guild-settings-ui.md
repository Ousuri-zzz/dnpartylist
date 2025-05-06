# 🛠️ plan/21c-guild-settings-ui.md

> สร้างหน้า `/guild/settings` สำหรับหัวกิลด์  
> ต่อจากระบบกิลด์เดียวและหัวกิลด์หลายคน (ไฟล์ 21 และ 21b)

---

## 🎯 เป้าหมาย

- สร้างหน้า `/guild/settings`
- ให้แสดงรายชื่อสมาชิกในกิลด์ (จาก /guild/members)
- ตรวจสอบสิทธิ์ว่าเป็นหัวกิลด์ก่อนแสดงเนื้อหา
- เพิ่มปุ่มจัดการ:
  - ลบสมาชิก
  - อนุมัติร้านค้า
  - ระงับร้านค้า

---

## 🧩 Step 1: ตรวจสอบสิทธิ์หัวกิลด์ก่อนแสดง

```ts
const uid = auth.currentUser?.uid
const leaderRef = ref(db, `guild/leaders/${uid}`)
const isLeader = (await get(leaderRef)).exists()

if (!isLeader) {
  return <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
}
```

---

## 👥 Step 2: แสดงรายชื่อสมาชิกในตาราง

ดึงข้อมูลจาก `/guild/members`:

```ts
ref(db, "guild/members")
```

แสดงเป็น Table:
| Discord | UID | วันที่เข้าร่วม | ตัวเลือก |
|---------|-----|----------------|-----------|
| Tester  | xxx | 2025-05-04     | [ลบ]      |

---

## 🧹 Step 3: ปุ่ม “ลบสมาชิก” (Hard Delete)

เมื่อหัวกิลด์กด “ลบ”:
- แสดง Modal ยืนยัน
- ลบข้อมูล:
```ts
remove(ref(db, `users/${uid}`))
remove(ref(db, `tradeMerchants/${uid}`))
remove(ref(db, `guild/members/${uid}`))
```

---

## 🛒 Step 4: แสดงร้านพ่อค้าที่รออนุมัติ

ดึงข้อมูล `/tradeMerchants` ที่ `status === "pending"`

| UID | Discord | สถานะ | ปุ่ม |
|-----|---------|--------|------|
| xxx | Tester  | pending | [อนุมัติ] [ระงับ] |

ปุ่ม:
```ts
update(ref(db, `tradeMerchants/${uid}`), { status: "active" })
update(ref(db, `tradeMerchants/${uid}`), { status: "suspended" })
```

---

## 🧭 Step 5: เพิ่มลิงก์ไปยัง `/guild/settings` ใน Navbar (เฉพาะหัวกิลด์)

```ts
if (isLeader) {
  return <Link href="/guild/settings">Guild Settings</Link>
}
```

---

## ✅ สรุป UI ที่ต้องมีในหน้า `/guild/settings`

- ตรวจสอบสิทธิ์หัวกิลด์
- ตารางรายชื่อสมาชิก + ปุ่มลบ
- ตารางร้านค้าที่รออนุมัติ + ปุ่มจัดการ
- Toast แจ้งเตือนเมื่อสำเร็จ

---

## 🔰 พร้อมทำต่อ

- เพิ่มแดชบอร์ดกิลด์ (plan/22)
- จัดการกิจกรรม / ประกาศ
