"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDatabase, ref as dbRef, get as dbGet, update as dbUpdate } from "firebase/database";
import { TournamentBracket } from '@/components/tournament/TournamentBracket';
import { useAuth } from '@/hooks/useAuth';
import { Dialog } from '@headlessui/react';
import { generateDoubleEliminationBracket } from '@/components/tournament/doubleElimination';

interface TournamentParticipant {
  uid?: string;
  characterId?: string;
  characterName?: string;
  class?: string;
  groupId?: string;
  groupName?: string;
  isGroup?: boolean;
}

interface Tournament {
  name: string;
  description?: string;
  status: string;
  ownerUid: string;
  createdAt: number;
  bracketType?: 'single' | 'double';
}

type Participant = {
  uid: string;
  characterId: string;
  characterName: string;
  class: string;
};

type Match = {
  id: string;
  round: number;
  matchNumber: number;
  player1: Participant | null;
  player2: Participant | null;
  winner: Participant | null;
  status: 'pending' | 'in_progress' | 'completed';
};

// สร้าง seeding pattern แบบมาตรฐานสากล
function generateSeedingPattern(size: number): number[] {
  // Recursive pattern generation (standard bracket seeding)
  if (size === 1) return [1];
  const prev = generateSeedingPattern(size / 2);
  return [...prev, ...prev.map(x => size + 1 - x)];
}

