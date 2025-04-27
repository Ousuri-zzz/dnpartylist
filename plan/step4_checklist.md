# ✅ DNPartyList – Prompt ระบบ Checklist (Daily / Weekly)

คำอธิบายอย่างละเอียดสำหรับ Cursor ในการสร้างระบบ Checklist รายวันและรายสัปดาห์สำหรับตัวละครแต่ละตัวในโปรเจกต์ DNPartyList

---

## 🎯 เป้าหมายของระบบ

- แต่ละตัวละครสามารถติ๊กกิจกรรมที่ทำแล้วได้ทั้งรายวัน / รายสัปดาห์
- ข้อมูล checklist เก็บไว้ใน Firebase Realtime Database
- UI ต้องดูง่าย ติ๊กสะดวก และมีระบบรีเซ็ตแบบอัตโนมัติ + manual

---

## 🧩 โครงสร้างข้อมูล Checklist

เก็บภายใต้:
```
users/[uid]/characters/[charId]/checklist
```

```json
{
  "daily": {
    "dailyQuest": false,
    "ftg700": false
  },
  "weekly": {
    "minotaur": false,
    "cerberus": false,
    "cerberusHell": false,
    "manticore": false,
    "manticoreHell": false,
    "apocalypse": false,
    "apocalypseHell": false,
    "seaDragon": false,
    "banquet": false,
    "kamala": false,
    "bairra": false,
    "jealous": false
  }
}
```

---

## 📆 การแยกหมวดหมู่

- หมวด “รายวัน” (Daily)
  - Daily Quest
  - FTG 700 พลังงาน

- หมวด “รายสัปดาห์” (Weekly)
  - รวมดันเจี้ยนทั้งหมด เช่น Minotaur, Sea Dragon, Chaos Rift ฯลฯ

---

## 🛠️ การทำงานของ Checkbox

- แสดงเป็น checklist toggle ได้
- เมื่อผู้ใช้ติ๊ก / ยกเลิกติ๊ก → อัปเดตค่า true/false ใน Firebase
- ใช้ Firebase Client SDK ฝั่ง client (`update()`)

---

## 💾 ระบบบันทึก

- เก็บแยกต่อ user → characters → charId → checklist
- ห้ามแตะข้อมูลตัวละครของ user คนอื่นเด็ดขาด

---

## 💡 UI/UX

- Checklist ถูกจัดวางในกล่องตัวละคร (Card) แต่ละตัว
- ควรมีเส้นแบ่งชัดเจนระหว่าง Daily / Weekly
- Checkbox ควรเปลี่ยนสีพื้น/ขอบตามอาชีพหลักของตัวละครนั้น (แดง/เขียว/ม่วง/ฟ้า)
- ขนาดกล่องเหมาะกับมือถือ, ใช้ font `Prompt` หรือ `Noto Sans Thai`
- ใช้ Tailwind: `rounded`, `shadow`, `transition` สวยงาม

---

## 🧠 หมายเหตุสำหรับ Cursor

- ต้องแนบ uid และ charId ของตัวละครเมื่อบันทึกข้อมูล checklist
- สามารถเพิ่มกิจกรรมรายวัน/สัปดาห์ได้ในอนาคต → ต้องเขียนระบบให้ flexible