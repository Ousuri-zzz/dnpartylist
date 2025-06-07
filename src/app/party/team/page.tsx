'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useUsers } from '../../../hooks/useUsers';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, X, Users, Sword, Heart, Shield, Target, Flame, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SearchingPartyList } from '@/components/SearchingPartyList';
import { Dialog as HeadlessDialog } from '@headlessui/react';

interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  stats: {
    atk: number;
    hp: number;
    pdef: number;
    mdef: number;
    cri: number;
    ele: number;
    fd: number;
  };
}

interface DiscordUser {
  discordName: string;
  characters: Character[];
}

// เพิ่ม mapping สีอาชีพ
const classColors: Record<string, string> = {
  'Force User': 'text-fuchsia-500',
  'Elemental Lord': 'text-fuchsia-500',
  'Bowmaster': 'text-lime-500',
  'Acrobat': 'text-lime-500',
  'Sword Master': 'text-rose-500',
  'Mercenary': 'text-rose-500',
  'Paladin': 'text-cyan-500',
  'Priest': 'text-cyan-500',
  'Engineer': 'text-amber-500',
  'Alchemist': 'text-amber-500',
};
const getClassColor = (className: string) => classColors[className] || 'text-gray-600';

export default function TeamPage() {
  const router = useRouter();
  const { users } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscordNames, setSelectedDiscordNames] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedDiscordNames');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [];
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [availableDiscords, setAvailableDiscords] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'team' | 'searching' | 'summary'>('team');

  // เพิ่ม state สำหรับเก็บตัวละครต้นฉบับของแต่ละ Discord
  const [originalCharacters, setOriginalCharacters] = useState<Record<string, Character[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('originalCharacters');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return {};
  });

  // เพิ่ม state สำหรับเก็บตัวละครที่ถูกลบ (per Discord)
  const [removedCharacters, setRemovedCharacters] = useState<Record<string, Character[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('removedCharacters');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return {};
  });

  // เพิ่ม state สำหรับเก็บหมายเลขทีมของแต่ละตัวละครในแต่ละ Discord
  const [teamNumbers, setTeamNumbers] = useState<Record<string, Record<string, number>>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamNumbers');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return {};
  });
  const [teamSelectOpen, setTeamSelectOpen] = useState<{ discord: string; charId: string } | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // --- เพิ่ม useRef สำหรับ popup team select ---
  const teamSelectRef = useRef<HTMLDivElement | null>(null);

  // เพิ่ม state สำหรับชื่อทีมแต่ละ teamNum (โหลดจาก localStorage)
  const [teamNames, setTeamNames] = useState<Record<number, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamNames');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return {};
  });

  // บันทึก teamNames ลง localStorage ทุกครั้งที่ teamNames เปลี่ยน
  useEffect(() => {
    localStorage.setItem('teamNames', JSON.stringify(teamNames));
  }, [teamNames]);

  // Process users data to get available Discord names
  useEffect(() => {
    const discordNames = new Set<string>();
    Object.values(users).forEach(user => {
      if (user.meta?.discord) {
        discordNames.add(user.meta.discord);
      }
    });
    setAvailableDiscords(Array.from(discordNames));
  }, [users]);

  // Filter available Discord names based on search query
  const filteredDiscords = (() => {
    if (!searchQuery.trim()) return availableDiscords;
    const lower = searchQuery.toLowerCase();
    // 1. Discord name match
    let matches = availableDiscords.filter(discord => discord.toLowerCase().includes(lower));
    // 2. Character name match
    Object.values(users).forEach(user => {
      if (user.meta?.discord && user.characters) {
        const hasChar = Object.values(user.characters).some(
          (char: any) => char.name && char.name.toLowerCase().includes(lower)
        );
        if (hasChar && !matches.includes(user.meta.discord)) {
          matches.push(user.meta.discord);
        }
      }
    });
    return matches;
  })();

  const selectedDiscords = useMemo(() => {
    return selectedDiscordNames.map(discordName => {
      const userData = Object.values(users).find(user => user.meta?.discord === discordName);
      if (!userData?.characters) return { discordName, characters: [] };
      const removedIds = new Set((removedCharacters[discordName] || []).map(c => c.id));
      const characters = Object.entries(userData.characters || {})
        .filter(([id]) => !removedIds.has(id))
        .map(([id, char]: [string, any]) => ({
          id,
          name: char.name,
          class: char.class,
          level: char.level,
          stats: {
            atk: Number(char.stats?.atk) || 0,
            hp: Number(char.stats?.hp) || 0,
            pdef: Number(char.stats?.pdef) || 0,
            mdef: Number(char.stats?.mdef) || 0,
            cri: Number(char.stats?.cri) || 0,
            ele: Number(char.stats?.ele) || 0,
            fd: Number(char.stats?.fd) || 0,
          }
        }));
      return { discordName, characters };
    });
  }, [users, removedCharacters, selectedDiscordNames]);

  const handleAddDiscord = (discordName: string) => {
    if (selectedDiscordNames.includes(discordName)) {
      toast.error('Discord นี้ถูกเพิ่มไปแล้ว');
      return;
    }
    const userData = Object.values(users).find(user => user.meta?.discord === discordName);
    if (!userData?.characters) {
      toast.error('ไม่พบข้อมูลตัวละคร');
      return;
    }
    setSelectedDiscordNames([...selectedDiscordNames, discordName]);
    setOriginalCharacters(prev => ({ ...prev, [discordName]: Object.entries(userData.characters || {}).map(([id, char]: [string, any]) => ({
      id,
      name: char.name,
      class: char.class,
      level: char.level,
      stats: {
        atk: Number(char.stats?.atk) || 0,
        hp: Number(char.stats?.hp) || 0,
        pdef: Number(char.stats?.pdef) || 0,
        mdef: Number(char.stats?.mdef) || 0,
        cri: Number(char.stats?.cri) || 0,
        ele: Number(char.stats?.ele) || 0,
        fd: Number(char.stats?.fd) || 0,
      }
    })) }));
    setIsAddDialogOpen(false);
    setSearchQuery('');
  };

  const handleRemoveDiscord = (discordName: string) => {
    setSelectedDiscordNames(prev => prev.filter(name => name !== discordName));
    setRemovedCharacters(prev => {
      const newRemoved = { ...prev };
      delete newRemoved[discordName];
      return newRemoved;
    });
    setTeamNumbers(prev => {
      const newTeam = { ...prev };
      delete newTeam[discordName];
      return newTeam;
    });
  };

  // ฟังก์ชันลบตัวละครรายตัว
  const handleRemoveCharacter = (discordName: string, charId: string) => {
    const charToRemove = selectedDiscords.find(d => d.discordName === discordName)?.characters.find(c => c.id === charId);
    if (!charToRemove) return;
    setRemovedCharacters(prevRemoved => ({
      ...prevRemoved,
      [discordName]: [...(prevRemoved[discordName] || []), charToRemove]
    }));
    // ลบ teamNumbers ของ charId นี้
    setTeamNumbers(prevTeam => {
      const newTeam = { ...prevTeam };
      if (newTeam[discordName]) {
        delete newTeam[discordName][charId];
      }
      return newTeam;
    });
  };

  // ฟังก์ชันคืนค่าตัวละครทั้งหมด (ใช้ removedCharacters)
  const handleRestoreAllCharacters = (discordName: string) => {
    setRemovedCharacters(prev => {
      const newRemoved = { ...prev };
      delete newRemoved[discordName];
      return newRemoved;
    });
  };

  // Save to localStorage when selectedDiscords changes
  useEffect(() => {
    localStorage.setItem('selectedDiscordNames', JSON.stringify(selectedDiscordNames));
  }, [selectedDiscordNames]);

  // บันทึก teamNumbers ลง localStorage ทุกครั้งที่เปลี่ยน
  useEffect(() => {
    localStorage.setItem('teamNumbers', JSON.stringify(teamNumbers));
  }, [teamNumbers]);

  // sync removedCharacters กับ localStorage
  useEffect(() => {
    localStorage.setItem('removedCharacters', JSON.stringify(removedCharacters));
  }, [removedCharacters]);

  // sync originalCharacters กับ localStorage
  useEffect(() => {
    localStorage.setItem('originalCharacters', JSON.stringify(originalCharacters));
  }, [originalCharacters]);

  // --- handle click outside popup ---
  useEffect(() => {
    if (!teamSelectOpen) return;
    function handleClick(e: MouseEvent) {
      if (teamSelectRef.current && !teamSelectRef.current.contains(e.target as Node)) {
        setTeamSelectOpen(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [teamSelectOpen]);

  return (
    <div className="min-h-screen">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="container mx-auto px-2 sm:px-4 py-4 sm:py-8"
      >
        {/* Header Section (เหมือน party/page.tsx) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-200/50 p-2 sm:p-6 mb-6 sm:mb-8 relative w-full max-w-full"
        >
          {/* แถวบน: title/subtitle + search+button */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 w-full">
            <div className="space-y-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">
                จัดทีม
              </h1>
              <p className="text-gray-500 text-sm sm:text-base">จัดการทีมและดูข้อมูลตัวละครของสมาชิก</p>
            </div>
            <div className="flex flex-nowrap items-center gap-2 sm:gap-4 min-w-0">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 px-4 py-2 rounded-xl font-semibold text-base shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    เพิ่มสมาชิกทีม
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-pink-200/60 p-6 animate-fade-in">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
                      <Users className="w-6 h-6 text-pink-400" />
                      เพิ่มสมาชิกทีม
                    </DialogTitle>
                  </DialogHeader>
                  <div className="relative mt-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-300" />
                    <Input
                      type="text"
                      placeholder="ค้นหา Discord หรือชื่อ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 py-3 rounded-lg border border-pink-200/60 bg-white/90 focus:outline-none focus:ring-2 focus:ring-pink-300/50 focus:border-transparent transition-all duration-200 text-base shadow-sm"
                    />
                  </div>
                  <div className="mt-6 max-h-[300px] overflow-y-auto space-y-2">
                    {filteredDiscords.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                        <Users className="w-8 h-8 mb-2" />
                        <span className="text-base">ไม่พบ Discord ที่ค้นหา</span>
                      </div>
                    ) : (
                      filteredDiscords.map((discord) => (
                        <button
                          key={discord}
                          onClick={() => handleAddDiscord(discord)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-pink-100 bg-white/80 hover:bg-pink-50 transition-colors shadow-sm text-left"
                        >
                          <Users className="w-5 h-5 text-pink-400" />
                          <span className="font-medium text-gray-700 flex-1">{discord}</span>
                          <Plus className="w-5 h-5 text-pink-400 ml-auto" />
                        </button>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {/* แถวล่าง: tab bar */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-2 sm:mt-6 gap-2 sm:gap-2 w-full overflow-x-auto"
          >
            <div className="flex flex-row gap-2 items-center w-full sm:w-auto flex-nowrap">
              <button
                type="button"
                onClick={() => router.push('/party')}
                className={cn(
                  "px-4 py-2 rounded-xl font-semibold text-base transition-all duration-200 border shadow-sm",
                  "bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-700"
                )}
              >
                ปาร์ตี้ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('team')}
                className={cn(
                  "px-4 py-2 rounded-xl font-semibold text-base transition-all duration-200 border shadow-sm flex items-center gap-2 w-full sm:w-auto",
                  activeTab === 'team'
                    ? "bg-gradient-to-r from-indigo-100 to-blue-200 text-indigo-800 border-indigo-200 shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-indigo-50 hover:text-indigo-700"
                )}
              >
                <span className="text-lg"><Users className="w-5 h-5" /></span>
                <span>จัดทีม</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('summary')}
                className={cn(
                  "px-4 py-2 rounded-xl font-semibold text-base transition-all duration-200 border shadow-sm flex items-center gap-2 w-full sm:w-auto",
                  activeTab === 'summary'
                    ? "bg-gradient-to-r from-green-100 to-blue-200 text-green-800 border-green-200 shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-700"
                )}
              >
                <span className="text-lg"><Users className="w-5 h-5" /></span>
                <span>สรุปทีม</span>
              </button>
            </div>
            <div className="w-full mt-3 text-gray-500 text-sm text-center whitespace-normal break-words sm:w-auto sm:ml-2 sm:text-left">
              {/* ข้อความอธิบายสำหรับ PC (ต่อท้ายปุ่ม/แท็บ แถวเดียว) */}
              <span className="hidden sm:inline text-gray-500 text-sm ml-2 truncate max-w-[400px]">ใช้สำหรับรวมรายชื่อสมาชิกทีมที่คุณสนใจ เพื่อวางแผนหรือจัดกลุ่มได้สะดวกบนเครื่องของคุณเอง ข้อมูลจะถูกบันทึกไว้ในอุปกรณ์นี้เท่านั้น</span>
            </div>
            {/* ข้อความอธิบายสำหรับมือถือ (ใต้ปุ่ม/แท็บ) */}
            <div className="w-full mt-3 text-gray-500 text-sm text-center whitespace-normal break-words sm:hidden">
              ใช้สำหรับรวมรายชื่อสมาชิกทีมที่คุณสนใจ เพื่อวางแผนหรือจัดกลุ่มได้สะดวกบนเครื่องของคุณเอง ข้อมูลจะถูกบันทึกไว้ในอุปกรณ์นี้เท่านั้น
            </div>
          </motion.div>
        </motion.div>

        {/* Content Section */}
        {activeTab === 'team' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start"
          >
            <AnimatePresence>
              {selectedDiscords.map((discord) => {
                const hasRemoved = removedCharacters[discord.discordName]?.length > 0;
                return (
                  <motion.div
                    key={discord.discordName}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="rounded-3xl shadow-xl border border-pink-100 bg-white/90 backdrop-blur-md overflow-hidden transition-transform hover:scale-[1.015] group relative"
                  >
                    {/* Discord Header */}
                    <div className="relative px-6 py-4 flex items-center justify-between bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 backdrop-blur-md bg-opacity-70 rounded-t-3xl border-b border-pink-200/40 shadow-sm">
                      <h3 className="text-xl font-extrabold text-indigo-700 drop-shadow-sm flex items-center gap-2">
                        {discord.discordName}
                      </h3>
                      <div className="flex items-center gap-2 ml-auto">
                        {hasRemoved && (
                          <button
                            onClick={() => handleRestoreAllCharacters(discord.discordName)}
                            className="px-3 py-1 rounded-full bg-gradient-to-r from-green-400 to-blue-400 text-white text-xs font-semibold shadow hover:from-green-500 hover:to-blue-500 transition-colors"
                          >
                            คืนค่าตัวละครทั้งหมด
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveDiscord(discord.discordName)}
                          className="bg-white/30 hover:bg-white/60 text-white hover:text-pink-600 rounded-full p-1.5 shadow transition-colors"
                          title="ลบสมาชิกนี้"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Characters List */}
                    <div className="p-5 space-y-5">
                      {[...discord.characters]
                        .sort((a, b) => {
                          const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                          if (nameCompare !== 0) return nameCompare;
                          const aIdNum = Number(a.id);
                          const bIdNum = Number(b.id);
                          if (!isNaN(aIdNum) && !isNaN(bIdNum)) return aIdNum - bIdNum;
                          return a.id.localeCompare(b.id);
                        })
                        .map((char, idx) => (
                          <div
                            key={char.id}
                            className="rounded-2xl border border-gray-100 bg-white/80 shadow-sm px-4 py-4 flex flex-col gap-2 relative"
                          >
                            {/* Badge อาชีพ + ชื่อ */}
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-100 to-purple-100 border ${getClassColor(char.class)} shadow-sm`}>
                                {char.class}
                              </span>
                              <span className="font-bold text-gray-800 text-base truncate">{char.name}</span>
                              <button
                                className="ml-auto px-3 py-1 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 text-white text-xs font-semibold shadow hover:from-pink-500 hover:to-purple-500 transition-colors"
                                style={{ minWidth: '80px' }}
                                onClick={() => setTeamSelectOpen({ discord: discord.discordName, charId: char.id })}
                              >
                                {teamNumbers[discord.discordName]?.[char.id]
                                  ? <span className="font-bold">TEAM {teamNumbers[discord.discordName][char.id]}</span>
                                  : 'SET TEAM'}
                              </button>
                              {/* ปุ่มลบตัวละคร */}
                              <button
                                onClick={() => handleRemoveCharacter(discord.discordName, char.id)}
                                className="ml-2 p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-500 hover:text-red-700 transition-colors"
                                title="ลบตัวละครนี้"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            {/* Popup เลือกหมายเลขทีม */}
                            {teamSelectOpen && teamSelectOpen.discord === discord.discordName && teamSelectOpen.charId === char.id && (
                              <div
                                ref={teamSelectRef}
                                className="absolute z-20 top-12 right-0 bg-white border border-pink-200 rounded-xl shadow-lg p-2 flex gap-1 flex-nowrap max-w-xs w-full min-w-[220px] sm:min-w-[260px] animate-fade-in"
                              >
                                {[1,2,3,4,5,6].map(num => (
                                  <button
                                    key={num}
                                    className={`aspect-square w-9 h-9 rounded-full flex items-center justify-center font-bold text-base border-2 transition-all duration-150
                                      ${teamNumbers[discord.discordName]?.[char.id] === num
                                        ? 'bg-gradient-to-br from-pink-400 to-purple-400 text-white border-pink-400 shadow-lg scale-105 ring-2 ring-pink-200'
                                        : 'bg-white text-pink-500 border-pink-200 hover:bg-pink-50 hover:scale-105'}
                                    `}
                                    onClick={() => {
                                      if (teamNumbers[discord.discordName]?.[char.id] === num) {
                                        setTeamSelectOpen(null);
                                        return;
                                      }
                                      setTeamNumbers(prev => ({
                                        ...prev,
                                        [discord.discordName]: {
                                          ...(prev[discord.discordName] || {}),
                                          [char.id]: num
                                        }
                                      }));
                                      setTeamSelectOpen(null);
                                    }}
                                  >
                                    {num}
                                  </button>
                                ))}
                                {teamNumbers[discord.discordName]?.[char.id] && (
                                  <button
                                    className="ml-1 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-400 transition"
                                    onClick={() => {
                                      setTeamNumbers(prev => {
                                        const newObj = { ...prev };
                                        if (newObj[discord.discordName]) {
                                          delete newObj[discord.discordName][char.id];
                                        }
                                        return newObj;
                                      });
                                      setTeamSelectOpen(null);
                                    }}
                                    title="ลบหมายเลขทีม"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                            {/* Divider */}
                            <div className="border-b border-dashed border-pink-100 mb-2" />
                            {/* Stats grid 3 col */}
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div className="flex flex-col items-center bg-pink-50/60 rounded-xl py-2">
                                <Sword className="w-5 h-5 text-pink-400 mb-1" />
                                <span className="text-[11px] text-gray-500 font-medium">ATK</span>
                                <span className="font-bold text-pink-600 text-base">{char.stats.atk ? char.stats.atk.toLocaleString() : '-'}</span>
                              </div>
                              <div className="flex flex-col items-center bg-red-50/60 rounded-xl py-2">
                                <Heart className="w-5 h-5 text-red-400 mb-1" />
                                <span className="text-[11px] text-gray-500 font-medium">HP</span>
                                <span className="font-bold text-red-500 text-base">{char.stats.hp ? char.stats.hp.toLocaleString() : '-'}</span>
                              </div>
                              <div className="flex flex-col items-center bg-blue-50/60 rounded-xl py-2">
                                <Shield className="w-5 h-5 text-blue-400 mb-1" />
                                <span className="text-[11px] text-gray-500 font-medium">DEF</span>
                                <span className="font-bold text-blue-500 text-base">P{char.stats.pdef ? char.stats.pdef + '%' : '-'}<span className="font-bold text-purple-500">{char.stats.mdef ? ' M' + char.stats.mdef + '%' : ''}</span></span>
                              </div>
                              <div className="flex flex-col items-center bg-yellow-50/60 rounded-xl py-2">
                                <Target className="w-5 h-5 text-yellow-400 mb-1" />
                                <span className="text-[11px] text-gray-500 font-medium">CRI%</span>
                                <span className="font-bold text-yellow-500 text-base">{char.stats.cri ? char.stats.cri + '%' : '-'}</span>
                              </div>
                              <div className="flex flex-col items-center bg-purple-50/60 rounded-xl py-2">
                                <Flame className="w-5 h-5 text-purple-400 mb-1" />
                                <span className="text-[11px] text-gray-500 font-medium">ELE%</span>
                                <span className="font-bold text-purple-500 text-base">{char.stats.ele ? char.stats.ele + '%' : '-'}</span>
                              </div>
                              <div className="flex flex-col items-center bg-orange-50/60 rounded-xl py-2">
                                <Zap className="w-5 h-5 text-orange-400 mb-1" />
                                <span className="text-[11px] text-gray-500 font-medium">FD%</span>
                                <span className="font-bold text-orange-500 text-base">{char.stats.fd ? char.stats.fd + '%' : '-'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : activeTab === 'summary' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full px-2">
              {[1,2,3,4,5,6,7,8,9].map(teamNum => {
                // รวมตัวละครทุก Discord ที่เลือก teamNum นี้
                const chars = selectedDiscords.flatMap(discord => {
                  const entries = Object.entries(teamNumbers[discord.discordName] || {})
                    .filter(([_, num]) => num === teamNum);
                  return entries.map(([charId]) => {
                    const char = discord.characters.find(c => c.id === charId);
                    return char ? { ...char, discordName: discord.discordName, teamNum } : null;
                  }).filter(Boolean);
                });
                if (chars.length === 0) return null;
                return (
                  <div key={teamNum} className="rounded-2xl shadow-xl border border-indigo-100 bg-white/80 backdrop-blur-md p-5 h-full flex flex-col min-h-[180px] min-w-0 overflow-x-auto">
                    <div className="text-lg font-extrabold text-pink-600 mb-1 tracking-wide">TEAM {teamNum}</div>
                    <input
                      className="text-pink-700 text-sm font-semibold mb-4 bg-pink-50 border border-pink-200 rounded px-3 py-1 focus:outline-none focus:border-pink-400 transition w-full text-left placeholder:text-pink-300"
                      placeholder="ตั้งชื่อทีม (ไม่บังคับ)"
                      value={teamNames[teamNum] || ''}
                      onChange={e => setTeamNames(prev => ({ ...prev, [teamNum]: e.target.value }))}
                      maxLength={30}
                    />
                    <div className="flex flex-col gap-3 w-full">
                      {chars.map(char => (
                        char && (
                          <div
                            key={char.id + char.discordName}
                            className="flex flex-nowrap items-center gap-3 bg-white/90 rounded-xl px-4 py-2 border border-indigo-100 shadow-sm min-w-0"
                            style={{ minWidth: 0 }}
                          >
                            <span className="font-bold text-indigo-600 text-base whitespace-nowrap truncate max-w-[120px] sm:max-w-[180px]">{char.discordName}</span>
                            <span className="font-bold text-gray-800 text-base whitespace-nowrap truncate max-w-[120px] sm:max-w-[180px]">{char.name}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-pink-100 to-purple-100 border ${getClassColor(char.class)} shadow-sm whitespace-nowrap max-w-[120px] truncate`}>{char.class}</span>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* ถ้าไม่มีข้อมูลเลย */}
              {selectedDiscords.every(discord => !teamNumbers[discord.discordName] || Object.keys(teamNumbers[discord.discordName]).length === 0) && (
                <div className="text-gray-400 text-center py-8 col-span-full">ยังไม่มีตัวละครที่เลือกทีม</div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 bg-white rounded-2xl shadow-lg border border-pink-200/50"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 flex items-center justify-center">
              <Plus className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">ยังไม่มีสมาชิกในทีม</h3>
            <p className="text-gray-600">กดปุ่ม "เพิ่ม Discord" เพื่อเพิ่มสมาชิกในทีม</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}