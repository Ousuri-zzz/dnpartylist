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
import { CLASS_TO_ROLE, getClassColors } from '@/config/theme'
import { useRouter, useSearchParams } from 'next/navigation'
import { checkAndResetChecklist } from '@/lib/checklist'
import { DiscordDropdown } from '@/components/DiscordDropdown'
import { nanoid } from 'nanoid'
import { toast } from 'react-hot-toast'
import { DEFAULT_CHECKLIST } from '@/components/CharacterChecklist'
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { WEEKLY_MAX_VALUES } from '@/constants/checklist';
import { motion } from 'framer-motion';
import { ClipboardCheck, ClipboardCopy, Download, Trash2, Plus } from 'lucide-react';
import { resetChecklist } from '@/lib/checklist';
import Link from 'next/link';
import { FaCoins } from 'react-icons/fa';
import { Wand2 } from 'lucide-react';
import 'rpg-awesome/css/rpg-awesome.min.css';
import { ref as dbRef, get as dbGet } from 'firebase/database';

const CHARACTER_CLASSES: CharacterClass[] = [
  'Sword Master',
  'Mercenary',
  'Bowmaster',
  'Acrobat',
  'Force User',
  'Elemental Lord',
  'Paladin',
  'Priest',
  'Engineer',
  'Alchemist'
];

const CHARACTER_MAIN_CLASSES: CharacterMainClass[] = [
  'Warrior',
  'Archer',
  'Sorceress',
  'Cleric',
  'Academic'
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
  level: 1,
  class: 'Sword Master',
  mainClass: 'Warrior',
  stats: {
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
  },
  checklist: {
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
      themePark: 0,
      themeHell: 0,
      chaosRiftKamala: 0,
      chaosRiftBairra: 0,
      banquetHall: 0,
      jealousAlbeuteur: 0
    }
  },
  userId: ''
};

