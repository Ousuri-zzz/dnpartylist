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
import { Edit2, Trash2, ArrowLeft, Check, Gift, Sword, Zap, Sparkles, Shield, Star, Crown } from 'lucide-react';
import { CreateEventModal } from '@/components/events/CreateEventModal';
import { createPortal } from 'react-dom';
import React from 'react';
import { Character } from '@/types/character';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
  const days = Math.floor(absTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absTime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((absTime % (1000 * 60)) / 1000);
  return (
    <span className={className + ' ' + (isStarted ? 'text-green-600' : 'text-red-500') + ' font-semibold'}>
      {isStarted ? 'กำลังดำเนิน: ' : 'นับถอยหลัง: '}
      {days > 0
        ? `${days} วัน ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
    </span>
  );
}

function ConfirmModal({ open, onConfirm, onCancel, message }: { open: boolean; onConfirm: () => void; onCancel: () => void; message: string }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg p-6 min-w-[300px] max-w-xs relative">
        <div className="mb-4 text-gray-800 text-center">{message}</div>
        <div className="flex justify-center gap-4">
          <Button className="bg-pink-500 text-white" onClick={onConfirm}>ยืนยัน</Button>
          <Button variant="outline" onClick={onCancel}>ยกเลิก</Button>
        </div>
      </div>
    </div>,
    typeof window !== 'undefined' ? document.body : (null as any)
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

// เพิ่มไอคอนและปรับตำแหน่ง Toast
function Toast({ message, show }: { message: string, show: boolean }) {
  if (!show) return null;
  const isSuccess = message.includes('เรียบร้อย') || message.includes('สำเร็จ');
  const isError = message.includes('ผิดพลาด') || message.includes('ล้มเหลว');
  if (typeof window === 'undefined' || !document.body) return null;
  return createPortal(
    <div style={{ position: 'fixed', top: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
      <div className={
        `flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border-2 text-lg font-semibold min-w-[240px] text-center transition-all animate-fade-in ` +
        (isSuccess ? 'bg-green-50 border-green-300 text-green-700' : isError ? 'bg-red-50 border-red-300 text-red-700' : 'bg-pink-100 border-pink-200 text-pink-700')
      }>
        <span className="text-2xl">
          {isSuccess ? '✅' : isError ? '❌' : '🎉'}
        </span>
        <span>{message}</span>
      </div>
    </div>,
    document.body
  );
}

// ใหม่: CountdownOrEnded
function CountdownOrEnded({ event, startDate, staticCountdownText }: { event: any, startDate: Date | null, staticCountdownText?: string }) {
  if (event.isEnded && event.endedAt && event.endedAt.seconds && startDate) {
    const endedDate = new Date(event.endedAt.seconds * 1000);
    const durationMs = endedDate.getTime() - startDate.getTime();
    const duration = durationMs > 0 ? durationMs : 0;
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    const hours = Math.floor((duration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 text-green-700 shadow font-mono text-lg">
        <span className="text-lg">✅</span>
        ระยะเวลากิจกรรม: {days > 0
          ? `${days} วัน ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-100 to-purple-100 shadow font-mono text-blue-700 text-lg">
      <span role="img" aria-label="clock">🕒</span>
      {staticCountdownText ? (
        <span>{staticCountdownText}</span>
      ) : (
        <CountdownTimer targetDate={startDate} className="inline" />
      )}
    </div>
  );
}

// เพิ่มฟังก์ชันลอก tag HTML (เฉพาะใน client)
function stripHtml(html: string) {
  if (typeof window !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
  // fallback (SSR)
  return html.replace(/<[^>]+>/g, '');
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
  const [rewardGiven, setRewardGiven] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'join' | 'leave' | null }>({ open: false, type: null });
  const [participantUids, setParticipantUids] = useState<Array<{uid: string, joinedAt?: Date, rewardGiven?: boolean, rewardNote?: string, message?: string, messageUpdatedAt?: Date, characterId?: string, groupId?: string, groupName?: string}>>([]);
  const { users, isLoading: usersLoading } = useUsers();
  const [announceMsg, setAnnounceMsg] = useState('');
  const [announceSaved, setAnnounceSaved] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [endModal, setEndModal] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [rewardModal, setRewardModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [rewardName, setRewardName] = useState('');
  const [participantMessage, setParticipantMessage] = useState('');
  const [hoveredUid, setHoveredUid] = useState<string | null>(null);
  const [showCharModal, setShowCharModal] = useState(false);
  const [selectedChar, setSelectedChar] = useState<Character | null>(null);
  // เพิ่ม state สำหรับระบบกลุ่ม
  const [groupModal, setGroupModal] = useState(false);
  const [selectedGroupMember, setSelectedGroupMember] = useState<string>('');
  const [groups, setGroups] = useState<Array<{id: string, members: string[]}>>([]);
  const [maxGroupSize, setMaxGroupSize] = useState<number>(event?.maxGroupSize || 0); // ใช้ค่าจาก event แทน
  // เพิ่ม state สำหรับ modal กรอกชื่อกลุ่ม
  const [groupNameModalOpen, setGroupNameModalOpen] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupNameEditingGroupId, setGroupNameEditingGroupId] = useState<string | null>(null);

  // ตรวจสอบสิทธิ์เจ้าของกิจกรรม (owner)
  const justCreated = searchParams.get('justCreated') === '1';
  const isOwner = (!!user && !!event && user.uid === event.ownerUid) || justCreated;

  // ดึงตัวละครของ user
  let myCharacters: Character[] = [];
  if (user && users && users[user.uid]) {
    const chars = users[user.uid].characters;
    myCharacters = Object.values(chars ?? {}).sort((a, b) => a.name.localeCompare(b.name, 'th', {sensitivity: 'base'}));
  }

  // ฟังก์ชัน map อาชีพย่อยเป็นอาชีพหลัก
  const CLASS_TO_MAIN_CLASS: Record<string, string> = {
    'Sword Master': 'Warrior',
    'Mercenary': 'Warrior',
    'Bowmaster': 'Archer',
    'Acrobat': 'Archer',
    'Force User': 'Sorceress',
    'Elemental Lord': 'Sorceress',
    'Paladin': 'Cleric',
    'Priest': 'Cleric',
    'Engineer': 'Academic',
    'Alchemist': 'Academic',
  };
  const classColors: Record<string, { text: string; bg: string; border: string }> = {
    'Warrior': { text: 'text-rose-500', bg: 'bg-gradient-to-br from-rose-50/90 to-pink-100/80', border: 'border-rose-200/80' },
    'Archer': { text: 'text-lime-500', bg: 'bg-gradient-to-br from-lime-50/90 to-green-100/80', border: 'border-lime-200/80' },
    'Sorceress': { text: 'text-fuchsia-500', bg: 'bg-gradient-to-br from-fuchsia-50/90 to-purple-100/80', border: 'border-fuchsia-200/80' },
    'Cleric': { text: 'text-cyan-500', bg: 'bg-gradient-to-br from-cyan-50/90 to-blue-100/80', border: 'border-cyan-200/80' },
    'Academic': { text: 'text-amber-500', bg: 'bg-gradient-to-br from-yellow-50/90 to-amber-100/80', border: 'border-amber-200/80' },
  };
  const getMainClass = (char: Character): string => char.mainClass || CLASS_TO_MAIN_CLASS[char.class] || 'Warrior';
  const getColors = (mainClass: string): { text: string; bg: string; border: string } => classColors[mainClass] || { text: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300' };
  const getClassIcon = (subClass: string) => {
    const mainClass = CLASS_TO_MAIN_CLASS[subClass] || subClass;
    switch (mainClass) {
      case 'Warrior': return <Sword className="h-5 w-5 text-red-500" />;
      case 'Archer': return <Zap className="h-5 w-5 text-emerald-500" />;
      case 'Sorceress': return <Sparkles className="h-5 w-5 text-purple-500" />;
      case 'Cleric': return <Shield className="h-5 w-5 text-sky-500" />;
      case 'Academic': return <Star className="h-5 w-5 text-amber-500" />;
      default: return <Crown className="h-5 w-5 text-gray-500" />;
    }
  };

  const pastelColors = [
    { name: 'พาสเทลพิ้ง', value: '#FFB5E8' },
    { name: 'พาสเทลม่วง', value: '#B5B9FF' },
    { name: 'พาสเทลฟ้า', value: '#B5EAD7' },
    { name: 'พาสเทลเขียว', value: '#C7CEEA' },
    { name: 'พาสเทลเหลือง', value: '#FFE5B4' },
    { name: 'พาสเทลส้ม', value: '#FFB7B2' },
    { name: 'พาสเทลแดง', value: '#FF9B9B' },
    { name: 'พาสเทลน้ำเงิน', value: '#B5D8FF' },
  ];

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

  useEffect(() => {
    if (event && event.endAt && event.endAt.seconds) {
      setEndDate(new Date(event.endAt.seconds * 1000));
    } else {
      setEndDate(null);
    }
  }, [event?.endAt]);

  // ดึง participants (uid) แบบ realtime
  useEffect(() => {
    if (!params?.id || !user) return;
    const colRef = collection(firestore, 'events', params.id as string, 'participants');
    const unsub = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map(doc => ({
        uid: doc.id,
        joinedAt: doc.data().joinedAt ? (doc.data().joinedAt.toDate ? doc.data().joinedAt.toDate() : new Date(doc.data().joinedAt.seconds * 1000)) : null,
        rewardGiven: doc.data().rewardGiven || false,
        rewardNote: doc.data().rewardNote || '',
        message: doc.data().message || '',
        messageUpdatedAt: doc.data().messageUpdatedAt?.toDate() || null,
        characterId: doc.data().characterId || undefined,
        groupId: doc.data().groupId || undefined,
        groupName: doc.data().groupName || '',
      }));
      setParticipantUids(list);
      setJoined(!!list.find(p => p.uid === user.uid));
      // ถ้าเป็นผู้เข้าร่วม ให้โหลดข้อความของตัวเอง
      const currentParticipant = list.find(p => p.uid === user.uid);
      if (currentParticipant) {
        setParticipantMessage(currentParticipant.message || '');
      }
    });
    return () => unsub();
  }, [params?.id, user?.uid]);

  // Auto end event ฝั่ง client
  useEffect(() => {
    if (event && !event.isEnded && event.endAt && event.endAt.seconds) {
      const now = Date.now();
      const end = new Date(event.endAt.seconds * 1000).getTime();
      if (now > end) {
        (async () => {
          const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
          await updateDoc(doc(firestore, 'events', event.id), {
            isEnded: true,
            endedAt: serverTimestamp(),
          });
          // reload event
          setTimeout(() => window.location.reload(), 500);
        })();
      }
    }
  }, [event]);

  const handleJoin = () => setConfirmModal({ open: true, type: 'join' });
  const handleLeave = async () => {
    if (!params?.id || !user) return;
    
    // ถ้าอยู่ในกลุ่ม ให้ออกจากกลุ่มก่อน
    const currentParticipant = participantUids.find(p => p.uid === user.uid);
    if (currentParticipant?.groupId) {
      await handleLeaveGroup();
    }
    
    // ลบข้อมูลการเข้าร่วม
    const partRef = doc(firestore, 'events', params.id as string, 'participants', user.uid);
    await deleteDoc(partRef);
    setConfirmModal({ open: false, type: null });
  };
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
    // ใช้ logic เดียวกับ Preview
    let announce = announceMsg ? `📢 ${announceMsg}` : '';
    let descHtml = event.description || '';
    descHtml = descHtml
      .replace(/<\s*br\s*\/?>(?![^<]*>)/gi, '\n')
      .replace(/<\/?(div|p|li|ul|ol|h[1-6])[^>]*>/gi, '\n');
    const descLinesCopy = stripHtml(descHtml).split(/\n+/);
    let descPreviewCopy = '📝';
    const firstLineCopyIndex = descLinesCopy.findIndex(line => line.trim() !== '');
    if (firstLineCopyIndex !== -1) {
      descPreviewCopy = `📝${descLinesCopy[firstLineCopyIndex].trimStart()}`;
      if (descLinesCopy.length > firstLineCopyIndex + 1) {
        descPreviewCopy += '\n' + descLinesCopy.slice(firstLineCopyIndex + 1).join('\n');
      }
    }
    const endDateStr = endDate ? endDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
    const previewString =
      (announce ? announce + '\n\n' : '') +
      `🎉 ${event.name}\n` +
      descPreviewCopy +
      `🗓️ วันเวลาเริ่ม: ${startDate ? startDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}` +
      `\n⏰ วันเวลาสิ้นสุด: ${endDateStr}` +
      `\n🎁 ของรางวัล: ${event.rewardInfo}` +
      `\n\n👉 [เช็คชื่อเข้าร่วมกิจกรรมที่นี่](https://galaxycat.vercel.app/events/${event.id}) 👈`;
    copyToClipboard(previewString.replace(/\\n/g, '\n'));
    setToast({ show: true, message: 'คัดลอกข้อความประกาศเรียบร้อย!' });
  };

  // ฟังก์ชันอัปเดตกิจกรรม
  const handleEditEvent = async (data: { name: string; description: string; startAt: Date; endAt: Date; rewardInfo: string; notifyMessage: string; color: string; maxGroupSize: number; link?: string; }) => {
    if (!event) return;
    try {
      await updateDoc(doc(firestore, 'events', event.id), {
        name: data.name,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        rewardInfo: data.rewardInfo,
        notifyMessage: data.notifyMessage,
        color: data.color,
        maxGroupSize: data.maxGroupSize,
        ...(data.link ? { link: data.link } : { link: null })
      });
      setToast({ show: true, message: 'แก้ไขกิจกรรมเรียบร้อยแล้ว' });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating event:', error);
      setToast({ show: true, message: 'เกิดข้อผิดพลาดในการแก้ไขกิจกรรม' });
      setTimeout(() => setToast({ show: false, message: '' }), 3000);
    }
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

  // ฟังก์ชันมอบรางวัล (รองรับทั้งรายบุคคลและกลุ่ม)
  const handleGiveReward = async (target: string, reward: string) => {
    if (!user || !event || !target || !reward) return;
    if (target.startsWith('group_')) {
      // มอบรางวัลกลุ่ม: update ให้สมาชิกทุกคนในกลุ่ม
      const groupMembers = participantUids.filter(p => p.groupId === target);
      const batch = writeBatch(firestore);
      groupMembers.forEach(member => {
        const partRef = doc(firestore, 'events', event.id, 'participants', member.uid);
        batch.update(partRef, {
          rewardGiven: true,
          rewardNote: reward,
        });
      });
      await batch.commit();
      setToast({ show: true, message: 'มอบรางวัลกลุ่มเรียบร้อย!' });
    } else {
      // มอบรางวัลรายบุคคล
      const partRef = doc(firestore, 'events', event.id, 'participants', target);
      await updateDoc(partRef, {
        rewardGiven: true,
        rewardNote: reward,
      });
      setToast({ show: true, message: 'มอบรางวัลเรียบร้อย!' });
    }
  };

  // ฟังก์ชันอัปเดตข้อความของผู้เข้าร่วม
  const handleUpdateMessage = async () => {
    if (!params?.id || !user || !joined) return;
    const partRef = doc(firestore, 'events', params.id as string, 'participants', user.uid);
    await updateDoc(partRef, {
      message: participantMessage.slice(0, 30),
      messageUpdatedAt: serverTimestamp()
    });
    setToast({ show: true, message: 'บันทึกข้อความเรียบร้อย!' });
  };

  // ฟังก์ชันจัดการกลุ่ม
  const isValidGroupId = (groupId: any) => !!groupId && typeof groupId === 'string' && groupId.trim() !== '';
  const handleJoinGroup = async (targetUid: string) => {
    if (!params?.id || !user || !targetUid) {
      setToast({ show: true, message: 'ไม่พบข้อมูลสมาชิกเป้าหมาย' });
      return;
    }
    // ดึงข้อมูลล่าสุดของตัวเองจาก Firestore
    const partRef = doc(firestore, 'events', params.id as string, 'participants', user.uid);
    const partSnap = await getDoc(partRef);
    const currentParticipant = partSnap.exists() ? partSnap.data() : null;
    const targetParticipant = participantUids.find(p => p.uid === targetUid);
    if (!currentParticipant || !targetParticipant) return;
    if (isValidGroupId(currentParticipant.groupId)) {
      setToast({ show: true, message: 'คุณอยู่ในกลุ่มแล้ว ไม่สามารถเข้ากลุ่มอื่นได้' });
      setGroupModal(false);
      setSelectedGroupMember('');
      return;
    }
    // ถ้า target มีกลุ่ม ให้ join กลุ่มนั้น
    if (targetParticipant.groupId) {
      const groupId = targetParticipant.groupId;
      const groupMembers = participantUids.filter(p => p.groupId === groupId);
      if (groupMembers.length >= event.maxGroupSize) {
        setToast({ show: true, message: `กลุ่มนี้เต็มแล้ว (สูงสุด ${event.maxGroupSize} คน)` });
        return;
      }
      // ดึงชื่อกลุ่มจากสมาชิกที่มีอยู่
      const existingGroupName = groupMembers[0]?.groupName || '';
      const partRef = doc(firestore, 'events', params.id as string, 'participants', user.uid);
      await updateDoc(partRef, { 
        groupId,
        groupName: existingGroupName // ใช้ชื่อกลุ่มที่มีอยู่
      });
      setToast({ show: true, message: 'เข้าร่วมกลุ่มเรียบร้อย!' });
    } else {
      // ทั้งสองคนยังไม่มีกลุ่ม สร้างกลุ่มใหม่
      if (event.maxGroupSize <= 1) {
        setToast({ show: true, message: 'ไม่สามารถสร้างกลุ่มใหม่ได้ (จำนวนสูงสุดไม่ถูกต้อง)' });
        setGroupModal(false);
        setSelectedGroupMember('');
        return;
      }
      const newGroupId = `group_${Date.now()}`;
      const batch = writeBatch(firestore);
      const userRef = doc(firestore, 'events', params.id as string, 'participants', user.uid);
      const targetRef = doc(firestore, 'events', params.id as string, 'participants', targetUid);
      batch.update(userRef, { groupId: newGroupId });
      batch.update(targetRef, { groupId: newGroupId });
      await batch.commit();
      setToast({ show: true, message: 'สร้างกลุ่มใหม่เรียบร้อย!' });
    }
    setGroupModal(false);
    setSelectedGroupMember('');
  };

  const handleLeaveGroup = async () => {
    if (!params?.id || !user) return;
    
    const currentParticipant = participantUids.find(p => p.uid === user.uid);
    if (!currentParticipant?.groupId) return;

    // ตรวจสอบจำนวนสมาชิกในกลุ่ม
    const groupMembers = participantUids.filter(p => p.groupId === currentParticipant.groupId);
    const partRef = doc(firestore, 'events', params.id as string, 'participants', user.uid);
    if (groupMembers.length === 1) {
      // คนสุดท้ายในกลุ่ม ลบ groupId และ groupName ตัวเอง (กลุ่มจะหายไป)
      await updateDoc(partRef, { groupId: null, groupName: null });
    } else {
      // มีคนอื่นในกลุ่ม แค่ลบ groupId ตัวเอง แต่เก็บ groupName ไว้
      await updateDoc(partRef, { groupId: null });
    }
    setToast({ show: true, message: 'ออกจากกลุ่มเรียบร้อย!' });
  };

  // ซ่อน toast อัตโนมัติ
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => setToast({ ...toast, show: false }), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // --- เพิ่มฟังก์ชันลบรางวัล ---
  const handleRemoveReward = async (target: string) => {
    if (!user || !event || !target) return;
    if (target.startsWith('group_')) {
      // ลบรางวัลกลุ่ม: update สมาชิกทุกคนในกลุ่ม
      const groupMembers = participantUids.filter(p => p.groupId === target);
      const batch = writeBatch(firestore);
      groupMembers.forEach(member => {
        const partRef = doc(firestore, 'events', event.id, 'participants', member.uid);
        batch.update(partRef, {
          rewardGiven: false,
          rewardNote: '',
        });
      });
      await batch.commit();
    } else {
      // ลบรางวัลรายบุคคล
      const partRef = doc(firestore, 'events', event.id, 'participants', target);
      await updateDoc(partRef, {
        rewardGiven: false,
        rewardNote: '',
      });
    }
  };

  // Add this function after handleLeaveGroup
  const handleUpdateGroupName = async (groupId: string, newName: string) => {
    if (!params?.id || !user) return;
    
    // Get all members in the group
    const groupMembers = participantUids.filter(p => p.groupId === groupId);
    
    // Update group name for all members
    const batch = writeBatch(firestore);
    groupMembers.forEach(member => {
      const partRef = doc(firestore, 'events', params.id as string, 'participants', member.uid);
      batch.update(partRef, { groupName: newName });
    });
    
    await batch.commit();
    setToast({ show: true, message: 'อัปเดตชื่อกลุ่มเรียบร้อย!' });
  };

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
  if (error) {
    return <div className="max-w-2xl mx-auto py-8 px-4 text-center text-red-500">{error}</div>;
  }
  if (!event) return null;

  // สร้าง array รายชื่อผู้เข้าร่วมจาก users
  const participantUsers = participantUids
    .map(uid => users[uid.uid])
    .filter(Boolean)
    .sort((a, b) => {
      const aJoin = participantUids.find(p => p.uid === a.uid)?.joinedAt?.getTime?.() || 0;
      const bJoin = participantUids.find(p => p.uid === b.uid)?.joinedAt?.getTime?.() || 0;
      return bJoin - aJoin;
    });

  // Template ข้อความประกาศ Discord (ถ้าไม่มีข้อความเดิม)
  let descHtml = event.description || '';
  descHtml = descHtml
    .replace(/<\s*br\s*\/?>(?![^<]*>)/gi, '\n')
    .replace(/<\/?(div|p|li|ul|ol|h[1-6])[^>]*>/gi, '\n');
  const descPlain = stripHtml(descHtml);
  const descLines = descPlain.split(/\n+/);
  let descPreview = '📝';
  const firstLineIndex = descLines.findIndex(line => line.trim() !== '');
  if (firstLineIndex !== -1) {
    descPreview = `📝${descLines[firstLineIndex].trimStart()}`;
    if (descLines.length > firstLineIndex + 1) {
      descPreview += '\n' + descLines.slice(firstLineIndex + 1).join('\n');
    }
  }
  const defaultAnnounce =
    `🎉 ${event.name}\n` +
    `${descPreview}\n` +
    `🗓️ วันเวลาเริ่ม: ${startDate ? startDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}\n` +
    `🎁 ของรางวัล: ${event.rewardInfo}`;

  let groupMemberNames: string[] = [];
  if (selectedParticipant && selectedParticipant.startsWith('group_')) {
    groupMemberNames = participantUids
      .filter(p => p.groupId === selectedParticipant)
      .map(p => users?.[p.uid]?.meta?.discord || p.uid);
  }

  // ก่อน return JSX (ใน EventDetailPage)
  // --- เตรียม previewString ---
  let announce = announceMsg ? `📢 ${announceMsg}` : '';
  let descHtmlPreview = event.description || '';
  descHtmlPreview = descHtmlPreview
    .replace(/<\s*br\s*\/?>(?![^<]*>)/gi, '\n')
    .replace(/<\/?(div|p|li|ul|ol|h[1-6])[^>]*>/gi, '\n');
  const descPlainPreview = stripHtml(descHtmlPreview);
  const descLinesPreview = descPlainPreview.split(/\n+/);
  let descPreviewForPreview = '📝';
  const firstLinePreviewIndex = descLinesPreview.findIndex(line => line.trim() !== '');
  if (firstLinePreviewIndex !== -1) {
    descPreviewForPreview = `📝${descLinesPreview[firstLinePreviewIndex].trimStart()}`;
    if (descLinesPreview.length > firstLinePreviewIndex + 1) {
      descPreviewForPreview += '\n' + descLinesPreview.slice(firstLinePreviewIndex + 1).join('\n');
    }
  }
  const endDateStrPreview = endDate ? endDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
  const previewString =
    (announce ? announce + '\n\n' : '') +
    `🎉 ${event.name}\n` +
    descPreviewForPreview +
    `🗓️ วันเวลาเริ่ม: ${startDate ? startDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}` +
    `\n⏰ วันเวลาสิ้นสุด: ${endDateStrPreview}` +
    `\n🎁 ของรางวัล: ${event.rewardInfo}` +
    `\n\n👉 [เช็คชื่อเข้าร่วมกิจกรรมที่นี่](https://galaxycat.vercel.app/events/${event.id}) 👈`;

  return (
    <React.Fragment>
      <div className="w-full max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8 flex justify-between items-center min-w-0">
          <button
            onClick={() => router.push('/events')}
            className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 dark:from-pink-900/30 dark:via-purple-900/30 dark:to-blue-900/30 text-pink-700 dark:text-pink-300 font-bold shadow-md hover:from-pink-200 hover:to-blue-200 hover:text-pink-900 dark:hover:from-pink-800/40 dark:hover:to-blue-800/40 dark:hover:text-pink-200 transition-colors duration-200 border-0 backdrop-blur"
            style={{boxShadow:'0 2px 8px 0 rgba(255,182,232,0.10)'}}
          >
            <ArrowLeft className="w-5 h-5 mr-1 text-pink-400 dark:text-pink-300" />
            ย้อนกลับไปหน้ารายการกิจกรรม
          </button>
          {isOwner && !event.isEnded && (
            <button
              onClick={() => setEndModal(true)}
              className="flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-green-100 via-white to-green-50 dark:from-green-900/30 dark:via-gray-800 dark:to-green-900/20 text-green-700 dark:text-green-300 font-bold shadow-md hover:from-green-200 hover:to-green-100 hover:text-green-900 dark:hover:from-green-800/40 dark:hover:to-green-800/30 dark:hover:text-green-200 transition-colors duration-200 border-0 backdrop-blur"
              style={{boxShadow:'0 2px 8px 0 rgba(132,204,22,0.10)'}}
            >
              <Check className="w-5 h-5 mr-1 text-green-500 dark:text-green-400" />
              กิจกรรมเสร็จสิ้น
            </button>
          )}
        </div>
        <div
          className={"shadow-xl p-8 rounded-3xl relative min-w-0 overflow-hidden backdrop-blur-xl"}
          id="event-main-content"
          style={
            event.color && event.color.startsWith('linear-gradient')
              ? {
                  borderWidth: '0px',
                  borderStyle: 'none',
                  borderColor: 'transparent',
                  boxShadow: '0 4px 16px 0 rgba(255,182,232,0.10)',
                  background: event.color,
                  borderRadius: '1.5rem',
                }
              : {
                  borderWidth: '6px',
                  borderStyle: 'solid',
                  borderColor: event.color ? event.color : '#FFB5E8',
                  boxShadow: '0 0 0 2px ' + (event.color ? event.color : '#FFB5E8') + ', 0 4px 16px 0 rgba(0,0,0,0.05)',
                  background: event.color ? (event.color.length === 7 ? `rgba(${parseInt(event.color.slice(1,3),16)},${parseInt(event.color.slice(3,5),16)},${parseInt(event.color.slice(5,7),16)},0.15)` : event.color) : 'white',
                  borderRadius: '1.5rem',
                }
          }
        >
          <div style={{position:'relative',zIndex:2, borderRadius:'1.5rem', background:'transparent', padding: 0}}>
            {/* ปุ่มแก้ไข/ลบ เฉพาะ owner */}
            {isOwner && (
              <div className="absolute top-4 right-4 flex gap-2 z-10">
                {!event.isEnded && (
                  <button title="แก้ไขกิจกรรม" onClick={() => setIsEditModalOpen(true)} className="p-2 rounded-full bg-white/80 hover:bg-blue-100 border border-blue-200 shadow transition"><Edit2 className="w-5 h-5 text-blue-600" /><span className="sr-only">แก้ไข</span></button>
                )}
                <button title="ลบกิจกรรม" onClick={() => setDeleteModal(true)} className="p-2 rounded-full bg-white/80 hover:bg-red-100 border border-red-200 shadow transition"><Trash2 className="w-5 h-5 text-red-600" /><span className="sr-only">ลบ</span></button>
              </div>
            )}
            <motion.h1 initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} transition={{duration:0.4}} className="text-4xl font-extrabold mb-2 text-pink-700 dark:text-pink-300 drop-shadow-lg break-words whitespace-normal w-full max-w-full">
              🎊{event.name}🎊
            </motion.h1>
            <div className="mb-4">
              <div className="text-lg text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-2 animate-pulse">
                ✨ ยินดีต้อนรับสู่กิจกรรมสุดพิเศษ! ✨
              </div>
              <div className="px-4 py-2 w-full">
                <div className="inline-flex items-start w-full min-w-0">
                  <span className="text-xl flex-shrink-0 mt-1">📝</span>
                  <div
                    className="event-description break-words w-full ml-2 text-pink-500 dark:text-pink-300 text-lg font-semibold drop-shadow-sm min-w-0 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg px-4 py-2"
                    dangerouslySetInnerHTML={{ __html: event.description || 'ไม่มีรายละเอียดกิจกรรม' }}
                  />
                  <style jsx global>{`
                    .event-description,
                    .event-description * {
                      user-select: text;
                    }
                    .event-description * {
                      background-color: transparent !important;
                    }
                  `}</style>
                </div>
              </div>
            </div>
            {/* กล่องรางวัล, เริ่มกิจกรรม, สิ้นสุดกิจกรรม (ขนาดพอดีกับข้อความ) */}
            <div className="space-y-2 flex flex-col mb-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-lg px-3 py-1 shadow-sm text-yellow-700 dark:text-yellow-300 font-semibold text-base max-w-full w-full break-words whitespace-pre-line inline-flex items-center gap-1 self-start block">
                <span className="text-2xl mr-2 flex items-center justify-center">🎁</span>
                <span className="break-all whitespace-pre-line flex items-center">{event.rewardInfo || 'ไม่มีข้อมูลรางวัล'}</span>
              </div>
              <div className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg px-3 py-1 shadow-sm text-blue-800 dark:text-blue-300 font-semibold text-base w-fit self-start">
                <span className="text-2xl">🗓️</span>
                <span>เริ่ม:</span>
                <span>{startDate ? startDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
              </div>
              {endDate && (
                <div className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-900/30 rounded-lg px-3 py-1 shadow-sm text-red-800 dark:text-red-300 font-semibold text-base w-fit self-start">
                  <span className="text-2xl">⏰</span>
                  <span>สิ้นสุด:</span>
                  <span>{endDate.toLocaleString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
            {/* Countdown */}
            <div className="flex items-center h-12 w-full mb-0 mt-4">
              <CountdownOrEnded event={event} startDate={startDate} />
            </div>
            {/* ปุ่มลิงก์ (ถ้ามี) */}
            {event.link && (
              <div className="mt-4">
                <a
                  href={event.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  <span className="text-lg">🔗</span>
                  เปิดลิงก์กิจกรรม
                </a>
              </div>
            )}
            {/* เฉพาะเจ้าของกิจกรรมเท่านั้นที่เห็น UI ประกาศ Discord */}
            {user.uid === event.ownerUid && !event.isEnded && (
              <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{duration:0.4}} className="my-8 p-6 bg-gradient-to-r from-blue-50 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200/60 dark:border-blue-700/60 rounded-2xl shadow-lg" id="event-announce-box">
                <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2 text-lg">📢 ข้อความประกาศเพิ่มเติม</h3>
                <textarea
                  className="w-full rounded-lg border border-blue-200 dark:border-blue-600 p-2 mb-2 text-sm font-mono bg-white/80 dark:bg-gray-800/80 shadow-inner focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 transition text-gray-800 dark:text-gray-200"
                  rows={3}
                  placeholder="ใส่ข้อความประกาศเพิ่มเติม (ถ้ามี)"
                  value={announceMsg}
                  onChange={e => { setAnnounceMsg(e.target.value); setAnnounceSaved(false); }}
                />
                <div className="flex gap-2 mb-2">
                  <Button size="sm" className="flex items-center gap-1 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 shadow" onClick={handleCopyAnnounce}>
                    📋 คัดลอกข้อความ
                  </Button>
                  <Button size="sm" variant="outline" className="flex items-center gap-1 border-blue-400 text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/30" onClick={handleSaveAnnounce} disabled={announceSaved}>
                    💾 {announceSaved ? 'บันทึกแล้ว' : 'บันทึกข้อความ'}
                  </Button>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 border border-blue-100 dark:border-blue-700 rounded p-2 text-xs text-gray-600 dark:text-gray-400 shadow-inner">
                  <div className="font-semibold mb-1 flex items-center gap-1">👁️‍🗨️ Preview:</div>
                  <pre className="whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200 break-words">
                    {previewString.replace(/^\n+/, '')}
                  </pre>
                </div>
              </motion.div>
            )}
            {/* ปุ่มเข้าร่วม/ออกกิจกรรม */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center my-6 w-full">
            {!joined ? (
              <Button
                className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 sm:px-8 py-3 rounded-xl shadow-lg hover:scale-105 hover:shadow-2xl transition-all text-lg w-full sm:w-auto"
                onClick={() => setShowCharModal(true)}
                disabled={event.isEnded}
              >
                🙋‍♂️ เข้าร่วมกิจกรรม
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-red-400 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-900/30 px-4 sm:px-8 py-3 rounded-xl shadow text-lg w-full sm:w-auto"
                  onClick={() => setConfirmModal({ open: true, type: 'leave' })}
                  disabled={rewardGiven || event.isEnded}
                  id="event-participant-leave-btn"
                >
                  🚪 ออกจากกิจกรรม
                </Button>
                {!event.isEnded && (
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <input
                      type="text"
                      value={participantMessage}
                      onChange={(e) => setParticipantMessage(e.target.value)}
                      placeholder="พิมพ์ข้อความสั้นๆ (ไม่เกิน 30 ตัวอักษร)"
                      maxLength={30}
                      className="rounded-lg border border-pink-200 dark:border-pink-600 text-sm focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 w-full h-10 text-center flex items-center justify-center py-0 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      style={{ lineHeight: '2.5rem' }}
                      id="event-participant-message-input"
                    />
                    <Button
                      onClick={handleUpdateMessage}
                      className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-600 w-full sm:w-auto"
                      id="event-participant-message-save"
                    >
                      บันทึก
                    </Button>
                  </div>
                )}
              </>
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
              <h2 className="text-xl font-bold text-pink-700 dark:text-pink-300 mb-4 flex items-center gap-2" id="event-member-list">
                👥 รายชื่อผู้เข้าร่วมกิจกรรม ({participantUsers.length})
              </h2>
              {participantUsers.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 rounded-xl shadow text-gray-700 dark:text-gray-300 font-semibold w-fit text-left">
                  <span>😶‍🌫️</span>ยังไม่มีผู้เข้าร่วม
                </div>
              ) : (
                <div className="space-y-0">
                  {(() => {
                    // 1. สร้าง map ของ groupId -> สมาชิก
                    const groupMap: Record<string, any[]> = {};
                    let noGroup: any[] = [];
                    participantUsers.forEach(u => {
                      const participantDoc = participantUids.find(p => p.uid === u.uid);
                      const groupId = participantDoc?.groupId;
                      if (groupId && groupId !== '' && groupId != null) {
                        if (!groupMap[groupId]) groupMap[groupId] = [];
                        groupMap[groupId].push({ user: u, participantDoc });
                      } else {
                        noGroup.push({ user: u, participantDoc });
                      }
                    });
                    // 2. ถ้ากลุ่มไหนมีสมาชิกแค่ 1 คน ให้นำไปไว้ใน noGroup แทน
                    Object.entries(groupMap).forEach(([groupId, members]) => {
                      if (members.length === 1) {
                        noGroup.push(members[0]);
                        delete groupMap[groupId];
                      }
                    });
                    // 3. เรียงกลุ่ม: กลุ่มที่มีสมาชิกมากสุดอยู่ล่างสุด
                    const sortedGroups = Object.entries(groupMap).sort((a, b) => a[1].length - b[1].length);
                    // 4. แสดงสมาชิกที่ไม่มี groupId (เรียง joinedAt ล่าสุดบนสุด)
                    const sortedNoGroup = noGroup.slice().sort((a, b) => {
                      const aJoin = a.participantDoc?.joinedAt?.getTime?.() || 0;
                      const bJoin = b.participantDoc?.joinedAt?.getTime?.() || 0;
                      return bJoin - aJoin;
                    });
                    return (
                      <>
                        {sortedNoGroup.map((item) => {
                          const memberUser = item.user;
                          const participantDoc = item.participantDoc;
                          let nameBlock;
                          let char = null;
                          if (participantDoc && participantDoc.characterId) {
                            const charId = participantDoc.characterId;
                            if (charId) {
                              char = memberUser.characters?.[charId] || null;
                            }
                          }
                          if (char) {
                            nameBlock = (
                              <span>
                                <span className="font-semibold text-gray-800">{memberUser.meta?.discord || 'ไม่ทราบชื่อ'}</span>
                                <span className="mx-1 text-gray-400">/</span>
                                <span className="text-xs font-semibold text-pink-600">{char.name}</span>{' '}
                                <span className="text-xs text-green-600 font-medium">เข้าร่วมกิจกรรม</span>
                                {participantDoc?.message && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    {participantDoc.messageUpdatedAt && (
                                      <span className="text-gray-400">
                                        [{participantDoc.messageUpdatedAt.toLocaleString('th-TH', { 
                                          year: '2-digit',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        }).replace(' ', ' ')}น.]
                                      </span>
                                    )}
                                    — {participantDoc.message}
                                  </span>
                                )}
                              </span>
                            );
                          } else {
                            nameBlock = (
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{memberUser.meta?.discord || 'ไม่ทราบชื่อ'}
                                {participantDoc?.message && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                    {participantDoc.messageUpdatedAt && (
                                      <span className="text-gray-400 dark:text-gray-500">
                                        [{participantDoc.messageUpdatedAt.toLocaleString('th-TH', { 
                                          year: '2-digit',
                                          month: '2-digit',
                                          day: '2-digit',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        }).replace(' ', ' ')}น.]
                                      </span>
                                    )}
                                    — {participantDoc.message}
                                  </span>
                                )}
                              </span>
                            );
                          }
                          return (
                            <li key={memberUser.uid} className={`flex items-center gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg shadow-sm hover:shadow-md transition-all relative`}>
                              <div className="flex w-full items-center">
                                <div className="flex-1 min-w-0">
                                  <span
                                    className={`font-medium text-gray-800 dark:text-gray-200 ${(user && memberUser.uid !== user.uid && !event.isEnded) ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''} relative`}
                                    onMouseEnter={() => {
                                      if (user && memberUser.uid !== user.uid && !event.isEnded) setHoveredUid(memberUser.uid);
                                    }}
                                    onMouseLeave={() => {
                                      if (user && memberUser.uid !== user.uid && !event.isEnded) setHoveredUid(null);
                                    }}
                                    onClick={() => {
                                      if (user && memberUser.uid !== user.uid && !event.isEnded && event.maxGroupSize > 0) {
                                        setSelectedGroupMember(memberUser.uid);
                                        setGroupModal(true);
                                      }
                                    }}
                                  >
                                    {nameBlock}
                                  </span>
                                </div>
                                {/* แสดงรางวัลหรือปุ่มมอบรางวัล */}
                                {participantDoc?.rewardGiven ? (
                                  <span
                                    onClick={isOwner ? () => {
                                      setSelectedParticipant(memberUser.uid);
                                      setRewardName(participantDoc.rewardNote || "");
                                      setRewardModal(true);
                                    } : undefined}
                                    className={`text-sm text-green-700 dark:text-green-400 ml-2${isOwner ? ' cursor-pointer hover:text-green-800 dark:hover:text-green-300' : ''}`}
                                    title={isOwner ? 'แก้ไขรางวัล' : undefined}
                                  >
                                    ✓ {participantDoc.rewardNote}
                                  </span>
                                ) : isOwner && (
                                  <button
                                    onClick={() => {
                                      setSelectedParticipant(memberUser.uid);
                                      setRewardName("");
                                      setRewardModal(true);
                                    }}
                                    className="flex items-center gap-1 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-medium shadow hover:bg-yellow-100 dark:hover:bg-yellow-800/40 transition-colors duration-150 ml-2"
                                  >
                                    <Gift className="w-3 h-3" />
                                    มอบรางวัล
                                  </button>
                                )}
                              </div>
                            </li>
                          );
                        })}
                        {/* 5. แสดงกลุ่ม */}
                        {sortedGroups.map(([groupId, members]) => {
                          // สมาชิกในกลุ่มเรียงจาก joinedAt ล่าสุดอยู่บนสุด
                          const sortedMembers = members.slice().sort((a, b) => {
                            const aJoin = a.participantDoc?.joinedAt?.getTime?.() || 0;
                            const bJoin = b.participantDoc?.joinedAt?.getTime?.() || 0;
                            return bJoin - aJoin;
                          });
                          // ตรวจสอบว่าทุกคนในกลุ่มได้รับรางวัลหรือยัง
                          const allRewarded = members.every((m: any) => m.participantDoc?.rewardGiven);
                          // หา rewardNote ล่าสุด (ถ้ามี)
                          const rewardNotes = members.map((m: any) => m.participantDoc?.rewardNote).filter(Boolean);
                          const lastRewardNote = rewardNotes.length > 0 ? rewardNotes[rewardNotes.length - 1] : '';
                          // Get group name from first member
                          const groupName = members[0]?.participantDoc?.groupName || '';
                          
                          return (
                            <div key={groupId} className="bg-blue-50/50 dark:bg-blue-900/30 rounded-lg shadow-md p-3">
                              <div className="mb-2 flex items-center gap-2 justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium bg-gradient-to-br from-violet-100 via-fuchsia-100 to-pink-100 dark:from-violet-900/40 dark:via-fuchsia-900/40 dark:to-pink-900/40 px-2.5 py-1 rounded-lg border border-violet-200/60 dark:border-violet-600/60 shadow-sm flex items-center gap-1.5 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                                    <span className="absolute inset-0 bg-gradient-to-r from-violet-200/0 via-violet-200/20 to-violet-200/0 dark:from-violet-400/0 dark:via-violet-400/20 dark:to-violet-400/0 animate-shimmer"></span>
                                    <span className="text-violet-600 dark:text-violet-400 relative">✨</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500/80 dark:text-violet-400/80 relative">Team</span>
                                    <span className="text-violet-800 dark:text-violet-300 font-semibold relative">{groupName ? groupName : 'กลุ่มใหม่'}</span>
                                    <span className="text-[10px] font-medium bg-white/90 dark:bg-gray-800/90 px-1.5 py-0.5 rounded-md text-violet-700 dark:text-violet-300 border border-violet-200/60 dark:border-violet-600/60 relative backdrop-blur-sm">
                                      {members.length}/{event.maxGroupSize}
                                    </span>
                                  </span>
                                  {/* Add group name edit button for group members */}
                                  {members.some(m => m.user.uid === user?.uid) && !event.isEnded && (
                                    <button
                                      onClick={() => {
                                        setGroupNameInput(groupName);
                                        setGroupNameEditingGroupId(groupId);
                                        setGroupNameModalOpen(true);
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                  {/* ปุ่มหรือแสดงรางวัลกลุ่ม */}
                                  {allRewarded && lastRewardNote ? (
                                    <span 
                                      onClick={isOwner ? () => {
                                        setSelectedGroupMember(groupId);
                                        setSelectedParticipant(groupId);
                                        setRewardName(lastRewardNote);
                                        setRewardModal(true);
                                      } : undefined}
                                      className={`text-sm text-green-700 dark:text-green-400 ml-0${isOwner ? ' cursor-pointer hover:text-green-800 dark:hover:text-green-300' : ''}`}
                                      title={isOwner ? 'แก้ไขรางวัล' : undefined}
                                    >
                                      ✓ {lastRewardNote}
                                    </span>
                                  ) : isOwner && (
                                    <button
                                      onClick={() => {
                                        setSelectedGroupMember(groupId);
                                        setSelectedParticipant(groupId);
                                        setRewardModal(true);
                                      }}
                                      className="flex items-center gap-1 px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm font-medium shadow hover:bg-yellow-100 dark:hover:bg-yellow-800/40 transition-colors duration-150"
                                    >
                                      <Gift className="w-3 h-3" />
                                      มอบรางวัลกลุ่ม
                                    </button>
                                  )}
                                </div>
                              </div>
                              <ul className="divide-y divide-blue-100 dark:divide-blue-700">
                                {sortedMembers.map((item) => {
                                  const memberUser = item.user;
                                  const participantDoc = item.participantDoc;
                                  let nameBlock;
                                  let char = null;
                                  if (participantDoc && participantDoc.characterId) {
                                    const charId = participantDoc.characterId;
                                    if (charId) {
                                      char = memberUser.characters?.[charId] || null;
                                    }
                                  }
                                  if (char) {
                                    nameBlock = (
                                      <span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{memberUser.meta?.discord || 'ไม่ทราบชื่อ'}</span>
                                        <span className="mx-1 text-gray-400 dark:text-gray-500">/</span>
                                        <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">{char.name}</span>{' '}
                                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">เข้าร่วมกิจกรรม</span>
                                        {participantDoc?.message && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                            {participantDoc.messageUpdatedAt && (
                                              <span className="text-gray-400 dark:text-gray-500">
                                                [{participantDoc.messageUpdatedAt.toLocaleString('th-TH', { 
                                                  year: '2-digit',
                                                  month: '2-digit',
                                                  day: '2-digit',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                }).replace(' ', ' ')}น.]
                                              </span>
                                            )}
                                            — {participantDoc.message}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  } else {
                                    nameBlock = (
                                      <span className="font-semibold text-gray-800 dark:text-gray-200">{memberUser.meta?.discord || 'ไม่ทราบชื่อ'}
                                        {participantDoc?.message && (
                                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                            {participantDoc.messageUpdatedAt && (
                                              <span className="text-gray-400 dark:text-gray-500">
                                                [{participantDoc.messageUpdatedAt.toLocaleString('th-TH', { 
                                                  year: '2-digit',
                                                  month: '2-digit',
                                                  day: '2-digit',
                                                  hour: '2-digit',
                                                  minute: '2-digit'
                                                }).replace(' ', ' ')}น.]
                                              </span>
                                            )}
                                            — {participantDoc.message}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  }
                                  // ก่อน return JSX ของแต่ละสมาชิก
                                  const isInGroup = !!participantDoc?.groupId;
                                  const groupMemberCount = isInGroup ? participantUids.filter(p => p.groupId === participantDoc.groupId).length : 0;
                                  return (
                                    <li key={memberUser.uid} className={`flex items-center gap-3 p-3 bg-transparent rounded-lg shadow-sm hover:shadow-md transition-all relative`}>
                                      <div className="flex w-full items-center">
                                        <div className="flex-1 min-w-0">
                                          <span
                                            className={`font-medium text-gray-800 dark:text-gray-200 ${(user && memberUser.uid !== user.uid && !event.isEnded) ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400' : ''} relative`}
                                            onMouseEnter={() => {
                                              if (user && memberUser.uid !== user.uid && !event.isEnded) setHoveredUid(memberUser.uid);
                                            }}
                                            onMouseLeave={() => {
                                              if (user && memberUser.uid !== user.uid && !event.isEnded) setHoveredUid(null);
                                            }}
                                            onClick={() => {
                                              if (user && memberUser.uid !== user.uid && !event.isEnded && event.maxGroupSize > 0) {
                                                setSelectedGroupMember(memberUser.uid);
                                                setGroupModal(true);
                                              }
                                            }}
                                          >
                                            {nameBlock}
                                          </span>
                                        </div>
                                        {/* ปุ่มออกจากกลุ่ม เฉพาะตัวเอง อยู่ในกลุ่ม และกิจกรรมยังไม่จบ */}
                                        {(memberUser.uid === user?.uid && isInGroup && groupMemberCount > 1 && !event.isEnded) && (
                                          <div className="flex items-center gap-2 ml-2">
                                            <button
                                              onClick={handleLeaveGroup}
                                              className="flex items-center gap-1 px-3 py-1 rounded-full border border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium shadow hover:bg-red-100 dark:hover:bg-red-800/40 transition-colors duration-150"
                                            >
                                              ออกจากกลุ่ม
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            {/* Modal แก้ไขกิจกรรม */}
            {isEditModalOpen && startDate && endDate && (
              <CreateEventModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleEditEvent}
                defaultValues={{
                  name: event.name,
                  description: event.description,
                  startAt: startDate,
                  endAt: endDate,
                  rewardInfo: event.rewardInfo,
                  notifyMessage: event.notifyMessage || '',
                  color: event.color || '#FFB5E8',
                  maxGroupSize: event.maxGroupSize ?? 0,
                  link: event.link || ''
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
            {rewardModal && createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl border border-yellow-100 p-8 w-full max-w-lg relative">
                  <h3 className="text-2xl font-bold text-yellow-700 mb-6 flex items-center gap-2">
                    <Gift className="w-6 h-6" />
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
                        {selectedParticipant && selectedParticipant.startsWith('group_') ? (
                          groupMemberNames.length > 0
                            ? groupMemberNames.join(', ')
                            : 'ไม่มีสมาชิกในกลุ่มนี้'
                        ) : (
                          (users?.[selectedParticipant]?.meta?.discord) || selectedParticipant
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-8">
                    {rewardName && (
                      <button
                        onClick={async () => {
                          if (selectedParticipant) {
                            await handleRemoveReward(selectedParticipant);
                            setRewardModal(false);
                            setSelectedParticipant('');
                            setSelectedGroupMember('');
                            setRewardName('');
                            setToast({ show: true, message: 'ลบรางวัลเรียบร้อย!' });
                          }
                        }}
                        className="px-6 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                        type="button"
                      >
                        ลบรางวัล
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setRewardModal(false);
                        setSelectedParticipant('');
                        setSelectedGroupMember('');
                        setRewardName('');
                        setToast({ show: false, message: '' });
                      }}
                      className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => {
                        if (selectedParticipant) {
                          handleGiveReward(selectedParticipant, rewardName);
                          setRewardModal(false);
                          setSelectedParticipant('');
                          setSelectedGroupMember('');
                          setRewardName('');
                          setToast({ show: false, message: '' });
                        }
                      }}
                      disabled={!selectedParticipant || !rewardName}
                      className="px-6 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      มอบรางวัล
                    </button>
                  </div>
                </div>
              </div>,
              typeof window !== 'undefined' ? document.body : (null as any)
            )}
            {/* Modal เลือกตัวละคร */}
            <Dialog open={showCharModal} onOpenChange={setShowCharModal}>
              <DialogContent className="max-w-md w-full p-0 rounded-3xl overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 backdrop-blur-xl">
                <DialogHeader>
                  <div className="flex items-center gap-3 px-6 pt-6 pb-2">
                    <span className="text-3xl bg-gradient-to-tr from-pink-300 via-violet-200 to-blue-200 rounded-full p-2 shadow border-2 border-white">🐾</span>
                    <DialogTitle className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-violet-600 via-pink-500 to-blue-600 bg-clip-text text-transparent drop-shadow-lg tracking-tight dark:from-violet-300 dark:via-pink-300 dark:to-blue-300">เลือกตัวละครเข้าร่วมกิจกรรม</DialogTitle>
                  </div>
                </DialogHeader>
                <div className="relative px-4 pb-6 min-h-[220px]">
                  <div className="grid grid-cols-2 gap-3 py-2 w-full max-w-md mx-auto">
                    {myCharacters.length === 0 && <div className="col-span-2 text-center text-gray-400">คุณยังไม่มีตัวละคร</div>}
                    {myCharacters.map(char => {
                      const mainClass = getMainClass(char);
                      const colors = getColors(mainClass);
                      return (
                        <div
                          key={char.id}
                          className={`rounded-xl shadow-md p-2 flex items-center gap-2 cursor-pointer border-2 ${colors.bg} ${colors.border} hover:scale-105 hover:shadow-xl transition text-xs min-h-[40px] relative group` + (selectedChar?.id === char.id ? ' ring-2 ring-pink-400' : '')}
                          onClick={() => setSelectedChar(char)}
                        >
                          <span className="text-xl drop-shadow-lg">{getClassIcon(char.class)}</span>
                          <div className="flex flex-col">
                            <div className={`font-bold text-xs ${colors.text}`}>{char.name}</div>
                            <div className={`text-[10px] ${colors.text}`}>{char.class}</div>
                          </div>
                          {selectedChar?.id === char.id && (
                            <span className="absolute top-1 right-1 text-pink-500 text-lg animate-bounce">★</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {selectedChar && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      transition={{ duration: 0.2 }}
                      className="mt-5 p-4 rounded-2xl bg-white/90 dark:bg-gray-900/90 border-2 border-pink-100 flex flex-col items-center gap-2 w-full max-w-xs mx-auto shadow-lg backdrop-blur"
                    >
                      <div className="text-base font-bold mb-1 text-pink-600 dark:text-pink-300 flex items-center gap-2">
                        <span className="text-lg">🙋‍♂️</span> ยืนยันการเข้าร่วม
                      </div>
                      <div className="flex flex-row items-center gap-2 mb-1">
                        <span className="font-semibold text-pink-600 text-xs">{(users?.[user.uid]?.meta?.discord) || user.displayName || user.email}</span>
                        <span className="text-gray-300 text-[10px]">/</span>
                        <span className="flex items-center gap-1">
                          {getClassIcon(selectedChar.class)}
                          <span className={"text-xs font-bold " + getColors(getMainClass(selectedChar)).text}>{selectedChar.name}</span>
                          <span className="text-[10px] text-gray-400">({selectedChar.class})</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-green-600 font-semibold">จะเข้าร่วมกิจกรรมนี้</span>
                      <Button 
                        className="mt-2 w-full text-sm py-2 rounded-xl bg-gradient-to-r from-pink-500 to-blue-500 text-white font-bold shadow hover:from-pink-600 hover:to-blue-600 transition-all"
                        onClick={async () => {
                          if (!params?.id || !user) return;
                          const partRef = doc(firestore, 'events', params.id as string, 'participants', user.uid);
                          await setDoc(partRef, { joinedAt: serverTimestamp(), characterId: selectedChar.id });
                          setShowCharModal(false);
                          setConfirmModal({ open: false, type: null });
                        }}
                      >
                        <span className="text-lg">✅</span> ยืนยันเข้าร่วม
                      </Button>
                    </motion.div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            {/* Modal ยืนยันการเข้ากลุ่ม */}
            {groupModal && (typeof window === 'undefined' || !document.body ? null : createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-0 w-full max-w-lg relative overflow-hidden">
                  {/* Header พาสเทล */}
                  <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 px-8 py-6 rounded-t-2xl flex items-center gap-3 border-b border-blue-100">
                    <span className="text-3xl">👥</span>
                    <h3 className="text-2xl font-extrabold text-blue-700 drop-shadow-sm">ยืนยันการเข้ากลุ่ม</h3>
                  </div>
                  <div className="space-y-4 px-8 py-6 bg-gradient-to-br from-blue-50 via-pink-50 to-purple-50">
                    <div className="p-4 rounded-xl bg-white/80 border border-blue-100 flex flex-col gap-2 shadow-sm">
                      <div className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                        <span className="text-pink-400 text-2xl">🤝</span>
                        คุณต้องการเข้ากลุ่มกับ <span className="font-bold text-blue-700">{users[selectedGroupMember]?.meta?.discord || 'ไม่ทราบชื่อ'}</span> ?
                      </div>
                      {/* จำนวนสมาชิก/สถานะกลุ่ม */}
                      {event.maxGroupSize <= 1 ? (
                        <div className="mt-2 text-base text-blue-400 flex items-center gap-2">
                          <span className="text-xl">🚫</span> กิจกรรมนี้ไม่ได้เปิดระบบกลุ่ม
                        </div>
                      ) : (() => {
                        const targetParticipant = participantUids.find(p => p.uid === selectedGroupMember);
                        if (targetParticipant?.groupId) {
                          const groupMembers = participantUids.filter(p => p.groupId === targetParticipant.groupId);
                          return (
                            <div className="mt-2 text-base text-blue-600 flex items-center gap-2">
                              <span className="text-xl">👤</span> กลุ่มนี้มีสมาชิก <span className="font-bold text-purple-600">{groupMembers.length}/{event.maxGroupSize}</span> คน
                            </div>
                          );
                        }
                        return (
                          <div className="mt-2 text-base text-blue-600 flex items-center gap-2">
                            <span className="text-xl">✨</span> จะสร้างกลุ่มใหม่ <span className="font-bold text-purple-600">(สูงสุด {event.maxGroupSize} คน)</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {/* ปุ่ม action */}
                  {event.maxGroupSize > 1 && (
                    <div className="flex justify-end gap-2 px-8 py-4 bg-gradient-to-r from-pink-50 via-blue-50 to-purple-50 rounded-b-2xl border-t border-blue-100 sticky bottom-0">
                      <button
                        onClick={() => {
                          setGroupModal(false);
                          setSelectedGroupMember('');
                        }}
                        className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white/80 hover:bg-gray-100 transition font-semibold"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={() => handleJoinGroup(selectedGroupMember)}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-white font-bold shadow hover:from-pink-500 hover:to-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!selectedGroupMember}
                      >
                        <span className="mr-1">🎉</span>ยืนยัน
                      </button>
                    </div>
                  )}
                </div>
              </div>,
              document.body
            ))}
            {/* Toast แจ้งเตือน */}
            <Toast message={toast.message} show={toast.show} />
            {/* Modal เพิ่มชื่อกลุ่ม */}
            <Dialog open={groupNameModalOpen} onOpenChange={setGroupNameModalOpen}>
              <DialogContent className="max-w-sm p-0 rounded-2xl overflow-hidden border-2 border-blue-100 shadow-xl bg-gradient-to-br from-blue-50 via-pink-50 to-white">
                <DialogHeader>
                  <div className="flex items-center gap-2 px-6 pt-6 pb-2">
                    <span className="text-2xl">🎨</span>
                    <DialogTitle className="text-xl font-extrabold text-blue-700 drop-shadow">ตั้งชื่อกลุ่ม</DialogTitle>
                  </div>
                </DialogHeader>
                <div className="flex flex-col gap-4 px-6 pb-6 pt-2">
                  <div className="text-blue-500 text-sm mb-1 text-center">ตั้งชื่อกลุ่มให้ดูเท่ หรือเว้นว่างหากไม่ต้องการชื่อกลุ่ม</div>
                  <input
                    type="text"
                    className="w-full rounded-xl border-2 border-blue-200 p-3 focus:ring-2 focus:ring-blue-300 text-center text-lg font-bold bg-white/80 shadow-inner placeholder:text-blue-200"
                    placeholder="ใส่ชื่อกลุ่ม (เว้นว่างเพื่อลบชื่อ)"
                    value={groupNameInput}
                    maxLength={30}
                    onChange={e => setGroupNameInput(e.target.value)}
                    autoFocus
                    style={{ letterSpacing: '0.5px' }}
                  />
                  <div className="flex gap-2 justify-end mt-2">
                    <Button
                      variant="outline"
                      className="border-gray-300 text-gray-500 bg-white/80 hover:bg-gray-100 rounded-lg px-5 py-2 font-semibold"
                      onClick={() => {
                        setGroupNameModalOpen(false);
                        setGroupNameEditingGroupId(null);
                        setGroupNameInput('');
                      }}
                    >ยกเลิก</Button>
                    <Button
                      className="bg-gradient-to-r from-blue-400 to-pink-400 text-white font-bold rounded-lg px-5 py-2 shadow hover:from-blue-500 hover:to-pink-500 transition-all"
                      onClick={async () => {
                        if (groupNameEditingGroupId) {
                          await handleUpdateGroupName(groupNameEditingGroupId, groupNameInput.trim());
                          setGroupNameModalOpen(false);
                          setGroupNameEditingGroupId(null);
                          setGroupNameInput('');
                        }
                      }}
                    >บันทึก</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div> {/* ปิด div style={{position:'relative',zIndex:2}} */}
        </div>
      </div>
    </React.Fragment>
  );
} 