## 📢 ระบบข้อความ Feed (Transaction Feed System)

ระบบ Feed ทำหน้าที่เสมือน Log ธุรกรรมแบบ real-time ที่แสดงข้อความสรุปทุกกิจกรรมที่เกิดขึ้นในระบบ Trade ทั้งหมด พร้อม timestamp เพื่อให้ตรวจสอบย้อนหลังได้ และสร้างความโปร่งใสในการซื้อขายและกู้ยืม

---

## ✅ ประเภทของ Feed

### 1. **Feed รวม (`/feed/all`)**

* รวมทุกข้อความธุรกรรมจากทุกระบบ (ขาย Gold, ขายไอเทม, กู้ยืม)
* เรียงตาม timestamp ใหม่ล่าสุดขึ้นก่อน
* แสดงในหน้า `/trade/feed`

### 2. **Feed รายพ่อค้า**

* `/feed/merchant/[uid]/trade` → เฉพาะรายการขาย (Gold + ไอเทม)
* `/feed/merchant/[uid]/loan` → เฉพาะรายการปล่อยกู้จากพ่อค้า

### 3. **Feed รายกิลด์**

* `/feed/loan/[guildName]` → เฉพาะรายการกู้ยืมที่มาจากระบบกิลด์

---

## 📌 โครงสร้างข้อความ Feed (ตัวอย่าง)

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

---

## 📝 ตัวอย่างข้อความที่สร้างได้จากทุกระบบ

### ขาย Gold:

* `@Ousuri ลงประกาศขาย Gold 1000G`
* `@Yuki กดยืนยันซื้อ 300G จาก @Ousuri`
* `@Ousuri ยืนยันว่าเทรด 300G สำเร็จ ✅`

### ขายไอเทม:

* `@Ousuri ลงขายไอเทม: Divine Scepter +20`
* `@Yuki ขอซื้อ Divine Scepter +20 จาก @Ousuri`
* `@Ousuri ยืนยันว่า Divine Scepter +20 ถูกขายแล้ว ✅`

### กู้ยืมจากกิลด์:

* `@Yuki ขอยืม 500G จากกิลด์ GalaxyCat`
* `@Sakura (หัวกิลด์) อนุมัติคำขอ @Yuki ✅`
* `@Yuki แจ้งคืนเงิน 500G แล้ว`
* `@Sakura ยืนยันว่าได้รับคืนจาก @Yuki ✅`

### กู้ยืมจากพ่อค้า:

* `@Yuki ขอเงินกู้ 300G จากร้าน @Ousuri`
* `@Ousuri อนุมัติเงินกู้ให้ @Yuki ✅`
* `@Yuki คืนเงินเรียบร้อย`
* `@Ousuri ยืนยันว่าได้รับคืนจาก @Yuki ✅`

---

## 🧠 หมายเหตุการพัฒนา

* ข้อความทุกระบบต้องลงใน `/feed/all` พร้อม timestamp
* ใช้สำหรับหน้ารวม, ประวัติย้อนหลัง และระบบแจ้งเตือน
* อย่าลบข้อความ feed ใด ๆ → ทุกอย่างคือประวัติถาวร
* อนาคตสามารถเพิ่ม filter ตาม type / guild / merchant ได้
