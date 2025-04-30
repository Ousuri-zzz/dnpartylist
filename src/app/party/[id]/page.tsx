'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useParties } from '../../../hooks/useParties';
import { useCharacters } from '../../../hooks/useCharacters';
import { useUsers } from '../../../hooks/useUsers';
import { useAuth } from '../../../hooks/useAuth';
import { PartyCard } from '../../../components/PartyCard';
import { Character } from '../../../types/character';
import { Party, NestType } from '../../../types/party';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { toast } from 'sonner';
import { ref, update, set, get } from 'firebase/database';
import { db } from '../../../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyStats } from '../../../components/PartyStats';
import { cn } from '../../../lib/utils';
import { CharacterChecklist } from '../../../components/CharacterChecklist';
import type { CharacterChecklist as CharacterChecklistType } from '../../../types/character';
import { Pencil, LogOut, UserMinus, Sparkles, UserPlus, Sword, Target, Heart, Zap, Camera } from 'lucide-react';
import { CLASS_TO_ROLE, getClassColors } from '@/config/theme';
import { CharacterClass, Role } from '@/types/character';
import { toBlob } from 'html-to-image';
import { DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface PartyMember {
  character: Character;
  discordName: string;
  joinedAt?: string;
}

interface PartyStats {
  atk: number;
  hp: number;
  pdef: number;
  mdef: number;
  cri: number;
  ele: number;
  fd: number;
}

const CLASS_GRADIENTS: Record<string, { bg: string; text: string; border: string; icon?: string }> = {
  Warrior:   { bg: 'from-red-100/80 to-rose-100/50', text: 'text-red-600', border: 'border-red-300', icon: '⚔️' },
  Archer:    { bg: 'from-emerald-100/80 to-green-100/50', text: 'text-emerald-600', border: 'border-emerald-300', icon: '🏹' },
  Sorceress: { bg: 'from-purple-100/80 to-violet-100/50', text: 'text-purple-600', border: 'border-purple-300', icon: '🔮' },
  Cleric:    { bg: 'from-sky-100/80 to-blue-100/50', text: 'text-sky-600', border: 'border-sky-300', icon: '✨' },
  Academic:  { bg: 'from-amber-100/80 to-yellow-100/50', text: 'text-amber-600', border: 'border-amber-300', icon: '🔧' },
  Default:   { bg: 'from-gray-100/80 to-gray-100/50', text: 'text-gray-700', border: 'border-gray-200', icon: '👤' }
};

export default function PartyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { parties, loading: partiesLoading, joinPartyWithKickIfNeeded } = useParties();
  const { characters: userCharacters, loading: charactersLoading } = useCharacters();
  const { users, loading: usersLoading } = useUsers();
  const [party, setParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [goals, setGoals] = useState<{ atk?: number; hp?: number }>({});
  const [isJoining, setIsJoining] = useState(false);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [selectedMember, setSelectedMember] = useState<PartyMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [kickTarget, setKickTarget] = useState<string | null>(null);
  const [confirmJoinKickOpen, setConfirmJoinKickOpen] = useState(false);
  const [pendingJoinCharacter, setPendingJoinCharacter] = useState<Character | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [partyMessage, setPartyMessage] = useState('');
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDiscordLink, setShowDiscordLink] = useState(false);
  const [isDiscordModalOpen, setIsDiscordModalOpen] = useState(false);
  const [discordLink, setDiscordLink] = useState('');
  const [isSavingDiscordLink, setIsSavingDiscordLink] = useState(false);
  const [partyDiscordLink, setPartyDiscordLink] = useState('');
  const { id } = params;

  useEffect(() => {
    if (!partiesLoading && !charactersLoading && !usersLoading) {
      const foundParty = parties.find(p => p.id === params.id);
      
      if (foundParty) {
        setParty(foundParty);
        const processedMembers: PartyMember[] = [];
        
        if (foundParty.members && typeof foundParty.members === 'object') {
          Object.entries(foundParty.members).forEach(([charId, memberData]) => {
            const userId = typeof memberData === 'boolean' 
              ? Object.entries(users).find(([, userData]) => userData.characters?.[charId])?.[0]
              : (memberData as { userId: string; joinedAt?: string }).userId;
            
            if (userId && users[userId]?.characters?.[charId]) {
              let character = users[userId].characters[charId];
              if (!character.stats) {
                const foundChar = userCharacters?.find(c => c.id === charId);
                if (foundChar && foundChar.stats) {
                  character = { ...character, stats: foundChar.stats };
                }
              }
              processedMembers.push({
                character: {
                  ...character,
                  id: charId,
                  userId,
                  stats: character.stats
                },
                discordName: users[userId].meta?.discord || 'ไม่ทราบ',
                joinedAt: typeof memberData === 'object' && memberData.joinedAt ? memberData.joinedAt : undefined
              });
            }
          });
        }
        
        // Sort members by join date
        processedMembers.sort((a, b) => {
          if (!a.joinedAt) return 1;
          if (!b.joinedAt) return -1;
          return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
        });
        
        setMembers(processedMembers);
        
        if (foundParty.goals) {
          setGoals(foundParty.goals);
        }
        
        // Set party message if it exists
        if (foundParty.message) {
          setPartyMessage(foundParty.message);
        }
      } else {
        toast.error('ไม่พบปาร์ตี้');
        router.push('/party');
      }
      setLoading(false);
    }
  }, [partiesLoading, charactersLoading, usersLoading, parties, params.id, router, users]);

  // Add new useEffect for user data check
  useEffect(() => {
    const checkUserData = async () => {
      if (!user || authLoading) return;

      try {
        // Check Discord name
        const discordRef = ref(db, `users/${user.uid}/meta/discord`);
        const discordSnapshot = await get(discordRef);
        const discordName = discordSnapshot.val();

        // Check characters
        const charactersRef = ref(db, `users/${user.uid}/characters`);
        const charactersSnapshot = await get(charactersRef);
        const characters = charactersSnapshot.val();

        // Redirect if no Discord name or no characters
        if (!discordName || !characters || Object.keys(characters).length === 0) {
          router.push(`/mypage?redirect=/party/${id}`);
        }
      } catch (error) {
        console.error('Error checking user data:', error);
      }
    };

    checkUserData();
  }, [user, authLoading, router, id]);

  useEffect(() => {
    if (party?.discordLink) {
      setPartyDiscordLink(party.discordLink);
    }
  }, [party?.discordLink]);

  const calculatePartyStats = (): PartyStats => {
    if (members.length === 0) {
      return {
        atk: 0,
        hp: 0,
        pdef: 0,
        mdef: 0,
        cri: 0,
        ele: 0,
        fd: 0
      };
    }

    const totalStats = members.reduce((acc, member) => {
      const stats = member.character.stats;
      return {
        atk: acc.atk + (stats?.atk || 0),
        hp: acc.hp + (stats?.hp || 0),
        pdef: acc.pdef + (stats?.pdef || 0),
        mdef: acc.mdef + (stats?.mdef || 0),
        cri: acc.cri + (stats?.cri || 0),
        ele: acc.ele + (stats?.ele || 0),
        fd: acc.fd + (stats?.fd || 0)
      };
    }, {
      atk: 0,
      hp: 0,
      pdef: 0,
      mdef: 0,
      cri: 0,
      ele: 0,
      fd: 0
    });

    const memberCount = members.length;
    return {
      atk: Math.round(totalStats.atk / memberCount),
      hp: Math.round(totalStats.hp / memberCount),
      pdef: Math.round(totalStats.pdef / memberCount),
      mdef: Math.round(totalStats.mdef / memberCount),
      cri: Math.round(totalStats.cri / memberCount),
      ele: Math.round(totalStats.ele / memberCount),
      fd: Math.round(totalStats.fd / memberCount)
    };
  };

  const formatStat = (value: number | undefined | null, type: 'number' | 'percentage' = 'number') => {
    if (value === undefined || value === null) return '-';
    const safeValue = value ?? 0;
    if (type === 'percentage') {
      return `${safeValue}%`;
    }
    return safeValue.toLocaleString();
  };

  // Debug log เฉพาะตอน dev
  if (process.env.NODE_ENV === 'development') {
    console.log('members:', members.map(m => ({
      name: m.character.name,
      stats: m.character.stats
    })));
  }

  const handleSetGoals = async () => {
    if (!party || !user || user.uid !== party.leader) return;

    try {
      const partyRef = ref(db, `parties/${party.id}/goals`);
      await update(partyRef, goals);
      toast.success('อัพเดทเป้าหมายสำเร็จ');
      setIsGoalDialogOpen(false);
    } catch (error) {
      console.error('Error updating party goals:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const { isFull, hasUserInParty, canJoinParty, availableCharacters } = useMemo(() => {
    const count = Object.keys(party?.members || {}).length;
    const maxMember = party?.maxMember || 4;
    const full = count >= maxMember;
    
    const hasUserInParty = party?.members && Object.entries(party.members).some(([charId, memberData]) => {
      const userId = typeof memberData === 'boolean' 
        ? Object.entries(users).find(([, userData]) => userData.characters?.[charId])?.[0]
        : (memberData as { userId: string }).userId;
      return userId === user?.uid;
    });

    const available = userCharacters?.filter(char => {
      return char && !party?.members?.[char.id] && !hasUserInParty;
    }) || [];
    
    return { 
      isFull: full,
      hasUserInParty,
      canJoinParty: user && !full && available.length > 0 && !hasUserInParty,
      availableCharacters: available
    };
  }, [party, userCharacters, user, users]);

  const handleJoinParty = async () => {
    if (!selectedCharacter || !user || !party || !party.nest) return;
    // ตรวจสอบว่าตัวละครนี้อยู่ในปาร์ตี้เนสต์เดียวกันอยู่แล้วหรือไม่
    const duplicateParty = parties.find(p => p.nest === party.nest && p.members && p.members[selectedCharacter.id]);
    if (duplicateParty) {
      setPendingJoinCharacter(selectedCharacter);
      setConfirmJoinKickOpen(true);
      return;
    }
    await doJoinParty(selectedCharacter);
  };

  const doJoinParty = async (character: Character) => {
    if (!party || !user) return;
    if (!party.nest) return; // Guard clause to ensure party.nest is defined
    setIsJoining(true);
    try {
      await joinPartyWithKickIfNeeded(party.nest!, character);
      await set(ref(db, `parties/${params.id}/members/${character.id}`), {
        userId: user.uid,
        joinedAt: new Date().toISOString()
      });
      toast.success('เข้าร่วมปาร์ตี้สำเร็จ');
      setShowCharacterSelect(false);
      setSelectedCharacter(null);
      router.refresh();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
    setIsJoining(false);
  };

  const getClassColor = (characterClass: CharacterClass) => {
    const role = CLASS_TO_ROLE[characterClass];
    const colors = getClassColors(role);
    return {
      bg: colors.bg,
      text: colors.text,
      border: colors.border,
      icon: colors.icon
    };
  };

  const handleMemberClick = (member: PartyMember) => {
    setSelectedMember(member);
    setIsDialogOpen(true);
  };

  const handleChecklistChange = async (newChecklist: CharacterChecklistType) => {
    if (!selectedMember || !user) return;
    
    try {
      const characterRef = ref(db, `users/${selectedMember.character.userId}/characters/${selectedMember.character.id}/checklist`);
      await update(characterRef, newChecklist);
      toast.success('อัพเดทรายการกิจกรรมสำเร็จ');
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleEditPartyName = async () => {
    if (!party || !user || user.uid !== party.leader) return;
    if (!newPartyName.trim()) {
      toast.error('กรุณากรอกชื่อปาร์ตี้ใหม่');
      return;
    }
    try {
      await set(ref(db, `parties/${party.id}/name`), newPartyName.trim());
      toast.success('เปลี่ยนชื่อปาร์ตี้สำเร็จ');
      setIsEditNameOpen(false);
      setNewPartyName('');
      router.refresh();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleLeaveParty = async () => {
    if (!party || !user) return;
    let myCharId: string | undefined = undefined;
    let myIsLeader = false;
    let nextLeaderUserId: string | undefined = undefined;
    let nextLeaderCharId: string | undefined = undefined;
    // หา myCharId และตรวจสอบว่าเป็นหัวหน้าหรือไม่ พร้อมหา next leader
    for (const [charId, memberData] of Object.entries(party.members || {})) {
      let userId: string | undefined;
      if (typeof memberData === 'boolean') {
        userId = Object.entries(users).find(([, userData]) => userData.characters?.[charId])?.[0];
      } else {
        userId = (memberData as { userId: string }).userId;
      }
      if (userId === user.uid) {
        myCharId = charId;
        if (party.leader === user.uid) myIsLeader = true;
      } else if (!nextLeaderUserId) {
        nextLeaderUserId = userId;
        nextLeaderCharId = charId;
      }
    }
    if (!myCharId) {
      toast.error('ไม่พบตัวละครของคุณในปาร์ตี้นี้');
      return;
    }
    try {
      // ถ้าเป็นหัวหน้าและมีสมาชิกคนถัดไป ให้เปลี่ยน leader ก่อน
      if (myIsLeader && nextLeaderUserId) {
        await set(ref(db, `parties/${party.id}/leader`), nextLeaderUserId);
      }
      await set(ref(db, `parties/${party.id}/members/${myCharId}`), null);
      toast.success('ออกจากปาร์ตี้สำเร็จ');
      router.push('/party');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleKickMember = async (charId: string) => {
    if (!party || !user || user.uid !== party.leader) return;
    try {
      await set(ref(db, `parties/${party.id}/members/${charId}`), null);
      toast.success('เตะสมาชิกออกจากปาร์ตี้สำเร็จ');
      router.refresh();
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleCapturePartyImage = async () => {
    try {
      setIsCapturing(true);
      const element = document.getElementById('party-snapshot-area');
      if (!element) {
        toast.error('ไม่พบข้อมูลปาร์ตี้');
        return;
      }

      const blob = await toBlob(element, {
        backgroundColor: '#fdf2f8', // Light pink background to match the theme
        quality: 1.0,
        pixelRatio: 2, // Higher quality for retina displays
      });

      if (!blob) {
        toast.error('ไม่สามารถสร้างภาพได้');
        return;
      }

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      toast.success('คัดลอกรูปภาพปาร์ตี้สำเร็จ');
    } catch (error) {
      console.error('Error capturing party image:', error);
      toast.error('เกิดข้อผิดพลาดในการคัดลอกรูปภาพ');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSaveMessage = async () => {
    if (!party || !user) return;
    
    // Check if user is a member of the party
    const isMember = Object.entries(party.members || {}).some(([charId, memberData]) => {
      const userId = typeof memberData === 'boolean' 
        ? Object.entries(users).find(([, userData]) => userData.characters?.[charId])?.[0]
        : (memberData as { userId: string }).userId;
      return userId === user.uid;
    });
    
    if (!isMember) {
      toast.error('คุณต้องเป็นสมาชิกของปาร์ตี้นี้จึงจะสามารถแก้ไขข้อความได้');
      return;
    }
    
    setIsSavingMessage(true);
    try {
      await set(ref(db, `parties/${party.id}/message`), partyMessage);
      toast.success('บันทึกข้อความสำเร็จ');
    } catch (error) {
      console.error('Error saving party message:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSavingMessage(false);
    }
  };

  const handleDiscordLink = () => {
    setShowDiscordLink(true);
    setMessage(prev => {
      if (prev.includes('discord.gg/')) return prev;
      return prev + ' discord.gg/';
    });
  };

  const sanitizeDiscordLink = (input: string): string => {
    if (!input) return '';
    // ถ้าเป็นลิงก์เต็มที่มี https:// หรือ http:// อยู่แล้ว
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return input;
    }
    // ถ้าเป็นแค่ code
    return `https://discord.gg/${input}`;
  };

  const handleSaveDiscordLink = async () => {
    if (!party || !user || !hasUserInParty) return;
    
    setIsSavingDiscordLink(true);
    try {
      const link = discordLink.trim();
      if (!link) {
        await set(ref(db, `parties/${party.id}/discordLink`), null);
        toast.success('ลบ Discord link สำเร็จ');
      } else {
        const sanitizedLink = sanitizeDiscordLink(link);
        await set(ref(db, `parties/${party.id}/discordLink`), sanitizedLink);
        toast.success('บันทึก Discord link สำเร็จ');
      }
      setIsDiscordModalOpen(false);
      setDiscordLink('');
    } catch (error) {
      console.error('Error saving Discord link:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSavingDiscordLink(false);
    }
  };

  const handleDeleteDiscordLink = async () => {
    if (!party || !user || !hasUserInParty) return;
    
    setIsSavingDiscordLink(true);
    try {
      await set(ref(db, `parties/${party.id}/discordLink`), null);
      setPartyDiscordLink('');
      toast.success('ลบ Discord link สำเร็จ');
    } catch (error) {
      console.error('Error deleting Discord link:', error);
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSavingDiscordLink(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 p-6 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!party) {
    return null;
  }

  const partyStats = calculatePartyStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            onClick={() => router.push('/party')}
            className="px-6 py-2 rounded-xl font-medium bg-white hover:bg-white/90 text-gray-700 border border-gray-200/50 shadow-sm transition-all duration-300 hover:shadow flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <path d="m15 18-6-6 6-6"/>
            </svg>
            กลับไปหน้าปาร์ตี้
          </Button>

          <div className="flex gap-3">
            <Button 
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                !canJoinParty && !hasUserInParty
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : hasUserInParty
                  ? "bg-white text-red-500 border border-red-200 hover:bg-red-50"
                  : "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-lg hover:from-pink-600 hover:to-purple-600"
              }`}
              onClick={hasUserInParty ? () => setConfirmLeaveOpen(true) : () => setShowCharacterSelect(true)}
              disabled={!canJoinParty && !hasUserInParty}
            >
              {isFull && !hasUserInParty ? "ปาร์ตี้เต็มแล้ว" :
               hasUserInParty ? (
                 <span className="flex items-center gap-2"><LogOut className="w-4 h-4" /> ออกจากปาร์ตี้</span>
               ) :
               !user ? "กรุณาเข้าสู่ระบบ" :
               availableCharacters.length === 0 ? "ไม่มีตัวละครที่สามารถเข้าร่วมได้" :
               "เข้าร่วมปาร์ตี้"}
            </Button>
          </div>
        </div>

        <div id="party-snapshot-area">
          {party?.nest && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 text-center mb-4"
            >
              <div className="relative w-full">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-400/5 via-purple-400/5 to-blue-400/5 blur-2xl transform scale-150" />
                <div className="relative flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-50/80 to-purple-50/80 border border-pink-100/30 shadow-sm">
                  <div className="h-[1px] w-8 bg-gradient-to-r from-pink-200 to-transparent" />
                  <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                    {party.nest}
                  </h1>
                  <div className="h-[1px] w-8 bg-gradient-to-l from-purple-200 to-transparent" />
                </div>
              </div>
            </motion.div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-xl font-bold text-violet-700 flex items-center gap-2">
                    {party.name}
                    {user?.uid === party.leader && (
                      <button
                        className="ml-2 p-1 rounded hover:bg-gray-100 transition"
                        onClick={() => {
                          setIsEditNameOpen(true);
                          setNewPartyName(party.name);
                        }}
                        title="แก้ไขชื่อปาร์ตี้"
                      >
                        <Pencil className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/30">
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👑</span>
                          <span className="font-medium">หัวหน้าปาร์ตี้:</span>
                        </div>
                        <span className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                          {users[party.leader]?.meta?.discord || 'ไม่ทราบ'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👥</span>
                          <span className="font-medium">จำนวนสมาชิก:</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 border border-pink-200/50">
                          <span className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                            {Object.keys(party.members || {}).length}
                          </span>
                          <span className="text-sm text-gray-500">/</span>
                          <span className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                            {party.maxMember || 4}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/30">
                    <div className="flex items-center mb-3 gap-2">
                      <h4 className="font-semibold text-base md:text-lg text-gray-800 tracking-wide">Status แนะนำ</h4>
                      {user?.uid === party.leader && (
                        <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                          <DialogTrigger asChild>
                            <button className="p-1 rounded-full hover:bg-violet-100 transition" title="แก้ไข Status แนะนำ">
                              <Sparkles className="w-5 h-5 text-violet-500" />
                            </button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Status แนะนำ</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="atk">⚔️ ATK</Label>
                                  <Input
                                    id="atk"
                                    type="number"
                                    value={goals.atk || ''}
                                    onChange={(e) => setGoals({ ...goals, atk: Number(e.target.value) })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="hp">❤️ HP</Label>
                                  <Input
                                    id="hp"
                                    type="number"
                                    value={goals.hp || ''}
                                    onChange={(e) => setGoals({ ...goals, hp: Number(e.target.value) })}
                                  />
                                </div>
                              </div>
                              <Button onClick={handleSetGoals}>บันทึก</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/50">
                        <div className="flex items-center gap-2">
                          <span className="text-pink-600 text-lg">⚔️</span>
                          <span className="font-medium">ATK:</span>
                        </div>
                        <span className="font-semibold text-pink-600">
                          {party.goals?.atk ? formatStat(party.goals.atk) : "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/50">
                        <div className="flex items-center gap-2">
                          <span className="text-red-600 text-lg">❤️</span>
                          <span className="font-medium">HP:</span>
                        </div>
                        <span className="font-semibold text-red-600">
                          {party.goals?.hp ? formatStat(party.goals.hp) : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base md:text-lg font-bold text-gray-800 tracking-wide">ค่าเฉลี่ย</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <PartyStats members={members.map(m => m.character)} />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base md:text-lg font-bold text-gray-800 tracking-wide">สมาชิก</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                    onClick={() => setIsInviteOpen(true)}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    เชิญเพื่อน
                  </Button>
                  <Button
                    variant="outline"
                    className="bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600"
                    onClick={handleCapturePartyImage}
                    disabled={isCapturing}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    📸 คัดลอกรูปภาพปาร์ตี้
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {members.map((member) => {
                    const colors = getClassColor(member.character.class);
                    return (
                      <motion.button
                        key={member.character.id}
                        onClick={() => handleMemberClick(member)}
                        className={`p-5 rounded-xl shadow transition-all duration-300 ${colors.bg} border ${colors.border} hover:shadow-lg hover:scale-[1.02] transform text-left relative`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {user?.uid === party.leader && member.character.userId !== user.uid && (
                          <button
                            className="absolute top-2 right-2 p-1 rounded-full bg-white border border-red-200 hover:bg-red-100 transition z-10"
                            title="เตะสมาชิกออกจากปาร์ตี้"
                            onClick={e => { e.stopPropagation(); setKickTarget(member.character.id); }}
                          >
                            <UserMinus className="w-5 h-5 text-red-600" />
                          </button>
                        )}
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-extrabold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
                              {member.discordName}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800 text-base">
                                {member.character.name}
                              </span>
                              <div className={`px-3 py-1 rounded-lg bg-white/80 border ${colors.border} flex items-center justify-center shadow-sm`}>
                                <span className="text-lg mr-2">{colors.icon}</span>
                                <span className="text-sm font-semibold text-gray-700">
                                  {member.character.class}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/80">
                                <span className="text-pink-600 text-lg">⚔️</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  ATK:
                                </span>
                                <span className="text-base font-bold text-pink-700">
                                  {formatStat(member.character.stats?.atk)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/80">
                                <span className="text-red-600 text-lg">❤️</span>
                                <span className="text-sm font-semibold text-gray-800">
                                  HP:
                                </span>
                                <span className="text-base font-bold text-red-700">
                                  {formatStat(member.character.stats?.hp)}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/80">
                                <span className="text-blue-600 text-lg">🛡️</span>
                                <span className="text-sm font-semibold text-gray-800">DEF:</span>
                                <span className="text-sm font-bold text-blue-700">P.{formatStat(member.character.stats?.pdef ?? 0, 'percentage')}</span>
                                <span className="text-sm font-bold text-purple-700">M.{formatStat(member.character.stats?.mdef ?? 0, 'percentage')}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/80">
                                <span className="text-purple-600 text-lg">🎯</span>
                                <span className="text-sm font-semibold text-gray-800">CRI:</span>
                                <span className="text-base font-bold text-purple-700">{formatStat(member.character.stats?.cri, 'percentage')}</span>
                              </div>
                              {member.character.stats?.ele !== undefined && (
                                <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/80">
                                  <span className="text-yellow-600 text-lg">⚡</span>
                                  <span className="text-sm font-semibold text-gray-800">ELE:</span>
                                  <span className="text-base font-bold text-yellow-700">{formatStat(member.character.stats?.ele, 'percentage')}</span>
                                </div>
                              )}
                              {member.character.stats?.fd !== undefined && (
                                <div className="flex items-center space-x-2 p-2 rounded-lg bg-white/80">
                                  <span className="text-green-600 text-lg">💥</span>
                                  <span className="text-sm font-semibold text-gray-800">FD:</span>
                                  <span className="text-base font-bold text-green-700">{formatStat(member.character.stats?.fd, 'percentage')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Dialog open={showCharacterSelect} onOpenChange={setShowCharacterSelect}>
          <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-pink-50/80 to-purple-50/80 backdrop-blur-xl border border-pink-100/30">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                เลือกตัวละครเข้าร่วมปาร์ตี้
              </DialogTitle>
              <p className="text-gray-500 mt-2">เลือกตัวละครที่คุณต้องการใช้เข้าร่วมปาร์ตี้นี้</p>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6 max-h-[60vh] overflow-y-auto px-1">
              {availableCharacters.map((char) => {
                const colors = getClassColor(char.class);
                // Mapping สีพื้นหลังเข้มขึ้น
                let strongBg = '';
                switch (colors.bg) {
                  case 'bg-red-50': strongBg = 'bg-red-100'; break;
                  case 'bg-emerald-50': strongBg = 'bg-emerald-100'; break;
                  case 'bg-purple-50': strongBg = 'bg-purple-100'; break;
                  case 'bg-sky-50': strongBg = 'bg-sky-100'; break;
                  case 'bg-yellow-50': strongBg = 'bg-yellow-100'; break;
                  case 'bg-amber-50': strongBg = 'bg-yellow-100'; break;
                  default: strongBg = 'bg-gray-100'; break;
                }
                return (
                  <motion.button
                    key={char.id}
                    onClick={() => setSelectedCharacter(char)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl ${strongBg} border ${
                      selectedCharacter === char 
                        ? `${colors.border} shadow-lg` 
                        : 'border-transparent'
                    } transition-all duration-300 text-left group relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>

                    <div className="relative z-10">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl ${strongBg} border ${colors.border} flex items-center justify-center shadow-inner`}>
                          <span className="text-2xl">{colors.icon}</span>
                        </div>
                        <div>
                          <h3 className={`text-lg font-bold ${colors.text.replace('bg-clip-text text-transparent','').replace('bg-gradient-to-r','').replace('from-','text-').replace('to-','')}`}>{char.name}</h3>
                          <p className="text-sm text-gray-600">{char.class}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-pink-600">⚔️</span>
                          <span className="text-sm text-gray-600">
                            ATK: {formatStat(char.stats?.atk)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-red-600">❤️</span>
                          <span className="text-sm text-gray-600">
                            HP: {formatStat(char.stats?.hp)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600">🛡️</span>
                          <span className="text-sm text-gray-600">
                            DEF: {formatStat(char.stats?.pdef, 'percentage')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-purple-600">🎯</span>
                          <span className="text-sm text-gray-600">
                            CRI: {formatStat(char.stats?.cri, 'percentage')}
                          </span>
                        </div>
                      </div>

                      {selectedCharacter === char && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full bg-gradient-to-r ${colors.text} flex items-center justify-center`}
                        >
                          <span className="text-white text-sm">✓</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-pink-100/30">
              <Button
                variant="outline"
                onClick={() => setShowCharacterSelect(false)}
                className="px-6"
              >
                ยกเลิก
              </Button>
              <Button 
                onClick={handleJoinParty}
                disabled={!selectedCharacter || isJoining}
                className={`px-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 disabled:from-gray-200 disabled:to-gray-300`}
              >
                {isJoining ? (
                  <div className="flex items-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    กำลังเข้าร่วม...
                  </div>
                ) : (
                  "ยืนยัน"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md overflow-y-auto p-0 bg-transparent border-none">
            <AnimatePresence mode="wait">
              {selectedMember && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 30
                  }}
                  className="relative"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl blur-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                  <div className="relative">
                    <div className={cn(
                      "relative overflow-hidden rounded-xl border-2 transition-all duration-300",
                      "bg-gradient-to-br from-white/90 to-white/70",
                      "shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]",
                      getClassColor(selectedMember.character.class).border,
                      "hover:shadow-lg"
                    )}>
                      {/* Decorative corner elements */}
                      <div className={cn("absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg", getClassColor(selectedMember.character.class).border)}></div>
                      <div className={cn("absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg", getClassColor(selectedMember.character.class).border)}></div>
                      <div className={cn("absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg", getClassColor(selectedMember.character.class).border)}></div>
                      <div className={cn("absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg", getClassColor(selectedMember.character.class).border)}></div>

                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <div className={cn(
                            "w-12 h-12 rounded-lg flex items-center justify-center",
                            "bg-gradient-to-br from-pink-200 to-purple-200 border shadow-inner",
                            getClassColor(selectedMember.character.class).border
                          )}>
                            <span className="text-2xl">{getClassColor(selectedMember.character.class).icon}</span>
                          </div>
                          <div>
                            <h3 className={cn("text-xl font-bold", getClassColor(selectedMember.character.class).text)}>
                              {selectedMember.character.name}
                            </h3>
                            <p className={cn("text-sm font-medium", getClassColor(selectedMember.character.class).text)}>
                              {selectedMember.character.class}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {selectedMember.discordName}
                            </p>
                          </div>
                        </div>

                        <CharacterChecklist
                          checklist={selectedMember.character.checklist}
                          onChange={handleChecklistChange}
                          accentColor={getClassColor(selectedMember.character.class).text}
                          readOnly={true}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
          <DialogContent className="max-w-md p-4">
            <DialogHeader className="mb-4">
              <DialogTitle>แก้ไขชื่อปาร์ตี้</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={newPartyName}
                onChange={e => setNewPartyName(e.target.value)}
                placeholder="กรอกชื่อปาร์ตี้ใหม่"
                maxLength={30}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditNameOpen(false)}>
                  ยกเลิก
                </Button>
                <Button onClick={handleEditPartyName}>
                  บันทึก
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
          <DialogContent className="max-w-md p-4">
            <DialogHeader className="mb-4">
              <DialogTitle>ยืนยันการออกจากปาร์ตี้</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>คุณต้องการออกจากปาร์ตี้นี้จริงหรือไม่?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmLeaveOpen(false)}>
                  ยกเลิก
                </Button>
                <Button variant="destructive" onClick={() => { setConfirmLeaveOpen(false); handleLeaveParty(); }}>
                  ออกจากปาร์ตี้
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!kickTarget} onOpenChange={open => { if (!open) setKickTarget(null); }}>
          <DialogContent className="max-w-md p-4">
            <DialogHeader className="mb-4">
              <DialogTitle>ยืนยันการเตะสมาชิก</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>คุณต้องการเตะสมาชิกนี้ออกจากปาร์ตี้จริงหรือไม่?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setKickTarget(null)}>
                  ยกเลิก
                </Button>
                <Button variant="destructive" onClick={() => { if (kickTarget) { handleKickMember(kickTarget); setKickTarget(null); } }}>
                  เตะสมาชิก
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmJoinKickOpen} onOpenChange={setConfirmJoinKickOpen}>
          <DialogContent className="max-w-md p-4">
            <DialogHeader className="mb-4">
              <DialogTitle>ยืนยันการลบตัวละครออกจากปาร์ตี้เดิม</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>ตัวละครนี้อยู่ในปาร์ตี้เนสต์เดียวกันอยู่แล้ว ต้องการลบออกจากปาร์ตี้เดิมและเข้าร่วมปาร์ตี้นี้หรือไม่?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setConfirmJoinKickOpen(false); setPendingJoinCharacter(null); }}>
                  ยกเลิก
                </Button>
                <Button variant="destructive" onClick={async () => {
                  setConfirmJoinKickOpen(false);
                  if (pendingJoinCharacter) {
                    await doJoinParty(pendingJoinCharacter);
                    setPendingJoinCharacter(null);
                  }
                }}>
                  ยืนยัน
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-pink-50/80 to-purple-50/80 backdrop-blur-xl border border-pink-100/30">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                เชิญเพื่อนเข้าร่วมปาร์ตี้
              </DialogTitle>
              <p className="text-gray-500 mt-2">เพิ่มข้อความนัดหมายเพื่อเชิญเพื่อนเข้าร่วมปาร์ตี้</p>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-message">ข้อความนัดหมาย</Label>
                <textarea
                  id="invite-message"
                  className="w-full min-h-[100px] rounded-lg border border-gray-200 bg-white/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="เพิ่มข้อความนัดหมาย เช่น เวลานัด หรือสถานที่นัดพบ"
                  value={inviteMsg}
                  onChange={(e) => setInviteMsg(e.target.value)}
                />
              </div>
              <div className="bg-white/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-gray-700">ตัวอย่างข้อความเชิญ:</h4>
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {`📢 นัดหมายปาร์ตี้!

🧩 Party Name: ${party?.name}
🏰 Nest: ${party?.nest}

👥 รายชื่อสมาชิก:
${members.map(m => `- @${m.discordName} (${m.character.class})`).join('\n')}

🕒 ข้อความนัดหมาย:
"${inviteMsg || 'พร้อมแล้ว! เข้ามาได้เลย!'}"

📎 เข้าร่วมที่นี่:
${typeof window !== 'undefined' ? window.location.href : ''}`}
                </pre>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                  onClick={async () => {
                    try {
                      setIsCopying(true);
                      const inviteText = `📢 นัดหมายปาร์ตี้!

🧩 Party Name: ${party?.name}
🏰 Nest: ${party?.nest}

👥 รายชื่อสมาชิก:
${members.map(m => `- @${m.discordName} (${m.character.class})`).join('\n')}

🕒 ข้อความนัดหมาย:
"${inviteMsg || 'พร้อมแล้ว! เข้ามาได้เลย!'}"

📎 เข้าร่วมที่นี่:
${typeof window !== 'undefined' ? window.location.href : ''}`;
                      
                      await navigator.clipboard.writeText(inviteText);
                      toast.success('คัดลอกข้อความเชิญเรียบร้อย!');
                      setIsInviteOpen(false);
                    } catch (error) {
                      toast.error('เกิดข้อผิดพลาดในการคัดลอกข้อความ');
                    } finally {
                      setIsCopying(false);
                    }
                  }}
                  disabled={isCopying}
                >
                  {isCopying ? 'กำลังคัดลอก...' : 'คัดลอกข้อความ'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Party Message Box */}
      <div className="mt-8">
        <Card className="bg-white/70 backdrop-blur-sm border border-pink-100/30 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg font-bold text-gray-800 tracking-wide flex items-center gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
                    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
                    <line x1="6" y1="1" x2="6" y2="4"></line>
                    <line x1="10" y1="1" x2="10" y2="4"></line>
                    <line x1="14" y1="1" x2="14" y2="4"></line>
                  </svg>
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
                  Description
                </span>
              </div>
              {hasUserInParty && (
                <span className="text-xs text-gray-500 font-normal ml-2">
                  (สมาชิกทุกคนสามารถแก้ไขได้)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <textarea
                  className="w-full min-h-[100px] rounded-lg border border-gray-200 bg-white/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="รายละเอียด.. ชื่อปาร์ตี้ในเกม.. เวลานัด...."
                  value={partyMessage}
                  onChange={(e) => setPartyMessage(e.target.value)}
                  maxLength={300}
                  disabled={!hasUserInParty}
                />
                {hasUserInParty && (
                  <Button
                    onClick={() => setIsDiscordModalOpen(true)}
                    variant="outline"
                    className="absolute right-2 top-2 bg-white/50 border-gray-200 hover:bg-white hover:border-violet-500"
                    title="แก้ไข Discord Link"
                  >
                    <Pencil className="w-4 h-4 text-indigo-500" />
                  </Button>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {partyMessage.length}/300 อักษร
                </span>
                {hasUserInParty && (
                  <Button
                    onClick={handleSaveMessage}
                    disabled={isSavingMessage}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
                  >
                    {isSavingMessage ? (
                      <div className="flex items-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        กำลังบันทึก...
                      </div>
                    ) : (
                      "บันทึกข้อความ"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discord Link Section */}
      {partyDiscordLink && (
        <div className="mt-4">
          <Card className="bg-[#36393f] border-none shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#5865f2] flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Discord Server</h3>
                    <p className="text-gray-400 text-sm">เข้าร่วมเซิร์ฟเวอร์ Discord ของปาร์ตี้</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {hasUserInParty && (
                    <Button
                      variant="outline"
                      onClick={handleDeleteDiscordLink}
                      disabled={isSavingDiscordLink}
                      className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
                    >
                      {isSavingDiscordLink ? (
                        <div className="flex items-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full mr-2"
                          />
                          กำลังลบ...
                        </div>
                      ) : (
                        "ลบลิงก์"
                      )}
                    </Button>
                  )}
                  <Button
                    onClick={() => window.open(partyDiscordLink, '_blank')}
                    className="bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium px-6"
                  >
                    เข้าร่วม
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Discord Link Modal */}
      <Dialog open={isDiscordModalOpen} onOpenChange={setIsDiscordModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#36393f] border-none">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              Discord Link
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              เพิ่ม Discord invite link สำหรับปาร์ตี้นี้ (เฉพาะสมาชิกในปาร์ตี้เท่านั้นที่สามารถแก้ไขได้)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="discord-link" className="text-gray-300">Discord Invite Code</Label>
              <Input
                id="discord-link"
                value={discordLink}
                onChange={(e) => setDiscordLink(e.target.value)}
                placeholder="กรอก Discord invite code"
                className="flex-1 bg-[#40444b] border-[#202225] text-white placeholder:text-gray-400 focus:border-[#5865f2]"
              />
              <p className="text-xs text-gray-400">ตัวอย่าง: xxxxxxxx, https://discord.gg/xxxxxxxx</p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            {partyDiscordLink && (
              <Button 
                variant="outline" 
                onClick={handleDeleteDiscordLink}
                disabled={isSavingDiscordLink}
                className="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20"
              >
                ลบลิงก์
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setIsDiscordModalOpen(false)}
              className="bg-[#40444b] border-[#202225] text-white hover:bg-[#4f545c]"
            >
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSaveDiscordLink}
              disabled={isSavingDiscordLink || !discordLink.trim()}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
            >
              {isSavingDiscordLink ? (
                <div className="flex items-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  กำลังบันทึก...
                </div>
              ) : (
                "บันทึก"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 