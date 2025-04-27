'use client';

import { ScrollArea } from './ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../types/user';
import { Character } from '../types/character';
import { Dialog, DialogContent } from './ui/dialog';
import { useState } from 'react';
import { cn } from '../lib/utils';
import { WEEKLY_MAX_VALUES } from '@/constants/checklist';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CLASS_TO_ROLE, getClassColors } from '@/config/theme';

interface SidebarProps {
  users: { [key: string]: User };
}

// Simplified character card for popup
function SimpleCharacterCard({ character }: { character: Character }) {
  const colors = getClassColor(character.class);
  
  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border-2 transition-all duration-300",
      "bg-gradient-to-br from-pink-100/80 to-purple-100/80",
      "shadow-[0_8px_32px_0_rgba(31,38,135,0.1)]",
      colors.border,
      "hover:shadow-lg"
    )}>
      {/* Decorative corner elements */}
      <div className={cn("absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-lg", colors.border)}></div>
      <div className={cn("absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 rounded-tr-lg", colors.border)}></div>
      <div className={cn("absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 rounded-bl-lg", colors.border)}></div>
      <div className={cn("absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-lg", colors.border)}></div>

      <div className="relative p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center",
            "bg-gradient-to-br from-pink-200 to-purple-200 border shadow-inner",
            colors.border
          )}>
            <span className="text-2xl">{colors.icon}</span>
          </div>
          <div>
            <h3 className={cn("text-xl font-bold", colors.text)}>
              {character.name}
            </h3>
            <p className={cn("text-sm font-medium", colors.text)}>
              {character.class}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {/* Left Column - ATK, HP, DEF */}
          <div className="flex-1 space-y-2">
            <div className={cn(
              "p-2 rounded-lg border",
              "bg-gradient-to-br from-pink-200/80 to-pink-100/80",
              colors.border
            )}>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-pink-500">⚔️</span>
                <span className="text-gray-600">ATK:</span>
                <span className={cn("font-medium", colors.text)}>
                  {character.stats?.atk || 0}
                </span>
              </div>
            </div>
            <div className={cn(
              "p-2 rounded-lg border",
              "bg-gradient-to-br from-red-200/80 to-red-100/80",
              colors.border
            )}>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-red-500">❤️</span>
                <span className="text-gray-600">HP:</span>
                <span className={cn("font-medium", colors.text)}>
                  {character.stats?.hp || 0}
                </span>
              </div>
            </div>
            <div className={cn(
              "p-2 rounded-lg border",
              "bg-gradient-to-br from-blue-200/80 to-blue-100/80",
              colors.border
            )}>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-blue-500">🛡️</span>
                <span className="text-gray-600">DEF:</span>
                <div className="flex items-center gap-1">
                  <span className="text-blue-600">P</span>
                  <span className={cn("font-medium", colors.text)}>
                    {character.stats?.pdef || 0}%
                  </span>
                  <span className="text-purple-600">M</span>
                  <span className={cn("font-medium", colors.text)}>
                    {character.stats?.mdef || 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - CRI, ELE, FD */}
          <div className="flex-1 space-y-2">
            <div className={cn(
              "p-2 rounded-lg border",
              "bg-gradient-to-br from-yellow-200/80 to-yellow-100/80",
              colors.border
            )}>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-yellow-500">🎯</span>
                <span className="text-gray-600">CRI:</span>
                <span className={cn("font-medium", colors.text)}>
                  {character.stats?.cri || 0}%
                </span>
              </div>
            </div>
            <div className={cn(
              "p-2 rounded-lg border",
              "bg-gradient-to-br from-purple-200/80 to-purple-100/80",
              colors.border
            )}>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-purple-500">⚡</span>
                <span className="text-gray-600">ELE:</span>
                <span className={cn("font-medium", colors.text)}>
                  {character.stats?.ele || 0}%
                </span>
              </div>
            </div>
            <div className={cn(
              "p-2 rounded-lg border",
              "bg-gradient-to-br from-orange-200/80 to-orange-100/80",
              colors.border
            )}>
              <div className="flex items-center gap-1 text-sm">
                <span className="text-orange-500">💥</span>
                <span className="text-gray-600">FD:</span>
                <span className={cn("font-medium", colors.text)}>
                  {character.stats?.fd || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {character.checklist && (
          <div className="space-y-3">
            {/* Daily Checklist */}
            <div>
              <h4 className={cn("text-sm font-medium mb-2", colors.text)}>รายการรายวัน</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className={cn(
                  "p-2 rounded-lg border",
                  "bg-gradient-to-br from-green-200/80 to-green-100/80",
                  colors.border
                )}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Daily Quest</span>
                    <span className={cn(
                      "font-medium",
                      character.checklist.daily.dailyQuest ? "text-green-600" : "text-gray-400"
                    )}>
                      {character.checklist.daily.dailyQuest ? "✓" : "○"}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "p-2 rounded-lg border",
                  "bg-gradient-to-br from-teal-200/80 to-teal-100/80",
                  colors.border
                )}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">FTG 700</span>
                    <span className={cn(
                      "font-medium",
                      character.checklist.daily.ftg ? "text-green-600" : "text-gray-400"
                    )}>
                      {character.checklist.daily.ftg ? "✓" : "○"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Checklist */}
            <div>
              <h4 className={cn("text-sm font-medium mb-2", colors.text)}>รายการสัปดาห์</h4>
              <div className="grid grid-cols-2 gap-2">
                {([
                  'minotaur',
                  'cerberus',
                  'cerberusHell',
                  'cerberusChallenge',
                  'manticore',
                  'manticoreHell',
                  'apocalypse',
                  'apocalypseHell',
                  'seaDragon',
                  'chaosRiftKamala',
                  'chaosRiftBairra',
                  'banquetHall',
                  'jealousAlbeuteur',
                  'themePark'
                ] as const).map((key) => {
                  const value = character.checklist.weekly[key] || 0;
                  const maxRounds = WEEKLY_MAX_VALUES[key] || 1;

                  const displayNames = {
                    'minotaur': 'Minotaur',
                    'cerberus': 'Cerberus',
                    'cerberusHell': 'Cerberus (Hell)',
                    'cerberusChallenge': 'Cerberus (Challenge)',
                    'manticore': 'Manticore',
                    'manticoreHell': 'Manticore (Hell)',
                    'apocalypse': 'Apocalypse',
                    'apocalypseHell': 'Apocalypse (Hell)',
                    'seaDragon': 'Sea Dragon',
                    'chaosRiftKamala': 'Chaos Rift: Kamala',
                    'chaosRiftBairra': 'Chaos Rift: Bairra',
                    'banquetHall': 'Banquet Hall',
                    'jealousAlbeuteur': 'Jealous Albeuteur',
                    'themePark': 'Theme Park'
                  } as const;

                  return (
                    <div key={key} className={cn(
                      "p-2 rounded-lg border",
                      "bg-gradient-to-br from-indigo-200/80 to-indigo-100/80",
                      colors.border
                    )}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{displayNames[key]}</span>
                        <span className={cn("font-medium", colors.text)}>
                          {value}/{maxRounds} รอบ
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CLASS_GRADIENTS = {
  Warrior:   { bg: 'from-red-100 to-rose-200/70', text: 'text-red-600', border: 'border-red-300', icon: '⚔️' },
  Archer:    { bg: 'from-emerald-100 to-green-200/70', text: 'text-emerald-600', border: 'border-emerald-300', icon: '🏹' },
  Sorceress: { bg: 'from-purple-100 to-violet-200/70', text: 'text-purple-600', border: 'border-purple-300', icon: '🔮' },
  Cleric:    { bg: 'from-sky-100 to-blue-200/70', text: 'text-sky-600', border: 'border-sky-300', icon: '✨' },
  Academic:  { bg: 'from-amber-100 to-yellow-200/70', text: 'text-amber-600', border: 'border-amber-300', icon: '🔧' },
  Default:   { bg: 'from-gray-50 to-gray-100/50', text: 'text-gray-700', border: 'border-gray-200', icon: '👤' }
};

function getClassColor(characterClass: string) {
  const role = CLASS_TO_ROLE[characterClass as keyof typeof CLASS_TO_ROLE];
  return CLASS_GRADIENTS[role] || CLASS_GRADIENTS.Default;
}

export function Sidebar({ users }: SidebarProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleCharacterClick = (char: Character) => {
    setSelectedCharacter(char);
    setIsDialogOpen(true);
  };

  return (
    <>
      <ScrollArea className="h-[calc(100vh-8rem)] pr-4 -mr-4">
        <div className="space-y-6">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            ผู้เล่นทั้งหมด
          </h2>
          <div className="space-y-2">
            {Object.entries(users).map(([userId, user]: [string, any], index) => {
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

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key={userId}
                        initial={{ opacity: 0, height: 0, y: -8 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="space-y-0.5"
                      >
                        {Object.entries(user.characters).map(([charId, char]: [string, any]) => {
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
                              <div className="flex items-center justify-between">
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
                  <SimpleCharacterCard character={selectedCharacter} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
} 