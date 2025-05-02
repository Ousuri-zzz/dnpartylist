'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAllCharacters } from '../../hooks/useAllCharacters';
import { useAuth } from '../../hooks/useAuth';
import { useUsers } from '../../hooks/useUsers';
import { Character, CharacterClass } from '../../types/character';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Sword, Heart, Shield, Target, Flame, Zap, TrendingUp } from 'lucide-react';
import { CLASS_TO_ROLE, getClassColors } from '../../config/theme';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { CharacterStats } from '../../components/CharacterStats';
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

type StatType = 'score' | 'atk' | 'hp' | 'def' | 'cri' | 'ele' | 'fd';

interface RankedCharacter extends Character {
  score: number;
  discordName: string;
  rank: number;
}

const jobWeights = {
  "Sword Master":     { atk: 1.0, hp: 0.2, def: 0.3, cri: 0.6, ele: 0.2, fd: 0.7 },
  "Mercenary":        { atk: 0.6, hp: 1.0, def: 0.8, cri: 0.2, ele: 0.1, fd: 0.3 },
  "Bowmaster":        { atk: 1.0, hp: 0.3, def: 0.2, cri: 0.8, ele: 0.6, fd: 0.4 },
  "Acrobat":          { atk: 0.7, hp: 0.3, def: 0.3, cri: 1.0, ele: 0.8, fd: 0.3 },
  "Force User":       { atk: 0.5, hp: 0.3, def: 0.2, cri: 0.6, ele: 1.0, fd: 0.8 },
  "Elemental Lord":   { atk: 0.6, hp: 0.3, def: 0.3, cri: 0.5, ele: 1.0, fd: 1.0 },
  "Paladin":          { atk: 0.2, hp: 1.0, def: 1.0, cri: 0.1, ele: 0.1, fd: 0.2 },
  "Priest":           { atk: 0.3, hp: 1.0, def: 1.0, cri: 0.1, ele: 0.2, fd: 0.2 },
  "Engineer":         { atk: 0.6, hp: 0.6, def: 0.4, cri: 0.7, ele: 0.5, fd: 1.0 },
  "Alchemist":        { atk: 0.3, hp: 0.8, def: 0.7, cri: 0.3, ele: 0.4, fd: 1.0 },
} as const;

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toFixed(0);
};

