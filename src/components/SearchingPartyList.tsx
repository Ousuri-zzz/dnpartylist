'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacters } from '../hooks/useCharacters';
import { useUsers } from '../hooks/useUsers';
import { Character } from '../types/character';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCompactNumber } from '@/lib/utils';
import { getClassColor } from '@/config/theme';
import { PlusCircle, Trash2, Edit2, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ref, onValue, set, remove, get } from 'firebase/database';
import { db } from '../lib/firebase';

interface SearchingPartyListProps {
  searchQuery: string;
}

interface SearchingCharacter {
  characterId: string;
  characterName: string;
  characterClass: string;
  message: string;
  nests: string | string[];
  stats: {
    atk: number;
    hp: number;
    pdef: number;
    mdef: number;
    cri: number;
    ele: number;
    fd: number;
  };
  updatedAt: string;
  userId: string;
}

interface CharacterCardProps {
  char: SearchingCharacter;
}

const CharacterCard = ({ char }: CharacterCardProps) => {
  const colors = getClassColor(char.characterClass);
  const nests: string[] = Array.isArray(char.nests) ? char.nests : (char.nests ? char.nests.split(',') : []);
  return (
    <div className="p-1">
      {/* ไอคอน + ชื่อ + อาชีพ + stat + ข้อความ */}
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <div className={cn(
          'w-10 h-10 flex items-center justify-center',
          colors.border
        )}>
          <span className="text-xl">{colors.icon}</span>
        </div>
        <div>
          <h4 className={cn('text-lg font-bold', colors.text)}>{char.characterName}</h4>
          <p className={cn('text-sm font-medium', colors.text)}>{char.characterClass}</p>
        </div>
        <div className="flex flex-col divide-y divide-violet-100">
          <div className="flex flex-wrap gap-1 ml-4 text-xs items-center">
            <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded">⚔️ ATK: <span className="font-bold">{char.stats.atk}</span></span>
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">❤️ HP: <span className="font-bold">{char.stats.hp}</span></span>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">🛡️ P.DEF: <span className="font-bold">{char.stats.pdef}%</span></span>
            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">🛡️ M.DEF: <span className="font-bold">{char.stats.mdef}%</span></span>
            <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">💥 CRI: <span className="font-bold">{char.stats.cri}%</span></span>
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">✨ ELE: <span className="font-bold">{char.stats.ele}%</span></span>
            <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">💥 FD: <span className="font-bold">{char.stats.fd}%</span></span>
            {char.message && (
              <span className="ml-2 border border-violet-200 bg-white/80 rounded px-2 py-0.5 text-gray-700">
                {char.message}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export function SearchingPartyList({ searchQuery }: SearchingPartyListProps) {
  const { user } = useAuth();
  const { characters: userCharacters } = useCharacters();
  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [manageCharId, setManageCharId] = useState<string>('');
  const [manageMessage, setManageMessage] = useState('');
  const [manageNests, setManageNests] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [selectedNests, setSelectedNests] = useState<string[]>([]);
  const [searchingCharacters, setSearchingCharacters] = useState<SearchingCharacter[]>([]);

  useEffect(() => {
    if (!user) return;
    const searchingPartiesRef = ref(db, 'searchingParties');
    const unsubscribe = onValue(searchingPartiesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const characters = Object.entries(data).map(([id, charData]: [string, any]) => ({
          ...charData,
          characterId: id
        }));
        setSearchingCharacters(characters);
      } else {
        setSearchingCharacters([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // กรองเฉพาะตัวละครของ user ที่อยู่ใน searching
  const mySearchingCharacters = useMemo(() => {
    if (!user || !userCharacters) return [];
    return searchingCharacters.filter(char => char.userId === user.uid);
  }, [user, userCharacters, searchingCharacters]);

  // ฟังก์ชันสำหรับกรองตัวละครที่ยังไม่ได้อยู่ในรายการที่กำลังหาปาร์ตี้ (ใช้ใน modal เพิ่มตัวละคร)
  const availableCharacters = useMemo(() => {
    if (!userCharacters) return {};
    return Object.entries(userCharacters).reduce((acc, [id, char]) => {
      const isAlreadySearching = searchingCharacters.some(sc => sc.characterId === id);
      if (!isAlreadySearching) {
        acc[id] = char as Character;
      }
      return acc;
    }, {} as Record<string, Character>);
  }, [userCharacters, searchingCharacters]);

  // ฟังก์ชันสำหรับเปิด modal จัดการ
  const openManageModal = () => {
    setIsManageOpen(true);
    // default เลือกตัวแรก
    if (mySearchingCharacters.length > 0) {
      const char = mySearchingCharacters[0];
      setManageCharId(char.characterId);
      setManageMessage(char.message);
      setManageNests(typeof char.nests === 'string' ? char.nests.split(',') : char.nests);
    }
  };

  // เมื่อเลือกตัวละครใน modal จัดการ
  const handleManageCharChange = (id: string) => {
    setManageCharId(id);
    const char = mySearchingCharacters.find(c => c.characterId === id);
    if (char) {
      setManageMessage(char.message);
      setManageNests(typeof char.nests === 'string' ? char.nests.split(',') : char.nests);
    }
  };

  // ฟังก์ชันสำหรับบันทึกการแก้ไขใน modal จัดการ
  const handleManageSave = async () => {
    try {
      await set(ref(db, `searchingParties/${manageCharId}/message`), manageMessage);
      await set(ref(db, `searchingParties/${manageCharId}/nests`), manageNests.join(','));
      await set(ref(db, `searchingParties/${manageCharId}/updatedAt`), new Date().toISOString());
      toast.success('บันทึกสำเร็จ');
      setIsManageOpen(false);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // ฟังก์ชันสำหรับลบตัวละครใน modal จัดการ
  const handleManageDelete = async () => {
    try {
      await remove(ref(db, `searchingParties/${manageCharId}`));
      toast.success('ลบตัวละครสำเร็จ');
      setIsManageOpen(false);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบ');
    }
  };

  // ฟังก์ชันสำหรับเพิ่มตัวละครใหม่
  const handleAddCharacter = async () => {
    if (!selectedCharacter || !user) return;

    try {
      const newCharacter: SearchingCharacter = {
        characterId: selectedCharacter.id,
        characterName: selectedCharacter.name,
        characterClass: selectedCharacter.class,
        message: message,
        nests: selectedNests.join(','),
        stats: {
          atk: selectedCharacter.stats?.atk || 0,
          hp: selectedCharacter.stats?.hp || 0,
          pdef: selectedCharacter.stats?.pdef || 0,
          mdef: selectedCharacter.stats?.mdef || 0,
          cri: selectedCharacter.stats?.cri || 0,
          ele: selectedCharacter.stats?.ele || 0,
          fd: selectedCharacter.stats?.fd || 0,
        },
        updatedAt: new Date().toISOString(),
        userId: user.uid,
      };

      console.log('Adding character:', newCharacter);

      // บันทึกลง Firebase
      await set(ref(db, `searchingParties/${selectedCharacter.id}`), newCharacter);
      
      setIsModalOpen(false);
      setSelectedCharacter(null);
      setMessage('');
      setSelectedNests([]);
      toast.success('เพิ่มตัวละครสำเร็จ');
    } catch (error) {
      console.error('Error adding character:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มตัวละคร');
    }
  };

  // ฟังก์ชันสำหรับลบตัวละคร
  const handleRemoveCharacter = async (characterId: string) => {
    try {
      await remove(ref(db, `searchingParties/${characterId}`));
      toast.success('ลบตัวละครสำเร็จ');
    } catch (error) {
      console.error('Error removing character:', error);
      toast.error('เกิดข้อผิดพลาดในการลบตัวละคร');
    }
  };

  // ฟังก์ชันสำหรับแก้ไขข้อความ
  const handleEditMessage = async (characterId: string, newMessage: string) => {
    try {
      await set(ref(db, `searchingParties/${characterId}/message`), newMessage);
      await set(ref(db, `searchingParties/${characterId}/updatedAt`), new Date().toISOString());
    } catch (error) {
      console.error('Error updating message:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขข้อความ');
    }
  };

  // ฟังก์ชันสำหรับแก้ไขดันเจี้ยน
  const handleEditNests = async (characterId: string, newNests: string[]) => {
    try {
      await set(ref(db, `searchingParties/${characterId}/nests`), newNests.join(','));
      await set(ref(db, `searchingParties/${characterId}/updatedAt`), new Date().toISOString());
    } catch (error) {
      console.error('Error updating nests:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขดันเจี้ยน');
    }
  };

  // กรองตัวละครตาม searchQuery
  const filteredCharacters = searchingCharacters.filter(char => {
    const query = searchQuery.toLowerCase();
    const nests = typeof char.nests === 'string' ? char.nests.split(',') : char.nests;
    // ถ้ามี searchQuery ให้ filter เฉพาะตัวละครที่มีดันเจี้ยนตรงกับ query
    if (query) {
      return (
        char.characterName.toLowerCase().includes(query) ||
        char.characterClass.toLowerCase().includes(query) ||
        nests.some((nest: string) => nest.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // จัดกลุ่มตัวละครตามดันเจี้ยน (fix: ถ้ามี searchQuery ให้แสดงเฉพาะในกล่องดันเจี้ยนที่ตรงกับ query)
  const groupedByNest = filteredCharacters.reduce((acc: Record<string, SearchingCharacter[]>, char) => {
    const query = searchQuery.toLowerCase();
    const nests = typeof char.nests === 'string' ? char.nests.split(',') : char.nests;
    nests.forEach((nest: string) => {
      // ถ้ามี searchQuery ให้แสดงเฉพาะในกล่องที่ตรงกับ query
      if (!query || nest.toLowerCase().includes(query)) {
        if (!acc[nest]) {
          acc[nest] = [];
        }
        acc[nest].push(char);
      }
    });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* ปุ่มเพิ่มตัวละคร + จัดการ */}
      <div className="flex justify-end gap-2">
        <Button 
          className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
          onClick={() => setIsModalOpen(true)}
          disabled={Object.keys(availableCharacters).length === 0}
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          เพิ่มตัวละคร
        </Button>
        <Button
          variant="outline"
          onClick={openManageModal}
          disabled={mySearchingCharacters.length === 0}
        >
          จัดการตัวละคร
        </Button>
      </div>

      {/* Modal เพิ่มตัวละคร */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-2xl shadow-2xl bg-white/90 p-8 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-violet-700 mb-2">เพิ่มตัวละครที่กำลังหาปาร์ตี้</DialogTitle>
            <p className="text-gray-500 mb-4">เลือกตัวละครและกรอกข้อมูลที่ต้องการ</p>
          </DialogHeader>
          <div className="space-y-6">
            {/* เลือกตัวละคร */}
            <div>
              <label className="block text-sm font-medium mb-1">เลือกตัวละคร</label>
              <Select
                value={selectedCharacter?.id || ''}
                onValueChange={(value) => {
                  const char = availableCharacters[value];
                  if (char) setSelectedCharacter(char);
                }}
              >
                <SelectTrigger>
                  <SelectValue>
                    {selectedCharacter ? `${selectedCharacter.name} (${selectedCharacter.class})` : 'เลือกตัวละคร'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(availableCharacters).map(([id, char]) => (
                    <SelectItem key={id} value={id}>
                      {(char as Character).name} ({(char as Character).class})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {Object.keys(availableCharacters).length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  ไม่มีตัวละครที่สามารถเพิ่มได้ (ตัวละครทั้งหมดถูกเพิ่มในรายการที่กำลังหาปาร์ตี้แล้ว)
                </p>
              )}
            </div>
            {/* ข้อความ */}
            <div>
              <label className="block text-sm font-medium mb-1">ข้อความ</label>
              <div className="relative">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="พิมพ์ข้อความที่ต้องการแจ้ง..."
                  maxLength={70}
                  className="pl-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <MessageCircle className="w-4 h-4" />
                </span>
              </div>
            </div>
            {/* เลือกดันเจี้ยน */}
            <div>
              <label className="block text-sm font-medium mb-1">เลือกดันเจี้ยน</label>
              <Select
                value={Array.isArray(selectedNests) ? selectedNests[0] : ''}
                onValueChange={(value) => {
                  if (!selectedNests.includes(value as string)) {
                    setSelectedNests([...selectedNests, value as string]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกดันเจี้ยน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DQ+FTG700">DQ+FTG700</SelectItem>
                  <SelectItem value="Minotaur">Minotaur</SelectItem>
                  <SelectItem value="Cerberus">Cerberus</SelectItem>
                  <SelectItem value="Cerberus Hell">Cerberus Hell</SelectItem>
                  <SelectItem value="Cerberus Challenge">Cerberus Challenge</SelectItem>
                  <SelectItem value="Manticore">Manticore</SelectItem>
                  <SelectItem value="Manticore Hell">Manticore Hell</SelectItem>
                  <SelectItem value="Apocalypse">Apocalypse</SelectItem>
                  <SelectItem value="Apocalypse Hell">Apocalypse Hell</SelectItem>
                  <SelectItem value="Sea Dragon">Sea Dragon</SelectItem>
                  <SelectItem value="Chaos Rift: Bairra">Chaos Rift: Bairra</SelectItem>
                  <SelectItem value="Chaos Rift: Kamala">Chaos Rift: Kamala</SelectItem>
                  <SelectItem value="Dark Banquet Hall">Dark Banquet Hall</SelectItem>
                  <SelectItem value="Jealous Albeuteur">Jealous Albeuteur</SelectItem>
                  <SelectItem value="Theme Park">Theme Park</SelectItem>
                </SelectContent>
              </Select>
              {selectedNests.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedNests.map((nest) => (
                    <div
                      key={nest}
                      className="flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded-md text-sm"
                    >
                      <span>{nest}</span>
                      <button
                        onClick={() => setSelectedNests(selectedNests.filter(n => n !== nest))}
                        className="text-violet-500 hover:text-violet-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* ปุ่มบันทึก */}
            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleAddCharacter}
                disabled={!selectedCharacter || selectedNests.length === 0}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md hover:from-pink-600 hover:to-purple-600 transition"
              >
                เพิ่มตัวละคร
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal จัดการตัวละคร */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogContent className="rounded-2xl shadow-2xl bg-white/90 p-8 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-violet-700 mb-2">จัดการตัวละครที่กำลังหาปาร์ตี้</DialogTitle>
            <p className="text-gray-500 mb-4">เลือกและแก้ไขข้อมูลตัวละครของคุณ</p>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">เลือกตัวละคร</label>
              <Select
                value={manageCharId}
                onValueChange={handleManageCharChange}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(() => {
                      const char = mySearchingCharacters.find(c => c.characterId === manageCharId);
                      return char ? `${char.characterName} (${char.characterClass})` : 'เลือกตัวละคร';
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {mySearchingCharacters.map(char => (
                    <SelectItem key={char.characterId} value={char.characterId}>
                      {char.characterName} ({char.characterClass})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <hr className="my-4 border-gray-200" />
            <div>
              <label className="block text-sm font-medium mb-1">ข้อความ</label>
              <div className="relative">
                <Input
                  value={manageMessage}
                  onChange={e => setManageMessage(e.target.value)}
                  placeholder="พิมพ์ข้อความที่ต้องการแจ้ง..."
                  maxLength={70}
                  className="pl-10"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <MessageCircle className="w-4 h-4" />
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">เลือกดันเจี้ยน</label>
              <Select
                value={Array.isArray(manageNests) ? manageNests[0] : ''}
                onValueChange={value => {
                  if (!manageNests.includes(value as string)) {
                    setManageNests([...manageNests, value as string]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกดันเจี้ยน" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DQ+FTG700">DQ+FTG700</SelectItem>
                  <SelectItem value="Minotaur">Minotaur</SelectItem>
                  <SelectItem value="Cerberus">Cerberus</SelectItem>
                  <SelectItem value="Cerberus Hell">Cerberus Hell</SelectItem>
                  <SelectItem value="Cerberus Challenge">Cerberus Challenge</SelectItem>
                  <SelectItem value="Manticore">Manticore</SelectItem>
                  <SelectItem value="Manticore Hell">Manticore Hell</SelectItem>
                  <SelectItem value="Apocalypse">Apocalypse</SelectItem>
                  <SelectItem value="Apocalypse Hell">Apocalypse Hell</SelectItem>
                  <SelectItem value="Sea Dragon">Sea Dragon</SelectItem>
                  <SelectItem value="Chaos Rift: Bairra">Chaos Rift: Bairra</SelectItem>
                  <SelectItem value="Chaos Rift: Kamala">Chaos Rift: Kamala</SelectItem>
                  <SelectItem value="Dark Banquet Hall">Dark Banquet Hall</SelectItem>
                  <SelectItem value="Jealous Albeuteur">Jealous Albeuteur</SelectItem>
                  <SelectItem value="Theme Park">Theme Park</SelectItem>
                </SelectContent>
              </Select>
              {manageNests.length > 0 && (
                <div className="flex flex-col gap-0">
                  {manageNests.map(nest => (
                    <div
                      key={nest}
                      className="flex items-center gap-1 px-2 py-1 bg-violet-100 text-violet-700 rounded-md text-sm"
                    >
                      <span>{nest}</span>
                      <button
                        onClick={() => setManageNests(manageNests.filter(n => n !== nest))}
                        className="text-violet-500 hover:text-violet-700"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-6 justify-end">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleManageDelete}
              >
                ลบตัวละคร
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-md hover:from-pink-600 hover:to-purple-600 transition"
                onClick={handleManageSave}
              >
                บันทึก
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* แสดงผลตามดันเจี้ยน */}
      {Object.entries(groupedByNest).map(([nest, characters]) => (
        <div
          key={nest}
          className="mb-6 rounded-2xl border-2 border-violet-300 bg-white/80 shadow-sm px-0 pt-0 pb-4"
        >
          <div className="px-6 pt-4 pb-2">
            <h3 className="inline-block bg-violet-50 px-4 py-1 rounded-lg font-semibold text-gray-800 mb-2 shadow-sm">
              {nest}
            </h3>
          </div>
          <div className="flex flex-col gap-0">
            {characters.map((char) => (
              <CharacterCard key={char.characterId} char={char} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
} 