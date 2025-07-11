'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useParties } from '../../../hooks/useParties';
import { useCharacters } from '../../../hooks/useCharacters';
import { useUsers } from '../../../hooks/useUsers';
import { useAuth } from '../../../hooks/useAuth';
import { useGuild } from '@/hooks/useGuild';
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
import { Pencil, LogOut, UserMinus, Sparkles, UserPlus, Sword, Target, Heart, Zap, Camera, Search } from 'lucide-react';
import { CLASS_TO_ROLE, getClassColors } from '@/config/theme';
import { CharacterClass, Role } from '@/types/character';
import { toBlob } from 'html-to-image';
import { DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDebounce } from '@/hooks/useDebounce';

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

// --- Add getClassIcon function (reuse from PartyCard) ---
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
// ... existing code ...

export default function PartyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { parties, loading: partiesLoading, joinPartyWithKickIfNeeded } = useParties();
  const { characters: userCharacters, loading: charactersLoading } = useCharacters();
  const { users, isLoading: usersLoading } = useUsers();
  const { isGuildLeader } = useGuild();
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
  const [isAddCharacterConfirmOpen, setIsAddCharacterConfirmOpen] = useState(false);
  const [selectedCharacterToAdd, setSelectedCharacterToAdd] = useState<Character | null>(null);
  const [existingPartyInfo, setExistingPartyInfo] = useState<{name: string, id: string} | null>(null);
  const { id } = params;

  // เพิ่ม state สำหรับการค้นหา
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Character[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

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

  // Add this function near other utility functions
  const formatCompactNumber = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '-';
    if (value < 1000) return value.toString();
    if (value < 1000000) return `${(value / 1000).toFixed(1)}K`;
    return `${(value / 1000000).toFixed(1)}M`;
  };

  const handleSetGoals = async () => {
    if (!party || !user || (user.uid !== party.leader && !isGuildLeader)) return;

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
    const count = members.length;
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
  }, [party, userCharacters, user, users, members]);

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
    if (!party || !user || (user.uid !== party.leader && !isGuildLeader)) return;
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

      // ลบสมาชิกออกจากปาร์ตี้
      await set(ref(db, `parties/${party.id}/members/${myCharId}`), null);

      // ตรวจสอบว่าตัวละครนี้เป็นหัวหน้าปาร์ตี้ในปาร์ตี้อื่นหรือไม่
      const partiesRef = ref(db, 'parties');
      const snapshot = await get(partiesRef);
      const allParties = snapshot.val() as Record<string, Party>;

      if (allParties) {
        for (const [partyId, partyData] of Object.entries(allParties)) {
          // ข้ามปาร์ตี้ปัจจุบัน
          if (partyId === party.id) continue;

          // ตรวจสอบว่าตัวละครนี้เป็นหัวหน้าปาร์ตี้ในปาร์ตี้อื่นหรือไม่
          if (partyData.leader === user.uid && partyData.members?.[myCharId]) {
            // หาสมาชิกคนถัดไปในปาร์ตี้นั้น
            let nextLeaderInOtherParty: string | undefined;
            for (const [charId, memberData] of Object.entries(partyData.members)) {
              if (charId !== myCharId) {
                const userId = typeof memberData === 'boolean' 
                  ? Object.entries(users).find(([, userData]) => userData.characters?.[charId])?.[0]
                  : (memberData as { userId: string }).userId;
                if (userId) {
                  nextLeaderInOtherParty = userId;
                  break;
                }
              }
            }

            // ถ้ามีสมาชิกคนถัดไป ให้เปลี่ยนหัวปาร์ตี้
            if (nextLeaderInOtherParty) {
              await set(ref(db, `parties/${partyId}/leader`), nextLeaderInOtherParty);
            }
          }
        }
      }

      toast.success('ออกจากปาร์ตี้สำเร็จ');
      router.push('/party');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleKickMember = async (charId: string) => {
    if (!party || !user || (user.uid !== party.leader && !isGuildLeader)) return;
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
        backgroundColor: '#fde4ec', // พื้นหลังสีชมพูพาสเทล
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
    // อนุญาตให้หัวกิลด์แก้ไขได้
    const isMember = Object.entries(party.members || {}).some(([charId, memberData]) => {
      const userId = typeof memberData === 'boolean' 
        ? Object.entries(users).find(([, userData]) => userData.characters?.[charId])?.[0]
        : (memberData as { userId: string }).userId;
      return userId === user.uid;
    });
    if (!isMember && !isGuildLeader) {
      toast.error('คุณต้องเป็นสมาชิกของปาร์ตี้นี้หรือหัวกิลด์จึงจะสามารถแก้ไขข้อความได้');
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

  // เพิ่มฟังก์ชันค้นหาตัวละคร
  const searchCharacters = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const charactersRef = ref(db, 'users');
      const snapshot = await get(charactersRef);
      const users = snapshot.val() as Record<string, { characters?: Record<string, Character> }>;
      
      // สร้าง set ของ userId ที่อยู่ในปาร์ตี้แล้ว
      const existingMemberUserIds = new Set<string>();
      if (party?.members) {
        Object.entries(party.members).forEach(([charId, memberData]) => {
          const userId = typeof memberData === 'boolean' 
            ? Object.entries(users).find(([, userData]) => userData.characters?.[charId])?.[0]
            : (memberData as { userId: string }).userId;
          if (userId) {
            existingMemberUserIds.add(userId);
          }
        });
      }
      
      const results: Character[] = [];
      
      Object.entries(users).forEach(([userId, userData]) => {
        // ข้ามถ้าเป็นสมาชิกที่อยู่ในปาร์ตี้แล้ว
        if (existingMemberUserIds.has(userId)) {
          return;
        }

        if (userData.characters) {
          Object.entries(userData.characters).forEach(([charId, charData]) => {
            if (charData.name.toLowerCase().includes(query.toLowerCase())) {
              // ตรวจสอบว่าตัวละครนี้ยังไม่ได้อยู่ในปาร์ตี้
              if (!party?.members?.[charId]) {
                results.push({
                  ...charData,
                  id: charId,
                  userId
                });
              }
            }
          });
        }
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching characters:', error);
      toast.error('เกิดข้อผิดพลาดในการค้นหาตัวละคร');
    } finally {
      setIsSearching(false);
    }
  };

  // เพิ่มฟังก์ชันเพิ่มตัวละครเข้าปาร์ตี้
  const handleAddCharacter = async (character: Character) => {
    if (!party || !user) return;
    
    try {
      // ตรวจสอบว่าตัวละครอยู่ในปาร์ตี้เนสเดียวกันหรือไม่
      const partiesRef = ref(db, 'parties');
      const snapshot = await get(partiesRef);
      const parties = snapshot.val() as Record<string, Party>;
      
      let existingParty = null;
      if (parties) {
        Object.entries(parties).forEach(([partyId, partyData]) => {
          if (partyData.nest === party.nest && partyData.members?.[character.id]) {
            existingParty = {
              name: partyData.name,
              id: partyId
            };
          }
        });
      }

      // แสดง dialog ยืนยันทุกครั้ง
      setExistingPartyInfo(existingParty);
      setSelectedCharacterToAdd(character);
      setIsAddCharacterConfirmOpen(true);
    } catch (error) {
      console.error('Error adding character:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มตัวละคร');
    }
  };

  // ฟังก์ชันสำหรับเพิ่มตัวละครเข้าปาร์ตี้จริงๆ
  const doAddCharacter = async (character: Character) => {
    if (!party || !user) return;
    
    try {
      await set(ref(db, `parties/${party.id}/members/${character.id}`), {
        userId: character.userId,
        joinedAt: new Date().toISOString()
      });
      
      toast.success('เพิ่มตัวละครเข้าปาร์ตี้สำเร็จ');
      setSearchQuery('');
      setSearchResults([]);
      router.refresh();
    } catch (error) {
      console.error('Error adding character:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มตัวละคร');
    }
  };

  // ใช้ useEffect สำหรับการค้นหา
  useEffect(() => {
    if (debouncedSearch) {
      searchCharacters(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

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
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 space-y-6">
        <div className="flex items-center justify-between">
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

          <div className="flex gap-2">
            <Button 
              className={`px-6 py-2 rounded-xl font-medium transition-all duration-300 ${
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
          <div className="relative space-y-2 p-2 pt-1 rounded-2xl border border-pink-100/20 shadow-xl">
            {/* Content with relative positioning */}
            <div className="relative">
              {party?.nest && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex-1 text-center mb-1"
                >
                  <div className="relative w-full">
                    <div className="relative flex items-center justify-center gap-2 px-3 py-1 rounded-xl bg-white/90 backdrop-blur-sm border border-pink-200/50 shadow-lg">
                      <div className="h-[1px] w-8 bg-gradient-to-r from-pink-200 to-transparent" />
                      <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                        {party.nest}
                      </h1>
                      <div className="h-[1px] w-8 bg-gradient-to-l from-purple-200 to-transparent" />
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <Card className="bg-white/90 dark:bg-[#23232b] backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg font-bold text-violet-700 flex items-center gap-2">
                        {party.name}
                        { (user?.uid === party.leader || isGuildLeader) && (
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
                      <div className="p-4 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/30 shadow-lg">
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
                                {members.length}
                              </span>
                              <span className="text-sm text-gray-500">/</span>
                              <span className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                                {party.maxMember || 4}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/30 shadow-lg">
                        <div className="flex items-center mb-3 gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                              <Search className="w-4 h-4 text-white" />
                            </div>
                            <h4 className="font-semibold text-sm md:text-base text-gray-800 tracking-wide">ค้นหาตัวละคร</h4>
                          </div>
                          {(user?.uid === party.leader || isGuildLeader) && !isFull && (
                            <span className="text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-600 border border-pink-200">
                              สามารถเพิ่มตัวละครเข้าปาร์ตี้ได้
                            </span>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="relative group">
                            <Input
                              type="text"
                              placeholder="พิมพ์ชื่อตัวละครที่ต้องการค้นหา..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-12 pr-4 py-2.5 rounded-xl border-gray-200/50 bg-white/80 backdrop-blur-sm focus:bg-white transition-all duration-300 focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50"
                              disabled={!(user?.uid === party.leader || isGuildLeader) || isFull}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                              <Search className="w-4 h-4 text-gray-400 group-focus-within:text-pink-500 transition-colors duration-300" />
                            </div>
                            {(user?.uid === party.leader || isGuildLeader) && !isFull && searchQuery && (
                              <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
                              >
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                          {(user?.uid === party.leader || isGuildLeader) && !isFull && (
                            <>
                              {isSearching && (
                                <div className="flex justify-center py-3">
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full"
                                  />
                                </div>
                              )}
                              {searchResults.length > 0 && (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                  {searchResults.map((char) => {
                                    const colors = getClassColor(char.class);
                                    return (
                                      <motion.button
                                        key={char.id}
                                        onClick={() => handleAddCharacter(char)}
                                        className={`w-full p-3 rounded-xl ${colors.bg} border ${colors.border} hover:shadow-md transition-all duration-200 text-left group relative overflow-hidden`}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                      >
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        </div>
                                        <div className="relative z-10 flex items-center gap-3">
                                          <div className={`w-10 h-10 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center shadow-inner`}>
                                            <span className="text-xl">{colors.icon}</span>
                                          </div>
                                          <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">{char.name}</h4>
                                            <p className="text-sm text-gray-600">{char.class}</p>
                                          </div>
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <div className="px-3 py-1.5 rounded-lg bg-white/90 border border-pink-200 text-pink-600 text-sm font-medium">
                                              เพิ่มเข้าปาร์ตี้
                                            </div>
                                          </div>
                                        </div>
                                      </motion.button>
                                    );
                                  })}
                                </div>
                              )}
                              {!isSearching && searchQuery && searchResults.length === 0 && (
                                <div className="text-center py-6">
                                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <p className="text-gray-500 text-sm">
                                    ไม่พบตัวละครที่ค้นหา
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white/90 dark:bg-[#23232b] backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center space-y-0 pb-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base font-bold text-gray-800 tracking-wide">ค่าเฉลี่ย</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PartyStats members={members.map(m => m.character)} />
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white/90 dark:bg-[#23232b]/80 backdrop-blur-sm mb-2">
                <CardContent className="pt-8 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    {members.map((member) => {
                      const colors = getClassColor(member.character.class);
                      return (
                        <motion.button
                          key={member.character.id}
                          onClick={() => handleMemberClick(member)}
                          className={`p-5 rounded-2xl shadow transition-all duration-300 ${colors.bg} border ${colors.border} hover:shadow-lg hover:scale-[1.03] transform text-left relative`}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          { (user?.uid === party.leader || isGuildLeader) && user && member.character.userId !== user.uid && (
                            <button
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 border border-red-200 hover:bg-red-100 transition z-10"
                              title="เตะสมาชิกออกจากปาร์ตี้"
                              onClick={e => { e.stopPropagation(); setKickTarget(member.character.id); }}
                            >
                              <UserMinus className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-col gap-1">
                              <h3 className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm truncate">
                                {member.discordName}
                              </h3>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 text-base truncate max-w-[140px]">
                                  {member.character.name}
                                </span>
                                <div className={`px-2 py-0.5 rounded-md bg-white/90 border ${colors.border} flex items-center justify-center shadow-sm`}>
                                  <span className="text-base mr-1">{getClassIcon(member.character.class)}</span>
                                  <span className="text-xs font-medium text-gray-700">{member.character.class}</span>
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2 mt-1">
                              <div className="flex flex-col gap-1 col-span-3">
                                <div className="flex items-center space-x-1.5 p-2 rounded-md bg-white/90">
                                  <span className="text-pink-600 text-base">⚔️</span>
                                  <span className="text-xs font-medium text-gray-800">ATK:</span>
                                  <span className="text-base font-bold text-pink-700">{formatCompactNumber(member.character.stats?.atk)}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 p-2 rounded-md bg-white/90">
                                  <span className="text-red-600 text-base">❤️</span>
                                  <span className="text-xs font-medium text-gray-800">HP:</span>
                                  <span className="text-base font-bold text-red-700">{formatCompactNumber(member.character.stats?.hp)}</span>
                                </div>
                                <div className="flex items-center space-x-1.5 p-2 rounded-md bg-white/90">
                                  <span className="text-blue-600 text-base">🛡️</span>
                                  <span className="text-xs font-medium text-gray-800">DEF:</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-blue-700">P{formatStat(member.character.stats?.pdef ?? 0, 'percentage')}</span>
                                    <span className="text-xs font-bold text-purple-700">M{formatStat(member.character.stats?.mdef ?? 0, 'percentage')}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1 col-span-2">
                                <div className="flex items-center space-x-1.5 p-2 rounded-md bg-white/90">
                                  <span className="text-purple-600 text-base">🎯</span>
                                  <span className="text-xs font-medium text-gray-800">CRI:</span>
                                  <span className="text-xs font-bold text-purple-700">{formatStat(member.character.stats?.cri, 'percentage')}</span>
                                </div>
                                {member.character.stats?.ele !== undefined && (
                                  <div className="flex items-center space-x-1.5 p-2 rounded-md bg-white/90">
                                    <span className="text-yellow-600 text-base">⚡</span>
                                    <span className="text-xs font-medium text-gray-800">ELE:</span>
                                    <span className="text-xs font-bold text-yellow-700">{formatStat(member.character.stats?.ele, 'percentage')}</span>
                                  </div>
                                )}
                                {member.character.stats?.fd !== undefined && (
                                  <div className="flex items-center space-x-1.5 p-2 rounded-md bg-white/90">
                                    <span className="text-green-600 text-base">💥</span>
                                    <span className="text-xs font-medium text-gray-800">FD:</span>
                                    <span className="text-xs font-bold text-green-700">{formatStat(member.character.stats?.fd, 'percentage')}</span>
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

              {/* Party Message Box (description) moved inside snapshot area */}
              <div className="mt-6">
                <Card className="bg-white/70 dark:bg-[#23232b]/80 backdrop-blur-sm border border-pink-100/30 shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
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
                        <div>
                          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
                            Description
                          </span>
                          {hasUserInParty && (
                            <span className="text-xs text-gray-500 font-normal ml-2">
                              (สมาชิกทุกคนสามารถแก้ไขได้)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {hasUserInParty && (
                          <Button
                            onClick={() => setIsDiscordModalOpen(true)}
                            variant="outline"
                            className="hidden sm:flex bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
                            title="แก้ไข Discord Link"
                          >
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                            </svg>
                            Discord Link
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          className="hidden sm:flex bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                          onClick={() => setIsInviteOpen(true)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          คัดลอกลิ้งเชิญ
                        </Button>
                        <Button
                          variant="outline"
                          className="hidden sm:flex bg-gradient-to-r from-green-500 to-teal-500 text-white hover:from-green-600 hover:to-teal-600"
                          onClick={handleCapturePartyImage}
                          disabled={isCapturing}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          📸 คัดลอกรูปภาพปาร์ตี้
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="relative">
                        <textarea
                          className="w-full min-h-[100px] rounded-lg border border-gray-200 bg-white/50 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="รายละเอียด, เวลานัด, ชื่อปาร์ตี้ในเกม..."
                          value={partyMessage}
                          onChange={(e) => setPartyMessage(e.target.value)}
                          maxLength={300}
                          disabled={!(hasUserInParty || isGuildLeader)}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {partyMessage.length}/300 อักษร
                        </span>
                        {(hasUserInParty || isGuildLeader) && (
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

              {/* Decorative corners & dots */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-pink-200/50 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-pink-200/50 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-pink-200/50 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-pink-200/50 rounded-br-2xl" />

              <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-pink-200/30" />
              <div className="absolute top-4 left-4 w-2 h-2 rounded-full bg-purple-200/30" />
              <div className="absolute bottom-4 right-4 w-2 h-2 rounded-full bg-blue-200/30" />
              <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-indigo-200/30" />
            </div>
          </div>
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
                          <h3 className={cn(
                            "text-lg font-bold",
                            getClassColor(char.class).text
                          )}>
                            {char.name}
                          </h3>
                          <p className={cn(
                            "text-sm font-medium",
                            getClassColor(char.class).text
                          )}>
                            {char.class}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-pink-600 text-xs">⚔️</span>
                          <span className="text-[10px] font-medium text-gray-800">ATK:</span>
                          <span className="text-xs font-bold text-pink-700">
                            {formatCompactNumber(char.stats?.atk)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-red-600 text-xs">❤️</span>
                          <span className="text-[10px] font-medium text-gray-800">HP:</span>
                          <span className="text-xs font-bold text-red-700">
                            {formatCompactNumber(char.stats?.hp)}
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
          <DialogContent className="max-w-md w-[95vw] sm:w-[85vw] md:w-[500px] max-h-[90vh] overflow-y-auto p-0 bg-transparent border-none">
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
                  <div className={cn(
                    "relative overflow-hidden rounded-xl border-2 transition-all duration-300",
                    "bg-gradient-to-br from-white/90 to-white/70",
                    "shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]",
                    getClassColors(CLASS_TO_ROLE[selectedMember.character.class]).border,
                    "hover:shadow-lg p-4 sm:p-6 pb-4"
                  )}>
                    {/* Decorative corner elements */}
                    <div className={cn(
                      "absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg",
                      getClassColors(CLASS_TO_ROLE[selectedMember.character.class]).border
                    )} />
                    <div className={cn(
                      "absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg",
                      getClassColors(CLASS_TO_ROLE[selectedMember.character.class]).border
                    )} />
                    <div className={cn(
                      "absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg",
                      getClassColors(CLASS_TO_ROLE[selectedMember.character.class]).border
                    )} />
                    <div className={cn(
                      "absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg",
                      getClassColors(CLASS_TO_ROLE[selectedMember.character.class]).border
                    )} />

                    {/* NEW: Centered job icon + info */}
                    <div className="flex flex-col items-center gap-2 mb-4">
                      <span className="text-4xl mb-1">{getClassIcon(selectedMember.character.class)}</span>
                      <h3 className={cn(
                        "text-xl font-bold text-black drop-shadow-sm truncate text-center"
                      )}>
                        {selectedMember.character.name}
                      </h3>
                      <p className={cn(
                        "text-sm font-medium text-center",
                        getClassColors(CLASS_TO_ROLE[selectedMember.character.class]).text
                      )}>
                        {selectedMember.character.class}
                      </p>
                      <p className="text-sm text-gray-600 mt-1 text-center">
                        {selectedMember.discordName}
                      </p>
                    </div>

                    <CharacterChecklist
                      checklist={selectedMember.character.checklist}
                      onChange={handleChecklistChange}
                      accentColor={getClassColors(CLASS_TO_ROLE[selectedMember.character.class]).text}
                      readOnly={true}
                      lineThroughOnComplete={true}
                    />
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
          <DialogContent className="max-w-md p-4 bg-white/95">
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

        <Dialog open={!!kickTarget} onOpenChange={(open) => { if (!open) setKickTarget(null); }}>
          <DialogContent className="max-w-md p-4 bg-white/95">
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
                  {`📢 ${inviteMsg ? inviteMsg : 'นัดหมายปาร์ตี้!'}

🧩 Party Name: ${party?.name}
🏰 Nest: ${party?.nest}

👥 รายชื่อสมาชิก:
${members.map(m => `- @${m.discordName} (${m.character.class})`).join('\n')}

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
                      const inviteText = `📢 ${inviteMsg ? inviteMsg : 'นัดหมายปาร์ตี้!'}

🧩 Party Name: ${party?.name}
🏰 Nest: ${party?.nest}

👥 รายชื่อสมาชิก:
${members.map(m => `- @${m.discordName} (${m.character.class})`).join('\n')}

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

        {/* เพิ่ม Dialog สำหรับแก้ไข Discord Link */}
        <Dialog open={isDiscordModalOpen} onOpenChange={setIsDiscordModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>แก้ไข Discord Link</DialogTitle>
              <DialogDescription>
                ใส่ลิงก์ Discord Server ของปาร์ตี้
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="discord-link">Discord Link</Label>
                <Input
                  id="discord-link"
                  placeholder="https://discord.gg/your-server"
                  value={discordLink}
                  onChange={(e) => setDiscordLink(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDiscordModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button onClick={handleSaveDiscordLink} disabled={isSavingDiscordLink}>
                {isSavingDiscordLink ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog ยืนยันการเพิ่มตัวละคร */}
        <Dialog open={isAddCharacterConfirmOpen} onOpenChange={setIsAddCharacterConfirmOpen}>
          <DialogContent className="sm:max-w-[425px] bg-white/95">
            <DialogHeader>
              <DialogTitle>ยืนยันการเพิ่มตัวละคร</DialogTitle>
              <DialogDescription>
                {existingPartyInfo ? (
                  <div className="space-y-2">
                    <p>ตัวละครนี้อยู่ในปาร์ตี้เนสเดียวกันอยู่แล้ว:</p>
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <p className="font-medium text-red-700">{existingPartyInfo.name}</p>
                    </div>
                    <p>คุณต้องการลบตัวละครออกจากปาร์ตี้เดิมและเพิ่มเข้าปาร์ตี้นี้หรือไม่?</p>
                  </div>
                ) : (
                  <p>คุณต้องการเพิ่มตัวละครนี้เข้าปาร์ตี้หรือไม่?</p>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {selectedCharacterToAdd && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-100/30 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg ${getClassColor(selectedCharacterToAdd.class).bg} border ${getClassColor(selectedCharacterToAdd.class).border} flex items-center justify-center shadow-inner`}>
                      <span className="text-2xl">{getClassColor(selectedCharacterToAdd.class).icon}</span>
                    </div>
                    <div>
                      <h3 className={cn(
                        "text-lg font-bold",
                        getClassColor(selectedCharacterToAdd.class).text
                      )}>
                        {selectedCharacterToAdd.name}
                      </h3>
                      <p className={cn(
                        "text-sm font-medium",
                        getClassColor(selectedCharacterToAdd.class).text
                      )}>
                        {selectedCharacterToAdd.class}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddCharacterConfirmOpen(false);
                setSelectedCharacterToAdd(null);
                setExistingPartyInfo(null);
              }}>
                ยกเลิก
              </Button>
              <Button 
                onClick={async () => {
                  if (selectedCharacterToAdd) {
                    if (existingPartyInfo) {
                      // ลบออกจากปาร์ตี้เดิมก่อน
                      await set(ref(db, `parties/${existingPartyInfo.id}/members/${selectedCharacterToAdd.id}`), null);
                    }
                    await doAddCharacter(selectedCharacterToAdd);
                  }
                  setIsAddCharacterConfirmOpen(false);
                  setSelectedCharacterToAdd(null);
                  setExistingPartyInfo(null);
                }}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
              >
                ยืนยัน
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 