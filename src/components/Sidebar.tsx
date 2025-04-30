'use client';

import { ScrollArea } from './ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from './ui/dialog';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CLASS_TO_ROLE, getClassColors } from '@/config/theme';
import { CharacterChecklist } from './CharacterChecklist';
import { useUsers } from '@/hooks/useUsers';
import { Character } from '@/types/character';
import { Users } from '@/hooks/useUsers';

// ฟังก์ชันสำหรับแปลงตัวเลขเป็นรูปแบบย่อ (K, M)
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

const CLASS_GRADIENTS: Record<string, { bg: string; text: string; border: string; icon?: string }> = {
  Warrior:   { bg: 'from-red-100/80 to-rose-100/50', text: 'text-red-600', border: 'border-red-300', icon: '⚔️' },
  Archer:    { bg: 'from-emerald-100/80 to-green-100/50', text: 'text-emerald-600', border: 'border-emerald-300', icon: '🏹' },
  Sorceress: { bg: 'from-purple-100/80 to-violet-100/50', text: 'text-purple-600', border: 'border-purple-300', icon: '🔮' },
  Cleric:    { bg: 'from-sky-100/80 to-blue-100/50', text: 'text-sky-600', border: 'border-sky-300', icon: '✨' },
  Academic:  { bg: 'from-amber-100/80 to-yellow-100/50', text: 'text-amber-600', border: 'border-amber-300', icon: '🔧' },
  Default:   { bg: 'from-gray-100/80 to-gray-100/50', text: 'text-gray-700', border: 'border-gray-200', icon: '👤' }
};

function getClassColor(characterClass: string) {
  const role = CLASS_TO_ROLE[characterClass as keyof typeof CLASS_TO_ROLE];
  return CLASS_GRADIENTS[role] || CLASS_GRADIENTS.Default;
}

interface SidebarProps {
  users: Users;
}

