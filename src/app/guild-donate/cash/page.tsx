'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuild } from '@/hooks/useGuild';
import { useRouter } from 'next/navigation';
import { ref, onValue, update, get, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Crown, Check, X, Clock, Search, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface CashDonation {
  id: string;
  userId: string;
  amount: number;
  status: 'waiting' | 'active' | 'rejected';
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  type: 'cash';
  paymentMethod: 'promptpay';
}

export default function GuildDonateCashPage() {
  const { user } = useAuth();
  const { isGuildLeader } = useGuild();
  const router = useRouter();
  const [donations, setDonations] = useState<CashDonation[]>([]);
  const [donorDiscords, setDonorDiscords] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<'amount' | 'discord' | 'date'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const perPage = 10;

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Load donations
    const donationsRef = ref(db, 'guilddonatecash');
    const unsubDonations = onValue(donationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const donationsList = Object.entries(data)
          .filter(([id, value]: [string, any]) => (
            value &&
            typeof value.amount === 'number' &&
            typeof value.createdAt === 'number' &&
            typeof value.userId === 'string' &&
            value.type === 'cash' &&
            value.paymentMethod === 'promptpay' &&
            value.status !== 'rejected'
          ))
          .map(([id, value]: [string, any]) => ({
            id,
            ...value
          }))
          .sort((a, b) => b.createdAt - a.createdAt);
        setDonations(donationsList);
      }
    });

    return () => {
      unsubDonations();
    };
  }, [user, router]);

  useEffect(() => {
    const fetchDiscords = async () => {
      const userIds = Array.from(new Set(donations.map(d => d.userId)));
      const newDiscords: Record<string, string> = { ...donorDiscords };
      await Promise.all(userIds.map(async (uid) => {
        if (!newDiscords[uid]) {
          const metaSnap = await get(ref(db, `users/${uid}/meta/discord`));
          if (metaSnap.exists()) {
            newDiscords[uid] = metaSnap.val();
          }
        }
      }));
      setDonorDiscords(newDiscords);
    };
    if (donations.length > 0) fetchDiscords();
  }, [donations]);

  const handleApprove = async (donationId: string, approve: boolean) => {
    const status = approve ? 'active' : 'rejected';
    const approvedAt = Date.now();
    await update(ref(db, `guilddonatecash/${donationId}`), {
      status,
      approvedAt,
      approvedBy: user?.uid || ''
    });

    const donation = donations.find(d => d.id === donationId);
    if (donation) {
      const discordName = donorDiscords[donation.userId] || '...';
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

    toast.success(approve ? 'ยืนยันการบริจาคสำเร็จ' : 'ยกเลิกการบริจาคแล้ว');
  };

  const handleSort = (field: 'amount' | 'discord' | 'date') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedDonations = useMemo(() => {
    return [...donations].sort((a, b) => {
      if (sortField === 'amount') {
        return sortDirection === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      } else if (sortField === 'discord') {
        const aDiscord = donorDiscords[a.userId] || '';
        const bDiscord = donorDiscords[b.userId] || '';
        return sortDirection === 'desc' 
          ? bDiscord.localeCompare(aDiscord)
          : aDiscord.localeCompare(bDiscord);
      } else {
        return sortDirection === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
      }
    });
  }, [donations, sortField, sortDirection, donorDiscords]);

  const filteredDonations = sortedDonations.filter(donation => {
    const discordName = donorDiscords[donation.userId] || '';
    return discordName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const pagedDonations = filteredDonations.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filteredDonations.length / perPage);

  const topDonors = useMemo(() => {
    const totals: Record<string, { name: string; total: number }> = {};
    donations.forEach(d => {
      if (d.status === 'active') {
        const name = donorDiscords[d.userId] || '...';
        if (!totals[d.userId]) {
          totals[d.userId] = { name, total: 0 };
        }
        totals[d.userId].total += d.amount;
      }
    });
    return Object.values(totals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [donations, donorDiscords]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-10 border border-pink-200 max-w-2xl mx-auto md:max-w-6xl relative overflow-hidden">
        {/* Gradient Decoration */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-pink-200 via-pink-100 to-yellow-100 rounded-full blur-2xl opacity-60 z-0" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tr from-yellow-100 via-orange-100 to-pink-200 rounded-full blur-2xl opacity-60 z-0" />
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 pb-8 border-b border-pink-100 relative z-10">
          <div className="p-2 sm:p-4 bg-gradient-to-br from-pink-200 via-pink-100 to-yellow-100 rounded-2xl shadow-lg flex-shrink-0">
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-pink-600 drop-shadow" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight">📜 ประวัติการบริจาคเงินสด</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium">ดูประวัติการบริจาคเงินสดของสมาชิกทั้งหมดในกิลด์</p>
          </div>
          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <Link
              href="/guild-donate/history"
              className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2 bg-gradient-to-r from-yellow-100 via-pink-100 to-pink-200 text-pink-700 rounded-xl font-semibold hover:from-pink-200 hover:to-yellow-200 hover:text-pink-900 transition-colors shadow-md border border-pink-200 text-base drop-shadow-md w-full sm:w-auto"
            >
              <Crown className="w-5 h-5" />
              <span>ประวัติบริจาค Gold</span>
            </Link>
            {/* ปุ่มบริจาคกิลด์: Desktop */}
            <Link
              href="/guild-donate"
              className="hidden sm:flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-pink-300 via-orange-100 to-yellow-200 text-pink-800 text-base font-bold rounded-full shadow-lg border-2 border-pink-300 hover:from-pink-400 hover:to-orange-200 hover:text-white hover:shadow-xl transition-all duration-150"
              style={{ minWidth: 'fit-content' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              บริจาคกิลด์
            </Link>
          </div>
        </div>
        {/* ปุ่มบริจาคกิลด์: Mobile */}
        <Link
          href="/guild-donate"
          className="block sm:hidden w-full mb-2 px-0 py-2 bg-gradient-to-r from-pink-200 via-orange-100 to-yellow-100 text-pink-800 text-base font-bold rounded-2xl shadow-md border border-pink-200 text-center hover:from-pink-400 hover:to-orange-200 hover:text-white hover:shadow transition-all duration-150"
        >
          <span className="inline-flex items-center gap-2 justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            บริจาคกิลด์
          </span>
        </Link>

        {/* Top Donors Box */}
        {topDonors.length > 0 && (
          <div className="mb-4">
            {/* อันดับ 1 เดี่ยว */}
            {topDonors[0] && (
              <div className="flex justify-center mb-4">
                <div
                  className="flex items-center gap-3 px-6 py-4 rounded-2xl shadow-lg border-2 bg-gradient-to-r from-yellow-200 via-yellow-100 to-pink-100 border-yellow-300 min-w-[220px]"
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/80 shadow text-yellow-500 text-2xl font-extrabold">
                    <Trophy className="text-yellow-400" size={32} />
                  </span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold text-lg truncate text-pink-700">{topDonors[0].name}</span>
                    <span className="text-gray-500 text-sm">อันดับ 1</span>
                  </div>
                  <span className="font-extrabold text-pink-600 text-xl text-right min-w-[70px]">{topDonors[0].total.toLocaleString()} <span className="text-gray-400 text-base font-normal">บาท</span></span>
                </div>
              </div>
            )}
            {/* อันดับ 2-3 */}
            <div className="flex flex-wrap gap-4 justify-center">
              {topDonors.slice(1).map((donor, idx) => (
                <div
                  key={donor.name + (idx+2)}
                  className={
                    `flex items-center gap-3 px-6 py-4 rounded-2xl shadow-lg border-2 ` +
                    (idx === 0
                      ? 'bg-gradient-to-r from-gray-200 via-blue-100 to-pink-50 border-blue-200'
                      : 'bg-gradient-to-r from-orange-100 via-pink-50 to-yellow-50 border-orange-200')
                  }
                  style={{ minWidth: 220 }}
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/80 shadow text-yellow-500 text-2xl font-extrabold">
                    <Trophy className={idx === 0 ? 'text-blue-400' : 'text-orange-400'} size={32} />
                  </span>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold text-lg truncate text-pink-700">{donor.name}</span>
                    <span className="text-gray-500 text-sm">อันดับ {idx + 2}</span>
                  </div>
                  <span className="font-extrabold text-pink-600 text-xl text-right min-w-[70px]">{donor.total.toLocaleString()} <span className="text-gray-400 text-base font-normal">บาท</span></span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-8 mt-2 relative z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-400 w-6 h-6" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ Discord..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-pink-100 rounded-xl bg-white/70 shadow focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 text-lg transition-all"
            />
          </div>
        </div>

        {/* Table (Desktop only) */}
        <div className="overflow-x-auto hidden md:block relative z-10">
          <table className="w-full rounded-2xl overflow-hidden shadow-lg bg-white/90">
            <thead>
              <tr className="bg-gradient-to-r from-pink-50 via-yellow-50 to-pink-100">
                <th
                  className="px-4 py-4 text-center text-base font-bold text-pink-700 cursor-pointer hover:bg-pink-100 transition-colors rounded-tl-2xl w-44 min-w-[160px] max-w-[180px]"
                  onClick={() => handleSort('amount')}
                >
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    จำนวนเงิน <span className="text-gray-400 font-normal">(บาท)</span>
                    {sortField === 'amount' && (
                      <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </span>
                </th>
                <th
                  className="px-6 py-4 text-left text-base font-bold text-pink-700 cursor-pointer hover:bg-pink-100 transition-colors"
                  onClick={() => handleSort('discord')}
                >
                  <div className="flex items-center gap-1">
                    Discord
                    {sortField === 'discord' && (
                      <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-4 text-center text-base font-bold text-pink-700 cursor-pointer hover:bg-pink-100 transition-colors w-48 min-w-[150px]"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1 justify-center">
                    วันที่
                    {sortField === 'date' && (
                      <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-4 text-center text-base font-bold text-pink-700 rounded-tr-2xl w-36 min-w-[110px]">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-100">
              {pagedDonations.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400 text-lg">ไม่พบรายการบริจาค</td></tr>
              ) : (
                pagedDonations.map((donation) => {
                  const discordName = donorDiscords[donation.userId] || '...';
                  return (
                    <tr key={donation.id} className="hover:bg-pink-50/80 transition-colors">
                      <td className="px-4 py-4 font-extrabold text-pink-600 text-lg text-center w-44 min-w-[160px] max-w-[180px]">{donation.amount}</td>
                      <td className="px-6 py-4 text-base font-semibold text-blue-700">{discordName}</td>
                      <td className="px-4 py-4 text-base text-gray-500 text-center w-48 min-w-[150px]">
                        <span className="inline-block bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-medium text-sm text-center">
                          {new Date(donation.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center w-36 min-w-[110px]">
                        {donation.status === 'waiting' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold text-sm shadow"><Clock className="w-4 h-4" />รออนุมัติ</span>}
                        {donation.status === 'active' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm shadow"><Check className="w-4 h-4" />อนุมัติแล้ว</span>}
                        {donation.status === 'rejected' && <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-sm shadow"><X className="w-4 h-4" />ถูกยกเลิก</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List (Mobile only) */}
        <div className="block md:hidden space-y-3 px-1 relative z-10">
          {pagedDonations.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-lg">ไม่พบรายการบริจาค</div>
          ) : (
            pagedDonations.map((donation) => {
              const discordName = donorDiscords[donation.userId] || '...';
              return (
                <div key={donation.id} className="bg-white/90 border border-pink-100 rounded-2xl shadow-lg p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 text-pink-400 shrink-0" />
                    <span className="font-extrabold text-blue-700 text-lg truncate max-w-[140px]">{discordName}</span>
                    <span className="ml-auto text-base text-pink-600 font-bold whitespace-nowrap text-center min-w-[70px]">{donation.amount}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base mt-1">
                    <div className="flex items-center gap-1 min-w-[120px]">
                      <Clock className="w-5 h-5 text-pink-300" />
                      <span className="inline-block bg-pink-50 text-pink-600 px-3 py-1 rounded-full font-medium text-sm text-center truncate">
                        {new Date(donation.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 min-w-[100px]">
                      {donation.status === 'waiting' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold text-sm shadow"><Clock className="w-4 h-4" />รออนุมัติ</span>}
                      {donation.status === 'active' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm shadow"><Check className="w-4 h-4" />อนุมัติแล้ว</span>}
                      {donation.status === 'rejected' && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-sm shadow"><X className="w-4 h-4" />ถูกยกเลิก</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6 relative z-10">
            <button
              className="px-3 py-2 rounded-full bg-pink-50 text-pink-600 border border-pink-200 shadow hover:bg-pink-100 disabled:opacity-50 transition-all"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={cn(
                  "px-4 py-2 rounded-full font-bold border shadow transition-all",
                  page === i + 1 ? "bg-pink-400 text-white border-pink-400 scale-110" : "bg-white text-pink-700 border-pink-200 hover:bg-pink-100"
                )}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="px-3 py-2 rounded-full bg-pink-50 text-pink-600 border border-pink-200 shadow hover:bg-pink-100 disabled:opacity-50 transition-all"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              &gt;
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 