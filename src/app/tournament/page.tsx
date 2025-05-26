'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { getDatabase, ref as dbRef, get as dbGet, onValue, off, set as dbSet, update as dbUpdate, push as dbPush } from 'firebase/database';
import { Plus } from 'lucide-react';
import { CreateTournamentModal } from '@/components/tournament/CreateTournamentModal';
import { JoinTournamentModal } from '@/components/tournament/JoinTournamentModal';
import { TournamentBracket } from '@/components/tournament/TournamentBracket';
import { getFirestore, collection, getDocs, query, where, DocumentData } from 'firebase/firestore';
import Link from "next/link";

interface EventParticipant {
  characterId: string;
  groupId?: string;
}

interface TournamentParticipant {
  uid: string;
  characterId: string;
  characterName: string;
  class: string;
  groupId?: string;
  groupName?: string;
}

interface Event {
  id: string;
  name: string;
  description: string;
  startAt: number;
  endAt: number;
  isEnded: boolean;
  maxGroupSize: number;
}

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'ended';
  ownerUid: string;
  createdAt: number;
  participants: Record<string, TournamentParticipant>;
  maxParticipants: number;
  matches?: Array<{
    round: number;
    matchNumber: number;
    player1?: string;
    player2?: string;
    winner?: string;
  }>;
  currentRound?: number;
}