export default function TournamentDetailPage({ params }: { params: { tournamentId: string } }) {
  const { tournamentId } = params;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Record<string, TournamentParticipant>>({});
  const [ownerName, setOwnerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bracketType, setBracketType] = useState<'single' | 'double'>('single');
  const [bracketLoading, setBracketLoading] = useState(false);
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0); // for bracket refresh
  const router = useRouter();
  const [confirmModal, setConfirmModal] = useState<{ action: 'generate' | 'reset' | null, open: boolean }>({ action: null, open: false });
  const [isGuildLeader, setIsGuildLeader] = useState(false);

  useEffect(() => {
    async function fetchTournamentAndParticipants() {
      setLoading(true);
      setError(null);
      try {
        const db = getDatabase();
        const tRef = dbRef(db, `tournaments/${tournamentId}`);
        const tSnap = await dbGet(tRef);
        if (tSnap.exists()) {
          const tData = tSnap.val();
          setTournament({
            name: tData.name,
            description: tData.description,
            status: tData.status,
            ownerUid: tData.ownerUid,
            createdAt: tData.createdAt,
            bracketType: tData.bracketType || 'single',
          });
          setBracketType(tData.bracketType || 'single');
          setParticipants(tData.participants || {});
          // Fetch owner name
          if (tData.ownerUid) {
            const userRef = dbRef(db, `users/${tData.ownerUid}`);
            const userSnap = await dbGet(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.val();
              setOwnerName(userData.meta?.discord || userData.displayName || tData.ownerUid);
            } else {
              setOwnerName(tData.ownerUid);
            }
          }
          setIsGuildLeader(tData.isGuildLeader || false);
        } else {
          setError("ไม่พบข้อมูลทัวร์นาเมนต์นี้");
        }
      } catch (err: any) {
        setError("เกิดข้อผิดพลาดในการโหลดข้อมูลทัวร์นาเมนต์");
      } finally {
        setLoading(false);
      }
    }
    fetchTournamentAndParticipants();
  }, [tournamentId]);

  function formatDate(ts?: number) {
    if (!ts) return "-";
    const d = new Date(ts);
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  }

  // ฟังก์ชันรีเซ็ตการแข่งขัน
  async function handleResetTournament() {
    setBracketLoading(true);
    try {
      const db = getDatabase();
      const tRef = dbRef(db, `tournaments/${tournamentId}`);
      await dbUpdate(tRef, {
        matches: null,
        status: 'pending',
        currentRound: null,
      });
      window.location.reload();
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการรีเซ็ตการแข่งขัน');
    } finally {
      setBracketLoading(false);
    }
  }

  // ฟังก์ชันสร้าง bracket (placeholder)
  async function handleGenerateBracket() {
    setBracketLoading(true);
    try {
      const db = getDatabase();
      const tRef = dbRef(db, `tournaments/${tournamentId}`);
      await dbUpdate(tRef, { bracketType });
      // Generate bracket for single elimination
      if (bracketType === 'single') {
        // Prepare participants for bracket
        const bracketParticipants = Object.entries(participants).map(([key, p]) => ({
          uid: p.uid || key,
          characterId: p.characterId || '',
          characterName: p.characterName || p.groupName || '',
          class: p.class || (p.isGroup ? 'กลุ่ม' : ''),
        }));

        // เรียงรายชื่อผู้เข้าแข่งขัน (จะ shuffle หรือไม่ก็ได้)
        const shuffled = [...bracketParticipants].sort(() => Math.random() - 0.5); // หรือจะไม่ shuffle ก็ได้
        const n = shuffled.length;
        const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
        const numByes = bracketSize - n;

        let playersWithByes: (typeof bracketParticipants[0] | null)[];
        if (n % 2 === 1) {
          // เลขคี่: เติม null ข้างหน้า
          playersWithByes = [null, ...shuffled, ...Array(numByes - 1).fill(null)];
        } else {
          // เลขคู่: เติม null ต่อท้าย
          playersWithByes = [...shuffled, ...Array(numByes).fill(null)];
        }

        // สร้าง match รอบแรก
        let newMatches: Match[] = [];
        for (let i = 0; i < bracketSize; i += 2) {
          const p1 = playersWithByes[i];
          const p2 = playersWithByes[i+1];
          newMatches.push({
            id: `match-1-${i/2+1}`,
            round: 1,
            matchNumber: i/2+1,
            player1: p1,
            player2: p2,
            winner: null,
            status: (p1 || p2) ? 'in_progress' : 'pending',
          });
        }

        // รอบถัดไป: สร้าง match ตามจำนวน match ในรอบก่อนหน้า / 2 (full binary tree)
        let prevRoundMatchCount = bracketSize / 2;
        let round = 2;
        while (prevRoundMatchCount > 1) {
          for (let i = 0; i < prevRoundMatchCount / 2; i++) {
            newMatches.push({
              id: `match-${round}-${i+1}`,
              round,
              matchNumber: i+1,
              player1: null,
              player2: null,
              winner: null,
              status: 'pending',
            });
          }
          prevRoundMatchCount = prevRoundMatchCount / 2;
          round++;
        }

        await dbUpdate(tRef, {
          matches: newMatches,
          status: 'active',
          currentRound: 1,
        });
        window.location.reload();
      }
      if (bracketType === 'double') {
        const bracketParticipants = Object.entries(participants).map(([key, p]) => ({
          uid: p.uid || key,
          characterId: p.characterId || '',
          characterName: p.characterName || p.groupName || '',
          class: p.class || (p.isGroup ? 'กลุ่ม' : ''),
        }));
        const matches = generateDoubleEliminationBracket(bracketParticipants);
        await dbUpdate(tRef, {
          matches,
          status: 'active',
          currentRound: 1,
        });
        window.location.reload();
      }
      setRefresh(r => r + 1);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการสร้างสายการแข่งขัน');
    } finally {
      setBracketLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full">
        <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-white/80 backdrop-blur-md border border-pink-200/30 shadow-xl p-8 rounded-2xl w-full">
          {/* Modal ยืนยัน */}
          <Dialog open={confirmModal.open} onClose={() => setConfirmModal({ action: null, open: false })} className="fixed z-50 inset-0 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <Dialog.Panel>
              <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-auto z-50 border border-pink-100">
                <Dialog.Title className="font-extrabold text-xl mb-2 text-pink-700 tracking-wide">ยืนยันการดำเนินการ</Dialog.Title>
                <Dialog.Description className="mb-4">
                  {confirmModal.action === 'generate' ? 'คุณต้องการสร้างสายการแข่งขันใหม่หรือไม่?' : 'คุณต้องการรีเซ็ตการแข่งขันนี้หรือไม่?'}
                </Dialog.Description>
                <div className="flex gap-2 justify-end mt-4">
                  <button className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition font-semibold shadow" onClick={() => setConfirmModal({ action: null, open: false })}>ยกเลิก</button>
                  <button
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold shadow hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={async () => {
                      setConfirmModal({ action: null, open: false });
                      if (confirmModal.action === 'generate') await handleGenerateBracket();
                      if (confirmModal.action === 'reset') await handleResetTournament();
                    }}
                    disabled={bracketLoading}
                  >ยืนยัน</button>
                </div>
              </div>
            </Dialog.Panel>
          </Dialog>
          {loading ? (
            <div className="text-center py-8 text-gray-400">กำลังโหลด...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : tournament ? (
            <>
              <div className="mb-6">
                <h2 className="text-3xl font-extrabold mb-2 bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow">{tournament.name}</h2>
                <div className="text-base text-gray-700 mb-2 font-medium">{tournament.description}</div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
                  <span>สถานะ: <span className="font-bold text-pink-600">{tournament.status}</span></span>
                  <span>ผู้สร้าง: <span className="font-mono text-purple-700">{ownerName}</span></span>
                  <span>สร้างเมื่อ: <span className="font-semibold text-gray-700">{formatDate(tournament.createdAt)}</span></span>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="font-bold text-pink-700">ประเภทสายการแข่งขัน:</label>
                  <select
                    className="p-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-400 focus:border-pink-400 bg-white/80 shadow-sm text-pink-700 font-semibold hover:border-pink-400 transition"
                    value={bracketType}
                    onChange={e => setBracketType(e.target.value as 'single' | 'double')}
                    disabled={bracketLoading}
                  >
                    <option value="single">Single Elimination (แพ้คัดออก)</option>
                    <option value="double">Double Elimination (แพ้คัดออกสองครั้ง)</option>
                  </select>
                  <button
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold shadow-lg hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
                    onClick={() => setConfirmModal({ action: 'generate', open: true })}
                    disabled={bracketLoading}
                  >
                    {bracketLoading ? 'กำลังสร้าง...' : 'สร้างสายการแข่งขัน'}
                  </button>
                  {/* ปุ่มรีเซ็ตการแข่งขัน (เฉพาะเจ้าของ) */}
                  {(user?.uid === tournament?.ownerUid || isGuildLeader) && (
                    <button
                      className="px-5 py-2 rounded-xl bg-gray-100 text-pink-700 font-bold border border-pink-200 hover:bg-pink-50 shadow transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
                      onClick={() => setConfirmModal({ action: 'reset', open: true })}
                      disabled={bracketLoading}
                    >
                      {bracketLoading ? 'กำลังรีเซ็ต...' : 'รีเซ็ตการแข่งขัน'}
                    </button>
                  )}
                  <span className="text-xs text-gray-400">(เลือกประเภทแล้วกดสร้างสายการแข่งขัน หรือรีเซ็ตเพื่อเริ่มใหม่)</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-pink-700 mb-3 tracking-wide">รายชื่อผู้เข้าร่วม</h3>
              {/* จำนวนผู้เข้าร่วม */}
              {(() => {
                const participantList = Object.values(participants);
                const isGroupMode = participantList.some((p: any) => p.isGroup);
                const count = participantList.filter((p: any) => isGroupMode ? p.isGroup : !p.isGroup).length;
                if (participantList.length === 0) return null;
                return (
                  <div className="mb-2 text-sm text-gray-600 font-semibold">
                    {isGroupMode
                      ? `กลุ่มที่เข้าร่วม ${count} กลุ่ม`
                      : `ผู้เข้าร่วม ${count} คน`}
                  </div>
                );
              })()}
              {Object.keys(participants).length === 0 ? (
                <div className="text-center py-8 text-gray-400 italic">ยังไม่มีผู้เข้าร่วม</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(participants).map(([key, p]) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 bg-white/80 border border-pink-100 rounded-xl px-4 py-3 shadow hover:shadow-md transition group cursor-pointer hover:bg-pink-50"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center font-bold text-pink-700 text-lg shadow-sm">
                        {p.characterName?.[0] || p.groupName?.[0] || '?'}
                      </div>
                      <div className="flex flex-col">
                        {p.isGroup && p.groupName ? (
                          <span className="font-bold text-pink-700 text-base">{p.groupName}</span>
                        ) : (
                          <span className="font-semibold text-gray-800 text-base">{p.characterName}</span>
                        )}
                        <span className="text-xs text-gray-500">{p.class}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Bracket UI */}
              {(tournament.status === 'active' || (tournament as any).matches) && (
                <div className="mt-8">
                  <TournamentBracket
                    tournamentId={tournamentId}
                    participants={Object.entries(participants).map(([key, p]) => ({
                      uid: p.uid || key,
                      characterId: p.characterId || '',
                      characterName: p.characterName || p.groupName || '',
                      class: p.class || (p.isGroup ? 'กลุ่ม' : ''),
                    }))}
                    isGuildLeader={user?.uid === tournament.ownerUid || isGuildLeader}
                    onUpdate={() => setRefresh(r => r + 1)}
                  />
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
} 