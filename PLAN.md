# DN Party List - Project Plan

## 🎯 จุดประสงค์ของโปรเจกต์ DNPartyList (Project Purpose & Overview)

โปรเจกต์นี้ชื่อว่า **DNPartyList** เป็นเว็บแอปสำหรับผู้เล่นเกม Dragon Nest Classic  
เพื่อจัดการตัวละคร วางแผนการลงดันเจี้ยนแบบเป็นระบบ พร้อมเช็คลิสต์และจัดปาร์ตี้ได้ง่ายผ่าน UI สมัยใหม่

---

## ✅ เป้าหมายหลักของเว็บไซต์

- ให้ผู้เล่นสามารถจัดการตัวละครของตนเองได้
- ติ๊กกิจกรรมที่ทำแล้วได้ (Daily / Weekly Checklist)
- สร้างปาร์ตี้เพื่อลงเนสต์ได้ และแชร์ลิงก์ชวนเพื่อน
- เชื่อมโยงทุกระบบผ่าน Firebase (Realtime Database) + Auth
- ใช้งานง่ายบนมือถือและ Desktop ด้วย UI แบบ Pastel + Modern

---

## 🧩 เทคโนโลยีที่ใช้

- **Next.js** → ระบบ frontend และ routing
- **Tailwind CSS** → สำหรับจัด UI ที่ Responsive และสวยงาม
- **Firebase** →
  - Auth → Login ด้วย Google
  - Realtime Database → จัดเก็บข้อมูลตัวละคร / ปาร์ตี้ / checklist
- **Vercel** → สำหรับ Deploy
- **shadcn/ui** + **Radix UI** → ปุ่ม / Modal / Dropdown

---

## 📦 โครงสร้างระบบ (ระบบย่อยทั้งหมด)

1. **ระบบผู้ใช้**
   - Login ด้วย Google
   - กรอกชื่อ Discord หนึ่งครั้ง
   - แสดงเมนูเปลี่ยนชื่อ / reset checklist / logout

2. **ระบบตัวละคร**
   - เพิ่ม/แก้ไข/ลบตัวละครได้
   - มี Stat + Checklist
   - กล่องตัวละครมีสีพื้นตามอาชีพหลัก (แดง/เขียว/ม่วง/ฟ้า)

3. **ระบบ Checklist รายวัน / รายสัปดาห์**
   - ติ๊กแล้วบันทึกได้ (toggle)
   - รีเซ็ตได้อัตโนมัติ (ตามเวลาไทย) และ manual
   - ปรับได้ผ่าน dropdown

4. **ระบบปาร์ตี้**
   - สร้างปาร์ตี้โดยเลือกเนสต์ + ตัวละคร
   - ปาร์ตี้จำกัดจำนวนคนตามเนสต์
   - แชร์ลิงก์ให้เพื่อนเข้าร่วมได้

5. **ระบบลิงก์เชิญเข้าปาร์ตี้**
   - หากยังไม่ login → redirect
   - หากมีตัวละครในเนสต์เดียวกัน → แจ้งเตือนก่อน
   - หากปาร์ตี้เต็ม → ปุ่ม join จะหายไป

6. **ระบบเชิญ / เรียกสมาชิกผ่าน Discord**
   - ปุ่มเดียวทำหน้าที่เปลี่ยนตามสถานะปาร์ตี้
   - ยังไม่เต็ม → เชิญเพื่อน (แนบข้อความว่า "ยังว่าง")
   - เต็มแล้ว → เรียกสมาชิก (แท็ก @discord + "มาลงดันกัน!")

7. **ระบบสรุปพลังทีม**
   - แสดงค่าเฉลี่ย Stat ของทีม (ATK, HP, CRI, DEF)
   - เป้าหมาย stat ที่หัวปาร์ตี้กำหนดได้
   - มี Radar Chart (Recharts)

8. **ระบบเชื่อมโยงข้อมูลตัวละครกับปาร์ตี้**
   - แสดงใน `/mypage` ว่าตัวละครอยู่ในปาร์ตี้ไหน
   - กดแล้วลิงก์ไปยังปาร์ตี้นั้น

---

## 🎨 การออกแบบ UI/UX

- ใช้โทน **Pastel** แบบสะอาดตา
- ปุ่มใหญ่ กดง่าย ทั้งมือถือ/PC
- Font → Prompt หรือ Noto Sans Thai
- กล่อง Card ทุกจุดมี `rounded-2xl`, `shadow-md`
- เน้น UI สื่อสารง่าย ไม่รก

---

## 💬 ข้อความประกอบ / ฟีเจอร์พิเศษ

- มีลายเซ็นด้านล่างทุกหน้า: `Guild Galaxycat by Ousuri`
- หัวข้อหน้าชัดเจน เช่น:
  - `/mypage` → "My Character"
  - `/party` → "Dragon Nest Party List"

---

## 🧠 หมายเหตุเพิ่มเติมสำหรับ Cursor