export function Sidebar({ users }: SidebarProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleCharacterClick = (char: any) => {
    setSelectedCharacter(char);
    setIsDialogOpen(true);
  };

  // ฟังก์ชันสำหรับเรียงลำดับตัวละคร
  const sortCharacters = (characters: [string, any][]) => {
    return [...characters].sort((a, b) => {
      const nameA = a[1].name;
      const nameB = b[1].name;
      
      // แยกพยัญชนะและตัวเลข
      const lettersA = nameA.replace(/[0-9]/g, '');
      const lettersB = nameB.replace(/[0-9]/g, '');
      const numbersA = nameA.replace(/[^0-9]/g, '');
      const numbersB = nameB.replace(/[^0-9]/g, '');
      
      // เรียงตามพยัญชนะก่อน
      if (lettersA !== lettersB) {
        return lettersA.localeCompare(lettersB, 'th', {sensitivity: 'base'});
      }
      
      // ถ้าพยัญชนะเท่ากัน ให้เรียงตามตัวเลข
      if (numbersA && numbersB) {
        return parseInt(numbersA) - parseInt(numbersB);
      }
      
      // ถ้าไม่มีตัวเลข ให้เรียงตามชื่อเต็ม
      return nameA.localeCompare(nameB, 'th', {sensitivity: 'base'});
    });
  };

  // ฟังก์ชันสำหรับเรียงลำดับผู้ใช้ Discord
  const sortUsers = (users: [string, any][]) => {
    return [...users].sort((a, b) => {
      const nameA = a[1].meta?.discord || 'ไม่ทราบชื่อ';
      const nameB = b[1].meta?.discord || 'ไม่ทราบชื่อ';
      
      // แยกพยัญชนะและตัวเลข
      const lettersA = nameA.replace(/[0-9]/g, '');
      const lettersB = nameB.replace(/[0-9]/g, '');
      const numbersA = nameA.replace(/[^0-9]/g, '');
      const numbersB = nameB.replace(/[^0-9]/g, '');
      
      // เรียงตามพยัญชนะก่อน
      if (lettersA !== lettersB) {
        return lettersA.localeCompare(lettersB, 'th', {sensitivity: 'base'});
      }
      
      // ถ้าพยัญชนะเท่ากัน ให้เรียงตามตัวเลข
      if (numbersA && numbersB) {
        return parseInt(numbersA) - parseInt(numbersB);
      }
      
      // ถ้าไม่มีตัวเลข ให้เรียงตามชื่อเต็ม
      return nameA.localeCompare(nameB, 'th', {sensitivity: 'base'});
    });
  };

  return (
    <>
      <ScrollArea className="h-[calc(100vh-8rem)] pr-4 -mr-4">
        <div className="space-y-6">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            ผู้เล่นทั้งหมด
          </h2>
          <div className="space-y-2">
            {sortUsers(Object.entries(users)).map(([userId, user]: [string, any], index) => {
              if (!user.characters || Object.keys(user.characters).length === 0) return null;
              const isExpanded = !!expanded[userId];
              return (
                <motion.div
                  key={userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="mb-0.5 flex items-center gap-2 cursor-pointer select-none"
                    onClick={() => setExpanded(prev => ({ ...prev, [userId]: !prev[userId] }))}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-base font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        {user.meta?.discord || 'ไม่ทราบชื่อ'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-pink-50 to-purple-50 text-gray-600 border border-pink-100/50">
                          {user.meta?.role || 'Member'}
                        </span>
                        <span>•</span>
                        <span>{Object.keys(user.characters).length} ตัวละคร</span>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        key={userId}
                        initial={{ opacity: 0, height: 0, y: -8 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="space-y-0.5"
                      >
                        {sortCharacters(Object.entries(user.characters)).map(([charId, char]: [string, any]) => {
                          const classColors = getClassColor(char.class);
                          return (
                            <motion.button
                              key={charId}
                              onClick={() => handleCharacterClick(char)}
                              className={`w-full p-2 rounded-lg bg-gradient-to-br ${classColors.bg} border ${classColors.border} shadow-sm hover:shadow-md transition-all duration-300 text-left`}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.98 }}
                              layout
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-md bg-white/50 border ${classColors.border} flex items-center justify-center shadow-inner`}>
                                  <span className="text-base">{classColors.icon}</span>
                                </div>
                                <div>
                                  <h4 className={`text-sm font-medium ${classColors.text}`}>
                                    {char.name}
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    {char.class}
                                  </p>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </ScrollArea>

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
                <div className="relative">
                  <div className={cn(
                    "relative overflow-hidden rounded-xl border-2 transition-all duration-300",
                    "bg-gradient-to-br from-white/90 to-white/70",
                    "shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]",
                    getClassColor(selectedCharacter.class).border,
                    "hover:shadow-lg"
                  )}>
                    {/* Character details content */}
                    <div className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center",
                          "bg-gradient-to-br from-pink-200 to-purple-200 border shadow-inner",
                          getClassColor(selectedCharacter.class).border
                        )}>
                          <span className="text-2xl">{getClassColor(selectedCharacter.class).icon}</span>
                        </div>
                        <div>
                          <h3 className={cn("text-xl font-bold", getClassColor(selectedCharacter.class).text)}>
                            {selectedCharacter.name}
                          </h3>
                          <p className={cn("text-sm font-medium", getClassColor(selectedCharacter.class).text)}>
                            {selectedCharacter.class}
                          </p>
                        </div>
                      </div>

                      {/* Stats Display */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Left Column */}
                        <div className="space-y-2">
                          <div className={cn(
                            "p-2 rounded-lg border",
                            "bg-gradient-to-br from-red-50/90 to-red-100/50",
                            getClassColor(selectedCharacter.class).border
                          )}>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-pink-500">⚔️</span>
                              <span className="text-gray-600">ATK:</span>
                              <span className={cn("font-medium", getClassColor(selectedCharacter.class).text)}>
                                {formatNumber(selectedCharacter.stats?.atk || 0)}
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            "p-2 rounded-lg border",
                            "bg-gradient-to-br from-green-50/90 to-green-100/50",
                            getClassColor(selectedCharacter.class).border
                          )}>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-red-500">❤️</span>
                              <span className="text-gray-600">HP:</span>
                              <span className={cn("font-medium", getClassColor(selectedCharacter.class).text)}>
                                {formatNumber(selectedCharacter.stats?.hp || 0)}
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            "p-2 rounded-lg border",
                            "bg-gradient-to-br from-blue-50/90 to-blue-100/50",
                            getClassColor(selectedCharacter.class).border
                          )}>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-blue-500">🛡️</span>
                              <span className="text-gray-600">DEF:</span>
                              <div className="flex items-center gap-1">
                                <span className="text-blue-600">P</span>
                                <span className={cn("font-medium", getClassColor(selectedCharacter.class).text)}>
                                  {selectedCharacter.stats?.pdef || 0}%
                                </span>
                                <span className="text-purple-600">M</span>
                                <span className={cn("font-medium", getClassColor(selectedCharacter.class).text)}>
                                  {selectedCharacter.stats?.mdef || 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                          <div className={cn(
                            "p-2 rounded-lg border",
                            "bg-gradient-to-br from-yellow-50/90 to-yellow-100/50",
                            getClassColor(selectedCharacter.class).border
                          )}>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-yellow-500">🎯</span>
                              <span className="text-gray-600">CRI:</span>
                              <span className={cn("font-medium", getClassColor(selectedCharacter.class).text)}>
                                {selectedCharacter.stats?.cri || 0}%
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            "p-2 rounded-lg border",
                            "bg-gradient-to-br from-purple-50/90 to-purple-100/50",
                            getClassColor(selectedCharacter.class).border
                          )}>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-purple-500">⚡</span>
                              <span className="text-gray-600">ELE:</span>
                              <span className={cn("font-medium", getClassColor(selectedCharacter.class).text)}>
                                {selectedCharacter.stats?.ele || 0}%
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            "p-2 rounded-lg border",
                            "bg-gradient-to-br from-orange-50/90 to-orange-100/50",
                            getClassColor(selectedCharacter.class).border
                          )}>
                            <div className="flex items-center gap-1 text-sm">
                              <span className="text-orange-500">💥</span>
                              <span className="text-gray-600">FD:</span>
                              <span className={cn("font-medium", getClassColor(selectedCharacter.class).text)}>
                                {selectedCharacter.stats?.fd || 0}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-gray-200/50 pt-4">
                        <CharacterChecklist
                          checklist={selectedCharacter.checklist}
                          onChange={() => {}}
                          accentColor={getClassColor(selectedCharacter.class).text}
                          readOnly={true}
                        />
                      </div>
                    </div>
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