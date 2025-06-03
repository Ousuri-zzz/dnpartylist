"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Gift } from "lucide-react";

export default function EventHistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { users, isLoading: usersLoading } = useUsers();

  useEffect(() => {
    if (!user) return;
    const fetchEvents = async () => {
      try {
        const eventsRef = collection(firestore, "events");
        const q = query(
          eventsRef,
          where("isEnded", "==", true),
          orderBy("startAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const eventsData = await Promise.all(
          querySnapshot.docs.map(async (doc) => {
            const eventData = { id: doc.id, ...doc.data() };
            // Fetch participants
            const participantsRef = collection(firestore, "events", doc.id, "participants");
            const participantsSnapshot = await getDocs(participantsRef);
            const participants = participantsSnapshot.docs.map((p) => ({
              uid: p.id,
              rewardGiven: p.data().rewardGiven || false,
              rewardNote: p.data().rewardNote || ""
            }));
            return {
              ...eventData,
              participants
            };
          })
        );
        setEvents(eventsData);
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [user]);

  if (loading || usersLoading || authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-8">
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
            <div className="w-8 h-8 rounded-full bg-white shadow animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <button
          onClick={() => router.push("/events")}
          className="flex items-center gap-2 px-5 py-2 rounded-full border border-pink-200 bg-pink-50 text-pink-700 font-medium shadow hover:bg-purple-50 transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4 mr-1 text-pink-400" />
          ย้อนกลับไปหน้ารายการกิจกรรม
        </button>
      </div>
      <div className="bg-white/90 backdrop-blur-sm border border-pink-200 shadow-xl p-8 rounded-2xl">
        <h1 className="text-3xl font-extrabold mb-6 text-pink-700">📜 ประวัติกิจกรรม</h1>
        {events.length === 0 ? (
          <div className="text-gray-400 text-center py-8">ยังไม่มีกิจกรรมที่ผ่านมา</div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => {
              const startDate = event.startAt?.toDate?.() || (event.startAt?.seconds ? new Date(event.startAt.seconds * 1000) : null);
              const participantUsers = event.participants
                .map((p: any) => users[p.uid])
                .filter(Boolean)
                .sort((a: any, b: any) => {
                  const aReward = event.participants.find((p: any) => p.uid === a.uid)?.rewardGiven || false;
                  const bReward = event.participants.find((p: any) => p.uid === b.uid)?.rewardGiven || false;
                  if (aReward && !bReward) return -1;
                  if (!aReward && bReward) return 1;
                  return 0;
                });
              const isGradient = event.color && event.color.startsWith('linear-gradient');
              // สำหรับ hex: แปลงเป็น rgba โปร่งใส
              let bgStyle: React.CSSProperties = {};
              if (isGradient) {
                bgStyle = {
                  backgroundImage: event.color,
                  borderColor: '#FFB5E8',
                };
              } else if (event.color) {
                let c = event.color.replace('#', '');
                if (c.length === 3) c = c.split('').map((x: string) => x + x).join('');
                const num = parseInt(c, 16);
                bgStyle = {
                  backgroundColor: `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},0.5)`,
                  borderColor: event.color,
                };
              } else {
                bgStyle = {
                  backgroundColor: 'rgba(255,255,255,0.5)',
                  borderColor: '#FFB5E8',
                };
              }
              bgStyle.boxShadow = `0 0 0 1px ${(event.color && !isGradient) ? (event.color || '#FFB5E8') + '40' : '#FFB5E8' + '40'}, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`;
              return (
                <div
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="cursor-pointer"
                >
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.15)' }}
                    className="border-2 rounded-2xl p-5 shadow-md hover:shadow-xl transition-all group mb-2 relative overflow-hidden"
                    style={bgStyle}
                  >
                    {/* overlay สีขาวโปร่งใสทับทุกกรณี ให้ดู soft/pastel */}
                    <div style={{position:'absolute',inset:0,background:'rgba(255,255,255,0.7)',zIndex:1,borderRadius:'inherit'}} />
                    <div style={{position:'relative',zIndex:2}}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🎉</span>
                        <h3 className="font-bold text-lg text-pink-700 group-hover:text-pink-600 transition-colors break-words whitespace-normal flex-1 min-w-0">{event.name}</h3>
                      </div>
                      <div className="px-4 py-2 w-full mb-2">
                        <div className="inline-flex items-start w-full min-w-0">
                          <span className="text-lg flex-shrink-0 mt-1">📝</span>
                          <span className="break-words whitespace-pre-line w-full ml-2 text-pink-500 text-sm font-semibold drop-shadow-sm min-w-0 bg-white/70 backdrop-blur-sm rounded-lg px-4 py-2">{event.description}</span>
                        </div>
                      </div>
                      <div className="mb-2 space-y-2 flex flex-col">
                        <div className="bg-yellow-50 rounded-lg px-3 py-1 shadow-sm text-yellow-700 font-semibold text-sm max-w-[600px] break-words whitespace-pre-line self-start block inline-flex items-center">
                          <span className="text-lg mr-1 flex items-center justify-center">🎁</span>
                          <span className="break-all whitespace-pre-line flex items-center">{event.rewardInfo}</span>
                        </div>
                        <div className="inline-flex items-center gap-1 bg-blue-50 rounded-lg px-3 py-1 shadow-sm text-blue-700 font-semibold text-sm w-fit self-start">
                          <span className="text-lg">🗓️</span>
                          <span>เริ่ม:</span>
                          <span>{startDate ? startDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                        </div>
                        {event.endedAt && event.endedAt.seconds && event.startAt && (
                          <div className="inline-flex items-center gap-1 bg-red-50 rounded-lg px-3 py-1 shadow-sm text-red-700 font-semibold text-sm w-fit self-start">
                            <span className="text-lg">⏰</span>
                            <span>จบกิจกรรมเมื่อ:</span>
                            <span>{new Date(event.endedAt.seconds * 1000).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                        {event.endedAt && event.endedAt.seconds && event.startAt && (
                          <div className="inline-flex items-center gap-1 bg-green-50 rounded-lg px-3 py-1 shadow-sm text-green-700 font-semibold text-sm w-fit self-start">
                            <span className="text-lg">✅</span>
                            <span>ระยะเวลากิจกรรม:</span>
                            <span>{(() => {
                              const endedDate = new Date(event.endedAt.seconds * 1000);
                              const startDate = event.startAt.toDate ? event.startAt.toDate() : (event.startAt.seconds ? new Date(event.startAt.seconds * 1000) : null);
                              if (!startDate) return '-';
                              const durationMs = endedDate.getTime() - startDate.getTime();
                              const duration = durationMs > 0 ? durationMs : 0;
                              const days = Math.floor(duration / (1000 * 60 * 60 * 24));
                              const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                              const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
                              const seconds = Math.floor((duration % (1000 * 60)) / 1000);
                              return days > 0
                                ? `${days} วัน ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                                : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                            })()}</span>
                          </div>
                        )}
                        {event.endAt && event.endAt.seconds && (
                          <div className="inline-flex items-center gap-1 bg-orange-50 rounded-lg px-3 py-1 shadow-sm text-orange-700 font-semibold text-sm w-fit self-start">
                            <span className="text-lg">⏳</span>
                            <span>สิ้นสุดตามกำหนด:</span>
                            <span>{new Date(event.endAt.seconds * 1000).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-purple-100 text-purple-700 text-base font-semibold mb-2">
                          <span className="text-lg">👥</span>
                          ผู้เข้าร่วม {participantUsers.length} คน
                        </div>
                        {event.participants && event.participants.length > 0 && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-yellow-100 text-yellow-700 text-base font-semibold">
                            <Gift className="w-4 h-4 inline" />
                            <span className="break-words whitespace-normal min-w-0">
                              รางวัล: {event.participants.filter((p: any) => p.rewardGiven).map((p: any) => p.rewardNote).filter((v: any, i: number, arr: any[]) => v && arr.indexOf(v) === i).join(', ') || '-'}
                              {' '}(
                              {event.participants.filter((p: any) => p.rewardGiven).length}
                              {' '}คน)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 