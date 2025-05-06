# 🛡️ plan/21b-guild-system-multi-leader.md

> เสริมจากระบบกิลด์ (21-guild-system-complete.md)  
> ✅ เพิ่มการรองรับหัวกิลด์หลายคน  
> ✅ ตั้งหัวกิลด์คนแรกเป็น Tester (uid: 2GS9xCHpizYrEAiAEMJOc37zF1o2)  
> ✅ ปรับ Rules และโครงสร้างให้ยืดหยุ่นและปลอดภัย

---

## ✅ โครงสร้าง `/guild` แบบใหม่ (multi leader)

```json
/guild = {
  name: "GalaxyCat",
  leaders: {
    "2GS9xCHpizYrEAiAEMJOc37zF1o2": true,
    "uid_อื่น": true
  },
  members: {
    "2GS9xCHpizYrEAiAEMJOc37zF1o2": {
      discordName: "Tester",
      joinedAt: "2025-05-04T10:48:56.336Z"
    }
  }
}
```

---

## ✍️ Step 1: แก้ Firebase Rules ให้รองรับหัวกิลด์หลายคน

ให้ใช้ rule:
```js
".write": "auth.uid === $uid || root.child('guild/leaders/' + auth.uid).val() === true"
```

ใช้กับ paths ต่อไปนี้:
- `/users/$uid`
- `/users/$uid/characters`
- `/users/$uid/meta`
- `/tradeMerchants/$uid`
- `/guild/announcements`
- `/guild/events`

---

## 🧩 Step 2: อัปเดตการเช็คสิทธิ์ในโค้ด UI

ก่อนใช้สิทธิ์แก้ไข ให้ใช้:
```ts
const isLeader = (uid: string) => {
  const snapshot = await get(ref(db, `guild/leaders/${uid}`))
  return snapshot.exists()
}
```

นำไปใช้ใน:
- หน้า `/guild/settings`
- ปุ่มลบสมาชิก
- ปุ่มอนุมัติร้านค้า

---

## ⚙️ Step 3: เพิ่มสิทธิ์จัดการหัวกิลด์ (ในภายหลัง)

สามารถเพิ่มหัวกิลด์คนใหม่ได้โดยให้หัวกิลด์เดิมเขียน:
```ts
update(ref(db, `guild/leaders/${newUid}`), true)
```

หรือจะมีหน้า `Manage Leaders` ก็ได้ (อนาคต)

---

## 📌 คำแนะนำเพิ่มเติม

- ลบ key เก่า `leaderUid` ออกจาก `/guild`
- ใช้แต่ `leaders/[uid]` แทนทุกที่
- ให้ Cursor refactor ทุกจุดที่เคยใช้ leaderUid → ใช้ leaders/[uid]

---

## ✅ สรุป

| สิ่งที่เปลี่ยน | รายละเอียด |
|----------------|-------------|
| ✅ รองรับหลายหัวกิลด์ | ใช้ `leaders: { uid: true }` |
| ✅ แก้ Rules | ใช้เช็คว่า `guild/leaders/[auth.uid] == true` |
| ✅ ตั้ง Tester เป็นหัวกิลด์คนแรก | uid: 2GS9xCHpizYrEAiAEMJOc37zF1o2 |
| ✅ ปรับ logic การเช็คสิทธิ์ในทุกหน้าจอ | isLeader(uid) |
