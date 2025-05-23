## 🧭 UI หน้าหลักระบบ Trade (Trade Dashboard UI)

หน้ารวมศูนย์สำหรับเข้าสู่ระบบการซื้อขาย กู้ยืม ดูร้านค้าพ่อค้า และประวัติธุรกรรมทั้งหมด โดยจัดกลุ่ม UI ให้ง่ายต่อการเข้าถึงทุกระบบย่อยในระบบ Trade

---

## ✅ ที่อยู่หน้าเว็บ

```
/trade
```

---

## ✅ โครงสร้าง UI

### 1. หัวหน้าเพจ

* ชื่อหน้า: `💼 ตลาดซื้อขายและกู้ยืม`
* คำอธิบายสั้น: "ระบบกลางสำหรับซื้อขาย Gold, ไอเทม และกู้ยืมเงินจากพ่อค้าหรือกิลด์"

### 2. ปุ่มเข้าระบบต่าง ๆ

* ✅ `📋 ประวัติทั้งหมด` → ลิงก์ไป `/trade/feed`
* ✅ `🏪 ร้านค้าพ่อค้า` → แสดงการ์ดพ่อค้าทั้งหมด (fetch จาก `/tradeMerchants`)
* ✅ `🤝 กู้ยืมจากกิลด์` → `/guildloan`
* ✅ `👤 ธุรกรรมของฉัน` → `/mypage/transaction`

### 3. การ์ดพ่อค้าทั้งหมด

* ดึงจาก `/tradeMerchants`
* แต่ละการ์ดแสดง:

  * Discord Name
  * จำนวน Gold ที่เหลือ
  * ข้อความโฆษณา
  * ปุ่ม `ดูร้าน` → `/trade/[merchantId]`
  * ปุ่ม `DM` และ `Copy ข้อความ`

### 4. Feed ด่วน (Quick Log)

* ดึงรายการล่าสุด 5 รายการจาก `/feed/all`
* แสดงข้อความพร้อมเวลา
* ปุ่มดูเพิ่มเติม → `/trade/feed`

---

## 🧠 หมายเหตุ

* หน้า Dashboard นี้ใช้เป็นจุดศูนย์กลางของระบบทั้งหมด
* ให้แสดงพ่อค้าทั้งหมดแม้ไม่มีของขาย เพื่อให้ DM ได้
* หากยังไม่มีพ่อค้าเลย ให้แสดงข้อความ "ยังไม่มีร้านเปิดให้บริการในขณะนี้"
* UI ปรับให้เหมาะทั้ง desktop และ mobile
