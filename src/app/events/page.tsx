'use client';

import { useEffect, useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { motion } from 'framer-motion';
import { Plus, History, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateEventModal } from '@/components/events/CreateEventModal';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
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
  const hours = Math.floor(absTime / (1000 * 60 * 60));
  const minutes = Math.floor((absTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absTime % (1000 * 60)) / 1000);
  return (
    <div className={"mt-2 text-sm font-semibold " + (isStarted ? 'text-green-600' : 'text-red-500')}>
      {isStarted ? 'กำลังดำเนิน: ' : 'นับถอยหลัง: '}
      {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
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
      orderBy('startAt', 'asc')
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

  const handleCreateEvent = async (data: {
    name: string;
    description: string;
    startAt: Date;
    rewardInfo: string;
    notifyMessage: string;
  }) => {
    if (!user) return;
    const { name, description, startAt, rewardInfo, notifyMessage } = data;
    const { addDoc, collection, serverTimestamp, Timestamp } = await import('firebase/firestore');
    await addDoc(collection(firestore, 'events'), {
      name,
      description,
      startAt: Timestamp.fromDate(startAt),
      rewardInfo,
      notifyMessage,
      isEnded: false,
      createdAt: serverTimestamp(),
      ownerUid: user.uid,
    });
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

  // Polling reload ถ้ายังเจอ event id ที่เพิ่งจบ
  useEffect(() => {
    if (waitForEndedId && filteredEvents.some(ev => ev.id === waitForEndedId)) {
      setTimeout(() => window.location.reload(), 700);
    }
  }, [waitForEndedId, filteredEvents]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl mx-auto">
        {/* Calendar Section */}
        <div className="w-full lg:w-1/3 max-w-md mx-auto lg:mx-0">
          <div className="bg-white/30 backdrop-blur-md border border-pink-200/50 shadow-lg p-4 rounded-xl">
            <h2 className="text-xl font-extrabold text-pink-700 flex items-center gap-2 mb-4">
              <CalendarIcon className="w-6 h-6 text-pink-500" />
              ปฏิทินกิจกรรม
            </h2>
            <Calendar
              onChange={setDate}
              value={date}
              className="border-none rounded-2xl shadow-lg bg-gradient-to-br from-pink-50 via-purple-50 to-white p-2 calendar-pastel"
              locale="th-TH"
              tileClassName={({ date: tileDate }: { date: Date }) => {
                const key = getLocalDateKey(tileDate);
                const isEvent = !!eventsByDate[key];
                const isToday = tileDate.toDateString() === new Date().toDateString();
                const isWeekend = tileDate.getDay() === 0 || tileDate.getDay() === 6;
                return cn(
                  "rounded-lg p-2 transition-all font-semibold",
                  tileDate.getMonth() === (date as Date).getMonth() 
                    ? "text-gray-800" 
                    : "text-gray-300",
                  isEvent && "bg-pink-200 text-pink-700 ring-2 ring-pink-400 ring-offset-2 hover:bg-pink-300 cursor-pointer",
                  isToday && "bg-purple-200 text-purple-700 border-2 border-purple-300",
                  isWeekend && "text-pink-400"
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

            {/* Events List */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-400">กำลังโหลดกิจกรรม...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : filteredEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">ไม่มีกิจกรรมที่ยังไม่จบ</div>
              ) : (
                filteredEvents.map((event) => {
                  const startDate = event.startAt && event.startAt.seconds 
                    ? new Date(event.startAt.seconds * 1000)
                    : null;
                  
                  return (
                    <Link href={`/events/${event.id}`} key={event.id} legacyBehavior>
                      <a>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(236, 72, 153, 0.15)' }}
                          className="cursor-pointer bg-gradient-to-br from-pink-50 via-purple-50 to-white border border-pink-100 rounded-2xl p-5 shadow-md hover:shadow-xl transition-all group mb-2"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">🎉</span>
                            <h3 className="font-bold text-lg text-pink-700 group-hover:text-pink-600 transition-colors break-words whitespace-normal flex-1 min-w-0">{event.name}</h3>
                          </div>
                          <div className="bg-white/80 rounded-xl px-4 py-2 shadow-sm w-full mb-2">
                            <div className="inline-flex items-start w-full min-w-0">
                              <span className="text-lg flex-shrink-0 mt-1">📝</span>
                              <span className="break-words whitespace-pre-line w-full ml-2 text-gray-700 text-sm min-w-0">{event.description}</span>
                            </div>
                          </div>
                          <div className="mb-2 space-y-2">
                            <div className="inline-flex items-center gap-2 bg-yellow-50 rounded-lg px-3 py-1 shadow-sm text-yellow-700 font-semibold text-sm w-fit self-start">
                              <span className="text-lg">🎁</span>
                              <span className="break-words whitespace-normal">{event.rewardInfo}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-1 shadow-sm text-blue-700 font-semibold text-sm w-fit self-start">
                              <span className="text-lg">🗓️</span>
                              <span>{startDate ? startDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                            </div>
                          </div>
                          <CountdownTimer targetDate={startDate} />
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
    </div>
  );
} 