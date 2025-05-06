## 🎁 ระบบขายไอเทม (Item Trade System)

ระบบนี้ช่วยให้พ่อค้าสามารถลงรายการไอเทมเพื่อขายได้อย่างอิสระ โดยใส่ชื่อ รายละเอียด และราคาที่ต้องการ จากนั้นลูกค้าสามารถดูรายการและติดต่อขอซื้อผ่าน Discord ได้โดยตรง พร้อมบันทึก feed ทุกขั้นตอน

---

## ✅ โฟลว์การทำงานของระบบขายไอเทม

### 1. พ่อค้าเพิ่มรายการไอเทม

* เข้าหน้า `/trade/mystore`
* ใส่ข้อมูล:

  * ชื่อไอเทม (itemName)
  * คำอธิบายสั้น (description)
  * ราคาที่ต้องการขาย (price)
  * สถานะ: `available`, `sold`
* บันทึกลง `/tradeItems/[itemId]`
* สร้างข้อความใน `/feed/all` และ `/feed/merchant/[uid]/trade`

### 2. ลูกค้าเข้าดูรายการของพ่อค้า

* หน้า `/trade/[merchantId]` แสดงไอเทมทั้งหมดของร้าน
* ปุ่ม “ดูไอเทม” → เปิด modal หรือหน้าย่อยแสดงรายการแยก
* มีปุ่ม “ซื้อ” หรือ “DM” พร้อมปุ่ม Copy ข้อความอัตโนมัติ

### 3. ลูกค้าขอซื้อผ่าน Discord

* Copy ข้อความ เช่น:

```text
@Ousuri
ผมสนใจไอเทม: [Divine Scepter +20]
ราคา: 2000G
ยืนยันที่: https://dnpartylist.vercel.app/trade/item/abc123
```

* หรือใช้ปุ่ม DM Discord ได้โดยตรง

### 4. พ่อค้าอัปเดตสถานะเป็น sold

* เข้าหน้า `/trade/mystore`
* กดเปลี่ยนสถานะรายการไอเทมที่ขายแล้ว
* สร้างข้อความใน Feed ว่าไอเทมนี้ขายสำเร็จ

---

## 🧾 รูปแบบข้อมูล (Data Schema)

```json
/tradeItems/[itemId] {
  merchantId: "uid",
  itemName: "Divine Scepter +20",
  description: "ของดีจากเนสต์",
  price: 2000,
  status: "available", // or "sold"
  createdAt: timestamp
}
```

---

## 📑 Feed และข้อความแจ้งเตือน

* สร้างข้อความ Feed ใน:

  * `/feed/all`
  * `/feed/merchant/[uid]/trade`
* ตัวอย่างข้อความ:

  * `@Ousuri ลงขายไอเทม: [Divine Scepter +20] 2000G`
  * `@Yuki ขอซื้อ Divine Scepter +20 จาก @Ousuri`
  * `@Ousuri ยืนยันว่า Divine Scepter +20 ถูกขายเรียบร้อย ✅`

---

## 💡 หมายเหตุการพัฒนา

* ปุ่ม DM และ Copy ข้อความในแต่ละไอเทมควรใช้งานง่าย
* ไอเทมควรแสดงใน Card ร้านค้า พร้อมป้าย sold ถ้าขายแล้ว
* รองรับการเชื่อมกับระบบ Feed / Discord เพื่อแจ้งสถานะ
* สามารถใช้ itemListMaster เป็นฐานข้อมูลอ้างอิงชื่อ/ไอคอนไอเทม
