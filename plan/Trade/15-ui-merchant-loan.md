## 💼 UI ระบบปล่อยกู้โดยพ่อค้า (Merchant Loan UI)

ระบบนี้ช่วยให้พ่อค้าสามารถปล่อยเงินกู้ให้ลูกค้าแต่ละรายได้ โดยมีหน้าแสดงคำขอ รายการรอคืน และประวัติกู้ยืมทั้งหมด

---

## ✅ ที่อยู่หน้าเว็บ

```
/trade/mystore/loan
```

---

## ✅ โครงสร้าง UI

### 1. หัวข้อ

* ชื่อ: `💼 ปล่อยกู้โดยพ่อค้า`
* ข้อมูลร้านของตนเอง (ชื่อ Discord, Gold คงเหลือ)

### 2. รายการขอเงินกู้ (รออนุมัติ)

* ดึงจาก `/guildLoans` ที่ `source.type === 'merchant'` และ `merchantId === currentUser.uid` และ `status = waitingApproval`
* แสดง:

  * ชื่อลูกค้า, จำนวน, วันที่ขอ
  * ปุ่ม `อนุมัติ` / `ปฏิเสธ`
  * เมื่ออนุมัติ: status → `active`, feed → created

### 3. รายการรอคืนเงิน

* `status = returned`
* ปุ่ม `ยืนยันว่าได้รับเงินคืนแล้ว`
* เมื่อยืนยัน → status = `completed`, feed → created

### 4. ประวัติปล่อยกู้ทั้งหมด

* status: `active`, `completed`
* แสดงตลอดไม่ลบออก เพื่อคงประวัติย้อนหลัง
* ใช้ป้ายสีแสดงสถานะ (สีเขียว, น้ำเงิน, เหลือง)

---

## 🔧 ข้อมูลที่ใช้

```json
/guildLoans/[loanId] {
  source.type: "merchant",
  merchantId: "uid",
  borrowerId: "discordId",
  amount: 500,
  status: "waitingApproval" | "active" | "returned" | "completed"
}
```

---

## 🧠 หมายเหตุ

* ใช้ร่วมกับระบบ Feed ทุกครั้งที่มีการเปลี่ยนสถานะ
* หากไม่มีคำขอ ให้แสดงข้อความ "ยังไม่มีคำขอใหม่"
* ไม่ต้องมีฟังก์ชันสร้างคำขอจากฝั่งพ่อค้า (ลูกค้าต้องเป็นคนขอผ่านร้าน)
