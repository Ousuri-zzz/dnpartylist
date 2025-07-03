'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuild } from '@/hooks/useGuild';
import { useRouter } from 'next/navigation';
import { ref, onValue, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Crown, Search, Calendar, Users, Coins, CreditCard, Award, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { getClassColors, CLASS_TO_ROLE } from '@/config/theme';
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
  // ใช้ไอคอน Award จาก lucide-react เพื่อความชัวร์
  const medalIcons = [
    <Award key="gold" className="w-5 h-5 text-yellow-400" />, 
    <Award key="silver" className="w-5 h-5 text-gray-400" />, 
    <Award key="bronze" className="w-5 h-5 text-orange-400" />
  ];

  // เตรียมข้อมูลบริจาคของ userId ที่เลือก
  const userDonations = selectedUserId
    ? donates.filter(d => d.userId === selectedUserId).map(d => ({
        ...d,
        type: 'gold' as const, // แก้ type ให้ตรงกับที่ modal ต้องการ
      }))
    : [];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-pink-200 max-w-2xl mx-auto md:max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-pink-100 relative">
          <div className="p-3 bg-pink-100 rounded-xl">
            <Crown className="w-8 h-8 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📊 ประวัติการบริจาคของสมาชิก</h1>
            <p className="text-sm text-gray-500 mt-1">ดูประวัติการบริจาคของสมาชิกทั้งหมดในกิลด์</p>
          </div>
          {/* Navigation Buttons */}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/guild-donate/cash"
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
            >
              <CreditCard className="w-4 h-4" />
              <span>ประวัติบริจาคเงินสด</span>
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
        {/* Top 3 Ranking */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 mb-4 px-4 py-3 rounded-2xl bg-gradient-to-r from-yellow-50 via-pink-50 to-blue-50 shadow-sm border border-pink-100">
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
          {/* Desktop podium (แนวนอน) */}
          <div className="hidden md:flex flex-row gap-4 justify-center items-end w-full max-w-xl">
            {/* อันดับ 2 */}
            {top3[1] && (
              <div
                className="flex flex-col items-center bg-gradient-to-t from-gray-50 to-white border-2 border-gray-300 rounded-xl px-2 py-2 md:px-4 md:py-3 shadow-md min-w-[110px] md:min-w-[140px] relative z-10 hover:shadow-lg hover:scale-105 transition-all duration-300"
                style={{marginTop: '16px'}}
                onMouseEnter={() => setHoveredPodiumIdx(1)}
                onMouseLeave={() => setHoveredPodiumIdx(null)}
              >
                <Award className="w-6 h-6 md:w-7 md:h-7 text-gray-400 mb-1 animate-pulse" />
                <span className="font-semibold text-gray-500 truncate max-w-[90px] md:max-w-[120px] text-sm md:text-base mb-1 text-center cursor-pointer hover:text-gray-700 transition-colors">
                  {top3[1].discordName}
                </span>
                <span className="text-green-600 font-bold text-base md:text-lg">{top3[1].amount.toLocaleString()}G</span>
                <span className="absolute -top-4 md:-top-5 left-1/2 -translate-x-1/2 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold shadow-md border border-gray-300">2</span>
                {hoveredPodiumIdx === 1 && (
                  <div
                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-white border border-pink-200 rounded-xl shadow-lg px-3 py-2 min-w-fit max-w-xs inline-block animate-fade-in z-[9999] text-xs text-center">
                    <div className="font-bold text-pink-600 mb-2 text-center text-sm md:text-base">ตัวละครทั้งหมด</div>
                    {allCharactersByUserId[top3[1].userId]?.length ? (
                      <div className="flex flex-col gap-1">
                        {allCharactersByUserId[top3[1].userId].map((char, i) => {
                          const role = CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass] || 'Warrior';
                          const color = getClassColors(role);
                          return (
                            <div key={char.id || i} className="flex items-center gap-2 whitespace-nowrap">
                              <span className={`font-semibold ${color.text} text-xs md:text-base`}>{char.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${color.text} ${color.border} bg-white`}>{char.class}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center text-xs md:text-base">ไม่มีข้อมูลตัวละคร</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* อันดับ 1 */}
            {top3[0] && (
              <div
                className="flex flex-col items-center bg-gradient-to-t from-yellow-100 via-yellow-50 to-white border-2 border-yellow-300 rounded-2xl px-3 py-3 md:px-6 md:py-5 shadow-xl min-w-[120px] md:min-w-[170px] scale-110 relative z-20 hover:shadow-2xl hover:scale-115 transition-all duration-300"
                style={{marginTop: '0px'}}
                onMouseEnter={() => setHoveredPodiumIdx(0)}
                onMouseLeave={() => setHoveredPodiumIdx(null)}
              >
                <Award className="w-7 h-7 md:w-9 md:h-9 text-yellow-400 mb-1 drop-shadow animate-bounce" />
                <span className="font-bold text-yellow-700 truncate max-w-[100px] md:max-w-[140px] text-base md:text-lg mb-1 text-center cursor-pointer hover:text-yellow-800 transition-colors">
                  {top3[0].discordName}
                </span>
                <span className="text-green-700 font-extrabold text-lg md:text-2xl drop-shadow">{top3[0].amount.toLocaleString()}G</span>
                <span className="absolute -top-5 md:-top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-300 to-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-base font-extrabold shadow-lg border-2 border-yellow-400">1</span>
                {hoveredPodiumIdx === 0 && (
                  <div
                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-white border border-pink-200 rounded-xl shadow-lg px-3 py-2 min-w-fit max-w-xs inline-block animate-fade-in z-[9999] text-xs text-center">
                    <div className="font-bold text-pink-600 mb-2 text-center text-sm md:text-base">ตัวละครทั้งหมด</div>
                    {allCharactersByUserId[top3[0].userId]?.length ? (
                      <div className="flex flex-col gap-1">
                        {allCharactersByUserId[top3[0].userId].map((char, i) => {
                          const role = CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass] || 'Warrior';
                          const color = getClassColors(role);
                          return (
                            <div key={char.id || i} className="flex items-center gap-2 whitespace-nowrap">
                              <span className={`font-semibold ${color.text} text-xs md:text-base`}>{char.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${color.text} ${color.border} bg-white`}>{char.class}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center text-xs md:text-base">ไม่มีข้อมูลตัวละคร</div>
                    )}
                  </div>
                )}
              </div>
            )}
            {/* อันดับ 3 */}
            {top3[2] && (
              <div
                className="flex flex-col items-center bg-gradient-to-t from-orange-50 to-white border-2 border-orange-200 rounded-xl px-2 py-2 md:px-4 md:py-3 shadow-md min-w-[110px] md:min-w-[140px] relative z-10 hover:shadow-lg hover:scale-105 transition-all duration-300"
                style={{marginTop: '24px'}}
                onMouseEnter={() => setHoveredPodiumIdx(2)}
                onMouseLeave={() => setHoveredPodiumIdx(null)}
              >
                <Award className="w-6 h-6 md:w-7 md:h-7 text-orange-400 mb-1 animate-pulse" />
                <span className="font-semibold text-orange-500 truncate max-w-[90px] md:max-w-[120px] text-sm md:text-base mb-1 text-center cursor-pointer hover:text-orange-600 transition-colors">
                  {top3[2].discordName}
                </span>
                <span className="text-green-600 font-bold text-base md:text-lg">{top3[2].amount.toLocaleString()}G</span>
                <span className="absolute -top-4 md:-top-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-200 to-orange-300 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold shadow-md border border-orange-300">3</span>
                {hoveredPodiumIdx === 2 && (
                  <div
                    className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-white border border-pink-200 rounded-xl shadow-lg px-3 py-2 min-w-fit max-w-xs inline-block animate-fade-in z-[9999] text-xs text-center">
                    <div className="font-bold text-pink-600 mb-2 text-center text-sm md:text-base">ตัวละครทั้งหมด</div>
                    {allCharactersByUserId[top3[2].userId]?.length ? (
                      <div className="flex flex-col gap-1">
                        {allCharactersByUserId[top3[2].userId].map((char, i) => {
                          const role = CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass] || 'Warrior';
                          const color = getClassColors(role);
                          return (
                            <div key={char.id || i} className="flex items-center gap-2 whitespace-nowrap">
                              <span className={`font-semibold ${color.text} text-xs md:text-base`}>{char.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${color.text} ${color.border} bg-white`}>{char.class}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center text-xs md:text-base">ไม่มีข้อมูลตัวละคร</div>
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
                  className={`relative flex items-center gap-3 rounded-xl border-2 shadow-md px-3 py-3 ${idx===0 ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-white' : idx===1 ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-white' : 'border-orange-200 bg-gradient-to-r from-orange-50 to-white'}`}
                  onMouseEnter={() => setHoveredPodiumIdx(idx)}
                  onMouseLeave={() => setHoveredPodiumIdx(null)}
                  onTouchStart={() => setHoveredPodiumIdx(idx)}
                  onTouchEnd={() => setTimeout(()=>setHoveredPodiumIdx(null), 300)}
                >
                  <div className="flex flex-col items-center justify-center min-w-[40px]">
                    <Award className={`${idx===0 ? 'text-yellow-400' : idx===1 ? 'text-gray-400' : 'text-orange-400'} w-7 h-7 mb-1`} />
                    <span className={`absolute -top-3 left-2 px-2 py-0.5 rounded-full text-xs font-bold shadow ${idx===0 ? 'bg-yellow-300 text-yellow-900 border-2 border-yellow-400' : idx===1 ? 'bg-gray-200 text-gray-700' : 'bg-orange-200 text-orange-700'}`}>{idx+1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold truncate text-base ${idx===0 ? 'text-yellow-700' : idx===1 ? 'text-gray-500' : 'text-orange-500'}`}>{top3[idx].discordName}</div>
                    <div className="text-green-700 font-extrabold text-lg">{top3[idx].amount.toLocaleString()}G</div>
                  </div>
                  {/* Tooltip (tap/hover) */}
                  {hoveredPodiumIdx === idx && (
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full bg-white border border-pink-200 rounded-xl shadow-lg px-3 py-2 min-w-fit max-w-xs inline-block animate-fade-in z-[9999] text-xs text-center">
                      <div className="font-bold text-pink-600 mb-2 text-center text-sm">ตัวละครทั้งหมด</div>
                      {allCharactersByUserId[top3[idx].userId]?.length ? (
                        <div className="flex flex-col gap-1">
                          {allCharactersByUserId[top3[idx].userId].map((char, i) => {
                            const role = CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass] || 'Warrior';
                            const color = getClassColors(role);
                            return (
                              <div key={char.id || i} className="flex items-center gap-2 whitespace-nowrap">
                                <span className={`font-semibold ${color.text} text-xs md:text-base`}>{char.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${color.text} ${color.border} bg-white`}>{char.class}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-center text-xs">ไม่มีข้อมูลตัวละคร</div>
                      )}
                    </div>
                  )}
                </div>
              )
            ))}
            {top3.length === 0 && (
              <span className="text-gray-400 text-center">ยังไม่มีข้อมูลบริจาคในเดือนนี้</span>
            )}
          </div>
        </div>
        {/* Responsive search bar and summary boxes (mobile & desktop) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 mb-4 w-full">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 w-5 h-5" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ Discord หรือชื่อตัวละคร..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-pink-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 bg-pink-50 text-gray-700 placeholder:text-pink-300 transition"
            />
          </div>
          <div className="flex flex-col md:flex-row gap-2 mt-2 md:mt-0 w-full md:w-auto">
            <div className="bg-white/80 border border-pink-200 rounded-lg px-4 py-2 flex flex-col items-center shadow-sm min-w-[110px]">
              <span className="text-xs text-gray-500 flex items-center gap-1"><svg className="w-4 h-4 text-pink-400 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 4h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" /></svg>เดือนนี้</span>
              <span className="font-bold text-pink-600 text-lg">{sumThisMonth.toLocaleString()}G</span>
            </div>
            <div className="bg-white/80 border border-pink-200 rounded-lg px-4 py-2 flex flex-col items-center shadow-sm min-w-[110px]">
              <span className="text-xs text-gray-500 flex items-center gap-1"><svg className="w-4 h-4 text-yellow-400 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 4h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" /></svg>เดือนที่แล้ว</span>
              <span className="font-bold text-yellow-600 text-lg">{sumLastMonth.toLocaleString()}G</span>
            </div>
            <div className="bg-white/80 border border-pink-200 rounded-lg px-4 py-2 flex flex-col items-center shadow-sm min-w-[110px]">
              <span className="text-xs text-gray-500 flex items-center gap-1"><svg className="w-4 h-4 text-green-400 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>รวมทั้งหมด</span>
              <span className="font-bold text-green-600 text-lg">{sumAll.toLocaleString()}G</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-white/80 backdrop-blur-sm">
                <th 
                  className="px-3 py-3 text-center text-sm font-semibold text-gray-600 cursor-pointer hover:bg-pink-100 w-16"
                  onClick={() => handleSort('donationCount')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Users className="w-4 h-4" />
                    ครั้ง
                    {sortBy === 'donationCount' && (
                      <span className="text-pink-500">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 text-left text-sm font-semibold text-gray-600 w-64">รายชื่อสมาชิก</th>
                <th 
                  className="px-3 py-3 text-center text-sm font-semibold text-gray-600 cursor-pointer hover:bg-pink-100 w-36 whitespace-nowrap"
                  onClick={() => handleSort('lastDonation')}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Calendar className="w-4 h-4" />
                    บริจาคล่าสุด
                    {sortBy === 'lastDonation' && (
                      <span className="text-pink-500">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-center text-sm font-semibold text-gray-600 cursor-pointer hover:bg-pink-100 w-32 whitespace-nowrap"
                  onClick={() => handleSort('lastDonationAmount')}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Coins className="w-4 h-4" />
                    ยอดเดือนล่าสุด
                    {sortBy === 'lastDonationAmount' && (
                      <span className="text-pink-500">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-pink-100 w-32 whitespace-nowrap"
                  onClick={() => handleSort('totalDonations')}
                >
                  <div className="flex items-center gap-1 justify-center">
                    <Coins className="w-4 h-4" />
                    ยอดรวม
                    {sortBy === 'totalDonations' && (
                      <span className="text-pink-500">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-100">
              {filteredDonations.map((member) => (
                <tr key={member.userId} className="hover:bg-pink-50/50">
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
                        className="font-medium text-gray-700 flex-shrink min-w-0 w-full truncate" 
                        title={member.discordName}
                      >
                        {member.discordName}
                        {(() => {
                          const chars = allCharactersByUserId[member.userId] || [];
                          return chars.length > 0 && (
                            <span
                              ref={el => { plusNRefs.current[member.userId] = el; }}
                              className="ml-2 px-1.5 py-0.5 bg-white/80 backdrop-blur-sm text-pink-600 rounded-full text-xs border border-pink-200 cursor-pointer select-none inline-block align-middle"
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
                            className="bg-white/95 backdrop-blur-sm border border-pink-200 rounded-lg shadow-lg p-3 min-w-[200px] max-w-xs animate-fade-in"
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
                            <div className="text-sm font-semibold text-pink-600 mb-2 border-b border-pink-100 pb-2">ตัวละครทั้งหมด:</div>
                            <div className="space-y-1.5">
                              {chars.map(char => {
                                const role = CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass] || 'Warrior';
                                const color = getClassColors(role);
                                return (
                                  <div key={char.id} className="flex items-center gap-2 group">
                                    <span className={`font-semibold ${color.text} text-sm group-hover:scale-105 transition-transform select-text`}>{char.name}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full border ${color.text} ${color.border} bg-white/80 backdrop-blur-sm group-hover:bg-white transition-colors select-text`}>{char.class}</span>
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
                        const d = new Date(member.lastDonation);
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
                            <span className="text-pink-500 bg-pink-50 border border-pink-200 rounded-full px-3 py-1 inline-block">
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
              className="bg-white/90 border border-pink-100 rounded-lg shadow-sm p-2 flex flex-col gap-1 cursor-pointer active:bg-pink-50 transition"
              onClick={() => {
                setSelectedUserId(member.userId);
                setShowHistoryModal(true);
              }}
            >
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-pink-400 shrink-0" />
                <span className="font-bold text-gray-800 text-base truncate max-w-[120px]">{member.discordName}</span>
                <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">{member.donationCount > 0 ? `${member.donationCount} ครั้ง` : 'ยังไม่เคยบริจาค'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mt-1">
                <div className="flex items-center gap-1 min-w-[90px]">
                  <Calendar className="w-4 h-4 text-pink-300" />
                  <span className="text-gray-600 truncate">
                    {member.lastDonation ?
                      new Date(member.lastDonation).toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' }) :
                      '-'}
                  </span>
                </div>
                <div className="flex items-center gap-1 min-w-[70px]">
                  <Coins className="w-4 h-4 text-green-400" />
                  <span className="text-green-600 font-semibold">
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
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-600 font-semibold">
                    {member.totalDonations > 0 ? `${member.totalDonations.toLocaleString()}G` : '-'}
                  </span>
                </div>
              </div>
              {allCharactersByUserId[member.userId]?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {allCharactersByUserId[member.userId].map(char => (
                    <span key={char.id} className="px-2 py-0.5 bg-pink-50 text-pink-500 rounded-full text-xs border border-pink-100" /* mobile: show full name, no truncate */>
                      {char.name} <span className="text-gray-400">({char.class})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredDonations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
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
    </div>
  );
} 