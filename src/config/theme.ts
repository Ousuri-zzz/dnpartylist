import type { CharacterClass, CharacterMainClass } from '../types/character';

// สีหลักสำหรับพื้นหลังและ Progress bar
export const CLASS_COLORS: Record<CharacterMainClass, { bg: string; text: string; border: string }> = {
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
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200'
  }
};

// สีสำหรับข้อความ
export const CLASS_TEXT_COLORS: Record<CharacterMainClass, string> = {
  'Warrior': 'text-rose-700',
  'Archer': 'text-emerald-700',
  'Sorceress': 'text-violet-700',
  'Cleric': 'text-sky-700',
  'Academic': 'text-yellow-700'
};

// สีสำหรับ border
export const CLASS_BORDER_COLORS: Record<CharacterMainClass, string> = {
  'Warrior': 'border-rose-300',
  'Archer': 'border-emerald-300',
  'Sorceress': 'border-violet-300',
  'Cleric': 'border-sky-300',
  'Academic': 'border-yellow-300'
};

// สีพื้นหลังอ่อนๆ สำหรับ card
export const CLASS_BG_COLORS: Record<CharacterMainClass, string> = {
  'Warrior': 'bg-rose-50',
  'Archer': 'bg-emerald-50',
  'Sorceress': 'bg-violet-50',
  'Cleric': 'bg-sky-50',
  'Academic': 'bg-yellow-50'
};

export const CLASS_TO_MAIN_CLASS: Record<CharacterClass, CharacterMainClass> = {
  'Swordsman': 'Warrior',
  'Mercenary': 'Warrior',
  'Bowmaster': 'Archer',
  'Acrobat': 'Archer',
  'Force User': 'Sorceress',
  'Elemental Lord': 'Sorceress',
  'Paladin': 'Cleric',
  'Saint': 'Cleric',
  'Engineer': 'Academic',
  'Alchemist': 'Academic'
};

export const getClassColors = (mainClass: CharacterMainClass) => {
  switch (mainClass) {
    case 'Warrior':
      return {
        text: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200'
      };
    case 'Archer':
      return {
        text: 'text-emerald-600',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200'
      };
    case 'Sorceress':
      return {
        text: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200'
      };
    case 'Cleric':
      return {
        text: 'text-sky-600',
        bg: 'bg-sky-50',
        border: 'border-sky-200'
      };
    case 'Academic':
      return {
        text: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200'
      };
    default:
      return {
        text: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200'
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