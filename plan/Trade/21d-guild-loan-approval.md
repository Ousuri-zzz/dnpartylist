# 💰 plan/21d-guild-loan-approval.md

> เพิ่มระบบ "อนุมัติ / ยืนยันการกู้ยืมเงินจากกิลด์"  
> ทำงานภายในหน้า `/guild/settings` โดยหัวกิลด์เท่านั้น

---

## 🎯 เป้าหมาย

- แสดงรายการ loan ที่ขอกู้จากกิลด์ (`/guildLoans`)
- แยก loan ที่สถานะยังไม่อนุมัติ (pending)
- เพิ่มปุ่มสำหรับ:
  - ✅ อนุมัติการกู้
  - ❌ ปฏิเสธการกู้
  - 💸 ยืนยันว่าผู้กู้คืนเงินแล้ว

---

## 📁 โครงสร้างข้อมูล `/guildLoans/[loanId]`

```ts
/guildLoans/[loanId] = {
  id: "abc123",
  type: "guild", // หรือ merchant
  borrowerUid: "uid",
  amount: 5000,
  reason: "ขอใช้จ่ายตลาด",
  status: "pending" | "approved" | "rejected" | "repaid" | "confirmed",
  createdAt: "...",
  repaidAt: "...",
  confirmedBy: "หัวกิลด์ uid"
}
```

---

## 🧩 Step 1: แสดงรายการ loan ที่ type = "guild"

- ใช้ query:
```ts
query(ref(db, "guildLoans"), orderByChild("type"), equalTo("guild"))
```

- กรองสถานะให้แสดงรายการ `pending` เป็นหลัก

---

## ✅ Step 2: ปุ่ม "อนุมัติ" / "ปฏิเสธ"

| ผู้กู้ | เหตุผล | จำนวน | สถานะ | ปุ่ม |
|--------|--------|--------|--------|------|
| Tester | ขอใช้จ่าย | 5000G | pending | [อนุมัติ] [ปฏิเสธ] |

กดแล้ว:
```ts
update(ref(db, `guildLoans/${id}`), {
  status: "approved",
  approvedAt: new Date().toISOString()
})
```

---

## 💸 Step 3: ปุ่ม "ยืนยันว่าได้รับคืนแล้ว"

กรณี status = "repaid" (ลูกค้ากดคืนเงินแล้ว) → หัวกิลด์จะเห็นปุ่ม “ยืนยันแล้ว”

เมื่อกด:
```ts
update(ref(db, `guildLoans/${id}`), {
  status: "confirmed",
  confirmedBy: auth.currentUser.uid,
  confirmedAt: new Date().toISOString()
})
```

---

## 🔐 Step 4: เช็คสิทธิ์เฉพาะหัวกิลด์

ก่อนแสดงปุ่ม:
```ts
const isLeader = (await get(ref(db, `guild/leaders/${auth.uid}`))).exists()
```

---

## ✅ สรุป

| ปุ่ม | เงื่อนไขแสดง | ผลลัพธ์ |
|------|----------------|-----------|
| อนุมัติ | status = pending | เปลี่ยนเป็น approved |
| ปฏิเสธ | status = pending | เปลี่ยนเป็น rejected |
| ยืนยันแล้ว | status = repaid | เปลี่ยนเป็น confirmed |

---

## 🔰 พร้อมทำต่อ

- เพิ่ม toast แจ้งเตือนทุก action
- แสดง loan ประวัติใน `/mypage` ของแต่ละผู้ใช้
