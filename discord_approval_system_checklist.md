# Discord Approval System Checklist

## 1. Flow การใช้งาน
- [ ] ผู้ใช้ต้อง Login ด้วย Google ก่อนเข้าระบบ
- [ ] ถ้า Login แล้ว ยังไม่มีชื่อ Discord:
    - [ ] แสดงหน้าให้กรอกชื่อ Discord (First-time Discord Name Entry)
    - [ ] เมื่อกรอกแล้ว สถานะ approved: false
    - [ ] แสดงหน้ารอหัวกิลด์อนุมัติ (Waiting for Guild Leader Approval)
    - [ ] ไม่สามารถไปหน้าอื่นได้จนกว่าจะได้รับอนุมัติ
- [ ] ถ้า Login แล้ว มีชื่อ Discord และ approved: true:
    - [ ] ใช้งานระบบได้ปกติ
    - [ ] สามารถเปลี่ยนชื่อ Discord ได้ตลอดเวลา (ไม่ต้องขออนุมัติใหม่)
- [ ] ถ้า Login แล้ว มีชื่อ Discord แต่ approved: false:
    - [ ] แสดงหน้ารออนุมัติ
    - [ ] ไม่สามารถไปหน้าอื่นได้

## 2. Guild Leader Approval
- [ ] หน้า guild/settings สำหรับหัวกิลด์ (guild/leaders/{uid}: true)
    - [ ] แสดงรายชื่อสมาชิกใหม่ที่รออนุมัติ (approved: false)
    - [ ] มีปุ่ม "อนุมัติ" (set approved: true)
    - [ ] มีปุ่ม "ยกเลิก" (ลบข้อมูล user และ clean up ข้อมูลที่เกี่ยวข้อง)
    - [ ] ส่วนนี้อยู่ก่อนร้านค้าที่รออนุมัติ

## 3. การลบข้อมูลเมื่อถูกปฏิเสธ
- [ ] ลบ users/{uid} (meta, characters)
- [ ] ลบ guild/members/{uid}
- [ ] ลบ guild/leaders/{uid} (ถ้าเป็นหัวกิลด์)
- [ ] ลบ tradeMerchants/{uid} (ถ้ามี)
- [ ] ตรวจสอบ/ลบข้อมูลใน parties, trade, tradeItems, guildLoans, feed ที่อ้างอิง uid นี้ (ถ้ามี)

## 4. จุดตรวจสอบ/Redirect
- [ ] ใช้ middleware หรือ root layout ตรวจสอบ login, discord, approved
- [ ] ถ้าไม่ login → redirect ไปหน้า Login
- [ ] ถ้า login แล้วไม่มีชื่อ Discord → redirect ไปหน้ากรอกชื่อ
- [ ] ถ้า login แล้ว approved: false → redirect ไปหน้ารออนุมัติ

## 5. โครงสร้างข้อมูล
- [ ] users/{uid}/meta/discord (string)
- [ ] users/{uid}/meta/approved (boolean, optional)
- [ ] guild/leaders/{uid}: true (หัวกิลด์)
- [ ] guild/members/{uid} (สมาชิกกิลด์)
- [ ] tradeMerchants/{uid} (merchant)
- [ ] อื่น ๆ ที่อ้างอิง uid

## 6. ข้อควรระวัง
- [ ] สมาชิกเก่าที่ยังไม่มี approved → ถือว่าอนุมัติแล้ว (approved: undefined หรือ true)
- [ ] ไม่เปลี่ยนแปลงโครงสร้างข้อมูลเดิม
- [ ] ไม่กระทบระบบอื่น ๆ
- [ ] ทดสอบกับ user เก่าและ user ใหม่

## 7. UI/UX
- [ ] หน้าเฉพาะสำหรับกรอกชื่อ Discord ครั้งแรก
- [ ] หน้ารออนุมัติ (Waiting for Approval)
- [ ] หน้า guild/settings สำหรับหัวกิลด์ (อนุมัติ/ยกเลิกสมาชิกใหม่)

---

> ใช้ไฟล์นี้เป็นเช็คลิสต์ตรวจสอบความครบถ้วนของฟีเจอร์และความปลอดภัยก่อน deploy ระบบจริง 