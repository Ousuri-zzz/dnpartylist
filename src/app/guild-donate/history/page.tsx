'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuild } from '@/hooks/useGuild';
import { useRouter } from 'next/navigation';
import { ref, onValue, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Crown, Search, Calendar, Users, Coins, CreditCard, Award, Trophy, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { getClassColors, CLASS_TO_ROLE } from '@/config/theme';
import { DonationHistoryModal } from '@/components/DonationHistoryModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTheme } from 'next-themes';

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

interface MemberDonation {
  userId: string;
  discordName: string;
  lastDonation: number | null;
  lastDonationAmount: number | null;
  totalDonations: number;
  donationCount: number;
  characters?: Array<{
    id: string;
    name: string;
    class: string;
  }>;
}

const BADGE_CONTAINER_WIDTH = 250; // Reduced from 350px to 250px

// ฟังก์ชันช่วยคำนวณยอดบริจาคเฉพาะเดือนปัจจุบัน
function getCurrentMonthDonations(donates: Donate[], members: Record<string, any>) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const donationsByUser: Record<string, { userId: string, discordName: string, amount: number }> = {};
  Object.entries(members).forEach(([userId, member]: [string, any]) => {
    donationsByUser[userId] = {
      userId,
      discordName: member.discordName || 'ไม่ทราบ',
      amount: 0
    };
  });
  donates.forEach(donate => {
    if (donate.status === 'active') {
      const d = new Date(donate.createdAt);
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        if (donationsByUser[donate.userId]) {
          donationsByUser[donate.userId].amount += donate.amount;
        }
      }
    }
  });
  return Object.values(donationsByUser)
    .filter(u => u.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);
}

// ฟังก์ชันคำนวณยอดรวมเดือนนี้ เดือนที่แล้ว และทุกเดือน
function getDonationSums(donates: Donate[]) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
  let sumThisMonth = 0;
  let sumLastMonth = 0;
  let sumAll = 0;
  donates.forEach(donate => {
    if (donate.status === 'active') {
      const d = new Date(donate.createdAt);
      if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
        sumThisMonth += donate.amount;
      }
      if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
        sumLastMonth += donate.amount;
      }
      sumAll += donate.amount;
    }
  });
  return { sumThisMonth, sumLastMonth, sumAll };
}

// เพิ่มฟังก์ชันหายอดบริจาคของเดือนล่าสุดของแต่ละคน
function getLatestMonthDonationAmount(donates: Donate[], userId: string): number {
  // หาเดือนล่าสุดที่ userId มีการบริจาค
  const userDonates = donates.filter(d => d.userId === userId && d.status === 'active');
  if (userDonates.length === 0) return 0;
  // หาเดือน/ปีล่าสุด
  const months = userDonates.map(d => {
    const date = new Date(d.createdAt);
    return { month: date.getMonth(), year: date.getFullYear() };
  });
  const latest = months.reduce((acc, cur) => {
    if (!acc) return cur;
    if (cur.year > acc.year) return cur;
    if (cur.year === acc.year && cur.month > acc.month) return cur;
    return acc;
  }, null as null | { month: number, year: number });
  if (!latest) return 0;
  // รวมยอดบริจาคของเดือน/ปีนั้น
  return userDonates.filter(d => {
    const date = new Date(d.createdAt);
    return date.getMonth() === latest.month && date.getFullYear() === latest.year;
  }).reduce((sum, d) => sum + d.amount, 0);
}

// Group donations by month/year
function getMonthlySummary(donates: Donate[], members: Record<string, any>) {
  const summary: Record<string, { year: number, month: number, donations: { userId: string, discordName: string, amount: number }[] }> = {};
  // Collect all months/years
  donates.forEach(donate => {
    if (donate.status !== 'active') return;
    const d = new Date(donate.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!summary[key]) {
      summary[key] = {
        year: d.getFullYear(),
        month: d.getMonth(),
        donations: []
      };
    }
    let user = summary[key].donations.find(u => u.userId === donate.userId);
    if (!user) {
      user = {
        userId: donate.userId,
        discordName: members[donate.userId]?.discordName || 'ไม่ทราบ',
        amount: 0
      };
      summary[key].donations.push(user);
    }
    user.amount += donate.amount;
  });
  // Sort months descending
  const sorted = Object.values(summary).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
  // Sort donations in each month
  sorted.forEach(month => {
    month.donations.sort((a, b) => b.amount - a.amount);
  });
  return sorted;
}

