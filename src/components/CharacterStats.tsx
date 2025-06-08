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
          <Sword className="h-4 w-4 text-pink-500" />
          <span className="text-gray-600">ATK</span> <span className="text-pink-600">{formatNumber(stats.atk)}</span>
        </p>
        <p className="text-sm font-medium flex items-center gap-1">
          <Heart className="h-4 w-4 text-red-400" />
          <span className="text-gray-600">HP</span> <span className="text-red-500">{formatNumber(stats.hp)}</span>
        </p>
        <p className="text-sm font-medium flex items-center gap-1">
          <Shield className="h-4 w-4 text-blue-400" />
          <span className="text-gray-600">DEF</span> <span className="flex items-center gap-1">
            <span className="text-blue-500">P</span> <span className="text-blue-500">{formatNumber(stats.pdef, true)}</span>
            <span className="text-purple-500">M</span> <span className="text-purple-500">{formatNumber(stats.mdef, true)}</span>
          </span>
        </p>
      </div>
      {/* Right Column */}
      <div className="space-y-2">
        <p className="text-sm font-medium flex items-center gap-1">
          <Target className="h-4 w-4 text-yellow-400" />
          <span className="text-gray-600">CRI</span> <span className="text-yellow-600">{formatNumber(stats.cri, true)}</span>
        </p>
        <p className="text-sm font-medium flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-gray-600">ELE</span> <span className="text-purple-600">{formatNumber(stats.ele, true)}</span>
        </p>
        <p className="text-sm font-medium flex items-center gap-1">
          <Zap className="h-4 w-4 text-orange-400" />
          <span className="text-gray-600">FD</span> <span className="text-orange-600">{formatNumber(stats.fd, true)}</span>
        </p>
      </div>
    </div>
  );
} 