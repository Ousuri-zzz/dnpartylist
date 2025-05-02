## 📌 จุดประสงค์ของระบบ Event

สร้างระบบจัดกิจกรรมสำหรับกิลด์ Dragon Nest ที่สมาชิกสามารถ:
- สร้างกิจกรรมเองได้
- เช็คชื่อเข้าร่วม
- อัปโหลดลิงก์รูปกิจกรรม (จาก Discord)
- มอบรางวัลให้ผู้เข้าร่วม
- ดูประวัติกิจกรรมย้อนหลังได้

ระบบนี้ใช้ **Firebase Auth + Firestore เท่านั้น** (ไม่มี Firebase Storage)

---

## 🗂 โครงสร้างข้อมูลใน Firestore

- `/events/{eventId}`
  - name: string
  - description: string
  - startAt: timestamp
  - createdBy: string (uid)
  - rewardInfo: string (optional)
  - notifyMessage: string (ข้อความประกาศ, optional)
  - isEnded: boolean

- `/events/{eventId}/participants/{uid}`
  - characterId: string
  - discordName: string
  - rewardGiven: boolean
  - rewardNote: string (optional)

- `/events/{eventId}/gallery/{imageId}`
  - imageUrl: string
  - caption: string
  - uploadedBy: string (uid)
  - createdAt: timestamp

---

## 📌 ขั้นตอนการพัฒนา (ให้ Cursor ทำตามลำดับ)

### ✅ Step 1: `/events` – หน้าแสดงกิจกรรมทั้งหมด
- ปฏิทินกิจกรรมรายเดือน (ใช้ react-calendar)
- รายการกิจกรรมที่ยังไม่จบ (`isEnded == false`) ของเดือนที่เลือก
- ปุ่ม `+ สร้างกิจกรรม` (ให้ทุกคนกดได้)

### ✅ Step 2: สร้างกิจกรรมใหม่
- Modal กรอก: ชื่อกิจกรรม, รายละเอียด, วันเวลาเริ่ม, ของรางวัล
- [✓] Checkbox: "สร้างข้อความประกาศใน Discord"
- เมื่อ submit → สร้าง document ใหม่ใน `/events`
- ถ้าเลือกสร้างข้อความ → แสดงกล่องให้คัดลอกข้อความประกาศไปวางใน Discord

### ✅ Step 3: `/events/[id]` – หน้ารายละเอียดกิจกรรม
- แสดงรายละเอียดทั้งหมด + Countdown timer
- ปุ่ม “เข้าร่วมกิจกรรม” → เลือกตัวละคร (จากระบบ character เดิม)
- ปุ่ม “ออกจากกิจกรรม” (ถ้า `rewardGiven == false` และ `isEnded == false`)

### ✅ Step 4: ระบบอัปโหลดภาพกิจกรรม (เฉพาะผู้จัด)
- ป้อนลิงก์ภาพจาก Discord CDN (`cdn.discordapp.com/...`)
- ใส่คำอธิบาย (caption)
- แสดงภาพทั้งหมดที่ถูกอัปโหลด

### ✅ Step 5: ระบบมอบรางวัล (เฉพาะผู้จัดกิจกรรม)
- ผู้จัดสามารถเลือกผู้ได้รับรางวัล (หลายคน)
- กรอกชื่อรางวัล เช่น “Top DPS”
- ระบบจะบันทึก `rewardGiven: true`, `rewardNote: string` ใน `participants/{uid}`

### ✅ Step 6: ปุ่ม “จบกิจกรรม”
- ผู้จัดสามารถกด “จบกิจกรรม”
- อัปเดต `isEnded: true`
- ปิดการเข้าร่วม/ออกกิจกรรม

### ✅ Step 7: `/events/history` – หน้าแสดงกิจกรรมที่ผ่านมา
- แสดงเฉพาะกิจกรรมที่ `isEnded == true`
- รายการกิจกรรมย้อนหลัง: วันที่จัด, สมาชิกที่เข้าร่วม, สมาชิกที่ได้รางวัล
- ปุ่มดูรายละเอียด → ลิงก์ไปยัง `/events/[id]`

---

## 🔒 สิทธิ์ตาม Firebase Rules (Cursor ไม่ต้องเขียน rules แค่ยึดตามนี้)
- ทุกคน: อ่านทุกกิจกรรม
- ผู้ล็อกอิน: เข้าร่วม/ออกกิจกรรมของตัวเอง
- ผู้จัดกิจกรรม:
  - แก้ไขกิจกรรมตัวเอง
  - เพิ่มภาพ/ลบภาพตัวเอง
  - มอบรางวัล
  - กดจบกิจกรรม

---

## 🧩 เทคโนโลยีที่ใช้
- Next.js + TypeScript
- Firebase Auth (Google Login)
- Firebase Firestore
- Tailwind CSS
- react-calendar (หรือเทียบเท่า)
- ไม่มี Firebase Storage (ใช้แค่ image URL)
