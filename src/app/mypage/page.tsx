'use client'

import React, { useEffect, useState, MouseEvent } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getDatabase, ref, onValue, push, update, remove, set, get, query, orderByChild, equalTo, off } from 'firebase/database'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Character, CharacterClass, CharacterMainClass, CharacterStats, CharacterChecklist, EditableCharacter, EditableStats, BaseStats, CombatStats, convertToEditableStats, convertToCharacterStats } from '@/types/character'
import { CharacterCard } from '@/components/CharacterCard'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CLASS_TO_MAIN_CLASS } from '@/config/theme'
import { useRouter } from 'next/navigation'
import { checkAndResetChecklist } from '@/lib/checklist'
import { DiscordDropdown } from '@/components/DiscordDropdown'
import { nanoid } from 'nanoid'
import { toast } from 'react-hot-toast'
import { DEFAULT_CHECKLIST } from '@/components/CharacterChecklist'
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { WEEKLY_MAX_VALUES } from '@/constants/checklist';
import { motion } from 'framer-motion';

const CHARACTER_CLASSES: CharacterClass[] = [
  'Swordsman',
  'Mercenary',
  'Bowmaster',
  'Acrobat',
  'Force User',
  'Elemental Lord',
  'Paladin',
  'Saint',
  'Engineer',
  'Alchemist',
];

const CHARACTER_MAIN_CLASSES: CharacterMainClass[] = [
  'Warrior',
  'Archer',
  'Sorceress',
  'Cleric',
  'Academic',
];

const defaultWeeklyChecklist = {
  minotaur: 0,
  cerberus: 0,
  cerberusHell: 0,
  cerberusChallenge: 0,
  manticore: 0,
  manticoreHell: 0,
  apocalypse: 0,
  apocalypseHell: 0,
  seaDragon: 0,
  seaDragonHell: 0,
  seaDragonChallenge: 0,
  themePark: 0,
  themeHell: 0,
  chaosRiftKamala: 0,
  chaosRiftBairra: 0,
  banquetHall: 0,
  jealousAlbeuteur: 0
};

const defaultStats: CharacterStats = {
  str: 0,
  agi: 0,
  int: 0,
  vit: 0,
  spr: 0,
  points: 0,
  atk: 0,
  hp: 0,
  fd: 0,
  cri: 0,
  ele: 0,
  pdef: 0,
  mdef: 0
};

const defaultEditableStats: EditableStats = {
  str: '0',
  agi: '0',
  int: '0',
  vit: '0',
  spr: '0',
  points: '0',
  atk: '0',
  hp: '0',
  fd: '0',
  cri: '0',
  ele: '0',
  pdef: '0',
  mdef: '0'
};

const defaultCharacter: Character = {
  id: '',
  name: '',
  class: 'Swordsman',
  mainClass: 'Warrior',
  level: 1,
  userId: '',
  stats: defaultStats,
  checklist: DEFAULT_CHECKLIST
};

const defaultEditableCharacter: EditableCharacter = {
  id: '',
  name: '',
  class: 'Swordsman',
  mainClass: 'Warrior',
  level: 1,
  userId: '',
  stats: defaultEditableStats,
  checklist: DEFAULT_CHECKLIST
};

const database = getDatabase();

// เพิ่มฟังก์ชันสำหรับตรวจสอบและอัปเดตโครงสร้าง checklist
const migrateCharacterChecklist = async (userId: string, characterId: string, character: any) => {
  try {
    const characterRef = ref(db, `users/${userId}/characters/${characterId}`);
    const updates: any = {};
    let needsUpdate = false;

    // ตรวจสอบและสร้าง daily checklist ถ้าไม่มี
    if (!character.checklist?.daily) {
      updates.checklist = {
        ...character.checklist,
        daily: {
          dailyQuest: false,
          ftg: false
        }
      };
      needsUpdate = true;
    }

    // ตรวจสอบและสร้าง weekly checklist ถ้าไม่มี
    if (!character.checklist?.weekly) {
      updates.checklist = {
        ...updates.checklist || character.checklist || {},
        weekly: {
          minotaur: 0,
          cerberus: 0,
          cerberusHell: 0,
          cerberusChallenge: 0,
          manticore: 0,
          manticoreHell: 0,
          apocalypse: 0,
          apocalypseHell: 0,
          seaDragon: 0,
          seaDragonHell: 0,
          seaDragonChallenge: 0,
          themePark: 0,
          themeHell: 0,
          chaosRiftKamala: 0,
          chaosRiftBairra: 0,
          banquetHall: 0,
          jealousAlbeuteur: 0
        }
      };
      needsUpdate = true;
    }

    // ถ้ามีการเปลี่ยนแปลง ให้อัปเดตข้อมูล
    if (needsUpdate) {
      await update(characterRef, updates);
    }
  } catch (error) {
    console.error('Error migrating character checklist:', error);
  }
};