- ใช้ Firebase Client SDK ฝั่ง client เท่านั้น
- ห้ามใช้ Firebase Admin SDK หรือ Secret Key ใด ๆ
- ทุกคำสั่งต้องรองรับความปลอดภัยของ user แต่ละคนแยก uid

## Features & Requirements

### Character Management
- [ ] List of available classes:
  Main Classes:
  - Warrior
    - Swordsman
    - Mercenary
  - Archer
    - Bowmaster
    - Acrobat
  - Sorceress
    - Force User
    - Elemental Lord
  - Cleric
    - Paladin
    - Saint
  - Academic
    - Engineer
    - Alchemist

### UI Components
- [ ] Character Card
  - [ ] Display character stats (ATK, HP, FD, CRI, Element, P.DEF, M.DEF)
  - [ ] Color scheme based on character class
  - [ ] Progress tracking (Daily & Weekly)
  - [ ] Discord name display
  - [ ] Delete button for character owner

### User Features
- [ ] Discord name setting
  - [ ] Persist across sessions
  - [ ] Update all character cards when changed
- [ ] Authentication
  - [ ] Google sign-in
  - [ ] Session management

### Progress Tracking
- [ ] Daily Tasks
  - [ ] Daily Quest
  - [ ] FTG 700
- [ ] Weekly Tasks
  - [ ] Minotaur (0-7)
  - [ ] Cerberus (0-5)
  - [ ] Cerberus Hell (0-2)
  - [ ] Cerberus Challenge (0-1)
  - [ ] Manticore (0-3)
  - [ ] Manticore Hell (0-1)
  - [ ] Apocalypse (0-3)
  - [ ] Apocalypse Hell (0-1)
  - [ ] Sea Dragon (0-1)
  - [ ] Chaos Rift: Kamala (0-3)
  - [ ] Chaos Rift: Bairra (0-3)
  - [ ] Banquet Hall (0-1)
  - [ ] Jealous Albeuteur (0-1)
  - [ ] Theme Park (0-1)

## Design Guidelines

### Colors
- Use class-specific colors for:
  - Card borders
  - Progress bars
  - Text highlights
  - Background accents

### Typography
- Font: 'Prompt' from Google Fonts
- Support both English and Thai languages

### Layout
- Responsive grid layout
- Mobile-friendly design
- Clean and modern UI

## Technical Notes

