export type NestType = 
  | 'Cerberus Hell'
  | 'Cerberus Challenge'
  | 'Manticore Hell'
  | 'Apocalypse Hell'
  | 'Sea Dragon'
  | 'Chaos Rift Kamala'
  | 'Chaos Rift Bairra'
  | 'Banquet Hall'
  | 'Jealous Albeuteur'
  | 'Theme Park';

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