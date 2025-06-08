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

// Add CurrentTime component
function CurrentTime() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center mt-1 mb-1 text-sm font-semibold text-pink-600 bg-white/80 rounded-xl px-4 py-2 shadow-sm">
      {currentTime.toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      })}
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

// Helper: เลือกสีตัวอักษรให้อ่านง่ายบนพื้นหลังสีใดๆ
function getReadableTextColor(bgColor: string) {
  // แปลง hex เป็น rgb
  let c = bgColor;
  if (c.startsWith('linear-gradient')) return '#fff'; // กรณีเป็น gradient ให้ใช้ขาว
  if (c.startsWith('#')) c = c.substring(1);
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // สูตร luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#222' : '#fff';
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
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);

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

  // เพิ่ม useEffect สำหรับ highlight กิจกรรมที่ตรงกับวันนี้
  useEffect(() => {
    if (filteredEvents.length > 0) {
      const today = new Date();
      const todayKey = getLocalDateKey(today);
      const found = filteredEvents.find(ev => {
        const start = ev.startAt?.seconds ? new Date(ev.startAt.seconds * 1000) : null;
        const end = ev.endAt?.seconds ? new Date(ev.endAt.seconds * 1000) : null;
        return (start && getLocalDateKey(start) === todayKey) || (end && getLocalDateKey(end) === todayKey);
      });
      if (found) {
        setHighlightedEventId(found.id);
      }
    }
  }, [filteredEvents]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl mx-auto">
        {/* Calendar Section */}
        <div className="w-full lg:w-1/3 max-w-md mx-auto flex flex-col items-center justify-center mb-8 self-start h-fit">
          <div className="sticky top-14 z-30 w-full max-w-md">
            <div className="bg-gradient-to-br from-pink-50 via-white to-blue-50/80 border-0 shadow-2xl p-7 rounded-3xl w-full">
              <h2 className="text-2xl font-extrabold bg-gradient-to-r from-pink-500 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent flex items-center gap-2 mb-5 drop-shadow">
                <CalendarIcon className="w-7 h-7 text-pink-400 drop-shadow" />
                ปฏิทินกิจกรรม
              </h2>
              <div className="flex justify-center">
                <Calendar
                  onChange={setDate}
                  value={date}
                  onActiveStartDateChange={({ activeStartDate }) => {
                    if (activeStartDate) {
                      setDate(new Date(activeStartDate.getFullYear(), activeStartDate.getMonth(), 1));
                      setHighlightedEventId(null); // reset highlight when change month
                    }
                  }}
                  onClickDay={(clickedDate) => {
                    // หา event ที่ตรงกับวันเริ่มหรือวันจบ
                    const clickedKey = getLocalDateKey(clickedDate);
                    const found = filteredEvents.find(ev => {
                      const start = ev.startAt?.seconds ? new Date(ev.startAt.seconds * 1000) : null;
                      const end = ev.endAt?.seconds ? new Date(ev.endAt.seconds * 1000) : null;
                      return (start && getLocalDateKey(start) === clickedKey) || (end && getLocalDateKey(end) === clickedKey);
                    });
                    setDate(clickedDate);
                    setHighlightedEventId(found ? found.id : null);
                  }}
                  className="border-none rounded-3xl shadow-xl bg-transparent p-2 calendar-pastel calendar-pink-labels"
                  locale="th-TH"
                  tileContent={({ date: tileDate }: { date: Date }) => {
                    // ไม่ต้องมี dot event แล้ว
                    return null;
                  }}
                  tileClassName={({ date: tileDate, view }) => {
                    const key = getLocalDateKey(tileDate);
                    const events = eventsRangeByDate[key] || [];
                    const isToday = tileDate.toDateString() === new Date().toDateString();
                    const isStartDate = events.some(ev => {
                      if (ev.startAt?.seconds) {
                        const startDate = new Date(ev.startAt.seconds * 1000);
                        return getLocalDateKey(startDate) === key;
                      }
                      return false;
                    });
                    const isEndDate = events.some(ev => {
                      if (ev.endAt?.seconds) {
                        const endDate = new Date(ev.endAt.seconds * 1000);
                        return getLocalDateKey(endDate) === key;
                      }
                      return false;
                    });
                    const isBetween = events.length > 0 && !isStartDate && !isEndDate;
                    const isOutside = tileDate.getMonth() !== (date as Date).getMonth();
                    // --- HIGHLIGHT MONTH/YEAR OF TODAY ---
                    const today = new Date();
                    if (view === 'year' && tileDate.getFullYear() === today.getFullYear() && tileDate.getMonth() === today.getMonth()) {
                      return 'calendar-pastel-tile-current-month';
                    }
                    if (view === 'decade' && tileDate.getFullYear() === today.getFullYear()) {
                      return 'calendar-pastel-tile-current-year';
                    }
                    // --- END HIGHLIGHT MONTH/YEAR ---
                    // ลำดับความสำคัญ: วันนี้ > วันเริ่ม > วันจบ > event > ปกติ
                    let statusClass = "calendar-pastel-tile";
                    if (isToday) statusClass += " calendar-pastel-tile-today";
                    else if (isStartDate) statusClass += " calendar-pastel-tile-start";
                    else if (isEndDate) statusClass += " calendar-pastel-tile-end";
                    else if (isBetween && isOutside) statusClass += " calendar-pastel-tile-event-outside";
                    else if (isBetween) statusClass += " calendar-pastel-tile-event";
                    else if (isOutside) statusClass += " calendar-pastel-tile-outside";
                    return statusClass;
                  }}
                  prevLabel={<span className="calendar-pastel-nav text-pink-400 text-lg font-bold">«</span>}
                  nextLabel={<span className="calendar-pastel-nav text-pink-400 text-lg font-bold">»</span>}
                  prev2Label={null}
                  next2Label={null}
                />
              </div>
              <CurrentTime />
              {/* Legend */}
              <div className="flex flex-wrap gap-2 justify-center items-center mt-2 mb-2 text-xs select-none">
                <div className="flex items-center gap-1">
                  <span className="inline-block w-5 h-5 rounded-full border-2 border-purple-400 bg-white"></span> วันนี้
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-5 h-5 rounded-full border-2 border-green-400 bg-white"></span> วันเริ่ม
                </div>
                <div className="flex items-center gap-1">
                  <span className="inline-block w-5 h-5 rounded-full border-2 border-red-400 bg-white"></span> วันจบ
                </div>
              </div>
              <button
                onClick={() => router.push('/events/history')}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-0 bg-gradient-to-r from-pink-200 via-white to-blue-100 text-pink-700 font-bold shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-150"
              >
                <History className="w-5 h-5" />
                ประวัติกิจกรรม
              </button>
            </div>
            {/* Event summary below calendar */}
            <div className="flex flex-col gap-2 mt-4 w-full">
              <div className="flex flex-col gap-2 w-full">
                {filteredEvents.length === 0 ? (
                  <span className="text-xs text-gray-400 text-center">ไม่มีกิจกรรมในช่วงนี้</span>
                ) : (
                  filteredEvents.map(ev => {
                    const start = ev.startAt?.seconds ? new Date(ev.startAt.seconds * 1000) : null;
                    const end = ev.endAt?.seconds ? new Date(ev.endAt.seconds * 1000) : null;
                    const textColor = getReadableTextColor(ev.color || '#ec4899');
                    const isHighlighted = highlightedEventId === ev.id;
                    return (
                      <Link href={`/events/${ev.id}`} key={ev.id} legacyBehavior>
                        <a>
                          <div
                            className={
                              `flex items-center gap-2 rounded-xl px-3 py-2 shadow-sm border text-xs min-w-0 w-full transition-all duration-200 ${isHighlighted ? 'scale-105 shadow-xl ring-2 ring-pink-400 z-10' : ''} hover:scale-105 hover:shadow-lg cursor-pointer`
                            }
                            style={{
                              borderColor: ev.color || '#f9a8d4',
                              background: ev.color ? ev.color : '#f9a8d4',
                            }}
                          >
                            <span className="text-lg flex-shrink-0">🎉</span>
                            <div className="flex flex-col min-w-0 w-full">
                              <span
                                className="font-bold truncate max-w-full"
                                style={{
                                  color: textColor,
                                  textShadow: textColor === '#fff' ? '0 1px 4px rgba(0,0,0,0.18)' : '0 1px 4px rgba(255,255,255,0.10)'
                                }}
                              >
                                {ev.name}
                              </span>
                              <span className="text-xs mt-0.5 flex gap-1 items-center flex-wrap">
                                {start && (
                                  <span className="font-semibold text-green-600 bg-white rounded-full px-2 py-0.5">
                                    {start.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                                  </span>
                                )}
                                <span className="text-white/80">-</span>
                                {end && (
                                  <span className="font-semibold text-red-500 bg-white rounded-full px-2 py-0.5">
                                    {end.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' })}
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </a>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
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
                    {/* Spinning ring */}
                    <div className="absolute inset-0">
                      <div className="w-24 h-24 rounded-full border-4 border-pink-300 border-t-transparent animate-spin"></div>
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
                            <div className="md:hidden text-center text-sm text-pink-500 font-medium mb-2">
                              👆 แตะเพื่อดูรายละเอียด
                            </div>
                            <div className="hidden md:block px-4 py-2 w-full mb-2">
                              <div className="inline-flex items-start w-full min-w-0">
                                <span className="text-lg flex-shrink-0 mt-1">📝</span>
                                <div
                                  className="break-words w-full ml-2 text-pink-500 text-sm font-semibold drop-shadow-sm min-w-0 bg-white/70 backdrop-blur-sm rounded-lg px-4 py-2"
                                  dangerouslySetInnerHTML={{ __html: event.description || 'ไม่มีรายละเอียดกิจกรรม' }}
                                />
                              </div>
                            </div>
                            <div className="mb-2 space-y-2 flex flex-col">
                              <div className="hidden md:flex bg-yellow-50 rounded-lg px-3 py-1 shadow-sm text-yellow-700 font-semibold text-sm max-w-[600px] break-words whitespace-pre-line self-start block inline-flex items-center">
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
          font-size: 1.2rem;
          background: linear-gradient(90deg,#ec4899,#a5b4fc 80%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        /* ปุ่มเดือนก่อน/ถัดไป */
        .calendar-pastel-nav {
          background: #f9a8d4;
          border-radius: 50%;
          width: 2.2rem;
          height: 2.2rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px #f9a8d4aa;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .calendar-pastel-nav:hover {
          box-shadow: 0 4px 16px #ec4899cc;
          background: #f472b6;
          color: #fff !important;
          transform: scale(1.08);
        }
        /* ชื่อวัน (จ, อ, พ, ... ) */
        .calendar-pink-labels .react-calendar__month-view__weekdays__weekday {
          color: #ec4899 !important;
          font-weight: bold;
          font-size: 1.1rem;
          letter-spacing: 0.04em;
          text-shadow: 0 1px 2px #fff8;
        }
        /* วันปกติ: ไม่มีวงกลม ไม่มีขอบ */
        .calendar-pastel-tile {
          width: 2.2rem !important;
          height: 2.2rem !important;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          background: transparent !important;
          color: #ec4899 !important;
          border: none !important;
          font-size: 1.1rem;
          font-weight: 600;
          box-shadow: none;
          margin: 0.1rem;
          transition: box-shadow 0.18s, transform 0.18s, border 0.18s, background 0.18s, color 0.18s;
        }
        /* วันที่มี event (ระหว่างกิจกรรม) */
        .calendar-pastel-tile-event {
          color: #ec4899 !important; /* ชมพู */
          background: transparent !important;
          border: none !important;
        }
        /* วันที่มี event (ระหว่างกิจกรรม) แต่นอกเดือน */
        .calendar-pastel-tile-event-outside {
          color: #d1d5db !important; /* gray-300 */
          background: transparent !important;
          border: none !important;
        }
        /* วันปกติที่อยู่นอกเดือน */
        .calendar-pastel-tile-outside {
          color: #e5e7eb !important;
          background: transparent !important;
          border: none !important;
        }
        /* วันเริ่มกิจกรรม */
        .calendar-pastel-tile-start {
          border: 2.5px solid #4ade80 !important;
          color: #16a34a !important;
          background: #fff !important;
        }
        /* วันจบกิจกรรม */
        .calendar-pastel-tile-end {
          border: 2.5px solid #f87171 !important;
          color: #dc2626 !important;
          background: #fff !important;
        }
        /* วันนี้: วงกลมขอบม่วง ไม่มีพื้นหลัง */
        .calendar-pastel-tile-today {
          border: 2.5px solid #a78bfa !important;
          background: #fff !important;
          font-weight: bold;
          z-index: 2;
        }
        /* วันนี้ + วันเริ่ม */
        .calendar-pastel-tile-today.calendar-pastel-tile-start {
          border: 2.5px solid #a78bfa !important;
          color: #16a34a !important;
        }
        /* วันนี้ + วันจบ */
        .calendar-pastel-tile-today.calendar-pastel-tile-end {
          border: 2.5px solid #a78bfa !important;
          color: #dc2626 !important;
        }
        /* วันนี้ + event เฉยๆ */
        .calendar-pastel-tile-today.calendar-pastel-tile-event {
          border: 2.5px solid #a78bfa !important;
          color: #ec4899 !important;
        }
        /* วันนี้ + ปกติ */
        .calendar-pastel-tile-today:not(.calendar-pastel-tile-start):not(.calendar-pastel-tile-end):not(.calendar-pastel-tile-event) {
          border: 2.5px solid #a78bfa !important;
          color: #a21caf !important;
        }
        /* Hover effect */
        .calendar-pastel-tile:hover {
          box-shadow: 0 4px 16px #f9a8d4cc;
          transform: scale(1.08);
          z-index: 3;
        }
        /* ไฮไลท์เดือนปัจจุบัน (วันนี้) ใน year view */
        .calendar-pastel-tile-current-month {
          color: #ec4899 !important;
          font-weight: bold;
          border-radius: 0.75rem;
          background: #fce7f3 !important;
          box-shadow: 0 0 0 2px #ec4899;
        }
        /* ไฮไลท์ปีปัจจุบัน (วันนี้) ใน decade view */
        .calendar-pastel-tile-current-year {
          color: #ec4899 !important;
          font-weight: bold;
          border-radius: 0.75rem;
          background: #fce7f3 !important;
          box-shadow: 0 0 0 2px #ec4899;
        }
        /* เดือนใน year view เป็นสีชมพูเหมือนเลขวันปกติ */
        .react-calendar__year-view .react-calendar__tile {
          color: #ec4899 !important;
          font-weight: 600;
          background: transparent !important;
        }
        /* ลดความเด่นของเดือนที่ถูกเลือก (selected month) ใน year view */
        .react-calendar__year-view .react-calendar__tile--active {
          color: #ec4899 !important;
          font-weight: 600 !important;
          background: #fff !important;
          border-radius: 0.75rem;
          box-shadow: 0 0 0 2px #f9a8d4;
        }
        /* Scrollbar pastel pink for event summary */
        .event-scrollbar::-webkit-scrollbar {
          width: 8px;
          border-radius: 8px;
          background: #fce7f3;
        }
        .event-scrollbar::-webkit-scrollbar-thumb {
          background: #f9a8d4;
          border-radius: 8px;
        }
        .event-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ec4899;
        }
        .event-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #f9a8d4 #fce7f3;
        }
      `}</style>
    </div>
  );
} 