'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAllCharacters } from '../../hooks/useAllCharacters';
import { useAuth } from '../../hooks/useAuth';
import { useUsers } from '../../hooks/useUsers';
import { Character, CharacterClass, CharacterStats } from '../../types/character';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Sword, Heart, Shield, Target, Flame, Zap, TrendingUp, Trophy, Info } from 'lucide-react';
import { CLASS_TO_ROLE, getClassColors } from '../../config/theme';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { CharacterStats as CharacterStatsComponent } from '../../components/CharacterStats';
import { CharacterChecklist } from '../../components/CharacterChecklist';

const ALLOWED_JOBS = [
  "Sword Master",
  "Mercenary",
  "Bowmaster",
  "Acrobat",
  "Force User",
  "Elemental Lord",
  "Paladin",
  "Priest",
  "Engineer",
  "Alchemist"
] as const;

// แยก type สำหรับ sorting
type StatSortType = 'atk' | 'hp' | 'cri' | 'ele' | 'fd';
type SortType = 'score' | 'discord' | StatSortType | 'def';

// Type guard functions
function isStatSortType(stat: SortType): stat is StatSortType {
  return ['atk', 'hp', 'cri', 'ele', 'fd'].includes(stat as string);
}

interface RankedCharacter extends Character {
  score: number;
  discordName: string;
  rank: number;
}

interface RoleConstants {
  statWeights: {        // น้ำหนักสเตตัส (ปรับตามความยากในการสะสม)
    atk?: number;
    hp?: number;
    fd?: number;
    cri?: number;
    ele?: number;
    pdef?: number;
    mdef?: number;
  };
  skillMultiplier?: number; // ทำให้เป็น optional
}

const ROLE_BALANCE: Record<string, RoleConstants> = {
  // Pure Physical DPS (Warrior/Cleric/Kali)
  Mercenary: {
    statWeights: { 
      atk: 1.4,    // 1 STR = 0.5 Physical Damage
      hp: 0.7,     // HP ทำง่าย เพราะมาจาก VIT
      fd: 1.3,     // Equal FD weight for all
      cri: 1.6,    // Critical ทำยาก เพราะมาจาก AGI และมี cap
      ele: 0.0,    // No elemental damage
      pdef: 0.7,   // Defense ทำง่าย เพราะมาจาก VIT
      mdef: 0.8    // Defense ทำง่ายมาก เพราะมาจาก INT
    }
  },
  Acrobat: {
    statWeights: { 
      atk: 1.4,    // 1 AGI = 0.5 Physical Damage
      hp: 0.9,     // HP ทำยากกว่า เพราะมี VIT ต่ำ
      fd: 1.3,
      cri: 1.5,    // Critical ทำง่ายกว่า เพราะมี AGI สูง
      ele: 0.0,
      pdef: 0.8,   // Defense ทำยากกว่า เพราะมี VIT ต่ำ
      mdef: 0.9
    }
  },
  Engineer: {
    statWeights: { 
      atk: 1.4,    // 1 AGI = 0.5 Physical Damage
      hp: 0.8,     // HP ทำยากกว่า เพราะมี VIT ต่ำ
      fd: 1.2,
      cri: 1.4,    // Critical ทำง่ายกว่า เพราะมี AGI สูง
      ele: 0.0,
      pdef: 0.6,   // Defense ทำยากกว่า เพราะมี VIT ต่ำ
      mdef: 0.6
    }
  },

  // Pure Magic DPS (Sorceress)
  ForceUser: {
    statWeights: { 
      atk: 1.55,    // 1 INT = 0.75 Magic Damage
      hp: 0.75,     // HP ทำยากที่สุด เพราะมี VIT ต่ำสุด
      fd: 1.2,
      cri: 1.6,    // Critical ทำยาก เพราะมาจาก AGI และมี cap
      ele: 0.8,    // Elemental damage ทำยากมากสำหรับ magic classes
      pdef: 0.7,   // Defense ทำยากที่สุด เพราะมี VIT ต่ำสุด
      mdef: 0.6    // 1 INT = 0.8 Magic Defense
    }
  },
  "Force User": {
    statWeights: { 
      atk: 1.55,
      hp: 0.75,
      fd: 1.2,
      cri: 1.6,
      ele: 0.8,
      pdef: 0.7,
      mdef: 0.6
    }
  },
  ElementalLord: {
    statWeights: { 
      atk: 1.5,
      hp: 0.7,
      fd: 1.2,
      cri: 1.6,
      ele: 0.8,
      pdef: 0.7,
      mdef: 0.6
    }
  },
  "Elemental Lord": {
    statWeights: { 
      atk: 1.5,
      hp: 0.7,
      fd: 1.2,
      cri: 1.6,
      ele: 0.8,
      pdef: 0.7,
      mdef: 0.6
    }
  },
  Priest: {
    statWeights: { 
      atk: 1.2,
      hp: 0.6,     // HP ทำง่ายที่สุด เพราะมี VIT สูงสุด
      fd: 1.2,
      cri: 1.8,    // Critical ทำยากที่สุด เพราะมี AGI ต่ำสุด
      ele: 0.8,
      pdef: 0.5,   // Defense ทำง่ายที่สุด เพราะมี VIT สูงสุด
      mdef: 0.4
    }
  },
  Alchemist: {
    statWeights: { 
      atk: 1.5,
      hp: 0.8,
      fd: 1.2,
      cri: 1.6,
      ele: 0.8,
      pdef: 0.7,
      mdef: 0.6
    }
  },

  // Hybrid Classes (can play both Physical and Magic)
  SwordMaster: {
    statWeights: { 
      atk: 1.5,    // 1 STR = 0.5 Physical Damage
      hp: 0.8,     // HP ทำง่าย เพราะมาจาก VIT
      fd: 1.2,
      cri: 1.6,    // Critical ทำยาก เพราะมาจาก AGI และมี cap
      ele: 0.0,    
      pdef: 0.8,   // Defense ทำง่าย เพราะมาจาก VIT
      mdef: 0.8
    }
  },
  "Sword Master": {
    statWeights: { 
      atk: 1.5,
      hp: 0.8,
      fd: 1.2,
      cri: 1.6,
      ele: 0.0,
      pdef: 0.8,
      mdef: 0.9
    }
  },
  Bowmaster: {
    statWeights: { 
      atk: 1.5,    // 1 AGI = 0.5 Physical Damage
      hp: 0.8,     // HP ทำยากกว่า เพราะมี VIT ต่ำ
      fd: 1.2,
      cri: 1.5,    // Critical ทำง่ายกว่า เพราะมี AGI สูง
      ele: 0.0,    
      pdef: 0.9,   // Defense ทำยากกว่า เพราะมี VIT ต่ำ
      mdef: 0.8
    }
  },
  Paladin: {
    statWeights: { 
      atk: 1.7,    // 1 STR = 0.5 Physical Damage
      hp: 0.6,     // HP ทำง่ายที่สุด เพราะมี VIT สูงสุด
      fd: 1.2,
      cri: 1.7,    // Critical ทำยากที่สุด เพราะมี AGI ต่ำสุด
      ele: 0.8,    // Can use elemental damage
      pdef: 0.6,   // Defense ทำง่ายที่สุด เพราะมี VIT สูงสุด
      mdef: 0.7
    }
  }
};

