# 🧩 Prompt สำหรับ Cursor – ออกแบบหน้ารวมปาร์ตี้ (หน้า /party)

## 🎯 เป้าหมาย
สร้างหน้ารวมปาร์ตี้ (`/party`) ที่แสดงห้องปาร์ตี้ทั้งหมดในระบบ พร้อม UI ที่อ่านง่าย ใช้งานง่าย และดูสวยงาม โดยแสดงข้อมูลห้องแบบ Card UI หลายแถว พร้อมกล่องด้านขวาแสดงรายชื่อ Discord ของผู้ใช้ทั้งหมดแบบจัดกลุ่ม

---

## ✅ สิ่งที่ต้องแสดง

### 🔳 ด้านซ้าย: “กล่องปาร์ตี้แต่ละห้อง”

| รายละเอียด | ตัวอย่าง |
|-------------|----------|
| ชื่อเนสต์ | Cerberus Hell |
| จำนวนสมาชิก | 2/4 |
| รายชื่อตัวละคร | ชื่อ Discord + ตัวละคร + อาชีพ |
| ปุ่มดูรายละเอียด | → ลิงก์ไปที่ `/party/[id]` |
| สีพื้นหลังของ Card | สีอ่อนพาสเทล ตามเนสต์หรือแบบกลาง |

---

### 🪪 ข้อมูลใน Card ปาร์ตี้

- หัวข้อ: `เนสต์: ชื่อเนสต์`
- สมาชิก: แสดงชื่อ Discord → ชื่อ + อาชีพ (แยกบรรทัด)
- ถ้ามีสมาชิกครบ → ระบุ “เต็มแล้ว” ด้วยสีจาง
- ปุ่ม: “ดูปาร์ตี้” → ลิงก์ `/party/[id]`

```tsx
<Card className="rounded-2xl shadow-md p-4 w-full bg-white">
  <h2 className="text-lg font-semibold">Cerberus Hell</h2>
  <p className="text-sm text-gray-500">สมาชิก: 3/4</p>

  <ul className="mt-2 space-y-1 text-sm">
    <li><b>sena#4777</b> – Tokior | Adept</li>
    <li><b>alfie#1392</b> – Lumen | Physician</li>
  </ul>

  <Link href={`/party/${id}`} className="mt-3 block text-center bg-blue-100 hover:bg-blue-200 py-1 rounded">
    ดูปาร์ตี้
  </Link>
</Card>
```

---

### 📦 ด้านขวา: รายชื่อ Discord ของผู้ใช้ทั้งหมด

- กล่องเล็กแนวตั้ง
- จัดกลุ่มตาม Discord ID
- หากคลิกชื่อ → แสดง popup หรือ side card ของตัวละครทั้งหมดของคนนั้น (optional)
- สามารถทำแบบ hover แสดง preview ได้

---

## 🧠 ข้อควรระวัง

- ใช้ `onValue(ref(db, 'parties'))` เพื่อโหลดข้อมูลทั้งหมด
- จัดเรียงตามเวลา / ชื่อเนสต์ได้ตามต้องการ
- ใช้ Tailwind CSS แบบ responsive grid เช่น `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

---

## 🎨 Style

- Font: Prompt หรือ Noto Sans Thai
- Card: พื้นหลังขาว / ขอบพาสเทล / มุมโค้ง `rounded-2xl`
- Shadow: `shadow-md`
- Grid: `gap-4 grid-cols-2`
- สี: ใช้ soft pastel อ่านง่าย

---

## ✨ ตัวเลือกเพิ่มเติม

- เพิ่มปุ่ม “สร้างปาร์ตี้” ด้านบน → เปิด modal หรือ redirect ไปสร้าง
- Search bar ค้นหาตามเนสต์หรือชื่อสมาชิก (optional)
- ระบบจัดกลุ่มเนสต์ด้วยแถบหัวข้อ (optional)