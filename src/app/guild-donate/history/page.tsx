'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGuild } from '@/hooks/useGuild';
import { useRouter } from 'next/navigation';
import { ref, onValue, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Crown, Search, Calendar, Users, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

export default function GuildDonateHistoryPage() {
  const { user } = useAuth();
  const { isGuildLeader } = useGuild();
  const router = useRouter();
  const [donates, setDonates] = useState<Donate[]>([]);
  const [members, setMembers] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [memberDonations, setMemberDonations] = useState<MemberDonation[]>([]);
  const [sortBy, setSortBy] = useState<'lastDonation' | 'totalDonations' | 'donationCount'>('lastDonation');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const [allCharactersByUserId, setAllCharactersByUserId] = useState<Record<string, any[]>>({});

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
      } else {
        return sortOrder === 'desc' ? b.donationCount - a.donationCount : a.donationCount - b.donationCount;
      }
    });

    // เพิ่ม console.log เพื่อตรวจสอบข้อมูล
    console.log('Processed donations:', sortedDonations);

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

  const filteredDonations = memberDonations.filter(member => {
    const search = searchTerm.toLowerCase();
    const matchesDiscord = member.discordName.toLowerCase().includes(search);
    const charList = allCharactersByUserId[member.userId] || [];
    const matchesCharacter = charList.some(char =>
      char.name.toLowerCase().includes(search)
    );
    return matchesDiscord || matchesCharacter;
  });

  const handleSort = (column: 'lastDonation' | 'totalDonations' | 'donationCount') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

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
          {/* ปุ่มบริจาคกิลด์: Desktop */}
          <Link
            href="/guild-donate"
            className="ml-auto hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-200 via-orange-100 to-yellow-100 text-pink-800 text-sm font-bold rounded-full shadow border-2 border-pink-300 hover:from-pink-400 hover:to-orange-200 hover:text-white hover:shadow-xl transition-all duration-150"
            style={{ minWidth: 'fit-content' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            บริจาคกิลด์
          </Link>
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
              placeholder="ค้นหาด้วยชื่อ Discord หรือชื่อตัวละคร..."
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
                  className="px-4 py-3 text-center text-sm font-semibold text-gray-600 cursor-pointer hover:bg-pink-100 w-24"
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
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Discord</th>
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-pink-100"
                  onClick={() => handleSort('lastDonation')}
                >
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    บริจาคล่าสุด
                    {sortBy === 'lastDonation' && (
                      <span className="text-pink-500">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 w-32">
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    ยอดล่าสุด
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-pink-100"
                  onClick={() => handleSort('totalDonations')}
                >
                  <div className="flex items-center gap-1">
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
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      "font-medium",
                      member.donationCount > 0 ? "text-blue-600" : "text-gray-400"
                    )}>
                      {member.donationCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span 
                        className="font-medium text-gray-700 cursor-help relative"
                        onMouseEnter={() => setHoveredMember(member.userId)}
                        onMouseLeave={() => setHoveredMember(null)}
                      >
                        {member.discordName}
                        {hoveredMember === member.userId && (allCharactersByUserId[member.userId]?.length > 0) && (
                          <div className="absolute left-0 top-full mt-2 bg-white border border-pink-200 rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
                            <div className="text-sm font-semibold text-pink-600 mb-2">ตัวละครทั้งหมด:</div>
                            <div className="space-y-1">
                              {allCharactersByUserId[member.userId].map(char => (
                                <div key={char.id} className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-600">{char.name}</span>
                                  <span className="text-gray-400">({char.class})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {member.lastDonation ? (
                      <span className="text-gray-600">
                        {new Date(member.lastDonation).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-400">ยังไม่เคยบริจาค</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {member.lastDonationAmount ? (
                      <span className="font-medium text-green-600">
                        {member.lastDonationAmount.toLocaleString()}G
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
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
            <div key={member.userId} className="bg-white/90 border border-pink-100 rounded-lg shadow-sm p-2 flex flex-col gap-1">
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
                    {member.lastDonationAmount ? `${member.lastDonationAmount.toLocaleString()}G` : '-'}
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
                    <span key={char.id} className="px-2 py-0.5 bg-pink-50 text-pink-500 rounded-full text-xs border border-pink-100 truncate max-w-[90px]">
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
    </div>
  );
} 