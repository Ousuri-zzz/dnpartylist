export type NestType = 
  | 'Minotaur'
  | 'Cerberus'
  | 'Cerberus Hell'
  | 'Cerberus Challenge'
  | 'Manticore'
  | 'Manticore Hell'
  | 'Apocalypse'
  | 'Apocalypse Hell'
  | 'Sea Dragon'
  | 'Sea Dragon Classic'
  | 'Chaos Rift: Bairra'
  | 'Chaos Rift: Kamala'
  | 'Dark Banquet Hall'
  | 'Jealous Albeuteur'
  | 'Theme Park'
  | 'DQ+FTG700';

export interface PartyMember {
  userId: string;
  joinedAt: string;
}

export interface PartyGoals {
  atk: number;
  hp: number;
  def: number;
  cri: number;
  ele?: number;
  fd?: number;
}

export interface Party {
  id: string;
  name: string;
  leader: string;
  createdBy: string;
  createdAt: string;
  maxMember: number;
  members: { [characterId: string]: PartyMember };
  goals?: PartyGoals;
  nest?: NestType;
  message?: string;
  discordLink?: string;
}

export interface PartyWithMembers extends Party {
  memberCharacters?: {
    [charId: string]: {
      name: string;
      class: string;
      mainClass: string;
      userId: string;
      discordName?: string;
    };
  };
} 