export default function RankingPage() {
  const { characters, loading: charactersLoading } = useAllCharacters();
  const { user } = useAuth();
  const { users } = useUsers();
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [selectedStat, setSelectedStat] = useState<StatType>('score');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);

  const handleSort = (stat: StatType) => {
    if (selectedStat === stat) {
      // ถ้าคลิกที่คอลัมน์เดิม สลับทิศทางการเรียง
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      // ถ้าคลิกคอลัมน์ใหม่ ให้เริ่มจากเรียงมากไปน้อย
      setSelectedStat(stat);
      setSortDirection('desc');
    }
  };

  // Calculate score based on job weights
  const calculateScore = (character: Character): number => {
    const weights = jobWeights[character.class as keyof typeof jobWeights] || {
      atk: 1.0, hp: 1.0, def: 1.0, cri: 1.0, ele: 1.0, fd: 1.0
    };
    
    const stats = character.stats;
    const def = (stats.pdef + stats.mdef) / 2;
    
    return (
      (stats.atk * weights.atk) +
      (stats.hp * weights.hp) +
      (def * 10000 * weights.def) +
      (stats.cri * 10000 * weights.cri) +
      (stats.ele * 10000 * weights.ele) +
      (stats.fd * 10000 * weights.fd)
    );
  };

  // Filter and sort characters
  const rankedCharacters = useMemo(() => {
    // First, calculate score and add Discord name for all characters
    let processed = characters.map(char => ({
      ...char,
      score: calculateScore(char),
      discordName: users[char.userId]?.meta?.discord || 'ไม่มีชื่อ Discord'
    })) as RankedCharacter[];

    // Sort by selected stat first
    processed.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      if (selectedStat === 'score') {
        aValue = a.score;
        bValue = b.score;
      } else if (selectedStat === 'def') {
        // For DEF, use the average of PDEF and MDEF
        aValue = (a.stats.pdef + a.stats.mdef) / 2;
        bValue = (b.stats.pdef + b.stats.mdef) / 2;
      } else {
        aValue = a.stats[selectedStat];
        bValue = b.stats[selectedStat];
      }

      return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
    });

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
      const jobCharacters = filtered;
      jobCharacters.sort((a, b) => {
        let aValue: number;
        let bValue: number;

        if (selectedStat === 'score') {
          aValue = a.score;
          bValue = b.score;
        } else if (selectedStat === 'def') {
          aValue = (a.stats.pdef + a.stats.mdef) / 2;
          bValue = (b.stats.pdef + b.stats.mdef) / 2;
        } else {
          aValue = a.stats[selectedStat];
          bValue = b.stats[selectedStat];
        }

        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      });

      // กำหนดอันดับใหม่เฉพาะอาชีพนั้น
      filtered = jobCharacters.map((char, index) => ({
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
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">
                อันดับตัวละคร
              </h1>
              <p className="text-gray-500">ดูอันดับและเปรียบเทียบค่าสเตตัสของตัวละครทั้งหมด</p>
            </div>
          </div>

          {/* Search and Job Filter */}
          <div className="flex flex-col gap-4">
            <div className="w-full max-w-md">
              <Input
                type="text"
                placeholder="ค้นหาตัวละครหรือชื่อ Discord..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/50 backdrop-blur-sm border-pink-200/50 focus:border-pink-300/50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedJob('all')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  "bg-white/50 backdrop-blur-sm border border-pink-200/50",
                  "hover:bg-pink-50/50 hover:border-pink-300/50",
                  selectedJob === 'all' && "bg-pink-100/50 border-pink-300/50"
                )}
              >
                ทั้งหมด
              </button>
              {ALLOWED_JOBS.map(job => {
                const role = CLASS_TO_ROLE[job];
                const colors = getClassColors(role);
                return (
                  <button
                    key={job}
                    onClick={() => setSelectedJob(job)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                      "bg-white/50 backdrop-blur-sm border",
                      "hover:bg-opacity-70",
                      selectedJob === job && "bg-opacity-70",
                      colors.border
                    )}
                  >
                    <span className={cn(colors.text)}>{job}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ranking Table */}
          <Card className="overflow-hidden bg-white/30 backdrop-blur-sm border-pink-200/50 shadow-lg">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-pink-50 to-blue-50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        <div className="flex items-center gap-1">
                          <span>🏅</span>
                          <span>อันดับ</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        <div className="flex items-center gap-1">
                          <span>👤</span>
                          <span>Discord</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        <div className="flex items-center gap-1">
                          <span>🎮</span>
                          <span>ตัวละคร</span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        <div className="flex items-center gap-1">
                          <span>🧙</span>
                          <span>อาชีพ</span>
                        </div>
                      </th>
                      <th 
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors"
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
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors"
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
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors"
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
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors"
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
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors"
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
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors"
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
                        className="px-4 py-3 text-left text-sm font-medium text-gray-500 cursor-pointer hover:bg-pink-50/50 transition-colors"
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
                    {rankedCharacters.map((character) => (
                      <tr
                        key={character.id}
                        className={cn(
                          "group transition-all duration-200",
                          "hover:bg-gradient-to-r hover:from-pink-100/80 hover:to-pink-50/80 hover:shadow-md hover:scale-[1.01]",
                          "hover:border-l-4 hover:border-pink-300/50",
                          user?.uid === character.userId && "bg-gradient-to-r from-blue-100/80 to-blue-50/80"
                        )}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-pink-600 group-hover:text-pink-700">#{character.rank}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-black font-medium group-hover:text-gray-800">{character.discordName}</span>
                        </td>
                        <td 
                          className="px-4 py-3 text-sm cursor-pointer"
                          onClick={() => setOpenCharacterId(character.id)}
                        >
                          <span className="text-gray-600 font-medium group-hover:text-gray-800 underline underline-offset-2">{character.name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={cn(
                            "font-medium group-hover:opacity-90",
                            getClassColors(CLASS_TO_ROLE[character.class]).text
                          )}>
                            {character.class}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-pink-600 font-medium group-hover:text-pink-700">{formatNumber(character.stats.atk)}</td>
                        <td className="px-4 py-3 text-sm text-red-500 font-medium group-hover:text-red-600">{formatNumber(character.stats.hp)}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-blue-500 font-medium group-hover:text-blue-600">{character.stats.pdef}%</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-purple-500 font-medium group-hover:text-purple-600">{character.stats.mdef}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-yellow-500 font-medium group-hover:text-yellow-600">{character.stats.cri}%</td>
                        <td className="px-4 py-3 text-sm text-purple-500 font-medium group-hover:text-purple-600">{character.stats.ele}%</td>
                        <td className="px-4 py-3 text-sm text-orange-500 font-medium group-hover:text-orange-600">{character.stats.fd}%</td>
                        <td className="px-4 py-3 text-sm text-green-500 font-medium group-hover:text-green-600">
                          {formatNumber(character.score)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      {/* Popup แสดง stat + checklist */}
      <Dialog open={!!openCharacterId} onOpenChange={open => !open && setOpenCharacterId(null)}>
        <DialogContent className="max-w-xl w-[85vw] max-h-[90vh] overflow-y-auto">
          {openCharacter && (
            <div className="p-3">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 mb-1">
                  <span className="text-xl font-bold bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">{openCharacter.name}</span>
                  <span className={cn(
                    "text-sm font-semibold px-2 py-0.5 rounded-full",
                    getClassColors(CLASS_TO_ROLE[openCharacter.class]).text,
                    getClassColors(CLASS_TO_ROLE[openCharacter.class]).bg
                  )}>
                    {openCharacter.class}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  <span className="text-gray-600">Discord: </span>
                  <span className="font-medium text-gray-800">{openCharacter.discordName}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-3">
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-gray-700">
                    <Sword className="w-3.5 h-3.5 text-pink-500" />
                    สเตตัสตัวละคร
                  </h4>
                  <CharacterStats stats={openCharacter.stats} />
                </div>
                <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 shadow-sm">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-gray-700">
                    <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                    เช็คลิสต์ประจำวัน/สัปดาห์
                  </h4>
                  <CharacterChecklist 
                    checklist={openCharacter.checklist} 
                    onChange={() => {}} 
                    accentColor={getClassColors(CLASS_TO_ROLE[openCharacter.class]).text} 
                    readOnly 
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 