export default function GuildDonateHistoryPage() {
  const { user } = useAuth();
  const { isGuildLeader } = useGuild();
  const router = useRouter();
  const [donates, setDonates] = useState<Donate[]>([]);
  const [members, setMembers] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [memberDonations, setMemberDonations] = useState<MemberDonation[]>([]);
  const [sortBy, setSortBy] = useState<'lastDonation' | 'totalDonations' | 'donationCount' | 'lastDonationAmount'>('lastDonation');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const [allCharactersByUserId, setAllCharactersByUserId] = useState<Record<string, any[]>>({});
  const [openPopoverUser, setOpenPopoverUser] = useState<string | null>(null);
  const [firstLineCount, setFirstLineCount] = useState<Record<string, number>>({});
  const badgeRefs = useRef<Record<string, (HTMLSpanElement | null)[]>>({});
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [showCount, setShowCount] = useState<Record<string, number>>({});
  const plusNRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const [hoveredPodiumIdx, setHoveredPodiumIdx] = useState<number | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Load guild members
    const membersRef = ref(db, 'guild/members');
    const unsubMembers = onValue(membersRef, (snapshot) => {
      if (snapshot.exists()) {
        setMembers(snapshot.val());
      }
    });

    // Load donations
    const donatesRef = ref(db, 'guilddonate');
    const unsubDonates = onValue(donatesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const donatesList = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value
        }));
        setDonates(donatesList);
      }
    });

    return () => {
      unsubMembers();
      unsubDonates();
    };
  }, [user, router]);

  useEffect(() => {
    // Process donations data
    const donationsByMember: Record<string, MemberDonation> = {};

    // Initialize with all members
    Object.entries(members).forEach(([userId, member]: [string, any]) => {
      donationsByMember[userId] = {
        userId,
        discordName: member.discordName || 'ไม่ทราบ',
        lastDonation: null,
        lastDonationAmount: null,
        totalDonations: 0,
        donationCount: 0
      };
    });

    // Process donations
    donates.forEach(donate => {
      if (donate.status === 'active') {
        const member = donationsByMember[donate.userId];
        if (member) {
          member.totalDonations += donate.amount;
          member.donationCount += 1;
          if (!member.lastDonation || donate.createdAt >= member.lastDonation) {
            member.lastDonation = donate.createdAt;
            member.lastDonationAmount = donate.amount;
            member.characters = donate.characters;
          }
        }
      }
    });

    // แยกการเรียงลำดับข้อมูล
    const sortedDonations = Object.values(donationsByMember).sort((a, b) => {
      if (sortBy === 'lastDonation') {
        const aDate = a.lastDonation || 0;
        const bDate = b.lastDonation || 0;
        return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
      } else if (sortBy === 'totalDonations') {
        return sortOrder === 'desc' ? b.totalDonations - a.totalDonations : a.totalDonations - b.totalDonations;
      } else if (sortBy === 'lastDonationAmount') {
        const aAmt = a.lastDonationAmount || 0;
        const bAmt = b.lastDonationAmount || 0;
        return sortOrder === 'desc' ? bAmt - aAmt : aAmt - bAmt;
      } else {
        return sortOrder === 'desc' ? b.donationCount - a.donationCount : a.donationCount - b.donationCount;
      }
    });

    setMemberDonations(sortedDonations);
  }, [donates, members, sortBy, sortOrder]);

  useEffect(() => {
    const fetchAllCharacters = async () => {
      const result: Record<string, any[]> = {};
      await Promise.all(Object.keys(members).map(async (userId) => {
        const charsRef = ref(db, `users/${userId}/characters`);
        const snap = await get(charsRef);
        if (snap.exists()) {
          // filter เฉพาะ object ที่มี name และ class (ไม่ใช่ checklist/stats)
          result[userId] = Object.values(snap.val()).filter(
            (c: any) => typeof c === 'object' && c.name && c.class
          );
        } else {
          result[userId] = [];
        }
      }));
      setAllCharactersByUserId(result);
    };
    if (Object.keys(members).length > 0) fetchAllCharacters();
  }, [members]);

  useLayoutEffect(() => {
    Object.entries(allCharactersByUserId).forEach(([userId, chars]) => {
      if (!containerRefs.current[userId] || !badgeRefs.current[userId]) return;
      let total = 0;
      let count = 0;
      const plusNWidth = 40; // เผื่อความกว้าง +N
      for (let i = 0; i < chars.length; i++) {
        const el = badgeRefs.current[userId][i];
        if (!el) continue;
        const badgeWidth = el.getBoundingClientRect().width + 4; // +gap
        // ถ้าเหลือ badge อีกและต้องมี +N ให้เผื่อที่
        const isLast = i === chars.length - 1;
        const reserve = !isLast ? plusNWidth : 0;
        if (total + badgeWidth + reserve > BADGE_CONTAINER_WIDTH) break;
        total += badgeWidth;
        count++;
      }
      setShowCount(prev => ({ ...prev, [userId]: count }));
    });
  }, [allCharactersByUserId, memberDonations, searchTerm, sortBy, sortOrder]);

  const filteredDonations = memberDonations.filter(member => {
    const search = searchTerm.toLowerCase();
    const matchesDiscord = member.discordName.toLowerCase().includes(search);
    const charList = allCharactersByUserId[member.userId] || [];
    const matchesCharacter = charList.some(char =>
      char.name.toLowerCase().includes(search)
    );
    return matchesDiscord || matchesCharacter;
  });

  const handleSort = (column: 'lastDonation' | 'totalDonations' | 'donationCount' | 'lastDonationAmount') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Top 3 ของเดือนนี้
  const top3 = getCurrentMonthDonations(donates, members);
  // Summary donation values
  const { sumThisMonth, sumLastMonth, sumAll } = getDonationSums(donates);
  // เตรียมข้อมูลบริจาคของ userId ที่เลือก
  const userDonations = selectedUserId
    ? donates.filter(d => d.userId === selectedUserId).map(d => ({
        ...d,
        type: 'gold' as const, // แก้ type ให้ตรงกับที่ modal ต้องการ
      }))
    : [];

  const monthlySummary = getMonthlySummary(donates, members);

  useEffect(() => {
    if (showMonthlySummary) {
      setExpandedMonths({});
    }
  }, [showMonthlySummary]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white/80 backdrop-blur-lg dark:bg-zinc-900/80 rounded-3xl shadow-2xl p-10 border border-pink-200 max-w-2xl mx-auto md:max-w-6xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-8 pb-6 border-b border-pink-100 relative dark:border-pink-800">
          {/* ไอคอน Crown */}
          <div className="p-2 sm:p-4 bg-gradient-to-br from-pink-200 via-pink-100 to-yellow-100 rounded-2xl shadow-lg flex-shrink-0 dark:bg-zinc-900 dark:from-none dark:via-none dark:to-none">
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-pink-600 drop-shadow dark:text-pink-300" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 tracking-tight dark:text-pink-100">📊 ประวัติการบริจาคของสมาชิก</h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1 font-medium dark:text-gray-300">ดูประวัติการบริจาคของสมาชิกทั้งหมดในกิลด์</p>
          </div>
          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <Link
              href="/guild-donate/cash"
              className="flex items-center justify-center gap-2 px-4 py-2 sm:px-5 sm:py-2 bg-green-100 text-green-700 rounded-xl font-semibold hover:bg-green-200 hover:text-green-900 transition-colors shadow-md border border-green-200 text-base drop-shadow-md w-full sm:w-auto dark:bg-zinc-800 dark:text-green-200 dark:border-green-700 dark:hover:bg-zinc-700 dark:hover:text-green-100"
            >
              <CreditCard className="w-5 h-5 text-yellow-500 dark:text-green-300" />
              <span>ประวัติบริจาคเงินสด</span>
            </Link>
            {/* ปุ่มบริจาคกิลด์: Desktop */}
            <Link
              href="/guild-donate"
              className="hidden sm:flex items-center gap-2 px-5 py-2 bg-pink-200 text-pink-800 text-base font-bold rounded-full shadow-lg border-2 border-pink-300 hover:bg-pink-300 hover:text-white hover:shadow-xl transition-all duration-150 dark:bg-zinc-800 dark:text-pink-200 dark:border-pink-700 dark:hover:bg-zinc-700 dark:hover:text-white"
              style={{ minWidth: 'fit-content' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-pink-500 dark:text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              บริจาคกิลด์
            </Link>
          </div>
        </div>
        {/* หลัง header (ก่อน Top 3 Ranking หรือเนื้อหาอื่น) */}
        <Link
          href="/guild-donate"
          className="block sm:hidden w-full mb-2 px-0 py-2 bg-pink-200 text-pink-800 text-base font-bold rounded-2xl shadow-md border border-pink-200 text-center hover:bg-pink-300 hover:text-white hover:shadow transition-all duration-150 dark:bg-zinc-800 dark:text-pink-200 dark:border-pink-700 dark:hover:bg-zinc-700 dark:hover:text-white"
        >
          <span className="inline-flex items-center gap-2 justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-pink-500 dark:text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            บริจาคกิลด์
          </span>
        </Link>
        {/* Top 3 Ranking */}
        <div className="mb-6 flex flex-col items-center">
          {/* Light mode */}
          <div className="block dark:hidden flex items-center justify-center gap-3 mb-4 px-4 py-3 rounded-2xl shadow-sm border border-pink-100 bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50">
            <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-400 drop-shadow" />
            <span className="font-extrabold text-transparent text-base md:text-xl lg:text-2xl bg-clip-text bg-gradient-to-r from-pink-600 via-yellow-600 to-pink-500 tracking-wide drop-shadow-sm text-center flex items-center gap-2">
              <span>
                อันดับ 1-3
                <br className="block md:hidden" />
                {' '}ยอดบริจาคประจำเดือนนี้
              </span>
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-400 drop-shadow inline-block ml-2" />
            </span>
          </div>
          {/* Dark mode */}
          <div className="hidden dark:flex items-center justify-center gap-3 mb-4 px-4 py-3 rounded-2xl shadow-sm border border-zinc-700 bg-zinc-800">
            <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-200 drop-shadow" />
            <span className="font-extrabold text-transparent text-base md:text-xl lg:text-2xl bg-clip-text bg-gradient-to-r from-yellow-200 via-pink-200 to-yellow-100 tracking-wide drop-shadow-sm text-center flex items-center gap-2">
              <span>
                อันดับ 1-3
                <br className="block md:hidden" />
                {' '}ยอดบริจาคประจำเดือนนี้
              </span>
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-200 drop-shadow inline-block ml-2" />
            </span>
          </div>
          {/* Desktop podium (แนวนอน) - Pastel Modern Design + Effect + Tooltip */}
          <div className="hidden md:flex flex-row gap-6 justify-center items-end w-full max-w-2xl relative">
            {/* อันดับ 2 */}
            {top3[1] && (
              <div
                className="flex flex-col items-center relative z-20 group w-40"
                onMouseEnter={() => setHoveredPodiumIdx(1)}
                onMouseLeave={() => setHoveredPodiumIdx(null)}
              >
                {/* Platform */}
                <div className="w-full h-20 bg-blue-50 rounded-t-2xl border-2 border-blue-100 flex flex-col items-center justify-end relative transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-blue-200">
                  {/* Medal */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-200 group-hover:scale-110 group-hover:drop-shadow-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-200 transition-all duration-200 group-hover:ring-2 group-hover:ring-blue-200">
                      <Award className="w-6 h-6 text-blue-300" />
                    </div>
                  </div>
                  {/* Name & Amount */}
                  <div className="flex flex-col items-center justify-end pb-2 pt-8 w-full">
                    <span className="font-bold text-blue-400 truncate max-w-[120px] text-sm text-center cursor-pointer hover:text-blue-500 transition-colors mb-1">
                      {top3[1].discordName}
                    </span>
                    <span className="text-green-400 font-extrabold text-lg">
                      {top3[1].amount.toLocaleString()}G
                    </span>
                  </div>
                </div>
                {/* Tooltip */}
                {hoveredPodiumIdx === 1 && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-white/95 backdrop-blur-md border border-blue-100 rounded-xl px-4 py-3 min-w-fit max-w-xs animate-fade-in z-[9999] text-xs text-center shadow-lg transition-all duration-200 opacity-100">
                    <div className="font-bold text-blue-400 mb-3 text-center text-sm">ตัวละครทั้งหมด</div>
                    {allCharactersByUserId[top3[1].userId]?.length ? (
                      <div className="flex flex-col gap-2">
                        {allCharactersByUserId[top3[1].userId].map((char, i) => {
                          const role = CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass] || 'Warrior';
                          const color = getClassColors(role);
                          return (
                            <div key={char.id || i} className="flex items-center gap-2 whitespace-nowrap">
                              <span className={`font-semibold ${color.text} text-sm`}>{char.name}</span>
                              <span className={`text-xs px-2 py-1 rounded-full border ${color.text} ${color.border} bg-white/80 backdrop-blur-sm`}>{char.class}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center text-sm">ไม่มีข้อมูลตัวละคร</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* อันดับ 1 */}
            {top3[0] && (
              <div
                className="flex flex-col items-center relative z-30 group w-48"
                onMouseEnter={() => setHoveredPodiumIdx(0)}
                onMouseLeave={() => setHoveredPodiumIdx(null)}
              >
                {/* Platform */}
                <div className="w-full h-28 bg-yellow-50 rounded-t-3xl border-2 border-yellow-100 flex flex-col items-center justify-end relative transition-all duration-200 group-hover:scale-110 group-hover:shadow-2xl group-hover:ring-2 group-hover:ring-yellow-200">
                  {/* Medal */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-200 group-hover:scale-115 group-hover:drop-shadow-xl">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center border-2 border-yellow-200 transition-all duration-200 group-hover:ring-2 group-hover:ring-yellow-200 relative">
                      <Award className="w-8 h-8 text-yellow-300 drop-shadow-lg animate-pulse" />
                      {/* Sparkle effects for 1st place */}
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full animate-ping opacity-75"></div>
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-75" style={{animationDelay: '0.5s'}}></div>
                      <div className="absolute top-1 -left-1 w-2.5 h-2.5 bg-yellow-200 rounded-full animate-ping opacity-75" style={{animationDelay: '1s'}}></div>
                    </div>
                  </div>
                  {/* Name & Amount */}
                  <div className="flex flex-col items-center justify-end pb-3 pt-12 w-full">
                    <span className="font-bold text-yellow-400 truncate max-w-[140px] text-base text-center cursor-pointer hover:text-yellow-500 transition-colors mb-2">
                      {top3[0].discordName}
                    </span>
                    <span className="text-green-400 font-extrabold text-2xl">
                      {top3[0].amount.toLocaleString()}G
                    </span>
                  </div>
                </div>
                {/* Tooltip */}
                {hoveredPodiumIdx === 0 && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-white/95 backdrop-blur-md border border-yellow-100 rounded-xl px-4 py-3 min-w-fit max-w-xs animate-fade-in z-[9999] text-xs text-center shadow-xl transition-all duration-200 opacity-100">
                    <div className="font-bold text-yellow-400 mb-3 text-center text-sm">ตัวละครทั้งหมด</div>
                    {allCharactersByUserId[top3[0].userId]?.length ? (
                      <div className="flex flex-col gap-2">
                        {allCharactersByUserId[top3[0].userId].map((char, i) => {
                          const role = CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass] || 'Warrior';
                          const color = getClassColors(role);
                          return (
                            <div key={char.id || i} className="flex items-center gap-2 whitespace-nowrap">
                              <span className={`font-semibold ${color.text} text-sm`}>{char.name}</span>
                              <span className={`text-xs px-2 py-1 rounded-full border ${color.text} ${color.border} bg-white/80 backdrop-blur-sm`}>{char.class}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center text-sm">ไม่มีข้อมูลตัวละคร</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* อันดับ 3 */}
            {top3[2] && (
              <div
                className="flex flex-col items-center relative z-20 group w-40"
                onMouseEnter={() => setHoveredPodiumIdx(2)}
                onMouseLeave={() => setHoveredPodiumIdx(null)}
              >
                {/* Platform */}
                <div className="w-full h-20 bg-pink-50 rounded-t-2xl border-2 border-pink-100 flex flex-col items-center justify-end relative transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg group-hover:ring-2 group-hover:ring-pink-100">
                  {/* Medal */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-200 group-hover:scale-110 group-hover:drop-shadow-lg">
                    <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center border-2 border-pink-200 transition-all duration-200 group-hover:ring-2 group-hover:ring-pink-200">
                      <Award className="w-6 h-6 text-pink-300" />
                    </div>
                  </div>
                  {/* Name & Amount */}
                  <div className="flex flex-col items-center justify-end pb-2 pt-8 w-full">
                    <span className="font-bold text-pink-400 truncate max-w-[120px] text-sm text-center cursor-pointer hover:text-pink-500 transition-colors mb-1">
                      {top3[2].discordName}
                    </span>
                    <span className="text-green-400 font-extrabold text-lg">
                      {top3[2].amount.toLocaleString()}G
                    </span>
                  </div>
                </div>
                {/* Tooltip */}
                {hoveredPodiumIdx === 2 && (
                  <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-white/95 backdrop-blur-md border border-pink-100 rounded-xl px-4 py-3 min-w-fit max-w-xs animate-fade-in z-[9999] text-xs text-center shadow-lg transition-all duration-200 opacity-100">
                    <div className="font-bold text-pink-400 mb-3 text-center text-sm">ตัวละครทั้งหมด</div>
                    {allCharactersByUserId[top3[2].userId]?.length ? (
                      <div className="flex flex-col gap-2">
                        {allCharactersByUserId[top3[2].userId].map((char, i) => {
                          const role = CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass] || 'Warrior';
                          const color = getClassColors(role);
                          return (
                            <div key={char.id || i} className="flex items-center gap-2 whitespace-nowrap">
                              <span className={`font-semibold ${color.text} text-sm`}>{char.name}</span>
                              <span className={`text-xs px-2 py-1 rounded-full border ${color.text} ${color.border} bg-white/80 backdrop-blur-sm`}>{char.class}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center text-sm">ไม่มีข้อมูลตัวละคร</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {top3.length === 0 && (
              <span className="text-gray-400">ยังไม่มีข้อมูลบริจาคในเดือนนี้</span>
            )}
          </div>
          {/* Mobile podium (แนวตั้ง) */}
          <div className="flex flex-col gap-2 w-full max-w-xs md:hidden">
            {[0,1,2].map(idx => (
              top3[idx] && (
                <div
                  key={idx}
                  className={`${isDarkMode ? 'relative flex items-center gap-3 rounded-xl border-2 shadow-md px-3 py-3 bg-zinc-800 dark:border-zinc-700' : 'relative flex items-center gap-3 rounded-xl border-2 shadow-md px-3 py-3'}`}
                  style={isDarkMode ? { backgroundColor: '#18181b' } : undefined}
                  onMouseEnter={() => setHoveredPodiumIdx(idx)}
                  onMouseLeave={() => setHoveredPodiumIdx(null)}
                  onTouchStart={() => setHoveredPodiumIdx(idx)}
                  onTouchEnd={() => setTimeout(()=>setHoveredPodiumIdx(null), 300)}
                >
                  <div className="flex flex-col items-center justify-center min-w-[40px]">
                    <Award className={`${idx===0 ? 'text-yellow-400 dark:text-yellow-300' : idx===1 ? 'text-gray-400 dark:text-gray-200' : 'text-orange-400 dark:text-orange-200'} w-7 h-7 mb-1`} />
                    <span className={`absolute -top-3 left-2 px-2 py-0.5 rounded-full text-xs font-bold shadow ${
                      idx===0
                        ? 'bg-yellow-300 text-yellow-900 border-2 border-yellow-400 dark:bg-yellow-800 dark:text-yellow-100 dark:border-yellow-500'
                        : idx===1
                          ? 'bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-gray-100'
                          : 'bg-orange-200 text-orange-700 dark:bg-orange-700 dark:text-orange-100 dark:border-orange-500'
                    }`}>
                      {idx+1}
                    </span>
                  </div>
                  <div className={`font-bold truncate text-base ${idx===0 ? 'text-yellow-700 dark:text-yellow-200' : idx===1 ? 'text-gray-500 dark:text-gray-200' : 'text-orange-500 dark:text-orange-200'}`}>
                    {top3[idx].discordName}
                  </div>
                  <div className="text-green-700 font-extrabold text-lg dark:text-green-300">
                    {top3[idx].amount.toLocaleString()}G
                  </div>
                  {/* Tooltip (tap/hover) */}
                  {hoveredPodiumIdx === idx && (
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-white border border-pink-200 rounded-xl shadow-lg px-3 py-2 min-w-fit max-w-xs inline-block animate-fade-in z-[9999] text-xs text-center dark:bg-zinc-900 dark:border-gray-400 dark:text-gray-200">
                      <div className="font-bold text-pink-600 mb-2 text-center text-sm">ตัวละครทั้งหมด</div>
                      {allCharactersByUserId[top3[idx].userId]?.length ? (
                        <div className="flex flex-col gap-1">
                          {allCharactersByUserId[top3[idx].userId].map((char, i) => {
                            const role = CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass] || 'Warrior';
                            const color = getClassColors(role);
                            return (
                              <div key={char.id} className="flex items-center gap-2 group">
                                <span className={`font-semibold ${color.text} text-sm group-hover:scale-105 transition-transform select-text`}>{char.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${color.text} ${color.border} bg-white/80 backdrop-blur-sm group-hover:bg-white transition-colors select-text dark:bg-zinc-800/80 dark:group-hover:bg-zinc-700`}>{char.class}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center text-xs dark:text-gray-500">ไม่มีข้อมูลตัวละคร</div>
                      )}
                    </div>
                  )}
                </div>
              )
            ))}
            {top3.length === 0 && (
              <span className="text-gray-400 text-center dark:text-gray-500">ยังไม่มีข้อมูลบริจาคในเดือนนี้</span>
            )}
          </div>
        </div>
        {/* Responsive search bar and summary boxes (mobile & desktop) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 mb-4 w-full">
          <div className="relative flex-1 min-w-0 md:pr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ Discord หรือชื่อตัวละคร..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-pink-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-pink-50 text-gray-700 placeholder:text-pink-300 transition md:w-full md:max-w-none dark:bg-zinc-800 dark:border-pink-500 dark:text-gray-200 dark:placeholder:text-pink-300 dark:focus:ring-pink-500 dark:focus:border-pink-500"
            />
          </div>
          <div className="flex flex-col md:flex-row gap-2 mt-2 md:mt-0 w-full md:w-auto">
            <div className="bg-white/80 border border-pink-200 rounded-lg px-4 py-2 flex flex-col items-center shadow-sm min-w-[110px] dark:bg-zinc-900 dark:border-pink-800">
              <span className="text-xs text-gray-500 flex items-center gap-1 dark:text-pink-400"><svg className="w-4 h-4 text-pink-400 inline-block dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 4h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" /></svg>เดือนนี้</span>
              <span className="font-bold text-pink-600 text-lg dark:text-pink-400">{sumThisMonth.toLocaleString()}G</span>
            </div>
            <div className="bg-white/80 border border-pink-200 rounded-lg px-4 py-2 flex flex-col items-center shadow-sm min-w-[110px] dark:bg-zinc-900 dark:border-pink-800">
              <span className="text-xs text-gray-500 flex items-center gap-1 dark:text-yellow-300"><svg className="w-4 h-4 text-yellow-400 inline-block dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 4h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" /></svg>เดือนที่แล้ว</span>
              <span className="font-bold text-yellow-600 text-lg dark:text-yellow-300">{sumLastMonth.toLocaleString()}G</span>
            </div>
            <button
              type="button"
              className="bg-white/80 border border-pink-200 rounded-lg px-4 py-2 flex flex-row items-center shadow-sm min-w-[120px] max-w-full focus:outline-none focus:ring-2 focus:ring-pink-300 hover:bg-pink-50 transition relative cursor-pointer gap-2 dark:bg-zinc-900 dark:border-pink-800 dark:hover:bg-zinc-800 dark:focus:ring-pink-700"
              onClick={() => setShowMonthlySummary(true)}
              aria-label="ดูสรุปยอดรวมรายเดือน"
            >
              <span className="text-xs text-gray-500 flex items-center gap-1 dark:text-green-300"><Coins className="w-4 h-4 text-green-400 inline-block dark:text-green-300" />รวมทั้งหมด</span>
              <span className="font-bold text-green-600 text-2xl dark:text-green-300">{sumAll.toLocaleString()}G</span>
              <ChevronRight className="w-5 h-5 text-pink-400 ml-2 dark:text-pink-400" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-pink-50 via-yellow-50 to-pink-100 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 dark:border-b-2 dark:border-pink-800">
                <th 
                  className="px-3 py-3 text-center text-sm font-bold text-pink-700 cursor-pointer hover:bg-pink-100 w-16 dark:text-pink-400 dark:hover:bg-zinc-800"
                  onClick={() => handleSort('donationCount')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-4 h-4" />
                    ครั้ง
                    {sortBy === 'donationCount' && (
                      <span className="text-pink-500 dark:text-pink-400">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-sm font-bold text-pink-700 w-64 dark:text-pink-400">รายชื่อสมาชิก</th>
                <th 
                  className="px-3 py-3 text-center text-sm font-bold text-pink-700 cursor-pointer hover:bg-pink-100 w-36 whitespace-nowrap dark:text-pink-400 dark:hover:bg-zinc-800"
                  onClick={() => handleSort('lastDonation')}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Calendar className="w-4 h-4" />
                    บริจาคล่าสุด
                    {sortBy === 'lastDonation' && (
                      <span className="text-pink-500 dark:text-pink-400">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-center text-sm font-bold text-pink-700 cursor-pointer hover:bg-pink-100 w-32 whitespace-nowrap dark:text-pink-400 dark:hover:bg-zinc-800"
                  onClick={() => handleSort('lastDonationAmount')}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Coins className="w-4 h-4" />
                    ยอดเดือนล่าสุด
                    {sortBy === 'lastDonationAmount' && (
                      <span className="text-pink-500 dark:text-pink-400">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left text-sm font-bold text-pink-700 cursor-pointer hover:bg-pink-100 w-32 whitespace-nowrap dark:text-pink-400 dark:hover:bg-zinc-800"
                  onClick={() => handleSort('totalDonations')}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Coins className="w-4 h-4" />
                    ยอดรวม
                    {sortBy === 'totalDonations' && (
                      <span className="text-pink-500 dark:text-pink-400">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-100 dark:divide-zinc-700">
              {filteredDonations.map((member) => (
                <tr key={member.userId} className="hover:bg-pink-50/50 dark:hover:bg-zinc-700/50">
                  <td className="px-3 py-3 text-center">
                    <button
                      className={cn(
                        "font-medium text-blue-600 cursor-pointer focus:outline-none",
                        member.donationCount > 0 ? "hover:text-pink-600" : "text-gray-400 cursor-default hover:text-gray-400"
                      )}
                      disabled={member.donationCount === 0}
                      onClick={() => {
                        setSelectedUserId(member.userId);
                        setShowHistoryModal(true);
                      }}
                    >
                      {member.donationCount}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 flex-nowrap min-w-0">
                      <span 
                        className="font-medium text-gray-700 flex-shrink min-w-0 w-full truncate dark:text-gray-200" 
                        title={member.discordName}
                      >
                        {member.discordName}
                        {(() => {
                          const chars = allCharactersByUserId[member.userId] || [];
                          return chars.length > 0 && (
                            <span
                              ref={el => { plusNRefs.current[member.userId] = el; }}
                              className="ml-2 px-1.5 py-0.5 bg-white/80 backdrop-blur-sm text-pink-600 rounded-full text-xs border border-pink-200 cursor-pointer select-none inline-block align-middle dark:bg-zinc-800/80 dark:text-pink-200 dark:border-zinc-600"
                              onMouseEnter={() => setOpenPopoverUser(member.userId)}
                              onMouseLeave={(e) => {
                                const tooltip = document.querySelector(`[data-tooltip-for=\"${member.userId}\"]`);
                                if (!tooltip?.contains(e.relatedTarget as Node)) {
                                  setOpenPopoverUser(null);
                                }
                              }}
                            >
                              +{chars.length}
                            </span>
                          );
                        })()}
                      </span>
                      {(() => {
                        const chars = allCharactersByUserId[member.userId] || [];
                        return openPopoverUser === member.userId && chars.length > 0 && typeof window !== 'undefined' && createPortal(
                          <div 
                            data-tooltip-for={member.userId}
                            style={{ 
                              position: 'fixed',
                              zIndex: 9999,
                              maxHeight: 220,
                              overflowY: 'auto',
                              top: (plusNRefs.current[member.userId]?.getBoundingClientRect().bottom ?? 0) + window.scrollY - 4,
                              left: (plusNRefs.current[member.userId]?.getBoundingClientRect().left ?? 0)
                            }}
                            className="bg-white/95 backdrop-blur-sm border border-pink-200 rounded-lg shadow-lg p-3 min-w-[200px] max-w-xs animate-fade-in dark:bg-zinc-900/95 dark:border-zinc-600"
                            onMouseEnter={() => setOpenPopoverUser(member.userId)}
                            onMouseLeave={(e) => {
                              const plusButton = plusNRefs.current[member.userId];
                              const tooltip = document.querySelector(`[data-tooltip-for=\"${member.userId}\"]`);
                              const rect = tooltip?.getBoundingClientRect();
                              const mouseY = e.clientY;
                              if (rect && mouseY >= rect.top - 4 && mouseY <= rect.top + 4) {
                                return;
                              }
                              if (!plusButton?.contains(e.relatedTarget as Node)) {
                                setOpenPopoverUser(null);
                              }
                            }}
                          >
                            <div className="text-sm font-semibold text-pink-600 mb-2 border-b border-pink-100 pb-2 dark:text-pink-200 dark:border-zinc-700">ตัวละครทั้งหมด:</div>
                            <div className="space-y-1.5">
                              {chars.map(char => {
                                const role = CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass] || 'Warrior';
                                const color = getClassColors(role);
                                return (
                                  <div key={char.id} className="flex items-center gap-2 group">
                                    <span className={`font-semibold ${color.text} text-sm group-hover:scale-105 transition-transform select-text`}>{char.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${color.text} ${color.border} bg-white/80 backdrop-blur-sm group-hover:bg-white transition-colors select-text dark:bg-zinc-800/80 dark:group-hover:bg-zinc-700`}>{char.class}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>,
                          document.body
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-3 py-3 w-36 whitespace-nowrap text-center">
                    {member.lastDonation ? (
                      (() => {
                        const d = new Date(member.lastDonation as number);
                        const now = new Date();
                        const isCurrentMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                        const isLastMonth = (() => {
                          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
                          const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                          return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
                        })();
                        const dateStr = d.toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                        if (isCurrentMonth) {
                          return (
                            <span className="text-pink-500 bg-pink-50 border border-pink-200 rounded-full px-3 py-1 inline-block dark:bg-pink-800/40 dark:text-pink-300 dark:border-pink-600">
                              {dateStr}
                            </span>
                          );
                        }
                        if (isLastMonth) {
                          return <span className="text-yellow-600">{dateStr}</span>;
                        }
                        return <span className="text-gray-600">{dateStr}</span>;
                      })()
                    ) : (
                      <span className="text-gray-400">ยังไม่เคยบริจาค</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center w-32">
                    {(() => {
                      const amt = getLatestMonthDonationAmount(donates, member.userId);
                      return amt > 0 ? (
                        <span className="font-medium text-green-600">{amt.toLocaleString()}G</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-3 text-center w-32 whitespace-nowrap">
                    <span className={cn(
                      "font-medium",
                      member.totalDonations > 0 ? "text-green-600" : "text-gray-400"
                    )}>
                      {member.totalDonations.toLocaleString()}G
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List (Mobile only) */}
        <div className="block md:hidden space-y-2 px-1">
          {filteredDonations.map((member) => (
            <div
              key={member.userId}
              className="bg-white/90 border border-pink-100 rounded-lg shadow-sm p-2 flex flex-col gap-1 cursor-pointer active:bg-pink-50 transition dark:bg-zinc-800/90 dark:border-zinc-600 dark:active:bg-zinc-700"
              onClick={() => {
                setSelectedUserId(member.userId);
                setShowHistoryModal(true);
              }}
            >
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-pink-400 shrink-0 dark:text-pink-300" />
                <span className="font-bold text-gray-800 text-base truncate max-w-[120px] dark:text-gray-200">{member.discordName}</span>
                <span className="ml-auto text-xs text-gray-400 whitespace-nowrap dark:text-gray-500">{member.donationCount > 0 ? `${member.donationCount} ครั้ง` : 'ยังไม่เคยบริจาค'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mt-1">
                <div className="flex items-center gap-1 min-w-[90px]">
                  <Calendar className="w-4 h-4 text-pink-300 dark:text-pink-400" />
                  <span className="text-gray-600 truncate dark:text-gray-300">
                    {member.lastDonation ?
                      new Date(member.lastDonation as number).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' }) :
                      '-'}
                  </span>
                </div>
                <div className="flex items-center gap-1 min-w-[70px]">
                  <Coins className="w-4 h-4 text-green-400 dark:text-green-300" />
                  <span className="text-green-600 font-extrabold text-lg dark:text-green-300">
                    {(() => {
                      const amt = getLatestMonthDonationAmount(donates, member.userId);
                      return amt > 0 ? (
                        <span>{amt.toLocaleString()}G</span>
                      ) : (
                        <span>-</span>
                      );
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-1 min-w-[70px]">
                  <Coins className="w-4 h-4 text-yellow-400 dark:text-yellow-300" />
                  <span className="text-yellow-600 font-semibold dark:text-yellow-200">
                    {member.totalDonations > 0 ? `${member.totalDonations.toLocaleString()}G` : '-'}
                  </span>
                </div>
              </div>
              {allCharactersByUserId[member.userId]?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {allCharactersByUserId[member.userId].map(char => (
                    <span key={char.id} className="px-2 py-0.5 bg-pink-50 text-pink-500 rounded-full text-xs border border-pink-100 dark:bg-zinc-700 dark:text-pink-200 dark:border-zinc-600" /* mobile: show full name, no truncate */>
                      {char.name} <span className="text-gray-400 dark:text-gray-500">({char.class})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredDonations.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              ไม่พบข้อมูลที่ค้นหา
            </div>
          )}
        </div>
      </div>
      <DonationHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        donations={userDonations}
      />
      <Dialog open={showMonthlySummary} onOpenChange={setShowMonthlySummary}>
        <DialogContent className="z-50 overflow-visible max-w-2xl md:max-w-3xl w-[98vw] p-0 bg-white/95 backdrop-blur-xl dark:bg-zinc-900/95 dark:backdrop-blur-xl border-0 shadow-2xl rounded-3xl border border-pink-100/60 dark:border-purple-500/30">
          <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-pink-50/80 via-purple-50/60 to-blue-50/80 dark:from-zinc-800/90 dark:via-purple-800/80 dark:to-blue-800/80 backdrop-blur-lg px-4 pt-5 pb-3 border-b border-pink-100/60 dark:border-purple-500/30 rounded-t-3xl">
            <DialogTitle className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 dark:from-pink-300 dark:via-purple-300 dark:to-blue-300 flex items-center gap-3">
              <div className="p-2 md:p-3 rounded-2xl bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-800 dark:via-purple-800 dark:to-blue-800 shadow-lg">
                <Calendar className="w-7 h-7 md:w-8 md:h-8 text-pink-400" />
              </div>
              <div className="flex flex-col">
                <span>สรุปยอดบริจาคแต่ละเดือน</span>
                <span className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 mt-1">ดูประวัติการบริจาครายเดือนแบบละเอียด</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-y-auto px-2 md:px-6 py-4 md:py-6 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-lg rounded-b-3xl">
            {monthlySummary.length === 0 && (
              <div className="text-center py-10 md:py-12">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 dark:from-pink-800 dark:via-purple-800 dark:to-blue-800 rounded-full flex items-center justify-center shadow-lg">
                  <Coins className="w-7 h-7 md:w-9 md:h-9 text-yellow-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">ยังไม่มีข้อมูลบริจาค</h3>
                <p className="text-gray-500 dark:text-gray-400 text-xs md:text-base">เริ่มต้นการบริจาคเพื่อดูสถิติที่นี่</p>
              </div>
            )}
            {monthlySummary.map((month, monthIndex) => {
              const key = `${month.year}-${month.month}`;
              const isExpanded = expandedMonths[key] ?? false;
              const monthName = new Date(month.year, month.month).toLocaleString('th-TH', { year: 'numeric', month: 'long' });
              const monthSum = month.donations.reduce((sum, d) => sum + d.amount, 0);
              // สีพื้นหลังกล่องเดือน: ใช้สีชมพูพาสเทลอ่อนทั้งโหมดปกติและ dark mode
              return (
                <div key={key} className="mb-4 md:mb-6 group">
                  <div className={
                    `relative overflow-hidden rounded-2xl bg-pink-50 dark:bg-pink-900/80 border border-pink-100/40 dark:border-pink-800/20 shadow-md hover:shadow-lg transition-all duration-300 group-hover:scale-[1.01]`
                  }>
                    {/* overlay ใหม่: อยู่เฉพาะด้านใน ไม่ทับ border */}
                    <div className="absolute inset-px bg-pink-50 dark:bg-pink-900/80 pointer-events-none rounded-[inherit]" />
                    <button
                      type="button"
                      className="relative w-full flex flex-col md:flex-row items-stretch md:items-center px-2 md:px-6 py-4 md:py-5 focus:outline-none rounded-2xl gap-2 md:gap-0 z-10"
                      onClick={() => setExpandedMonths(prev => ({ ...prev, [key]: !isExpanded }))}
                      tabIndex={0}
                    >
                      <div className="flex items-center justify-center md:justify-start gap-0 md:gap-4 flex-shrink-0">
                        <div className="p-2 md:p-3 rounded-xl bg-white/80 shadow">
                          <Calendar className="w-6 h-6 md:w-7 md:h-7 text-pink-400" />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center md:ml-4">
                        <h3 className="font-bold text-base md:text-lg text-gray-800 dark:text-gray-100 mb-0.5 md:mb-1">{monthName}</h3>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-300">ผู้บริจาค {month.donations.length} คน</p>
                      </div>
                      {/* กล่องยอดรวม G: ไอคอนเหลืองสดใส ตัวเลขเขียว พื้นหลังขาวโปร่งบาง/blur */}
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-green-100 dark:border-green-800 shadow ring-1 ring-green-100 dark:ring-green-900 hover:ring-2 hover:ring-green-200 dark:hover:ring-green-400 transition-all duration-200 mt-2 md:mt-0">
                        <Coins className="w-5 h-5 text-yellow-400 drop-shadow-sm" />
                        <span className="text-base md:text-lg font-bold text-green-600 dark:text-green-300 tracking-wide">{monthSum.toLocaleString()}G</span>
                      </div>
                      <div className="ml-0 md:ml-2 flex items-center justify-center">
                        {isExpanded
                          ? <ChevronUp className="w-6 h-6 text-pink-400" />
                          : <ChevronDown className="w-6 h-6 text-pink-400" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-2 md:px-6 pb-4 md:pb-6 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg rounded-xl border border-pink-100/40 dark:border-pink-800/20 shadow-lg overflow-hidden">
                          {month.donations.length === 0 ? (
                            <div className="text-center py-8">
                              <div className="w-10 h-10 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                                <Coins className="w-6 h-6 text-yellow-400" />
                              </div>
                              <p className="text-gray-500 dark:text-gray-400 font-medium text-sm md:text-base">ไม่มีข้อมูลบริจาคในเดือนนี้</p>
                            </div>
                          ) : (
                            <div className="overflow-hidden">
                              <div className="bg-gradient-to-r from-pink-50 via-pink-100 to-white dark:from-pink-900/50 dark:via-pink-800/50 dark:to-zinc-900/50 px-2 md:px-4 py-2 md:py-3 border-b border-pink-100/40 dark:border-pink-800/20">
                                <h4 className="font-bold text-gray-700 dark:text-gray-200 text-xs md:text-sm">รายละเอียดการบริจาค</h4>
                              </div>
                              <div className="max-h-[40vh] md:max-h-[50vh] overflow-y-auto">
                                {month.donations.map((donor, idx) => {
                                  let medal = null;
                                  let color = '';
                                  let bgColor = '';
                                  if (idx === 0) {
                                    medal = <Award className="w-5 h-5 text-yellow-500 dark:text-yellow-300" />;
                                    color = 'text-yellow-700 dark:text-yellow-200 font-bold';
                                    bgColor = 'bg-yellow-50 dark:bg-yellow-900/30';
                                  } else if (idx === 1) {
                                    medal = <Award className="w-5 h-5 text-gray-500 dark:text-gray-300" />;
                                    color = 'text-gray-700 dark:text-gray-200 font-bold';
                                    bgColor = 'bg-gray-50 dark:bg-gray-900/30';
                                  } else if (idx === 2) {
                                    medal = <Award className="w-5 h-5 text-orange-500 dark:text-orange-300" />;
                                    color = 'text-orange-700 dark:text-orange-200 font-bold';
                                    bgColor = 'bg-orange-50 dark:bg-orange-900/30';
                                  } else {
                                    color = 'text-gray-600 dark:text-gray-300';
                                    bgColor = 'bg-white dark:bg-zinc-800/50';
                                  }
                                  return (
                                    <div key={donor.userId} className={`flex items-center justify-between px-2 md:px-4 py-2 md:py-3 border-b border-gray-100 dark:border-gray-700 last:border-0 ${bgColor} hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 text-xs md:text-base`}>
                                      <div className="flex items-center gap-2 md:gap-3">
                                        <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-pink-200 to-purple-200 dark:from-pink-800 dark:to-purple-800 text-xs md:text-sm font-bold text-gray-700 dark:text-gray-200">
                                          {idx + 1}
                                        </div>
                                        <div className="flex items-center gap-1 md:gap-2">
                                          {medal}
                                          <span className={`${color}`}>{donor.discordName}</span>
                                        </div>
                                      </div>
                                      <div className={`font-bold ${color} text-xs md:text-lg`}>
                                        {donor.amount.toLocaleString()}G
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 