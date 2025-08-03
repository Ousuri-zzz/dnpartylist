'use client';
import { ref, push, set, onValue, update, get, ref as dbRef } from 'firebase/database';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useGuild } from '@/hooks/useGuild';
import { useCharacters } from '@/hooks/useCharacters';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { getClassColors, CLASS_TO_ROLE } from '@/config/theme';
import Link from 'next/link';
import { Crown, CreditCard, BarChart3, TrendingUp } from 'lucide-react';
import QRPaymentModal from '@/components/QRPaymentModal';
import { DonationHistoryModal } from '@/components/DonationHistoryModal';

interface Donate {
  id: string;
  userId: string;
  discordName: string;
  amount: number;
  status: 'waiting' | 'active' | 'rejected';
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  characters?: Array<{
    id: string;
    name: string;
    class: string;
  }>;
}

const getClassIcon = (className: string) => {
  let colorClass = '';
  switch (className) {
    case 'Sword Master':
    case 'Mercenary':
      colorClass = 'text-red-600';
      break;
    case 'Bowmaster':
    case 'Acrobat':
      colorClass = 'text-emerald-600';
      break;
    case 'Force User':
    case 'Elemental Lord':
      colorClass = 'text-purple-600';
      break;
    case 'Paladin':
    case 'Priest':
      colorClass = 'text-sky-600';
      break;
    case 'Engineer':
    case 'Alchemist':
      colorClass = 'text-amber-600';
      break;
    default:
      colorClass = 'text-gray-700';
  }
  switch (className) {
    case 'Sword Master':
      return <i className={`ra ra-sword ${colorClass}`} title="Sword Master" />;
    case 'Mercenary':
      return <i className={`ra ra-axe ${colorClass}`} title="Mercenary" />;
    case 'Bowmaster':
      return <i className={`ra ra-archer ${colorClass}`} title="Bowmaster" />;
    case 'Acrobat':
      return <i className={`ra ra-player-dodge ${colorClass}`} title="Acrobat" />;
    case 'Force User':
      return <i className={`ra ra-crystal-ball ${colorClass}`} title="Force User" />;
    case 'Elemental Lord':
      return <i className={`ra ra-fire-symbol ${colorClass}`} title="Elemental Lord" />;
    case 'Paladin':
      return <i className={`ra ra-shield ${colorClass}`} title="Paladin" />;
    case 'Priest':
      return <i className={`ra ra-hospital-cross ${colorClass}`} title="Priest" />;
    case 'Engineer':
      return <i className={`ra ra-gear-hammer ${colorClass}`} title="Engineer" />;
    case 'Alchemist':
      return <i className={`ra ra-flask ${colorClass}`} title="Alchemist" />;
    default:
      return <i className={`ra ra-player ${colorClass}`} title="Unknown" />;
  }
};