export default function TournamentPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const { user } = useAuth();
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [guildLeaders, setGuildLeaders] = useState<string[]>([]);

  // โหลดข้อมูลกิจกรรม (จาก Firestore)
  useEffect(() => {
    if (!user) return;
    const db = getFirestore();
    const q = query(collection(db, 'events'), where('isEnded', '==', false));
    getDocs(q)
      .then(snapshot => {
        const eventsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Event[];
        setEvents(eventsList);
      })
      .catch(err => {
        console.error('Error loading events from Firestore:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูลกิจกรรม');
      });
  }, [user]);

  // โหลดข้อมูลทัวร์นาเมนต์
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const db = getDatabase();
    const tournamentsRef = dbRef(db, 'tournaments');
    
    const handle = onValue(tournamentsRef, (snapshot) => {
      try {
        const data = snapshot.val() || {};
        // แปลง object เป็น array พร้อม id
        const tournaments = Object.entries(data)
          .map(([id, value]) => {
            const tournamentData = value as Omit<Tournament, 'id'>;
            return { 
              id, 
              ...tournamentData,
              participants: tournamentData.participants || {}
            };
          })
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTournaments(tournaments);
        setError(null);
      } catch (err) {
        console.error('Error processing tournament data:', err);
        setError('เกิดข้อผิดพลาดในการประมวลผลข้อมูลทัวร์นาเมนต์');
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error('Error loading tournaments:', err);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลทัวร์นาเมนต์');
      setLoading(false);
    });

    return () => off(tournamentsRef, 'value', handle);
  }, [user]);

  // โหลดข้อมูลผู้เข้าร่วมจาก Firestore เมื่อเลือกกิจกรรม
  useEffect(() => {
    if (!selectedEventId) {
      setParticipants([]);
      return;
    }
    const db = getFirestore();
    const participantsRef = collection(db, 'events', selectedEventId, 'participants');
    getDocs(participantsRef)
      .then(async (snapshot) => {
        const list: TournamentParticipant[] = [];
        for (const doc of snapshot.docs) {
          const data = doc.data() as { characterId: string; groupId?: string; groupName?: string };
          // ดึงข้อมูลตัวละครจาก Realtime Database
          const dbRT = getDatabase();
          const userRef = dbRef(dbRT, `users/${doc.id}/characters/${data.characterId}`);
          const userSnap = await dbGet(userRef);
          const characterData = userSnap.val();
          if (characterData) {
            list.push({
              uid: doc.id,
              characterId: data.characterId,
              characterName: characterData.name,
              class: characterData.class,
              groupId: data.groupId,
              groupName: data.groupName ?? '',
            });
          }
        }
        setParticipants(list);
      })
      .catch((err) => {
        console.error('Error loading participants from Firestore:', err);
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้เข้าร่วมกิจกรรม');
      });
  }, [selectedEventId]);

  // ดึงรายชื่อหัวกิลด์ทั้งหมด
  useEffect(() => {
    const db = getDatabase();
    const refLeaders = dbRef(db, 'guild/leaders');
    dbGet(refLeaders).then(snap => {
      if (snap.exists()) {
        setGuildLeaders(Object.keys(snap.val()));
      }
    });
  }, []);

  const handleJoinClick = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
  };

  const getParticipantCount = (participants: Record<string, TournamentParticipant>) => {
    return Object.keys(participants).length;
  };

  const handleSelect = (uid: string) => {
    setSelectedUids(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectGroup = (gid: string, groupUids: string[]) => {
    const allSelected = groupUids.every(uid => selectedUids.includes(uid));
    setSelectedUids(prev =>
      allSelected
        ? prev.filter(uid => !groupUids.includes(uid))
        : [...prev, ...groupUids.filter(uid => !prev.includes(uid))]
    );
  };

  // Logic สำหรับระบบกลุ่ม (ใช้ซ้ำได้ทั้งใน UI และ handleSubmitToTournament)
  const groupMap: Record<string, TournamentParticipant[]> = {};
  const noGroup: TournamentParticipant[] = [];
  participants.forEach((p) => {
    if (p.groupId) {
      if (!groupMap[p.groupId]) groupMap[p.groupId] = [];
      groupMap[p.groupId].push(p);
    } else {
      noGroup.push(p);
    }
  });
  const groupIds = Object.keys(groupMap);
  const isGroupMode = groupIds.length > 0;

  const handleSubmitToTournament = async () => {
    setSubmitLoading(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      if (!selectedUids.length) {
        setSubmitError('กรุณาเลือกสมาชิกอย่างน้อย 1 คน');
        setSubmitLoading(false);
        return;
      }
      const db = getDatabase();
      // สร้าง tournament ใหม่เสมอ
      const newRef = dbPush(dbRef(db, 'tournaments'));
      const tournamentId = newRef.key;
      const now = Date.now();
      await dbSet(newRef, {
        name: 'ทัวร์นาเมนต์ใหม่',
        description: 'สร้างโดยสมาชิก',
        status: 'pending',
        ownerUid: user!.uid,
        createdAt: now,
        participants: {},
        maxParticipants: 999,
      });

      const participantsRef = dbRef(db, `tournaments/${tournamentId}/participants`);
      const updates: Record<string, any> = {};
      if (isGroupMode) {
        // เลือกเฉพาะตัวแทนกลุ่ม (สมาชิกคนแรกในกลุ่มที่ถูกเลือก)
        groupIds.forEach((gid) => {
          const groupUids = groupMap[gid].map(m => m.uid);
          const groupSelected = groupUids.some(uid => selectedUids.includes(uid));
          if (groupSelected) {
            const rep = groupMap[gid][0];
            if (rep.groupName && rep.groupName.trim() !== '') {
              // ถ้ามีชื่อกลุ่ม ส่งชื่อกลุ่มเป็นตัวแทน (เฉพาะ 3 field)
              updates[gid] = {
                groupId: gid,
                groupName: rep.groupName,
                isGroup: true
              };
            } else {
              // ไม่มีชื่อกลุ่ม ส่งตัวแทนเป็นสมาชิกคนแรก
              updates[rep.uid] = {
                uid: rep.uid,
                characterId: rep.characterId,
                characterName: rep.characterName,
                class: rep.class,
                groupId: rep.groupId,
                groupName: rep.groupName,
              };
            }
          }
        });
        // noGroup ยังเลือกทีละคน
        noGroup.forEach((member) => {
          if (selectedUids.includes(member.uid)) {
            updates[member.uid] = {
              uid: member.uid,
              characterId: member.characterId,
              characterName: member.characterName,
              class: member.class,
            };
          }
        });
      } else {
        // ไม่ใช่ระบบกลุ่ม เลือกทีละคน
        participants.forEach((member) => {
          if (selectedUids.includes(member.uid)) {
            updates[member.uid] = {
              uid: member.uid,
              characterId: member.characterId,
              characterName: member.characterName,
              class: member.class,
            };
          }
        });
      }
      await dbUpdate(participantsRef, updates);
      setSubmitSuccess(true);
      setSelectedUids([]);
    } catch (err: any) {
      setSubmitError('เกิดข้อผิดพลาดในการบันทึก: ' + (err?.message || err));
    } finally {
      setSubmitLoading(false);
    }
  };

  // ปรับฟังก์ชันแสดงรายชื่อผู้เข้าร่วม (ใน tournament)
  const renderParticipantName = (participant: any) => {
    if (participant.isGroup && participant.groupName) {
      return <span className="font-bold text-pink-700">{participant.groupName}</span>;
    }
    return `${participant.characterName} (${participant.class})`;
  };

  useEffect(() => {
    if (submitSuccess) {
      const timer = setTimeout(() => setSubmitSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [submitSuccess]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/30 backdrop-blur-md border border-pink-200/50 shadow-lg p-4 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 drop-shadow-lg flex items-center gap-2">
              <span className="text-3xl">🏆</span>
              ทัวร์นาเมนต์
            </h2>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เลือกกิจกรรม
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(e.target.value || null)}
            >
              <option value="">-- เลือกกิจกรรม --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-4">
            {!selectedEventId ? (
              <div className="text-center py-8 text-gray-400">กรุณาเลือกกิจกรรม</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">ยังไม่มีผู้เข้าร่วมกิจกรรมนี้</div>
            ) : (
              <div className="grid gap-4">
                <div className="bg-white/50 backdrop-blur-sm border border-pink-200 rounded-xl p-4 shadow-md">
                  <div className="text-lg font-bold text-pink-700 mb-2">รายชื่อผู้เข้าร่วม</div>
                  {(() => {
                    if (isGroupMode) {
                      return (
                        <div className="space-y-4">
                          {/* ปุ่มเลือกทั้งหมดกลุ่ม */}
                          <div className="mb-2">
                            <button
                              type="button"
                              className="text-sm px-3 py-1 rounded bg-pink-100 text-pink-700 hover:bg-pink-200 border border-pink-300"
                              onClick={() => {
                                const allUids = groupIds.flatMap(gid => groupMap[gid].map(m => m.uid));
                                const allSelected = allUids.length > 0 && allUids.every(uid => selectedUids.includes(uid));
                                setSelectedUids(prev => {
                                  const noGroupUids = noGroup.map(m => m.uid).filter(uid => prev.includes(uid));
                                  return allSelected ? noGroupUids : [...noGroupUids, ...allUids];
                                });
                              }}
                            >
                              {(() => {
                                const allUids = groupIds.flatMap(gid => groupMap[gid].map(m => m.uid));
                                const allSelected = allUids.length > 0 && allUids.every(uid => selectedUids.includes(uid));
                                return allSelected ? 'ยกเลิกทั้งหมด (กลุ่ม)' : 'เลือกทั้งหมด (กลุ่ม)';
                              })()}
                            </button>
                          </div>
                          {/* รายชื่อกลุ่ม */}
                          {groupIds.map((gid, idx) => {
                            const groupName = groupMap[gid][0]?.groupName;
                            let displayGroupName = '';
                            if (groupName && groupName.trim() !== '') {
                              displayGroupName = groupName.trim();
                            } else if (gid.startsWith('group_')) {
                              displayGroupName = `กลุ่ม ${gid.replace('group_', '')}`;
                            } else {
                              displayGroupName = `กลุ่ม ${idx + 1}`;
                            }
                            const groupUids = groupMap[gid].map(m => m.uid);
                            const allSelected = groupUids.every(uid => selectedUids.includes(uid));
                            const someSelected = groupUids.some(uid => selectedUids.includes(uid));
                            return (
                              <div key={gid}>
                                <div className="font-bold text-pink-700 mb-1 flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                                    onChange={() => handleSelectGroup(gid, groupUids)}
                                  />
                                  {displayGroupName}
                                </div>
                                <div className="ml-4 space-y-1">
                                  {groupMap[gid].map((member, mIdx) => (
                                    <div key={mIdx} className="text-sm text-gray-600 flex items-center gap-2">
                                      {renderParticipantName(member)}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {/* กรณีมีคนที่ไม่อยู่กลุ่มเลย */}
                          {noGroup.length > 0 && (
                            <div>
                              <div className="font-bold text-pink-700 mb-1 mt-2 flex items-center gap-2">
                                ไม่สังกัดกลุ่ม
                                <button
                                  type="button"
                                  className="text-xs px-2 py-1 rounded bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200"
                                  onClick={() => {
                                    const allUids = noGroup.map(m => m.uid);
                                    const allSelected = allUids.length > 0 && allUids.every(uid => selectedUids.includes(uid));
                                    setSelectedUids(prev => {
                                      const groupUids = groupIds.flatMap(gid => groupMap[gid].map(m => m.uid)).filter(uid => prev.includes(uid));
                                      return allSelected ? groupUids : [...groupUids, ...allUids];
                                    });
                                  }}
                                >
                                  {(() => {
                                    const allUids = noGroup.map(m => m.uid);
                                    const allSelected = allUids.length > 0 && allUids.every(uid => selectedUids.includes(uid));
                                    return allSelected ? 'ยกเลิกทั้งหมด (ไม่สังกัดกลุ่ม)' : 'เลือกทั้งหมด (ไม่สังกัดกลุ่ม)';
                                  })()}
                                </button>
                              </div>
                              <div className="ml-4 space-y-1">
                                {noGroup.map((member, mIdx) => (
                                  <div key={mIdx} className="text-sm text-gray-600 flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={selectedUids.includes(member.uid)}
                                      onChange={() => handleSelect(member.uid)}
                                    />
                                    {renderParticipantName(member)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // ไม่ใช่ระบบกลุ่ม
                      return (
                        <>
                          <div className="mb-2">
                            <button
                              type="button"
                              className="text-sm px-3 py-1 rounded bg-pink-100 text-pink-700 hover:bg-pink-200 border border-pink-300"
                              onClick={() => {
                                const allUids = participants.map(p => p.uid);
                                const allSelected = allUids.length > 0 && allUids.every(uid => selectedUids.includes(uid));
                                setSelectedUids(allSelected ? [] : allUids);
                              }}
                            >
                              {(() => {
                                const allUids = participants.map(p => p.uid);
                                const allSelected = allUids.length > 0 && allUids.every(uid => selectedUids.includes(uid));
                                return allSelected ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด';
                              })()}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {participants.map((participant, index) => (
                              <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedUids.includes(participant.uid)}
                                  onChange={() => handleSelect(participant.uid)}
                                />
                                {renderParticipantName(participant)}
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    }
                  })()}
                </div>
                <div className="flex justify-end flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={handleSubmitToTournament}
                    disabled={submitLoading}
                    className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600"
                  >
                    {submitLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                  </button>
                  {submitSuccess && <div className="text-green-600 text-sm mt-1">บันทึกสำเร็จ!</div>}
                  {submitError && <div className="text-red-500 text-sm mt-1">{submitError}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Tournament List Section (move to bottom) */}
        <div className="mt-8">
          <div className="text-2xl font-bold text-pink-700 mb-2">รายการทัวร์นาเมนต์</div>
          {loading ? (
            <div className="text-center py-4 text-gray-400">กำลังโหลด...</div>
          ) : tournaments.length === 0 ? (
            <div className="text-center py-4 text-gray-500">ยังไม่มีทัวร์นาเมนต์</div>
          ) : (
            <div className="space-y-2">
              {tournaments.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center justify-between bg-white/50 border border-pink-100 rounded-lg px-4 py-2 shadow-sm hover:bg-pink-50 transition">
                  <div>
                    <div className="font-bold text-pink-700 text-lg">{t.name}</div>
                    <div className="text-xs text-gray-500 flex gap-4">
                      <span>สถานะ: <span className="font-bold text-pink-600">{t.status}</span></span>
                      <span>สร้างเมื่อ: {new Date(t.createdAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                  </div>
                  <Link href={`/tournament/${t.id}`} className="ml-4 px-4 py-1 rounded bg-pink-500 text-white font-bold hover:bg-pink-600 transition text-sm">ดูรายละเอียด</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
