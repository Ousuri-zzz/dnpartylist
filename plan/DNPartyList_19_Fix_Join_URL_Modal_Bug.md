# 🧭 Prompt สำหรับ Cursor – แก้ปัญหา URL เปลี่ยนแล้ว Modal หาย / หน้าเด้งกลับ

## 🎯 ปัญหาที่ต้องแก้

เมื่อผู้ใช้กดปุ่ม "เข้าร่วมปาร์ตี้" แล้วมีการ `router.push('/party/[id]?join=true')` หรือเปิด modal ผ่าน URL → หน้าจอจะ redirect กลับ /party/[id] ทันที และ modal หายไป

**สาเหตุ:** ไม่มีไฟล์ `/party/[id].tsx` ที่รองรับ หรือ component ไม่ได้ render ออกมา (เช่น return null ก่อนเวลา)

---

## ✅ วิธีแก้

### 1. ตรวจให้แน่ใจว่ามีไฟล์ `pages/party/[id].tsx`

```tsx
import { useRouter } from "next/router";

export default function PartyPage() {
  const router = useRouter();
  const { id, join } = router.query;

  if (!id) return null; // รอ router พร้อม

  return (
    <div className="p-4">
      <h1 className="text-xl">ห้องปาร์ตี้: {id}</h1>

      {join === "true" && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <p>นี่คือตัวเลือก modal เข้าร่วม</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### 2. ห้าม `return null` หรือ redirect ทันทีถ้า `auth.uid` ยังไม่มา

ใช้แบบนี้แทน:

```tsx
if (auth === undefined) return <LoadingSpinner />;
if (!auth?.uid) {
  router.push("/login");
  return null;
}
```

---

### 3. อย่าใช้ `router.push("/party/[id]")` เพื่อแสดง modal

ให้ใช้การจัดการ UI ภายใน component โดยตรวจ `router.query`  
แสดง modal แบบ conditional จาก query param เท่านั้น

---

## 🧠 สำหรับ Cursor เพิ่มเติม

- ตรวจสอบให้แน่ใจว่ามีการ return component เสมอ (อย่า return null โดยไม่มี fallback)
- ให้ใช้ Tailwind UI ธรรมดา หรือ Framer Motion / Radix UI ที่ไม่ remount modal โดย default
- ไม่ต้องเปลี่ยน URL หาก modal เปิดภายในหน้าเดียวกัน

---

## ✅ สรุป

- ให้ Cursor ตรวจว่า `/party/[id]` ต้อง render เสมอ
- Modal เปิดจาก query param `?join=true`
- อย่าให้ URL เปลี่ยนแบบ redirect โดยไม่มี component รอรับ