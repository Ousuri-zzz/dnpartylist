'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { doc, getDoc, collection, onSnapshot, setDoc, deleteDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { Edit2, Trash2, ArrowLeft, Check, Gift } from 'lucide-react';
import { CreateEventModal } from '@/components/events/CreateEventModal';

function CountdownTimer({ targetDate, className = "" }: { targetDate: Date | null, className?: string }) {
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
    <span className={className + ' ' + (isStarted ? 'text-green-600' : 'text-red-500') + ' font-semibold'}>
      {isStarted ? 'กำลังดำเนิน: ' : 'นับถอยหลัง: '}
      {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </span>
  );
}

function ConfirmModal({ open, onConfirm, onCancel, message }: { open: boolean; onConfirm: () => void; onCancel: () => void; message: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 min-w-[300px] max-w-xs">
        <div className="mb-4 text-gray-800 text-center">{message}</div>
        <div className="flex justify-center gap-4">
          <Button className="bg-pink-500 text-white" onClick={onConfirm}>ยืนยัน</Button>
          <Button variant="outline" onClick={onCancel}>ยกเลิก</Button>
        </div>
      </div>
    </div>
  );
}

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

// เพิ่ม Toast component แบบง่าย
function Toast({ message, show }: { message: string, show: boolean }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      <div className="bg-pink-100 text-pink-700 px-5 py-3 rounded-xl shadow-lg border border-pink-200/80 text-base font-medium min-w-[200px] text-center transition-all animate-fade-in">
        {message}
      </div>
    </div>
  );
}

