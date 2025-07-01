'use client';

import { Character } from "../types/character";
import { StatDisplay } from "./StatDisplay";
import { motion } from 'framer-motion';

interface PartyStatsProps {
  members: Character[];
}

type StatsAccumulator = {
  atk: number;
  hp: number;
  pdef: number;
  mdef: number;
  cri: number;
  ele: number;
  fd: number;
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function PartyStats({ members }: PartyStatsProps) {
  // Calculate average stats
  const averageStats = members.reduce((acc, member) => {
    const stats = member.stats || {};
    return {
      atk: acc.atk + (Number(stats.atk) || 0),
      hp: acc.hp + (Number(stats.hp) || 0),
      pdef: acc.pdef + (Number(stats.pdef) || 0),
      mdef: acc.mdef + (Number(stats.mdef) || 0),
      cri: acc.cri + (Number(stats.cri) || 0),
      ele: acc.ele + (Number(stats.ele) || 0),
      fd: acc.fd + (Number(stats.fd) || 0)
    };
  }, {
    atk: 0,
    hp: 0,
    pdef: 0,
    mdef: 0,
    cri: 0,
    ele: 0,
    fd: 0
  } as StatsAccumulator);

  const memberCount = members.length || 1; // Prevent division by zero
  
  // Calculate averages
  const stats = {
    atk: Math.round(averageStats.atk / memberCount),
    hp: Math.round(averageStats.hp / memberCount),
    pdef: Math.round(averageStats.pdef / memberCount),
    mdef: Math.round(averageStats.mdef / memberCount),
    cri: Math.round(averageStats.cri / memberCount),
    ele: Math.round(averageStats.ele / memberCount),
    fd: Math.round(averageStats.fd / memberCount)
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-3 gap-3"
    >
      <StatDisplay
        label="ATK"
        value={stats.atk}
        icon="⚔️"
        className="bg-gradient-to-br from-red-50/80 to-pink-50/80 dark:bg-white/10 dark:from-none dark:to-none"
      />
      <StatDisplay
        label="HP"
        value={stats.hp}
        icon="❤️"
        className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:bg-white/10 dark:from-none dark:to-none"
      />
      <StatDisplay
        label="DEF"
        values={[stats.pdef, stats.mdef]}
        icon="🛡️"
        suffix="%"
        className="bg-gradient-to-br from-blue-50/80 to-cyan-50/80 dark:bg-white/10 dark:from-none dark:to-none"
      />
      <StatDisplay
        label="CRI"
        value={stats.cri}
        icon="🎯"
        suffix="%"
        className="bg-gradient-to-br from-yellow-50/80 to-amber-50/80 dark:bg-white/10 dark:from-none dark:to-none"
      />
      <StatDisplay
        label="ELE"
        value={stats.ele}
        icon="⚡"
        suffix="%"
        className="bg-gradient-to-br from-purple-50/80 to-violet-50/80 dark:bg-white/10 dark:from-none dark:to-none"
      />
      <StatDisplay
        label="FD"
        value={stats.fd}
        icon="💥"
        suffix="%"
        className="bg-gradient-to-br from-orange-50/80 to-rose-50/80 dark:bg-white/10 dark:from-none dark:to-none"
      />
    </motion.div>
  );
} 