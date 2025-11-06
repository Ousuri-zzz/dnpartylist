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

// Adjustable per-class score bonus multipliers
// Tip: tweak these values (e.g., 1.08 = +8%) to gently lift classes that score low despite real difficulty
const CLASS_SCORE_BONUS: Record<CharacterClass, number> = {
  'Sword Master': 1.05,
  'Mercenary': 1.00,
  'Bowmaster': 1.14,
  'Acrobat': 1.00,
  'Force User': 1.08,
  'Elemental Lord': 1.17,
  'Paladin': 1.00,
  'Priest': 1.00,
  'Engineer': 1.12,
  'Alchemist': 1.14,
};

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

// New: Role-based balanced weight profiles (sum ~= 1.0)
// We will normalize stats per dataset to reduce class bias
const ROLE_WEIGHT_PROFILE: Record<string, Required<RoleConstants>['statWeights']> = {
  // Warrior-like (Sword Master, Mercenary)
  Warrior: { atk: 0.52, hp: 0.06, fd: 0.14, cri: 0.16, ele: 0.05, pdef: 0.04, mdef: 0.03 },
  // Archer-like (Bowmaster, Acrobat)
  Archer: { atk: 0.48, hp: 0.06, fd: 0.12, cri: 0.20, ele: 0.08, pdef: 0.04, mdef: 0.02 },
  // Sorceress (Force User, Elemental Lord and their subjobs)
  Sorceress: { atk: 0.45, hp: 0.06, fd: 0.12, cri: 0.16, ele: 0.15, pdef: 0.03, mdef: 0.03 },
  // Cleric (Paladin, Priest) – a bit more survival credit
  Cleric: { atk: 0.40, hp: 0.15, fd: 0.10, cri: 0.10, ele: 0.10, pdef: 0.08, mdef: 0.07 },
  // Academic (Engineer, Alchemist)
  Academic: { atk: 0.46, hp: 0.08, fd: 0.12, cri: 0.18, ele: 0.08, pdef: 0.05, mdef: 0.03 },
};

type StatWeights = { atk: number; hp: number; fd: number; cri: number; ele: number; pdef: number; mdef: number };

type GlobalMaxStats = {
  atk: number; hp: number; fd: number; cri: number; ele: number; pdef: number; mdef: number;
};

function computeGlobalMaxStats(characters: Character[]): GlobalMaxStats {
  const init: GlobalMaxStats = { atk: 1, hp: 1, fd: 1, cri: 1, ele: 1, pdef: 1, mdef: 1 };
  return characters.reduce((acc, c) => {
    const s = c.stats as CharacterStats;
    acc.atk = Math.max(acc.atk, s.atk || 0);
    acc.hp = Math.max(acc.hp, s.hp || 0);
    acc.fd = Math.max(acc.fd, s.fd || 0);
    acc.cri = Math.max(acc.cri, s.cri || 0);
    acc.ele = Math.max(acc.ele, s.ele || 0);
    acc.pdef = Math.max(acc.pdef, s.pdef || 0);
    acc.mdef = Math.max(acc.mdef, s.mdef || 0);
    return acc;
  }, init);
}

type DifficultyFactors = { atk: number; hp: number; fd: number; cri: number; ele: number; pdef: number; mdef: number };

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function computeDifficultyFactors(characters: Character[], maxes: GlobalMaxStats): DifficultyFactors {
  const gather = (selector: (s: CharacterStats) => number) => {
    const vals = characters.map(c => selector(c.stats as CharacterStats)).map(v => Math.max(0, Math.min(1, v)));
    vals.sort((a, b) => a - b);
    const p50 = percentile(vals, 50);
    const p90 = percentile(vals, 90);
    const spread = Math.max(0.05, p90 - p50); // avoid div by zero
    // Smaller spread => harder to push high values => give higher difficulty
    // Map spread in [0.05..0.5+] -> factor in [1.4 .. 0.9]
    const factor = Math.max(0.9, Math.min(1.4, 1.4 - (spread - 0.05) * 1.1));
    return factor;
  };

  const atkN = (s: CharacterStats) => (s.atk || 0) / (maxes.atk || 1);
  const hpN = (s: CharacterStats) => (s.hp || 0) / (maxes.hp || 1);
  const fdN = (s: CharacterStats) => Math.min((s.fd || 0) / 100, 1);
  const criN = (s: CharacterStats) => Math.min((s.cri || 0) / 100, 1);
  const eleN = (s: CharacterStats) => Math.min((s.ele || 0) / 100, 1);
  const pdefN = (s: CharacterStats) => Math.min((s.pdef || 0) / 100, 1);
  const mdefN = (s: CharacterStats) => Math.min((s.mdef || 0) / 100, 1);

  return {
    atk: gather(atkN),
    hp: gather(hpN),
    fd: gather(fdN),
    cri: gather(criN),
    ele: gather(eleN),
    pdef: gather(pdefN),
    mdef: gather(mdefN)
  };
}

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

