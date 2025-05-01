## 📁 ไฟล์ 04-ranking-navbar.md (อัปเดต)

### 🎯 จุดประสงค์
เพิ่มลิงก์ไปยังหน้า `/ranking` ในเมนูด้านบน (Top Navigator) ของเว็บไซต์ DNPartyList พร้อมไอคอน และจัดเรียงให้อยู่ถัดจาก `Party List`

---

### ✅ สิ่งที่ต้องทำ
1. เพิ่มปุ่มเมนูใหม่ชื่อ `Ranking`
2. ใช้ไอคอน 📊 (ถ้าใช้ `lucide-react` → ใช้ `BarChart2`)
3. วางปุ่มนี้ไว้ **ถัดจาก Party List** ในแถบ Navigator ด้านบน
4. ให้เมนูใหม่นี้นำไปยัง route `/ranking`
5. ต้องแน่ใจว่าไม่มีผลกระทบกับระบบอื่น เช่น Login, Dropdown, Route Authentication

---

### 🧩 ตัวอย่างโค้ด JSX (shadcn/ui + Tailwind)
```tsx
import { BarChart2 } from 'lucide-react';
import Link from 'next/link';

<nav className="flex items-center gap-6">
  <Link href="/mypage" className="nav-item">My Page</Link>
  <Link href="/party" className="nav-item">Party List</Link>
  <Link href="/ranking" className="nav-item flex items-center gap-2">
    <BarChart2 className="w-4 h-4" />
    <span>Ranking</span>
  </Link>
</nav>
```
> หมายเหตุ: `nav-item` ควรถูกกำหนดใน global style หรือ component CSS ให้รองรับ dark/light mode ได้ดี

---

### 🎨 สไตล์เมนู (Tailwind แนะนำ)
- `hover:text-primary`
- `transition-colors`
- `rounded-md px-3 py-1`
- ขนาดพอดีอ่านง่ายบน mobile

---

### 💡 หมายเหตุเพิ่มเติม
- ผู้ใช้ **ไม่จำเป็นต้อง login** เพื่อเข้าหน้า `/ranking` ได้ (เปิดให้ดูอันดับรวมได้อิสระ)
- ไม่ต้องมีการกรองสิทธิ์เฉพาะผู้ใช้งาน เพราะข้อมูล Ranking เป็นสาธารณะ

---

ขั้นตอนถัดไป: สร้างการโหลดข้อมูลจาก Firebase และเรียงลำดับตามค่าที่เลือก → จะเก็บใน `05-ranking-data-fetch.md`