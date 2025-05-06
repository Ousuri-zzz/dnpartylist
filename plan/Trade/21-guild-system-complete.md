# 🛡️ ระบบกิลด์ (Guild System) สำหรับ DNPartyList

> ระบบกิลด์แบบ "กิลด์เดียว + หัวกิลด์ควบคุมสมาชิก"  
> ใช้ต่อยอดจากระบบ trade/checklist/character ที่มีอยู่แล้ว

---

## ✅ เป้าหมาย

- ใช้ path `/guild` เดียว (ไม่รองรับหลายกิลด์)
- ทุก user ที่ login สำเร็จจะถูกเพิ่มเข้าเป็นสมาชิกอัตโนมัติ
- หัวกิลด์ (guild.leaderUid) มีสิทธิ์:
  - ลบ / แก้ไข / ตรวจสอบข้อมูลของสมาชิก
  - อนุมัติร้านพ่อค้า
  - อนุมัติและยืนยัน loan ที่กู้จากกิลด์
- ไม่กระทบระบบเดิม: character, party, trade, ranking

---

## 📌 Step-by-Step

### 🥇 Step 1: สร้างระบบกิลด์เดียว (`/guild`)

- สร้าง path `/guild` โดยมีโครงสร้าง:
```ts
/guild = {
  name: "GalaxyCat",
  secretKey: "myGuildSecretKey",
  leaderUid: "uid ของหัวกิลด์",
  members: {
    [uid]: {
      discordName: "...",
      joinedAt: "2025-05-04T00:00:00Z"
    }
  }
}
```

- เพิ่มฟังก์ชัน `initializeGuild(secretKey)` สำหรับตั้งกิลด์ครั้งแรก

---

### 🥈 Step 2: Auto Join สมาชิกเมื่อ Login

- ทุกครั้งที่ user login:
  - เช็ค `/guild/members/[uid]`
  - ถ้ายังไม่มี → เพิ่มให้ทันทีด้วยข้อมูล Discord Name + joinedAt

```ts
const uid = auth.currentUser.uid
const memberRef = ref(db, `guild/members/${uid}`)
get(memberRef).then(snap => {
  if (!snap.exists()) {
    set(memberRef, {
      discordName: auth.currentUser.displayName,
      joinedAt: new Date().toISOString()
    })
  }
})
```

---

### 🥉 Step 3: สร้างหน้า `/guild/settings`

- ใช้สำหรับหัวกิลด์ (`auth.uid === guild.leaderUid`)
- แสดง:
  - รายชื่อสมาชิกทั้งหมด
  - รายการร้านค้าที่ pending
  - รายการ loan ที่ขอกู้จากกิลด์
- ปุ่มจัดการ:
  - แก้ไขตัวละคร
  - ลบสมาชิก
  - อนุมัติ / ระงับร้านค้า
  - อนุมัติ / ปฏิเสธ loan

---

### 🧹 Step 4: เพิ่มปุ่มลบสมาชิก (Hard Delete)

- ให้หัวกิลด์สามารถลบ uid ทั้งชุด:
```ts
await remove(ref(db, `users/${uid}`))
await remove(ref(db, `characters/${uid}`))
await remove(ref(db, `tradeMerchants/${uid}`))
await remove(ref(db, `guild/members/${uid}`))
```

- แสดง modal ยืนยันก่อนลบจริง  
- หลังลบ ผู้ใช้ยังสามารถ login ใหม่และสมัครได้อีกครั้ง

---

### ⚙️ Step 5: ปรับ Firebase Rules ให้หัวกิลด์มีสิทธิ์

เพิ่ม rule `.write` เฉพาะหัวกิลด์ใน path:

```js
".write": "auth.uid === $uid || root.child('guild/leaderUid').val() === auth.uid"
```

ใช้กับ:
- `/users/$uid`
- `/users/$uid/characters`
- `/users/$uid/meta`
- `/tradeMerchants/$uid`

เพิ่ม path ใหม่:
```js
"guild": {
  ".read": "auth != null",
  ".write": "auth != null"
}
```

---

### 🧾 Step 6: อนุมัติร้านพ่อค้าและระงับ

ในหน้า `/guild/settings`:
- แสดงร้านค้า `/tradeMerchants/[uid]` ที่ `status: "pending"`
- ปุ่ม “อนุมัติ” → เปลี่ยน status → `"active"`
- ปุ่ม “ระงับ” → `"suspended"`

```ts
await update(ref(db, `tradeMerchants/${uid}`), {
  status: "active"
})
```

---

## 📋 สรุป

| Step | ระบบ | จุดเด่น |
|------|-------|----------|
| 1 | `/guild` | สร้างกิลด์แบบเดี่ยว |
| 2 | auto join | สมาชิกทุกคนเข้าอัตโนมัติ |
| 3 | `/guild/settings` | หัวกิลด์จัดการสมาชิก |
| 4 | ลบสมาชิก | Hard delete แบบปลอดภัย |
| 5 | Firebase Rules | หัวกิลด์เขียน path ของสมาชิกได้ |
| 6 | อนุมัติร้าน | จัดการ trade system จาก guild

---

## 🔰 พร้อมทำต่อ
- สร้างหน้า UI `/guild/settings`
- เพิ่ม modal ลบสมาชิก / อนุมัติร้าน
- ลิงก์ปุ่มใน navbar เฉพาะหัวกิลด์
