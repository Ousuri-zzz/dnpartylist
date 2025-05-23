# คู่มือการใช้งาน DNPartyList

## 1. ภาพรวมของโปรเจกต์ (Overview)

DNPartyList เป็นเว็บแอปพลิเคชันที่ออกแบบมาเพื่อผู้เล่นเกม Dragon Nest (Classic) โดยเฉพาะ โดยมีฟีเจอร์หลักดังนี้:

- 📋 ระบบเช็กรายการกิจกรรมรายวัน/รายสัปดาห์ของตัวละคร
- 👥 ระบบสร้างและจัดการปาร์ตี้สำหรับลงดันเจี้ยน
- 🔗 การแชร์ลิงก์เชิญเข้าปาร์ตี้ผ่าน Discord
- 📊 แสดงข้อมูลตัวละครและ Stat แบบอ่านง่าย
- 📱 รองรับการใช้งานบนทุกอุปกรณ์

## 2. โครงสร้างของโปรเจกต์ (Project Structure)

```
src/
├── app/              # หน้าเว็บแต่ละหน้า (Next.js App Router)
├── components/       # UI Components ต่างๆ
├── hooks/           # Custom React Hooks
├── lib/             # ฟังก์ชันการเชื่อมต่อ Firebase และ utilities
├── types/           # TypeScript type definitions
├── utils/           # ฟังก์ชันช่วยเหลือทั่วไป
├── constants/       # ค่าคงที่ที่ใช้ในโปรเจกต์
└── config/          # การตั้งค่าต่างๆ
```

### ไฟล์สำคัญ
- `package.json` - กำหนด dependencies และ scripts สำหรับ Next.js
- `tailwind.config.ts` - การตั้งค่า Tailwind CSS และ theme
- `firebase.json` - การตั้งค่า Firebase Hosting และ Functions
- `database.rules.json` - กฎการเข้าถึงข้อมูล Firebase Realtime Database
- `firestore.rules` - กฎการเข้าถึงข้อมูล Firebase Firestore
- `.env.example` - ตัวอย่างการตั้งค่า environment variables
- `next.config.js` - การตั้งค่า Next.js
- `tsconfig.json` - การตั้งค่า TypeScript
- `postcss.config.js` - การตั้งค่า PostCSS สำหรับ Tailwind

## 3. วิธีใช้งานเว็บไซต์ (How to Use)

### การเข้าสู่ระบบ
1. คลิกปุ่ม "Login with Google"
2. ใส่ชื่อ Discord หลังล็อกอินครั้งแรก
3. เริ่มใช้งานระบบได้ทันที

### การจัดการตัวละคร
1. ไปที่หน้า MyPage
2. คลิกปุ่ม "เพิ่มตัวละคร"
3. กรอกข้อมูลพื้นฐาน:
   - ชื่อตัวละคร
   - เลือกอาชีพ:
     - Warrior
       - Sword Master
       - Mercenary
     - Archer
       - Bow Master
       - Acrobat
     - Sorceress
       - Elemental Lord
       - Force User
     - Cleric
       - Paladin
       - Priest
     - Academic
       - Engineer
       - Alchemist
4. คลิกปุ่ม "เพิ่มตัวละคร" เพื่อบันทึก
5. หลังจากเพิ่มตัวละครแล้ว สามารถแก้ไขข้อมูลเพิ่มเติมได้:
   - คลิกปุ่ม "แก้ไข" ที่ตัวละครที่ต้องการ
   - กรอกข้อมูล Stat ต่างๆ:
     - ATK (พลังโจมตี)
     - HP (พลังชีวิต)
     - FD (Final Damage)
     - CRI% (อัตราคริติคอล)
     - ELE% (พลังธาตุ)
     - PDEF% (พลังป้องกันกายภาพ)
     - MDEF% (พลังป้องกันเวทมนตร์)
   - คลิก "บันทึก" เพื่ออัพเดทข้อมูล

### การสร้างปาร์ตี้
1. ไปที่หน้า Party
2. คลิก "สร้างปาร์ตี้ใหม่"
3. เลือกเนสต์ที่ต้องการ
4. เพิ่มตัวละครของตัวเอง
5. แชร์ลิงก์ผ่าน Discord

## 4. คำอธิบายส่วนประกอบหลัก (Main Components)

### CharacterCard
```typescript
interface CharacterCardProps {
  name: string;
  class: string;
  stats: CharacterStats;
  onEdit?: () => void;
  onDelete?: () => void;
}
```
- แสดงข้อมูลตัวละครในรูปแบบการ์ด
- แสดง Stat ด้วย emoji และสีตามอาชีพ
- มีปุ่มแก้ไขและลบ

### PartyList
```typescript
interface PartyListProps {
  parties: Party[];
  onJoin?: (partyId: string) => void;
  onLeave?: (partyId: string) => void;
}
```
- แสดงรายการปาร์ตี้ทั้งหมด
- แสดงจำนวนสมาชิกและเนสต์
- มีปุ่มเข้าร่วม/ออกจากปาร์ตี้

