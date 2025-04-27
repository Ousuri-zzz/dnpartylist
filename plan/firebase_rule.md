# 🔐 DNPartyList – Firebase Realtime Database Rules (ปลอดภัย + รองรับทุกระบบ)

กฎความปลอดภัยสำหรับ Firebase Realtime Database ที่ออกแบบมาเฉพาะสำหรับโปรเจกต์ DNPartyList  
รองรับทุกระบบที่ใช้งานในเว็บ: ตัวละคร, checklist, ปาร์ตี้, การเชิญ, เป้าหมาย stat ฯลฯ

---

## ✅ กฎหลักที่ใช้

```json
{
  "rules": {
    "users": {
      ".read": "auth != null",
      "$uid": {
        ".write": "auth != null && auth.uid === $uid",
        "characters": {
          ".read": "auth != null",
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    },
    "parties": {
      ".read": "auth != null",
      "$partyId": {
        ".write": "auth != null",
        
        "members": {
          "$charId": {
            ".write": "root.child('users').child(auth.uid).child('characters').child($charId).exists()"
          }
        },

        "goals": {
          ".write": "auth != null && root.child('parties').child($partyId).child('leader').val() === auth.uid"
        },

        "nest": {
          ".write": "auth != null && root.child('parties').child($partyId).child('leader').val() === auth.uid"
        },

        ".validate": "newData.exists() || root.child('parties').child($partyId).child('leader').val() === auth.uid"
      }
    }
  }
}
```

---

## 📌 ข้อมูลที่ได้รับการป้องกัน

| หมวด | สิ่งที่ป้องกัน |
|------|----------------|
| users | อ่านได้ทุก user เขียนได้เฉพาะตัวเอง |
| characters | อ่านได้ทุกตัวละคร เขียนได้เฉพาะตัวละครของตัวเอง |
| checklist | ติ๊กได้เฉพาะตัวละครของตัวเอง |
| members | ตัวละครของใครเข้าปาร์ตี้ได้เฉพาะ user นั้น |
| goals | หัวปาร์ตี้เท่านั้นที่ตั้ง stat เป้าหมายได้ |
| nest | จำกัดสิทธิการแก้ไขเนสต์ (optional) |
| ลบปาร์ตี้ | ลบได้เฉพาะหัวตี้เท่านั้น |

---

## ⚠️ หมายเหตุ

- ต้องเปิดการยืนยันตัวตนด้วย Google Login (`auth != null`)
- ใช้ร่วมกับ Firebase Client SDK เท่านั้น
- ไม่รองรับการใช้งานร่วมกับ Admin SDK หรือ Secret ฝั่ง Server

---

## 🧠 ใช้กับ Cursor อย่างไร?

- เปิด Cursor → เปิดโฟลเดอร์ Firebase → เพิ่มไฟล์ `database.rules.json`
- วางกฎทั้งหมดนี้ในไฟล์ หรือใช้เมื่อทดสอบผ่าน Emulator
- หรือไปวางที่ Firebase Console → Realtime Database → Rules → วางทับ

---

หากต้องการ rule เฉพาะระบบย่อย เช่น checklist อย่างเดียว / party อย่างเดียว สามารถแยกให้ได้ครับ