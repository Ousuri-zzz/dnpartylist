## 🪙 ระบบขาย Gold (Gold Trade System)

ระบบนี้ช่วยให้พ่อค้าสามารถโพสต์ขาย Gold ได้โดยกำหนดจำนวนรวม และให้ลูกค้ากดยืนยันการซื้อแต่ละส่วนแบบ Multi-confirm โดยมีระบบ Feed และการยืนยันของพ่อค้าเพื่อความโปร่งใส

---

## ✅ โฟลว์การทำงานของระบบขาย Gold

### 1. พ่อค้าสร้างรายการขาย

* เข้าหน้า `/trade/mystore`
* กรอก:

  * จำนวน Gold ทั้งหมด
  * ราคาต่อ 100G (หรือหน่วยที่ใช้)
  * ข้อความโฆษณา
* ระบบสร้างรายการที่ `/trade/[tradeId]`
* status: `open`
* แสดงใน Card พ่อค้า + ลิงก์ยืนยันสำหรับส่งใน Discord

### 2. ลูกค้ากดยืนยันการซื้อผ่านลิงก์

* เข้าหน้า `/trade/confirm/[tradeId]`
* กรอกจำนวน Gold ที่ต้องการซื้อ (ไม่เกินที่เหลืออยู่)
* ระบบสร้าง entry การ confirm:

  ```json
  /trade/[tradeId]/confirms/[uid] {
    buyer: "discordId",
    amount: 300,
    confirmedAt: timestamp,
    status: "waiting"
  }
  ```
* หักยอดจากรายการหลักชั่วคราว
* สร้างข้อความใน `/feed/all`

### 3. พ่อค้าตรวจสอบและยืนยันว่าเทรดเสร็จแล้ว

* เข้าหน้า `/trade/mystore`
* เห็นรายการที่ลูกค้ากดยืนยัน
* กด "ยืนยันว่าเทรดแล้ว" → status ของ confirm = `done`
* สร้างข้อความ Feed ว่าการซื้อขายเสร็จสมบูรณ์
* จำนวน Gold คงเหลือในรายการจะลดลงถาวร

### 4. ระบบ Multi-confirm

* ลูกค้าหลายคนสามารถซื้อจากรายการเดียวกันจนกว่าจะหมด
* ปิดอัตโนมัติเมื่อยอดขายถึง 0
* status รายการหลักเปลี่ยนเป็น `closed`

---

## 🧾 รูปแบบข้อมูล (Data Schema)

```json
/trade/[tradeId] {
  merchantId: "uid",
  merchantName: "Ousuri",
  amountTotal: 1000,
  amountLeft: 700,
  pricePer100: 50,
  status: "open",
  confirms: {
    buyerUid1: {
      amount: 300,
      status: "done",
      confirmedAt: timestamp
    },
    buyerUid2: {
      amount: 300,
      status: "waiting"
    }
  },
  createdAt: timestamp
}
```

---

## 📑 Feed และข้อความแจ้งเตือน

* ทุกการกดซื้อและยืนยัน จะขึ้นใน Feed:

  * `/feed/all`
  * `/feed/merchant/[uid]/trade`
* ตัวอย่างข้อความ:

  * `@Yuki กดยืนยันซื้อ 300G จากร้าน @Ousuri`
  * `@Ousuri ยืนยันว่าเทรด 300G กับ @Yuki สำเร็จแล้ว ✅`

---

## 💡 หมายเหตุการพัฒนา

* ยืนยันเฉพาะพ่อค้าเท่านั้นเพื่อความถูกต้อง
* รองรับ multi-confirm จนหมดยอด
* แสดงจำนวนที่เหลือแบบเรียลไทม์ใน Card พ่อค้า
* รองรับการ Copy ข้อความ + ลิงก์ยืนยันไปลง Discord
