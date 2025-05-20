
# 📦 ระบบหารแบ่งไอเทม (Split Bill System)

สร้างระบบใหม่ในเว็บ DNPartyList สำหรับ “การหารทองจากของดรอปในเกม” โดยใช้ Firebase Realtime Database + Next.js + Tailwind CSS

---

## ✅ จุดประสงค์

- ให้ผู้เล่นสามารถแบ่งทองจากการขายไอเทมอย่างยุติธรรม
- จำกัดการเข้าถึงเฉพาะคนที่เกี่ยวข้องในบิล
- รองรับหลายบิลพร้อมกัน
- ใช้งานง่ายและเหมาะกับมือถือ
- ✅ แต่ละบิลสามารถตั้งชื่อ (`title`) ได้

---

## 📁 โฟลเดอร์ที่ใช้

```
/src/app/split
  - page.tsx            ← หน้าแสดงรายการบิลของฉัน
  - CreateBillModal.tsx ← ปุ่ม + popup สำหรับสร้างบิลใหม่
  - BillCard.tsx        ← ใช้แสดงข้อมูลแต่ละบิล
  - useSplitBills.ts    ← Hook สำหรับโหลด + คำนวณการหาร
  - splitUtils.ts       ← ฟังก์ชันการคำนวณ
```

---

## 🔧 โครงสร้างข้อมูลใน Firebase Realtime Database

เส้นทาง: `/splitBills/{billId}`

```json
{
  "title": "ของดรอปรอบกลางคืน",
  "serviceFee": 5000,
  "ownerUid": "abc123",
  "createdAt": 1716200000000,
  "expiresAt": 1716800000000,
  "participants": {
    "abc123": { "name": "Ousuri", "characterId": "char1" },
    "def456": { "name": "Puri", "characterId": "char2" }
  },
  "items": {
    "item1": { "name": "Flame Ring", "price": 120000 },
    "item2": { "name": "Ancient Totem", "price": 50000 }
  }
}
```

---

## 🔒 Firebase Rules

```json
"splitBills": {
  "$billId": {
    ".read": "auth != null && data.child('participants').child(auth.uid).exists()",
    ".write": "auth != null && (!data.exists() || data.child('ownerUid').val() === auth.uid)"
  }
}
```

---

## 🎨 UI ที่ต้องแสดง

- ปุ่ม ➕ สร้างบิลใหม่ (Modal)
  - ช่องกรอกชื่อบิล (จำเป็น)
  - ช่องกรอกชื่อไอเทม, ราคาขาย (Gold), เพิ่มหลายรายการได้
  - ใส่ค่าบริการ (Gold)
  - เลือกผู้ร่วมบิลจากตัวละครของผู้ใช้ (search จาก `/users/{uid}/characters`)
  - เพิ่มตัวเองเข้า `participants` อัตโนมัติ
- Card สำหรับแสดงแต่ละบิล:
  - แสดง `title`, ราคาขายรวม, ค่าบริการ
  - รายชื่อผู้ร่วมรายการ
  - เงินต่อคน (คำนวณแบบ real-time)
  - ⏳ แสดงเวลาที่เหลือก่อนบิลหมดอายุ (7 วัน)
  - ปุ่ม ✏️ แก้ไข / 🗑 ลบ (ถ้าเป็นเจ้าของ)

---

## 📐 ฟังก์ชันการคำนวณ (ในไฟล์ `splitUtils.ts`)

```ts
export function calculateSplit(items: Item[], fee: number, count: number): number {
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const net = Math.max(total - fee, 0);
  return count > 0 ? Math.floor(net / count) : 0;
}
```

---

## 📱 Responsive

- Tailwind UI ต้องใช้ `grid`, `flex`, `overflow-x-auto` เพื่อรองรับมือถือ
- ใช้ปุ่มขนาดใหญ่, ฟอนต์อ่านง่าย, กล่องมีเงาและโค้งแบบ pastel

---

## ✅ กำหนดเพิ่มเติม

- บิลจะถูกลบอัตโนมัติเมื่อผ่านไป 7 วัน (ใช้ `expiresAt` และฟิลเตอร์ใน Client)
- ถ้าเวลาน้อยกว่า 24 ชม. ให้เปลี่ยนสีพื้นหลัง Card เป็นแดงจาง (เพื่อเตือน)
- ใช้ Toast แจ้งเตือนเมื่อลบ / แก้ไขบิลสำเร็จ

---

## 📌 หมายเหตุสำคัญ

- ข้อมูลทุกอย่างถูกเก็บใน Realtime Database
- ผู้ใช้สามารถเห็นเฉพาะบิลที่มี UID ตนเองอยู่ใน `participants`
- ไม่ต้องใช้ Firebase Admin SDK
- ต้องใช้ Client SDK ของ Firebase เท่านั้น (import จาก `firebase/database`)
