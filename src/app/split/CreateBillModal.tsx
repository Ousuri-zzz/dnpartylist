import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { ref, push, set, get } from 'firebase/database';
import { toast } from 'react-hot-toast';
import { UserIcon, PlusIcon, XMarkIcon, DocumentTextIcon, CubeIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/solid';

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Item {
  name: string;
  price: number;
}

interface Participant {
  name: string;
  characterId: string;
}

interface Character {
  id: string;
  name: string;
  level: number;
  class: string;
}

export function CreateBillModal({ isOpen, onClose }: CreateBillModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<{ name: string }[]>([{ name: '' }]);
  const [loading, setLoading] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      if (!user) return;
      try {
        const charactersRef = ref(db, `users/${user.uid}/characters`);
        const snapshot = await get(charactersRef);
        if (snapshot.exists()) {
          const chars: Character[] = [];
          snapshot.forEach((childSnapshot) => {
            const char = childSnapshot.val();
            chars.push({
              id: childSnapshot.key,
              name: char.name,
              level: char.level,
              class: char.class,
            });
          });
          setCharacters(chars);
          if (chars.length > 0) {
            setSelectedCharacter(chars[0]);
          }
        }
      } catch (error) {
        toast.error('เกิดข้อผิดพลาดในการโหลดตัวละคร');
      }
    };

    if (isOpen) {
      fetchCharacters();
    }
  }, [user, isOpen]);

  const handleAddItem = () => {
    setItems([...items, { name: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = { name: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCharacter) return;

    setLoading(true);
    try {
      const now = Date.now();
      const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

      const validItems = items.filter(item => item.name);
      if (validItems.length === 0) {
        toast.error('กรุณาเพิ่มไอเทมอย่างน้อย 1 ชิ้น');
        setLoading(false);
        return;
      }

      const billData = {
        title,
        serviceFee: 0,
        ownerUid: user.uid,
        ownerCharacterId: selectedCharacter.id,
        createdAt: now,
        expiresAt,
        participants: {
          [selectedCharacter.id]: {
            name: selectedCharacter.name,
            characterId: selectedCharacter.id,
          },
        },
        items: validItems.reduce((acc, item, index) => {
          acc[`item${index}`] = { name: item.name, price: 0 };
          return acc;
        }, {} as Record<string, Item>),
      };

      const newBillRef = push(ref(db, 'splitBills'));
      await set(newBillRef, billData);

      toast.success('สร้างบิลสำเร็จ');
      onClose();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการสร้างบิล');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="w-full max-w-lg rounded-2xl bg-gradient-to-b from-yellow-50 to-white p-4 sm:p-8 shadow-2xl relative animate-fadeIn mx-2 flex flex-col items-center gap-4">
        <div className="flex flex-col items-center mb-6">
          <ClipboardDocumentListIcon className="w-10 h-10 text-yellow-500 mb-2" />
          <h2 className="text-2xl font-extrabold text-yellow-600 text-center tracking-tight">สร้างบิลใหม่</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 w-full">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-yellow-400" /> ชื่อบิล
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-yellow-300 px-3 py-2 text-base focus:ring-2 focus:ring-yellow-200 transition bg-white text-gray-700 placeholder-gray-400 shadow-sm"
              placeholder="กรอกชื่อบิล"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-yellow-400" /> เลือกตัวละคร
            </label>
            <div className="relative">
              <select
                value={selectedCharacter?.id || ''}
                onChange={(e) => {
                  const char = characters.find(c => c.id === e.target.value);
                  if (char) setSelectedCharacter(char);
                }}
                className="w-full rounded-xl border border-yellow-300 px-3 py-2 text-base focus:ring-2 focus:ring-yellow-200 transition appearance-none bg-white text-gray-700 placeholder-gray-400 shadow-sm"
                required
              >
                {characters.map((char) => (
                  <option key={char.id} value={char.id}>{char.name}</option>
                ))}
              </select>
              <UserIcon className="w-5 h-5 text-yellow-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-yellow-400" /> รายการไอเทม
            </label>
            {items.map((item, index) => (
              <div key={index} className="mb-2 flex gap-2 items-center">
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleItemChange(index, e.target.value)}
                  placeholder="ชื่อไอเทม"
                  className="flex-1 rounded-xl border border-yellow-300 px-3 py-2 text-base focus:ring-2 focus:ring-yellow-200 transition bg-white text-gray-700 placeholder-gray-400 shadow-sm"
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="rounded-full bg-red-100 p-2 text-red-500 hover:bg-red-200 transition"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddItem}
              className="mt-2 rounded-xl bg-gradient-to-r from-yellow-200 to-emerald-200 px-3 py-2 text-base text-emerald-700 font-bold shadow hover:from-yellow-300 hover:to-emerald-300 transition flex items-center gap-2 w-full max-w-xs mx-auto"
            >
              <PlusIcon className="w-5 h-5" /> เพิ่มไอเทม
            </button>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-emerald-200 px-3 py-2 text-base text-emerald-500 hover:bg-emerald-50 font-semibold transition w-full max-w-xs mx-auto"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading || !selectedCharacter}
              className="rounded-xl bg-gradient-to-r from-yellow-300 to-emerald-400 px-3 py-2 text-base text-white font-bold shadow hover:from-yellow-400 hover:to-emerald-500 transition disabled:opacity-50 w-full max-w-xs mx-auto"
            >
              {loading ? 'กำลังสร้าง...' : 'สร้างบิล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 