# 📌 เพิ่มระบบ Tab หน้า /party (สำหรับ Cursor)

## 🎯 เป้าหมาย

เพิ่ม Tab ในหน้า `/party` เพื่อให้ผู้ใช้สามารถ:
- ดูปาร์ตี้ทั้งหมด (All Parties)
- ดูเฉพาะปาร์ตี้ที่ตัวละครของตัวเองเข้าร่วม (My Parties)

## 🧩 ฟังก์ชันที่ต้องทำ

### 1. เพิ่ม State คุมแท็บ
- ใช้ React State ชื่อ `selectedTab` เช่น 'all' หรือ 'my'
- ค่าเริ่มต้นเป็น 'all'

### 2. แสดงปุ่ม Tab
- มีปุ่ม 2 อัน: "ปาร์ตี้ทั้งหมด" และ "ปาร์ตี้ของฉัน"
- เมื่อคลิกปุ่ม → เปลี่ยน `selectedTab`
- ปุ่มที่เลือกอยู่ ให้เน้นสี หรือทำตัวหนา (bold) เพื่อแสดงสถานะ active

### 3. ดึงข้อมูลปาร์ตี้
- ใช้ข้อมูลปาร์ตี้ทั้งหมดที่โหลดจาก Firebase ตามโครงเดิม

### 4. กรองปาร์ตี้เมื่อเลือก "ปาร์ตี้ของฉัน"
- ดึง `characterIds` ของตัวละครที่ผู้ใช้มี
- กรองปาร์ตี้ โดยเช็กว่า ตัวละครของผู้ใช้มีอยู่ในสมาชิกของปาร์ตี้นั้นหรือไม่
- ใช้ `Object.keys(party.members).some()` เพื่อเช็ก characterIds ที่ซ้ำกัน

### 5. แสดงรายการปาร์ตี้
- ถ้าเลือก "ปาร์ตี้ทั้งหมด" → แสดงปาร์ตี้ทั้งหมด
- ถ้าเลือก "ปาร์ตี้ของฉัน" → แสดงเฉพาะปาร์ตี้ที่ตัวเองมีตัวละครอยู่

## 📋 ตัวอย่างโค้ด Flow (Pseudo-code)

```tsx
const [selectedTab, setSelectedTab] = useState<'all' | 'my'>('all');
const [parties, setParties] = useState<Party[]>([]);
const [myCharacterIds, setMyCharacterIds] = useState<string[]>([]);

const filteredParties = selectedTab === 'all'
  ? parties
  : parties.filter(party =>
      Object.keys(party.members).some((charId) => myCharacterIds.includes(charId))
    );

return (
  <div>
    <div className="flex space-x-4 mb-4">
      <button onClick={() => setSelectedTab('all')} className={selectedTab === 'all' ? 'font-bold underline' : ''}>
        ปาร์ตี้ทั้งหมด
      </button>
      <button onClick={() => setSelectedTab('my')} className={selectedTab === 'my' ? 'font-bold underline' : ''}>
        ปาร์ตี้ของฉัน
      </button>
    </div>

    <div>
      {filteredParties.length > 0 ? (
        filteredParties.map((party) => (
          <PartyCard key={party.id} party={party} />
        ))
      ) : (
        <p className="text-center text-gray-500 mt-8">ยังไม่ได้เข้าร่วมปาร์ตี้ใด ๆ</p>
      )}
    </div>
  </div>
);
```

## ✨ หมายเหตุ

- ต้องโหลด `myCharacterIds` หลัง Login เสร็จเพื่อให้มีข้อมูลที่แม่นยำ
- ถ้าไม่มีปาร์ตี้ที่เข้าร่วม ให้แสดงข้อความกลางหน้าจอ เช่น "ยังไม่ได้เข้าร่วมปาร์ตี้ใด ๆ"
- ต้องทำให้ Tab รองรับทั้ง Light และ Dark Mode

