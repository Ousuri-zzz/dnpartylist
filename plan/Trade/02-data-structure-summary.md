## 🗂️ สรุปโครงสร้างข้อมูลทั้งหมดในระบบ Trade (Data Structure Summary)

ไฟล์นี้ใช้เพื่ออ้างอิง path และ schema ของทุกส่วนในระบบ Trade ทั้งหมด ทั้งใน Realtime Database และ Firebase Auth เพื่อให้ใช้เป็นฐานกลางสำหรับ Cursor ในการเขียนโค้ด

---

## 🔑 Authentication (Firebase Auth)

```json
User {
  uid: "firebaseUid",
  displayName: "Yuki",
  email: "...",
  discordId: "123456789012345678" // ต้องกรอกครั้งแรกหลัง login
}
```

---

## 🏪 ร้านค้าพ่อค้า (Merchant)

```json
/tradeMerchants/[uid] {
  discordId: "123456789012345678",
  displayName: "Ousuri",
  goldAvailable: 1000,
  advertiseText: "Gold พร้อมขาย!",
  createdAt: timestamp
}
```

---

## 🪙 รายการขาย Gold

```json
/trade/[tradeId] {
  merchantId: "uid",
  merchantName: "Ousuri",
  amountTotal: 1000,
  amountLeft: 700,
  pricePer100: 50,
  status: "open" | "closed",
  confirms: {
    buyerUid1: {
      amount: 300,
      status: "waiting" | "done",
      confirmedAt: timestamp
    }
  },
  createdAt: timestamp
}
```

---

## 🎁 รายการขายไอเทม

```json
/tradeItems/[itemId] {
  merchantId: "uid",
  itemName: "Divine Scepter +20",
  description: "ของดีจากเนสต์",
  price: 2000,
  status: "available" | "sold",
  createdAt: timestamp
}
```

---

## 💰 ระบบกู้ยืม (จากกิลด์ / พ่อค้า)

```json
/guildLoans/[loanId] {
  source: {
    type: "guild" | "merchant",
    merchantId?: "uid",
    guild?: "GalaxyCat"
  },
  borrowerId: "discord_uid",
  borrowerName: "Yuki",
  amount: 500,
  dueDate: "2025-05-20",
  status: "waitingApproval" | "active" | "returned" | "completed",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 📋 ระบบข้อความ Feed

```json
/feed/all/[timestamp] {
  type: "gold" | "item" | "loan",
  subType: "create" | "confirm" | "complete",
  text: "@Yuki ซื้อ Gold 300G จาก @Ousuri ✅",
  from: "discordId_1",
  to: "discordId_2",
  relatedId: "tradeId or loanId",
  timestamp: 1683123123
}
```

```json
/feed/merchant/[uid]/trade { ... }
/feed/merchant/[uid]/loan { ... }
/feed/loan/[guildName] { ... }
```

---

## 👑 สิทธิ์หัวกิลด์

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

* ทุก path ตั้งให้แยกหมวดชัดเจน เพื่อให้ Cursor เขียนระบบได้เป็นอิสระ
* ทุก timestamp แนะนำให้ใช้แบบ `Date.now()` (epoch ms)
* ห้ามลบข้อมูลใน Feed หรือ Loans ที่จบแล้ว เพื่อใช้เป็นประวัติย้อนหลัง
