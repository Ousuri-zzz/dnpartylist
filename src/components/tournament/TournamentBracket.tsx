'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

interface Participant {
  uid: string;
  characterId: string;
  characterName: string;
  class: string;
}

interface Match {
  id: string;
  round: number;
  matchNumber: number;
  player1: Participant | null;
  player2: Participant | null;
  winner: Participant | null;
  status: 'pending' | 'in_progress' | 'completed';
}

interface TournamentBracketProps {
  tournamentId: string;
  participants: Participant[];
  isGuildLeader: boolean;
  onUpdate: () => void;
}

export function TournamentBracket({ tournamentId, participants, isGuildLeader, onUpdate }: TournamentBracketProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // สร้างตารางการแข่งขัน
  const generateBrackets = async () => {
    if (!isGuildLeader) return;
    setLoading(true);
    setError(null);

    try {
      // สุ่มลำดับผู้เล่น
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
      const totalRounds = Math.ceil(Math.log2(participants.length));
      const totalMatches = Math.pow(2, totalRounds) - 1;
      const newMatches: Match[] = [];

      // สร้างแมตช์แรก
      for (let i = 0; i < shuffledParticipants.length; i += 2) {
        newMatches.push({
          id: `match-${i/2}`,
          round: 1,
          matchNumber: i/2 + 1,
          player1: shuffledParticipants[i] || null,
          player2: shuffledParticipants[i + 1] || null,
          winner: null,
          status: 'pending'
        });
      }

      // สร้างแมตช์ว่างสำหรับรอบถัดไป
      let currentRound = 2;
      let currentMatchNumber = Math.ceil(shuffledParticipants.length / 2) + 1;
      
      while (newMatches.length < totalMatches) {
        const matchesInRound = Math.pow(2, totalRounds - currentRound);
        for (let i = 0; i < matchesInRound; i++) {
          newMatches.push({
            id: `match-${newMatches.length}`,
            round: currentRound,
            matchNumber: currentMatchNumber + i,
            player1: null,
            player2: null,
            winner: null,
            status: 'pending'
          });
        }
        currentMatchNumber += matchesInRound;
        currentRound++;
      }

      // บันทึกลง Firestore
      await updateDoc(doc(firestore, 'tournaments', tournamentId), {
        matches: newMatches,
        status: 'active',
        currentRound: 1
      });

      setMatches(newMatches);
      onUpdate();
    } catch (err) {
      console.error('Error generating brackets:', err);
      setError('เกิดข้อผิดพลาดในการสร้างตารางการแข่งขัน');
    } finally {
      setLoading(false);
    }
  };

  // เลือกผู้ชนะ
  const selectWinner = async (matchId: string, winner: Participant) => {
    if (!isGuildLeader) return;
    setLoading(true);
    setError(null);

    try {
      const tournamentDoc = await getDoc(doc(firestore, 'tournaments', tournamentId));
      const tournamentData = tournamentDoc.data();
      if (!tournamentData?.matches) throw new Error('ไม่พบข้อมูลการแข่งขัน');

      const updatedMatches = [...tournamentData.matches];
      const matchIndex = updatedMatches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) throw new Error('ไม่พบข้อมูลแมตช์');

      // อัพเดทผู้ชนะ
      updatedMatches[matchIndex] = {
        ...updatedMatches[matchIndex],
        winner,
        status: 'completed'
      };

      // หาแมตช์ถัดไป
      const currentMatch = updatedMatches[matchIndex];
      const nextMatchIndex = updatedMatches.findIndex(m => 
        m.round === currentMatch.round + 1 && 
        m.matchNumber === Math.ceil(currentMatch.matchNumber / 2)
      );

      if (nextMatchIndex !== -1) {
        const nextMatch = updatedMatches[nextMatchIndex];
        const isFirstPlayer = currentMatch.matchNumber % 2 === 1;
        
        updatedMatches[nextMatchIndex] = {
          ...nextMatch,
          [isFirstPlayer ? 'player1' : 'player2']: winner,
          status: 'in_progress'
        };
      }

      // บันทึกลง Firestore
      await updateDoc(doc(firestore, 'tournaments', tournamentId), {
        matches: updatedMatches,
        currentRound: Math.max(...updatedMatches.map(m => m.round))
      });

      setMatches(updatedMatches);
      onUpdate();
    } catch (err) {
      console.error('Error selecting winner:', err);
      setError('เกิดข้อผิดพลาดในการเลือกผู้ชนะ');
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลการแข่งขัน
  useEffect(() => {
    async function loadMatches() {
      try {
        const tournamentDoc = await getDoc(doc(firestore, 'tournaments', tournamentId));
        const tournamentData = tournamentDoc.data();
        if (tournamentData?.matches) {
          setMatches(tournamentData.matches);
        }
      } catch (err) {
        console.error('Error loading matches:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูลการแข่งขัน');
      }
    }

    loadMatches();
  }, [tournamentId]);

  if (error) {
    return <div className="text-red-500 text-center py-4">{error}</div>;
  }

  return (
    <div className="mt-4">
      {matches.length === 0 ? (
        <div className="text-center py-4">
          {isGuildLeader ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={generateBrackets}
              disabled={loading}
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'กำลังสร้างตาราง...' : 'เริ่มการแข่งขัน'}
            </motion.button>
          ) : (
            <div className="text-gray-500">รอหัวกิลด์เริ่มการแข่งขัน</div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(new Set(matches.map(m => m.round))).map(round => (
            <div key={round} className="space-y-4">
              <h3 className="text-lg font-bold text-pink-700">รอบที่ {round}</h3>
              <div className="grid gap-4">
                {matches
                  .filter(m => m.round === round)
                  .map(match => (
                    <div
                      key={match.id}
                      className="bg-white/50 backdrop-blur-sm border border-pink-200 rounded-xl p-4 shadow-md"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className={`p-2 rounded-lg ${match.player1 ? 'bg-pink-50' : 'bg-gray-50'}`}>
                                {match.player1 ? (
                                  <div className="text-sm">
                                    <span className="font-medium">{match.player1.characterName}</span>
                                    <span className="text-gray-500 ml-2">({match.player1.class})</span>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-sm">รอผู้เล่น</div>
                                )}
                              </div>
                            </div>
                            <div className="text-gray-400">VS</div>
                            <div className="flex-1">
                              <div className={`p-2 rounded-lg ${match.player2 ? 'bg-pink-50' : 'bg-gray-50'}`}>
                                {match.player2 ? (
                                  <div className="text-sm">
                                    <span className="font-medium">{match.player2.characterName}</span>
                                    <span className="text-gray-500 ml-2">({match.player2.class})</span>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 text-sm">รอผู้เล่น</div>
                                )}
                              </div>
                            </div>
                          </div>
                          {match.winner && (
                            <div className="mt-2 text-sm text-green-600 font-medium">
                              ผู้ชนะ: {match.winner.characterName}
                            </div>
                          )}
                        </div>
                        {isGuildLeader && match.status === 'in_progress' && (
                          <div className="flex gap-2 ml-4">
                            {match.player1 && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => selectWinner(match.id, match.player1!)}
                                className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm"
                              >
                                เลือก {match.player1.characterName}
                              </motion.button>
                            )}
                            {match.player2 && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => selectWinner(match.id, match.player2!)}
                                className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm"
                              >
                                เลือก {match.player2.characterName}
                              </motion.button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 