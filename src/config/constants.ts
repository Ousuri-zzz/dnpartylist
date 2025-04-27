import { CharacterClass, CharacterMainClass } from '@/types/character';

export const CHARACTER_CLASSES: CharacterClass[] = [
  'Swordsman',
  'Mercenary',
  'Bowmaster',
  'Acrobat',
  'Force User',
  'Elemental Lord',
  'Paladin',
  'Saint',
  'Engineer',
  'Alchemist',
];

export const CHARACTER_MAIN_CLASSES: CharacterMainClass[] = [
  'Warrior',
  'Archer',
  'Sorceress',
  'Cleric',
  'Academic',
];

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