const CLASS_ICONS: Record<string, JSX.Element> = {
  Swordsman: <span role="img" aria-label="Swordsman">⚔️</span>,
  Mercenary: <span role="img" aria-label="Mercenary">🪓</span>,
  Bowmaster: <span role="img" aria-label="Bowmaster">🏹</span>,
  Acrobat: <span role="img" aria-label="Acrobat">🤸‍♂️</span>,
  'Force User': <span role="img" aria-label="Force User">🔮</span>,
  'Elemental Lord': <span role="img" aria-label="Elemental Lord">🌪️</span>,
  Paladin: <span role="img" aria-label="Paladin">🛡️</span>,
  Saint: <span role="img" aria-label="Saint">✨</span>,
  Engineer: <span role="img" aria-label="Engineer">🔧</span>,
  Alchemist: <span role="img" aria-label="Alchemist">⚗️</span>,
};

export default function MyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [characters, setCharacters] = useState<Character[]>([])
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newCharacterClass, setNewCharacterClass] = useState<CharacterClass>('Swordsman')
  const [newCharacterMainClass, setNewCharacterMainClass] = useState<CharacterMainClass>('Warrior')
  const [isAddingCharacter, setIsAddingCharacter] = useState(false)
  const [isEditingCharacter, setIsEditingCharacter] = useState(false)
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null)
  const [stats, setStats] = useState<EditableStats>(convertToEditableStats(defaultStats));
  const [editingCharacter, setEditingCharacter] = useState<EditableCharacter | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const defaultChecklist = {
    daily: {
      dailyQuest: false,
      ftg: false
    },
    weekly: {
      minotaur: 0,
      cerberus: 0,
      cerberusHell: 0,
      cerberusChallenge: 0,
      manticore: 0,
      manticoreHell: 0,
      apocalypse: 0,
      apocalypseHell: 0,
      seaDragon: 0,
      seaDragonHell: 0,
      seaDragonChallenge: 0,
      themePark: 0,
      themeHell: 0,
      chaosRiftKamala: 0,
      chaosRiftBairra: 0,
      banquetHall: 0,
      jealousAlbeuteur: 0
    }
  };
  const [newCharacter, setNewCharacter] = useState<EditableCharacter>({
    id: '',
    name: '',
    class: 'Swordsman',
    mainClass: 'Warrior',
    level: 1,
    userId: '',
    stats: defaultEditableStats,
    checklist: DEFAULT_CHECKLIST
  });
  const [newCharacterLevel, setNewCharacterLevel] = useState('');

  useEffect(() => {
    if (!user && !loading) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const charactersRef = ref(database, `users/${user.uid}/characters`);
    
    onValue(charactersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const characterList = Object.entries(data).map(([id, char]: [string, any]) => {
          // Convert string stats to EditableStats first
          const editableStats: EditableStats = {
            str: String(char.stats?.str ?? '0'),
            agi: String(char.stats?.agi ?? '0'),
            int: String(char.stats?.int ?? '0'),
            vit: String(char.stats?.vit ?? '0'),
            spr: String(char.stats?.spr ?? '0'),
            points: String(char.stats?.points ?? '0'),
            atk: String(char.stats?.atk ?? '0'),
            hp: String(char.stats?.hp ?? '0'),
            fd: String(char.stats?.fd ?? '0'),
            cri: String(char.stats?.cri ?? '0'),
            ele: String(char.stats?.ele ?? '0'),
            pdef: String(char.stats?.pdef ?? '0'),
            mdef: String(char.stats?.mdef ?? '0')
          };

          // Then convert EditableStats to CharacterStats
          const stats = convertToCharacterStats(editableStats);

          return {
            id,
            name: char.name,
            class: char.class,
            mainClass: char.mainClass,
            level: char.level,
            userId: char.userId,
            stats,
            checklist: char.checklist || DEFAULT_CHECKLIST
          };
        });
        setCharacters(characterList);
      } else {
        setCharacters([]);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      off(charactersRef);
    };
  }, [user]);

  useEffect(() => {
    if (!isAddingCharacter && !isEditingCharacter) {
      setNewCharacterName('')
      setNewCharacterClass('Swordsman')
      setNewCharacterMainClass('Warrior')
      setStats({
        str: '',
        agi: '',
        int: '',
        vit: '',
        spr: '',
        points: '',
        atk: '',
        hp: '',
        fd: '',
        cri: '',
        ele: '',
        pdef: '',
        mdef: ''
      })
      setEditingCharacterId(null)
    }
  }, [isAddingCharacter, isEditingCharacter])

  useEffect(() => {
    if (!user) return;
    checkAndResetChecklist(user.uid);
  }, [user]);

  const handleAddCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('กรุณาเข้าสู่ระบบก่อนเพิ่มตัวละคร');
      return;
    }

    try {
      const characterToAdd: Character = {
        id: nanoid(),
        name: newCharacter.name,
        class: newCharacter.class,
        mainClass: newCharacter.mainClass,
        level: newCharacter.level,
        userId: user.uid,
        stats: convertToCharacterStats(newCharacter.stats),
        checklist: DEFAULT_CHECKLIST
      };

      const characterRef = ref(database, `users/${user.uid}/characters/${characterToAdd.id}`);
      await set(characterRef, characterToAdd);

      setNewCharacter({
        id: '',
        name: '',
        class: 'Swordsman',
        mainClass: 'Warrior',
        level: 1,
        userId: '',
        stats: defaultEditableStats,
        checklist: DEFAULT_CHECKLIST
      });
      setIsAddModalOpen(false);
      toast.success('เพิ่มตัวละครสำเร็จ');
    } catch (error) {
      console.error('Error adding character:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มตัวละคร');
    }
  };

  const handleDeleteCharacter = async (characterId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const characterRef = ref(database, `users/${user.uid}/characters/${characterId}`);
      const snapshot = await get(characterRef);
      
      if (!snapshot.exists()) {
        toast.error('ไม่พบตัวละครนี้ในระบบ');
        return;
      }

      await remove(characterRef);
      // --- ลบออกจากทุกปาร์ตี้ ---
      const partiesRef = ref(database, 'parties');
      const partiesSnapshot = await get(partiesRef);
      const parties = partiesSnapshot.val() || {};
      const updates: { [key: string]: null } = {};
      const partiesToDelete: string[] = [];
      Object.entries(parties).forEach(([partyId, partyData]: [string, any]) => {
        if (partyData.members && partyData.members[characterId]) {
          updates[`parties/${partyId}/members/${characterId}`] = null;
        }
      });
      // ตรวจสอบปาร์ตี้ที่ไม่มีสมาชิกเหลืออยู่หลังจากลบ characterId
      Object.entries(parties).forEach(([partyId, partyData]: [string, any]) => {
        if (partyData.members && partyData.members[characterId]) {
          // จำลอง members ใหม่หลังลบ characterId
          const memberKeys = Object.keys(partyData.members).filter(cid => cid !== characterId);
          if (memberKeys.length === 0) {
            partiesToDelete.push(partyId);
          }
        }
      });
      if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
      }
      // ลบปาร์ตี้ที่ไม่มีสมาชิกเหลืออยู่
      for (const partyId of partiesToDelete) {
        await remove(ref(database, `parties/${partyId}`));
      }
      // --- จบลบออกจากปาร์ตี้ ---
      toast.success('ลบตัวละครสำเร็จ');
    } catch (error) {
      console.error('Error deleting character:', error);
      toast.error('เกิดข้อผิดพลาดในการลบตัวละคร');
    }
  };

  const handleEditCharacter = (character: Character) => {
    setEditingCharacterId(character.id);
    const editableChar: EditableCharacter = {
      id: character.id,
      name: character.name,
      class: character.class,
      mainClass: character.mainClass,
      level: character.level,
      userId: character.userId,
      stats: convertToEditableStats(character.stats),
      checklist: character.checklist
    };
    setEditingCharacter(editableChar);
    setIsEditModalOpen(true);
  };

  const handleChecklistChange = async (characterId: string, newChecklist: CharacterChecklist) => {
    if (!user) {
      router.push('/login');
      return;
    }
    
    try {
      // Validate checklist structure
      if (!newChecklist.daily || !newChecklist.weekly) {
        toast.error('โครงสร้าง checklist ไม่ถูกต้อง');
        return;
      }

      const characterRef = ref(database, `users/${user.uid}/characters/${characterId}`);
      const snapshot = await get(characterRef);
      
      if (!snapshot.exists()) {
        toast.error('ไม่พบตัวละครนี้ในระบบ');
        return;
      }

      await update(characterRef, { checklist: newChecklist });
      toast.success('อัพเดท checklist สำเร็จ');
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดต checklist');
    }
  };

  const handleStatChange = (stat: keyof EditableStats, value: string) => {
    if (!editingCharacter) return;
    setEditingCharacter(prev => {
      if (!prev) return null;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [stat]: value
        }
      };
    });
  };

  const handleEditStatChange = (stat: keyof EditableStats, value: string) => {
    if (!editingCharacter) return;
    
    // อนุญาตให้ใส่ได้เฉพาะตัวเลขและจุดทศนิยม
    if (!/^[0-9]*\.?[0-9]*$/.test(value) && value !== '') return;

    // ถ้าค่าปัจจุบันเป็น "0" และมีการพิมพ์ตัวเลขใหม่ ให้แทนที่เลข 0 ด้วยตัวเลขใหม่
    if (editingCharacter.stats[stat] === '0' && value !== '0' && value !== '') {
      value = value.replace(/^0+/, '');
    }
    
    setEditingCharacter(prev => {
      if (!prev) return null;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          [stat]: value
        }
      };
    });
  };

  const handleCharacterSelect = (character: Character) => {
    const editableCharacter: EditableCharacter = {
      id: character.id,
      name: character.name,
      class: character.class,
      mainClass: character.mainClass,
      level: character.level,
      userId: character.userId,
      checklist: character.checklist,
      stats: convertToEditableStats(character.stats)
    };
    setEditingCharacter(editableCharacter);
    setIsEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!user || !editingCharacter) return;

    try {
      await handleUpdateCharacter(editingCharacter.id, editingCharacter);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating character:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    }
  };

  const handleATKChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStatChange('atk', e.target.value);
  };

  const handleHPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStatChange('hp', e.target.value);
  };

  const handlePDEFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStatChange('pdef', e.target.value);
  };

  const handleMDEFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStatChange('mdef', e.target.value);
  };

  const handleCRIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStatChange('cri', e.target.value);
  };

  const handleELEChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStatChange('ele', e.target.value);
  };

  const handleFDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleStatChange('fd', e.target.value);
  };

  const handleNewCharacter = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    setNewCharacter(defaultEditableCharacter);
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const newCharacterData: EditableCharacter = {
      id: '',
      name: newCharacterName,
      class: 'Swordsman',
      mainClass: 'Warrior',
      level: 1,
      userId: user.uid,
      stats: defaultEditableStats,
      checklist: DEFAULT_CHECKLIST
    };

    handleAddCharacter(e);
  };

  const handleUpdateCharacter = async (characterId: string, updates: Partial<EditableCharacter>) => {
    if (!user) {
      toast.error('กรุณาเข้าสู่ระบบก่อนแก้ไขตัวละคร');
      return;
    }

    try {
      const characterRef = ref(database, `users/${user.uid}/characters/${characterId}`);
      const snapshot = await get(characterRef);
      
      if (!snapshot.exists()) {
        toast.error('ไม่พบตัวละครที่ต้องการแก้ไข');
        return;
      }

      const currentCharacter = snapshot.val();
      const updatedStats = updates.stats ? convertToCharacterStats(updates.stats) : currentCharacter.stats;
      const updatedChecklist = updates.checklist ?? currentCharacter.checklist ?? DEFAULT_CHECKLIST;

      await update(characterRef, {
        ...updates,
        stats: updatedStats,
        checklist: updatedChecklist
      });

      toast.success('อัพเดทตัวละครสำเร็จ');
    } catch (error) {
      console.error('Error updating character:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทตัวละคร');
    }
  };

  const handleSaveCharacter = async () => {
    setIsEditModalOpen(false);
    // ... rest of the function
  };

  const renderAddCharacterForm = () => (
    <motion.form
      id="add-character-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="bg-gradient-to-br from-violet-50 to-blue-50 rounded-2xl shadow-xl p-4"
    >
      <div className="grid gap-6 py-4">
        <div className="grid grid-cols-12 items-center gap-4">
          <Label htmlFor="name" className="col-span-3 text-right font-medium text-gray-600 flex flex-row items-center gap-2 whitespace-nowrap min-w-[120px]">
            <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 2 21l1.5-5L16.5 3.5z"/></svg>
            ชื่อตัวละคร
          </Label>
          <Input
            id="name"
            value={newCharacter.name}
            onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
            className="col-span-9 bg-white shadow focus:shadow-lg border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-all"
            placeholder="ใส่ชื่อตัวละคร เช่น อัศวินสายฟ้า"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-12 items-center gap-4">
          <Label htmlFor="class" className="col-span-3 text-right font-medium text-gray-600 flex flex-row items-center gap-2 whitespace-nowrap">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            คลาส
          </Label>
          <div className="col-span-9">
            <Select
              value={newCharacter.class}
              onValueChange={(value: CharacterClass) => {
                const mainClass = CLASS_TO_MAIN_CLASS[value];
                setNewCharacter({ 
                  ...newCharacter, 
                  class: value,
                  mainClass: mainClass
                });
              }}
            >
              <SelectTrigger className="bg-white shadow focus:shadow-lg border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-all">
                <SelectValue placeholder="เลือกคลาส" />
              </SelectTrigger>
              <SelectContent>
                {CHARACTER_CLASSES.map((characterClass) => (
                  <SelectItem key={characterClass} value={characterClass} className="flex items-center gap-2">
                    <span className="mr-2">{CLASS_ICONS[characterClass]}</span>
                    {characterClass}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter className="border-t border-gray-200 pt-4 flex justify-end">
        <Button
          type="submit"
          className="bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-xl flex items-center gap-2 px-6 py-2 rounded-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          เพิ่มตัวละคร
        </Button>
      </DialogFooter>
    </motion.form>
  );

  const renderEditCharacterForm = () => (
    <Dialog open={!!editingCharacter} onOpenChange={() => setEditingCharacter(null)}>
      <DialogContent className="sm:max-w-[425px] bg-gradient-to-b from-white to-gray-50 border-0">
        <DialogHeader className="space-y-3 pb-4 border-b border-gray-200">
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
            <div className="p-2 rounded-lg bg-violet-100 text-violet-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
              </svg>
            </div>
            แก้ไขข้อมูลตัวละคร
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={async (e) => {
          e.preventDefault();
          if (!editingCharacter) return;
          
          try {
            await handleUpdateCharacter(editingCharacter.id, editingCharacter);
            setIsEditModalOpen(false);
            setEditingCharacter(null);
          } catch (error) {
            console.error('Error updating character:', error);
            toast.error('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
          }
        }} className="space-y-4">
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right font-medium text-gray-600">
                ชื่อตัวละคร
              </Label>
              <Input
                id="name"
                value={editingCharacter?.name || ''}
                onChange={(e) => setEditingCharacter(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="col-span-3 bg-white shadow-sm border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class" className="text-right font-medium text-gray-600">
                คลาส
              </Label>
              <Select
                value={editingCharacter?.class || 'Swordsman'}
                onValueChange={(value: CharacterClass) => {
                  const mainClass = CLASS_TO_MAIN_CLASS[value];
                  setEditingCharacter(prev => prev ? { ...prev, class: value, mainClass } : null);
                }}
              >
                <SelectTrigger className="col-span-3 bg-white shadow-sm border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHARACTER_CLASSES.map((characterClass) => (
                    <SelectItem key={characterClass} value={characterClass}>
                      {characterClass}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats Section */}
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-blue-100 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
                    <line x1="16" y1="8" x2="2" y2="22"/>
                    <line x1="17.5" y1="15" x2="9" y2="15"/>
                  </svg>
                </div>
                <Label className="font-semibold text-gray-700">สเตตัส</Label>
              </div>
              <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="atk" className="text-right font-medium text-gray-600">ATK</Label>
                    <Input
                      id="atk"
                      value={editingCharacter?.stats.atk || '0'}
                      onChange={(e) => handleEditStatChange('atk', e.target.value)}
                      className="col-span-3 bg-white shadow-sm border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="hp" className="text-right font-medium text-gray-600">HP</Label>
                    <Input
                      id="hp"
                      value={editingCharacter?.stats.hp || '0'}
                      onChange={(e) => handleEditStatChange('hp', e.target.value)}
                      className="col-span-3 bg-white shadow-sm border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="def" className="text-right font-medium text-gray-600">DEF%</Label>
                    <div className="col-span-3 grid grid-cols-2 gap-2">
                      <Input
                        id="pdef"
                        value={editingCharacter?.stats.pdef || '0'}
                        onChange={(e) => handleEditStatChange('pdef', e.target.value)}
                        placeholder="P.DEF"
                        className="w-full bg-white shadow-sm border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-colors"
                      />
                      <Input
                        id="mdef"
                        value={editingCharacter?.stats.mdef || '0'}
                        onChange={(e) => handleEditStatChange('mdef', e.target.value)}
                        placeholder="M.DEF"
                        className="w-full bg-white shadow-sm border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cri" className="text-right font-medium text-gray-600">CRI%</Label>
                    <Input
                      id="cri"
                      value={editingCharacter?.stats.cri || '0'}
                      onChange={(e) => handleEditStatChange('cri', e.target.value)}
                      className="col-span-3 bg-white shadow-sm border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ele" className="text-right font-medium text-gray-600">ELE%</Label>
                    <Input
                      id="ele"
                      value={editingCharacter?.stats.ele || '0'}
                      onChange={(e) => handleEditStatChange('ele', e.target.value)}
                      className="col-span-3 bg-white shadow-sm border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fd" className="text-right font-medium text-gray-600">FD%</Label>
                    <Input
                      id="fd"
                      value={editingCharacter?.stats.fd || '0'}
                      onChange={(e) => handleEditStatChange('fd', e.target.value)}
                      className="col-span-3 bg-white shadow-sm border-gray-200 focus:border-violet-500 focus:ring-violet-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 pt-4">
            <Button
              type="submit"
              className="bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  const calculateStats = (character: Character) => {
    const { stats } = character;
    return {
      str: stats.str,
      agi: stats.agi,
      int: stats.int,
      vit: stats.vit,
      spr: stats.spr,
      points: stats.points
    };
  };

  if (loading || !user) {
    return <div>กำลังโหลด...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-sky-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                ตัวละครของฉัน
              </h1>
              <p className="text-gray-500">จัดการตัวละครและติดตามความคืบหน้าของคุณ</p>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 rounded-xl px-6"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                เพิ่มตัวละคร
              </Button>
            </div>
          </div>
        </div>

        {/* Character Grid */}
        {characters.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-violet-100 text-violet-500 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">ยังไม่มีตัวละคร</h3>
            <p className="text-gray-500 mb-6">เริ่มต้นด้วยการเพิ่มตัวละครแรกของคุณ</p>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto rounded-xl px-6"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              เพิ่มตัวละครใหม่
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characters.map((character) => (
              <div key={`character-${character.id}`} className="transform transition-all duration-200 hover:scale-[1.02]">
                <CharacterCard
                  character={character}
                  onEdit={handleEditCharacter}
                  onDelete={handleDeleteCharacter}
                  onChecklistChange={handleChecklistChange}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Character Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg min-w-[400px] bg-gradient-to-b from-white to-gray-50 border-0">
          <DialogHeader className="space-y-3 pb-4 border-b border-gray-200">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <div className="p-2 rounded-lg bg-violet-100 text-violet-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
              เพิ่มตัวละครใหม่
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              กรอกข้อมูลตัวละครของคุณ
            </DialogDescription>
          </DialogHeader>
          {renderAddCharacterForm()}
        </DialogContent>
      </Dialog>

      {/* Edit Character Modal */}
      {renderEditCharacterForm()}
    </div>
  );
} 