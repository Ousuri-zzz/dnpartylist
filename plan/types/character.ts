export type CharacterClass = 
  | 'Swordsman' 
  | 'Mercenary' 
  | 'Bowmaster' 
  | 'Acrobat' 
  | 'Force User' 
  | 'Elemental Lord' 
  | 'Paladin' 
  | 'Saint';

export type CharacterMainClass = 'Warrior' | 'Archer' | 'Sorceress' | 'Cleric';

export interface CharacterStats {
  atk: number;
  cri: number;
  fd: number;
  element: number;
  hp: number;
  pdef: number;
  mdef: number;
}

export interface CharacterChecklist {
  daily: {
    dailyQuest: boolean;
    ftg700: boolean;
  };
  weekly: {
    minotaur: number;
    cerberus: number;
    cerberusHell: number;
    cerberusChallenge: number;
    manticore: number;
    manticoreHell: number;
    apocalypse: number;
    apocalypseHell: number;
    seaDragon: number;
    chaosRiftKamala: number;
    chaosRiftBairra: number;
    banquetHall: number;
    jealousAlbeuteur: number;
    themePark: number;
  };
}

export interface Character {
  id: string;
  name: string;
  class: CharacterClass;
  mainClass: CharacterMainClass;
  stats: CharacterStats;
  checklist: CharacterChecklist;
  userId: string;
} 