// Helper function to format numbers with commas
const formatNumberWithComma = (num: number): string => {
  return num.toLocaleString('en-US');
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
};

// Helper function to get stat value
function getStatValue(character: RankedCharacter, stat: SortType): number {
  if (stat === 'score') {
    return character.score;
  } else if (stat === 'def') {
    return (character.stats.pdef + character.stats.mdef) / 2;
  } else if (isStatSortType(stat)) {
    return character.stats[stat] || 0;
  }
  return 0;
}

// Helper function to sort characters
function sortCharacters(characters: RankedCharacter[], stat: SortType, direction: 'asc' | 'desc'): RankedCharacter[] {
  return [...characters].sort((a, b) => {
    if (stat === 'discord') {
      return direction === 'desc' 
        ? b.discordName.localeCompare(a.discordName)
        : a.discordName.localeCompare(b.discordName);
    }

    const aValue = getStatValue(a, stat);
    const bValue = getStatValue(b, stat);

    return direction === 'desc' ? bValue - aValue : aValue - bValue;
  });
}

const calculateScore = (character: Character): number => {
  const stats = character.stats;
  const roleWeights = ROLE_BALANCE[character.class]?.statWeights || {};
  // ไม่ต้อง cap FD
  const fdPercent = ((stats.fd || 0) * (roleWeights.fd ?? 1.0)) / 100;

  // ไม่ต้อง cap CRI
  const critChance = ((stats.cri || 0) * (roleWeights.cri ?? 1.0)) / 100;
  const critDmg = critChance;
  const critMultiplier = critDmg * critChance + (1 - critChance);

  // Damage output formula (ใช้ statWeights แทน skillMultiplier)
  const effectiveAtk =
    (stats.atk || 0) * (roleWeights.atk ?? 1.0) *
    (1 + fdPercent) *
    (1 + ((stats.ele || 0) * (roleWeights.ele ?? 1.0)) / 100) *
    critMultiplier;

  // Survival bonus (บาลานซ์มากขึ้น, ใช้ statWeights)
  const hpWeight = roleWeights.hp ?? 1.0;
  const defWeight = ((roleWeights.pdef ?? 1.0) + (roleWeights.mdef ?? 1.0)) / 2;
  const survivalScore =
    ((stats.hp || 0) / 1000) * hpWeight +
    (((stats.pdef || 0) + (stats.mdef || 0)) / 2) * defWeight;

  // คะแนนรวม (บาลานซ์ damage/survival)
  const damagePart = effectiveAtk / 10;
  const survivalPart = survivalScore * 10;
  return Math.round((damagePart * 0.6 + survivalPart * 0.4) * 30);
};

