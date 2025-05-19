'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuild } from '@/hooks/useGuild';
import { useRouter } from 'next/navigation';
import { ref, onValue, update, get, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Crown, Check, X, Clock, Search } from 'lucide-react';
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

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-pink-200 max-w-2xl mx-auto md:max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-pink-100 relative">
          <div className="p-3 bg-pink-100 rounded-xl">
            <Crown className="w-8 h-8 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📜 ประวัติการบริจาคเงินสด</h1>
            <p className="text-sm text-gray-500 mt-1">ดูประวัติการบริจาคเงินสดของสมาชิกทั้งหมดในกิลด์</p>
          </div>
          {/* Navigation Buttons */}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/guild-donate/history"
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
            >
              <Crown className="w-4 h-4" />
              <span>ประวัติบริจาค Gold</span>
            </Link>
            {/* ปุ่มบริจาคกิลด์: Desktop */}
            <Link
              href="/guild-donate"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-200 via-orange-100 to-yellow-100 text-pink-800 text-sm font-bold rounded-full shadow border-2 border-pink-300 hover:from-pink-400 hover:to-orange-200 hover:text-white hover:shadow-xl transition-all duration-150"
              style={{ minWidth: 'fit-content' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              บริจาคกิลด์
            </Link>
          </div>
        </div>
        {/* ปุ่มบริจาคกิลด์: Mobile */}
        <Link
          href="/guild-donate"
          className="block sm:hidden w-full mb-4 px-0 py-2 bg-gradient-to-r from-pink-200 via-orange-100 to-yellow-100 text-pink-800 text-base font-bold rounded-xl shadow-sm border border-pink-200 text-center hover:from-pink-400 hover:to-orange-200 hover:text-white hover:shadow transition-all duration-150"
        >
          <span className="inline-flex items-center gap-2 justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            บริจาคกิลด์
          </span>
        </Link>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ Discord..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-pink-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300"
            />
          </div>
        </div>

        {/* Table (Desktop only) */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-pink-50">
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-pink-100"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1">
                    จำนวนเงิน
                    {sortField === 'amount' && (
                      <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-pink-100"
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
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-pink-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    วันที่
                    {sortField === 'date' && (
                      <span className="text-xs">{sortDirection === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-100">
              {pagedDonations.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-500">ไม่พบรายการบริจาค</td></tr>
              ) : (
                pagedDonations.map((donation) => {
                  const discordName = donorDiscords[donation.userId] || '...';
                  return (
                    <tr key={donation.id} className="hover:bg-pink-50/50">
                      <td className="px-4 py-3 font-bold text-pink-700">{donation.amount} บาท</td>
                      <td className="px-4 py-3">@{discordName}</td>
                      <td className="px-4 py-3">{new Date(donation.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {donation.status === 'waiting' && <span className="text-yellow-600 font-semibold">รออนุมัติ</span>}
                        {donation.status === 'active' && <span className="text-green-600 font-semibold">อนุมัติแล้ว</span>}
                        {donation.status === 'rejected' && <span className="text-red-600 font-semibold">ถูกยกเลิก</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List (Mobile only) */}
        <div className="block md:hidden space-y-2 px-1">
          {pagedDonations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">ไม่พบรายการบริจาค</div>
          ) : (
            pagedDonations.map((donation) => {
              const discordName = donorDiscords[donation.userId] || '...';
              return (
                <div key={donation.id} className="bg-white/90 border border-pink-100 rounded-lg shadow-sm p-2 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-pink-400 shrink-0" />
                    <span className="font-bold text-gray-800 text-base truncate max-w-[120px]">@{discordName}</span>
                    <span className="ml-auto text-xs text-pink-700 font-bold whitespace-nowrap">{donation.amount} บาท</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mt-1">
                    <div className="flex items-center gap-1 min-w-[120px]">
                      <Clock className="w-4 h-4 text-pink-300" />
                      <span className="text-gray-600 truncate">{new Date(donation.createdAt).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-1 min-w-[80px]">
                      {donation.status === 'waiting' && <span className="text-yellow-600 font-semibold flex items-center gap-1"><Clock className="w-4 h-4" />รออนุมัติ</span>}
                      {donation.status === 'active' && <span className="text-green-600 font-semibold flex items-center gap-1"><Check className="w-4 h-4" />อนุมัติแล้ว</span>}
                      {donation.status === 'rejected' && <span className="text-red-600 font-semibold flex items-center gap-1"><X className="w-4 h-4" />ถูกยกเลิก</span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-3">
            <button
              className="px-2 py-1 rounded bg-pink-50 text-pink-600 border border-pink-200 disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={cn(
                  "px-3 py-1 rounded font-bold border",
                  page === i + 1 ? "bg-pink-400 text-white border-pink-400" : "bg-white text-pink-700 border-pink-200"
                )}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="px-2 py-1 rounded bg-pink-50 text-pink-600 border border-pink-200 disabled:opacity-50"
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