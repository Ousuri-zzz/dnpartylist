# 🛒 plan/23-trade-merchant-registration.md

> ระบบลงทะเบียนพ่อค้า (ยืนยันตัวตน + Discord ID สำหรับ DM โดยตรง)  
> เฉพาะสมาชิกกิลด์ที่ยังไม่เคยสมัครเท่านั้น  
> หัวกิลด์จะอนุมัติผ่าน `/guild/settings`

---

## 🎯 เป้าหมาย

- ให้สมาชิกกิลด์ลงทะเบียนเป็นพ่อค้าได้
- กรอกเฉพาะข้อมูลที่จำเป็นเพื่อระบุตัวตนและใช้ติดต่อ
- ตรวจสอบสิทธิ์ว่าเป็นสมาชิกกิลด์และยังไม่เคยสมัครมาก่อน

---

## 📝 ฟอร์มลงทะเบียน

### ผู้ใช้ต้องกรอก:
- ✅ `bankAccountName` → ชื่อบัญชีธนาคาร
- ✅ `bankAccountNumber` → เลขบัญชีธนาคาร
- ✅ `bankName` → ชื่อธนาคาร (เช่น SCB, KBank)
- ✅ `discordId` → Discord ID (Developer Mode) เช่น `823456789012345678`

### ผู้ใช้ **ไม่ต้องกรอก**:
- `discord` → ดึงจาก `/users/[uid]/meta/discord`

---

## 📁 โครงสร้างข้อมูล `/tradeMerchants/[uid]`

```json
{
  bankAccountName: "นายเอ",
  bankAccountNumber: "1234567890",
  bankName: "SCB",
  discordId: "823456789012345678",
  discord: "Tester#1234",
  status: "pending",
  createdAt: "2025-05-04T12:34:00Z"
}
```

---

## 🔐 เงื่อนไขการลงทะเบียน

- ต้องเป็นสมาชิกใน `/guild/members/[uid]`
- ยังไม่มี `/tradeMerchants/[uid]`
- ตรวจสอบจาก Firebase Auth + Database ก่อน submit

---

## ✅ Logic เมื่อลงทะเบียน

```ts
set(ref(db, `tradeMerchants/${uid}`), {
  bankAccountName,
  bankAccountNumber,
  bankName,
  discordId,
  discord: userMeta.discord,
  status: "pending",
  createdAt: new Date().toISOString()
})
```

---

## 🛡️ Firebase Rules

```json
"tradeMerchants": {
  "$uid": {
    ".read": "auth != null",
    ".write": "auth.uid === $uid && !data.exists() && root.child('guild/members/' + auth.uid).exists()",
    "bankAccountName": { ".validate": "newData.isString()" },
    "bankAccountNumber": { ".validate": "newData.isString()" },
    "bankName": { ".validate": "newData.isString()" },
    "discordId": { ".validate": "newData.isString()" },
    "discord": { ".validate": "newData.isString()" },
    "status": { ".validate": "newData.val() === 'pending'" },
    "createdAt": { ".validate": "newData.isString()" }
  }
}
```

---

## 👑 เชื่อมกับหัวกิลด์

- หัวกิลด์เห็นร้านพ่อค้าที่ `status = pending`
- ปุ่ม [อนุมัติ] → เปลี่ยนเป็น `status: "active"`
- ปุ่ม [ระงับ] → เปลี่ยนเป็น `status: "suspended"`
- สามารถคลิกลิงก์ DM → `https://discord.com/users/{discordId}`

---

## ✅ สรุป

| ฟีเจอร์ | รายละเอียด |
|---------|-------------|
| ฟอร์มลงทะเบียน | มี 4 ฟิลด์ที่กรอกเอง |
| เช็คสิทธิ์ | ต้องอยู่ใน /guild/members และยังไม่เป็นพ่อค้า |
| เชื่อมระบบหัวกิลด์ | อนุมัติ/ระงับได้ผ่าน /guild/settings |
| ใช้ Discord ID | สำหรับลิงก์ DM โดยตรง |

