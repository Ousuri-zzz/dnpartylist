## 💼 ระบบกู้ยืมจากพ่อค้า (Merchant Loan System)

ระบบนี้ช่วยให้ผู้เล่นสามารถขอยืมเงินจากพ่อค้าแต่ละร้านได้ โดยมีระบบยืนยัน 2 ชั้น (จากผู้ยืมและผู้ให้ยืม) เพื่อความปลอดภัยและการเก็บบันทึกธุรกรรมอย่างครบถ้วน

---

## ✅ โฟลว์การทำงานของระบบกู้ยืมจากพ่อค้า

### 1. ลูกค้าเลือกพ่อค้าแล้วขอยืมเงิน

* เข้าหน้า `/trade/[merchantId]`
* กดปุ่ม "ขอยืมเงิน"
* กรอกจำนวน + กำหนดวันคืน (optional)
* ระบบสร้าง entry ใหม่ใน `/guildLoans/[loanId]` โดยระบุ `source.type = merchant`
* status: `waitingApproval`
* สร้างข้อความใน `/feed/merchant/[merchantId]/loan` และ `/feed/all`

### 2. พ่อค้าอนุมัติคำขอ

* หน้าร้านแสดงรายการที่รออนุมัติจากลูกค้า
* เมื่อพ่อค้ากดยืนยัน → status = `active`
* แสดงข้อความว่าอนุมัติแล้วใน feed
* หากปฏิเสธ → ลบหรือ mark `status = rejected`

### 3. ลูกค้ากดแจ้งคืนเงิน

* เข้าหน้า `/loan/me`
* กด "แจ้งคืนเงินแล้ว"
* status = `returned`
* ขึ้นข้อความใน feed รวมและ feed พ่อค้า

### 4. พ่อค้ายืนยันการคืน

* พ่อค้าเข้าหน้า `/trade/confirm/loan`
* เห็นรายชื่อคนที่แจ้งคืน
* เมื่อกดยืนยันว่าได้รับแล้ว → status = `completed`
* Feed แสดงว่าเสร็จสมบูรณ์ พร้อม timestamp
* ข้อมูล **ไม่ลบออก** เพื่อคงไว้เป็นประวัติ

---

## 🧾 รูปแบบข้อมูล (Data Schema)

```json
/guildLoans/[loanId] {
  source: {
    type: "merchant",
    merchantId: "uid"
  },
  borrowerId: "discord_uid",
  borrowerName: "Yuki",
  amount: 300,
  dueDate: "2025-05-20",
  status: "waitingApproval", // active, returned, completed
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 📑 Feed และข้อความแจ้งเตือน

* ทุกธุรกรรมจะเขียนลง Feed:

  * `/feed/merchant/[merchantId]/loan`
  * `/feed/all`
* ตัวอย่างข้อความ:

  * `@Yuki ขอยืม 300G จากร้าน @Ousuri`
  * `@Ousuri ยืนยันว่าอนุมัติเงินกู้ให้ @Yuki`
  * `@Yuki คืนเงินแล้ว`
  * `@Ousuri ยืนยันว่าได้รับคืนครบแล้ว ✅`

---

## 💡 หมายเหตุการพัฒนา

* โครงสร้างเหมือนระบบกู้ยืมจากกิลด์แต่ใช้ merchant เป็นผู้อนุมัติ
* ใช้หน้า `/trade/[merchantId]` และ `/trade/confirm/loan` สำหรับจัดการ
* Feed และประวัติสามารถเชื่อมต่อกับระบบส่วนกลางได้ทันที