### Firebase Structure
```typescript
// User Document
interface User {
  discordName: string;
}

// Character Document
interface Character {
  id: string;
  name: string;
  class: CharacterClass;
  userId: string;
  discordName: string;
  stats: {
    atk: number;
    hp: number;
    finalDamage: number;
    critRate: number;
    elementalDamage: number;
    pdef: number;
    mdef: number;
  };
  checklist: {
    daily: {
      dailyQuest: boolean;
      ftg: boolean;
    };
    weekly: {
      minotaur: number;
      cerberus: number;
      cerberusHell: number;
      cerberusChallenge: number;
      manticore: number;
      manticoreHell: number;
      apocalypse: number;
      apocalypseHell: number;
      seaDragon: number;
      chaosRiftKamala: number;
      chaosRiftBairra: number;
      banquetHall: number;
      jealousAlbeuteur: number;
      themePark: number;
    };
  };
}

โปรเจกต์นี้คือเว็บไซต์ชื่อว่า DNPartyList พัฒนาด้วย Next.js + TypeScript + Tailwind CSS + Firebase Realtime Database และ deploy บน Vercel

เป้าหมาย:
สร้างเว็บไซต์สำหรับผู้เล่น Dragon Nest เพื่อ:
- จัดการตัวละคร
- เช็คกิจกรรม Daily / Weekly
- จัดปาร์ตี้ลงดันเจี้ยน
- แชร์ลิงก์ปาร์ตี้ผ่าน Discord
- แสดง Stat ปาร์ตี้แบบกราฟ
- UI สวยงาม สีพาสเทลสดใส อ่านง่าย เหมาะกับการใช้งานจริง

✅ เทคโนโลยีที่ใช้:
- Next.js + TypeScript
- Tailwind CSS
- Firebase Auth (Google Login)
- Firebase Realtime Database
- Vercel (auto preview จาก GitHub)

✅ ระบบผู้ใช้:
- Login ด้วย Google (Firebase Auth)
- หลังล็อกอินให้กรอกชื่อ Discord หนึ่งครั้ง ใช้ร่วมกับตัวละครทั้งหมดของผู้ใช้
- ข้อมูลแยกตาม UID และเก็บใน Firebase

✅ ระบบตัวละคร:
- เพิ่ม / แก้ไข / ลบตัวละคร
- ข้อมูลแต่ละตัว:
  - ชื่อตัวละคร
  - อาชีพย่อย (เลือกจาก 8 คลาส: Swordsman, Mercenary, Bowmaster, Acrobat, Force User, Elemental Lord, Paladin, Saint)
  - Stat:
    - ATK
    - CRI%
    - FD
    - Element%
    - HP
    - DEF (P.DEF%, M.DEF%)

📌 รูปแบบการแสดงผล Stat:
ATK: 1.5M        CRI: 85%
FD: 1450         Element: 30%
HP: 6.2M         DEF: P.78% / M.70%

📌 Card UI ของตัวละคร:
- ใช้สีพื้นหลังตาม "อาชีพหลัก" ของอาชีพย่อย:
  - Warrior: แดง (Swordsman, Mercenary)
  - Archer: เขียว (Bowmaster, Acrobat)
  - Sorceress: ม่วง (Force User, Elemental Lord)
  - Cleric: ฟ้า (Paladin, Saint)
  - Academic: เหลือง (Engineer, Alchemist)
- Card UI ต้อง:
  - บรรทัดบนสุด: ชื่อ Discord (เจ้าของตัวละคร)
  - บรรทัดต่อไป: ชื่อตัวละคร | อาชีพย่อย
  - Stat ตาม format ด้านบน
  - Checklist [รายวัน] + [รายสัปดาห์]
  - ปุ่มลบตัวละคร (เฉพาะเจ้าของ)

✅ ระบบ Checklist:
- รายวัน: Daily Quest, FTG 700
- รายสัปดาห์: (แยกเนสต์)
  - Minotaur 7 รอบ
  - Cerberus 5 รอบ
  - Cerberus Hell 2 รอบ
  - Cerberus Challenge 1 รอบ
  - Manticore 3 รอบ
  - Manticore Hell 1 รอบ
  - Apocalypse 3 รอบ
  - Apocalypse Hell 1 รอบ
  - Sea Dragon 1 รอบ
  - Chaos Rift Kamala 3 รอบ
  - Chaos Rift Bairra 3 รอบ
  - Banquet Hall of Darkness 1 รอบ
  - Jealous Albeuteur 1 รอบ
  - Wonderful Theme Park (ไม่ใช้ปาร์ตี้)

🕘 เวลาที่ใช้รีเซ็ต Checklist:
- รายวัน: 09:00 น. ทุกวัน
- รายสัปดาห์: 08:00 น. วันเสาร์
- Checkbox ที่ติ๊กแล้วใช้สีเดียวกับสายอาชีพของตัวละคร

✅ ระบบปาร์ตี้:
- ผู้ใช้สามารถสร้างปาร์ตี้โดยเลือกเนสต์
- รองรับจำนวนคนตามตารางนี้:
[เนื้อหาตารางเนสต์ตามที่คุณระบุไว้ก่อนหน้า]

📌 เงื่อนไข:
- ตัวละคร 1 ตัวอยู่ได้หลายปาร์ตี้ แต่ห้ามซ้ำเนสต์
- หัวปาร์ตี้สามารถลบสมาชิก
- สมาชิกออกเองได้
- ปุ่มเพิ่มสมาชิกจะกลับมาเมื่อมีช่องว่าง

✅ แชร์ลิงก์ปาร์ตี้:
- แชร์ผ่าน /party/[id]
- เข้าผ่าน /join/[id] → redirect หากยังไม่ login หรือยังไม่มีตัวละคร
- ถ้าตัวละครอยู่เนสต์เดียวกันแล้ว ให้ลบจากของเก่าก่อนเพิ่มใหม่

✅ ปุ่ม "เชิญผ่าน Discord":
- กดแล้วให้กรอกชื่อห้อง Discord (optional)
- แสดงข้อความพร้อมลิงก์ปาร์ตี้ เช่น:
[ตัวอย่างข้อความ Discord]

✅ ระบบ Stat ปาร์ตี้:
- แสดงค่าเฉลี่ย: ATK, CRI, HP, P.DEF, M.DEF
- มี min/max stat
- หัวปาร์ตี้สามารถตั้งเป้าหมาย stat ได้
- แสดงด้วย Radar Chart

✅ UX / UI:
- กล่อง Card UI: ขนาดใหญ่, อ่านง่าย, สีพาสเทลสดใส, ดูทันสมัย
- ใช้พื้นที่หน้าจอให้เต็ม, ชัดเจน, ตอบสนองไว, ทุกหน้าเชื่อมต่อกันอย่างชาญฉลาด
- ตรงไหนไม่ใช้บ่อยๆควรซ่อน, pop-up ในส่วนที่ทำให้สะดวก
- Font: Prompt หรือ Noto Sans Thai
- Layout ชัดเจน จัดกลางจอ
- ปุ่มทันสมัย, แตะง่าย, shadow-md, rounded-2xl
- Responsive: มือถือ / แท็บเล็ต / PC

✅ ข้อกำหนดทั่วไป:
- ทุกหน้าต้องมีลายเซ็น: "Guild Galaxycat by Ousuri"
- หัวข้อหน้าต้องแสดง:
  - My Page → My Character
  - Party Page → Dragon Nest Party List
``` 