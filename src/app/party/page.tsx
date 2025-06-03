'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useParties } from '../../hooks/useParties';
import { useCharacters } from '../../hooks/useCharacters';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { PartyCard } from '../../components/PartyCard';
import { CreatePartyDialog } from '../../components/CreatePartyDialog';
import { Character, CharacterClass } from '../../types/character';
import { Party } from '../../types/party';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { PlusCircle, Users, Clock, Trash2, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '@/lib/utils';
import { SearchingPartyList } from '@/components/SearchingPartyList';

// เพิ่ม interface สำหรับ JobFilterModal
interface JobFilterModalProps {
  selectedJob: CharacterClass | 'all';
  onSelect: (job: CharacterClass | 'all') => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// เพิ่ม component JobFilterModal
function JobFilterModal({ selectedJob, onSelect, isOpen, onOpenChange }: JobFilterModalProps) {
  const jobs: { value: CharacterClass | 'all'; label: string; icon: string; color: string }[] = [
    { value: 'all', label: 'ทั้งหมด', icon: '👥', color: 'from-pink-100 to-purple-100' },
    { value: 'Sword Master', label: 'Sword Master', icon: '⚔️', color: 'from-red-100 to-rose-100' },
    { value: 'Mercenary', label: 'Mercenary', icon: '⚔️', color: 'from-red-100 to-rose-100' },
    { value: 'Bowmaster', label: 'Bowmaster', icon: '🏹', color: 'from-emerald-100 to-green-100' },
    { value: 'Acrobat', label: 'Acrobat', icon: '🏹', color: 'from-emerald-100 to-green-100' },
    { value: 'Force User', label: 'Force User', icon: '🔮', color: 'from-purple-100 to-violet-100' },
    { value: 'Elemental Lord', label: 'Elemental Lord', icon: '🔮', color: 'from-purple-100 to-violet-100' },
    { value: 'Paladin', label: 'Paladin', icon: '✨', color: 'from-sky-100 to-blue-100' },
    { value: 'Priest', label: 'Priest', icon: '✨', color: 'from-sky-100 to-blue-100' },
    { value: 'Engineer', label: 'Engineer', icon: '🔧', color: 'from-amber-100 to-yellow-100' },
    { value: 'Alchemist', label: 'Alchemist', icon: '🔧', color: 'from-amber-100 to-yellow-100' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
            กรองปาร์ตี้ตามอาชีพ
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 p-4">
          {jobs.map((job) => (
            <button
              key={job.value}
              onClick={() => {
                onSelect(job.value);
                onOpenChange(false);
              }}
              className={cn(
                "flex items-center gap-2 p-3 rounded-xl transition-all duration-200",
                "hover:scale-105 hover:shadow-lg",
                selectedJob === job.value
                  ? "bg-gradient-to-r " + job.color + " text-gray-800 shadow-md border border-gray-200"
                  : "bg-white/90 hover:bg-white border border-gray-200"
              )}
            >
              <span className="text-xl">{job.icon}</span>
              <span className="font-medium">{job.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PartyPage() {
  const router = useRouter();
  const { parties, loading: partiesLoading } = useParties();
  const { characters: userCharacters, loading: charactersLoading } = useCharacters();
  const { users, isLoading: usersLoading } = useUsers();
  const { user } = useAuth();
  const [selectedDiscord, setSelectedDiscord] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my-parties' | 'all-parties' | 'searching'>('all-parties');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<CharacterClass | 'all'>('all');
  const [isJobFilterOpen, setIsJobFilterOpen] = useState(false);

  // Group characters by Discord name
  const charactersByDiscord = useMemo(() => {
    const grouped: { [discordName: string]: any[] } = {};
    
    Object.entries(users).forEach(([uid, userData]) => {
      const discordName = userData.meta?.discord;
      if (!discordName) {
        // Skip users without Discord name
        return;
      }
      
      if (!grouped[discordName]) {
        grouped[discordName] = [];
      }
      
      if (userData.characters) {
        Object.entries(userData.characters).forEach(([charId, char]) => {
          grouped[discordName].push({
            ...char,
            id: charId,
            userId: uid
          });
        });
      }
    });
    
    return grouped;
  }, [users]);

  // ดึง characterIds ของผู้ใช้
  const myCharacterIds = useMemo(() => userCharacters ? Object.keys(userCharacters) : [], [userCharacters]);

  // กรองปาร์ตี้ตาม tab
  const filteredParties = useMemo(() => {
    let filtered = parties;
    
    // Filter by tab
    if (activeTab === 'my-parties') {
      if (!user) return [];
      filtered = parties.filter(party =>
        party.members && Object.values(party.members).some(member => member.userId === user.uid)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(party => {
        const partyName = party.name?.toLowerCase() || '';
        const leaderName = party.leader?.toLowerCase() || '';
        const nestName = party.nest?.toLowerCase() || '';
        return partyName.includes(query) || 
               leaderName.includes(query) || 
               nestName.includes(query);
      });
    }

    // Filter by selected job
    if (selectedJob !== 'all') {
      filtered = filtered.filter(party => {
        // Check if any member in the party has the selected job
        const hasJob = Object.entries(party.members || {}).some(([charId, memberData]) => {
          const userId = typeof memberData === 'boolean' 
            ? Object.entries(users).find(([, userData]) => userData.characters?.[charId])?.[0]
            : (memberData as { userId: string }).userId;
          
          if (userId && users[userId]?.characters?.[charId]) {
            return users[userId].characters[charId].class === selectedJob;
          }
          return false;
        });

        // Return parties that DON'T have the selected job
        return !hasJob;
      });
    }

    // Sort by createdAt timestamp (newest first)
    filtered.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return filtered;
  }, [activeTab, parties, user, searchQuery, selectedJob, users]);

  useEffect(() => {
    if (!partiesLoading && !charactersLoading && !usersLoading) {
      setLoading(false);
    }
  }, [partiesLoading, charactersLoading, usersLoading]);

  if (loading) {
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
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="container mx-auto px-2 sm:px-4 py-4 sm:py-8"
      >
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-200/50 p-3 sm:p-6 mb-6 sm:mb-8 relative"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1, ease: "easeOut" }}
              className="space-y-1"
            >
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">
                {activeTab === 'all-parties' ? 'ปาร์ตี้ทั้งหมด' : activeTab === 'my-parties' ? 'ปาร์ตี้ของฉัน' : 'กำลังหาปาร์ตี้'}
              </h1>
              <p className="text-gray-500 text-sm sm:text-base">เลือกปาร์ตี้ที่คุณต้องการเข้าร่วมหรือสร้างปาร์ตี้ใหม่</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.2, ease: "easeOut" }}
              className="flex flex-nowrap items-center gap-2 sm:gap-4 min-w-0"
            >
              <div className="relative flex-1 min-w-0 max-w-[140px] sm:max-w-xs">
                <input
                  type="text"
                  placeholder="ค้นหาปาร์ตี้หรือชื่อเนส..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-pink-200/50 bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-300/50 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              <CreatePartyDialog />
            </motion.div>
          </div>
          {/* Tab ปาร์ตี้ */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between mt-4 sm:mt-6 gap-3 sm:gap-2 w-full"
          >
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 items-stretch sm:items-center flex-shrink-0 min-w-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab('all-parties')}
                className={cn(
                  "px-4 py-2 rounded-xl font-semibold text-base transition-all duration-200 border shadow-sm w-full sm:w-auto",
                  activeTab === 'all-parties'
                    ? "bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200 shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-blue-50 hover:text-blue-700"
                )}
              >
                ปาร์ตี้ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('my-parties')}
                className={cn(
                  "px-4 py-2 rounded-xl font-semibold text-base transition-all duration-200 border shadow-sm w-full sm:w-auto",
                  activeTab === 'my-parties'
                    ? "bg-gradient-to-r from-green-100 to-blue-100 text-green-800 border-green-200 shadow-md"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-green-50 hover:text-green-700"
                )}
              >
                ปาร์ตี้ของฉัน
              </button>
              <button
                onClick={() => setIsJobFilterOpen(true)}
                className={cn(
                  "px-4 py-2 rounded-xl font-semibold text-base transition-all duration-200 border shadow-sm flex items-center gap-2 w-full sm:w-auto",
                  selectedJob === 'all'
                    ? "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                    : selectedJob === 'Sword Master' || selectedJob === 'Mercenary'
                      ? "bg-gradient-to-r from-red-50 to-rose-100 text-red-700 border-red-200 shadow-md hover:bg-red-100"
                      : selectedJob === 'Bowmaster' || selectedJob === 'Acrobat'
                        ? "bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-700 border-emerald-200 shadow-md hover:bg-emerald-100"
                        : selectedJob === 'Force User' || selectedJob === 'Elemental Lord'
                          ? "bg-gradient-to-r from-purple-50 to-violet-100 text-purple-700 border-purple-200 shadow-md hover:bg-purple-100"
                          : selectedJob === 'Paladin' || selectedJob === 'Priest'
                            ? "bg-gradient-to-r from-sky-50 to-blue-100 text-sky-700 border-sky-200 shadow-md hover:bg-sky-100"
                            : "bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-700 border-amber-200 shadow-md hover:bg-amber-100"
                )}
              >
                <span className="text-lg">
                  {selectedJob === 'all' ? '👥' :
                    selectedJob === 'Sword Master' || selectedJob === 'Mercenary' ? '⚔️' :
                    selectedJob === 'Bowmaster' || selectedJob === 'Acrobat' ? '🏹' :
                    selectedJob === 'Force User' || selectedJob === 'Elemental Lord' ? '🔮' :
                    selectedJob === 'Paladin' || selectedJob === 'Priest' ? '✨' :
                    '🔧'}
                </span>
                <span>
                  {selectedJob === 'all' ? 'กรองอาชีพ' : `ไม่มี ${selectedJob}`}
                </span>
              </button>
              {/* Banner เชิญชวน */}
              {activeTab !== 'searching' && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 bg-gradient-to-r from-blue-50 via-pink-50 to-purple-50 border border-blue-200 rounded-xl px-3 py-2 shadow-sm animate-pulse ml-0 sm:ml-2 flex-1 min-w-0 mt-2 sm:mt-0">
                  <span className="text-xl md:text-2xl">👉</span>
                  <span className="text-sm md:text-base font-medium text-blue-700 text-center">
                    อยากหาเพื่อนเข้าปาร์ตี้?
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('searching')}
                    className="mx-1 px-2 py-1 rounded-lg bg-gradient-to-r from-pink-400 to-blue-400 text-white font-bold shadow hover:scale-105 transition-transform text-sm md:text-base border border-pink-200"
                    tabIndex={0}
                  >
                    กำลังหาปาร์ตี้
                  </button>
                  <span className="text-sm md:text-base font-medium text-blue-700 text-center">
                    เพื่อดูรายชื่อคนที่รอเข้าปาร์ตี้!
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('searching')}
              className={cn(
                "ml-0 sm:ml-2 px-4 py-2 rounded-xl font-semibold text-base transition-all duration-200 border shadow-sm flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0",
                activeTab === 'searching'
                  ? "bg-gradient-to-r from-pink-100 to-blue-100 text-pink-800 border-pink-200 shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-pink-50 hover:text-pink-700"
              )}
            >
              กำลังหาปาร์ตี้
            </button>
          </motion.div>
        </motion.div>

        {/* Content Section */}
        {activeTab === 'searching' ? (
          <div>
            <SearchingPartyList searchQuery={searchQuery} />
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
          >
            <AnimatePresence mode="wait">
              {filteredParties.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="col-span-full flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-200/50"
                >
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
                    className="w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center"
                  >
                    <PlusCircle className="w-8 h-8 text-purple-600" />
                  </motion.div>
                  <motion.h3 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.3, ease: "easeOut" }}
                    className="text-xl font-semibold text-gray-800 mb-2"
                  >
                    {activeTab === 'all-parties' ? 'ยังไม่มีปาร์ตี้' : 'ยังไม่ได้เข้าร่วมปาร์ตี้ใด ๆ'}
                  </motion.h3>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.4, ease: "easeOut" }}
                    className="text-gray-600 mb-4"
                  >
                    {activeTab === 'all-parties' ? 'เริ่มต้นสร้างปาร์ตี้แรกของคุณ' : 'คุณยังไม่ได้เข้าร่วมปาร์ตี้ใด ๆ ด้วยตัวละครของคุณ'}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: 0.5, ease: "easeOut" }}
                  >
                    <CreatePartyDialog />
                  </motion.div>
                </motion.div>
              ) : (
                filteredParties.map((party, index) => (
                  <motion.div
                    key={party.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1, ease: "easeOut" }}
                    whileHover={{ scale: 1.02 }}
                    className="transform transition-all duration-200"
                  >
                    <PartyCard party={party} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </motion.div>
        )}

        <JobFilterModal
          selectedJob={selectedJob}
          onSelect={setSelectedJob}
          isOpen={isJobFilterOpen}
          onOpenChange={setIsJobFilterOpen}
        />
      </motion.div>
    </div>
  );
} 