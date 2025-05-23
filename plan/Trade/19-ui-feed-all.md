## 🧾 UI Feed รวม (Global Transaction Feed UI)

หน้านี้แสดงข้อความ log ธุรกรรมทั้งหมดของระบบ Trade ในเว็บ DNPartyList โดยเรียงตามเวลาใหม่สุดก่อน พร้อมฟังก์ชันแยกประเภทและแสดงผลข้อความแบบอ่านง่าย ใช้งานสะดวก

---

## ✅ ที่อยู่หน้าเว็บ

```
/trade/feed
```

---

## ✅ ข้อมูลที่ใช้

* Path: `/feed/all`
* รูปแบบข้อมูลแต่ละ entry:

```json
{
  "type": "gold" | "item" | "loan",
  "subType": "create" | "confirm" | "complete",
  "text": "@Yuki ซื้อ Gold 300G จาก @Ousuri ✅",
  "from": "discordId_1",
  "to": "discordId_2",
  "relatedId": "tradeId or loanId",
  "timestamp": 1683123123
}
```

---

## ✅ โครงสร้าง UI ที่ต้องมี

### 1. หัวหน้าเพจ

* ชื่อ: `📋 ประวัติธุรกรรมทั้งหมด`
* ปุ่ม Filter: `ทั้งหมด / ซื้อขาย / กู้ยืม`
* กล่องค้นหา: ค้นด้วยชื่อในข้อความ (optional)

### 2. รายการ Feed

* เรียงจากใหม่สุด → เก่าสุด
* แต่ละรายการแสดง:

  * 🕓 วันที่เวลา (เช่น `03 พ.ค. 2025, 14:22`)
  * 🧾 ข้อความหลัก (text)
  * 🔍 ลิงก์ดูรายละเอียด (หากมี relatedId)
  * 📩 ปุ่ม DM (เชื่อมกับ Discord ID ต้นทาง/ปลายทาง หากมี)

### 3. การแสดงผลข้อความ

* ใช้สีหรือไอคอนแตกต่างกันตาม `type`

  * 💰 gold
  * 🎁 item
  * 🧾 loan
* ใช้พื้นหลังสลับเทา-ขาว หรือใส่เส้นแบ่งรายการ

---

## 🔧 ฟังก์ชัน Cursor ที่เกี่ยวข้อง

* ดึงข้อมูลจาก `/feed/all` → ใช้ `orderByChild(timestamp)` → เรียงจากใหม่สุด
* รองรับ filter ประเภท เช่น:

```ts
feed.filter(entry => entry.type === 'gold')
```

* กำหนดรูปแบบวันที่ด้วย `Intl.DateTimeFormat()` หรือ dayjs
* ปรับ responsive สำหรับมือถือด้วย Tailwind

---

## 🧠 หมายเหตุ

* Feed นี้เป็น read-only (ไม่ต้องมีปุ่มแก้ไขหรือลบ)
* อนาคตสามารถใส่ Pagination หรือ Infinite Scroll ได้หากรายการยาวมาก
* Feed นี้ใช้ร่วมกันทั้งระบบ Trade เพื่อความโปร่งใส
