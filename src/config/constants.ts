import { CharacterClass, CharacterMainClass, Role } from '@/types/character';

export const CHARACTER_CLASSES = [
  'Sword Master',
  'Mercenary',
  'Bowmaster',
  'Acrobat',
  'Force User',
  'Elemental Lord',
  'Paladin',
  'Priest',
  'Engineer',
  'Alchemist'
] as const;

export const CHARACTER_MAIN_CLASSES: CharacterMainClass[] = [
  'Warrior',
  'Archer',
  'Sorceress',
  'Cleric',
  'Academic',
];

export const CLASS_TO_ROLE: Record<CharacterClass, Role> = {
  'Sword Master': 'Warrior',
  'Mercenary': 'Warrior',
  'Bowmaster': 'Archer',
  'Acrobat': 'Archer',
  'Force User': 'Sorceress',
  'Elemental Lord': 'Sorceress',
  'Paladin': 'Cleric',
  'Priest': 'Cleric',
  'Engineer': 'Tinkerer',
  'Alchemist': 'Tinkerer'
}; 