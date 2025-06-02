import type { CharacterClass } from '../types/character';
import { Role } from '@/types/character';

// สีหลักสำหรับพื้นหลังและ Progress bar
export const CLASS_COLORS: Record<Role, { bg: string; text: string; border: string; icon?: string }> = {
  Warrior: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200'
  },
  Archer: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200'
  },
  Sorceress: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  Cleric: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  Academic: {
    bg: 'from-amber-100 to-yellow-200/70',
    text: 'text-amber-600',
    border: 'border-amber-300',
    icon: '🔧'
  }
};

// สีสำหรับข้อความ
export const CLASS_TEXT_COLORS: Record<Role, string> = {
  'Warrior': 'text-rose-700',
  'Archer': 'text-emerald-700',
  'Sorceress': 'text-violet-700',
  'Cleric': 'text-sky-700',
  'Academic': 'text-yellow-700'
};

// สีสำหรับ border
export const CLASS_BORDER_COLORS: Record<Role, string> = {
  'Warrior': 'border-rose-300',
  'Archer': 'border-emerald-300',
  'Sorceress': 'border-violet-300',
  'Cleric': 'border-sky-300',
  'Academic': 'border-yellow-300'
};

// สีพื้นหลังอ่อนๆ สำหรับ card
export const CLASS_BG_COLORS: Record<Role, string> = {
  'Warrior': 'bg-rose-50',
  'Archer': 'bg-emerald-50',
  'Sorceress': 'bg-violet-50',
  'Cleric': 'bg-sky-50',
  'Academic': 'bg-yellow-50'
};

export const CLASS_TO_ROLE: Record<CharacterClass, Role> = {
  'Sword Master': 'Warrior',
  'Mercenary': 'Warrior',
  'Bowmaster': 'Archer',
  'Acrobat': 'Archer',
  'Force User': 'Sorceress',
  'Elemental Lord': 'Sorceress',
  'Paladin': 'Cleric',
  'Priest': 'Cleric',
  'Engineer': 'Academic',
  'Alchemist': 'Academic'
};

export const getClassColors = (role: Role): { text: string; bg: string; border: string; icon?: string; bgSoft?: string; bgVeryLight?: string; gradientText?: string } => {
  switch (role) {
    case 'Warrior':
      return {
        text: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: ROLE_ICONS.Warrior,
        bgSoft: 'bg-gradient-to-br from-rose-50/90 to-pink-100/80',
        bgVeryLight: 'bg-rose-50/80',
        gradientText: 'bg-gradient-to-r from-rose-500 via-pink-500 to-pink-400'
      };
    case 'Archer':
      return {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: ROLE_ICONS.Archer,
        bgSoft: 'bg-gradient-to-br from-lime-50/90 to-green-100/80',
        bgVeryLight: 'bg-lime-50/80',
        gradientText: 'bg-gradient-to-r from-lime-500 via-green-500 to-emerald-400'
      };
    case 'Sorceress':
      return {
        text: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: ROLE_ICONS.Sorceress,
        bgSoft: 'bg-gradient-to-br from-fuchsia-50/90 to-purple-100/80',
        bgVeryLight: 'bg-fuchsia-50/80',
        gradientText: 'bg-gradient-to-r from-fuchsia-500 via-purple-500 to-violet-400'
      };
    case 'Cleric':
      return {
        text: 'text-sky-600',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        icon: ROLE_ICONS.Cleric,
        bgSoft: 'bg-gradient-to-br from-cyan-50/90 to-blue-100/80',
        bgVeryLight: 'bg-cyan-50/80',
        gradientText: 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-400'
      };
    case 'Academic':
      return {
        text: 'text-amber-600',
        bg: 'from-amber-100 to-yellow-200/70',
        border: 'border-amber-300',
        icon: ROLE_ICONS.Academic,
        bgSoft: 'bg-gradient-to-br from-yellow-50/90 to-amber-100/80',
        bgVeryLight: 'bg-yellow-50/80',
        gradientText: 'bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-400'
      };
    default:
      return {
        text: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: '👤',
        bgSoft: 'bg-gradient-to-br from-gray-100 to-gray-200/80',
        bgVeryLight: 'bg-gray-50/80',
        gradientText: 'bg-gradient-to-r from-gray-400 to-gray-600'
      };
  }
};

export function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

export const ROLE_COLORS: Record<Role, { bg: string; text: string; border: string; icon?: string }> = {
  Warrior: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200'
  },
  Archer: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200'
  },
  Sorceress: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-200'
  },
  Cleric: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-200'
  },
  Academic: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200'
  }
};

export const ROLE_NAMES: Record<Role, string> = {
  Warrior: 'Warrior',
  Archer: 'Archer',
  Sorceress: 'Sorceress',
  Cleric: 'Cleric',
  Academic: 'Academic'
};

export const ROLE_ICONS: Record<Role, string> = {
  Warrior: '⚔️',
  Archer: '🏹',
  Sorceress: '🔮',
  Cleric: '✨',
  Academic: '🔧'
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Warrior: 'Physical damage dealers',
  Archer: 'Ranged damage dealers',
  Sorceress: 'Magic damage dealers',
  Cleric: 'Support and healing',
  Academic: 'Technical specialists'
};

interface ClassColors {
  text: string;
  border: string;
  icon: string;
}

export function getClassColor(characterClass: string): ClassColors {
  switch (characterClass.toLowerCase()) {
    case 'sword master':
    case 'mercenary':
      return {
        text: 'text-red-700',
        border: 'border-red-500',
        icon: '⚔️'
      };
    case 'bowmaster':
    case 'acrobat':
      return {
        text: 'text-green-700',
        border: 'border-green-500',
        icon: '🏹'
      };
    case 'force user':
    case 'elemental lord':
      return {
        text: 'text-purple-700',
        border: 'border-purple-500',
        icon: '✨'
      };
    case 'paladin':
    case 'priest':
      return {
        text: 'text-blue-700',
        border: 'border-blue-500',
        icon: '🛡️'
      };
    case 'engineer':
    case 'alchemist':
      return {
        text: 'text-yellow-700',
        border: 'border-yellow-500',
        icon: '🔧'
      };
    default:
      return {
        text: 'text-gray-700',
        border: 'border-gray-500',
        icon: '👤'
      };
  }
} 