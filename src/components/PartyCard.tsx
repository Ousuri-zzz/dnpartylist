'use client';

import { Card } from './ui/card';
import Link from 'next/link';
import { Party } from '../types/party';
import { useUsers } from '../hooks/useUsers';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Users, Clock } from 'lucide-react';
import styles from './PartyCard.module.css';
import { CLASS_TO_ROLE, getClassColors } from '@/config/theme';
import { CharacterClass, Role } from '@/types/character';

interface PartyCardProps {
  party: Party;
}

export function PartyCard({ party }: PartyCardProps) {
  const { users } = useUsers();

  const { memberCount, maxMembers, sortedMembers } = useMemo(() => {
    const members = [];
    let count = 0;
    
    if (party.members && typeof party.members === 'object') {
      for (const [charId, memberData] of Object.entries(party.members)) {
        const userId = typeof memberData === 'boolean' 
          ? Object.entries(users).find(([, userData]) => userData.characters?.[charId])?.[0]
          : (memberData as { userId: string }).userId;
        
        if (userId && users[userId]?.characters?.[charId]) {
          count++;
          members.push({
            charId,
            info: {
              ...users[userId].characters[charId],
              discordName: users[userId].meta?.discord || 'ไม่ทราบ',
              name: users[userId].characters[charId].name
            }
          });
        }
      }
    }
    
    // Sort members by join date if available
    members.sort((a, b) => {
      const aJoinedAt = party.members[a.charId] && typeof party.members[a.charId] === 'object' 
        ? (party.members[a.charId] as { joinedAt?: string }).joinedAt 
        : undefined;
      const bJoinedAt = party.members[b.charId] && typeof party.members[b.charId] === 'object'
        ? (party.members[b.charId] as { joinedAt?: string }).joinedAt
        : undefined;
      
      if (!aJoinedAt) return 1;
      if (!bJoinedAt) return -1;
      return new Date(aJoinedAt).getTime() - new Date(bJoinedAt).getTime();
    });

    return {
      memberCount: count,
      maxMembers: party.maxMember || 4,
      sortedMembers: members
    };
  }, [party.members, party.maxMember, users]);

  const getClassStyle = (characterClass: string) => {
    // Convert to CharacterClass type if possible
    const classKey = characterClass as CharacterClass;
    if (classKey in CLASS_TO_ROLE) {
      const role = CLASS_TO_ROLE[classKey];
      const colors = getClassColors(role);
      
      return {
        bg: `from-${colors.bg.replace('bg-', '')}/80 to-${colors.bg.replace('bg-', '')}/50`,
        text: `from-${colors.text.replace('text-', '')} to-${colors.text.replace('text-', '')}`,
        border: colors.border.replace('border-', 'border-') + '/50',
        icon: colors.icon
      };
    }
    
    // Fallback for unknown classes
    return {
      bg: 'from-gray-100/80 to-gray-200/50',
      text: 'from-gray-600 to-gray-700',
      border: 'border-gray-300/50',
      icon: '👤'
    };
  };

  const getClassAbbr = (className: string) => {
    switch (className) {
      case 'Sword Master': return 'SM';
      case 'Mercenary': return 'MC';
      case 'Bowmaster': return 'BM';
      case 'Acrobat': return 'AC';
      case 'Force User': return 'FU';
      case 'Elemental Lord': return 'E';
      case 'Paladin': return 'PL';
      case 'Priest': return 'PR';
      case 'Engineer': return 'EN';
      case 'Alchemist': return 'AL';
      default: return className.charAt(0).toUpperCase();
    }
  };

  // ฟังก์ชันคืนไอคอนประจำอาชีพ
  const getClassIcon = (className: string) => {
    switch (className) {
      case 'Sword Master':
      case 'Mercenary':
        return getClassColors('Warrior').icon || '⚔️';
      case 'Bowmaster':
      case 'Acrobat':
        return getClassColors('Archer').icon || '🏹';
      case 'Force User':
      case 'Elemental Lord':
        return getClassColors('Sorceress').icon || '🔮';
      case 'Paladin':
      case 'Priest':
        return getClassColors('Cleric').icon || '✨';
      case 'Engineer':
      case 'Alchemist':
        return getClassColors('Academic').icon || '🔧';
      default:
        return '👤';
    }
  };

  // ฟังก์ชันคืนสีพื้นหลังป้ายอาชีพ (bg-...-100)
  const getClassBgColor = (className: string) => {
    switch (className) {
      case 'Sword Master':
      case 'Mercenary':
        return 'bg-red-100';
      case 'Bowmaster':
      case 'Acrobat':
        return 'bg-emerald-100';
      case 'Force User':
      case 'Elemental Lord':
        return 'bg-purple-100';
      case 'Paladin':
      case 'Priest':
        return 'bg-sky-100';
      case 'Engineer':
      case 'Alchemist':
        return 'bg-yellow-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <Link href={`/party/${party.id}`}>
      <Card className="group relative overflow-hidden bg-white/80 backdrop-blur-md border border-white/60 shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl">
        {/* Gradient overlay for depth */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-pink-100/40 via-purple-100/30 to-blue-100/30 opacity-80 group-hover:opacity-100 transition-opacity duration-700 rounded-2xl" />
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-10"
          initial={false}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </motion.div>
        <div className="relative z-20 p-6">
          <div className="flex flex-col gap-4">
            {/* Party header */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold">
                <span className={styles.partyName}>
                  {party.name}
                </span>
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className={styles.nestName}>
                    {party.nest}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <div className="px-2 py-1 rounded-full bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 border border-purple-100/30">
                    <span className="text-sm font-medium bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {memberCount}/{maxMembers}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Members list */}
            <div className="flex flex-col gap-[1px] -space-y-1">
              {sortedMembers.map(({ charId, info }) => {
                if (!info) return null;
                const classStyle = getClassStyle(info.class);
                return (
                  <div
                    key={charId}
                    className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-white/50 to-white/30 border border-white/50 backdrop-blur-sm transition-all duration-300 hover:shadow-md group/member"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${classStyle.bg} ${classStyle.border}`}>
                        <span className="text-xl">
                          {classStyle.icon}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{info.discordName}</p>
                        <p className="text-sm text-gray-500 -mt-1">{info.name}</p>
                      </div>
                    </div>
                    <div className={`px-1.5 py-0.5 rounded-md font-normal border ${getClassBgColor(info.class)} ${classStyle.border} ${classStyle.text.replace('from-', 'text-').replace('to-', '')}`}>
                      <span className="text-[10px]">{info.class}</span>
                    </div>
                  </div>
                );
              })}

              {memberCount === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Users className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">ยังไม่มีสมาชิกในปาร์ตี้</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}