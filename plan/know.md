# โครงสร้างโปรเจค Dragon Nest Party List

## 1. ระบบ Route และ Layout
- ใช้ Next.js App Router (app directory)
- มี Root Layout ที่ `src/app/layout.tsx`
- มี Navigation Bar และ Footer แยกเป็น components
- หน้าเว็บหลัก:
  - `/` - หน้าแรก
  - `/ranking` - หน้าอันดับตัวละคร
  - `/characters` - หน้าจัดการตัวละคร
  - `/auth` - หน้า authentication

## 2. State Management
- ใช้ React Hooks เป็นหลัก:
  - `useState` - จัดการ state ภายใน component
  - `useEffect` - จัดการ side effects
  - `useContext` - จัดการ global state
- ใช้ Firebase Authentication สำหรับจัดการผู้ใช้
- ใช้ Firebase Firestore สำหรับเก็บข้อมูล

## 3. โครงสร้างไฟล์
```
src/
├── app/                    # App Router
│   ├── layout.tsx         # Root Layout
│   ├── page.tsx           # หน้าแรก
│   ├── ranking/           # หน้าอันดับ
│   ├── characters/        # หน้าตัวละคร
│   └── auth/              # หน้า authentication
├── components/            # Components
│   ├── NavigationBar.tsx  # Navigation
│   ├── Footer.tsx         # Footer
│   └── ranking/          # Components สำหรับหน้า ranking
├── lib/                   # Utilities
│   └── firebase.ts       # Firebase Configuration
├── types/                 # TypeScript Types
│   └── character.ts      # Character Types
└── utils/                # Utility Functions
    └── scoreCalculator.ts # Score Calculation
```

## 4. การจัดการข้อมูล
- ใช้ Firebase Firestore เป็นฐานข้อมูล
- Collection หลัก:
  - `characters` - ข้อมูลตัวละคร
  - `users` - ข้อมูลผู้ใช้
- ใช้ Firebase Authentication สำหรับการ login/logout

## 5. UI Framework
- ใช้ Tailwind CSS สำหรับ styling
- ใช้ Shadcn/ui สำหรับ UI components
- มีการกำหนด theme colors และ custom styles ใน `tailwind.config.js`

## 6. Type Safety
- ใช้ TypeScript อย่างเต็มรูปแบบ
- มีการกำหนด types สำหรับทุกส่วนของแอพ
- มี interface สำหรับ Firebase data models

## 7. Environment Configuration
- ใช้ `.env` สำหรับ environment variables
- มี `env.example` สำหรับ template
- ใช้ Firebase config จาก environment variables

## 8. Authentication Flow
- ใช้ Firebase Auth
- มี protected routes
- มีการจัดการ session ด้วย Firebase

## 9. Data Fetching
- ใช้ Firebase SDK สำหรับดึงข้อมูล
- มีการ implement real-time updates
- มีการจัดการ loading states

## 10. การคำนวณคะแนน
- มีระบบคำนวณคะแนนตามอาชีพ
- คำนวณจากค่าสถานะต่างๆ:
  - ATK (พลังโจมตี)
  - HP (พลังชีวิต)
  - DEF% (ป้องกันกายภาพ)
  - CRI% (คริติคอล)
  - ELE% (ธาตุ)
  - FD% (เพิ่มความเสียหาย)
- มีการกำหนดน้ำหนักคะแนนตามอาชีพ

## 11. การแสดงผล
- แสดงผลเป็นตาราง
- มีระบบกรองตามอาชีพ
- มีระบบเรียงลำดับตามค่าสถานะต่างๆ
- แสดงไอคอนและสีตามอาชีพ
- รองรับการแสดงผลบนมือถือ

## 12. การอัพเดทข้อมูล
- อัพเดทแบบ real-time
- มี loading state
- มี error handling
- มีการ validate ข้อมูล

## 13. Security
- ใช้ Firebase Security Rules
- มีการตรวจสอบสิทธิ์การเข้าถึง
- มีการป้องกันข้อมูลสำคัญ

## 14. Performance
- ใช้ Next.js Image Optimization
- มีการ implement lazy loading
- มีการ cache ข้อมูล
- มีการ optimize queries

## 15. Testing
- มีการ test components
- มีการ test utilities
- มีการ test data fetching
- มีการ test authentication

# ความรู้เกี่ยวกับ Navigation Component

## โครงสร้างและการทำงานของ Navigation Bar

### 1. โครงสร้างพื้นฐาน
- เป็น Navigation Bar แบบ Sticky ที่อยู่ด้านบนสุดของหน้าเว็บ
- มีพื้นหลังสีขาวโปร่งแสงพร้อมเอฟเฟกต์ Blur
- มีเส้นขอบสีชมพูอ่อนและเงาเล็กน้อย
- ใช้ Container พร้อม Padding สำหรับจัดวางเนื้อหา

### 2. ลิงก์นำทาง
- มีลิงก์นำทางหลัก 2 จุด:
  - "My Character" (ไอคอนบ้าน)
  - "Party List" (ไอคอนผู้ใช้)
