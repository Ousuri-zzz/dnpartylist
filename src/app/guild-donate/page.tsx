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
import { Crown, CreditCard } from 'lucide-react';
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
          <div className="flex items-center gap-2 mb-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow border border-pink-100">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-pink-100 text-pink-500 shadow"><span className="text-2xl">💖</span></span>
            ส่งคำขอบริจาคกิลด์
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="ml-auto text-sm text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1"
            >
              <span>ประวัติการบริจาค</span>
              <span className="text-lg">📜</span>
            </button>
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
            <span className="text-xl">🚀</span> ส่งคำขอ
          </Button>
        </form>
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
            {pagedHistory.map(donate => (
              <div key={donate.id} className={cn(
                "rounded-xl p-4 flex flex-wrap gap-4 items-center shadow border-2",
                donate.status === 'waiting' && 'bg-yellow-50 border-yellow-200',
                donate.status === 'active' && 'bg-green-50 border-green-200',
                donate.status === 'rejected' && 'bg-red-50 border-red-200'
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
            ))}
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