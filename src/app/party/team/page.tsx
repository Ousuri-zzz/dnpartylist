'use client';

import { useState, useEffect } from 'react';
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

export default function TeamPage() {
  const router = useRouter();
  const { users } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiscords, setSelectedDiscords] = useState<DiscordUser[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedDiscords');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [];
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [availableDiscords, setAvailableDiscords] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'team' | 'searching'>('team');

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

  const handleAddDiscord = (discordName: string) => {
    if (selectedDiscords.some(d => d.discordName === discordName)) {
      toast.error('Discord นี้ถูกเพิ่มไปแล้ว');
      return;
    }

    const userData = Object.values(users).find(user => user.meta?.discord === discordName);
    if (!userData?.characters) {
      toast.error('ไม่พบข้อมูลตัวละคร');
      return;
    }

    const characters: Character[] = Object.entries(userData.characters).map(([id, char]: [string, any]) => ({
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

    setSelectedDiscords([...selectedDiscords, { discordName, characters }]);
    setIsAddDialogOpen(false);
    setSearchQuery('');
  };

  const handleRemoveDiscord = (discordName: string) => {
    setSelectedDiscords(selectedDiscords.filter(d => d.discordName !== discordName));
  };

  // Save to localStorage when selectedDiscords changes
  useEffect(() => {
    localStorage.setItem('selectedDiscords', JSON.stringify(selectedDiscords));
  }, [selectedDiscords]);

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
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-200/50 p-3 sm:p-6 mb-6 sm:mb-8 relative"
        >
          {/* แถวบน: title/subtitle + search+button */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
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
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-4 sm:mt-6 gap-3 sm:gap-2 w-full"
          >
            <div className="flex flex-row gap-2 items-center w-full">
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
              <span className="text-gray-500 text-sm ml-2">ใช้สำหรับรวมรายชื่อสมาชิกทีมที่คุณสนใจ เพื่อวางแผนหรือจัดกลุ่มได้สะดวกบนเครื่องของคุณเอง ข้อมูลจะถูกบันทึกไว้ในอุปกรณ์นี้เท่านั้น</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Content Section */}
        {activeTab === 'team' ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            <AnimatePresence>
              {selectedDiscords.map((discord) => (
                <motion.div
                  key={discord.discordName}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-xl shadow-lg border border-pink-100 overflow-hidden"
                >
                  {/* Discord Header */}
                  <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 text-white relative">
                    <h3 className="text-lg font-semibold">{discord.discordName}</h3>
                    <button
                      onClick={() => handleRemoveDiscord(discord.discordName)}
                      className="absolute top-4 right-4 text-white/80 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Characters List */}
                  <div className="p-4 space-y-4">
                    {discord.characters.map((char) => (
                      <div
                        key={char.id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-800">{char.name}</h4>
                            <p className="text-sm text-gray-600">{char.class}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                            <Sword className="w-4 h-4 text-pink-500" />
                            <span className="font-bold text-gray-700">ATK:</span>
                            <span className="font-semibold text-pink-600">{char.stats.atk ? char.stats.atk.toLocaleString() : '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                            <Heart className="w-4 h-4 text-red-400" />
                            <span className="font-bold text-gray-700">HP:</span>
                            <span className="font-semibold text-red-500">{char.stats.hp ? char.stats.hp.toLocaleString() : '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                            <Shield className="w-4 h-4 text-blue-400" />
                            <span className="font-bold text-gray-700">DEF:</span>
                            <span className="font-semibold text-blue-500">P{char.stats.pdef !== undefined && char.stats.pdef !== 0 ? char.stats.pdef + '%' : '-'}</span>
                            <span className="text-gray-400 mx-0.5">/</span>
                            <span className="font-semibold text-purple-500">M{char.stats.mdef !== undefined && char.stats.mdef !== 0 ? char.stats.mdef + '%' : '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                            <Target className="w-4 h-4 text-yellow-400" />
                            <span className="font-bold text-gray-700">CRI%:</span>
                            <span className="font-semibold text-yellow-500">{char.stats.cri !== undefined && char.stats.cri !== 0 ? char.stats.cri + '%' : '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                            <Flame className="w-4 h-4 text-purple-400" />
                            <span className="font-bold text-gray-700">ELE%:</span>
                            <span className="font-semibold text-purple-500">{char.stats.ele !== undefined && char.stats.ele !== 0 ? char.stats.ele + '%' : '-'}</span>
                          </div>
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                            <Zap className="w-4 h-4 text-orange-400" />
                            <span className="font-bold text-gray-700">FD%:</span>
                            <span className="font-semibold text-orange-500">{char.stats.fd !== undefined && char.stats.fd !== 0 ? char.stats.fd + '%' : '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
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