- คุณสมบัติของแต่ละลิงก์:
  - มีไอคอนแสดงสถานะ
  - มีแอนิเมชันเมื่อนำเมาส์ไปวาง (Hover)
  - มีเอฟเฟกต์พื้นหลังแบบไล่สีเมื่อถูกเลือก
  - มีการเคลื่อนไหวแบบ Smooth Transition

### 3. การแสดงผลแบบมีเงื่อนไข
- ซ่อนลิงก์นำทางเมื่ออยู่ที่หน้า Login
- แสดงเฉพาะ Discord Dropdown เมื่ออยู่ที่หน้า Login

### 4. การจัดวางหน้า
- แบ่งเป็น 3 คอลัมน์:
  - ซ้าย: ลิงก์นำทาง
  - กลาง: ชื่อกิลด์ ("Guild GalaxyCat by Ousuri")
  - ขวา: Discord Dropdown

### 5. คุณสมบัติพิเศษ
- ใช้ Next.js Link component สำหรับการนำทางแบบ Client-side
- ติดตามสถานะการใช้งานด้วย usePathname
- มีแอนิเมชันและการเปลี่ยนผ่านที่ลื่นไหล
- ออกแบบให้รองรับการแสดงผลบนอุปกรณ์ต่างๆ

## การดึงข้อมูลตัวละครจาก Firebase

## โครงสร้างข้อมูล
- ใช้ Firebase Realtime Database
- ข้อมูลตัวละครเก็บอยู่ใน path: `users/[uid]/characters/[charId]`
- ใช้ Client SDK สำหรับการดึงข้อมูล

## โครงสร้างข้อมูลตัวละคร
```json
{
  "name": "ชื่อตัวละคร",
  "class": "อาชีพย่อย",
  "mainClass": "อาชีพหลัก",
  "level": ระดับ,
  "stats": {
    "atk": ค่าพลังโจมตี,
    "hp": ค่าพลังชีวิต,
    "fd": ค่าเพิ่มความเสียหาย,
    "cri": ค่าคริติคอล,
    "ele": ค่าธาตุ,
    "pdef": ค่าป้องกันกายภาพ,
    "mdef": ค่าป้องกันเวท
  },
  "checklist": {
    "daily": {
      "dailyQuest": false,
      "ftg": false
    },
    "weekly": {
      "task1": 0,
      "task2": 0
    }
  }
}
```

## การดึงข้อมูล
1. **ใช้ Custom Hook: `useCharacters`**
   - ใช้ `onValue` จาก Firebase Realtime Database
   - ดึงข้อมูลแบบ real-time
   - ติดตามการเปลี่ยนแปลงอัตโนมัติ

2. **การจัดการ State**
   - ใช้ React Hooks (`useState`, `useEffect`)
   - จัดการ loading state
   - จัดการ error state

3. **การเข้าถึงข้อมูล**
   - ต้องมีการยืนยันตัวตนก่อน (`auth != null`)
   - เข้าถึงได้เฉพาะข้อมูลของตัวเอง
   - อ่านข้อมูลของผู้อื่นได้ แต่แก้ไขไม่ได้

## Security Rules
```json
{
  "users": {
    "$uid": {
      ".read": "auth != null",
      ".write": "auth != null && auth.uid === $uid",
      "characters": {
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

## เทคโนโลยีที่ใช้
- Firebase Realtime Database
- Firebase Authentication
- React Hooks
- TypeScript

# ระบบ UI Components

## โครงสร้าง UI Components
โปรเจคนี้ใช้ UI Components จากหลายแหล่ง:

### 1. Tailwind CSS + shadcn/ui
- ใช้ Tailwind CSS เป็น CSS Framework หลัก
- ใช้ shadcn/ui เป็น UI Component Library
- Components หลักที่ใช้:
  - Button
  - Input
  - Select
  - Dialog
  - Card
  - Label
  - Alert Dialog
  - Scroll Area
  - Separator

### 2. Custom Components
- มีการสร้าง Custom Components สำหรับฟีเจอร์เฉพาะ:
  - CharacterCard
  - PartyCard
  - CharacterChecklist
  - WeeklyChecklist
  - DailyChecklist
  - DiscordDropdown
  - Navigation
  - UserSidebar

### 3. การปรับแต่ง Theme
- ใช้ Tailwind Config สำหรับกำหนด Theme
- มีการกำหนด:
  - สีหลัก (Primary Colors)
  - สีรอง (Secondary Colors)
  - สีพื้นหลัง (Background Colors)
  - สีข้อความ (Text Colors)
  - ขนาดและระยะห่าง (Spacing)
  - ฟอนต์ (Font Family)

### 4. การจัดการ Style
- ใช้ Utility Function `cn()` สำหรับการรวม Class Names
- ใช้ `class-variance-authority` สำหรับการจัดการ Variants
- ใช้ `tailwind-merge` สำหรับการรวม Tailwind Classes

### 5. Icon Library
- ใช้ Lucide Icons เป็น Icon Library หลัก
- มีการนำไปใช้ในหลาย Components เช่น:
  - Navigation
  - Buttons
  - Cards
  - Dialogs

### 6. Animation
- ใช้ Framer Motion สำหรับ Animation
- มีการใช้งานใน:
  - Navigation Transitions
  - Dialog Animations
  - Card Hover Effects
  - Loading States
