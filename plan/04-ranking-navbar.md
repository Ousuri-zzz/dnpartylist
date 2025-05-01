## 📁 ไฟล์ 04-ranking-navbar.md

### 🎯 จุดประสงค์
เพิ่มลิงก์ไปยังหน้า `/ranking` ในเมนูด้านบน (Top Navigator) ของเว็บไซต์ DNPartyList พร้อมไอคอน และจัดเรียงให้อยู่ถัดจาก `Party List`

---

### ✅ สิ่งที่ต้องทำ
1. เพิ่มปุ่มเมนูใหม่ชื่อ `Ranking`
2. ใช้ไอคอน 📊 (หากใช้ `lucide-react` หรือ FontAwesome ให้ใช้ icon ที่ดูเรียบหรูใกล้เคียง)
3. วางปุ่มนี้ไว้ **ถัดจาก Party List** ในแถบ Navigator ด้านบน
4. ให้เมนูใหม่นี้นำไปยัง route `/ranking`

---

### 🧩 ตัวอย่างโค้ด JSX (สมมุติใช้ shadcn/ui + Tailwind)
```tsx
import { BarChart2 } from 'lucide-react';

<nav className="flex items-center gap-6">
  <Link href="/mypage" className="nav-item">My Page</Link>
  <Link href="/party" className="nav-item">Party List</Link>
  <Link href="/ranking" className="nav-item flex items-center gap-2">
    <BarChart2 className="w-4 h-4" />
    <span>Ranking</span>
  </Link>
</nav>
```
> ปรับ class และไอคอนตามระบบที่คุณใช้อยู่

---

### 🎨 สไตล์เมนู (Tailwind แนะนำ)
- `hover:text-primary`
- `transition-colors`
- `rounded-md px-3 py-1`
- ขนาดพอดีอ่านง่ายบน mobile

---

### 💡 หมายเหตุสำคัญ
- การเพิ่มปุ่มนี้ **ต้องไม่กระทบกับระบบอื่น** เช่น login, dropdown, หรือระบบ route เดิม
- ตรวจสอบว่าหากผู้ใช้ยังไม่ login ก็ยังสามารถเข้า `/ranking` เพื่อดูอันดับรวมได้ (ถ้าไม่มีการจำกัดสิทธิ)

---

ขั้นตอนถัดไป: สร้างการโหลดข้อมูลจาก Firebase และเรียงลำดับตามค่าที่เลือก → จะเก็บใน `05-ranking-data-fetch.md`
