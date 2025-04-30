'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useParties } from '../../hooks/useParties';
import { useCharacters } from '../../hooks/useCharacters';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import { PartyCard } from '../../components/PartyCard';
import { CreatePartyDialog } from '../../components/CreatePartyDialog';
import { Character } from '../../types/character';
import { Party } from '../../types/party';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { PlusCircle } from 'lucide-react';

export default function PartyPage() {
  const router = useRouter();
  const { parties, loading: partiesLoading } = useParties();
  const { characters: userCharacters, loading: charactersLoading } = useCharacters();
  const { users, isLoading: usersLoading } = useUsers();
  const { user } = useAuth();
  const [selectedDiscord, setSelectedDiscord] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    if (selectedTab === 'my') {
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

    // Sort by createdAt timestamp (newest first)
    filtered.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return filtered;
  }, [selectedTab, parties, user, searchQuery]);

  useEffect(() => {
    if (!partiesLoading && !charactersLoading && !usersLoading) {
      setLoading(false);
    }
  }, [partiesLoading, charactersLoading, usersLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div
          className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="container mx-auto px-4 py-8"
      >
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 relative"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.1, ease: "easeOut" }}
              className="space-y-1"
            >
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">
                {selectedTab === 'all' ? 'ปาร์ตี้ทั้งหมด' : 'ปาร์ตี้ของฉัน'}
              </h1>
              <p className="text-gray-500">เลือกปาร์ตี้ที่คุณต้องการเข้าร่วมหรือสร้างปาร์ตี้ใหม่</p>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.2, ease: "easeOut" }}
              className="flex items-center gap-4"
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาปาร์ตี้หรือชื่อเนส..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
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
            className="flex gap-2 mt-6"
          >
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2 rounded font-semibold transition-all duration-200 border-b-2 ${selectedTab === 'all' ? 'border-violet-500 text-violet-700 bg-violet-100' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
            >
              ปาร์ตี้ทั้งหมด
            </button>
            <button
              onClick={() => setSelectedTab('my')}
              className={`px-4 py-2 rounded font-semibold transition-all duration-200 border-b-2 ${selectedTab === 'my' ? 'border-violet-500 text-violet-700 bg-violet-100' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
            >
              ปาร์ตี้ของฉัน
            </button>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="wait">
            {filteredParties.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="col-span-full flex flex-col items-center justify-center p-12 text-center bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg"
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
                  {selectedTab === 'all' ? 'ยังไม่มีปาร์ตี้' : 'ยังไม่ได้เข้าร่วมปาร์ตี้ใด ๆ'}
                </motion.h3>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.4, ease: "easeOut" }}
                  className="text-gray-600 mb-4"
                >
                  {selectedTab === 'all' ? 'เริ่มต้นสร้างปาร์ตี้แรกของคุณ' : 'คุณยังไม่ได้เข้าร่วมปาร์ตี้ใด ๆ ด้วยตัวละครของคุณ'}
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
      </motion.div>
    </div>
  );
} 