export default function RankingPage() {
  const { characters, loading: charactersLoading } = useAllCharacters();
  const { user } = useAuth();
  const { users } = useUsers();
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [selectedStat, setSelectedStat] = useState<SortType>('score');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<{ char: RankedCharacter, rect: DOMRect } | null>(null);
  const cardRefs = useRef<{ [job: string]: HTMLDivElement | null }>({});

  // เพิ่ม useEffect เพื่อติดตามการเปลี่ยนแปลง
  useEffect(() => {
    console.log('Users updated:', users);
    console.log('Characters updated:', characters);
    setForceUpdate(prev => prev + 1);
  }, [users, characters]);

  const handleSort = (stat: SortType) => {
    if (selectedStat === stat) {
      // ถ้าคลิกที่คอลัมน์เดิม สลับทิศทางการเรียง
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      // ถ้าคลิกคอลัมน์ใหม่ ให้เริ่มจากเรียงมากไปน้อย
      setSelectedStat(stat);
      setSortDirection('desc');
    }
  };

  // All characters (ไม่ filter) สำหรับ Top 1 per job (อิง score เท่านั้น)
  const allRankedByScore = useMemo(() => {
    let processed = characters.map(char => {
      const discordName = users[char.userId]?.meta?.discord || 'ไม่มีชื่อ Discord';
      return {
        ...char,
        score: calculateScore(char),
        discordName,
        stats: char.stats as CharacterStats
      };
    }) as RankedCharacter[];
    // Sort by score เท่านั้น
    processed = sortCharacters(processed, 'score', 'desc');
    // Add rank ใหม่แยกตามอาชีพ
    const byJob: { [job: string]: number } = {};
    processed = processed.map(char => {
      byJob[char.class] = (byJob[char.class] || 0) + 1;
      return { ...char, rank: byJob[char.class] };
    });
    return processed;
  }, [characters, users]);

  // หาอันดับ 1 ของแต่ละอาชีพ (จาก allRankedByScore)
  const top1PerJob = useMemo(() => {
    const top: { [job: string]: RankedCharacter | undefined } = {};
    ALLOWED_JOBS.forEach(job => {
      top[job] = allRankedByScore.find(c => c.class === job && c.rank === 1);
    });
    return top;
  }, [allRankedByScore]);

  // Filter and sort characters
  const rankedCharacters = useMemo(() => {
    // First, calculate score and add Discord name for all characters
    let processed = characters.map(char => {
      const discordName = users[char.userId]?.meta?.discord || 'ไม่มีชื่อ Discord';
      console.log(`Character ${char.name} (${char.userId}): Discord name = ${discordName}`);
      return {
        ...char,
        score: calculateScore(char),
        discordName,
        stats: char.stats as CharacterStats
      };
    }) as RankedCharacter[];

    // Sort by selected stat first
    processed = sortCharacters(processed, selectedStat, sortDirection);

    // Add rank to each character
    processed = processed.map((char, index) => ({
      ...char,
      rank: index + 1
    }));

    // Then filter by job and search query
    let filtered = processed;

    // Filter by job
    if (selectedJob !== 'all') {
      filtered = filtered.filter(char => char.class === selectedJob);
      
      // ถ้าเลือกอาชีพเฉพาะ ให้เรียงลำดับใหม่เฉพาะอาชีพนั้น
      filtered = sortCharacters(filtered, selectedStat, sortDirection);

      // กำหนดอันดับใหม่เฉพาะอาชีพนั้น
      filtered = filtered.map((char, index) => ({
        ...char,
        rank: index + 1
      }));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(char => 
        char.name.toLowerCase().includes(query) || 
        char.discordName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [characters, selectedJob, selectedStat, searchQuery, users, sortDirection]);

  const openCharacter = rankedCharacters.find(c => c.id === openCharacterId) || null;

  if (charactersLoading) {
    return (
      <div className="flex items-center justify-center">
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
            <div className="w-8 h-8 rounded-full bg-white shadow-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {/* Top 1 per job (modern glassmorphism, icon effect, gradient name) - MOVE TO TOP */}
          <div className="w-full mt-2 mb-1">
            <div className="mb-2 flex justify-center">
              <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-yellow-200/80 via-yellow-100/90 to-yellow-300/80 backdrop-blur-md shadow-lg flex items-center gap-2 border border-yellow-200/70">
                <span className="text-2xl md:text-3xl animate-bounce text-yellow-400 drop-shadow-glow">🏆</span>
                <span className="text-yellow-700 text-lg md:text-2xl font-extrabold tracking-tight drop-shadow-lg" style={{textShadow:'0 2px 12px #fff,0 0 16px #facc15'}}>
                  Top 1 ของแต่ละอาชีพ
                </span>
                <span className="text-2xl md:text-3xl animate-bounce text-yellow-400 drop-shadow-glow">🏆</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-4 py-1 overflow-visible">
              {ALLOWED_JOBS.map(job => {
                const char = top1PerJob[job];
                if (!char) return null;
                const colors = getClassColors(CLASS_TO_ROLE[job]);
                // ไอคอนอาชีพ + สี glow
                const jobIcons: Record<string, {icon: string, glow: string}> = {
                  'Sword Master': {icon: '⚔️', glow: '#f87171'},
                  'Mercenary': {icon: '⚔️', glow: '#f87171'},
                  'Bowmaster': {icon: '🏹', glow: '#34d399'},
                  'Acrobat': {icon: '🏹', glow: '#34d399'},
                  'Force User': {icon: '🔮', glow: '#a78bfa'},
                  'Elemental Lord': {icon: '🔮', glow: '#a78bfa'},
                  'Paladin': {icon: '✨', glow: '#60a5fa'},
                  'Priest': {icon: '✨', glow: '#60a5fa'},
                  'Engineer': {icon: '🔧', glow: '#fbbf24'},
                  'Alchemist': {icon: '🔧', glow: '#fbbf24'},
                };
                return (
                  <div
                    key={job}
                    ref={el => { cardRefs.current[job] = el; }}
                    className={cn(
                      "relative group flex flex-col items-center justify-center min-w-[110px] max-w-[140px] px-3 py-3 rounded-2xl border border-yellow-200/70 shadow-xl bg-gradient-to-br from-yellow-50/90 via-white/90 to-yellow-100/80 backdrop-blur-md",
                      "hover:scale-105 hover:shadow-2xl transition-all duration-200 cursor-pointer"
                    )}
                    style={{ boxShadow: '0 4px 32px 0 rgba(250,204,21,0.10), 0 2px 8px 0 rgba(0,0,0,0.06)' }}
                    onMouseEnter={e => {
                      const rect = cardRefs.current[job]?.getBoundingClientRect();
                      if (rect) setHoveredCard({ char, rect });
                    }}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <span
                      className="text-3xl mb-1 drop-shadow-glow animate-pulse"
                      style={{
                        color: colors.text,
                        filter: `drop-shadow(0 0 8px #fff8) drop-shadow(0 0 16px ${jobIcons[job].glow})`
                      }}
                    >
                      {jobIcons[job].icon}
                    </span>
                    <span className="font-extrabold text-base md:text-lg text-pink-500 drop-shadow" style={{textShadow:'0 2px 8px #fff'}}>
                      {char.name}
                    </span>
                    <span className={cn("font-semibold text-xs mb-1 drop-shadow", colors.text)} style={{textShadow: `0 2px 8px #fff8, 0 0 8px ${jobIcons[job].glow}`}}>
                      {job}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Tooltip แบบ fixed ลอยอิสระ */}
            {hoveredCard && (
              <div
                className="fixed z-[999999] sm:w-[420px] w-[95vw] min-w-0 max-w-full pointer-events-none"
                style={{
                  left: typeof window !== 'undefined' && window.innerWidth < 640 ? '50vw' : (hoveredCard.rect.left + hoveredCard.rect.width / 2),
                  top: hoveredCard.rect.bottom + 12,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="bg-gradient-to-br from-pink-50 via-yellow-50 to-blue-50/90 border border-pink-200/60 rounded-2xl shadow-2xl sm:p-4 p-2 sm:text-sm text-xs text-gray-800 font-semibold backdrop-blur-xl relative z-[999999] overflow-hidden">
                  <div className="flex items-center gap-2 mb-2 justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500 text-xl">💬</span>
                      <span className="font-bold text-pink-600 text-base">{hoveredCard.char.discordName}</span>
                      <span className="text-xs text-gray-500">({hoveredCard.char.name})</span>
                    </div>
                    <div className="text-green-600 font-bold text-xs flex items-center gap-1 whitespace-nowrap">
                      <span className="">📈</span> {formatNumberWithComma(hoveredCard.char.score)}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-3 grid-cols-2 gap-x-2 gap-y-1 mb-0">
                    <div className="flex items-center gap-1"><span className="text-pink-500">⚔️</span><span className="text-gray-700 font-bold">ATK:</span> <span className="text-pink-600 font-bold">{formatNumberWithComma(hoveredCard.char.stats.atk)}</span></div>
                    <div className="flex items-center gap-1"><span className="text-red-400">❤️</span><span className="text-gray-700 font-bold">HP:</span> <span className="text-red-600 font-bold">{formatNumberWithComma(hoveredCard.char.stats.hp)}</span></div>
                    <div className="flex items-center gap-0.5 text-xs min-w-0 break-words"><span className="text-blue-500">🛡️</span><span className="text-gray-700 font-bold">DEF:</span><span className="text-blue-600 font-bold">P{hoveredCard.char.stats.pdef}%</span><span className="text-gray-400 mx-0.5">/</span><span className="text-purple-600 font-bold">M{hoveredCard.char.stats.mdef}%</span></div>
                    <div className="flex items-center gap-1"><span className="text-yellow-400">🎯</span><span className="text-gray-700 font-bold">CRI:</span> <span className="text-yellow-600 font-bold">{hoveredCard.char.stats.cri}%</span></div>
                    <div className="flex items-center gap-1"><span className="text-purple-400">🔥</span><span className="text-gray-700 font-bold">ELE:</span> <span className="text-purple-600 font-bold">{hoveredCard.char.stats.ele}%</span></div>
                    <div className="flex items-center gap-1"><span className="text-orange-400">💥</span><span className="text-gray-700 font-bold">FD:</span> <span className="text-orange-600 font-bold">{hoveredCard.char.stats.fd}%</span></div>
                  </div>
                  <div className="absolute left-1/2 -top-3 -translate-x-1/2 w-5 h-5 pointer-events-none z-[999999]">
                    <div className="w-5 h-5 bg-gradient-to-br from-pink-50 via-yellow-50 to-blue-50/90 border-t border-r border-pink-200/60 rotate-45"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 bg-gradient-to-r from-pink-50/80 via-white/90 to-blue-50/80 rounded-3xl p-3 md:p-4 shadow-2xl border-0 mt-0 mb-1">
            {/* Left: Title & Description */}
            <div className="flex-[2] min-w-[260px] flex flex-col justify-center gap-2">
              <div className="flex items-center gap-3 mb-1">
                <Trophy className="w-8 h-8 text-yellow-400 drop-shadow" />
                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-600 via-purple-500 to-blue-600 bg-clip-text text-transparent drop-shadow-md">
                  อันดับตัวละคร
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-gray-400" />
                <p className="text-gray-400 text-base md:text-lg font-medium">
                  ดูอันดับและเปรียบเทียบค่าสเตตัสของตัวละครทั้งหมด
                </p>
              </div>
            </div>
            {/* Right: Job Filter Buttons */}
            <div className="flex-[3] flex flex-col items-start gap-2 w-full">
              {/* ปุ่มทั้งหมด แยกแถวและเด่นขึ้น */}
              <button
                onClick={() => setSelectedJob('all')}
                className={cn(
                  "mb-1 px-6 py-2 rounded-full text-base font-bold border-2 shadow transition-all duration-200",
                  selectedJob === 'all'
                    ? "bg-gradient-to-r from-pink-100/80 to-blue-50/80 border-pink-400 text-pink-700 shadow-lg scale-105"
                    : "bg-white/80 border-pink-200/70 text-gray-700 hover:bg-pink-50/60 hover:border-pink-300/50"
                )}
                style={{minWidth: 110}}
              >
                ทั้งหมด
              </button>
              {/* ปุ่มอาชีพอื่นๆ */}
              <div className="flex flex-row flex-wrap gap-2">
                {ALLOWED_JOBS.map(job => {
                  const role = CLASS_TO_ROLE[job];
                  const colors = getClassColors(role);
                  return (
                    <button
                      key={job}
                      onClick={() => setSelectedJob(job)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200",
                        selectedJob === job
                          ? "border-2 border-pink-400 bg-pink-50/60 shadow text-pink-700 font-bold"
                          : "bg-white/90 border-pink-200/50 text-gray-700 hover:bg-pink-50/60 hover:border-pink-300/50",
                        colors.text
                      )}
                      style={{minWidth: 100}}
                    >
                      <span className={cn(colors.text)}>{job}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mobile Stats Selection */}
          <div className="lg:hidden">
            <Select value={selectedStat} onValueChange={(value) => setSelectedStat(value as SortType)}>
              <SelectTrigger className="w-full bg-white/90 backdrop-blur-sm border-pink-200/50">
                <SelectValue placeholder="เลือกสเตตัส" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span>Score</span>
                  </div>
                </SelectItem>
                <SelectItem value="atk">
                  <div className="flex items-center gap-2">
                    <Sword className="w-4 h-4 text-pink-500" />
                    <span>ATK</span>
                  </div>
                </SelectItem>
                <SelectItem value="hp">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span>HP</span>
                  </div>
                </SelectItem>
                <SelectItem value="def">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span>DEF%</span>
                  </div>
                </SelectItem>
                <SelectItem value="cri">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-yellow-400" />
                    <span>CRI%</span>
                  </div>
                </SelectItem>
                <SelectItem value="ele">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-purple-400" />
                    <span>ELE%</span>
                  </div>
                </SelectItem>
                <SelectItem value="fd">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span>FD%</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile Job Selection */}
          <div className="lg:hidden">
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="w-full bg-white/90 backdrop-blur-sm border-pink-200/50">
                <SelectValue placeholder="เลือกอาชีพ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="text-gray-700">ทั้งหมด</span>
                </SelectItem>
                {ALLOWED_JOBS.map(job => {
                  const role = CLASS_TO_ROLE[job];
                  const colors = getClassColors(role);
                  return (
                    <SelectItem key={job} value={job}>
                      <span className={cn(colors.text)}>{job}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Ranking Table */}
          <Card className="overflow-hidden bg-white/90 backdrop-blur-sm border-0 shadow-2xl rounded-3xl mt-0">
            <div className="p-4 pb-0 relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-pink-400 text-lg pointer-events-none">🔍</span>
              <Input
                type="text"
                placeholder="ค้นหาตัวละครหรือชื่อ Discord..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-pink-400 shadow-md shadow-pink-200 rounded-t-3xl rounded-b-none text-sm px-12 py-2 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all duration-150"
              />
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-pink-100/80 via-white/90 to-blue-100/80">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>🏅</span>
                          <span className="hidden sm:inline">อันดับ</span>
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors whitespace-nowrap"
                        onClick={() => handleSort('discord')}
                      >
                        <div className="flex items-center gap-1">
                          <span>👤</span>
                          <span className="hidden sm:inline">Discord</span>
                          {selectedStat === 'discord' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>🎮</span>
                          <span className="hidden sm:inline">ตัวละคร</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span>🧙</span>
                          <span className="hidden sm:inline">อาชีพ</span>
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors whitespace-nowrap"
                        onClick={() => handleSort('atk')}
                      >
                        <div className="flex items-center gap-1">
                          <Sword className="w-4 h-4 text-pink-500" />
                          <span>ATK</span>
                          {selectedStat === 'atk' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors whitespace-nowrap"
                        onClick={() => handleSort('hp')}
                      >
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-red-400" />
                          <span>HP</span>
                          {selectedStat === 'hp' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors whitespace-nowrap"
                        onClick={() => handleSort('def')}
                      >
                        <div className="flex items-center gap-1">
                          <Shield className="w-4 h-4 text-blue-400" />
                          <span>DEF%</span>
                          {selectedStat === 'def' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors whitespace-nowrap"
                        onClick={() => handleSort('cri')}
                      >
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-yellow-400" />
                          <span>CRI%</span>
                          {selectedStat === 'cri' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors whitespace-nowrap"
                        onClick={() => handleSort('ele')}
                      >
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-purple-400" />
                          <span>ELE%</span>
                          {selectedStat === 'ele' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors whitespace-nowrap"
                        onClick={() => handleSort('fd')}
                      >
                        <div className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-orange-400" />
                          <span>FD%</span>
                          {selectedStat === 'fd' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors whitespace-nowrap"
                        onClick={() => handleSort('score')}
                      >
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <span>Score</span>
                          {selectedStat === 'score' && (
                            <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-pink-100/50">
                    {rankedCharacters.map((character, idx) => {
                      let borderLeftColor = "transparent";
                      if (character.rank === 1) borderLeftColor = "#facc15"; // yellow-400
                      else if (character.rank === 2) borderLeftColor = "#bfc1c6"; // silver
                      else if (character.rank === 3) borderLeftColor = "#fb923c"; // orange-400

                      // กำหนดพื้นหลังและตัวเลข + special effect
                      let bgClass = "";
                      let rankTextClass = "text-pink-600";
                      let specialEffect = "";
                      if (character.rank === 1) {
                        bgClass = "bg-gradient-to-r from-yellow-200 via-yellow-100 to-white shadow-2xl";
                        rankTextClass = "text-yellow-600 drop-shadow-lg";
                        specialEffect = "ring-4 ring-yellow-300/60";
                      } else if (character.rank === 2) {
                        bgClass = "bg-gradient-to-r from-gray-400 via-gray-200 to-white shadow-xl";
                        rankTextClass = "text-gray-500 drop-shadow";
                        specialEffect = "ring-4 ring-gray-300/50";
                      } else if (character.rank === 3) {
                        bgClass = "bg-gradient-to-r from-orange-200 via-orange-100 to-white shadow-lg";
                        rankTextClass = "text-orange-500 drop-shadow";
                        specialEffect = "ring-4 ring-orange-300/40";
                      }

                      // borderRadius เฉพาะแถวแรก/สุดท้ายของผลลัพธ์เท่านั้น
                      const borderRadius = idx === 0
                        ? "1.5rem 1.5rem 0 0"
                        : idx === rankedCharacters.length - 1
                        ? "0 0 1.5rem 1.5rem"
                        : undefined;

                      return (
                        <tr
                          key={character.id}
                          className={cn(
                            "group transition-all duration-200",
                            bgClass,
                            specialEffect,
                            user?.uid === character.userId && "bg-gradient-to-r from-blue-100/70 to-blue-50/70"
                          )}
                          style={{
                            borderLeftWidth: 8,
                            borderLeftColor,
                            borderRadius
                          }}
                        >
                          <td className={cn(
                            "px-4 py-3 text-sm font-bold group-hover:text-pink-700 whitespace-nowrap drop-shadow",
                            rankTextClass
                          )}>
                            #{character.rank}
                            {character.rank === 1 && <span className="ml-1 align-middle">🥇</span>}
                            {character.rank === 2 && <span className="ml-1 align-middle">🥈</span>}
                            {character.rank === 3 && <span className="ml-1 align-middle">🥉</span>}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span className="text-black font-medium group-hover:text-gray-800">
                              {character.discordName}
                            </span>
                          </td>
                          <td 
                            className="px-4 py-3 text-sm cursor-pointer whitespace-nowrap"
                            onClick={() => setOpenCharacterId(character.id)}
                          >
                            <span className="text-gray-600 font-medium group-hover:text-gray-800 underline underline-offset-2">
                              {character.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span className={cn(
                              "font-medium group-hover:opacity-90",
                              getClassColors(CLASS_TO_ROLE[character.class]).text
                            )}>
                              {character.class}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-pink-600 font-bold group-hover:text-pink-700 whitespace-nowrap">
                            {formatNumber(character.stats.atk)}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-500 font-bold group-hover:text-red-600 whitespace-nowrap">
                            {formatNumber(character.stats.hp)}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <div className="flex items-center gap-0.5">
                              <span className="font-semibold text-blue-500">{character.stats.pdef}%</span>
                              <span className="text-gray-400 mx-0.5">/</span>
                              <span className="font-semibold text-purple-500">{character.stats.mdef}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-yellow-500 font-bold group-hover:text-yellow-600 whitespace-nowrap">
                            {character.stats.cri}%
                          </td>
                          <td className="px-4 py-3 text-sm text-purple-500 font-bold group-hover:text-purple-600 whitespace-nowrap">
                            {character.stats.ele}%
                          </td>
                          <td className="px-4 py-3 text-sm text-orange-500 font-bold group-hover:text-orange-600 whitespace-nowrap">
                            {character.stats.fd}%
                          </td>
                          <td className="px-4 py-3 text-sm text-green-500 font-extrabold group-hover:text-green-600 whitespace-nowrap">
                            {formatNumberWithComma(character.score)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      {/* Popup แสดง stat + checklist */}
      <Dialog open={!!openCharacterId} onOpenChange={open => !open && setOpenCharacterId(null)}>
        <DialogContent
          className={cn(
            "max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto shadow-xl rounded-2xl p-0 border-2 backdrop-blur-xl z-[110] mt-8",
            openCharacter ? getClassColors(CLASS_TO_ROLE[openCharacter.class]).border : '',
            openCharacter ? getClassColors(CLASS_TO_ROLE[openCharacter.class]).bgSoft : '',
            openCharacter ? "scrollbar-thumb-rounded-lg scrollbar-track-rounded-lg" : ''
          )}
          style={openCharacter ? {
            marginTop: '2rem',
            borderRadius: '1rem',
            scrollbarColor: `${getClassColors(CLASS_TO_ROLE[openCharacter.class]).bgSoft} #e5e7eb`,
            scrollbarWidth: 'thin'
          } : {
            marginTop: '2rem',
            borderRadius: '1rem'
          }}
        >
          {/* ซ่อน scrollbar ใน PC ด้วย CSS-in-JS */}
          <style jsx global>{`
            @media (min-width: 1024px) {
              .modal-hide-scrollbar::-webkit-scrollbar {
                display: none !important;
              }
              .modal-hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            }
          `}</style>
          <div className="modal-hide-scrollbar">
            {openCharacter && (() => {
              const colors = getClassColors(CLASS_TO_ROLE[openCharacter.class]);
              const stats = openCharacter.stats;
              return (
                <div className="p-4 sm:p-6">
                  <DialogHeader>
                    <DialogTitle className="flex flex-wrap items-center gap-3 mb-2">
                      <span className={cn(
                        "text-2xl font-extrabold bg-clip-text text-transparent",
                        colors.gradientText
                      )}>{openCharacter.name}</span>
                      <span className={cn(
                        "text-base font-semibold px-3 py-1 rounded-full border shadow",
                        colors.border,
                        colors.bgVeryLight,
                        colors.text
                      )}>
                        {openCharacter.class}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 mb-2">
                      <span className="font-medium text-gray-700">Discord:</span> {openCharacter.discordName}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    {/* Stat Section: grid 2 cols, each stat in its own box */}
                    <div className={cn(
                      "rounded-xl p-4 sm:p-5 shadow border backdrop-blur-sm mb-1",
                      colors.border,
                      colors.bgVeryLight
                    )}>
                      <h4 className={cn(
                        "text-lg font-bold mb-3 flex items-center gap-2",
                        colors.text
                      )}>
                        <Sword className={cn("w-5 h-5", colors.text)} />
                        สเตตัสตัวละคร
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                          <Sword className="w-5 h-5 text-pink-500" />
                          <span className="font-bold text-gray-700">ATK:</span>
                          <span className="font-semibold text-pink-600">{stats.atk}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                          <Heart className="w-5 h-5 text-red-400" />
                          <span className="font-bold text-gray-700">HP:</span>
                          <span className="font-semibold text-red-500">{stats.hp}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                          <Shield className="w-5 h-5 text-blue-400" />
                          <span className="font-bold text-gray-700">DEF:</span>
                          <span className="font-semibold text-blue-500">{stats.pdef}%</span>
                          <span className="text-gray-400 mx-0.5">/</span>
                          <span className="font-semibold text-purple-500">{stats.mdef}%</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                          <Target className="w-5 h-5 text-yellow-400" />
                          <span className="font-bold text-gray-700">CRI:</span>
                          <span className="font-semibold text-yellow-500">{stats.cri}%</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                          <Flame className="w-5 h-5 text-purple-400" />
                          <span className="font-bold text-gray-700">ELE:</span>
                          <span className="font-semibold text-purple-500">{stats.ele}%</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 border border-gray-100">
                          <Zap className="w-5 h-5 text-orange-400" />
                          <span className="font-bold text-gray-700">FD:</span>
                          <span className="font-semibold text-orange-500">{stats.fd}%</span>
                        </div>
                      </div>
                    </div>
                    {/* Checklist Section */}
                    <div className={cn(
                      "rounded-xl p-4 sm:p-5 shadow border backdrop-blur-sm",
                      colors.border,
                      colors.bgVeryLight
                    )}>
                      <h4 className={cn(
                        "text-lg font-bold mb-3 flex items-center gap-2",
                        colors.text
                      )}>
                        <TrendingUp className={cn("w-5 h-5", colors.text)} />
                        เช็คลิสต์ประจำวัน/สัปดาห์
                      </h4>
                      <CharacterChecklist
                        checklist={openCharacter.checklist}
                        onChange={() => {}}
                        accentColor={colors.text}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 