'use client';

import { useEffect, useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { motion } from 'framer-motion';
import { Plus, History, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateEventModal } from '@/components/events/CreateEventModal';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';

function CountdownTimer({ targetDate }: { targetDate: Date | null }) {
  const [timeLeft, setTimeLeft] = useState<number>(targetDate ? targetDate.getTime() - Date.now() : 0);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      const diff = targetDate.getTime() - Date.now();
      setTimeLeft(diff);
      setIsStarted(diff <= 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) return null;
  let absTime = Math.abs(timeLeft);
  const days = Math.floor(absTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absTime % (1000 * 60)) / 1000);
  return (
    <div className={"mt-2 text-sm font-semibold " + (isStarted ? 'text-green-600' : 'text-red-500')}>
      {isStarted ? 'กำลังดำเนิน: ' : 'นับถอยหลัง: '}
      {days > 0
        ? `${days} วัน ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
    </div>
  );
}

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

// ฟังก์ชันแปลง Date เป็น key แบบ Local (YYYY-MM-DD)
function getLocalDateKey(date: Date) {
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
}

export default function EventsPage() {
  const [date, setDate] = useState<Value>(new Date());
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const justEndedId = searchParams.get('justEnded');
  const waitForEndedId = searchParams.get('waitForEnded');

  useEffect(() => {
    setLoading(true);
    setError(null);
    const q = query(
      collection(firestore, 'events'),
      where('isEnded', '==', false),
      orderBy('startAt', 'desc')
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveEvents(events);
      setLoading(false);
    }, (err) => {
      setError('เกิดข้อผิดพลาดในการโหลดกิจกรรม');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // หลัง render รอบแรก ให้ลบ query param justEnded ออก
  useEffect(() => {
    if (justEndedId) {
      const params = new URLSearchParams(window.location.search);
      params.delete('justEnded');
      router.replace(window.location.pathname + (params.toString() ? '?' + params.toString() : ''), { scroll: false });
    }
  }, [justEndedId, router]);

  const handleCreateEvent = async (data: { name: string; description: string; startAt: Date; endAt: Date; rewardInfo: string; notifyMessage: string; color: string; maxGroupSize: number; }) => {
    if (!user) return;
    const { name, description, startAt, endAt, rewardInfo, notifyMessage, color, maxGroupSize } = data;
    const eventData = {
      name,
      description,
      startAt,
      endAt,
      rewardInfo,
      notifyMessage,
      color,
      ownerUid: user.uid,
      createdAt: serverTimestamp(),
      isEnded: false,
      ...(maxGroupSize > 0 ? { maxGroupSize } : {})
    };
    await addDoc(collection(firestore, 'events'), eventData);
    router.push('/events');
  };

  // filter กิจกรรมที่เพิ่งจบออก (ถ้ามี justEnded)
  const filteredEvents = useMemo(() => {
    if (!justEndedId) return activeEvents;
    return activeEvents.filter(ev => ev.id !== justEndedId);
  }, [activeEvents, justEndedId]);

  // สร้าง Map ของวันที่ที่มีกิจกรรม (key: YYYY-MM-DD, value: array of events)
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredEvents.forEach(ev => {
      if (ev.startAt && ev.startAt.seconds) {
        const d = new Date(ev.startAt.seconds * 1000);
        const key = getLocalDateKey(d); // ใช้ local date key
        if (!map[key]) map[key] = [];
        map[key].push(ev);
      }
    });
    return map;
  }, [filteredEvents]);

  // ใหม่: Map วันที่ทั้งหมดที่อยู่ในช่วงกิจกรรม (start ถึง end)
  const eventsRangeByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredEvents.forEach(ev => {
      if (ev.startAt && ev.startAt.seconds && ev.endAt && ev.endAt.seconds) {
        let cur = new Date(ev.startAt.seconds * 1000);
        const end = new Date(ev.endAt.seconds * 1000);
        // เดินวันทีละวัน
        while (cur <= end) {
          const key = getLocalDateKey(cur);
          if (!map[key]) map[key] = [];
          map[key].push(ev);
          cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
        }
      }
    });
    return map;
  }, [filteredEvents]);

  // Polling reload ถ้ายังเจอ event id ที่เพิ่งจบ
  useEffect(() => {
    if (waitForEndedId && filteredEvents.some(ev => ev.id === waitForEndedId)) {
      setTimeout(() => window.location.reload(), 700);
    }
  }, [waitForEndedId, filteredEvents]);

  // Auto end event ฝั่ง client
  useEffect(() => {
    const now = Date.now();
    filteredEvents.forEach(async (ev) => {
      if (!ev.isEnded && ev.endAt && ev.endAt.seconds) {
        const endDate = new Date(ev.endAt.seconds * 1000);
        if (now > endDate.getTime()) {
          const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
          await updateDoc(doc(firestore, 'events', ev.id), {
            isEnded: true,
            endedAt: serverTimestamp(),
          });
        }
      }
    });
  }, [filteredEvents]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl mx-auto">
        {/* Calendar Section */}
        <div className="w-full lg:w-1/3 max-w-md mx-auto flex flex-col items-center justify-center mb-8 self-start h-fit">
          <div className="bg-white/90 backdrop-blur-sm border border-pink-200 shadow-xl p-6 rounded-2xl mx-auto max-w-xs sm:max-w-md sticky top-0 z-30 lg:top-8">
            <h2 className="text-xl font-extrabold text-pink-700 flex items-center gap-2 mb-4">
              <CalendarIcon className="w-6 h-6 text-pink-500" />
              ปฏิทินกิจกรรม
            </h2>
            <Calendar
              onChange={setDate}
              value={date}
              className="border-none rounded-2xl shadow-lg bg-gradient-to-br from-pink-50 via-purple-50 to-white p-2 calendar-pastel calendar-pink-labels"
              locale="th-TH"
              tileContent={({ date: tileDate }: { date: Date }) => {
                const key = getLocalDateKey(tileDate);
                const events = eventsRangeByDate[key] || [];
                if (events.length > 0) {
                  return (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <span className="w-6 h-6 bg-pink-300 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                        {tileDate.getDate()}
                      </span>
                    </div>
                  );
                }
                return null;
              }}
              tileClassName={({ date: tileDate }: { date: Date }) => {
                const key = getLocalDateKey(tileDate);
                const events = eventsRangeByDate[key] || [];
                const isToday = tileDate.toDateString() === new Date().toDateString();
                // วันเริ่มกิจกรรม
                const isStartDate = events.some(ev => {
                  if (ev.startAt?.seconds) {
                    const startDate = new Date(ev.startAt.seconds * 1000);
                    return getLocalDateKey(startDate) === key;
                  }
                  return false;
                });
                // วันจบกิจกรรม
                const isEndDate = events.some(ev => {
                  if (ev.endAt?.seconds) {
                    const endDate = new Date(ev.endAt.seconds * 1000);
                    return getLocalDateKey(endDate) === key;
                  }
                  return false;
                });
                // วันระหว่างกิจกรรม (ไม่ใช่ start, ไม่ใช่ end)
                const isBetween = events.length > 0 && !isStartDate && !isEndDate;
                return cn(
                  "rounded-lg p-2 transition-all font-semibold relative",
                  tileDate.getMonth() === (date as Date).getMonth() 
                    ? "" 
                    : "text-gray-300",
                  isStartDate && "bg-green-200 ring-2 ring-green-400 ring-offset-2",
                  isEndDate && "bg-red-200 ring-2 ring-red-400 ring-offset-2",
                  isBetween && "bg-pink-100",
                  isToday && "bg-purple-200 border-2 border-purple-300"
                );
              }}
              prevLabel={<span className="text-pink-400 text-lg font-bold">«</span>}
              nextLabel={<span className="text-pink-400 text-lg font-bold">»</span>}
              prev2Label={null}
              next2Label={null}
            />
            <button
              onClick={() => router.push('/events/history')}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-pink-200 bg-pink-50 text-pink-700 font-medium shadow hover:bg-purple-50 transition-colors duration-150"
            >
              <History className="w-4 h-4" />
              ประวัติกิจกรรม
            </button>
          </div>
        </div>
        {/* Events List Section */}
        <div className="w-full lg:w-2/3 max-w-2xl mx-auto lg:mx-0">
          <div className="bg-white/30 backdrop-blur-md border border-pink-200/50 shadow-lg p-4 rounded-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 drop-shadow-lg flex items-center gap-2">
                <span className="text-3xl">🎉</span>
                กิจกรรม
              </h2>
              <div className="flex justify-end w-full">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                  <span>สร้างกิจกรรม</span>
                </motion.button>
              </div>
            </div>

            {/* Events List */}
            <div className="space-y-4">
              {loading ? (
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
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">ไม่มีกิจกรรมที่ยังไม่จบ</div>
              ) : (
                filteredEvents.map((event) => {
                  const startDate = event.startAt && event.startAt.seconds 
                    ? new Date(event.startAt.seconds * 1000)
                    : null;
                  
                  const isGradient = event.color && event.color.startsWith('linear-gradient');

                  return (
                    <Link href={`/events/${event.id}`} key={event.id} legacyBehavior>
                      <a>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.15)' }}
                          className={
                            "cursor-pointer border-2 rounded-2xl p-5 shadow-md hover:shadow-xl transition-all group mb-2 relative overflow-hidden"
                          }
                          style={{
                            ...(isGradient
                              ? {
                                  backgroundImage: event.color,
                                  borderColor: '#FFB5E8',
                                }
                              : {
                                  backgroundColor: event.color || '#FFB5E8', // สีทึบ
                                  borderColor: event.color || '#FFB5E8',
                                }
                            ),
                            boxShadow: `0 0 0 1px ${(event.color && !isGradient) ? (event.color || '#FFB5E8') + '40' : '#FFB5E8' + '40'}, 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`
                          }}
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
                              {event.endAt && event.endAt.seconds && (
                                <div className="inline-flex items-center gap-1 bg-red-50 rounded-lg px-3 py-1 shadow-sm text-red-700 font-semibold text-sm w-fit self-start">
                                  <span className="text-lg">⏰</span>
                                  <span>สิ้นสุด:</span>
                                  <span>{new Date(event.endAt.seconds * 1000).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}
                            </div>
                            <CountdownTimer targetDate={startDate} />
                          </div>
                        </motion.div>
                      </a>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateEvent}
      />
      <style jsx global>{`
        /* เดือนและปีด้านบน */
        .calendar-pink-labels .react-calendar__navigation__label {
          color: #ec4899 !important; /* pink-500 */
          font-weight: bold;
        }
        /* ปุ่มเดือนก่อน/ถัดไป */
        .calendar-pink-labels .react-calendar__navigation button {
          color: #ec4899 !important;
        }
        /* ชื่อวัน (จ, อ, พ, ... ) */
        .calendar-pink-labels .react-calendar__month-view__weekdays__weekday {
          color: #ec4899 !important;
          font-weight: bold;
        }
        /* ตัวเลขวันที่ทั้งหมดเป็นสีดำ */
        .calendar-pink-labels .react-calendar__tile {
          color: #111 !important;
        }
        /* เสาร์-อาทิตย์ ให้เป็นสีดำเหมือนวันปกติ */
        .calendar-pink-labels .react-calendar__month-view__days__day--weekend {
          color: #111 !important;
        }
        /* วันที่ที่ไม่ใช่เดือนปัจจุบัน (จาง) */
        .calendar-pink-labels .react-calendar__month-view__days__day--neighboringMonth {
          color: #d1d5db !important; /* gray-300 */
        }
      `}</style>
    </div>
  );
} 