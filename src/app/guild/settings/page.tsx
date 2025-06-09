'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';
import { useRouter } from 'next/navigation';
import { ref, get, remove, update, onValue, query, orderByChild, equalTo, set, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Settings, UserPlus, KeyRound, X, Check, Ban, DollarSign, Clock, CheckCircle2, XCircle, Crown, ChevronDown, ChevronUp, Bell, Users, Store, Building2, Shield, AlertCircle, Search, RefreshCw, PiggyBank, CreditCard, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuildSettings, GuildLoan } from '@/types/trade';
import { GuildService } from '@/lib/guildService';
import React from 'react';
import ConfirmModalPortal from '@/components/ConfirmModalPortal';
import Link from 'next/link';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getClassColors, CLASS_TO_ROLE } from '@/config/theme';

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
  'Alchemist': 'Academic'
};

const classColors: Record<string, { text: string; bg: string; border: string }> = {
  'Warrior': { text: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-300' },
  'Archer': { text: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-300' },
  'Sorceress': { text: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-300' },
  'Cleric': { text: 'text-violet-600', bg: 'bg-violet-100', border: 'border-violet-300' },
  'Academic': { text: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-300' }
};

const getMainClass = (char: any): string => char.mainClass || CLASS_TO_MAIN_CLASS[char.class] || 'Warrior';
const getColors = (mainClass: string): { text: string; bg: string; border: string } => classColors[mainClass] || { text: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300' };
const getClassIcon = (subClass: string) => {
  const mainClass = CLASS_TO_MAIN_CLASS[subClass] || subClass;
  switch (mainClass) {
    case 'Warrior': return '⚔️';
    case 'Archer': return '🏹';
    case 'Sorceress': return '🔮';
    case 'Cleric': return '✨';
    case 'Academic': return '🔧';
    default: return '👤';
  }
};

interface Merchant {
  uid: string;
  discordName: string;
  status: string;
  bankAccountName: string;
  discord: string;
  bankName: string;
  bankAccountNumber: string;
  createdAt?: number;
}

function parseJoinedAt(joinedAt: any): number {
  if (typeof joinedAt === 'number') return joinedAt;
  if (typeof joinedAt === 'string') {
    // ISO string เช่น "2025-05-07T13:11:42.081Z"
    const t = Date.parse(joinedAt);
    if (!isNaN(t)) return t;
    // กรณี "7/5/2568" (dd/mm/yyyy พ.ศ.)
    const match = joinedAt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [_, d, m, y] = match;
      const year = parseInt(y, 10) - 543;
      const month = parseInt(m, 10) - 1;
      const day = parseInt(d, 10);
      return new Date(year, month, day).getTime();
    }
  }
  return 0;
}

type UserMeta = {
  discord: string;
  approved?: boolean;
  lastResetDaily?: number;
  lastResetWeekly?: number;
};

type User = {
  meta?: UserMeta;
  photoURL?: string;
  // ... อื่นๆ
};

export default function GuildSettingsPage() {
  const { user } = useAuth();
  const { users } = useUsers();
  const router = useRouter();
  const [guild, setGuild] = useState<GuildSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingMerchants, setPendingMerchants] = useState<Merchant[]>([]);
  const [activeMerchants, setActiveMerchants] = useState<Merchant[]>([]);
  const [pendingLoans, setPendingLoans] = useState<GuildLoan[]>([]);
  const [repaidLoans, setRepaidLoans] = useState<GuildLoan[]>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [isAddingLeader, setIsAddingLeader] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newLoanCount, setNewLoanCount] = useState(0);
  const [lastLoanCount, setLastLoanCount] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [showMemberConfirmModal, setShowMemberConfirmModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showLeaderConfirmModal, setShowLeaderConfirmModal] = useState(false);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberCharacters, setMemberCharacters] = useState<Record<string, any[]>>({});
  const [showApproveMerchantModal, setShowApproveMerchantModal] = useState(false);
  const [selectedApproveMerchant, setSelectedApproveMerchant] = useState<Merchant | null>(null);
  const [showRejectMerchantModal, setShowRejectMerchantModal] = useState(false);
  const [selectedRejectMerchant, setSelectedRejectMerchant] = useState<Merchant | null>(null);
  const [showResetStatsModal, setShowResetStatsModal] = useState(false);
  const [selectedResetStatsUserId, setSelectedResetStatsUserId] = useState<string | null>(null);
  const [userCharacters, setUserCharacters] = useState<any[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [pendingDonations, setPendingDonations] = useState<any[]>([]);
  const [pendingCashDonations, setPendingCashDonations] = useState<any[]>([]);
  const [cashDonorDiscords, setCashDonorDiscords] = useState<Record<string, string>>({});

  const [debouncedMerchantSearch, setDebouncedMerchantSearch] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');

  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [selectedCashDonation, setSelectedCashDonation] = useState<any>(null);
  const [showDonationConfirmModal, setShowDonationConfirmModal] = useState(false);
  const [showCashDonationConfirmModal, setShowCashDonationConfirmModal] = useState(false);
  const [donationAction, setDonationAction] = useState<'approve' | 'reject'>('approve');

  const [showMemberApproveModal, setShowMemberApproveModal] = useState(false);
  const [showMemberRejectModal, setShowMemberRejectModal] = useState(false);
  const [selectedPendingMember, setSelectedPendingMember] = useState<any>(null);

  // [1] เพิ่ม state สำหรับ modal ยืนยันการบริจาค
  const [showGuildDonateConfirmModal, setShowGuildDonateConfirmModal] = useState(false);

  // [A] เพิ่ม state สำหรับ filteredDonateCharacters และ selectedDonateCharacter
  const [filteredDonateCharacters, setFilteredDonateCharacters] = useState<any[]>([]);
  const [selectedDonateCharacter, setSelectedDonateCharacter] = useState<any>(null);

  // [1] เพิ่ม state donateSearch สำหรับช่องค้นหาบริจาคกิลด์
  const [donateSearch, setDonateSearch] = useState('');

  useEffect(() => {
    if (!user) return;

    const guildRef = ref(db, 'guild');
    const unsubscribe = onValue(guildRef, (snapshot) => {
      if (snapshot.exists()) {
        const guildData = snapshot.val();
        setGuild(guildData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!guild?.members) return;

    let timeoutId: NodeJS.Timeout;
    const fetchDiscordNames = async () => {
      const updatedMembers = { ...guild.members };
      
      for (const [uid, member] of Object.entries(guild.members)) {
        try {
          const snapshot = await get(ref(db, `users/${uid}/meta/discord`));
          if (snapshot.exists()) {
            updatedMembers[uid] = {
              ...member,
              discordName: snapshot.val() || member.discordName
            };
          }
        } catch (error) {
          console.error('Error fetching Discord name:', error);
        }
      }

      setGuild(prev => prev ? { ...prev, members: updatedMembers } : null);
    };

    timeoutId = setTimeout(fetchDiscordNames, 500);

    return () => clearTimeout(timeoutId);
  }, [guild?.members]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const merchantsRef = ref(db, 'tradeMerchants');
    const unsubscribe = onValue(merchantsRef, (snapshot) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (snapshot.exists()) {
          const merchants = Object.entries(snapshot.val()).map(([uid, data]: [string, any]) => ({
            uid,
            ...data
          }));
          setPendingMerchants(merchants.filter(m => m.status === 'pending'));
          setActiveMerchants(merchants.filter(m => m.status === 'active'));
        } else {
          setPendingMerchants([]);
          setActiveMerchants([]);
        }
      }, 300);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const loansRef = query(ref(db, 'guildLoans'), orderByChild('type'), equalTo('guild'));
    const unsubscribe = onValue(loansRef, (snapshot) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (snapshot.exists()) {
          const loans = Object.entries(snapshot.val()).map(([id, loan]: [string, any]) => ({
            id,
            ...loan
          }));
          const pendingLoansList = loans.filter(loan => loan.status === 'waitingApproval');
          setPendingLoans(pendingLoansList);
          setRepaidLoans(loans.filter(loan => loan.status === 'returned'));

          if (!isFirstLoad && pendingLoansList.length > lastLoanCount) {
            const newLoans = pendingLoansList.length - lastLoanCount;
            setNewLoanCount(prev => prev + newLoans);
            toast.success(`มีคำขอกู้ยืมใหม่ ${newLoans} รายการ`, {
              duration: 5000,
              icon: '🔔',
            });
          }
          setLastLoanCount(pendingLoansList.length);
          setIsFirstLoad(false);
        } else {
          setPendingLoans([]);
          setRepaidLoans([]);
          setLastLoanCount(0);
          setIsFirstLoad(false);
        }
      }, 300);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [lastLoanCount, isFirstLoad]);

  useEffect(() => {
    if (!user) return;
    const usersRef = ref(db, 'users');
    const fetchPendingMembers = async () => {
      const snap = await get(usersRef);
      if (snap.exists()) {
        const users = snap.val();
        const pending = Object.entries(users)
          .filter(([uid, u]: any) => u.meta && u.meta.discord && u.meta.approved === false)
          .map(([uid, u]: any) => ({
            uid,
            discord: u.meta.discord,
            joinedAt: (guild?.members?.[uid]?.joinedAt) ?? u.meta.joinedAt ?? 0,
          }));
        setPendingMembers(pending);
      } else {
        setPendingMembers([]);
      }
    };
    fetchPendingMembers();
  }, [user, guild]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedMerchantSearch(merchantSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [merchantSearch]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedMemberSearch(memberSearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [memberSearch]);

  useEffect(() => {
    if (!guild?.members) return;

    const fetchCharacterData = async () => {
      const characterData: Record<string, any[]> = {};
      
      for (const uid of Object.keys(guild.members)) {
        try {
          const charsSnap = await get(ref(db, `users/${uid}/characters`));
          if (charsSnap.exists()) {
            characterData[uid] = Object.entries(charsSnap.val()).map(([cid, data]: [string, any]) => ({
              characterId: cid,
              ...data
            }));
          }
        } catch (error) {
          console.error('Error fetching characters:', error);
          characterData[uid] = [];
        }
      }
      
      setMemberCharacters(characterData);
    };

    fetchCharacterData();
  }, [guild?.members]);

  useEffect(() => {
    const donatesRef = ref(db, 'guilddonate');
    const unsubscribe = onValue(donatesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const donatesList = Object.entries(data)
          .filter(([_, value]: [string, any]) => value.status === 'waiting')
          .map(([id, value]: [string, any]) => ({
            id,
            ...value
          }));
        setPendingDonations(donatesList);
      } else {
        setPendingDonations([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const cashRef = ref(db, 'guilddonatecash');
    const unsubscribe = onValue(cashRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data)
          .filter(([_, value]: [string, any]) => (
            value &&
            value.status === 'waiting' &&
            typeof value.amount === 'number' &&
            typeof value.createdAt === 'number' &&
            typeof value.userId === 'string' &&
            value.type === 'cash' &&
            value.paymentMethod === 'promptpay'
          ))
          .map(([id, value]: [string, any]) => ({ id, ...value }));
        setPendingCashDonations(list);
      } else {
        setPendingCashDonations([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchDiscords = async () => {
      const userIds = Array.from(new Set(pendingCashDonations.map(d => d.userId)));
      const newDiscords: Record<string, string> = { ...cashDonorDiscords };
      await Promise.all(userIds.map(async (uid) => {
        if (!newDiscords[uid]) {
          const metaSnap = await get(ref(db, `users/${uid}/meta/discord`));
          if (metaSnap.exists()) {
            newDiscords[uid] = metaSnap.val();
          }
        }
      }));
      setCashDonorDiscords(newDiscords);
    };
    if (pendingCashDonations.length > 0) fetchDiscords();
  }, [pendingCashDonations]);

  useEffect(() => {
    const searchTerm = donateSearch.trim().toLowerCase();
    if (!searchTerm) {
      setFilteredDonateCharacters([]);
      setSelectedDonateCharacter(null); // reset เฉพาะตอน clear search
      return;
    }
    const result: any[] = [];
    Object.entries(guild?.members || {}).forEach(([uid, member]) => {
      const discordName = member.discordName?.toLowerCase() || '';
      if (memberCharacters[uid]) {
        memberCharacters[uid].forEach((char: any) => {
          const charName = char.name?.toLowerCase() || '';
          if (
            discordName.includes(searchTerm) ||
            charName.includes(searchTerm)
          ) {
            result.push({
              ...char,
              ownerUid: uid,
              ownerDiscord: member.discordName || '-',
            });
          }
        });
      }
    });
    setFilteredDonateCharacters(result);
    // ไม่ต้อง setSelectedDonateCharacter(null) ที่นี่
  }, [donateSearch, guild?.members, memberCharacters]);

  const handleApproveDonation = async (donateId: string, approve: boolean) => {
    const status = approve ? 'active' : 'rejected';
    const approvedAt = Date.now();
    await update(ref(db, `guilddonate/${donateId}`), {
      status,
      approvedAt,
      approvedBy: user?.uid || ''
    });
    const donation = pendingDonations.find(d => d.id === donateId);
    if (donation) {
      const feedText = approve
        ? `@${donation.discordName} บริจาค ${donation.amount} Gold ให้กิลด์ GalaxyCat สำเร็จ ✅`
        : `@${donation.discordName} ยกเลิกการบริจาค ${donation.amount} Gold ให้กิลด์ GalaxyCat ❌`;
      await push(ref(db, 'feed/all'), {
        type: 'donate',
        subType: status,
        text: feedText,
        userId: donation.userId,
        discordName: donation.discordName,
        amount: donation.amount,
        status,
        timestamp: approvedAt
      });
    }
    toast.success(approve ? 'ยืนยันการบริจาคสำเร็จ' : 'ยกเลิกการบริจาคแล้ว');
  };

  const handleApproveCashDonation = async (donationId: string, approve: boolean) => {
    const status = approve ? 'active' : 'rejected';
    const approvedAt = Date.now();
    await update(ref(db, `guilddonatecash/${donationId}`), {
      status,
      approvedAt,
      approvedBy: user?.uid || ''
    });
    const donation = pendingCashDonations.find(d => d.id === donationId);
    if (donation) {
      const metaSnap = await get(ref(db, `users/${donation.userId}/meta/discord`));
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

  const confirmDonationAction = async () => {
    if (selectedDonation) {
      await handleApproveDonation(selectedDonation.id, donationAction === 'approve');
      setShowDonationConfirmModal(false);
      setSelectedDonation(null);
    }
  };

  const confirmCashDonationAction = async () => {
    if (selectedCashDonation) {
      await handleApproveCashDonation(selectedCashDonation.id, donationAction === 'approve');
      setShowCashDonationConfirmModal(false);
      setSelectedCashDonation(null);
    }
  };

  const filteredActiveMerchants = React.useMemo(() => {
    return activeMerchants.filter(merchant => {
      const searchTerm = debouncedMerchantSearch.toLowerCase();
      return (
        (merchant.discordName?.toLowerCase() || '').includes(searchTerm) ||
        (merchant.discord?.toLowerCase() || '').includes(searchTerm) ||
        (merchant.bankAccountName?.toLowerCase() || '').includes(searchTerm) ||
        (merchant.bankAccountNumber || '').includes(debouncedMerchantSearch)
      );
    });
  }, [activeMerchants, debouncedMerchantSearch]);

  type MemberType = { discordName?: string; joinedAt?: string; [key: string]: any };

  const filteredMembers = React.useMemo<[string, MemberType][]>(() => {
    const searchTerm = debouncedMemberSearch.toLowerCase();
    return Object.entries(guild?.members || {}).reduce((acc: [string, MemberType][], [uid, member]) => {
      if (typeof member !== 'object') return acc;
      const name = ((member as MemberType)?.discordName ?? '').toLowerCase();
      const memberMatch = !searchTerm || name.includes(searchTerm) || uid.toLowerCase().includes(searchTerm);
      const characters = (typeof memberCharacters[uid] === 'object' && memberCharacters[uid] !== null) ? memberCharacters[uid] : [];
      const hasMatchingCharacter = characters.some((char: any) =>
        char.name?.toLowerCase().includes(searchTerm) ||
        char.class?.toLowerCase().includes(searchTerm)
      );
      if (memberMatch || hasMatchingCharacter) {
        acc.push([uid, member as MemberType]);
      }
      return acc;
    }, []).sort((a, b) => parseJoinedAt(b[1].joinedAt ?? 0) - parseJoinedAt(a[1].joinedAt ?? 0));
  }, [guild?.members, debouncedMemberSearch, memberCharacters]);

  const clearLoanNotifications = () => {
    setNewLoanCount(0);
  };

  const isGuildLeader = user?.uid && guild?.leaders?.[user.uid] === true;

  useEffect(() => {
    if (!loading && !isGuildLeader) {
      toast.error('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
      router.push('/');
    }
  }, [loading, isGuildLeader, router]);

  const handleRemoveMember = async (uid: string) => {
    if (uid === user?.uid) {
      toast.error('ไม่สามารถลบตัวเองได้');
      return;
    }

    if (guild?.leaders?.[uid]) {
      toast.error('ไม่สามารถลบหัวกิลด์ได้ กรุณาลบสิทธิ์หัวกิลด์ก่อน');
      return;
    }

    setSelectedMemberId(uid);
    setShowMemberConfirmModal(true);
  };

  const confirmRemoveMember = async () => {
    if (!selectedMemberId) return;

    try {
      setShowMemberConfirmModal(false);
      setSelectedMemberId(null);

      await new Promise(resolve => setTimeout(resolve, 100));

      await GuildService.removeMember(selectedMemberId);
      toast.success('ลบสมาชิกสำเร็จ');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('ไม่สามารถลบสมาชิกได้');
    }
  };

  const handleMerchantAction = async (uid: string, action: 'approve' | 'suspend') => {
    try {
      const merchantRef = ref(db, `tradeMerchants/${uid}`);
      await update(merchantRef, { status: action === 'approve' ? 'active' : 'suspended' });
      toast.success(action === 'approve' ? 'อนุมัติร้านค้าสำเร็จ' : 'ระงับร้านค้าสำเร็จ');
    } catch (error) {
      console.error('Error updating merchant status:', error);
      toast.error('ไม่สามารถอัพเดทสถานะร้านค้าได้');
    }
  };

  const handleLoanAction = async (loanId: string, action: 'approve' | 'reject' | 'confirm') => {
    try {
      const loanRef = ref(db, `guildLoans/${loanId}`);
      if (action === 'reject') {
        await remove(loanRef);
        toast.success('ลบคำขอกู้ยืมสำเร็จ');
        return;
      }
      const updates: Partial<GuildLoan> = {
        status: action === 'approve' ? 'active' : action === 'confirm' ? 'completed' : undefined,
        ...(action === 'confirm' && {
          confirmedBy: user?.uid,
          confirmedAt: new Date().toISOString()
        })
      };
      await update(loanRef, updates);
      toast.success(
        action === 'approve' ? 'อนุมัติการกู้สำเร็จ' :
        'ยืนยันการคืนเงินสำเร็จ'
      );
    } catch (error) {
      console.error('Error updating loan status:', error);
      toast.error('ไม่สามารถอัพเดทสถานะการกู้ได้');
    }
  };

  const handleAddLeader = async () => {
    if (!selectedMember) {
      toast.error('กรุณาเลือกสมาชิก');
      return;
    }

    if (guild?.leaders[selectedMember]) {
      toast.error('สมาชิกนี้เป็นหัวกิลด์อยู่แล้ว');
      return;
    }

    try {
      await update(ref(db, `guild/leaders`), { [selectedMember]: true });
      toast.success('เพิ่มหัวกิลด์สำเร็จ');
      setSelectedMember('');
      setIsAddingLeader(false);
    } catch (error) {
      console.error('Error adding leader:', error);
      toast.error('ไม่สามารถเพิ่มหัวกิลด์ได้');
    }
  };

  const handleRemoveLeader = async (uid: string) => {
    setSelectedLeaderId(uid);
    setShowLeaderConfirmModal(true);
  };

  const confirmRemoveLeader = async () => {
    if (!selectedLeaderId) return;

    if (selectedLeaderId === user?.uid) {
      toast.error('ไม่สามารถลบตัวเองได้');
      return;
    }

    try {
      await remove(ref(db, `guild/leaders/${selectedLeaderId}`));
      toast.success('ลบหัวกิลด์สำเร็จ');
      setShowLeaderConfirmModal(false);
      setSelectedLeaderId(null);
    } catch (error) {
      console.error('Error removing leader:', error);
      toast.error('ไม่สามารถลบหัวกิลด์ได้');
    }
  };

  const handleUnregisterMerchant = async (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setShowConfirmModal(true);
  };

  const confirmUnregisterMerchant = async () => {
    if (!selectedMerchant) return;

    try {
      setShowConfirmModal(false);
      setSelectedMerchant(null);

      await new Promise(resolve => setTimeout(resolve, 100));

      const merchantRef = ref(db, `tradeMerchants/${selectedMerchant.uid}`);
      await remove(merchantRef);
      toast.success('ยกเลิกการลงทะเบียนร้านค้าสำเร็จ');
    } catch (error) {
      console.error('Error unregistering merchant:', error);
      toast.error('ไม่สามารถยกเลิกการลงทะเบียนร้านค้าได้');
    }
  };

  const handleImportAllUsers = async () => {
    try {
      const usersSnap = await get(ref(db, 'users'));
      const users = usersSnap.val();
      if (!users) {
        toast.error('ไม่พบข้อมูลผู้ใช้');
        return;
      }
      let imported = 0;
      for (const userId in users) {
        if (!guild?.members?.[userId]) {
          await set(ref(db, `guild/members/${userId}`), {
            discordName: users[userId]?.meta?.discord || '',
            joinedAt: Date.now(),
            approved: users[userId]?.meta?.approved ?? false,
          });
          imported++;
        }
      }
      if (imported > 0) {
        toast.success(`นำเข้า ${imported} สมาชิกใหม่เรียบร้อยแล้ว`);
      } else {
        toast('ไม่มีสมาชิกใหม่ให้เพิ่ม');
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการนำเข้าสมาชิก');
    }
  };

  const handleApproveMerchant = (merchant: Merchant) => {
    setSelectedApproveMerchant(merchant);
    setShowApproveMerchantModal(true);
  };

  const confirmApproveMerchant = async () => {
    if (!selectedApproveMerchant) return;
    await handleMerchantAction(selectedApproveMerchant.uid, 'approve');
    setShowApproveMerchantModal(false);
    setSelectedApproveMerchant(null);
  };

  const handleRejectMerchant = (merchant: Merchant) => {
    setSelectedRejectMerchant(merchant);
    setShowRejectMerchantModal(true);
  };

  const confirmRejectMerchant = async () => {
    if (!selectedRejectMerchant) return;
    try {
      await remove(ref(db, `tradeMerchants/${selectedRejectMerchant.uid}`));
      toast.success('ลบ/ระงับร้านค้าสำเร็จ');
    } catch (error) {
      toast.error('ไม่สามารถลบ/ระงับร้านค้าได้');
    }
    setShowRejectMerchantModal(false);
    setSelectedRejectMerchant(null);
  };

  const handleResetStats = async (userId: string) => {
    setSelectedResetStatsUserId(userId);
    setSelectedCharacterId(null);
    try {
      const charsSnap = await get(ref(db, `users/${userId}/characters`));
      if (charsSnap.exists()) {
        const chars = Object.entries(charsSnap.val()).map(([cid, data]: [string, any]) => ({
          characterId: cid,
          name: data.name || cid,
          class: data.class || '',
        }));
        setUserCharacters(chars);
      } else {
        setUserCharacters([]);
      }
    } catch (error) {
      setUserCharacters([]);
    }
    setShowResetStatsModal(true);
  };

  const confirmResetStats = async () => {
    if (!selectedResetStatsUserId || !selectedCharacterId) return;
    try {
      const defaultStats = {
        agi: 0,
        atk: 0,
        cri: 0,
        ele: 0,
        fd: 0,
        hp: 0,
        int: 0,
        mdef: 0,
        pdef: 0,
        points: 0,
        spr: 0,
        str: 0,
        vit: 0,
        userId: selectedResetStatsUserId,
      };
      await update(ref(db, `users/${selectedResetStatsUserId}/characters/${selectedCharacterId}/stats`), defaultStats);
      toast.success('รีเซ็ตสเตตัสสำเร็จ!');
    } catch (error) {
      toast.error('ไม่สามารถรีเซ็ตสเตตัสได้');
    }
    setShowResetStatsModal(false);
    setSelectedResetStatsUserId(null);
    setUserCharacters([]);
    setSelectedCharacterId(null);
  };

  const handleApproveMember = async (uid: string) => {
    try {
      await update(ref(db, `users/${uid}/meta`), { approved: true });
      await update(ref(db, `guild/members/${uid}`), { approved: true });
      setPendingMembers(prev => prev.filter(m => m.uid !== uid));
      toast.success('อนุมัติสมาชิกสำเร็จ');
    } catch (error) {
      toast.error('ไม่สามารถอนุมัติสมาชิกได้');
    }
  };

  const handleRejectMember = async (uid: string) => {
    try {
      // Remove from guild/members
      await remove(ref(db, `guild/members/${uid}`));
      // Remove from users/meta
      await remove(ref(db, `users/${uid}/meta`));
      // Update local state
      setPendingMembers(prev => prev.filter(m => m.uid !== uid));
      toast.success('ปฏิเสธสมาชิกสำเร็จ');
    } catch (error) {
      console.error('Error rejecting member:', error);
      toast.error('ไม่สามารถปฏิเสธสมาชิกได้');
    }
  };

  const confirmApproveMember = async () => {
    if (selectedPendingMember) {
      await handleApproveMember(selectedPendingMember.uid);
      setShowMemberApproveModal(false);
      setSelectedPendingMember(null);
    }
  };

  const confirmRejectMember = async () => {
    if (selectedPendingMember) {
      try {
        await handleRejectMember(selectedPendingMember.uid);
        setShowMemberRejectModal(false);
        setSelectedPendingMember(null);
      } catch (error) {
        console.error('Error in confirmRejectMember:', error);
        toast.error('เกิดข้อผิดพลาดในการปฏิเสธสมาชิก');
      }
    }
  };

  const handleDonation = async (uid: string, characterId: string) => {
    // ปรับ validation ให้ตรงกับ UI ใหม่
    if (!selectedDonateCharacter || !donationAmount) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      // Record donation with active status (already approved)
      const donationRef = ref(db, 'guilddonate');
      const newDonationRef = push(donationRef);
      
      const donateData = {
        userId: selectedDonateCharacter.ownerUid,
        discordName: selectedDonateCharacter.ownerDiscord || 'ไม่ทราบ',
        amount: donationAmount,
        status: 'active',
        createdAt: Date.now(),
        approvedAt: Date.now(),
        approvedBy: user?.uid,
        characters: [{
          id: selectedDonateCharacter.characterId,
          name: selectedDonateCharacter.name || 'ไม่ทราบ',
          class: selectedDonateCharacter.class || 'ไม่ทราบ'
        }]
      };
      
      await set(newDonationRef, donateData);

      // Add to global feed
      await push(ref(db, 'feed/all'), {
        type: 'donate',
        subType: 'active',
        text: `@${donateData.discordName} บริจาค ${donationAmount}G ให้กิลด์ GalaxyCat สำเร็จ ✅`,
        userId: donateData.userId,
        discordName: donateData.discordName,
        amount: donationAmount,
        characters: donateData.characters,
        status: 'active',
        timestamp: Date.now()
      });

      // Add to member's personal feed
      await push(ref(db, `feed/${donateData.userId}`), {
        type: 'donate',
        subType: 'active',
        text: `คุณบริจาค ${donationAmount}G ให้กิลด์ GalaxyCat สำเร็จ ✅`,
        userId: donateData.userId,
        discordName: donateData.discordName,
        amount: donationAmount,
        characters: donateData.characters,
        status: 'active',
        timestamp: Date.now()
      });

      toast.success('บันทึกการบริจาคสำเร็จ');
      
      // Reset form เฉพาะ state ที่เกี่ยวข้องกับ UI ใหม่
      setDonateSearch('');
      setDonationAmount(0);
      setSelectedDonateCharacter(null);
      setFilteredDonateCharacters([]);
    } catch (error) {
      console.error('Error recording donation:', error);
      toast.error('ไม่สามารถบันทึกการบริจาคได้');
    }
  };

  if (loading || !user) {
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

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      {/* Donation Confirmation Modal */}
      {showDonationConfirmModal && selectedDonation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {donationAction === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการยกเลิก'}
            </h3>
            <p className="text-gray-600 mb-6">
              คุณต้องการ{donationAction === 'approve' ? 'อนุมัติ' : 'ยกเลิก'}การบริจาค {selectedDonation.amount} Gold 
              จาก {selectedDonation.discordName} ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDonationConfirmModal(false);
                  setSelectedDonation(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDonationAction}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  donationAction === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {donationAction === 'approve' ? 'อนุมัติ' : 'ยกเลิกการบริจาค'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Donation Confirmation Modal */}
      {showCashDonationConfirmModal && selectedCashDonation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              {donationAction === 'approve' ? 'ยืนยันการอนุมัติ' : 'ยืนยันการยกเลิก'}
            </h3>
            <p className="text-gray-600 mb-6">
              คุณต้องการ{donationAction === 'approve' ? 'อนุมัติ' : 'ยกเลิก'}การบริจาคเงินสด {selectedCashDonation.amount} บาท 
              จาก {cashDonorDiscords[selectedCashDonation.userId] || '...'} ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCashDonationConfirmModal(false);
                  setSelectedCashDonation(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmCashDonationAction}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                  donationAction === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {donationAction === 'approve' ? 'อนุมัติ' : 'ยกเลิกการบริจาค'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Approval Confirmation Modal */}
      {showMemberApproveModal && selectedPendingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">ยืนยันการอนุมัติสมาชิก</h3>
            <p className="text-gray-600 mb-6">
              คุณต้องการอนุมัติสมาชิก {selectedPendingMember.discord || 'ไม่ทราบ'} เข้าร่วมกิลด์ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMemberApproveModal(false);
                  setSelectedPendingMember(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmApproveMember}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                อนุมัติ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Member Rejection Confirmation Modal */}
      {showMemberRejectModal && selectedPendingMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">ยืนยันการปฏิเสธสมาชิก</h3>
            <p className="text-gray-600 mb-6">
              คุณต้องการปฏิเสธสมาชิก {selectedPendingMember.discord || 'ไม่ทราบ'} เข้าร่วมกิลด์ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMemberRejectModal(false);
                  setSelectedPendingMember(null);
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmRejectMember}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                ปฏิเสธ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-4 md:p-8 border border-pink-200">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6 md:mb-8 pb-4 md:pb-6 border-b border-pink-100">
          <div className="p-2 md:p-3 bg-pink-100 rounded-lg md:rounded-xl">
            <Settings className="w-7 h-7 md:w-8 md:h-8 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">⚙️ ตั้งค่ากิลด์</h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1">จัดการการตั้งค่าและสมาชิกของกิลด์</p>
          </div>
          {newLoanCount > 0 && (
            <div 
              className="ml-auto flex items-center gap-2 bg-pink-100 text-pink-600 px-3 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-full cursor-pointer hover:bg-pink-200 transition-colors text-xs md:text-sm"
              onClick={clearLoanNotifications}
              title="คลิกเพื่อล้างการแจ้งเตือน"
            >
              <Bell className="w-4 h-4" />
              <span className="font-medium">มีคำขอกู้ยืมใหม่ {newLoanCount} รายการ</span>
            </div>
          )}
        </div>

        {/* Leaders Section */}
        <div className="mb-6 md:mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-2 md:gap-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg">
                <Crown className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-800">หัวกิลด์</h2>
            </div>
            <button
              onClick={() => setIsAddingLeader(!isAddingLeader)}
              className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm text-xs md:text-base"
            >
              <UserPlus className="w-4 h-4" />
              <span>เพิ่มหัวกิลด์</span>
            </button>
          </div>

          {isAddingLeader && (
            <div className="mb-6 p-6 bg-pink-50 rounded-xl border border-pink-100">
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-500 shadow-sm"
                >
                  <span className={cn(
                    "text-gray-500",
                    selectedMember && "text-gray-700"
                  )}>
                    {selectedMember ? guild?.members[selectedMember]?.discordName : "เลือกสมาชิก"}
                  </span>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-gray-500 transition-transform",
                    isDropdownOpen && "transform rotate-180"
                  )} />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border border-pink-200 max-h-60 overflow-y-auto">
                    {Object.entries(guild?.members || {})
                      .filter(([uid]) => !guild?.leaders[uid])
                      .map(([uid, member]) => (
                        <button
                          key={uid}
                          onClick={() => {
                            setSelectedMember(uid);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-pink-50 transition-colors"
                        >
                          <p className="font-medium text-gray-700">{member.discordName}</p>
                          <p className="text-sm text-gray-500">UID: {uid}</p>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleAddLeader}
                  disabled={!selectedMember}
                  className={cn(
                    "px-6 py-2 text-white rounded-lg transition-colors shadow-sm",
                    selectedMember
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-gray-400 cursor-not-allowed"
                  )}
                >
                  เพิ่ม
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
            {Object.entries(guild?.leaders || {}).map(([uid, isLeader]) => (
              <div
                key={uid}
                className="flex flex-col md:flex-row md:items-center md:justify-between p-4 md:p-4 bg-purple-50 rounded-xl border border-purple-100 hover:bg-purple-100/50 transition-colors gap-2 md:gap-0"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Crown className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{guild?.members[uid]?.discordName ? guild?.members[uid]?.discordName : 'ไม่ทราบ'}</p>
                    <p className="text-sm text-gray-500">UID: {uid}</p>
                  </div>
                </div>
                {uid !== user?.uid && (
                  <div className="w-full md:w-auto flex flex-row gap-x-2 md:gap-2">
                    <button
                      onClick={() => handleRemoveLeader(uid)}
                      className="flex-1 md:w-auto p-2 rounded-l-lg md:rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="ลบหัวกิลด์"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    {isGuildLeader && (
                      <button
                        onClick={() => handleResetStats(uid)}
                        className="flex-1 md:w-auto p-2 rounded-r-lg md:rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                        title="รีเซ็ตสเตตัสตัวละคร"
                      >
                        <RefreshCw className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Pending Members Section */}
        {isGuildLeader && (
          <>
            {/* Guild Loan Button */}
            <div className="mb-6 md:mb-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-2 md:gap-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-purple-100 rounded-lg">
                    <PiggyBank className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800">ระบบกู้ยืมกิลด์</h2>
                </div>
                <Link
                  href="/guildloan"
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors shadow-sm"
                >
                  <PiggyBank className="w-5 h-5" />
                  <span>จัดการกู้ยืม</span>
                  {pendingLoans.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                      {pendingLoans.length}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Guild Donation Section */}
            <div className="mb-6 md:mb-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-2 md:gap-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800">บริจาคกิลด์</h2>
                </div>
                <Link
                  href="/guild-donate"
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                >
                  <DollarSign className="w-5 h-5" />
                  <span>จัดการบริจาค</span>
                </Link>
              </div>
              <div className="bg-white rounded-xl p-6 border border-green-100 shadow-sm">
                <div className="space-y-4">
                  {/* Search Row */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อตัวละคร หรือชื่อ Discord..."
                        value={donateSearch}
                        onChange={e => setDonateSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs md:text-base"
                      />
                    </div>
                  </div>

                  {/* Character Search Result */}
                  {donateSearch && (
                    <div className="mt-2">
                      {filteredDonateCharacters.length === 0 ? (
                        <div className="text-gray-400 text-sm">ไม่พบตัวละครที่ตรงกับคำค้นหา</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {filteredDonateCharacters.map((char) => (
                            <button
                              key={char.characterId + char.ownerUid}
                              type="button"
                              onClick={() => setSelectedDonateCharacter(char)}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border transition-colors w-full text-left",
                                selectedDonateCharacter && selectedDonateCharacter.characterId === char.characterId && selectedDonateCharacter.ownerUid === char.ownerUid
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-200 bg-white hover:bg-green-50"
                              )}
                            >
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={users[char.ownerUid]?.photoURL!} alt={char.ownerDiscord || 'Member'} />
                                <AvatarFallback className="bg-blue-200 text-blue-800 text-sm font-semibold">
                                  {char.ownerDiscord ? char.ownerDiscord.charAt(0).toUpperCase() : 'M'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-800 truncate">{char.name} <span className={getClassColors(CLASS_TO_ROLE[char.class as import('@/types/character').CharacterClass]).text + " text-xs"}>({char.class})</span></div>
                                <div className="text-xs text-gray-500 truncate">Discord: {char.ownerDiscord}</div>
                              </div>
                              {selectedDonateCharacter && selectedDonateCharacter.characterId === char.characterId && selectedDonateCharacter.ownerUid === char.ownerUid && (
                                <Check className="w-4 h-4 text-green-500" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected Character & Donate Input */}
                  {selectedDonateCharacter && (
                    <div className="flex flex-col md:flex-row gap-4 items-center mt-4">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={users[selectedDonateCharacter.ownerUid]?.photoURL!} alt={selectedDonateCharacter.ownerDiscord || 'Member'} />
                          <AvatarFallback className="bg-blue-200 text-blue-800 text-sm font-semibold">
                            {selectedDonateCharacter.ownerDiscord ? selectedDonateCharacter.ownerDiscord.charAt(0).toUpperCase() : 'M'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-gray-900">{selectedDonateCharacter.name} <span className={getClassColors(CLASS_TO_ROLE[selectedDonateCharacter.class as import('@/types/character').CharacterClass]).text + " text-xs"}>({selectedDonateCharacter.class})</span></div>
                          <div className="text-xs text-gray-500">Discord: {selectedDonateCharacter.ownerDiscord}</div>
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        placeholder="จำนวน Gold"
                        className="w-full md:w-40 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={donationAmount || ''}
                        onChange={e => {
                          const value = e.target.value;
                          const cleanValue = value.replace(/^0+/, '') || '0';
                          const numValue = parseInt(cleanValue);
                          setDonationAmount(numValue || 0);
                        }}
                      />
                      <button
                        onClick={() => setShowGuildDonateConfirmModal(true)}
                        disabled={!selectedDonateCharacter || !donationAmount}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        <DollarSign className="w-5 h-5" />
                        <span>บริจาค</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pending Donations Section */}
            <div className="mb-6 md:mb-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-2 md:gap-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-yellow-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-yellow-600" />
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800">รายการรออนุมัติการบริจาค</h2>
                </div>
                <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-yellow-50 rounded-lg md:rounded-full">
                  <span className="text-xs md:text-sm font-medium text-yellow-700">{pendingDonations.length} รายการ</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                {pendingDonations.length === 0 ? (
                  <div className="col-span-2 flex items-center justify-center p-8 bg-yellow-50 rounded-xl border border-yellow-100">
                    <div className="text-center">
                      <DollarSign className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">ไม่มีรายการรออนุมัติ</p>
                    </div>
                  </div>
                ) : (
                  pendingDonations.map((donation) => (
                    <div
                      key={donation.id}
                      className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-100 rounded-lg">
                              <Coins className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{donation.discordName}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(donation.createdAt).toLocaleDateString('th-TH', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold">
                              {donation.amount.toLocaleString()} Gold
                            </span>
                          </div>
                        </div>

                        {donation.characters && donation.characters.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {donation.characters.map((char: any) => (
                              <span 
                                key={char.id} 
                                className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-medium"
                              >
                                {char.name} ({char.class})
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setSelectedDonation(donation);
                              setDonationAction('approve');
                              setShowDonationConfirmModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-green-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:bg-green-600 transition-colors"
                            title="อนุมัติ"
                          >
                            <Check className="w-4 h-4" /> อนุมัติ
                          </button>
                          <button
                            onClick={() => {
                              setSelectedDonation(donation);
                              setDonationAction('reject');
                              setShowDonationConfirmModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:bg-red-600 transition-colors"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" /> ยกเลิก
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Cash Donations Section */}
            <div className="mb-6 md:mb-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-2 md:gap-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-green-100 rounded-lg">
                    <CreditCard className="w-5 h-5 text-green-600" />
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800">รายการรออนุมัติเงินสด</h2>
                </div>
                <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-green-50 rounded-lg md:rounded-full">
                  <span className="text-xs md:text-sm font-medium text-green-700">{pendingCashDonations.length} รายการ</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                {pendingCashDonations.length === 0 ? (
                  <div className="col-span-2 flex items-center justify-center p-8 bg-green-50 rounded-xl border border-green-100">
                    <div className="text-center">
                      <CreditCard className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">ไม่มีรายการบริจาคเงินสดที่รออนุมัติ</p>
                    </div>
                  </div>
                ) : (
                  pendingCashDonations.map((donation) => (
                    <div
                      key={donation.id}
                      className="bg-white rounded-xl p-4 border border-green-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <CreditCard className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{cashDonorDiscords[donation.userId] || 'ไม่ทราบ'}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(donation.createdAt).toLocaleDateString('th-TH', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-semibold">
                              {donation.amount.toLocaleString()} บาท
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setSelectedCashDonation(donation);
                              setDonationAction('approve');
                              setShowCashDonationConfirmModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-green-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:bg-green-600 transition-colors"
                            title="อนุมัติ"
                          >
                            <Check className="w-4 h-4" /> อนุมัติ
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCashDonation(donation);
                              setDonationAction('reject');
                              setShowCashDonationConfirmModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:bg-red-600 transition-colors"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" /> ยกเลิก
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Pending Members Section */}
            <div className="mb-6 md:mb-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-2 md:gap-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-red-100 rounded-lg">
                    <UserPlus className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800">สมาชิกใหม่ที่รออนุมัติ</h2>
                </div>
                <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-red-50 rounded-lg md:rounded-full">
                  <span className="text-xs md:text-sm font-medium text-red-700">{pendingMembers.length} คน</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
                {pendingMembers.length === 0 ? (
                  <div className="col-span-2 flex items-center justify-center p-8 bg-rose-50 rounded-xl border border-rose-100">
                    <div className="text-center">
                      <UserPlus className="w-8 h-8 text-rose-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">ไม่มีสมาชิกใหม่ที่รออนุมัติ</p>
                    </div>
                  </div>
                ) : (
                  pendingMembers.map((member) => (
                    <div
                      key={member.uid}
                      className="bg-white rounded-xl p-4 border border-rose-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-rose-100 rounded-lg">
                              <UserPlus className="w-5 h-5 text-rose-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{member.discord || 'ไม่ทราบ'}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(member.joinedAt).toLocaleDateString('th-TH', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-rose-100 text-rose-700 text-sm font-semibold">
                              สมาชิกใหม่
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setSelectedPendingMember(member);
                              setShowMemberApproveModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-green-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:bg-green-600 transition-colors"
                            title="อนุมัติ"
                          >
                            <Check className="w-4 h-4" /> อนุมัติ
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPendingMember(member);
                              setShowMemberRejectModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:bg-red-600 transition-colors"
                            title="ยกเลิก"
                          >
                            <X className="w-4 h-4" /> ยกเลิก
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* Pending Merchants Section */}
        <div className="mb-6 md:mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-2 md:gap-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-yellow-100 rounded-lg">
                <Store className="w-5 h-5 text-yellow-600" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-800">ร้านค้าที่รออนุมัติ</h2>
            </div>
            <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-yellow-50 rounded-lg md:rounded-full">
              <span className="text-xs md:text-sm font-medium text-yellow-700">{pendingMerchants.length} ร้านค้า</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
            {pendingMerchants.map((merchant) => (
              <div 
                key={merchant.uid} 
                className="bg-white rounded-xl p-4 border border-purple-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Store className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{merchant.discordName}</p>
                        <p className="text-sm text-gray-500">
                          สมัครเมื่อ: {merchant.createdAt ? new Date(merchant.createdAt).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold">
                        ร้านค้าใหม่
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{merchant.discord}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>{merchant.bankName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Shield className="w-4 h-4" />
                      <span>{merchant.bankAccountNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <CreditCard className="w-4 h-4" />
                      <span>{merchant.bankAccountName}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleApproveMerchant(merchant)}
                      className="px-3 py-1.5 rounded-lg bg-green-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:bg-green-600 transition-colors"
                      title="อนุมัติ"
                    >
                      <Check className="w-4 h-4" /> อนุมัติ
                    </button>
                    <button
                      onClick={() => handleRejectMerchant(merchant)}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium text-sm flex items-center gap-1.5 shadow-sm hover:bg-red-600 transition-colors"
                      title="ระงับ"
                    >
                      <X className="w-4 h-4" /> ระงับ
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingMerchants.length === 0 && (
              <div className="col-span-2 flex items-center justify-center p-8 bg-purple-50 rounded-xl border border-purple-100">
                <div className="text-center">
                  <Store className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">ไม่มีร้านค้าที่รออนุมัติ</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Merchants Section */}
        <div className="mb-6 md:mb-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-2 md:gap-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-green-100 rounded-lg">
                <Store className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-800">ร้านค้าที่ลงทะเบียนแล้ว</h2>
            </div>
            <div className="relative w-full md:w-64 mt-2 md:mt-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาร้านค้า..."
                value={merchantSearch}
                onChange={(e) => setMerchantSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-xs md:text-base"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
            {filteredActiveMerchants.length === 0 ? (
              <div className="col-span-2 flex items-center justify-center p-8 bg-green-50 rounded-xl border border-green-100">
                <div className="text-center">
                  <Store className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {merchantSearch ? 'ไม่พบร้านค้าที่ตรงกับการค้นหา' : 'ยังไม่มีร้านค้าที่ลงทะเบียน'}
                  </p>
                </div>
              </div>
            ) : (
              filteredActiveMerchants.map((merchant) => (
                <div key={merchant.uid} className="bg-white rounded-xl p-4 md:p-6 border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 md:gap-0">
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900">{merchant.discordName}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="w-4 h-4" />
                        <span>{merchant.discord}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Building2 className="w-4 h-4" />
                        <span>{merchant.bankName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Shield className="w-4 h-4" />
                        <span>{merchant.bankAccountNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <UserPlus className="w-4 h-4" />
                        <span>{merchant.bankAccountName}</span>
                      </div>
                    </div>
                    <div className="w-full md:w-auto flex flex-row gap-x-2 md:gap-2">
                      <button
                        onClick={() => handleUnregisterMerchant(merchant)}
                        className="flex-1 md:w-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors text-sm font-medium"
                      >
                        <X className="w-4 h-4" />
                        <span>ยกเลิก</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Members Section */}
        <div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 gap-2 md:gap-0">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold text-gray-800">รายชื่อสมาชิก ({Object.keys(guild?.members || {}).length} คน)</h2>
            </div>
            <div className="relative w-full md:w-[420px] mt-2 md:mt-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาชื่อ Discord หรือชื่อตัวละคร..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs md:text-base"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
            {filteredMembers.length === 0 ? (
              <div className="col-span-2 flex items-center justify-center p-8 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-center">
                  <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    {memberSearch ? 'ไม่พบสมาชิกที่ตรงกับการค้นหา' : 'ยังไม่มีสมาชิกในกิลด์'}
                  </p>
                </div>
              </div>
            ) : (
              filteredMembers.map(([uid, member]) => {
                const m = member as { discordName: string; joinedAt: string };
                return (
                  <div
                    key={uid}
                    className={cn(
                      "flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow gap-2 md:gap-0",
                      users[uid]?.meta && (users[uid]?.meta as UserMeta).approved === false && "border-2 border-yellow-400 bg-yellow-50/60"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={users[uid]?.photoURL!} alt={m.discordName || 'Member'} />
                        <AvatarFallback className="bg-blue-200 text-blue-800 text-sm font-semibold">
                          {m.discordName ? m.discordName.charAt(0).toUpperCase() : 'M'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-800 flex items-center gap-2">
                          {m.discordName || 'ไม่ทราบ'}
                          {users[uid]?.meta && (users[uid]?.meta as UserMeta).approved === false && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-300 text-yellow-900 text-xs font-bold animate-pulse">รออนุมัติ</span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          เข้าร่วมเมื่อ: {(() => {
                            const parsed = parseJoinedAt(m.joinedAt);
                            if (parsed && parsed > 0) {
                              return new Date(parsed).toLocaleDateString('th-TH');
                            }
                            if (typeof m.joinedAt === 'string' && m.joinedAt.trim() !== '') {
                              return m.joinedAt;
                            }
                            return '-';
                          })()}
                        </p>
                        <p className="text-xs text-gray-400">UID: {uid}</p>
                        {Array.isArray(memberCharacters[uid]) && memberCharacters[uid].length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {memberCharacters[uid].map((char: any, idx: number) => (
                              <div key={char.characterId || idx} className="text-xs text-gray-500 flex gap-1 items-center">
                                <span>{char.name}</span>
                                {char.class && <span className="text-gray-400">({char.class})</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {uid !== user?.uid && (
                      <div className="w-full md:w-auto flex flex-row gap-x-2 md:gap-2">
                        <button
                          onClick={() => handleRemoveMember(uid)}
                          className="flex-1 md:w-auto p-2 rounded-l-lg md:rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                          title="ลบสมาชิก"
                        >
                          <X className="w-5 h-5" />
                        </button>
                        {isGuildLeader && (
                          <button
                            onClick={() => handleResetStats(uid)}
                            className="flex-1 md:w-auto p-2 rounded-r-lg md:rounded-lg text-orange-500 hover:bg-orange-50 transition-colors"
                            title="รีเซ็ตสเตตัสตัวละคร"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Confirmation Modal for Merchant */}
        {showConfirmModal && selectedMerchant && (
          <ConfirmModalPortal>
            <div className="!fixed !inset-0 !z-[9999] h-screen w-screen flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl pointer-events-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">ยืนยันการยกเลิกการลงทะเบียนร้านค้า</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  คุณต้องการยกเลิกการลงทะเบียนร้านค้า {selectedMerchant.discordName} ใช่หรือไม่?
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShowConfirmModal(false);
                      setSelectedMerchant(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmUnregisterMerchant}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm"
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </ConfirmModalPortal>
        )}

        {/* Confirmation Modal for Member */}
        {showMemberConfirmModal && selectedMemberId && (
          <ConfirmModalPortal>
            <div className="!fixed !inset-0 !z-[9999] h-screen w-screen flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl pointer-events-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">ยืนยันการลบสมาชิก</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  คุณต้องการลบสมาชิก {guild?.members[selectedMemberId]?.discordName} ออกจากกิลด์ใช่หรือไม่?
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShowMemberConfirmModal(false);
                      setSelectedMemberId(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmRemoveMember}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm"
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </ConfirmModalPortal>
        )}

        {/* Confirmation Modal for Leader */}
        {showLeaderConfirmModal && selectedLeaderId && (
          <ConfirmModalPortal>
            <div className="!fixed !inset-0 !z-[9999] h-screen w-screen flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl pointer-events-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">ยืนยันการลบหัวกิลด์</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  คุณต้องการลบสิทธิ์หัวกิลด์ของ {guild?.members[selectedLeaderId]?.discordName} ใช่หรือไม่?
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShowLeaderConfirmModal(false);
                      setSelectedLeaderId(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmRemoveLeader}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm"
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </ConfirmModalPortal>
        )}

        {/* Confirmation Modal for Approve Merchant */}
        {showApproveMerchantModal && selectedApproveMerchant && (
          <ConfirmModalPortal>
            <div className="!fixed !inset-0 !z-[9999] h-screen w-screen flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl pointer-events-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">ยืนยันการอนุมัติร้านค้า</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  คุณต้องการอนุมัติร้านค้า {selectedApproveMerchant.discordName} ใช่หรือไม่?
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShowApproveMerchantModal(false);
                      setSelectedApproveMerchant(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmApproveMerchant}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-sm"
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </ConfirmModalPortal>
        )}

        {/* Confirmation Modal for Reject Merchant */}
        {showRejectMerchantModal && selectedRejectMerchant && (
          <ConfirmModalPortal>
            <div className="!fixed !inset-0 !z-[9999] h-screen w-screen flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl pointer-events-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">ยืนยันการปฏิเสธร้านค้า</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  คุณต้องการปฏิเสธ/ระงับร้านค้า {selectedRejectMerchant.discordName} ใช่หรือไม่?
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShowRejectMerchantModal(false);
                      setSelectedRejectMerchant(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmRejectMerchant}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-sm"
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </ConfirmModalPortal>
        )}

        {/* Confirmation Modal for Reset Stats */}
        {showResetStatsModal && selectedResetStatsUserId && (
          <ConfirmModalPortal>
            <div className="!fixed !inset-0 !z-[9999] h-screen w-screen flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl pointer-events-auto">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <RefreshCw className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">เลือกตัวละครเพื่อรีเซ็ตสเตตัส</h3>
                </div>
                <div className="mb-4">
                  {userCharacters.length === 0 ? (
                    <p className="text-gray-500">ไม่พบตัวละครของสมาชิกนี้</p>
                  ) : (
                    <select
                      className="w-full border rounded-lg p-2"
                      value={selectedCharacterId || ''}
                      onChange={e => setSelectedCharacterId(e.target.value)}
                    >
                      <option value="" disabled>เลือกตัวละคร</option>
                      {userCharacters.map(char => (
                        <option key={char.characterId} value={char.characterId}>
                          {char.name} {char.class && `(${char.class})`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => {
                      setShowResetStatsModal(false);
                      setSelectedResetStatsUserId(null);
                      setUserCharacters([]);
                      setSelectedCharacterId(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={confirmResetStats}
                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 shadow-sm"
                    disabled={!selectedCharacterId}
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </ConfirmModalPortal>
        )}

        {/* Guild Donate Confirmation Modal */}
        {showGuildDonateConfirmModal && selectedDonateCharacter && (
          <ConfirmModalPortal>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">ยืนยันการบริจาค</h3>
                <div className="mb-6 text-gray-700 text-base">
                  <div className="mb-2">คุณต้องการบริจาค <span className="font-bold text-green-600">{donationAmount.toLocaleString()} Gold</span> ให้กิลด์ใช่หรือไม่?</div>
                  <div className="mb-2">ชื่อ Discord: <span className="font-semibold">{selectedDonateCharacter.ownerDiscord}</span></div>
                  <div>ตัวละคร: <span className="font-semibold">{selectedDonateCharacter.name}</span> <span className={getClassColors(CLASS_TO_ROLE[selectedDonateCharacter.class as import('@/types/character').CharacterClass]).text + " text-xs"}>({selectedDonateCharacter.class})</span></div>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowGuildDonateConfirmModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={async () => {
                      setShowGuildDonateConfirmModal(false);
                      await handleDonation(selectedDonateCharacter.ownerUid, selectedDonateCharacter.characterId);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </ConfirmModalPortal>
        )}
      </div>
    </div>
  );
} 