'use client';

import { Card } from './ui/card';
import Link from 'next/link';
import { Party } from '../types/party';
import { useUsers } from '../hooks/useUsers';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Users, Clock } from 'lucide-react';
import styles from './PartyCard.module.css';
import { CLASS_TO_ROLE, getClassColors } from '@/config/theme';
import { CharacterClass, Role } from '@/types/character';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { Character } from '../types/character';
import { cn } from '@/lib/utils';
import { CharacterChecklist } from './CharacterChecklist';

interface PartyCardProps {
  party: Party;
}

const CLASS_GRADIENTS: Record<string, { bg: string; text: string; border: string; icon?: string }> = {
  Warrior:   { bg: 'from-red-100/80 to-rose-100/50', text: 'text-red-600', border: 'border-red-300', icon: '⚔️' },
  Archer:    { bg: 'from-emerald-100/80 to-green-100/50', text: 'text-emerald-600', border: 'border-emerald-300', icon: '🏹' },
  Sorceress: { bg: 'from-purple-100/80 to-violet-100/50', text: 'text-purple-600', border: 'border-purple-300', icon: '🔮' },
  Cleric:    { bg: 'from-sky-100/80 to-blue-100/50', text: 'text-sky-600', border: 'border-sky-300', icon: '✨' },
  Academic:  { bg: 'from-amber-100/80 to-yellow-100/50', text: 'text-amber-600', border: 'border-amber-300', icon: '🔧' },
  Default:   { bg: 'from-gray-100/80 to-gray-100/50', text: 'text-gray-700', border: 'border-gray-200', icon: '👤' }
};

function getClassStyle(characterClass: string) {
  const role = CLASS_TO_ROLE[characterClass as keyof typeof CLASS_TO_ROLE];
  return CLASS_GRADIENTS[role] || CLASS_GRADIENTS.Default;
}

export function PartyCard({ party }: PartyCardProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const handleCharacterClick = (char: Character) => {
    setSelectedCharacter(char);
    setIsDialogOpen(true);
  };

  return (
    <>
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
            <Link href={`/party/${party.id}`} className="space-y-2">
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
            </Link>

            {/* Members list */}
            <div className="flex flex-col gap-[1px] -space-y-1">
              {sortedMembers.map(({ charId, info }) => {
                if (!info) return null;
                const classStyle = getClassStyle(info.class);
                return (
                  <div
                    key={charId}
                    onClick={() => handleCharacterClick(info)}
                    className="flex items-center justify-between p-2 rounded-xl bg-gradient-to-r from-white/50 to-white/30 border border-white/50 backdrop-blur-sm transition-all duration-300 hover:shadow-md group/member cursor-pointer"
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md overflow-y-auto p-0 bg-transparent border-none">
          <AnimatePresence mode="wait">
            {selectedCharacter && (
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
                  getClassStyle(selectedCharacter.class).border,
                  "hover:shadow-lg p-6"
                )}>
                  {/* Decorative corner elements */}
                  <div className={cn("absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg", getClassStyle(selectedCharacter.class).border)}></div>
                  <div className={cn("absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg", getClassStyle(selectedCharacter.class).border)}></div>
                  <div className={cn("absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg", getClassStyle(selectedCharacter.class).border)}></div>
                  <div className={cn("absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg", getClassStyle(selectedCharacter.class).border)}></div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center",
                      "bg-gradient-to-br from-pink-200 to-purple-200 border shadow-inner",
                      getClassStyle(selectedCharacter.class).border
                    )}>
                      <span className="text-2xl">{getClassIcon(selectedCharacter.class)}</span>
                    </div>
                    <div>
                      <h3 className={cn("text-xl font-bold", getClassStyle(selectedCharacter.class).text)}>
                        {selectedCharacter.name}
                      </h3>
                      <p className={cn("text-sm font-medium", getClassStyle(selectedCharacter.class).text)}>
                        {selectedCharacter.class}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {Object.values(users).find(u => u.characters && Object.values(u.characters).some(c => c.id === selectedCharacter.id))?.meta?.discord || 'ไม่ทราบ'}
                      </p>
                    </div>
                  </div>

                  {/* Stats Display */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Left Column - ATK, HP, DEF P M */}
                    <div className="space-y-2">
                      <div className={cn(
                        "p-2 rounded-lg border",
                        "bg-gradient-to-br from-red-50/90 to-red-100/50",
                        getClassStyle(selectedCharacter.class).border
                      )}>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-red-500">⚔️</span>
                          <span className="text-gray-600">ATK:</span>
                          <span className={cn("font-medium", getClassStyle(selectedCharacter.class).text)}>
                            {selectedCharacter.stats?.atk || 0}
                          </span>
                        </div>
                      </div>

                      <div className={cn(
                        "p-2 rounded-lg border",
                        "bg-gradient-to-br from-green-50/90 to-green-100/50",
                        getClassStyle(selectedCharacter.class).border
                      )}>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-green-500">❤️</span>
                          <span className="text-gray-600">HP:</span>
                          <span className={cn("font-medium", getClassStyle(selectedCharacter.class).text)}>
                            {selectedCharacter.stats?.hp || 0}
                          </span>
                        </div>
                      </div>

                      <div className={cn(
                        "p-2 rounded-lg border",
                        "bg-gradient-to-br from-blue-50/90 to-blue-100/50",
                        getClassStyle(selectedCharacter.class).border
                      )}>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-blue-500">🛡️</span>
                          <span className="text-gray-600">DEF:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-blue-600">P</span>
                            <span className={cn("font-medium", getClassStyle(selectedCharacter.class).text)}>
                              {selectedCharacter.stats?.pdef || 0}%
                            </span>
                            <span className="text-purple-600">M</span>
                            <span className={cn("font-medium", getClassStyle(selectedCharacter.class).text)}>
                              {selectedCharacter.stats?.mdef || 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - CRI, ELE, FD */}
                    <div className="space-y-2">
                      <div className={cn(
                        "p-2 rounded-lg border",
                        "bg-gradient-to-br from-yellow-50/90 to-yellow-100/50",
                        getClassStyle(selectedCharacter.class).border
                      )}>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-yellow-500">⚡</span>
                          <span className="text-gray-600">CRI:</span>
                          <span className={cn("font-medium", getClassStyle(selectedCharacter.class).text)}>
                            {selectedCharacter.stats?.cri || 0}%
                          </span>
                        </div>
                      </div>

                      <div className={cn(
                        "p-2 rounded-lg border",
                        "bg-gradient-to-br from-purple-50/90 to-purple-100/50",
                        getClassStyle(selectedCharacter.class).border
                      )}>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-purple-500">✨</span>
                          <span className="text-gray-600">ELE:</span>
                          <span className={cn("font-medium", getClassStyle(selectedCharacter.class).text)}>
                            {selectedCharacter.stats?.ele || 0}%
                          </span>
                        </div>
                      </div>

                      <div className={cn(
                        "p-2 rounded-lg border",
                        "bg-gradient-to-br from-orange-50/90 to-orange-100/50",
                        getClassStyle(selectedCharacter.class).border
                      )}>
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-orange-500">💥</span>
                          <span className="text-gray-600">FD:</span>
                          <span className={cn("font-medium", getClassStyle(selectedCharacter.class).text)}>
                            {selectedCharacter.stats?.fd || 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Checklist */}
                  <div className="mt-4 border-t border-gray-200/50 pt-4">
                    <CharacterChecklist
                      checklist={selectedCharacter.checklist}
                      onChange={() => {}}
                      accentColor={getClassStyle(selectedCharacter.class).text}
                      readOnly={true}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}