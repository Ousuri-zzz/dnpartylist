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
  const { users, loading: usersLoading } = useUsers();
  const { user } = useAuth();
  const [selectedDiscord, setSelectedDiscord] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'all' | 'my'>('all');

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
    if (selectedTab === 'all') return parties;
    if (!user) return [];
    return parties.filter(party =>
      party.members && Object.values(party.members).some(member => member.userId === user.uid)
    );
  }, [selectedTab, parties, user]);

  useEffect(() => {
    if (!partiesLoading && !charactersLoading && !usersLoading) {
      setLoading(false);
    }
  }, [partiesLoading, charactersLoading, usersLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 mb-8 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">
                {selectedTab === 'all' ? 'ปาร์ตี้ทั้งหมด' : 'ปาร์ตี้ของฉัน'}
              </h1>
              <p className="text-gray-500">เลือกปาร์ตี้ที่คุณต้องการเข้าร่วมหรือสร้างปาร์ตี้ใหม่</p>
            </div>
            <div className="flex items-center gap-4">
              <CreatePartyDialog />
            </div>
          </div>
          {/* Tab ปาร์ตี้ */}
          <div className="flex space-x-4 mt-6">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2 rounded font-semibold transition border-b-2 ${selectedTab === 'all' ? 'border-violet-500 text-violet-700 bg-violet-100' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
            >
              ปาร์ตี้ทั้งหมด
            </button>
            <button
              onClick={() => setSelectedTab('my')}
              className={`px-4 py-2 rounded font-semibold transition border-b-2 ${selectedTab === 'my' ? 'border-violet-500 text-violet-700 bg-violet-100' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
            >
              ปาร์ตี้ของฉัน
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence>
            {filteredParties.map((party, index) => (
              <motion.div
                key={party.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.15, delay: index * 0.05 }}
                className="group"
              >
                <div className="relative">
                  {/* Hover effect background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-100/50 via-purple-100/50 to-blue-100/50 rounded-2xl opacity-0 group-hover:opacity-100 transform group-hover:scale-105 transition-all duration-300 -z-10" />
                  {/* Card */}
                  <PartyCard party={party} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredParties.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="col-span-full flex flex-col items-center justify-center p-12 text-center"
            >
              <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
                <PlusCircle className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {selectedTab === 'all' ? 'ยังไม่มีปาร์ตี้' : 'ยังไม่ได้เข้าร่วมปาร์ตี้ใด ๆ'}
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedTab === 'all' ? 'เริ่มต้นสร้างปาร์ตี้แรกของคุณ' : 'คุณยังไม่ได้เข้าร่วมปาร์ตี้ใด ๆ ด้วยตัวละครของคุณ'}
              </p>
              <CreatePartyDialog />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
} 