// Balanced score using normalized stats and role weight profile
function calculateScore(character: Character, maxes: GlobalMaxStats, difficulty: DifficultyFactors): number {
  const stats = character.stats as CharacterStats;
  const role = CLASS_TO_ROLE[character.class];
  const w: StatWeights = (ROLE_WEIGHT_PROFILE[role] as StatWeights) || (ROLE_WEIGHT_PROFILE.Warrior as StatWeights);

  // Normalize stats to 0..1 range against dataset maxima
  const atkN = (stats.atk || 0) / (maxes.atk || 1);
  const hpN = (stats.hp || 0) / (maxes.hp || 1);
  const fdN = Math.min((stats.fd || 0) / 100, 1);
  const criN = Math.min((stats.cri || 0) / 100, 1);
  const eleN = Math.min((stats.ele || 0) / 100, 1);
  const defAvg = ((stats.pdef || 0) + (stats.mdef || 0)) / 2;
  const defN = Math.min(defAvg / 100, 1);

  // Weighted sum
  const total = 
    w.atk * difficulty.atk * atkN +
    w.hp * difficulty.hp * hpN +
    w.fd * difficulty.fd * fdN +
    w.cri * difficulty.cri * criN +
    w.ele * difficulty.ele * eleN +
    // split def between pdef/mdef to keep the two knobs meaningful
    (w.pdef || 0) * difficulty.pdef * Math.min((stats.pdef || 0) / 100, 1) +
    (w.mdef || 0) * difficulty.mdef * Math.min((stats.mdef || 0) / 100, 1);

  // Scale to familiar score band (approx 20k-130k)
  return Math.round(total * 120000);
}

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
    setForceUpdate(prev => prev + 1);
  }, [users, characters]);

  // Compute dataset maxima for normalization
  const globalMaxes = useMemo(() => computeGlobalMaxStats(characters), [characters]);
  const difficultyFactors = useMemo(() => computeDifficultyFactors(characters, globalMaxes), [characters, globalMaxes]);

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
      const bonus = CLASS_SCORE_BONUS[(char.class as CharacterClass)] ?? 1;
      return {
        ...char,
        score: Math.round(calculateScore(char, globalMaxes, difficultyFactors) * bonus),
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
  }, [characters, users, globalMaxes, difficultyFactors]);

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
      const bonus = CLASS_SCORE_BONUS[(char.class as CharacterClass)] ?? 1;
      return {
        ...char,
        score: Math.round(calculateScore(char, globalMaxes, difficultyFactors) * bonus),
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
  }, [characters, selectedJob, selectedStat, searchQuery, users, sortDirection, globalMaxes, difficultyFactors]);

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
    <div className={cn("min-h-screen py-8", "relative")}>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {/* Top 1 per job */}
          <div className="w-full mt-2 mb-1">
            <div className="mb-2 flex justify-center">
              <div className="px-6 py-2 rounded-xl bg-yellow-100/90 dark:bg-gray-800/90 dark:border-yellow-900 shadow-lg flex items-center gap-2 border border-yellow-200/70 dark:border-yellow-900">
                <span className="text-2xl md:text-3xl animate-bounce text-yellow-400 drop-shadow-glow">🏆</span>
                <span className="text-yellow-700 dark:text-yellow-200 text-lg md:text-2xl font-extrabold tracking-tight drop-shadow-lg">
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
                const jobDarkModeColors = {
                  'Sword Master': 'dark:text-pink-200',
                  'Mercenary': 'dark:text-pink-200',
                  'Bowmaster': 'dark:text-emerald-200',
                  'Acrobat': 'dark:text-emerald-200',
                  'Force User': 'dark:text-purple-200',
                  'Elemental Lord': 'dark:text-purple-200',
                  'Paladin': 'dark:text-sky-200',
                  'Priest': 'dark:text-sky-200',
                  'Engineer': 'dark:text-amber-200',
                  'Alchemist': 'dark:text-amber-200',
                };
                // เพิ่มเอฟเฟกต์เรืองแสงให้เฉพาะอันดับ 1
                const isTop1 = char.rank === 1;
                return (
                  <div
                    key={job}
                    ref={el => { cardRefs.current[job] = el; }}
                    className={cn(
                      "relative group flex flex-col items-center justify-center min-w-[110px] max-w-[140px] px-3 py-3 rounded-2xl border shadow-xl",
                      "border-yellow-200/70 bg-yellow-50/90 dark:bg-gray-900/90 dark:border-yellow-900",
                      "hover:scale-105 hover:shadow-2xl transition-all duration-200 cursor-pointer"
                    )}
                    onMouseEnter={e => {
                      const rect = cardRefs.current[job]?.getBoundingClientRect();
                      if (rect) setHoveredCard({ char, rect });
                    }}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <span
                      className={cn(
                        "text-3xl mb-1",
                        jobDarkModeColors[job] || '',
                        isTop1 && "drop-shadow-[0_0_64px_#fff] drop-shadow-[0_0_40px_#fff] drop-shadow-[0_0_16px_#fff] animate-pulse"
                      )}
                    >
                      {getClassIcon(job)}
                    </span>
                    <span className="font-extrabold text-base md:text-lg text-pink-500 dark:text-pink-200">
                      {char.name}
                    </span>
                    <span className={cn("font-semibold text-xs mb-1", colors.text, "dark:text-gray-200")}>{job}</span>
                  </div>
                );
              })}
            </div>
            {/* Tooltip */}
            {hoveredCard && (
              <div
                className="fixed z-[999999] sm:w-[420px] w-[95vw] min-w-0 max-w-full pointer-events-none"
                style={{
                  left: typeof window !== 'undefined' && window.innerWidth < 640 ? '50vw' : (hoveredCard.rect.left + hoveredCard.rect.width / 2),
                  top: hoveredCard.rect.bottom + 12,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="bg-white/90 dark:bg-gray-900 border border-pink-200/60 dark:border-pink-800 rounded-2xl shadow-2xl sm:p-4 p-2 sm:text-sm text-xs text-gray-800 dark:text-gray-200 font-semibold backdrop-blur-xl relative z-[999999] overflow-hidden">
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
                    <div className="w-5 h-5 bg-white dark:bg-gray-800 border-t border-r border-pink-200/60 rotate-45"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 bg-pink-50/80 dark:bg-gray-800/90 rounded-3xl p-3 md:p-4 shadow-2xl border-0 mt-0 mb-1">
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
                    ? "bg-pink-50 dark:bg-pink-900/40 border-pink-400 dark:border-pink-400 text-pink-700 dark:text-pink-200 font-bold"
                    : "bg-white dark:bg-gray-800 border-pink-200 dark:border-pink-700 text-gray-700 dark:text-gray-100 hover:bg-pink-100 dark:hover:bg-gray-700"
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
                          ? "border-2 border-pink-400 dark:border-pink-400 bg-pink-50 dark:bg-pink-900/40 text-pink-700 dark:text-pink-200 font-bold"
                          : "bg-white dark:bg-gray-800 border-pink-200 dark:border-pink-700 text-gray-700 dark:text-gray-100 hover:bg-pink-100 dark:hover:bg-gray-700",
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
              <SelectTrigger className="w-full bg-white/90 dark:bg-gray-900 backdrop-blur-sm border-pink-200/50 dark:border-pink-800">
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
              <SelectTrigger className="w-full bg-white/90 dark:bg-gray-900 backdrop-blur-sm border-pink-200/50 dark:border-pink-800">
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
          <Card className="overflow-hidden bg-white/90 dark:bg-gray-900 backdrop-blur-sm border-0 shadow-2xl rounded-3xl mt-0">
            <div className="p-4 pb-0 relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-pink-400 dark:text-pink-200 text-lg pointer-events-none">🔍</span>
              <Input
                type="text"
                placeholder="ค้นหาตัวละครหรือชื่อ Discord..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border-2 border-pink-400 dark:border-pink-700 shadow-md shadow-pink-200 dark:shadow-none rounded-t-3xl rounded-b-none text-sm px-12 py-2 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 focus:border-blue-400 dark:focus:border-blue-800 transition-all duration-150 text-gray-900 dark:text-gray-100"
              />
            </div>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-pink-100/80 dark:bg-gray-900">
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
                  <tbody className="divide-y divide-pink-100/50 dark:divide-pink-900/60">
                    {rankedCharacters.map((character, idx) => {
                      let borderLeftColor = "transparent";
                      if (character.rank === 1) borderLeftColor = "#facc15"; // yellow-400
                      else if (character.rank === 2) borderLeftColor = "#bfc1c6"; // silver
                      else if (character.rank === 3) borderLeftColor = "#fb923c"; // orange-400

                      let bgClass = "";
                      let rankTextClass = "text-pink-600 dark:text-pink-200";
                      let specialEffect = "";
                      if (character.rank === 1) {
                        bgClass = "bg-yellow-100 dark:bg-gray-800 shadow-2xl";
                        rankTextClass = "text-yellow-600 dark:text-yellow-300 drop-shadow-lg";
                      } else if (character.rank === 2) {
                        bgClass = "bg-gray-200 dark:bg-gray-800 shadow-xl";
                        rankTextClass = "text-gray-500 dark:text-gray-200 drop-shadow";
                      } else if (character.rank === 3) {
                        bgClass = "bg-orange-100 dark:bg-gray-800 shadow-lg";
                        rankTextClass = "text-orange-500 dark:text-orange-300 drop-shadow";
                      }

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
                            user?.uid === character.userId && "bg-blue-100/70 dark:bg-blue-900/30"
                          )}
                          style={{
                            borderLeftWidth: 8,
                            borderLeftColor,
                            borderRadius
                          }}
                        >
                          <td className={cn(
                            "px-4 py-3 text-sm font-bold group-hover:text-pink-700 dark:group-hover:text-pink-300 whitespace-nowrap drop-shadow",
                            rankTextClass
                          )}>
                            #{character.rank}
                            {character.rank === 1 && <span className="ml-1 align-middle">🥇</span>}
                            {character.rank === 2 && <span className="ml-1 align-middle">🥈</span>}
                            {character.rank === 3 && <span className="ml-1 align-middle">🥉</span>}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap max-w-[220px] overflow-hidden text-ellipsis">
                            <span className="text-black dark:text-gray-100 font-medium group-hover:text-gray-800 dark:group-hover:text-gray-200 block truncate" title={character.discordName}>
                              {character.discordName}
                            </span>
                          </td>
                          <td 
                            className="px-4 py-3 text-sm cursor-pointer whitespace-nowrap"
                            onClick={() => setOpenCharacterId(character.id)}
                          >
                            <span className="text-gray-600 dark:text-gray-200 font-medium group-hover:text-gray-800 dark:group-hover:text-gray-100 underline underline-offset-2">
                              {character.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 font-medium group-hover:opacity-90">
                              <span className="text-base">{getClassIcon(character.class)}</span>
                              <span className={cn(getClassColors(CLASS_TO_ROLE[character.class]).text, "dark:text-gray-200")}>{character.class}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-pink-600 dark:text-pink-200 font-bold group-hover:text-pink-700 dark:group-hover:text-pink-300 whitespace-nowrap">
                            {formatNumber(character.stats.atk)}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-500 dark:text-red-200 font-bold group-hover:text-red-600 dark:group-hover:text-red-300 whitespace-nowrap">
                            {formatNumber(character.stats.hp)}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            <div className="flex items-center gap-0.5">
                              <span className="font-semibold text-blue-500 dark:text-blue-200">{character.stats.pdef}%</span>
                              <span className="text-gray-400 mx-0.5">/</span>
                              <span className="font-semibold text-purple-500 dark:text-purple-200">{character.stats.mdef}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-yellow-500 dark:text-yellow-200 font-bold group-hover:text-yellow-600 dark:group-hover:text-yellow-300 whitespace-nowrap">
                            {character.stats.cri}%
                          </td>
                          <td className="px-4 py-3 text-sm text-purple-500 dark:text-purple-200 font-bold group-hover:text-purple-600 dark:group-hover:text-purple-300 whitespace-nowrap">
                            {character.stats.ele}%
                          </td>
                          <td className="px-4 py-3 text-sm text-orange-500 dark:text-orange-200 font-bold group-hover:text-orange-600 dark:group-hover:text-orange-300 whitespace-nowrap">
                            {character.stats.fd}%
                          </td>
                          <td className="px-4 py-3 text-sm text-green-500 dark:text-green-200 font-extrabold group-hover:text-green-600 dark:group-hover:text-green-300 whitespace-nowrap">
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
            "dark:bg-black",
            openCharacter ? getClassColors(CLASS_TO_ROLE[openCharacter.class]).border : ''
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
                        "text-base font-semibold px-3 py-1 rounded-full border shadow inline-flex items-center gap-1",
                        colors.border,
                        colors.bgVeryLight,
                        colors.text,
                        "dark:bg-gray-800/80 dark:border-pink-700 dark:text-gray-100"
                      )}>
                        <span className="text-base">{getClassIcon(openCharacter.class)}</span>
                        {openCharacter.class}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500 dark:text-gray-300 mb-2">
                      <span className="font-medium text-gray-700 dark:text-gray-200">Discord:</span> {openCharacter.discordName}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    {/* Stat Section: grid 2 cols, each stat in its own box */}
                    <div className={cn(
                      "rounded-xl p-4 sm:p-5 shadow border backdrop-blur-sm mb-1",
                      colors.border,
                      "bg-white/80 dark:bg-black border",
                      openCharacter ? getClassColors(CLASS_TO_ROLE[openCharacter.class]).border : ''
                    )}>
                      <h4 className={cn(
                        "text-lg font-bold mb-3 flex items-center gap-2",
                        colors.text,
                        "dark:text-gray-100"
                      )}>
                        <Sword className={cn("w-5 h-5", colors.text, "dark:text-pink-200")} />
                        สเตตัสตัวละคร
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-pink-800">
                          <Sword className="w-5 h-5 text-pink-500 dark:text-pink-200" />
                          <span className="font-bold text-gray-700 dark:text-gray-200">ATK:</span>
                          <span className="font-semibold text-pink-600 dark:text-pink-200">{stats.atk}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-pink-800">
                          <Heart className="w-5 h-5 text-red-400 dark:text-red-200" />
                          <span className="font-bold text-gray-700 dark:text-gray-200">HP:</span>
                          <span className="font-semibold text-red-500 dark:text-red-200">{stats.hp}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-pink-800">
                          <Shield className="w-5 h-5 text-blue-400 dark:text-blue-200" />
                          <span className="font-bold text-gray-700 dark:text-gray-200">DEF:</span>
                          <span className="font-semibold text-blue-500 dark:text-blue-200">{stats.pdef}%</span>
                          <span className="text-gray-400 mx-0.5 dark:text-gray-400">/</span>
                          <span className="font-semibold text-purple-500 dark:text-purple-200">{stats.mdef}%</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-pink-800">
                          <Target className="w-5 h-5 text-yellow-400 dark:text-yellow-200" />
                          <span className="font-bold text-gray-700 dark:text-gray-200">CRI:</span>
                          <span className="font-semibold text-yellow-500 dark:text-yellow-200">{stats.cri}%</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-pink-800">
                          <Flame className="w-5 h-5 text-purple-400 dark:text-purple-200" />
                          <span className="font-bold text-gray-700 dark:text-gray-200">ELE:</span>
                          <span className="font-semibold text-purple-500 dark:text-purple-200">{stats.ele}%</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-pink-800">
                          <Zap className="w-5 h-5 text-orange-400 dark:text-orange-200" />
                          <span className="font-bold text-gray-700 dark:text-gray-200">FD:</span>
                          <span className="font-semibold text-orange-500 dark:text-orange-200">{stats.fd}%</span>
                        </div>
                      </div>
                    </div>
                    {/* Checklist Section */}
                    <div className={cn(
                      "rounded-xl p-4 sm:p-5 shadow border backdrop-blur-sm",
                      colors.border,
                      "bg-white/80 dark:bg-black border",
                      openCharacter ? getClassColors(CLASS_TO_ROLE[openCharacter.class]).border : ''
                    )}>
                      <h4 className={cn(
                        "text-lg font-bold mb-3 flex items-center gap-2",
                        colors.text,
                        "dark:text-gray-100"
                      )}>
                        <TrendingUp className={cn("w-5 h-5", colors.text, "dark:text-pink-200")} />
                        เช็คลิสต์ประจำวัน/สัปดาห์
                      </h4>
                      <CharacterChecklist
                        checklist={openCharacter.checklist}
                        onChange={() => {}}
                        accentColor={colors.text}
                        readOnly
                        lineThroughOnComplete
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