export default function GuildDonatePage() {
  const { user } = useAuth();
  const { isGuildLeader } = useGuild();
  const { characters } = useCharacters();
  const [donates, setDonates] = useState<Donate[]>([]);
  const [selectedDonate, setSelectedDonate] = useState<Donate | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [donorDiscords, setDonorDiscords] = useState<Record<string, string>>({});
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 6;
  const [showQRPayment, setShowQRPayment] = useState(false);
  const [cashDonations, setCashDonations] = useState<any[]>([]);
  const [cashDonorDiscords, setCashDonorDiscords] = useState<Record<string, string>>({});
  const [myCashDonations, setMyCashDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    const donatesRef = ref(db, 'guilddonate');
    const unsubscribe = onValue(donatesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const donatesList = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value
        }));
        setDonates(donatesList);
      } else {
        setDonates([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchDiscords = async () => {
      const userIds = Array.from(new Set(donates.map(d => d.userId)));
      const newDiscords: Record<string, string> = { ...donorDiscords };
      await Promise.all(userIds.map(async (uid) => {
        if (!newDiscords[uid]) {
          const metaSnap = await get(dbRef(db, `users/${uid}/meta/discord`));
          if (metaSnap.exists()) {
            newDiscords[uid] = metaSnap.val();
          }
        }
      }));
      setDonorDiscords(newDiscords);
    };
    if (donates.length > 0) fetchDiscords();
    // eslint-disable-next-line
  }, [donates]);

  useEffect(() => {
    if (!isGuildLeader) return;
    const cashRef = ref(db, 'guilddonatecash');
    const unsub = onValue(cashRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data)
          .filter(([id, value]: [string, any]) => (
            value &&
            value.status === 'waiting' &&
            typeof value.amount === 'number' &&
            typeof value.createdAt === 'number' &&
            typeof value.userId === 'string' &&
            value.type === 'cash' &&
            value.paymentMethod === 'promptpay'
          ))
          .map(([id, value]: [string, any]) => ({ id, ...value }));
        setCashDonations(list);
      } else {
        setCashDonations([]);
      }
    });
    return () => unsub();
  }, [isGuildLeader]);

  useEffect(() => {
    const fetchDiscords = async () => {
      const userIds = Array.from(new Set(cashDonations.map(d => d.userId)));
      const newDiscords: Record<string, string> = { ...cashDonorDiscords };
      await Promise.all(userIds.map(async (uid) => {
        if (!newDiscords[uid]) {
          const metaSnap = await get(dbRef(db, `users/${uid}/meta/discord`));
          if (metaSnap.exists()) {
            newDiscords[uid] = metaSnap.val();
          }
        }
      }));
      setCashDonorDiscords(newDiscords);
    };
    if (cashDonations.length > 0) fetchDiscords();
    // eslint-disable-next-line
  }, [cashDonations]);

  useEffect(() => {
    if (!user) return;
    const cashRef = ref(db, 'guilddonatecash');
    const unsub = onValue(cashRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data)
          .filter(([id, value]: [string, any]) => (
            value &&
            value.userId === user.uid &&
            typeof value.amount === 'number' &&
            typeof value.createdAt === 'number' &&
            value.type === 'cash' &&
            value.paymentMethod === 'promptpay'
          ))
          .map(([id, value]: [string, any]) => ({ id, ...value }));
        setMyCashDonations(list);
      } else {
        setMyCashDonations([]);
      }
    });
    return () => unsub();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error('กรุณาเข้าสู่ระบบ');
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return toast.error('กรุณากรอกจำนวนเงินให้ถูกต้อง');
    if (selectedCharacterIds.length === 0) return toast.error('กรุณาเลือกตัวละคร');
    setSubmitting(true);
    try {
      const selectedChars = characters.filter(c => selectedCharacterIds.includes(c.id)).map(c => ({ id: c.id, name: c.name, class: c.class }));
      let discordName = '';
      try {
        const metaSnap = await get(ref(db, `users/${user.uid}/meta/discord`));
        discordName = metaSnap.exists() ? metaSnap.val() : user.displayName || '';
      } catch { discordName = user.displayName || ''; }
      const donateData = {
        userId: user.uid,
        discordName,
        amount: Number(amount),
        status: 'waiting',
        createdAt: Date.now(),
        characters: selectedChars
      };
      await push(ref(db, 'guilddonate'), donateData);
      await push(ref(db, 'feed/all'), {
        type: 'donate',
        subType: 'waiting',
        text: `@${discordName} ขอบริจาค ${Number(amount)}G ให้กิลด์ GalaxyCat 💖`,
        userId: user.uid,
        discordName,
        amount: Number(amount),
        characters: selectedChars,
        status: 'waiting',
        timestamp: Date.now()
      });
      setAmount('');
      setSelectedCharacterIds([]);
      toast.success('ส่งคำขอบริจาคสำเร็จ! รอหัวกิลด์อนุมัติ');
    } catch (err) {
      toast.error('เกิดข้อผิดพลาดในการส่งคำขอบริจาค');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (donateId: string, approve: boolean) => {
    const status = approve ? 'active' : 'rejected';
    const approvedAt = Date.now();
    await update(ref(db, `guilddonate/${donateId}`), {
      status,
      approvedAt,
      approvedBy: user?.uid || ''
    });
    const donate = donates.find(d => d.id === donateId);
    if (donate) {
      let discordName = '';
      try {
        const metaSnap = await get(ref(db, `users/${donate.userId}/meta/discord`));
        discordName = metaSnap.exists() ? metaSnap.val() : donate.discordName;
      } catch { discordName = donate.discordName; }
      let feedText = '';
      if (approve) {
        feedText = `@${discordName} บริจาค ${donate.amount}G ให้กิลด์ GalaxyCat สำเร็จ ✅`;
      } else {
        feedText = `@${discordName} ยกเลิกการบริจาค ${donate.amount}G ให้กิลด์ GalaxyCat ❌`;
      }
      await push(ref(db, 'feed/all'), {
        type: 'donate',
        subType: status,
        text: feedText,
        userId: donate.userId,
        discordName,
        amount: donate.amount,
        characters: donate.characters,
        status,
        timestamp: approvedAt
      });
    }
    setSelectedDonate(null);
    toast.success(approve ? 'ยืนยันบริจาคสำเร็จ' : 'ยกเลิกบริจาคแล้ว');
  };

  const handleApproveCash = async (donationId: string, approve: boolean) => {
    const status = approve ? 'active' : 'rejected';
    const approvedAt = Date.now();
    await update(ref(db, `guilddonatecash/${donationId}`), {
      status,
      approvedAt,
      approvedBy: user?.uid || ''
    });
    const donation = cashDonations.find(d => d.id === donationId);
    if (donation) {
      const metaSnap = await get(dbRef(db, `users/${donation.userId}/meta/discord`));
      const discordName = metaSnap.exists() ? metaSnap.val() : '...';
      const feedText = approve
        ? `@${discordName} บริจาคเงินสด ${donation.amount} บาท ให้กิลด์ GalaxyCat สำเร็จ ✅`
        : `@${discordName} ยกเลิกการบริจาคเงินสด ${donation.amount} บาท ให้กิลด์ GalaxyCat ❌`;
      await push(ref(db, 'feed/all'), {
        type: 'donate',
        subType: status,
        text: feedText,
        userId: donation.userId,
        discordName,
        amount: donation.amount,
        status,
        timestamp: approvedAt
      });
    }
    toast.success(approve ? 'ยืนยันการบริจาคเงินสดสำเร็จ' : 'ยกเลิกการบริจาคเงินสดแล้ว');
  };

  const myHistory = useMemo(() => {
    const gold = donates.filter(d => d.userId === user?.uid).map(d => ({ ...d, _type: 'gold' }));
    const cash = myCashDonations.map(d => ({ ...d, _type: 'cash' }));
    return [...gold, ...cash].sort((a, b) => b.createdAt - a.createdAt);
  }, [donates, myCashDonations, user]);
  const totalHistoryPages = Math.ceil(myHistory.length / historyPerPage);
  const pagedHistory = myHistory.slice((historyPage - 1) * historyPerPage, historyPage * historyPerPage);

  // รายการที่รออนุมัติ
  const pendingDonations = useMemo(() => {
    const gold = donates.filter(d => d.userId === user?.uid && d.status === 'waiting').map(d => ({ ...d, _type: 'gold' }));
    const cash = myCashDonations.filter(d => d.status === 'waiting').map(d => ({ ...d, _type: 'cash' }));
    return [...gold, ...cash];
  }, [donates, myCashDonations, user]);

  // ฟังก์ชันช่วยเช็คเดือน
  function getDonateMonthType(dateNum: number) {
    const d = new Date(dateNum);
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    let prevMonth = thisMonth - 1;
    let prevYear = thisYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear = thisYear - 1;
    }
    if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) return 'current';
    if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) return 'previous';
    return 'other';
  }

  if (loading || usersLoading || authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="relative">
          {/* Spinning ring */}
          <div className="absolute inset-0">
            <div className="w-24 h-24 rounded-full border-4 border-pink-300 border-t-transparent animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-5xl mx-auto py-8">
      <div className="flex-1 min-w-0">
        {/* ฟอร์มบริจาค */}
        <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-7 mb-10 border border-pink-200 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2 mb-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 sm:py-2 shadow border border-pink-100">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-pink-100 text-pink-500 shadow"><span className="text-2xl">💖</span></span>
              <span className="text-sm sm:text-base font-medium">ส่งคำขอบริจาคกิลด์</span>
            </div>
            <Link
              href="/guild-donate/history"
              className="group relative w-full sm:w-auto sm:ml-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:px-3 sm:py-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white text-sm font-bold rounded-lg shadow-lg hover:shadow-2xl hover:shadow-purple-500/25 transition-all duration-500 transform hover:scale-105 border-2 border-purple-300/40 hover:border-purple-200/60 overflow-hidden"
            >
              {/* Always visible glow with subtle zoom */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-pink-400/20 to-orange-400/20 rounded-lg animate-pulse" style={{animationDuration: '4s'}}></div>
              
              {/* Subtle background animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-orange-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
              
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1200 ease-out"></div>
              
              {/* Firework effect - always visible */}
              <div className="absolute inset-0">
                {/* Firework particles */}
                <div className="absolute top-0 left-1/2 w-0.5 h-0.5 bg-yellow-300 rounded-full animate-pulse opacity-60" style={{animationDuration: '2s'}}></div>
                <div className="absolute top-1 left-1/3 w-0.5 h-0.5 bg-pink-300 rounded-full animate-pulse opacity-60" style={{animationDuration: '2.5s', animationDelay: '0.5s'}}></div>
                <div className="absolute top-2 right-1/3 w-0.5 h-0.5 bg-purple-300 rounded-full animate-pulse opacity-60" style={{animationDuration: '3s', animationDelay: '1s'}}></div>
                <div className="absolute bottom-1 left-1/4 w-0.5 h-0.5 bg-orange-300 rounded-full animate-pulse opacity-60" style={{animationDuration: '2.8s', animationDelay: '1.5s'}}></div>
                <div className="absolute bottom-2 right-1/4 w-0.5 h-0.5 bg-yellow-300 rounded-full animate-pulse opacity-60" style={{animationDuration: '2.2s', animationDelay: '0.8s'}}></div>
                
                {/* Sparkle effects */}
                <div className="absolute top-1 right-1/2 w-1 h-1 bg-white/50 rounded-full animate-pulse" style={{animationDuration: '1.8s'}}></div>
                <div className="absolute bottom-1 left-1/2 w-1 h-1 bg-white/50 rounded-full animate-pulse" style={{animationDuration: '2.2s', animationDelay: '0.3s'}}></div>
                <div className="absolute top-1/2 left-1 w-0.5 h-0.5 bg-white/40 rounded-full animate-pulse" style={{animationDuration: '2.5s', animationDelay: '0.7s'}}></div>
                <div className="absolute top-1/2 right-1 w-0.5 h-0.5 bg-white/40 rounded-full animate-pulse" style={{animationDuration: '2s', animationDelay: '1.2s'}}></div>
              </div>
              
              {/* Content with smooth animations */}
              <div className="relative z-10 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-400 ease-out" />
                <span className="hidden sm:inline group-hover:tracking-wide font-bold transition-all duration-400 ease-out">ดูประวัติบริจาค</span>
                <span className="sm:hidden group-hover:tracking-wide font-bold transition-all duration-400 ease-out">ประวัติบริจาค</span>
                <TrendingUp className="w-4 h-4 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-400 ease-out" />
              </div>
              
              {/* Notification dot - always visible with subtle zoom */}
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse opacity-75" style={{animationDuration: '2s'}}></div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
              
              {/* Text hint */}
              <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 text-xs text-purple-600 font-medium whitespace-nowrap">
                🏆 ดูอันดับ & สถิติ
              </div>
            </Link>
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><span className="text-lg">💰</span> จำนวนเงิน (G)</label>
              <input type="number" min="1" className="w-full border-2 border-yellow-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-200 bg-white shadow-sm text-lg" value={amount} onChange={e => setAmount(e.target.value)} disabled={submitting} placeholder="จำนวน Gold" />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => setShowQRPayment(true)}
                className="bg-green-500 hover:bg-green-600 text-white h-[42px] px-4 flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                <span>บริจาคเงินสด</span>
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1"><span className="text-lg">🧙‍♂️</span> เลือกตัวละครที่ใช้บริจาค</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {characters.map(c => {
                const selected = selectedCharacterIds.includes(c.id);
                const role = CLASS_TO_ROLE[c.class as keyof typeof CLASS_TO_ROLE] || 'Warrior';
                const classColors = getClassColors(role);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSelectedCharacterIds(selected ? [] : [c.id])}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-xl border-2 p-3 cursor-pointer transition-all shadow-sm",
                      classColors.bg,
                      classColors.bg === 'bg-red-100' ? 'dark:bg-red-900/60' :
                      classColors.bg === 'bg-emerald-100' ? 'dark:bg-emerald-900/60' :
                      classColors.bg === 'bg-purple-100' ? 'dark:bg-purple-900/60' :
                      classColors.bg === 'bg-sky-100' ? 'dark:bg-sky-900/60' :
                      classColors.bg === 'bg-amber-100' ? 'dark:bg-amber-900/60' :
                      classColors.bg === 'bg-gray-100' ? 'dark:bg-gray-800/60' : '',
                      classColors.border,
                      selected ? "ring-2 ring-pink-300 scale-105" : "hover:scale-105 hover:shadow-md",
                      "focus:outline-none"
                    )}
                    aria-pressed={selected}
                  >
                    <span className="text-2xl mb-1" title={role}>{getClassIcon(c.class)}</span>
                    <span className={cn("font-bold text-base", classColors.text)}>{c.name}</span>
                    <span className={cn("text-xs", classColors.text)}>{c.class}</span>
                    {selected && <span className="mt-1 text-pink-500 text-lg">✔️</span>}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-gray-400 mt-2">แตะเพื่อเลือก (เลือกได้ 1 ตัว)</div>
          </div>
          <Button type="submit" className="bg-gradient-to-r from-pink-400 to-yellow-400 text-white font-bold py-2 rounded-xl shadow hover:from-pink-500 hover:to-yellow-500 flex items-center gap-2 justify-center text-lg" disabled={submitting}>
            <span className="text-xl">🚀</span> บริจาค Gold
          </Button>
        </form>

        {/* ป้ายแสดงรายการที่รออนุมัติ */}
        {pendingDonations.length > 0 && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-lg mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 border-2 border-yellow-300">
                <span className="text-2xl">⏳</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-yellow-800">รายการที่รออนุมัติ</h3>
                <p className="text-sm text-yellow-600">คุณมี {pendingDonations.length} รายการที่รอหัวกิลด์อนุมัติ</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-4">
              {pendingDonations.map((donation, index) => (
                <div key={donation.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-yellow-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100">
                        {donation._type === 'gold' ? (
                          <span className="text-lg">🎁</span>
                        ) : (
                          <span className="text-lg">💵</span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-yellow-800">
                          {donation._type === 'gold' ? `${donation.amount}G` : `${donation.amount} บาท`}
                        </div>
                        <div className="text-xs text-yellow-600 flex items-center gap-1">
                          <span className="inline-flex items-center justify-center w-3 h-3">
                            <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3"/>
                              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse"/>
                            </svg>
                          </span>
                          {new Date(donation.createdAt).toLocaleString('th-TH')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        รออนุมัติ
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ปุ่มติดต่อหัวกิลด์ */}
            <div className="flex items-center justify-center">
              <a
                href="https://discord.com/users/1163943838826631258"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center justify-center gap-3 px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold rounded-xl shadow-lg hover:shadow-2xl hover:shadow-[#5865F2]/25 transition-all duration-500 transform hover:scale-105 border-2 border-[#5865F2]/40 hover:border-[#4752C4]/60 overflow-hidden"
              >
                {/* Always visible glow with subtle zoom */}
                <div className="absolute inset-0 bg-[#5865F2]/20 rounded-xl animate-pulse" style={{animationDuration: '4s'}}></div>
                
                {/* Subtle background animation */}
                <div className="absolute inset-0 bg-[#5865F2]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1200 ease-out"></div>
                
                {/* Firework effect - always visible */}
                <div className="absolute inset-0">
                  {/* Firework particles */}
                  <div className="absolute top-0 left-1/2 w-0.5 h-0.5 bg-[#5865F2] rounded-full animate-pulse opacity-60" style={{animationDuration: '2s'}}></div>
                  <div className="absolute top-1 left-1/3 w-0.5 h-0.5 bg-[#5865F2] rounded-full animate-pulse opacity-60" style={{animationDuration: '2.5s', animationDelay: '0.5s'}}></div>
                  <div className="absolute top-2 right-1/3 w-0.5 h-0.5 bg-[#5865F2] rounded-full animate-pulse opacity-60" style={{animationDuration: '3s', animationDelay: '1s'}}></div>
                  <div className="absolute bottom-1 left-1/4 w-0.5 h-0.5 bg-[#5865F2] rounded-full animate-pulse opacity-60" style={{animationDuration: '2.8s', animationDelay: '1.5s'}}></div>
                  <div className="absolute bottom-2 right-1/4 w-0.5 h-0.5 bg-[#5865F2] rounded-full animate-pulse opacity-60" style={{animationDuration: '2.2s', animationDelay: '0.8s'}}></div>
                  
                  {/* Sparkle effects */}
                  <div className="absolute top-1 right-1/2 w-1 h-1 bg-white/50 rounded-full animate-pulse" style={{animationDuration: '1.8s'}}></div>
                  <div className="absolute bottom-1 left-1/2 w-1 h-1 bg-white/50 rounded-full animate-pulse" style={{animationDuration: '2.2s', animationDelay: '0.3s'}}></div>
                  <div className="absolute top-1/2 left-1 w-0.5 h-0.5 bg-white/40 rounded-full animate-pulse" style={{animationDuration: '2.5s', animationDelay: '0.7s'}}></div>
                  <div className="absolute top-1/2 right-1 w-0.5 h-0.5 bg-white/40 rounded-full animate-pulse" style={{animationDuration: '2s', animationDelay: '1.2s'}}></div>
                </div>
                
                {/* Content with smooth animations */}
                <div className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-400 ease-out" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                  <span className="group-hover:tracking-wide transition-all duration-400 ease-out">ติดต่อหัวกิลด์</span>
                  <svg className="w-4 h-4 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-400 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                
                {/* Notification dot - always visible with subtle zoom */}
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#5865F2] rounded-full animate-pulse opacity-75" style={{animationDuration: '2s'}}></div>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#5865F2] rounded-full"></div>
                
                {/* Text hint */}
                <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-500 text-xs text-[#5865F2] font-medium whitespace-nowrap">
                  💬 ส่งข้อความหา
                </div>
              </a>
            </div>
          </div>
        )}
      </div>
      <aside className="w-full md:w-[380px] max-w-full">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-pink-200 p-5 sticky top-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow border border-pink-100">
            <CreditCard className="text-pink-500 w-6 h-6" />
            <h2 className="text-xl font-bold text-gray-800">ประวัติการบริจาคของฉัน</h2>
          </div>
          <div className="space-y-2">
            {pagedHistory.length === 0 && (
              <div className="text-gray-400 text-center">ยังไม่มีประวัติ</div>
            )}
            {pagedHistory.map(donate => {
              const monthType = getDonateMonthType(donate.createdAt);
              return (
              <div key={donate.id} className={cn(
                "rounded-xl p-4 flex flex-wrap gap-4 items-center shadow border-2",
                donate.status === 'waiting' && 'bg-yellow-50 border-yellow-200',
                donate.status === 'active' && 'bg-green-50 border-green-200',
                  donate.status === 'rejected' && 'bg-red-50 border-red-200',
                  // เพิ่มไฮไลท์เดือน
                  monthType === 'current' && 'bg-pink-50 border-pink-200',
                  monthType === 'previous' && 'bg-orange-50 border-orange-200'
              )}>
                {donate._type === 'gold' ? (
                  <span className="font-bold text-yellow-700 flex items-center gap-1"><span className="text-lg">🎁</span> {donate.amount}G</span>
                ) : (
                  <span className="font-bold text-green-700 flex items-center gap-1"><span className="text-lg">💵</span> {donate.amount} บาท</span>
                )}
                <span className={cn(
                  'font-semibold flex items-center gap-1',
                  donate.status === 'waiting' && 'text-yellow-700',
                  donate.status === 'active' && 'text-green-700',
                  donate.status === 'rejected' && 'text-red-700'
                )}>
                  {donate.status === 'waiting' ? <><span className="text-lg">⏳</span> รออนุมัติ</> : donate.status === 'active' ? <><span className="text-lg">✅</span> อนุมัติแล้ว</> : <><span className="text-lg">❌</span> ถูกยกเลิก</>}
                </span>
                <span className="text-gray-500 text-xs flex items-center gap-1"><span className="text-lg">⏰</span> {new Date(donate.createdAt).toLocaleString()}</span>
              </div>
              );
            })}
          </div>
          {/* Pagination */}
          {totalHistoryPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-3">
              <button
                className="px-2 py-1 rounded bg-pink-50 text-pink-600 border border-pink-200 disabled:opacity-50"
                onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                disabled={historyPage === 1}
              >
                &lt;
              </button>
              {Array.from({ length: totalHistoryPages }, (_, i) => (
                <button
                  key={i}
                  className={cn(
                    "px-3 py-1 rounded font-bold border",
                    historyPage === i + 1 ? "bg-pink-400 text-white border-pink-400" : "bg-white text-pink-700 border-pink-200"
                  )}
                  onClick={() => setHistoryPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="px-2 py-1 rounded bg-pink-50 text-pink-600 border border-pink-200 disabled:opacity-50"
                onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))}
                disabled={historyPage === totalHistoryPages}
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* QR Payment Modal */}
      <QRPaymentModal
        isOpen={showQRPayment}
        onClose={() => setShowQRPayment(false)}
        onSuccess={() => {
          setShowQRPayment(false);
          // Refresh data if needed
        }}
      />

      {/* Donation History Modal */}
      <DonationHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        donations={myHistory}
      />
    </div>
  );
} 