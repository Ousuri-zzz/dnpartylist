'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCharacters } from '../hooks/useCharacters';
import { useUsers } from '../hooks/useUsers';
import { useGuild } from '../hooks/useGuild';
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
  const { users } = useUsers();
  const { isGuildLeader } = useGuild();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const discordName = users[char.userId]?.meta?.discord || 'Unknown';
  const lastUpdate = new Date(char.updatedAt).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleRemoveCharacter = async () => {
    try {
      await remove(ref(db, `searchingParties/${char.characterId}`));
      toast.success('ลบตัวละครสำเร็จ');
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error removing character:', error);
      toast.error('เกิดข้อผิดพลาดในการลบตัวละคร');
    }
  };

  return (
    <>
      {/* มือถือ: กล่องขาว มุมโค้ง เงา padding */}
      <div className="block sm:hidden">
        <div className="p-3 bg-white/90 rounded-xl shadow-lg max-w-full">
          <div className="flex items-start gap-3 mb-2">
            <div className={cn('w-12 h-12 flex items-center justify-center', colors.border)}>
              <span className="text-2xl">{colors.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={cn('text-base font-bold', colors.text)}>{discordName}</h4>
              <p className={cn('text-sm font-medium', colors.text)}>{char.characterName} - {char.characterClass}</p>
              <p className="text-xs text-gray-500">อัพเดทล่าสุด: {lastUpdate}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm items-center w-full mb-2">
            <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded font-medium">⚔️ ATK: <span className="font-bold">{char.stats.atk}</span></span>
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded font-medium">❤️ HP: <span className="font-bold">{char.stats.hp}</span></span>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-medium">🛡️ P.DEF: <span className="font-bold">{char.stats.pdef}%</span></span>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded font-medium">🛡️ M.DEF: <span className="font-bold">{char.stats.mdef}%</span></span>
            <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded font-medium">💥 CRI: <span className="font-bold">{char.stats.cri}%</span></span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded font-medium">✨ ELE: <span className="font-bold">{char.stats.ele}%</span></span>
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded font-medium">💥 FD: <span className="font-bold">{char.stats.fd}%</span></span>
          </div>
          {char.message && (
            <div className="w-full mb-2">
              <div className="relative bg-white border border-violet-200 rounded-2xl px-4 py-3 text-base text-gray-800 shadow-md flex items-center gap-2">
                <span className="text-violet-400">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M7 8h10M7 12h6m-6 4h8M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 0 1-4-.8L3 20l.8-3.2A7.96 7.96 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                <span className="whitespace-pre-line break-words">{char.message}</span>
              </div>
            </div>
          )}
          {isGuildLeader && (
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-auto"
              title="ลบตัวละครออกจากรายการที่กำลังหาปาร์ตี้"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      {/* PC: flex-row ไม่มี bg ไม่มี shadow ไม่มี rounded ไม่มี padding */}
      <div className="hidden sm:flex items-center gap-3 mb-1 w-full">
        <div className={cn('w-10 h-10 flex items-center justify-center', colors.border)}>
          <span className="text-xl">{colors.icon}</span>
        </div>
        <div>
          <h4 className={cn('text-lg font-bold', colors.text)}>{discordName}</h4>
          <p className={cn('text-sm font-medium', colors.text)}>{char.characterName} - {char.characterClass}</p>
          <p className="text-xs text-gray-500">อัพเดทล่าสุด: {lastUpdate}</p>
        </div>
        <div className="flex flex-wrap gap-1 ml-4 text-xs items-center">
          <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded">⚔️ ATK: <span className="font-bold">{char.stats.atk}</span></span>
          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">❤️ HP: <span className="font-bold">{char.stats.hp}</span></span>
          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">🛡️ P.DEF: <span className="font-bold">{char.stats.pdef}%</span></span>
          <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">🛡️ M.DEF: <span className="font-bold">{char.stats.mdef}%</span></span>
          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">💥 CRI: <span className="font-bold">{char.stats.cri}%</span></span>
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">✨ ELE: <span className="font-bold">{char.stats.ele}%</span></span>
          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">💥 FD: <span className="font-bold">{char.stats.fd}%</span></span>
        </div>
        {char.message && (
          <div className="ml-4 max-w-xl">
            <div className="relative bg-white/90 border border-violet-200 rounded-2xl px-4 py-2 text-base text-gray-800 shadow flex items-center gap-2">
              <span className="text-violet-400">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M7 8h10M7 12h6m-6 4h8M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 0 1-4-.8L3 20l.8-3.2A7.96 7.96 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <span className="whitespace-pre-line">{char.message}</span>
            </div>
          </div>
        )}
        {isGuildLeader && (
          <button
            onClick={() => setIsDeleteDialogOpen(true)}
            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors ml-auto"
            title="ลบตัวละครออกจากรายการที่กำลังหาปาร์ตี้"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
      {/* Dialog ลบ (ใช้ร่วมกัน) */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
              ยืนยันการลบตัวละคร
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-gray-600 mb-4">
              คุณต้องการลบตัวละคร <span className="font-bold text-violet-700">{char.characterName}</span> ของ <span className="font-bold text-violet-700">{discordName}</span> ออกจากรายการที่กำลังหาปาร์ตี้ใช่หรือไม่?
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveCharacter}
              >
                ลบตัวละคร
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ALL_NESTS = [
  "DQ+FTG700", "Minotaur", "Cerberus", "Cerberus Hell", "Cerberus Challenge",
  "Manticore", "Manticore Hell", "Apocalypse", "Apocalypse Hell", "Sea Dragon",
  "Sea Dragon Classic", "Chaos Rift: Bairra", "Chaos Rift: Kamala", "Dark Banquet Hall",
  "Jealous Albeuteur", "Theme Park"
];

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

  // Group characters by nest and sort by updatedAt
  const groupedByNest = useMemo(() => {
    const grouped: { [key: string]: SearchingCharacter[] } = {};
    
    searchingCharacters.forEach(char => {
      const nests = Array.isArray(char.nests) ? char.nests : (char.nests ? char.nests.split(',') : []);
      nests.forEach(nest => {
        if (!grouped[nest]) {
          grouped[nest] = [];
        }
        grouped[nest].push(char);
      });
    });

    // Sort characters within each nest by updatedAt (newest first)
    Object.keys(grouped).forEach(nest => {
      grouped[nest].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    });

    return grouped;
  }, [searchingCharacters]);

  // Sort nests by number of characters (most first)
  const sortedNests = useMemo(() => {
    return Object.keys(groupedByNest).sort((a, b) => {
      return (groupedByNest[b]?.length || 0) - (groupedByNest[a]?.length || 0);
    });
  }, [groupedByNest]);

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
                  onChange={(e) => {
                    if (e.target.value.length <= 35) setMessage(e.target.value);
                  }}
                  placeholder="พิมพ์ข้อความที่ต้องการแจ้ง..."
                  maxLength={35}
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
                  <SelectItem value="Sea Dragon Classic">Sea Dragon Classic</SelectItem>
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
                  onChange={e => {
                    if (e.target.value.length <= 35) setManageMessage(e.target.value);
                  }}
                  placeholder="พิมพ์ข้อความที่ต้องการแจ้ง..."
                  maxLength={35}
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
                  <SelectItem value="Sea Dragon Classic">Sea Dragon Classic</SelectItem>
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
      {sortedNests.map((nest) => {
        const characters = groupedByNest[nest] || [];
        return (
          <div
            key={nest}
            className="mb-6 rounded-2xl border-2 border-violet-200/60 bg-white/90 backdrop-blur-sm shadow-xl overflow-hidden transition-transform hover:scale-[1.01]"
          >
            <div className="px-6 pt-4 pb-2 flex items-center justify-between">
              <h3 className="inline-block text-xl font-extrabold bg-gradient-to-r from-violet-600 to-blue-500 bg-clip-text text-transparent drop-shadow">
                {nest} <span className="text-violet-600">({characters.length})</span>
              </h3>
            </div>
            <div className="border-t border-violet-100 mx-6 mb-2" />
            <div className="flex flex-col gap-0">
              {characters.map((char) => (
                <CharacterCard key={char.characterId} char={char} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
} 