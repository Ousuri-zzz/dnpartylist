## 🤝 UI ขอเงินกู้จากร้านพ่อค้า (Request Merchant Loan UI)

หน้านี้ให้ลูกค้าสามารถกรอกแบบฟอร์มเพื่อขอยืมเงินจากร้านค้าพ่อค้า พร้อมแสดงสถานะและประวัติการกู้ยืมจากร้านค้าแต่ละแห่ง

---

## ✅ ที่อยู่หน้าเว็บ

```
/trade/request/[merchantId]
```

---

## ✅ โครงสร้าง UI

### 1. ข้อมูลร้านพ่อค้า

* ชื่อร้าน, Discord ID
* ข้อความโฆษณา
* Gold คงเหลือ (ถ้ามี)
* ปุ่ม DM Discord

### 2. แบบฟอร์มขอยืมเงิน

* กรอกจำนวนเงินที่ต้องการยืม
* วันที่ครบกำหนดคืน (optional)
* ปุ่ม `ส่งคำขอกู้ยืม`
* เมื่อส่งสำเร็จ:

  * บันทึกข้อมูลใน `/guildLoans`
  * status: `waitingApproval`
  * สร้างข้อความใน `/feed/all` และ `/feed/merchant/[merchantId]/loan`

### 3. ประวัติการกู้ยืมกับร้านนี้ (เฉพาะผู้ใช้ปัจจุบัน)

* แสดงคำขอทั้งหมดที่ `merchantId === thisMerchant` และ `borrowerId === currentUser.uid`
* แสดง:

  * จำนวน, วันที่ขอ, วันที่ครบกำหนด, สถานะ
  * ถ้า status = active → ปุ่ม `แจ้งคืนเงิน`

---

## 🔧 ข้อมูลที่ใช้

```json
/guildLoans/[loanId] {
  source.type: "merchant",
  source.merchantId: "uid",
  borrowerId: "discord_uid",
  amount: 300,
  dueDate: "2025-06-01",
  status: "waitingApproval" | "active" | "returned" | "completed",
  createdAt: timestamp
}
```

---

## 🧠 หมายเหตุ

* หากพ่อค้ายังไม่มีระบบร้านค้า (ไม่มี `/tradeMerchants/[uid]`) ให้ redirect กลับ
* ปุ่มส่งคำขอสามารถ copy ข้อความไป DM พ่อค้าได้เช่นกัน เช่น:

```text
@Ousuri
ผมขอยืม 300G
ยืนยันที่: https://dnpartylist.vercel.app/trade/request/abc123
```

* ทุกคำขอจะเข้าสู่ระบบรออนุมัติที่หน้า `/trade/mystore/loan`
