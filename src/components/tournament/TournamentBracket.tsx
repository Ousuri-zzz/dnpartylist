'use client';

import { useState, useEffect, Fragment } from 'react';
import { motion } from 'framer-motion';
import { getDatabase, ref, get, update } from 'firebase/database';
import { useAuth } from '@/hooks/useAuth';
import { BracketTree } from './BracketTree';

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
  bracket?: 'A' | 'B' | 'final';
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

  // สร้างตารางการแข่งขัน (single elimination tree สำหรับทุกคน)
  const generateBrackets = async () => {
    if (!isGuildLeader) return;
    setLoading(true);
    setError(null);
    try {
      // สุ่มลำดับผู้เล่น
      const shuffledParticipants = [...participants].sort(() => Math.random() - 0.5);
      const totalRounds = Math.ceil(Math.log2(shuffledParticipants.length));
      const bracketSize = Math.pow(2, totalRounds);
      const newMatches: Match[] = [];
      // รอบแรก: ใส่ผู้เล่นตามจำนวนจริง ที่เหลือเป็น null (bye)
      for (let i = 0; i < bracketSize; i += 2) {
        newMatches.push({
          id: `match-1-${i/2}`,
          round: 1,
          matchNumber: i/2 + 1,
          player1: shuffledParticipants[i] || null,
          player2: shuffledParticipants[i + 1] || null,
          winner: null,
          status: i === 0 ? 'in_progress' : 'pending',
        });
      }
      // รอบถัดไป: เตรียม match ครบทุกสาย
      let prevRoundMatchCount = bracketSize / 2;
      for (let round = 2; round <= totalRounds; round++) {
        for (let i = 0; i < prevRoundMatchCount / 2; i++) {
          newMatches.push({
            id: `match-${round}-${i}`,
            round,
            matchNumber: i + 1,
            player1: null,
            player2: null,
            winner: null,
            status: 'pending',
          });
        }
        prevRoundMatchCount = prevRoundMatchCount / 2;
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
        <BracketTree
          matches={matches}
          isGuildLeader={isGuildLeader}
          onSelectWinner={selectWinner}
        />
      )}
    </div>
  );
} 