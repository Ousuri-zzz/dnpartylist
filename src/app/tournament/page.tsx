'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Plus } from 'lucide-react';
import { CreateTournamentModal } from '@/components/tournament/CreateTournamentModal';
import { JoinTournamentModal } from '@/components/tournament/JoinTournamentModal';
import { TournamentBracket } from '@/components/tournament/TournamentBracket';

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'ended';
  ownerUid: string;
  createdAt: any;
  participants: {
    uid: string;
    characterId: string;
    characterName: string;
    class: string;
  }[];
  maxParticipants: number;
  matches?: any[];
  currentRound?: number;
}

export default function TournamentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuildLeader, setIsGuildLeader] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const { user } = useAuth();

  // ตรวจสอบสิทธิ์หัวกิลด์
  useEffect(() => {
    async function checkGuildLeader() {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        const userData = userDoc.data();
        setIsGuildLeader(userData?.isGuildLeader || false);
      } catch (err) {
        console.error('Error checking guild leader status:', err);
      }
    }

    checkGuildLeader();
  }, [user]);

  // โหลดข้อมูลทัวร์นาเมนต์
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(firestore, 'tournaments'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const tournaments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Tournament[];
      setTournaments(tournaments);
      setLoading(false);
    }, (err) => {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลทัวร์นาเมนต์');
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleJoinClick = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/30 backdrop-blur-md border border-pink-200/50 shadow-lg p-4 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 drop-shadow-lg flex items-center gap-2">
              <span className="text-3xl">🏆</span>
              ทัวร์นาเมนต์
            </h2>
            {isGuildLeader && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                <span>สร้างทัวร์นาเมนต์</span>
              </motion.button>
            )}
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-gray-400">กำลังโหลด...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : tournaments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {isGuildLeader 
                  ? 'ยังไม่มีทัวร์นาเมนต์ที่กำลังดำเนินการ กดปุ่มสร้างทัวร์นาเมนต์เพื่อเริ่มต้น'
                  : 'ยังไม่มีทัวร์นาเมนต์ที่กำลังดำเนินการ'}
              </div>
            ) : (
              <div className="grid gap-4">
                {tournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="bg-white/50 backdrop-blur-sm border border-pink-200 rounded-xl p-4 shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-pink-700">{tournament.name}</h3>
                        <p className="mt-1 text-gray-600 text-sm">{tournament.description}</p>
                        <div className="mt-2 space-y-2">
                          <div className="text-sm text-gray-600">
                            สถานะ: {tournament.status === 'pending' ? 'รอเริ่ม' : tournament.status === 'active' ? 'กำลังดำเนินการ' : 'จบแล้ว'}
                          </div>
                          <div className="text-sm text-gray-600">
                            ผู้เข้าร่วม: {tournament.participants?.length || 0}/{tournament.maxParticipants} คน
                          </div>
                          {tournament.participants && tournament.participants.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm font-medium text-gray-700 mb-1">รายชื่อผู้เข้าร่วม:</div>
                              <div className="grid grid-cols-2 gap-2">
                                {tournament.participants.map((participant, index) => (
                                  <div key={index} className="text-sm text-gray-600">
                                    {participant.characterName} ({participant.class})
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {tournament.status === 'pending' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
                          onClick={() => handleJoinClick(tournament.id)}
                        >
                          เข้าร่วม
                        </motion.button>
                      )}
                    </div>

                    {/* แสดงตารางการแข่งขัน */}
                    {tournament.status === 'active' && (
                      <TournamentBracket
                        tournamentId={tournament.id}
                        participants={tournament.participants || []}
                        isGuildLeader={isGuildLeader}
                        onUpdate={() => {
                          // รีโหลดข้อมูลทัวร์นาเมนต์
                          const tournamentDoc = getDoc(doc(firestore, 'tournaments', tournament.id));
                          tournamentDoc.then(doc => {
                            if (doc.exists()) {
                              const updatedTournament = { id: doc.id, ...doc.data() } as Tournament;
                              setTournaments(prev => 
                                prev.map(t => t.id === tournament.id ? updatedTournament : t)
                              );
                            }
                          });
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateTournamentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={() => setIsCreateModalOpen(false)}
      />

      {selectedTournamentId && (
        <JoinTournamentModal
          isOpen={!!selectedTournamentId}
          onClose={() => setSelectedTournamentId(null)}
          onSubmit={() => setSelectedTournamentId(null)}
          tournamentId={selectedTournamentId}
        />
      )}
    </div>
  );
} 