## 5. คำอธิบาย API หรือการเชื่อมต่อ (API / Backend)

### Firebase Realtime Database

#### โครงสร้างข้อมูลหลัก
```
/users/{uid}
  - characters: {
      [characterId]: {
        name: string,
        class: string,
        mainClass: string,
        level: number,
        stats: {
          atk: number,
          hp: number,
          pdef: number,
          mdef: number,
          cri: number,
          ele: number,
          fd: number
        },
        checklist: {
          daily: {
            dailyQuest: boolean,
            ftg: boolean
          },
          weekly: {
            [taskId]: number
          }
        }
      }
    }
  - meta: {
      discord: string
    }

/parties/{partyId}
  - nest: string
  - maxMember: number (2-8)
  - leader: string (uid)
  - members: {
      [memberId]: {
        userId: string,
        joinedAt: string (ISO date)
      }
    }
  - goals: {
      atk: number,
      hp: number,
      cri: number,
      def: number
    }

/guild
  - leaders: {
      [uid]: boolean
    }
  - members: {
      [memberId]: {
        // ข้อมูลสมาชิก
      }
    }
  - announcements: {
      [announcementId]: {
        // ข้อมูลประกาศ
      }
    }
  - events: {
      [eventId]: {
        // ข้อมูลกิจกรรม
      }
    }
```

### Firebase Firestore

#### โครงสร้างข้อมูลหลัก
```
/users/{userId}
  - ข้อมูลผู้ใช้พื้นฐาน
  - สิทธิ์: อ่าน/เขียนได้เฉพาะเจ้าของ

/characters/{characterId}
  - name: string (1-50 ตัวอักษร)
  - mainClass: string (Warrior, Archer, Sorceress, Cleric, Academic)
  - class: string
  - stats: {
      atk: number,
      hp: number
    }
  - สิทธิ์: อ่าน/เขียนได้เฉพาะเจ้าของตัวละคร

/events/{eventId}
  - ข้อมูลกิจกรรม
  - participants: {
      [userId]: {
        // ข้อมูลผู้เข้าร่วม
      }
    }
  - สิทธิ์: อ่านได้ทุกคน, เขียนได้เมื่อล็อกอิน
```

### กฎการเข้าถึงข้อมูล (Security Rules)

#### Realtime Database
- ต้องล็อกอินก่อนอ่าน/เขียนข้อมูล
- ข้อมูลผู้ใช้เข้าถึงได้เฉพาะเจ้าของหรือ guild leader
- ข้อมูลปาร์ตี้อ่านได้ทุกคน เขียนได้เมื่อล็อกอิน
- ข้อมูลกิลด์จัดการได้เฉพาะ guild leader

#### Firestore
- ข้อมูลสาธารณะอ่านได้ทุกคน
- ข้อมูลส่วนตัวเข้าถึงได้เฉพาะเจ้าของ
- กิจกรรมสร้าง/แก้ไขได้เมื่อล็อกอิน
- กิจกรรมลบได้เฉพาะเจ้าของ

### API Endpoints
- `GET /api/parties` - ดึงรายการปาร์ตี้ทั้งหมด
- `POST /api/parties` - สร้างปาร์ตี้ใหม่
- `PUT /api/parties/{id}` - อัพเดทข้อมูลปาร์ตี้
- `DELETE /api/parties/{id}` - ลบปาร์ตี้

## 6. การติดตั้งและรันโปรเจกต์ (Installation & Run)

1. ติดตั้ง dependencies:
```bash
npm install
```

2. สร้างไฟล์ `.env` จาก `.env.example`:
```bash
cp .env.example .env
```

3. ตั้งค่า Firebase:
- สร้างโปรเจกต์ Firebase ใหม่
- ใส่ค่า config ใน `.env`

4. รันโปรเจกต์:
```bash
npm run dev
```

## 7. ข้อควรรู้เพิ่มเติม / ข้อจำกัด (Notes / Limitations)

### ข้อจำกัดของระบบ
- ข้อมูล Checklist ใช้ localStorage จึงไม่ sync ข้ามเครื่อง
- ตัวละครอยู่ได้หลายปาร์ตี้ แต่ 1 เนสต์ห้ามซ้ำตัวเดียว
- ต้องใส่ชื่อ Discord ก่อนใช้งานระบบ

### ข้อควรระวัง
- ข้อมูลตัวละครและปาร์ตี้จะถูกลบถ้าลบแอคเคาท์
- ควรตรวจสอบข้อมูลก่อนสร้างปาร์ตี้
- ระบบไม่รองรับการแก้ไขข้อมูลของผู้อื่น

### การอัพเดทในอนาคต
- ระบบ Ranking และสถิติ
- การเพิ่มเนสต์ใหม่
- ระบบแจ้งเตือนผ่าน Discord 