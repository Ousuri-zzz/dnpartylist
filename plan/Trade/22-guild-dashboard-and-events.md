# 📢 plan/22-guild-dashboard-and-events.md

> ต่อจากระบบกิลด์ที่มีหัวกิลด์ควบคุมสมาชิก  
> เป้าหมาย: เพิ่มความสามารถของกิลด์ให้ดูมีชีวิต เช่น การประกาศข่าว, กิจกรรม, และแดชบอร์ดรวม

---

## 🎯 เป้าหมาย

- เพิ่มระบบประกาศกิลด์ (Guild Announcements)
- เพิ่มระบบกิจกรรมกิลด์ (Guild Events)
- เพิ่มแดชบอร์ดรวมสถิติสมาชิกกิลด์ เช่น จำนวนตัวละคร, คะแนนเฉลี่ย
- ข้อมูลทั้งหมดเก็บที่ `/guild`

---

## 🧩 Step 1: ระบบประกาศข่าวกิลด์

เพิ่ม path:
```ts
/guild/announcements = [
  {
    id: "uuid",
    message: "อาทิตย์นี้มีลง SDN 20.00!",
    createdAt: "2025-05-04T10:00:00Z",
    createdBy: "ชื่อ Discord หรือ uid"
  },
  ...
]
```

UI:
- หัวกิลด์สามารถเพิ่ม/ลบประกาศได้
- สมาชิกทั่วไปมองเห็นอย่างเดียว

---

## 📆 Step 2: ระบบกิจกรรมภายในกิลด์

เพิ่ม path:
```ts
/guild/events = [
  {
    id: "uuid",
    title: "Mini Tournament",
    description: "PVP แข่งวันเสาร์ 20.00",
    time: "2025-05-11T20:00:00Z",
    createdBy: "uid",
    participants: [uid1, uid2, ...]
  }
]
```

- สมาชิกกด "เข้าร่วม"
- หัวกิลด์สามารถแก้ไข/ลบกิจกรรม

---

## 📊 Step 3: แดชบอร์ดรวมสถิติสมาชิก

ที่หน้า `/guild/dashboard` ให้แสดง:
- จำนวนสมาชิกทั้งหมด
- จำนวนตัวละครรวม
- ค่าเฉลี่ย ATK / HP / CRI / FD จาก `/users/[uid]/characters`
- Top 3 ตัวละครที่มี ATK สูงสุด

แสดงผลด้วย:
- ตาราง
- bar chart หรือ text summary

---

## 🔐 Step 4: ปรับ Firebase Rules เพิ่มเติม

ให้หัวกิลด์เท่านั้นที่สามารถเขียน:
```json
"guild": {
  "announcements": {
    ".write": "auth.uid === root.child('guild/leaderUid').val()"
  },
  "events": {
    ".write": "auth.uid === root.child('guild/leaderUid').val()"
  }
}
```

สมาชิกทั่วไป:
- `.read` ทั้งหมด
- `.write` เฉพาะ `participants`

---

## ✅ พร้อมพัฒนา

- เพิ่ม `/guild/dashboard`
- เพิ่ม Modal สำหรับประกาศ / กิจกรรม
- ปรับ Sidebar เพิ่มลิงก์ใหม่
