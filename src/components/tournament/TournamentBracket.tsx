'use client';

import { useState, useEffect, Fragment } from 'react';
import { motion } from 'framer-motion';
import { getDatabase, ref, get, update } from 'firebase/database';
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

interface GroupMatch {
  id: string;
  group: number;
  player1: Participant;
  player2: Participant;
  winner: Participant | null;
  status: 'pending' | 'completed';
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
  const [groupStage, setGroupStage] = useState<{ groups: Participant[][], matches: GroupMatch[], results: Record<string, number> } | null>(null);
  const [groupStageDone, setGroupStageDone] = useState(false);

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

      // บันทึกลง Realtime Database
      const db = getDatabase();
      const tournamentRef = ref(db, `tournaments/${tournamentId}`);
      await update(tournamentRef, {
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
      const db = getDatabase();
      const tournamentRef = ref(db, `tournaments/${tournamentId}`);
      const snap = await get(tournamentRef);
      const tournamentData = snap.val();
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

      // บันทึกลง Realtime Database
      await update(tournamentRef, {
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

  // ฟังก์ชันสร้าง Group Stage
  const generateGroupStage = async () => {
    if (!isGuildLeader) return;
    setLoading(true);
    setError(null);
    try {
      // แบ่งกลุ่ม (8 กลุ่ม)
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const groupCount = 8;
      const groups: Participant[][] = Array.from({ length: groupCount }, () => []);
      shuffled.forEach((p, i) => groups[i % groupCount].push(p));
      // สร้างแมตช์ในกลุ่ม (พบกันหมด)
      let matches: GroupMatch[] = [];
      groups.forEach((group, gIdx) => {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            matches.push({
              id: `g${gIdx}-m${i}-${j}`,
              group: gIdx + 1,
              player1: group[i],
              player2: group[j],
              winner: null,
              status: 'pending',
            });
          }
        }
      });
      // บันทึกลง Realtime Database
      const db = getDatabase();
      const tournamentRef = ref(db, `tournaments/${tournamentId}`);
      await update(tournamentRef, {
        groupStage: { groups, matches, results: {} },
        status: 'group_stage',
      });
      setGroupStage({ groups, matches, results: {} });
      setGroupStageDone(false);
      onUpdate();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสร้างรอบแบ่งกลุ่ม');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันเลือกผู้ชนะในกลุ่ม
  const selectGroupWinner = async (matchId: string, winner: Participant) => {
    if (!isGuildLeader || !groupStage) return;
    setLoading(true);
    setError(null);
    try {
      const newMatches = groupStage.matches.map(m =>
        m.id === matchId ? { ...m, winner, status: 'completed' as const } : m
      );
      // คำนวณคะแนน
      const results: Record<string, number> = { ...groupStage.results };
      if (winner.uid) {
        results[winner.uid] = (results[winner.uid] || 0) + 1;
      }
      const db = getDatabase();
      const tournamentRef = ref(db, `tournaments/${tournamentId}`);
      await update(tournamentRef, {
        groupStage: {
          ...groupStage,
          matches: newMatches,
          results
        }
      });
      setGroupStage({ ...groupStage, matches: newMatches, results });
      // ตรวจสอบว่าจบรอบกลุ่มหรือยัง
      if (newMatches.every(m => m.status === 'completed')) {
        setGroupStageDone(true);
      }
      onUpdate();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเลือกผู้ชนะในกลุ่ม');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสร้าง bracket จากผู้ที่ผ่านรอบกลุ่ม
  const startKnockoutFromGroup = async () => {
    if (!isGuildLeader || !groupStage) return;
    setLoading(true);
    setError(null);
    try {
      // คัด 2 อันดับแรกแต่ละกลุ่ม
      const groupWinners: Participant[] = [];
      groupStage.groups.forEach((group, gIdx) => {
        const scores = group.map(p => ({
          ...p,
          score: groupStage.results[p.uid] || 0
        }));
        scores.sort((a, b) => b.score - a.score);
        groupWinners.push(...scores.slice(0, 2));
      });
      // ใช้ logic เดิมสร้าง bracket
      const shuffled = [...groupWinners].sort(() => Math.random() - 0.5);
      const totalRounds = Math.ceil(Math.log2(shuffled.length));
      const totalMatches = Math.pow(2, totalRounds) - 1;
      const newMatches: Match[] = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        newMatches.push({
          id: `match-${i/2}`,
          round: 1,
          matchNumber: i/2 + 1,
          player1: shuffled[i] || null,
          player2: shuffled[i + 1] || null,
          winner: null,
          status: 'pending'
        });
      }
      let currentRound = 2;
      let currentMatchNumber = Math.ceil(shuffled.length / 2) + 1;
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
      const db = getDatabase();
      const tournamentRef = ref(db, `tournaments/${tournamentId}`);
      await update(tournamentRef, {
        matches: newMatches,
        status: 'active',
        currentRound: 1
      });
      setMatches(newMatches);
      setGroupStage(null);
      setGroupStageDone(false);
      onUpdate();
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการสร้างรอบน็อคเอาท์');
    } finally {
      setLoading(false);
    }
  };

  // โหลดข้อมูลการแข่งขัน
  useEffect(() => {
    async function loadMatches() {
      try {
        const db = getDatabase();
        const tournamentRef = ref(db, `tournaments/${tournamentId}`);
        const snap = await get(tournamentRef);
        const tournamentData = snap.val();
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

  // โหลด group stage ถ้ามี
  useEffect(() => {
    async function loadGroupStage() {
      try {
        const db = getDatabase();
        const tournamentRef = ref(db, `tournaments/${tournamentId}`);
        const snap = await get(tournamentRef);
        const tournamentData = snap.val();
        if (tournamentData?.groupStage) {
          setGroupStage(tournamentData.groupStage);
          if (tournamentData.groupStage.matches.every((m: any) => m.status === 'completed')) {
            setGroupStageDone(true);
          }
        } else {
          setGroupStage(null);
          setGroupStageDone(false);
        }
      } catch {}
    }
    loadGroupStage();
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

      {/* เงื่อนไขแสดง Group Stage */}
      {participants.length > 32 && groupStage && (
        <div className="mt-4">
          <h3 className="text-lg font-bold text-pink-700 mb-2">รอบแบ่งกลุ่ม</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupStage.groups.map((group, gIdx) => (
              <div key={gIdx} className="bg-white/70 border border-pink-200 rounded-xl p-4 shadow">
                <div className="font-bold text-pink-600 mb-2">กลุ่ม {gIdx + 1}</div>
                <div className="mb-2">
                  {group.map(p => (
                    <div key={p.uid} className="text-sm text-gray-700">
                      {p.characterName} ({p.class})
                      <span className="ml-2 text-xs text-green-600 font-bold">{groupStage.results[p.uid] || 0} แต้ม</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {groupStage.matches.filter(m => m.group === gIdx + 1).map(m => (
                    <div key={m.id} className="flex items-center gap-2">
                      <span>{m.player1.characterName}</span>
                      <span className="text-gray-400">vs</span>
                      <span>{m.player2.characterName}</span>
                      {m.status === 'completed' ? (
                        <span className="ml-2 text-green-600 text-xs">ผู้ชนะ: {m.winner?.characterName}</span>
                      ) : isGuildLeader ? (
                        <Fragment>
                          <button onClick={() => selectGroupWinner(m.id, m.player1)} className="ml-2 px-2 py-1 bg-green-200 rounded text-xs">เลือก {m.player1.characterName}</button>
                          <button onClick={() => selectGroupWinner(m.id, m.player2)} className="ml-2 px-2 py-1 bg-green-200 rounded text-xs">เลือก {m.player2.characterName}</button>
                        </Fragment>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {groupStageDone && isGuildLeader && (
            <div className="text-center mt-6">
              <button onClick={startKnockoutFromGroup} className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all">
                เริ่มรอบน็อคเอาท์
              </button>
            </div>
          )}
        </div>
      )}

      {/* เงื่อนไขแสดงปุ่มสร้าง Group Stage */}
      {participants.length > 32 && !groupStage && isGuildLeader && (
        <div className="text-center py-4">
          <button
            onClick={generateGroupStage}
            disabled={loading}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'กำลังสร้างรอบแบ่งกลุ่ม...' : 'เริ่มรอบแบ่งกลุ่ม'}
          </button>
        </div>
      )}
    </div>
  );
} 