const defaultEditableCharacter: EditableCharacter = {
  id: '',
  name: '',
  class: 'Sword Master',
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

// CLASS_GRADIENTS สำหรับ getClassIcon
const CLASS_GRADIENTS: Record<string, { bg: string; text: string; border: string; icon?: string }> = {
  Warrior:   { bg: 'from-red-100/80 to-rose-100/50', text: 'text-red-600', border: 'border-red-300', icon: '⚔️' },
  Archer:    { bg: 'from-emerald-100/80 to-green-100/50', text: 'text-emerald-600', border: 'border-emerald-300', icon: '🏹' },
  Sorceress: { bg: 'from-purple-100/80 to-violet-100/50', text: 'text-purple-600', border: 'border-purple-300', icon: '🔮' },
  Cleric:    { bg: 'from-sky-100/80 to-blue-100/50', text: 'text-sky-600', border: 'border-sky-300', icon: '✨' },
  Academic:  { bg: 'from-amber-100/80 to-yellow-100/50', text: 'text-amber-600', border: 'border-amber-300', icon: '🔧' },
  Default:   { bg: 'from-gray-100/80 to-gray-100/50', text: 'text-gray-700', border: 'border-gray-200', icon: '👤' }
};

const getClassIcon = (className: string) => {
  let colorClass = '';
  switch (className) {
    case 'Sword Master':
    case 'Mercenary':
      colorClass = 'text-red-600 dark:text-red-200';
      break;
    case 'Bowmaster':
    case 'Acrobat':
      colorClass = 'text-emerald-600 dark:text-emerald-200';
      break;
    case 'Force User':
    case 'Elemental Lord':
      colorClass = 'text-purple-600 dark:text-purple-200';
      break;
    case 'Paladin':
    case 'Priest':
      colorClass = 'text-sky-600 dark:text-sky-200';
      break;
    case 'Engineer':
    case 'Alchemist':
      colorClass = 'text-amber-600 dark:text-amber-200';
      break;
    default:
      colorClass = 'text-gray-700 dark:text-gray-200';
  }
  switch (className) {
    case 'Sword Master':
      return <i className={`ra ra-sword ${colorClass}`} title="Sword Master" />;
    case 'Mercenary':
      return <i className={`ra ra-axe ${colorClass}`} title="Mercenary" />;
    case 'Bowmaster':
      return <i className={`ra ra-archer ${colorClass}`} title="Bowmaster" />;
    case 'Acrobat':
      return <i className={`ra ra-player-dodge ${colorClass}`} title="Acrobat" />;
    case 'Force User':
      return <i className={`ra ra-crystal-ball ${colorClass}`} title="Force User" />;
    case 'Elemental Lord':
      return <i className={`ra ra-fire-symbol ${colorClass}`} title="Elemental Lord" />;
    case 'Paladin':
      return <i className={`ra ra-shield ${colorClass}`} title="Paladin" />;
    case 'Priest':
      return <i className={`ra ra-hospital-cross ${colorClass}`} title="Priest" />;
    case 'Engineer':
      return <i className={`ra ra-gear-hammer ${colorClass}`} title="Engineer" />;
    case 'Alchemist':
      return <i className={`ra ra-flask ${colorClass}`} title="Alchemist" />;
    default:
      return <i className={`ra ra-player ${colorClass}`} title="Unknown" />;
  }
};

export default function MyPage() {
  const { user, loading: authLoading, discordName } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const [characters, setCharacters] = useState<Character[]>([])
  const [newCharacterName, setNewCharacterName] = useState('')
  const [newCharacterClass, setNewCharacterClass] = useState<CharacterClass>('Sword Master')
  const [newCharacterMainClass, setNewCharacterMainClass] = useState<CharacterMainClass>('Warrior')
  const [isAddingCharacter, setIsAddingCharacter] = useState(false)
  const [isEditingCharacter, setIsEditingCharacter] = useState(false)
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null)
  const [stats, setStats] = useState<EditableStats>(convertToEditableStats(defaultStats));
  const [editingCharacter, setEditingCharacter] = useState<EditableCharacter | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);
  const [hasCheckedUserData, setHasCheckedUserData] = useState(false);
  const [newCharacter, setNewCharacter] = useState<EditableCharacter>({
    id: '',
    name: '',
    class: 'Sword Master',
    mainClass: 'Warrior',
    level: 1,
    userId: '',
    stats: defaultEditableStats,
    checklist: DEFAULT_CHECKLIST
  });
  const [newCharacterLevel, setNewCharacterLevel] = useState('');
  const [copied, setCopied] = useState<'th' | 'en' | null>(null);
  
  // Mod Modal states
  const [isModModalOpen, setIsModModalOpen] = useState(false);
  const [isAddModModalOpen, setIsAddModModalOpen] = useState(false);
  const [mods, setMods] = useState<any[]>([]);
  const [newMod, setNewMod] = useState({
    name: '',
    description: '',
    link: ''
  });
  const [userRole, setUserRole] = useState<'leader' | 'member'>('member');
  const [guild, setGuild] = useState<any>(null);
  const [modUserNames, setModUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;

    const charactersRef = ref(database, `users/${user.uid}/characters`);
    
    onValue(charactersRef, (snapshot) => {
      if (snapshot.exists()) {
        const characterList: Character[] = [];
        snapshot.forEach((childSnapshot) => {
          const characterData = childSnapshot.val();
          characterList.push({
            id: childSnapshot.key!,
            ...characterData
          });
        });

        setCharacters(characterList);
      } else {
        setCharacters([]);
      }
    });

    // Add event listener for openAddCharacterModal
    const handleOpenAddCharacterModal = () => {
      setIsAddModalOpen(true);
    };

    window.addEventListener('openAddCharacterModal', handleOpenAddCharacterModal);

    // Cleanup subscription and event listener on unmount
    return () => {
      off(charactersRef);
      window.removeEventListener('openAddCharacterModal', handleOpenAddCharacterModal);
    };
  }, [user]);

  useEffect(() => {
    if (!isAddingCharacter && !isEditingCharacter) {
      setNewCharacterName('')
      setNewCharacterClass('Sword Master')
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

  // Add new useEffect to check user data after login
  useEffect(() => {
    if (!user || authLoading || hasCheckedUserData) return;

    const checkUserData = async () => {
      try {
        // Check Discord name
        const metaRef = ref(database, `users/${user.uid}/meta`);
        const metaSnapshot = await get(metaRef);
        const hasDiscord = metaSnapshot.exists() && metaSnapshot.val().discord;

        // Check characters
        const charactersRef = ref(database, `users/${user.uid}/characters`);
        const charactersSnapshot = await get(charactersRef);
        const hasCharacters = charactersSnapshot.exists() && Object.keys(charactersSnapshot.val()).length > 0;

        // Open appropriate modals based on conditions
        if (!hasDiscord) {
          setIsDiscordModalOpen(true);
        } else if (!hasCharacters) {
          setIsAddModalOpen(true);
        }

        setHasCheckedUserData(true);
      } catch (error) {
        console.error('Error checking user data:', error);
      }
    };

    checkUserData();
  }, [user, authLoading, hasCheckedUserData]);

  // ตรวจสอบสิทธิ์หัวกิลด์ (leader) จาก guild.leaders
  useEffect(() => {
    if (!user) return;
    const fetchGuild = async () => {
      try {
        const guildRef = dbRef(database, 'guild');
        const snapshot = await dbGet(guildRef);
        if (snapshot.exists()) {
          const guildData = snapshot.val();
          setGuild(guildData);
          if (guildData.leaders && guildData.leaders[user.uid]) {
            setUserRole('leader');
          } else {
            setUserRole('member');
          }
        } else {
          setGuild(null);
          setUserRole('member');
        }
      } catch (error) {
        setGuild(null);
        setUserRole('member');
      }
    };
    fetchGuild();
  }, [user]);

  const handleAddCharacter = async (character: Character) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const characterRef = ref(database, `users/${user.uid}/characters/${character.id}`);
      await set(characterRef, character);
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

  const handleEditCharacter = async () => {
    if (!editingCharacter || !editingCharacter.name.trim() || !user) return;

    const updatedCharacter: Character = {
      ...editingCharacter,
      name: editingCharacter.name,
      class: editingCharacter.class,
      mainClass: CLASS_TO_ROLE[editingCharacter.class],
      stats: {
        str: Number(editingCharacter.stats.str) || 0,
        agi: Number(editingCharacter.stats.agi) || 0,
        int: Number(editingCharacter.stats.int) || 0,
        vit: Number(editingCharacter.stats.vit) || 0,
        spr: Number(editingCharacter.stats.spr) || 0,
        points: Number(editingCharacter.stats.points) || 0,
        atk: Number(editingCharacter.stats.atk) || 0,
        hp: Number(editingCharacter.stats.hp) || 0,
        fd: Number(editingCharacter.stats.fd) || 0,
        cri: Number(editingCharacter.stats.cri) || 0,
        ele: Number(editingCharacter.stats.ele) || 0,
        pdef: Number(editingCharacter.stats.pdef) || 0,
        mdef: Number(editingCharacter.stats.mdef) || 0
      }
    };

    try {
      const characterRef = ref(database, `users/${user.uid}/characters/${editingCharacter.id}`);
      await update(characterRef, updatedCharacter);
      setIsEditModalOpen(false);
      setEditingCharacter(null);
      toast.success('อัพเดทตัวละครสำเร็จ');
    } catch (error) {
      console.error('Error updating character:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทตัวละคร');
    }
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

    // ตรวจสอบค่าสูงสุดสำหรับสเตตัสที่เป็นเปอร์เซ็นต์
    const percentageStats = ['cri', 'pdef', 'mdef', 'ele', 'fd'];
    if (percentageStats.includes(stat)) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue > 100) {
        value = '100';
      }
    }

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
      await handleEditCharacter();
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
    if (!user) {
      router.push('/login');
      return;
    }

    const newCharacterData: Character = {
      id: crypto.randomUUID(),
      name: newCharacter.name,
      class: newCharacter.class,
      mainClass: newCharacter.mainClass,
      level: 1,
      userId: user.uid,
      stats: {
        str: Number(newCharacter.stats.str),
        agi: Number(newCharacter.stats.agi),
        int: Number(newCharacter.stats.int),
        vit: Number(newCharacter.stats.vit),
        spr: Number(newCharacter.stats.spr),
        points: Number(newCharacter.stats.points),
        atk: Number(newCharacter.stats.atk),
        hp: Number(newCharacter.stats.hp),
        fd: Number(newCharacter.stats.fd),
        cri: Number(newCharacter.stats.cri),
        ele: Number(newCharacter.stats.ele),
        pdef: Number(newCharacter.stats.pdef),
        mdef: Number(newCharacter.stats.mdef)
      },
      checklist: DEFAULT_CHECKLIST
    };

    try {
      await handleAddCharacter(newCharacterData);
      setIsAddModalOpen(false);
      setNewCharacter(defaultEditableCharacter);

      // Check for redirect after successful character addition
      if (redirect) {
        router.push(redirect);
      }
    } catch (error) {
      console.error('Error adding character:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มตัวละคร');
    }
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
      className="bg-gradient-to-br from-violet-50 to-blue-50 dark:from-gray-900/80 dark:to-gray-800/80 rounded-2xl shadow-xl p-4"
    >
      <div className="grid gap-6 py-4">
        <div className="grid grid-cols-12 items-center gap-4">
          <Label htmlFor="name" className="col-span-3 text-right font-medium text-gray-600 dark:text-gray-200 flex flex-row items-center gap-2 whitespace-nowrap min-w-[120px]">
            <svg className="w-5 h-5 text-violet-400 dark:text-violet-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19.5 2 21l1.5-5L16.5 3.5z"/></svg>
            ชื่อตัวละคร
          </Label>
          <Input
            id="name"
            value={newCharacter.name}
            onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
            className="col-span-9 bg-white dark:bg-gray-800 shadow focus:shadow-lg border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-all dark:text-gray-100"
            placeholder="ใส่ชื่อตัวละคร เช่น อัศวินสายฟ้า"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-12 items-center gap-4">
          <Label htmlFor="class" className="col-span-3 text-right font-medium text-gray-600 dark:text-gray-200 flex flex-row items-center gap-2 whitespace-nowrap">
            <svg className="w-5 h-5 text-blue-400 dark:text-blue-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            คลาส
          </Label>
          <div className="col-span-9">
            <Select
              value={newCharacter.class}
              onValueChange={(value: CharacterClass) => {
                const mainClass = CLASS_TO_ROLE[value];
                setNewCharacter({ 
                  ...newCharacter, 
                  class: value,
                  mainClass: mainClass
                });
              }}
            >
              <SelectTrigger className="bg-white dark:bg-gray-800 shadow focus:shadow-lg border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-all dark:text-gray-100">
                <SelectValue placeholder="เลือกคลาส" />
              </SelectTrigger>
              <SelectContent>
                {CHARACTER_CLASSES.map((characterClass) => (
                  <SelectItem key={characterClass} value={characterClass} className="flex items-center gap-2">
                    <span className="mr-2">{getClassIcon(characterClass)}</span>
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
          className="relative group bg-gradient-to-r from-violet-500 via-purple-500 to-blue-500 text-white hover:from-violet-600 hover:via-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 rounded-xl px-6 py-3 w-full md:w-auto overflow-hidden"
        >
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-400/20 via-purple-400/20 to-blue-400/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          
          {/* Button content */}
          <div className="relative flex items-center gap-2">
            <div className="p-1 rounded-lg bg-white/10 backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <span className="font-medium tracking-wide">เพิ่มตัวละคร</span>
          </div>

          {/* Shine effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </Button>
      </DialogFooter>
    </motion.form>
  );

  const renderEditCharacterForm = () => (
    <Dialog open={!!editingCharacter} onOpenChange={() => setEditingCharacter(null)}>
      <DialogContent className="w-full max-w-[95vw] sm:max-w-[600px] md:max-w-[800px] max-h-[80vh] mt-4 sm:mt-6 md:mt-8 mb-4 overflow-y-auto px-2 sm:px-4 pb-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 dark:bg-gray-900 rounded-2xl shadow-xl dark:shadow-black/40 border-0">
        <DialogHeader className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5L16.5 3.5z"/>
              </svg>
            </div>
            แก้ไขข้อมูลตัวละคร
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }} className="space-y-4">
          <div className="grid gap-4 sm:gap-6 py-2 sm:py-4">
            {/* Basic Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2 sm:p-4 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-violet-100 dark:border-gray-700 shadow-sm">
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="name" className="text-right font-medium text-gray-600 dark:text-gray-300 flex items-center justify-end gap-2 text-xs sm:text-base">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-violet-500 dark:text-violet-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    ชื่อตัวละคร
                  </Label>
                  <Input
                    id="name"
                    value={editingCharacter?.name || ''}
                    onChange={(e) => setEditingCharacter(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="col-span-3 bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-colors text-xs sm:text-base dark:text-gray-100"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="class" className="text-right font-medium text-gray-600 dark:text-gray-300 flex items-center justify-end gap-2 text-xs sm:text-base">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500 dark:text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                    </svg>
                    คลาส
                  </Label>
                  <Select
                    value={editingCharacter?.class || 'Swordsman'}
                    onValueChange={(value: CharacterClass) => {
                      const mainClass = CLASS_TO_ROLE[value];
                      setEditingCharacter(prev => prev ? { ...prev, class: value, mainClass } : null);
                    }}
                  >
                    <SelectTrigger className="col-span-3 bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-colors text-xs sm:text-base dark:text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHARACTER_CLASSES.map((characterClass) => (
                        <SelectItem key={characterClass} value={characterClass} className="flex items-center gap-2">
                          <span className="mr-2">{getClassIcon(characterClass)}</span>
                          {characterClass}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-md bg-gradient-to-r from-violet-100 to-blue-100 dark:from-gray-800 dark:to-gray-900 text-violet-600 dark:text-violet-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/>
                    <line x1="16" y1="8" x2="2" y2="22"/>
                    <line x1="17.5" y1="15" x2="9" y2="15"/>
                  </svg>
                </div>
                <Label className="font-semibold text-gray-700 dark:text-gray-200 text-sm sm:text-base">สเตตัส</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-2 sm:p-4 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-violet-100 dark:border-gray-700 shadow-sm">
                {/* Left Column */}
                <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label htmlFor="atk" className="text-right font-medium flex items-center justify-end gap-2 text-xs sm:text-base text-pink-600 dark:text-pink-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-pink-500 dark:text-pink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                        <path d="M2 2l7.586 7.586"></path>
                        <circle cx="11" cy="11" r="2"></circle>
                      </svg>
                      ATK
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="atk"
                        value={editingCharacter?.stats.atk || '0'}
                        onChange={(e) => handleEditStatChange('atk', e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-colors text-xs sm:text-base dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">พลังโจมตีพื้นฐานของตัวละคร</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label htmlFor="hp" className="text-right font-medium flex items-center justify-end gap-2 text-xs sm:text-base text-red-500 dark:text-red-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400 dark:text-red-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      HP
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="hp"
                        value={editingCharacter?.stats.hp || '0'}
                        onChange={(e) => handleEditStatChange('hp', e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-colors text-xs sm:text-base dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">พลังชีวิตของตัวละคร</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label htmlFor="def" className="text-right font-medium flex items-center justify-end gap-2 text-xs sm:text-base text-blue-500 dark:text-blue-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-400 dark:text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                      DEF%
                    </Label>
                    <div className="col-span-3 grid grid-cols-2 gap-2">
                      <div>
                        <Input
                          id="pdef"
                          value={editingCharacter?.stats.pdef || '0'}
                          onChange={(e) => handleEditStatChange('pdef', e.target.value)}
                          placeholder="P.DEF"
                          className="w-full bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-colors text-xs sm:text-base dark:text-gray-100"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ป้องกันการโจมตีทางกายภาพ (%)</p>
                      </div>
                      <div>
                        <Input
                          id="mdef"
                          value={editingCharacter?.stats.mdef || '0'}
                          onChange={(e) => handleEditStatChange('mdef', e.target.value)}
                          placeholder="M.DEF"
                          className="w-full bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-colors text-xs sm:text-base dark:text-gray-100"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ป้องกันการโจมตีเวทมนตร์ (%)</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label htmlFor="cri" className="text-right font-medium flex items-center justify-end gap-2 text-xs sm:text-base text-yellow-600 dark:text-yellow-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-yellow-400 dark:text-yellow-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                      </svg>
                      CRI%
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="cri"
                        value={editingCharacter?.stats.cri || '0'}
                        onChange={(e) => handleEditStatChange('cri', e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-colors text-xs sm:text-base dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">อัตราการคริติคอล (%)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label htmlFor="ele" className="text-right font-medium flex items-center justify-end gap-2 text-xs sm:text-base text-purple-600 dark:text-purple-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-purple-400 dark:text-purple-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                      </svg>
                      ELE%
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="ele"
                        value={editingCharacter?.stats.ele || '0'}
                        onChange={(e) => handleEditStatChange('ele', e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-colors text-xs sm:text-base dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ความเสียหายธาตุ (%)</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-2 sm:gap-4">
                    <Label htmlFor="fd" className="text-right font-medium flex items-center justify-end gap-2 text-xs sm:text-base text-orange-600 dark:text-orange-300">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-400 dark:text-orange-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                      </svg>
                      FD%
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="fd"
                        value={editingCharacter?.stats.fd || '0'}
                        onChange={(e) => handleEditStatChange('fd', e.target.value)}
                        className="w-full bg-white dark:bg-gray-800 shadow-sm border-gray-200 dark:border-gray-700 focus:border-violet-500 focus:ring-violet-500 transition-colors text-xs sm:text-base dark:text-gray-100"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ความเสียหายสุดท้าย (%)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description for hover tip (left-aligned, near stats box) */}
            <div className="w-full flex justify-start mt-2 mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-800/70 rounded px-3 py-1 border border-gray-200 dark:border-gray-700 flex items-center gap-1 shadow-sm">
                <span role="img" aria-label="info">ℹ️</span> วางเมาส์บนตัวเลขเพื่อดูค่า % ของสเตตัส
              </span>
            </div>
          </div>

          <DialogFooter className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button
              type="submit"
              className="bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 text-sm sm:text-base dark:from-violet-600 dark:to-blue-600 dark:hover:from-violet-700 dark:hover:to-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
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

  const handleCopy = (text: string, lang: 'th' | 'en') => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(lang);
    setTimeout(() => setCopied(null), 1200);
  };

  // Mod functions
  const handleOpenModModal = () => {
    setIsModModalOpen(true);
    // ตรวจสอบสิทธิ์ผู้ใช้ (ตัวอย่าง - ควรเชื่อมต่อกับระบบกิลด์จริง)
    // setUserRole('leader'); // หรือ 'member'
  };

  const handleAddMod = async () => {
    if (!user || !newMod.name.trim() || !newMod.link.trim()) {
      toast.error('กรุณากรอกชื่อและลิงก์ Mod');
      return;
    }

    try {
      const modRef = ref(database, 'mods');
      const newModRef = push(modRef);
      const modData = {
        id: newModRef.key,
        name: newMod.name,
        description: newMod.description,
        link: newMod.link,
        addedBy: user.uid,
        addedAt: Date.now()
      };
      
      await set(newModRef, modData);
      setNewMod({ name: '', description: '', link: '' });
      setIsAddModModalOpen(false);
      toast.success('เพิ่ม Mod สำเร็จ');
    } catch (error) {
      console.error('Error adding mod:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่ม Mod');
    }
  };

  const handleDeleteMod = async (modId: string) => {
    if (!user) return;

    try {
      const modRef = ref(database, `mods/${modId}`);
      await remove(modRef);
      toast.success('ลบ Mod สำเร็จ');
    } catch (error) {
      console.error('Error deleting mod:', error);
      toast.error('เกิดข้อผิดพลาดในการลบ Mod');
    }
  };

  const handleDownloadMod = (link: string) => {
    window.open(link, '_blank');
  };

  // Load mods from database
  useEffect(() => {
    if (!user) return;

    const modsRef = ref(database, 'mods');
    onValue(modsRef, (snapshot) => {
      if (snapshot.exists()) {
        const modsList: any[] = [];
        snapshot.forEach((childSnapshot) => {
          modsList.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        setMods(modsList.sort((a, b) => b.addedAt - a.addedAt));
        // ดึงชื่อผู้เพิ่ม mod
        const uids = Array.from(new Set(modsList.map(m => m.addedBy)));
        uids.forEach(async (uid) => {
          if (!modUserNames[uid]) {
            const snap = await dbGet(dbRef(database, `users/${uid}/meta/discord`));
            if (snap.exists()) {
              setModUserNames(prev => ({ ...prev, [uid]: snap.val() }));
            }
          }
        });
      } else {
        setMods([]);
      }
    });

    return () => {
      off(modsRef);
    };
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          {/* Outer ring with gradient */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 shadow-lg animate-pulse"></div>
          
          {/* Spinning ring */}
          <div className="absolute inset-0">
            <div className="w-24 h-24 rounded-full border-4 border-pink-300 border-t-transparent animate-spin"></div>
          </div>
          
          {/* Inner ring with gradient */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-200 to-purple-200 shadow-inner animate-pulse"></div>
          </div>
          
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white shadow-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row w-full gap-2">
          {/* ซ้าย: แบนเนอร์ 80% */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full md:w-4/5 relative mt-1 rounded-3xl bg-gradient-to-tr from-violet-200 via-pink-100 to-blue-100 shadow-2xl overflow-hidden border-0 dark:bg-gray-900/80 dark:border-gray-700/50"
            style={{ minHeight: '140px' }}
          >
            {/* Bubble/particle effect */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-200/30 rounded-full blur-2xl opacity-40 z-0" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-200/30 rounded-full blur-2xl opacity-30 z-0" />
            {/* White overlay for readability */}
            <div className="absolute inset-0 bg-white/60 backdrop-blur-lg rounded-3xl z-0 dark:bg-gray-800/90" />
            {/* Main Content */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 px-6 md:px-12 py-7 md:py-10">
              <div className="space-y-3 w-full">
                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-tr from-pink-300 via-violet-200 to-blue-200 shadow-lg border-3 border-white text-2xl">🐾</span>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-violet-600 via-pink-500 to-blue-600 bg-clip-text text-transparent drop-shadow-lg tracking-tight dark:from-violet-300 dark:via-pink-300 dark:to-blue-300">ตัวละครของฉัน</h1>
                    <p className="text-gray-600 text-sm md:text-base font-medium drop-shadow-sm dark:text-gray-300">เพิ่มตัวละครได้อย่างอิสระ ไม่จำกัดกิลด์ พร้อมระบบติดตามความคืบหน้า และจัดปาร์ตี้ได้อย่างสะดวก</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
                  <div className="flex flex-row gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (window.confirm('คุณต้องการรีเซ็ต Checklist รายวันทั้งหมดใช่หรือไม่?')) {
                          try {
                            await resetChecklist(user.uid, 'daily');
                            toast.success('รีเซ็ต Checklist รายวันเรียบร้อยแล้ว!');
                          } catch (error) {
                            console.error('Error resetting daily checklist:', error);
                            toast.error('เกิดข้อผิดพลาดในการรีเซ็ต Checklist');
                          }
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                      รีเซ็ตวัน
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (window.confirm('คุณต้องการรีเซ็ต Checklist รายสัปดาห์ทั้งหมดใช่หรือไม่?')) {
                          try {
                            await resetChecklist(user.uid, 'weekly');
                            toast.success('รีเซ็ต Checklist รายสัปดาห์เรียบร้อยแล้ว!');
                          } catch (error) {
                            console.error('Error resetting weekly checklist:', error);
                            toast.error('เกิดข้อผิดพลาดในการรีเซ็ต Checklist');
                          }
                        }
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                        <path d="M3 3v5h5"/>
                      </svg>
                      รีเซ็ตสัปดาห์
                    </Button>
                  </div>
                  <span className="text-xs text-gray-400 ml-0 sm:ml-2 dark:text-gray-500">ปุ่มคัดลอกข้อความรายวัน</span>
                  <div className="flex flex-row gap-2">
                    <button
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg border border-pink-200 bg-pink-50 text-pink-700 text-xs font-medium shadow hover:bg-pink-100 transition-all duration-200 ${copied === 'th' ? 'scale-105 bg-pink-200 dark:bg-pink-800' : ''} dark:border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:hover:bg-pink-900/50`}
                      onClick={() => handleCopy('ยินดีต้อนรับกลับ Nest', 'th')}
                      type="button"
                    >
                      {copied === 'th' ? <ClipboardCheck className="w-4 h-4 text-green-500 animate-bounce" /> : <ClipboardCopy className="w-4 h-4 text-pink-400 dark:text-pink-300" />}
                      ยินดีต้อนรับกลับ Nest
                    </button>
                    <button
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium shadow hover:bg-blue-100 transition-all duration-200 ${copied === 'en' ? 'scale-105 bg-blue-200 dark:bg-blue-800' : ''} dark:border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50`}
                      onClick={() => handleCopy('Welcome back to DN', 'en')}
                      type="button"
                    >
                      {copied === 'en' ? <ClipboardCheck className="w-4 h-4 text-green-500 animate-bounce" /> : <ClipboardCopy className="w-4 h-4 text-blue-400 dark:text-blue-300" />}
                      Welcome back to DN
                    </button>
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-violet-500 to-blue-500 text-white px-5 py-2.5 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-sm whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                เพิ่มตัวละคร
              </motion.button>
            </div>
          </motion.div>
          {/* ขวา: ปุ่ม 20% */}
          <div className="w-full md:w-1/5 flex flex-col gap-2 items-start md:justify-center justify-start mt-3 md:mt-0 order-last md:order-none">
            <Link href="/mypage/Status" className="w-full">
              <Button
                className="w-full h-9 md:h-10 bg-gradient-to-r from-violet-100 via-blue-50 to-white border-0 rounded-lg flex items-center justify-center gap-2 text-blue-700 font-medium text-sm shadow transition-all duration-200 hover:from-violet-200 hover:to-blue-100 hover:text-blue-900 dark:from-gray-800 dark:via-blue-900 dark:to-gray-900 dark:text-blue-200 dark:hover:text-blue-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500 dark:text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M8 6h8M8 10h8M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
                </svg>
                <span>คำนวณสเตตัส</span>
              </Button>
            </Link>
            <Button
              className="w-full h-9 md:h-10 bg-gradient-to-r from-violet-100 via-pink-50 to-white border-0 rounded-lg flex items-center justify-center gap-2 text-violet-700 font-medium text-sm shadow transition-all duration-200 hover:from-violet-200 hover:to-pink-100 hover:text-violet-900 dark:from-gray-800 dark:via-pink-900 dark:to-gray-900 dark:text-violet-200 dark:hover:text-violet-100"
              onClick={() => { alert('อยู่ระหว่างพัฒนา'); }}
              type="button"
            >
              <Wand2 className="w-4 h-4 text-violet-500 dark:text-violet-200" />
              <span>สกิล & บิ้วแนะนำ <span className="ml-1 text-xs align-middle">🚧</span></span>
            </Button>
            <Link href="/split" className="w-full">
              <Button
                className="w-full h-9 md:h-10 bg-gradient-to-r from-yellow-100 via-white to-yellow-50 border-0 rounded-lg flex items-center justify-center gap-2 text-yellow-800 font-medium text-sm shadow transition-all duration-200 hover:from-yellow-200 hover:to-yellow-100 hover:text-yellow-900 dark:from-gray-800 dark:via-yellow-900 dark:to-gray-900 dark:text-yellow-200 dark:hover:text-yellow-100"
              >
                <FaCoins className="w-4 h-4 text-yellow-500 dark:text-yellow-200 drop-shadow" />
                <span>จัดสรรของดรอปปาร์ตี้</span>
              </Button>
            </Link>
            <Button
              className="w-full h-9 md:h-10 bg-gradient-to-r from-green-100 via-white to-green-50 border-0 rounded-lg flex items-center justify-center gap-2 text-green-700 font-medium text-sm shadow transition-all duration-200 hover:from-green-200 hover:to-green-100 hover:text-green-900 dark:from-gray-800 dark:via-green-900 dark:to-gray-900 dark:text-green-200 dark:hover:text-green-100"
              onClick={handleOpenModModal}
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-500 dark:text-green-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
              <span>โหลด Mod</span>
            </Button>
          </div>
        </div>
        {/* Character Grid */}
        {characters.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
            className="bg-white/30 backdrop-blur-sm rounded-2xl shadow-lg p-8 text-center mt-4 dark:bg-gray-900/80 dark:backdrop-blur-md"
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-violet-100 text-violet-500 rounded-full flex items-center justify-center dark:bg-violet-900/50 dark:text-violet-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 dark:text-gray-200">ยังไม่มีตัวละคร</h3>
            <p className="text-gray-500 mb-6 dark:text-gray-400">เริ่มต้นด้วยการเพิ่มตัวละครแรกของคุณ</p>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto rounded-xl px-6 dark:from-violet-600 dark:to-blue-600 dark:hover:from-violet-700 dark:hover:to-blue-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              เพิ่มตัวละครใหม่
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4"
          >
            {[...characters]
              .sort((a, b) => a.name.localeCompare(b.name, 'th', {sensitivity: 'base'}))
              .map((character, index) => (
              <div
                key={`character-${character.id}`}
                className="transition-all duration-200"
              >
                <CharacterCard
                  character={character}
                  onEdit={handleCharacterSelect}
                  onDelete={handleDeleteCharacter}
                  onChecklistChange={handleChecklistChange}
                />
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Add Character Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-lg min-w-[400px] bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 dark:bg-gray-900 border-0">
          <DialogHeader className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900 text-violet-600 dark:text-violet-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </div>
              เพิ่มตัวละครใหม่
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              กรอกข้อมูลตัวละครของคุณ
            </DialogDescription>
          </DialogHeader>
          {renderAddCharacterForm()}
        </DialogContent>
      </Dialog>

      {/* Edit Character Modal */}
      {renderEditCharacterForm()}

      {/* Mod Modal */}
      <Dialog open={isModModalOpen} onOpenChange={setIsModModalOpen}>
        <DialogContent className="w-full max-w-4xl max-h-[80vh] overflow-y-auto bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-0">
          <DialogHeader className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              ระบบโหลด Mod
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              ดาวน์โหลด Mod สำหรับ Dragon Nest
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add Mod Button for Leaders */}
            {userRole === 'leader' && (
              <div className="flex justify-end">
                <Button
                  onClick={() => setIsAddModModalOpen(true)}
                  className="bg-orange-500 text-white font-bold shadow hover:shadow-lg hover:scale-105 hover:bg-orange-600 transition-all duration-200 flex items-center gap-2 px-6 py-2 rounded-xl border border-transparent dark:bg-orange-600 dark:hover:bg-orange-700 dark:text-white"
                >
                  <Plus className="w-5 h-5 text-white" />
                  <span className="tracking-wide">เพิ่ม Mod ใหม่</span>
                </Button>
              </div>
            )}

            {/* Mods List */}
            <div className="grid gap-4">
              {mods.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                  <p>ยังไม่มี Mod ในระบบ</p>
                  {userRole === 'leader' && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">กดปุ่ม "เพิ่ม Mod ใหม่" เพื่อเพิ่ม Mod แรก</p>
                  )}
                </div>
              ) : (
                mods.map((mod) => (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-white via-blue-50 to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-md hover:shadow-xl transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 via-blue-600 to-violet-600 dark:from-green-300 dark:via-blue-400 dark:to-violet-400 text-lg drop-shadow-sm flex items-center gap-1">
                            <Download className="w-5 h-5 text-blue-400 dark:text-blue-300 mr-1" />
                            {mod.name}
                          </h3>
                          {userRole === 'leader' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMod(mod.id)}
                              className="text-red-500 hover:text-white hover:bg-gradient-to-r hover:from-red-400 hover:to-pink-500 dark:hover:bg-red-900/40 p-1 rounded-full transition-colors duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-200 text-sm mb-3 font-medium">{mod.description}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-semibold">
                            <svg className="w-3 h-3 mr-1 text-green-400 dark:text-green-300" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.707 6.293a1 1 0 00-1.414 0L9 11.586 7.707 10.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 000-1.414z" /></svg>
                            {modUserNames[mod.addedBy] || mod.addedBy}
                          </span>
                          <span className="text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-blue-500 dark:text-blue-300 font-semibold">
                            <svg className="w-3 h-3 mr-1 inline-block text-blue-400 dark:text-blue-300" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v1H5a3 3 0 00-3 3v8a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3h-1V3a1 1 0 10-2 0v1H8V3a1 1 0 00-2 0zm8 4a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h8z" /></svg>
                            {new Date(mod.addedAt).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownloadMod(mod.link)}
                        className="bg-gradient-to-r from-green-100 via-green-200 to-white text-green-800 font-semibold shadow hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center gap-2 px-5 py-2 rounded-xl border border-green-200 dark:bg-gradient-to-r dark:from-green-900 dark:via-green-800 dark:to-gray-900 dark:text-green-200 dark:border-green-900"
                      >
                        <Download className="w-5 h-5 text-green-600 dark:text-green-200 drop-shadow" />
                        <span className="tracking-wide">ดาวน์โหลด</span>
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Mod Modal */}
      <Dialog open={isAddModModalOpen} onOpenChange={setIsAddModModalOpen}>
        <DialogContent className="sm:max-w-lg bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 border-0">
          <DialogHeader className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-700">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300">
                <Plus className="w-5 h-5" />
              </div>
              เพิ่ม Mod ใหม่
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              กรอกข้อมูล Mod ที่ต้องการเพิ่ม
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddMod();
          }} className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="mod-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ชื่อ Mod *
                </Label>
                <Input
                  id="mod-name"
                  value={newMod.name}
                  onChange={(e) => setNewMod({ ...newMod, name: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-green-500 dark:text-gray-100"
                  placeholder="ชื่อ Mod เช่น UI Enhancement Mod"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="mod-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  รายละเอียด
                </Label>
                <textarea
                  id="mod-description"
                  value={newMod.description}
                  onChange={(e) => setNewMod({ ...newMod, description: e.target.value })}
                  className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md focus:border-green-500 focus:ring-green-500 dark:text-gray-100 resize-none"
                  rows={3}
                  placeholder="รายละเอียด Mod เช่น ปรับปรุง UI ให้สวยงามขึ้น"
                />
              </div>
              
              <div>
                <Label htmlFor="mod-link" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ลิงก์ดาวน์โหลด *
                </Label>
                <Input
                  id="mod-link"
                  type="url"
                  value={newMod.link}
                  onChange={(e) => setNewMod({ ...newMod, link: e.target.value })}
                  className="mt-1 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-green-500 focus:ring-green-500 dark:text-gray-100"
                  placeholder="https://example.com/mod-download"
                  required
                />
              </div>
            </div>

            <DialogFooter className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModModalOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all duration-200 shadow-md hover:shadow-lg dark:from-green-600 dark:to-emerald-600 dark:hover:from-green-700 dark:hover:to-emerald-700"
              >
                เพิ่ม Mod
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 