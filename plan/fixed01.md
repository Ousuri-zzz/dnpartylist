# เป้าหมาย
แก้ไขชื่ออาชีพที่สะกดผิดในโปรเจกต์ทั้งหมดให้ถูกต้อง ดังนี้:
- "Saint" ➔ "Priest"
- "Swordsman" ➔ "Sword Master" (ระวังมีช่องว่างระหว่างคำ)

**ต้องแก้ไขทั้งใน:**
- Source code ทั้งหมด (ตัวแปร, เงื่อนไข, function, dropdown ตัวเลือกอาชีพ, ฟังก์ชัน save/load)
- ชื่อที่แสดงบนหน้าเว็บ (CharacterCard, Select Box, Modal เพิ่มตัวละคร, หน้า Party ฯลฯ)
- การ mapping อาชีพในกรณีที่มีการแสดงชื่ออาชีพ
- ตัวแปรหรือคีย์ที่เกี่ยวข้องกับอาชีพในโค้ด
- ชื่อที่บันทึกหรืออ่านจาก Firebase Realtime Database (`character.job`)

# เงื่อนไขเพิ่มเติม
- ต้องแก้ทุกจุดที่เคยใช้ "Saint" เป็น "Priest" แบบแม่นยำ
- ต้องแก้ทุกจุดที่เคยใช้ "Swordsman" เป็น "Sword Master" แบบแม่นยำ (ระวังเรื่องช่องว่างด้วย)
- ต้องทำให้ consistent ตลอดระบบ (ทั้ง UI, Logic, Database access)
- ต้องระวังไม่เปลี่ยนชื่ออาชีพอื่น ๆ ที่สะกดถูกอยู่แล้ว
- หลังจากแก้ในโค้ดแล้ว เพิ่มฟังก์ชันอัปเดตข้อมูลใน Firebase Realtime Database:
  - อ่านข้อมูลตัวละครทั้งหมด
  - ถ้า `job` เป็น "Saint" ➔ อัปเดตเป็น "Priest"
  - ถ้า `job` เป็น "Swordsman" ➔ อัปเดตเป็น "Sword Master"

# ฟังก์ชัน Migration ที่ต้องเพิ่ม
- เขียนฟังก์ชันเพื่ออ่านข้อมูล user characters
- ตรวจสอบ field `job`
- ถ้าเจอ "Saint" ➔ update เป็น "Priest"
- ถ้าเจอ "Swordsman" ➔ update เป็น "Sword Master"

# การตรวจสอบ
- ทดสอบโดยดึงข้อมูล character แล้วตรวจสอบ job ต้องไม่มี "Saint" และ "Swordsman" หลงเหลืออยู่
- Dropdown, Display, และข้อมูลที่เก็บลง Firebase ต้องเป็น "Priest" หรือ "Sword Master" ที่สะกดถูกต้องเสมอ

# สรุปเป้าหมายสุดท้าย
- เว็บต้องแสดงชื่ออาชีพที่สะกดถูกทั้งหมด
- Firebase ต้องเก็บชื่ออาชีพที่ถูกต้อง
- โค้ดต้อง clean และ consistent
