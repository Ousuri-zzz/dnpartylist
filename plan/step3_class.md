# 🧙‍♀️ DNPartyList – Prompt ระบบตัวละคร (Characters)

คำอธิบายละเอียดสำหรับ Cursor เพื่อสร้างระบบจัดการตัวละครในหน้า `/mypage` ของโปรเจกต์ DNPartyList

---

## ✅ เป้าหมายของระบบ

- ผู้ใช้สามารถเพิ่ม / แก้ไข / ลบตัวละครของตนเองได้
- ข้อมูลตัวละครทุกตัวเชื่อมกับ UID ของผู้ใช้
- ตัวละครแต่ละตัวมี Stat ครบ, Checklist รายวัน / รายสัปดาห์ และสีประจำอาชีพ
- ระบบรองรับหลายตัวละครต่อผู้ใช้

---

## ✅ โครงสร้าง Firebase

ข้อมูลตัวละครแต่ละตัวเก็บที่:
```
users/[uid]/characters/[charId]
```

ข้อมูลภายใน:
```json
{
  "name": "Tokior",
  "subclass": "Adept",
  "mainClass": "Sorceress",
  "stats": {
    "atk": 3200000,
    "hp": 6200000,
    "fd": 145,
    "cri": 85,
    "ele": 30,
    "def": { "pdef": 78, "mdef": 70 }
  },
  "checklist": {
    "daily": {
      "dailyQuest": false,
      "ftg700": false
    },
    "weekly": {
      "minotaur": false,
      "cerberus": false
    }
  }
}
```

---

## ✅ การเพิ่มตัวละคร

- ฟอร์มกรอก: ชื่อตัวละคร, อาชีพย่อย (เลือก 1 จาก 10), Stat
- Stat input: พิมพ์ตัวเลขได้โดยตรง (ไม่ใช้ spinner)
- ระบบต้อง auto map `mainClass` ตามอาชีพย่อย

| อาชีพหลัก | อาชีพย่อย |
|-----------|------------|
| Warrior | Swordsman, Mercenary |
| Archer | Bowmaster, Acrobat |
| Sorceress | Force User, Elemental Lord |
| Cleric | Paladin, Saint |
| Academic | Engineer, Alchemist |

---

## ✅ แสดงตัวละครด้วย Card

- กล่อง Card 1 ตัวละคร = ใช้สีพื้นตามอาชีพหลัก (Pastel)
- แสดงข้อมูล:
  1. บรรทัดบน: `ชื่อ Discord: ชื่อตัวละคร | อาชีพย่อย`
  2. บรรทัด 2: Stat ย่อในรูปแบบ:
     `⚔️ ATK: 3.2M   ❤️ HP: 6.2M   🛡️ DEF: P.78 / M.70`
  3. ด้านล่าง: Checklist รายวัน + รายสัปดาห์

- ใช้ Tailwind: `rounded-2xl`, `shadow-md`, background pastel
- Checklist: checkbox toggle ได้ทันที

---

## ✅ ปุ่มลบ / แก้ไขตัวละคร

- ปุ่มลบ → แสดง modal ยืนยันก่อนลบจริง
- ปุ่มแก้ไข → เปิด modal พร้อมข้อมูลเดิมให้กรอกใหม่ได้ทุก field
- ปุ่มทั้งสองอยู่มุมบนของ Card ตัวละคร

---

## ✅ การจัดการหลายตัวละคร

- ระบบรองรับการเพิ่มตัวละครหลายตัวในบัญชีเดียว
- แสดงแบบ grid หรือ list ที่อ่านง่ายบนมือถือ/PC
- แต่ละตัวละครสามารถอยู่ในปาร์ตี้ที่ต่างกันได้