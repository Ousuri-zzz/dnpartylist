import { Bill, Item } from './useSplitBills';
import { calculateSplit, formatGold, getTimeRemaining, isExpiringSoon } from './splitUtils';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { ref, remove, update, get, onValue } from 'firebase/database';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import {
  TrashIcon, UserIcon, XMarkIcon, BanknotesIcon, Cog6ToothIcon, UserGroupIcon, ClockIcon, GiftIcon, CubeIcon, PlusIcon, CheckCircleIcon, PencilIcon
} from '@heroicons/react/24/solid';

interface Character {
  id: string;
  name: string;
  level: number;
  class: string;
  discordName?: string;
}

interface Participant {
  characterId: string;
  name: string;
  level: number;
  class: string;
  paid?: boolean;
  discordName?: string;
}

interface BillCardProps {
  bill: Bill;
}

export function BillCard({ bill }: BillCardProps) {
  const { user } = useAuth();
  const isOwner = user?.uid === bill.ownerUid;
  const [editItems, setEditItems] = useState(() => Object.entries(bill.items || {}).map(([id, item]) => ({ id, ...item })));
  const [editServiceFee, setEditServiceFee] = useState(bill.serviceFee || 0);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Character[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [focusedInput, setFocusedInput] = useState<number | null>(null);
  const [focusedServiceFee, setFocusedServiceFee] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [showAddItemInput, setShowAddItemInput] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const items = editItems;
  const ownerCharacterId = bill.ownerCharacterId;
  const sortedParticipants = bill.participants
    ? (() => {
        const entries = Object.entries(bill.participants);
        const owner = entries.find(([, p]) => p.characterId === ownerCharacterId);
        const others = entries.filter(([, p]) => p.characterId !== ownerCharacterId);
        return [
          ...(owner ? [owner[1]] : []),
          ...others.map(([, p]) => p)
        ];
      })()
    : [];
  const totalPrice = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const splitAmount = calculateSplit(items, editServiceFee, sortedParticipants.length);
  const { days, hours, minutes } = getTimeRemaining(bill.expiresAt);
  const isExpiring = isExpiringSoon(bill.expiresAt);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!document.getElementById('billcard-marquee-style')) {
      const style = document.createElement('style');
      style.id = 'billcard-marquee-style';
      style.innerHTML = `@keyframes billcard-marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }`;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    // Listen for bill updates and update Discord names
    const billRef = ref(db, `splitBills/${bill.id}`);
    const unsubscribe = onValue(billRef, async (snapshot) => {
      const updatedBill = snapshot.val();
      if (updatedBill && updatedBill.participants) {
        // Update items
        const newItems = Object.entries(updatedBill.items || {}).map(([id, item]) => ({ 
          id, 
          ...(item as Item) 
        }));
        setEditItems(newItems);
        
        // Update service fee
        setEditServiceFee(updatedBill.serviceFee || 0);

        // Update participants' Discord names
        const participants = { ...updatedBill.participants };
        let hasUpdates = false;

        // ดึงข้อมูล Discord name สำหรับผู้เข้าร่วมทุกคน
        for (const [characterId, participant] of Object.entries(participants)) {
          const typedParticipant = participant as Participant;
          if (!typedParticipant.discordName) {
            try {
              const userSnap = await get(ref(db, 'users'));
              userSnap.forEach((userSnapshot) => {
                const chars = userSnapshot.child('characters').val();
                if (chars && chars[characterId]) {
                  const discordName = userSnapshot.child('meta/discord').val();
                  if (discordName) {
                    participants[characterId] = {
                      ...typedParticipant,
                      discordName
                    };
                    hasUpdates = true;
                  }
                }
              });
            } catch (error) {
              console.error('Error updating Discord name:', error);
            }
          }
        }

        // อัปเดตข้อมูลในฐานข้อมูลถ้ามีการเปลี่ยนแปลง
        if (hasUpdates) {
          try {
            await update(ref(db, `splitBills/${bill.id}`), {
              participants
            });
          } catch (error) {
            console.error('Error saving updated participants:', error);
          }
        }
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [bill.id]);

  const handleDelete = async () => {
    if (!isOwner) return;
    try {
      await remove(ref(db, `splitBills/${bill.id}`));
      toast.success('ลบบิลสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบบิล');
    }
  };

  const handleItemPriceChange = (index: number, value: string) => {
    const newItems = [...editItems];
    newItems[index].price = parseInt(value) || 0;
    setEditItems(newItems);
  };

  const handleServiceFeeChange = (value: string) => {
    setEditServiceFee(parseInt(value) || 0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const itemsObj = editItems.reduce((acc, item) => {
        acc[item.id] = { name: item.name, price: Number(item.price) || 0 };
        return acc;
      }, {} as Record<string, { name: string; price: number }>);
      await update(ref(db, `splitBills/${bill.id}`), {
        items: itemsObj,
        serviceFee: editServiceFee,
      });
      toast.success('บันทึกราคาสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const usersRef = ref(db, 'users');
      const snapshot = await get(usersRef);
      const results: Character[] = [];

      snapshot.forEach((userSnapshot) => {
        // ดึงข้อมูล Discord จาก meta
        const discordName = userSnapshot.child('meta/discord').val() || '';
        
        userSnapshot.child('characters').forEach((charSnapshot) => {
          const char = charSnapshot.val();
          if (char.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({
              id: charSnapshot.key,
              name: char.name,
              level: char.level,
              class: char.class,
              discordName: discordName, // ใช้ Discord name จาก meta
            });
          }
        });
      });

      setSearchResults(results);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการค้นหา');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddParticipant = async (character: Character) => {
    if (!isOwner) return;
    try {
      const newParticipants = {
        ...bill.participants,
        [character.id]: {
          characterId: character.id,
          name: character.name,
          level: character.level,
          class: character.class,
          discordName: character.discordName,
        },
      };
      await update(ref(db, `splitBills/${bill.id}`), {
        participants: newParticipants,
      });
      toast.success('เพิ่มผู้ร่วมบิลสำเร็จ');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มผู้ร่วมบิล');
    }
  };

  const handleRemoveParticipant = async (characterId: string) => {
    if (!isOwner) return;
    try {
      const newParticipants = { ...(bill.participants || {}) };
      if (newParticipants[characterId]) {
        delete newParticipants[characterId];
        const updateData: any = {};
        if (Object.keys(newParticipants).length === 0) {
          updateData['participants'] = null;
        } else {
          updateData['participants'] = newParticipants;
        }
        await update(ref(db, `splitBills/${bill.id}`), updateData);
        toast.success('ลบผู้ร่วมบิลสำเร็จ');
      } else {
        toast.error('ไม่พบผู้ร่วมบิลนี้');
      }
    } catch (error: any) {
      toast.error('เกิดข้อผิดพลาดในการลบผู้ร่วมบิล: ' + (error?.message || ''));
    }
  };

  const handleAddCustomParticipant = async (name: string) => {
    if (!isOwner) return;
    try {
      const customId = `custom_${Date.now()}`;
      const newParticipants = {
        ...bill.participants,
        [customId]: {
          characterId: customId,
          name,
          level: 0,
          class: '',
          discordName: '',
        },
      };
      await update(ref(db, `splitBills/${bill.id}`), {
        participants: newParticipants,
      });
      toast.success('เพิ่มผู้ร่วมบิลสำเร็จ');
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มผู้ร่วมบิล');
    }
  };

  const handleTogglePaid = async (characterId: string, paid: boolean) => {
    if (!isOwner) return;
    try {
      const newParticipants = { ...(bill.participants || {}) };
      if (newParticipants[characterId]) {
        newParticipants[characterId].paid = paid;
        await update(ref(db, `splitBills/${bill.id}`), {
          participants: newParticipants,
        });
        toast.success('อัปเดตสถานะเทรดเงินแล้ว');
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const handleDeleteClick = () => setShowDeleteConfirm(true);
  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    await handleDelete();
  };
  const handleDeleteCancel = () => setShowDeleteConfirm(false);

  const handleAddItem = async () => {
    if (!isOwner || !newItemName.trim()) return;
    try {
      const newItemId = `item_${Date.now()}`;
      const newItems = [...editItems, { id: newItemId, name: newItemName.trim(), price: 0 }];
      setEditItems(newItems);
      
      // Update Firebase immediately
      const itemsObj = newItems.reduce((acc, item) => {
        acc[item.id] = { name: item.name, price: Number(item.price) || 0 };
        return acc;
      }, {} as Record<string, { name: string; price: number }>);
      
      await update(ref(db, `splitBills/${bill.id}`), {
        items: itemsObj
      });
      
      setNewItemName('');
      setShowAddItemInput(false);
      toast.success('เพิ่มไอเทมสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มไอเทม');
    }
  };

  const handleEditItemName = async (itemId: string, newName: string) => {
    if (!isOwner || !newName.trim()) return;
    try {
      const newItems = editItems.map(item => 
        item.id === itemId ? { ...item, name: newName.trim() } : item
      );
      setEditItems(newItems);
      
      // Update Firebase immediately
      const itemsObj = newItems.reduce((acc, item) => {
        acc[item.id] = { name: item.name, price: Number(item.price) || 0 };
        return acc;
      }, {} as Record<string, { name: string; price: number }>);
      
      await update(ref(db, `splitBills/${bill.id}`), {
        items: itemsObj
      });
      
      setEditingItemId(null);
      setEditingItemName('');
      toast.success('แก้ไขชื่อไอเทมสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการแก้ไขชื่อไอเทม');
    }
  };

  return (
    <div className="max-w-md w-full mx-auto rounded-3xl border border-emerald-100 bg-white/80 p-6 shadow-xl hover:shadow-2xl transition-all sm:max-w-md sm:p-6 px-2 py-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-white via-blue-50 to-emerald-50 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <GiftIcon className="w-7 h-7 text-yellow-300 drop-shadow" />
          <div className="max-w-[180px] md:max-w-[260px] overflow-hidden relative" title={bill.title}>
            <div
              className="inline-block whitespace-nowrap"
              style={{
                animation: bill.title.length > 18 ? 'billcard-marquee 14s linear infinite' : undefined,
                minWidth: bill.title.length > 18 ? '120%' : '100%',
              }}
            >
              <h3 className="text-xl md:text-2xl font-bold text-emerald-600 flex items-center gap-2">
                {bill.title}
                <BanknotesIcon className="w-5 h-5 text-emerald-200 flex-shrink-0" />
              </h3>
            </div>
          </div>
        </div>
        {isOwner && (
          <button onClick={handleDeleteClick} className="text-red-400 hover:text-red-600 transition p-2 rounded-full hover:bg-red-50">
            <TrashIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ตารางไอเทม */}
      <table className="w-full text-sm mb-4 border-collapse rounded-2xl overflow-hidden shadow-sm">
        <thead>
          <tr className="text-left text-emerald-600 bg-gradient-to-r from-white via-emerald-50 to-blue-50">
            <th className="py-2 rounded-tl-2xl">
              <div className="flex items-center gap-1">
                <CubeIcon className="w-4 h-4 text-yellow-300" /> ชื่อไอเทม
                {isOwner && (
                  <button
                    onClick={() => setShowAddItemInput(true)}
                    className="ml-1 p-1 rounded-full hover:bg-emerald-100 transition-colors"
                    title="เพิ่มไอเทมใหม่"
                  >
                    <PlusIcon className="w-4 h-4 text-emerald-500" />
                  </button>
                )}
              </div>
            </th>
            <th className="py-2 w-32 rounded-tr-2xl">
              <span className="flex items-center gap-1"><BanknotesIcon className="w-4 h-4 text-yellow-300" /> ราคา (Gold)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {showAddItemInput && isOwner && (
            <tr className="bg-emerald-50/50 border-b border-emerald-50">
              <td className="py-1 px-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddItem();
                      } else if (e.key === 'Escape') {
                        setShowAddItemInput(false);
                        setNewItemName('');
                      }
                    }}
                    placeholder="ชื่อไอเทมใหม่"
                    className="flex-1 rounded-full border border-emerald-200 px-3 py-1 text-sm focus:ring-2 focus:ring-emerald-200 transition bg-white text-emerald-700 placeholder-emerald-300"
                    autoFocus
                  />
                  <button
                    onClick={handleAddItem}
                    disabled={!newItemName.trim()}
                    className="p-1 rounded-full bg-emerald-100 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                  </button>
                  <button
                    onClick={() => {
                      setShowAddItemInput(false);
                      setNewItemName('');
                    }}
                    className="p-1 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </td>
              <td className="py-1 px-2 text-center">
                <span className="text-emerald-400">0</span>
              </td>
            </tr>
          )}
          {items.map((item, idx) => (
            <tr
              key={item.id}
              className={`bg-white/90 ${idx !== items.length - 1 ? 'border-b border-emerald-50' : ''}`}
            >
              <td className="py-1 px-2">
                {editingItemId === item.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingItemName}
                      onChange={(e) => setEditingItemName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleEditItemName(item.id, editingItemName);
                        } else if (e.key === 'Escape') {
                          setEditingItemId(null);
                          setEditingItemName('');
                        }
                      }}
                      placeholder="ชื่อไอเทม"
                      className="flex-1 rounded-full border border-emerald-200 px-3 py-1 text-sm focus:ring-2 focus:ring-emerald-200 transition bg-white text-emerald-700 placeholder-emerald-300"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEditItemName(item.id, editingItemName)}
                      disabled={!editingItemName.trim()}
                      className="p-1 rounded-full bg-emerald-100 hover:bg-emerald-200 transition-colors disabled:opacity-50"
                    >
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingItemId(null);
                        setEditingItemName('');
                      }}
                      className="p-1 rounded-full bg-red-100 hover:bg-red-200 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <button
                        onClick={() => {
                          setEditingItemId(item.id);
                          setEditingItemName(item.name);
                        }}
                        className="p-1 rounded-full hover:bg-emerald-50 transition-colors"
                        title="แก้ไขชื่อไอเทม"
                      >
                        <PencilIcon className="w-4 h-4 text-emerald-500" />
                      </button>
                    )}
                    <span className="flex-1">{item.name}</span>
                  </div>
                )}
              </td>
              <td className="py-1 px-2 text-center">
                {isOwner ? (
                  <input
                    type="number"
                    min="0"
                    value={focusedInput === idx && (item.price === 0 || item.price === undefined) ? "" : item.price ?? 0}
                    onFocus={() => setFocusedInput(idx)}
                    onBlur={e => {
                      setFocusedInput(null);
                      if (e.target.value === "" || isNaN(Number(e.target.value))) {
                        handleItemPriceChange(idx, "0");
                      }
                    }}
                    onChange={e => handleItemPriceChange(idx, e.target.value)}
                    className="w-24 rounded-full border border-yellow-200 px-2 py-1 text-center focus:ring-2 focus:ring-yellow-200 transition bg-yellow-50 text-yellow-700 font-bold text-base placeholder-yellow-300 shadow-sm"
                  />
                ) : (
                  <span>{formatGold(item.price ?? 0)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* input+ปุ่มบันทึกราคาค่าบริการ เฉพาะเจ้าของบิล */}
      {isOwner && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-emerald-600">ค่าบริการ:</span>
          <input
            type="number"
            min="0"
            value={focusedServiceFee && (editServiceFee === 0 || editServiceFee === undefined) ? "" : editServiceFee}
            onFocus={() => setFocusedServiceFee(true)}
            onBlur={e => {
              setFocusedServiceFee(false);
              if (e.target.value === "" || isNaN(Number(e.target.value))) {
                handleServiceFeeChange("0");
              }
            }}
            onChange={e => handleServiceFeeChange(e.target.value)}
            className="w-24 rounded-full border border-yellow-200 px-2 py-1 text-center focus:ring-2 focus:ring-yellow-200 transition bg-yellow-50 text-yellow-700 font-bold text-base placeholder-yellow-300 shadow-sm"
          />
          <span className="text-sm text-emerald-300 ml-1">Gold</span>
          <div className="flex-1" />
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-emerald-500 border border-emerald-600 px-3 py-1.5 text-sm text-white font-medium shadow-sm hover:bg-emerald-600 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-200 flex items-center gap-1 w-full max-w-[140px] mx-auto sm:w-auto sm:max-w-none"
          >
            <CheckCircleIcon className="w-4 h-4 text-white" />
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      )}

      {/* กล่องสรุป */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/80 shadow flex flex-col items-center py-2 px-1 min-w-[80px] border border-emerald-50">
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 mb-0.5"><Cog6ToothIcon className="w-4 h-4 text-yellow-300" /> ค่าบริการ</span>
          <span className="text-xl font-bold text-emerald-600">{formatGold(editServiceFee)}</span>
          <span className="text-[11px] text-emerald-200 mt-0.5">Gold</span>
        </div>
        <div className="rounded-xl bg-white/80 shadow flex flex-col items-center py-2 px-1 min-w-[80px] border border-emerald-50">
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 mb-0.5"><UserGroupIcon className="w-4 h-4 text-yellow-300" /> เงินต่อคน</span>
          <span className="text-xl font-extrabold text-yellow-400 drop-shadow">{formatGold(splitAmount)}</span>
          <span className="text-[11px] text-emerald-200 mt-0.5">Gold</span>
        </div>
        <div className="rounded-xl bg-white/80 shadow flex flex-col items-center py-2 px-1 min-w-[80px] border border-emerald-50">
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 mb-0.5"><BanknotesIcon className="w-4 h-4 text-yellow-300" /> ราคารวม</span>
          <span className="text-xl font-bold text-emerald-600">{formatGold(totalPrice)}</span>
          <span className="text-[11px] text-emerald-200 mt-0.5">Gold</span>
        </div>
      </div>

      {/* รายชื่อผู้ร่วมบิล */}
      <div className="mb-2">
        {isOwner && (
          <>
            <label className="block text-sm font-medium text-emerald-600 mb-1">ค้นหาตัวละครเพื่อเพิ่มผู้ร่วมบิล</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                placeholder="ค้นหาชื่อตัวละคร"
                className="flex-1 rounded-full border border-gray-200 px-4 py-2 focus:ring-2 focus:ring-gray-200 transition shadow-sm bg-gray-50 text-gray-500 placeholder-gray-400"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="rounded-full bg-gradient-to-r from-emerald-50 to-blue-50 text-emerald-700 font-bold px-5 py-2 shadow hover:shadow-md hover:bg-gradient-to-r hover:from-emerald-100 hover:to-blue-100 transition disabled:opacity-50 flex items-center gap-2 border border-emerald-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" /></svg>
                {isSearching ? 'ค้นหา...' : 'ค้นหา'}
              </button>
            </div>
            {/* แสดงผลลัพธ์ */}
            {searchResults.length > 0 && (
              <div className="mt-2 bg-gradient-to-r from-emerald-50 via-blue-50 to-emerald-100 rounded-2xl p-2 shadow animate-fadeIn border border-emerald-100">
                {searchResults.map(char => (
                  <div key={char.id} className="flex items-center justify-between py-1 px-3 hover:bg-emerald-50 rounded-xl transition">
                    <span className="font-medium text-emerald-700 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-emerald-400" />
                      {char.name}
                    </span>
                    <button
                      onClick={() => handleAddParticipant(char)}
                      className="ml-2 p-2 rounded-full bg-blue-100 border border-blue-200 hover:bg-blue-200 transition shadow-sm flex items-center justify-center"
                      title="เพิ่มผู้ร่วมบิล"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {/* ปุ่มเพิ่มชื่อที่ค้นหา */}
            {searchQuery && searchResults.length === 0 && !isSearching && (
              <button
                onClick={() => handleAddCustomParticipant(searchQuery)}
                className="mt-2 px-3 py-1 rounded-full bg-blue-100 text-emerald-700 font-bold hover:bg-blue-200 transition shadow border border-emerald-100"
              >
                เพิ่ม "{searchQuery}" เป็นผู้ร่วมบิล
              </button>
            )}
          </>
        )}
        <div className="flex flex-col gap-2 mt-4">
          {sortedParticipants.map((participant) => {
            const isOwnerCharacter = bill.ownerCharacterId && participant.characterId === bill.ownerCharacterId;
            const isTraded = participant.paid || false;
            return (
              <div key={participant.characterId} className="flex items-center">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium shadow w-full ${
                  isOwnerCharacter 
                    ? 'bg-orange-100 text-orange-800' 
                    : isTraded 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isOwner && !isOwnerCharacter && (
                    <button
                      onClick={() => handleTogglePaid(participant.characterId, !isTraded)}
                      className={`p-1 rounded-full transition ${isTraded ? 'bg-green-200 hover:bg-green-300' : 'bg-yellow-200 hover:bg-yellow-300'}`}
                    >
                      <svg className={`w-4 h-4 ${isTraded ? 'text-green-600' : 'text-yellow-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                  <UserIcon className={`w-4 h-4 mx-1 ${
                    isOwnerCharacter 
                      ? 'text-orange-500' 
                      : isTraded 
                        ? 'text-green-500' 
                        : 'text-yellow-500'
                  }`} />
                  <div className="flex items-center gap-1">
                    {participant.discordName ? (
                      <>
                        <span className="font-medium">{participant.discordName}</span>
                        <span className="opacity-50">[{participant.name}]</span>
                      </>
                    ) : (
                      <span>{participant.name}</span>
                    )}
                  </div>
                  {isOwnerCharacter && <span className="ml-2 text-xs text-orange-700 font-semibold">เจ้าของบิล</span>}
                  {isTraded && !isOwnerCharacter && <span className="ml-2 text-xs text-green-700 font-semibold">เทรดแล้ว</span>}
                  {isOwner && !isOwnerCharacter && (
                    <button
                      onClick={() => handleRemoveParticipant(participant.characterId)}
                      className="ml-auto text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* เวลาคงเหลือ */}
      <div className="text-sm text-emerald-400 flex items-center gap-2 mt-2">
        <ClockIcon className="w-4 h-4 text-yellow-300" />
        <span className="inline-block bg-gradient-to-r from-white via-blue-50 to-emerald-50 rounded px-2 py-1 border border-emerald-50">
          เหลือเวลา: {days} วัน {hours} ชั่วโมง {minutes} นาที
        </span>
        {isExpiring && <span className="inline-block bg-red-100 text-red-600 rounded px-2 py-1 ml-2 animate-pulse">ใกล้หมดอายุ</span>}
      </div>

      {/* Modal ยืนยันการลบบิล */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-gradient-to-br from-white via-blue-50 to-emerald-50 rounded-2xl p-6 shadow-lg max-w-xs w-full border border-emerald-50">
            <h3 className="text-lg font-bold mb-4 text-red-600">ยืนยันการลบบิล</h3>
            <p className="mb-6 text-emerald-600">คุณต้องการลบบิลนี้จริงหรือไม่? ข้อมูลจะไม่สามารถกู้คืนได้</p>
            <div className="flex justify-end gap-2">
              <button onClick={handleDeleteCancel} className="px-4 py-2 rounded-full border border-emerald-100 text-emerald-600 hover:bg-emerald-50 font-semibold transition">ยกเลิก</button>
              <button onClick={handleDeleteConfirm} className="px-4 py-2 rounded-full bg-red-400 text-white hover:bg-red-500 font-semibold transition">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 