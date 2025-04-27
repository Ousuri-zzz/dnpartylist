export type Role = 'Warrior' | 'Archer' | 'Sorcerer' | 'Cleric' | 'Tinkerer';

export type CharacterMainClass = Role;

export type CharacterClass = 
  | 'Sword Master' 
  | 'Mercenary' 
  | 'Bowmaster' 
  | 'Acrobat' 
  | 'Force User' 
  | 'Elemental Lord' 
  | 'Paladin' 
  | 'Priest'
  | 'Engineer'
  | 'Alchemist';

export interface BaseStats {
  str: number;
  agi: number;
  int: number;
  vit: number;
  spr: number;
  points: number;
}

export interface CombatStats {
  atk: number;
  hp: number;
  fd: number;
  cri: number;
  ele: number;
  pdef: number;
  mdef: number;
}

export interface CharacterStats extends BaseStats, CombatStats {}

export interface EditableStats {
  str: string;
  agi: string;
  int: string;
  vit: string;
  spr: string;
  points: string;
  atk: string;
  hp: string;
  fd: string;
  cri: string;
  ele: string;
  pdef: string;
  mdef: string;
}

export interface CharacterChecklist {
  daily: {
    dailyQuest: boolean;
    ftg: boolean;
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
    seaDragonHell: number;
    seaDragonChallenge: number;
    themePark: number;
    themeHell: number;
    chaosRiftKamala: number;
    chaosRiftBairra: number;
    banquetHall: number;
    jealousAlbeuteur: number;
  };
}

export interface Character {
  id: string;
  name: string;
  level: number;
  class: CharacterClass;
  mainClass: CharacterMainClass;
  stats: CharacterStats;
  checklist: CharacterChecklist;
  userId: string;
  discordName?: string;
}

export interface EditableCharacter extends Omit<Character, 'stats'> {
  stats: EditableStats;
}

export const convertToEditableStats = (stats: CharacterStats): EditableStats => ({
  str: String(stats.str),
  agi: String(stats.agi),
  int: String(stats.int),
  vit: String(stats.vit),
  spr: String(stats.spr),
  points: String(stats.points),
  atk: String(stats.atk),
  hp: String(stats.hp),
  fd: String(stats.fd),
  cri: String(stats.cri),
  ele: String(stats.ele),
  pdef: String(stats.pdef),
  mdef: String(stats.mdef)
});

export const convertToCharacterStats = (stats: EditableStats): CharacterStats => ({
  str: Number(stats.str) || 0,
  agi: Number(stats.agi) || 0,
  int: Number(stats.int) || 0,
  vit: Number(stats.vit) || 0,
  spr: Number(stats.spr) || 0,
  points: Number(stats.points) || 0,
  atk: Number(stats.atk) || 0,
  hp: Number(stats.hp) || 0,
  fd: Number(stats.fd) || 0,
  cri: Number(stats.cri) || 0,
  ele: Number(stats.ele) || 0,
  pdef: Number(stats.pdef) || 0,
  mdef: Number(stats.mdef) || 0
}); 