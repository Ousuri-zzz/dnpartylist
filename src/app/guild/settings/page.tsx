'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ref, get, remove, update, onValue, query, orderByChild, equalTo, set, push } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Settings, UserPlus, KeyRound, X, Check, Ban, DollarSign, Clock, CheckCircle2, XCircle, Crown, ChevronDown, ChevronUp, Bell, Users, Store, Building2, Shield, AlertCircle, Search, RefreshCw, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuildSettings, GuildLoan } from '@/types/trade';
import { GuildService } from '@/lib/guildService';
import React from 'react';
import ConfirmModalPortal from '@/components/ConfirmModalPortal';
import Link from 'next/link';

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

export default function GuildSettingsPage() {
  const { user } = useAuth();
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

  const [debouncedMerchantSearch, setDebouncedMerchantSearch] = useState('');
  const [debouncedMemberSearch, setDebouncedMemberSearch] = useState('');

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
          }));
        setPendingMembers(pending);
      } else {
        setPendingMembers([]);
      }
    };
    fetchPendingMembers();
  }, [user]);

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

  const filteredMembers = React.useMemo(() => {
    const searchTerm = debouncedMemberSearch.toLowerCase();
    return Object.entries(guild?.members || {})
      .filter(([uid, member]) => {
        if (!searchTerm) return true; // Show all members when no search term
        
        const name = member.discordName ? member.discordName.toLowerCase() : '';
        const memberMatch = name.includes(searchTerm) || uid.toLowerCase().includes(searchTerm);
        
        // Check if any character matches the search
        const characters = memberCharacters[uid] || [];
        const hasMatchingCharacter = characters.some(char =>
          char.name?.toLowerCase().includes(searchTerm) ||
          char.class?.toLowerCase().includes(searchTerm)
        );

        return memberMatch || hasMatchingCharacter;
      })
      .sort((a, b) => parseJoinedAt(b[1].joinedAt) - parseJoinedAt(a[1].joinedAt));
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
            joinedAt: Date.now()
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
      await remove(ref(db, `users/${uid}`));
      await remove(ref(db, `guild/members/${uid}`));
      await remove(ref(db, `guild/leaders/${uid}`));
      await remove(ref(db, `tradeMerchants/${uid}`));
      setPendingMembers(prev => prev.filter(m => m.uid !== uid));
      toast.success('ยกเลิกและลบสมาชิกสำเร็จ');
    } catch (error) {
      toast.error('ไม่สามารถลบสมาชิกได้');
    }
  };

  const handleDonation = async () => {
    if (!memberSearch || !donationAmount || !selectedMember || !selectedCharacterId) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      // Record donation with active status (already approved)
      const donationRef = ref(db, 'guilddonate');
      const newDonationRef = push(donationRef);
      
      const selectedChar = memberCharacters[selectedMember]?.find(char => char.characterId === selectedCharacterId);
      const donateData = {
        userId: selectedMember,
        discordName: guild?.members[selectedMember]?.discordName || 'ไม่ทราบ',
        amount: donationAmount,
        status: 'active',
        createdAt: Date.now(),
        approvedAt: Date.now(),
        approvedBy: user?.uid,
        characters: [{
          id: selectedCharacterId,
          name: selectedChar?.name || 'ไม่ทราบ',
          class: selectedChar?.class || 'ไม่ทราบ'
        }]
      };
      
      await set(newDonationRef, donateData);

      // Add to global feed
      await push(ref(db, 'feed/all'), {
        type: 'donate',
        subType: 'active',
        text: `@${donateData.discordName} บริจาค ${donationAmount}G ให้กิลด์ GalaxyCat สำเร็จ ✅`,
        userId: selectedMember,
        discordName: donateData.discordName,
        amount: donationAmount,
        characters: donateData.characters,
        status: 'active',
        timestamp: Date.now()
      });

      // Add to member's personal feed
      await push(ref(db, `feed/${selectedMember}`), {
        type: 'donate',
        subType: 'active',
        text: `คุณบริจาค ${donationAmount}G ให้กิลด์ GalaxyCat สำเร็จ ✅`,
        userId: selectedMember,
        discordName: donateData.discordName,
        amount: donationAmount,
        characters: donateData.characters,
        status: 'active',
        timestamp: Date.now()
      });

      toast.success('บันทึกการบริจาคสำเร็จ');
      
      // Reset form
      setMemberSearch('');
      setDonationAmount(0);
      setSelectedMember('');
      setSelectedCharacterId(null);
      setUserCharacters([]);
    } catch (error) {
      console.error('Error recording donation:', error);
      toast.error('ไม่สามารถบันทึกการบริจาคได้');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
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
                  {/* Search, Gold Input, and Donate Button Row */}
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Input */}
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="ค้นหาชื่อ Discord หรือชื่อตัวละคร..."
                        value={memberSearch}
                        onChange={(e) => {
                          setMemberSearch(e.target.value);
                          setSelectedMember('');
                          setSelectedCharacterId(null);
                          setUserCharacters([]);
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    {/* Gold Amount Input */}
                    <div className="w-full md:w-48">
                      <input
                        type="number"
                        min="0"
                        placeholder="จำนวน Gold"
                        className="w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        value={donationAmount || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Remove leading zeros and convert to number
                          const cleanValue = value.replace(/^0+/, '') || '0';
                          const numValue = parseInt(cleanValue);
                          setDonationAmount(numValue || 0);
                        }}
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={handleDonation}
                      disabled={!selectedMember || !selectedCharacterId || !donationAmount}
                      className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <DollarSign className="w-5 h-5" />
                      <span>บริจาค</span>
                    </button>
                  </div>

                  {/* Character Selection */}
                  {memberSearch && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredMembers.map(([uid, member]) => {
                          const characters = memberCharacters[uid] || [];
                          return characters.map((char) => {
                            const mainClass = getMainClass(char);
                            const colors = getColors(mainClass);
                            return (
                              <div
                                key={`${uid}-${char.characterId}`}
                                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                                  selectedMember === uid && selectedCharacterId === char.characterId
                                    ? `${colors.bg} border-opacity-50`
                                    : `${colors.bg} bg-opacity-10 hover:bg-opacity-20 border-opacity-30`
                                }`}
                                onClick={() => {
                                  setSelectedMember(uid);
                                  setSelectedCharacterId(char.characterId);
                                }}
                              >
                                <div className={`p-2 ${colors.bg} bg-opacity-20 rounded-lg`}>
                                  <span className="text-lg">{getClassIcon(char.class)}</span>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-800">{member.discordName || 'ไม่ทราบ'}</p>
                                  <p className={`text-xs ${colors.text} opacity-75`}>{char.name}</p>
                                  <p className={`text-xs ${colors.text} opacity-75`}>{char.class}</p>
                                </div>
                              </div>
                            );
                          });
                        })}
                      </div>
                    </div>
                  )}
                </div>
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
                  <div className="col-span-2 flex items-center justify-center p-8 bg-red-50 rounded-xl border border-red-100">
                    <div className="text-center">
                      <UserPlus className="w-8 h-8 text-red-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">ไม่มีสมาชิกใหม่ที่รออนุมัติ</p>
                    </div>
                  </div>
                ) : (
                  pendingMembers.map((member) => (
                    <div
                      key={member.uid}
                      className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-white rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-shadow gap-2 md:gap-0"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Users className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{member.discordName || 'ไม่ทราบ'}</p>
                          <p className="text-sm text-gray-500">เข้าร่วมเมื่อ: {new Date(parseJoinedAt(member.joinedAt)).toLocaleDateString('th-TH')}</p>
                          <p className="text-xs text-gray-400">UID: {member.uid}</p>
                          {Array.isArray(memberCharacters[member.uid]) && memberCharacters[member.uid].length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {memberCharacters[member.uid].map((char, idx) => (
                                <div key={char.characterId || idx} className="text-xs text-gray-500 flex gap-1 items-center">
                                  <span>{char.name}</span>
                                  {char.class && <span className="text-gray-400">({char.class})</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="w-full md:w-auto flex flex-row gap-x-2 md:gap-2">
                        <button
                          onClick={() => handleApproveMember(member.uid)}
                          className="flex-1 md:w-auto p-2 rounded-l-lg md:rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                          title="อนุมัติ"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRejectMember(member.uid)}
                          className="flex-1 md:w-auto p-2 rounded-r-lg md:rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          title="ปฏิเสธ"
                        >
                          <X className="w-5 h-5" />
                        </button>
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
              <div key={merchant.uid} className="bg-white rounded-xl p-4 md:p-6 border border-yellow-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 md:gap-0">
                  <div className="space-y-2">
                    <div className="font-semibold text-yellow-600">{merchant.bankAccountName}</div>
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
                  </div>
                  <div className="w-full md:w-auto flex flex-row gap-x-2 md:gap-2">
                    <button
                      onClick={() => handleApproveMerchant(merchant)}
                      className="flex-1 md:w-auto p-2 rounded-l-lg md:rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                      title="อนุมัติ"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRejectMerchant(merchant)}
                      className="flex-1 md:w-auto p-2 rounded-r-lg md:rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                      title="ระงับ"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {pendingMerchants.length === 0 && (
              <div className="col-span-2 flex items-center justify-center p-8 bg-yellow-50 rounded-xl border border-yellow-100">
                <div className="text-center">
                  <Store className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
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
              filteredMembers.map(([uid, member]) => (
                <div
                  key={uid}
                  className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-white rounded-xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow gap-2 md:gap-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{member.discordName || 'ไม่ทราบ'}</p>
                      <p className="text-sm text-gray-500">เข้าร่วมเมื่อ: {new Date(parseJoinedAt(member.joinedAt)).toLocaleDateString('th-TH')}</p>
                      <p className="text-xs text-gray-400">UID: {uid}</p>
                      {Array.isArray(memberCharacters[uid]) && memberCharacters[uid].length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {memberCharacters[uid].map((char, idx) => (
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
              ))
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
      </div>
    </div>
  );
} 