import React from 'react';
import { Sword, Heart, Shield, Zap, Sparkles, Target } from 'lucide-react';

interface CharacterStats {
  atk: number;
  hp: number;
  fd: number;
  cri: number;
  ele: number;
  pdef: number;
  mdef: number;
}

interface CharacterStatsProps {
  stats: CharacterStats;
}

function formatNumber(value: number, isPercentage: boolean = false): string {
  if (isPercentage) {
    return `${value}%`;
  }
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

export function CharacterStats({ stats }: CharacterStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left Column */}
      <div className="space-y-2">
        <p className="text-sm font-medium flex items-center gap-1">
          <Sword className="h-4 w-4 text-red-500" />
          ATK {formatNumber(stats.atk)}
        </p>
        <p className="text-sm font-medium flex items-center gap-1">
          <Heart className="h-4 w-4 text-pink-500" />
          HP {formatNumber(stats.hp)}
        </p>
        <p className="text-sm font-medium flex items-center gap-1">
          <Shield className="h-4 w-4 text-blue-500" />
          DEF <span className="flex items-center gap-0.5 text-xs">
            <span className="text-blue-600">P</span> {formatNumber(stats.pdef, true)}
            <span className="text-purple-600 ml-1">M</span> {formatNumber(stats.mdef, true)}
          </span>
        </p>
      </div>
      {/* Right Column */}
      <div className="space-y-2">
        <p className="text-sm font-medium flex items-center gap-1">
          <Target className="h-4 w-4 text-orange-500" />
          CRI {formatNumber(stats.cri, true)}
        </p>
        <p className="text-sm font-medium flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          ELE {formatNumber(stats.ele, true)}
        </p>
        <p className="text-sm font-medium flex items-center gap-1">
          <Zap className="h-4 w-4 text-indigo-500" />
          FD {formatNumber(stats.fd, true)}
        </p>
      </div>
    </div>
  );
} 