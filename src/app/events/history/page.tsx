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
    return <div className="max-w-2xl mx-auto py-8 px-4 text-center text-gray-400">กำลังโหลด...</div>;
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
      <div className="bg-gradient-to-br from-pink-100 via-purple-50 to-white/60 backdrop-blur-md border border-pink-200/50 shadow-2xl p-8 rounded-2xl">
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
              return (
                <div
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="cursor-pointer"
                >
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02, boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.15)' }}
                    className="bg-gradient-to-br from-white via-pink-50 to-purple-50 border border-pink-100 rounded-2xl p-7 shadow-xl transition-all duration-200 mb-2"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-full">
                        <h2 className="text-2xl font-extrabold text-pink-700 flex items-center gap-2 drop-shadow-sm">
                          <span className="text-3xl">🎉</span>
                          {event.name}
                        </h2>
                        <p className="text-base text-gray-700 mt-2 flex items-center gap-2 font-medium">
                          <span className="text-xl">📝</span>
                          {event.description}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-100 text-blue-700 text-sm font-semibold">
                            <span className="text-lg">🗓️</span>
                            เริ่มกิจกรรม: {startDate ? startDate.toLocaleString("th-TH", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}
                          </div>
                          {event.endedAt && event.endedAt.seconds && event.startAt && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-100 text-red-700 text-sm font-semibold">
                              <span className="text-lg">⏰</span>
                              จบกิจกรรมเมื่อ: {new Date(event.endedAt.seconds * 1000).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                          {event.endedAt && event.endedAt.seconds && event.startAt && (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-green-100 text-green-700 text-sm font-semibold">
                              <span className="text-lg">✅</span>
                              ระยะเวลากิจกรรม: {(() => {
                                const endedDate = new Date(event.endedAt.seconds * 1000);
                                const startDate = event.startAt.toDate ? event.startAt.toDate() : (event.startAt.seconds ? new Date(event.startAt.seconds * 1000) : null);
                                if (!startDate) return '-';
                                const durationMs = endedDate.getTime() - startDate.getTime();
                                const duration = durationMs > 0 ? durationMs : 0;
                                const hours = Math.floor(duration / (1000 * 60 * 60));
                                const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
                                const seconds = Math.floor((duration % (1000 * 60)) / 1000);
                                return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                              })()}
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
                              <span>
                                รางวัล: {event.participants.filter((p: any) => p.rewardGiven).map((p: any) => p.rewardNote).filter((v: any, i: number, arr: any[]) => v && arr.indexOf(v) === i).join(', ') || '-'}
                                {' '}(
                                {event.participants.filter((p: any) => p.rewardGiven).length}
                                {' '}คน)
                              </span>
                            </div>
                          )}
                        </div>
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