// ใหม่: CountdownOrEnded
function CountdownOrEnded({ event, startDate }: { event: any, startDate: Date | null }) {
  if (event.isEnded && event.endedAt && event.endedAt.seconds && startDate) {
    const endedDate = new Date(event.endedAt.seconds * 1000);
    const durationMs = endedDate.getTime() - startDate.getTime();
    const duration = durationMs > 0 ? durationMs : 0;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 text-green-700 shadow font-mono text-lg">
        <span className="text-lg">✅</span>
        ระยะเวลากิจกรรม: {hours.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-100 to-purple-100 shadow font-mono text-blue-700 text-lg">
      <span role="img" aria-label="clock">🕒</span>
      <CountdownTimer targetDate={startDate} className="inline" />
    </div>
  );
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [rewardGiven, setRewardGiven] = useState(false); // mock
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'join' | 'leave' | null }>({ open: false, type: null });
  const [participantUids, setParticipantUids] = useState<Array<{uid: string, rewardGiven?: boolean, rewardNote?: string}>>([]);
  const { users, isLoading: usersLoading } = useUsers();
  const [announceMsg, setAnnounceMsg] = useState('');
  const [announceSaved, setAnnounceSaved] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [endModal, setEndModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [rewardModal, setRewardModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string>('');
  const [rewardName, setRewardName] = useState('');

  // ตรวจสอบสิทธิ์เจ้าของกิจกรรม (owner)
  const justCreated = searchParams.get('justCreated') === '1';
  const isOwner = (!!user && !!event && user.uid === event.ownerUid) || justCreated;

  useEffect(() => {
    if (!params?.id) return;
    setLoading(true);
    setError(null);
    getDoc(doc(firestore, 'events', params.id as string)).then((docSnap) => {
      if (docSnap.exists()) {
        setEvent({ id: docSnap.id, ...docSnap.data() });
        setAnnounceMsg(docSnap.data().discordAnnounceMessage || '');
      } else {
        setError('ไม่พบกิจกรรมนี้');
      }
      setLoading(false);
    }).catch((err) => {
      setError('เกิดข้อผิดพลาดในการโหลดกิจกรรม');
      setLoading(false);
    });
  }, [params?.id]);

  useEffect(() => {
    if (event && event.startAt && event.startAt.seconds) {
      setStartDate(new Date(event.startAt.seconds * 1000));
    } else {
      setStartDate(null);
    }
  }, [event?.startAt]);

  // ดึง participants (uid) แบบ realtime
  useEffect(() => {
    if (!params?.id || !user) return;
    const colRef = collection(firestore, 'events', params.id as string, 'participants');
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(doc => ({
        uid: doc.id,
        rewardGiven: doc.data().rewardGiven || false,
        rewardNote: doc.data().rewardNote || ''
      }));
      setParticipantUids(list);
      setJoined(!!list.find(p => p.uid === user.uid));
    });
    return () => unsub();
  }, [params?.id, user?.uid]);

  const handleJoin = () => setConfirmModal({ open: true, type: 'join' });
  const handleLeave = () => setConfirmModal({ open: true, type: 'leave' });
  const handleConfirm = async () => {
    if (!params?.id || !user) return;
    const partRef = doc(firestore, 'events', params.id as string, 'participants', user.uid);
    if (confirmModal.type === 'join') {
      await setDoc(partRef, { joinedAt: serverTimestamp() }); // เก็บแค่ uid
    }
    if (confirmModal.type === 'leave') {
      await deleteDoc(partRef);
    }
    setConfirmModal({ open: false, type: null });
  };
  const handleCancel = () => setConfirmModal({ open: false, type: null });

  // ฟังก์ชันบันทึกข้อความประกาศลง Firestore
  const handleSaveAnnounce = async () => {
    if (!params?.id || !user || !event) return;
    await updateDoc(doc(firestore, 'events', params.id as string), {
      discordAnnounceMessage: announceMsg,
    });
    setAnnounceSaved(true);
    setToast({ show: true, message: 'บันทึกข้อความประกาศเรียบร้อย!' });
    setTimeout(() => setAnnounceSaved(false), 1500);
  };

  // ฟังก์ชันคัดลอกข้อความประกาศ
  const handleCopyAnnounce = () => {
    const preview =
      (announceMsg ? `📢 ${announceMsg}\n\n` : '') +
      `🎉 ${event.name}\n📝 ${event.description}\n🗓️ วันเวลาเริ่ม: ${startDate ? startDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}\n🎁 ของรางวัล: ${event.rewardInfo}` +
      `\n\n🔗 เช็คชื่อเข้าร่วมกิจกรรมที่ https://dnpartylist.vercel.app/events/${event.id}`;
    copyToClipboard(preview);
    setToast({ show: true, message: 'คัดลอกข้อความประกาศเรียบร้อย!' });
  };

  // ฟังก์ชันอัปเดตกิจกรรม
  const handleEditEvent = async (data: { name: string; description: string; startAt: Date; rewardInfo: string; notifyMessage: string; }) => {
    if (!user || !event) return;
    const { name, description, startAt, rewardInfo } = data;
    await updateDoc(doc(firestore, 'events', event.id), {
      name,
      description,
      startAt,
      rewardInfo,
    });
    setIsEditModalOpen(false);
    // reload event
    const docSnap = await getDoc(doc(firestore, 'events', event.id));
    if (docSnap.exists()) setEvent({ id: docSnap.id, ...docSnap.data() });
  };

  // ฟังก์ชันลบกิจกรรม
  const handleDeleteEvent = async () => {
    if (!user || !event) return;
    await deleteDoc(doc(firestore, 'events', event.id));
    setDeleteModal(false);
    router.push('/events');
  };

  // ฟังก์ชันจบกิจกรรม
  const handleEndEvent = async () => {
    if (!user || !event) return;
    await updateDoc(doc(firestore, 'events', event.id), {
      isEnded: true,
      endedAt: serverTimestamp(),
    });
    setEndModal(false);
    setToast({ show: true, message: 'จบกิจกรรมเรียบร้อย!' });
    // Poll หน้า /events จนกว่า event id จะหายไป
    window.location.href = `/events?waitForEnded=${event.id}`;
  };

  // ฟังก์ชันมอบรางวัล
  const handleGiveReward = async (uid: string, reward: string) => {
    if (!user || !event || !uid || !reward) return;
    
    try {
      const partRef = doc(firestore, 'events', event.id, 'participants', uid);
      await updateDoc(partRef, {
        rewardGiven: true,
        rewardNote: reward,
      });
      
      setToast({ show: true, message: 'มอบรางวัลเรียบร้อย!' });
    } catch (err) {
      console.error(err);
      setToast({ show: true, message: 'เกิดข้อผิดพลาดในการมอบรางวัล' });
    }
  };

  // ซ่อน toast อัตโนมัติ
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (loading || usersLoading || authLoading || !user) {
    return <div className="max-w-2xl mx-auto py-8 px-4 text-center text-gray-400">กำลังโหลดกิจกรรม...</div>;
  }
  if (error) {
    return <div className="max-w-2xl mx-auto py-8 px-4 text-center text-red-500">{error}</div>;
  }
  if (!event) return null;

  // สร้าง array รายชื่อผู้เข้าร่วมจาก users
  const participantUsers = participantUids
    .map(uid => users[uid.uid])
    .filter(Boolean)
    .sort((a, b) => {
      const aReward = participantUids.find(p => p.uid === a.uid)?.rewardGiven || false;
      const bReward = participantUids.find(p => p.uid === b.uid)?.rewardGiven || false;
      if (aReward && !bReward) return -1;
      if (!aReward && bReward) return 1;
      return 0;
    });

  // Template ข้อความประกาศ Discord (ถ้าไม่มีข้อความเดิม)
  const defaultAnnounce =
    `🎉 ${event.name}\n` +
    `📝 ${event.description}\n\n` +
    `🗓️ วันเวลาเริ่ม: ${startDate ? startDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}\n` +
    `🎁 ของรางวัล: ${event.rewardInfo}`;

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6 flex justify-between items-center">
        <button
          onClick={() => router.push('/events')}
          className="flex items-center gap-2 px-5 py-2 rounded-full border border-pink-200 bg-pink-50 text-pink-700 font-medium shadow hover:bg-purple-50 transition-colors duration-150"
        >
          <ArrowLeft className="w-4 h-4 mr-1 text-pink-400" />
          ย้อนกลับไปหน้ารายการกิจกรรม
        </button>
        {isOwner && !event.isEnded && (
          <button
            onClick={() => setEndModal(true)}
            className="flex items-center gap-2 px-5 py-2 rounded-full border border-green-200 bg-green-50 text-green-700 font-medium shadow hover:bg-green-100 transition-colors duration-150"
          >
            <Check className="w-4 h-4 mr-1 text-green-500" />
            กิจกรรมเสร็จสิ้น
          </button>
        )}
      </div>
      <div className="bg-gradient-to-br from-pink-100 via-purple-50 to-white/60 backdrop-blur-md border border-pink-200/50 shadow-2xl p-8 rounded-2xl relative">
        {/* ปุ่มแก้ไข/ลบ เฉพาะ owner */}
        {isOwner && (
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            {!event.isEnded && (
              <button title="แก้ไขกิจกรรม" onClick={() => setIsEditModalOpen(true)} className="p-2 rounded-full bg-white/80 hover:bg-blue-100 border border-blue-200 shadow transition"><Edit2 className="w-5 h-5 text-blue-600" /><span className="sr-only">แก้ไข</span></button>
            )}
            <button title="ลบกิจกรรม" onClick={() => setDeleteModal(true)} className="p-2 rounded-full bg-white/80 hover:bg-red-100 border border-red-200 shadow transition"><Trash2 className="w-5 h-5 text-red-600" /><span className="sr-only">ลบ</span></button>
          </div>
        )}
        <motion.h1 initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} transition={{duration:0.4}} className="text-4xl font-extrabold mb-2 text-pink-700 flex items-center gap-3 drop-shadow-lg">
          🎊 {event.name} 🎊
        </motion.h1>
        <div className="mb-4">
          <div className="text-lg text-purple-700 font-semibold flex items-center gap-2 animate-pulse">
            ✨ ยินดีต้อนรับสู่กิจกรรมสุดพิเศษ! ✨
          </div>
          <p className="text-gray-700 mt-2 text-lg flex items-center gap-2 bg-white/60 rounded-xl px-4 py-2 shadow-sm">
            <span className="text-xl">📝</span>{event.description || 'ไม่มีรายละเอียดกิจกรรม'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex items-center gap-2 bg-blue-50 rounded-xl px-4 py-2 shadow text-blue-800 font-semibold">
            <span className="text-2xl">🗓️</span>
            <span>เริ่มกิจกรรม:</span>
            <span className="ml-1 text-sm">{startDate ? startDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
          </div>
          {event.endedAt && (
            <div className="flex items-center gap-2 bg-red-50 rounded-xl px-4 py-2 shadow text-red-700 font-semibold">
              <span className="text-2xl">⏰</span>
              <span>จบกิจกรรม:</span>
              <span className="ml-1 text-sm">{event.endedAt.seconds ? new Date(event.endedAt.seconds * 1000).toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-yellow-700 mb-6 text-lg font-semibold bg-yellow-50 rounded-xl px-4 py-2 shadow-sm">
          <span className="text-2xl">🎁</span>
          <span className="font-medium">ของรางวัล:</span> <span className="ml-1">{event.rewardInfo || 'ไม่มีข้อมูลรางวัล'}</span>
        </div>
        <div className="mb-6">
          <CountdownOrEnded event={event} startDate={startDate} />
        </div>
        {/* เฉพาะเจ้าของกิจกรรมเท่านั้นที่เห็น UI ประกาศ Discord */}
        {user.uid === event.ownerUid && !event.isEnded && (
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{duration:0.4}} className="my-8 p-6 bg-gradient-to-r from-blue-50 to-purple-100 border-2 border-blue-200/60 rounded-2xl shadow-lg">
            <h3 className="font-semibold text-blue-700 mb-2 flex items-center gap-2 text-lg">📢 ข้อความประกาศเพิ่มเติม</h3>
            <textarea
              className="w-full rounded-lg border border-blue-200 p-2 mb-2 text-sm font-mono bg-white/80 shadow-inner focus:ring-2 focus:ring-blue-300 transition"
              rows={3}
              placeholder="ใส่ข้อความประกาศเพิ่มเติม (ถ้ามี)"
              value={announceMsg}
              onChange={e => { setAnnounceMsg(e.target.value); setAnnounceSaved(false); }}
            />
            <div className="flex gap-2 mb-2">
              <Button size="sm" className="flex items-center gap-1 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 shadow" onClick={handleCopyAnnounce}>
                📋 คัดลอกข้อความ
              </Button>
              <Button size="sm" variant="outline" className="flex items-center gap-1 border-blue-400 text-blue-700 hover:bg-blue-50" onClick={handleSaveAnnounce} disabled={announceSaved}>
                💾 {announceSaved ? 'บันทึกแล้ว' : 'บันทึกข้อความ'}
              </Button>
            </div>
            <div className="bg-white/70 border border-blue-100 rounded p-2 text-xs text-gray-600 shadow-inner">
              <div className="font-semibold mb-1 flex items-center gap-1">👁️‍🗨️ Preview:</div>
              <pre className="whitespace-pre-wrap font-mono text-gray-800">{
                (announceMsg
                  ? `📢 ${announceMsg}\n\n` : '') +
                `🎉 ${event.name}\n📝 ${event.description}\n🗓️ วันเวลาเริ่ม: ${startDate ? startDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}\n🎁 ของรางวัล: ${event.rewardInfo}` +
                `\n\n🔗 เช็คชื่อเข้าร่วมกิจกรรมที่ https://dnpartylist.vercel.app/events/${event.id}`
              }</pre>
            </div>
          </motion.div>
        )}
        {/* ปุ่มเข้าร่วม/ออกกิจกรรม */}
        <div className="flex gap-4 items-center my-6">
        {!joined ? (
          <Button
            className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-xl shadow-lg hover:scale-105 hover:shadow-2xl transition-all text-lg"
            onClick={handleJoin}
            disabled={event.isEnded}
          >
            🙋‍♂️ เข้าร่วมกิจกรรม
          </Button>
        ) : (
          <Button
            variant="outline"
            className="flex items-center gap-2 border-red-400 text-red-600 hover:bg-red-50 ml-2 px-8 py-3 rounded-xl shadow text-lg"
            onClick={handleLeave}
            disabled={rewardGiven || event.isEnded}
          >
            🚪 ออกจากกิจกรรม
          </Button>
        )}
        </div>
        <ConfirmModal
          open={confirmModal.open}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          message={confirmModal.type === 'join' ? 'ยืนยันเข้าร่วมกิจกรรมนี้?' : 'ยืนยันออกจากกิจกรรมนี้?'}
        />
        {/* รายชื่อผู้เข้าร่วม */}
        <div className="mt-10">
          <h2 className="text-xl font-bold text-pink-700 mb-4 flex items-center gap-2">👥 รายชื่อผู้เข้าร่วมกิจกรรม</h2>
          {participantUsers.length === 0 ? (
            <div className="text-gray-400 flex items-center gap-2"><span>😶‍🌫️</span>ยังไม่มีผู้เข้าร่วม</div>
          ) : (
            <ul className="divide-y divide-pink-100">
              {participantUsers.map((u) => {
                const participantDoc = participantUids.find(p => p.uid === u.uid);
                return (
                  <li key={u.uid} className="py-3 flex items-center gap-3 hover:bg-pink-50 rounded-lg transition">
                    <span className="text-2xl">👤</span>
                    <span className="font-medium text-gray-800">{u.meta?.discord || 'ไม่ทราบชื่อ'}</span>
                    {u.characters && Object.values(u.characters).length > 0 && (
                      <span className="text-gray-500 text-sm">— ตัวละคร: {Object.values(u.characters).map((c: any) => c.name).join(', ')}</span>
                    )}
                    {isOwner && !event.isEnded && !participantDoc?.rewardGiven && (
                      <button
                        onClick={() => {
                          setSelectedParticipant(u.uid);
                          setRewardName("");
                          setRewardModal(true);
                        }}
                        className="ml-auto flex items-center gap-1 px-3 py-1 rounded-full border border-yellow-200 bg-yellow-50 text-yellow-700 text-sm font-medium shadow hover:bg-yellow-100 transition-colors duration-150"
                      >
                        <Gift className="w-3 h-3" />
                        มอบรางวัล
                      </button>
                    )}
                    {participantDoc?.rewardGiven && (
                      <span 
                        onClick={() => {
                          if (isOwner && !event.isEnded) {
                            setSelectedParticipant(u.uid);
                            setRewardName(participantDoc.rewardNote || "");
                            setRewardModal(true);
                          }
                        }}
                        className={`ml-auto text-sm ${isOwner && !event.isEnded ? 'cursor-pointer hover:text-green-700' : 'text-green-600'}`}
                      >
                        ✓ {participantDoc.rewardNote}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {/* Modal แก้ไขกิจกรรม */}
        {isEditModalOpen && startDate && (
          <CreateEventModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSubmit={handleEditEvent}
            defaultValues={{
              name: event.name,
              description: event.description,
              startAt: startDate,
              rewardInfo: event.rewardInfo,
              notifyMessage: event.notifyMessage || '',
            }}
            isEdit
          />
        )}
        {/* Confirm Modal สำหรับลบกิจกรรม */}
        {deleteModal && (
          <ConfirmModal
            open={deleteModal}
            onConfirm={handleDeleteEvent}
            onCancel={() => setDeleteModal(false)}
            message="ยืนยันลบกิจกรรมนี้? (ข้อมูลจะหายถาวร)"
          />
        )}
        {/* Confirm Modal สำหรับจบกิจกรรม */}
        {endModal && (
          <ConfirmModal
            open={endModal}
            onConfirm={handleEndEvent}
            onCancel={() => setEndModal(false)}
            message="ยืนยันจบกิจกรรมนี้? (จะไม่สามารถเข้าร่วม/ออกกิจกรรมได้อีก)"
          />
        )}
        {/* Modal มอบรางวัล */}
        {rewardModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-lg p-6 min-w-[300px] max-w-md">
              <h3 className="text-lg font-semibold mb-4 text-yellow-700 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                มอบรางวัล
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อรางวัล</label>
                  <input
                    type="text"
                    value={rewardName}
                    onChange={(e) => setRewardName(e.target.value)}
                    placeholder="เช่น Top DPS, MVP, etc."
                    className="w-full rounded-lg border border-yellow-200 p-2 focus:ring-2 focus:ring-yellow-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ผู้ได้รับรางวัล</label>
                  <div className="p-3 bg-yellow-50 rounded-lg flex items-center gap-2">
                    <span className="text-gray-800 font-medium">
                      {(() => {
                        const u = participantUsers.find(u => u.uid === selectedParticipant);
                        return u ? (u.meta?.discord || 'ไม่ทราบชื่อ') : '';
                      })()}
                    </span>
                    {(() => {
                      const u = participantUsers.find(u => u.uid === selectedParticipant);
                      return u && u.characters && Object.values(u.characters).length > 0 ? (
                        <span className="text-gray-500 text-sm">— ตัวละคร: {Object.values(u.characters).map((c: any) => c.name).join(', ')}</span>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    setRewardModal(false);
                    setSelectedParticipant('');
                    setRewardName('');
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    if (selectedParticipant) {
                      handleGiveReward(selectedParticipant, rewardName);
                      setRewardModal(false);
                      setSelectedParticipant('');
                      setRewardName('');
                    }
                  }}
                  disabled={!selectedParticipant || !rewardName}
                  className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  มอบรางวัล
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Toast แจ้งเตือน */}
        <Toast message={toast.message} show={toast.show} />
      </div>
    </div>
  );
} 