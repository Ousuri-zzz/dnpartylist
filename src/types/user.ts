import { Character } from './character';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  characters?: { [key: string]: Character };
  meta?: {
    discord?: string;
    lastResetDaily?: number;
    lastResetWeekly?: number;
  };
  discordName?: string;
  discordId: string;
  isGuildLeader?: boolean;
}

export interface UserWithCharacters extends User {
  characters: { [key: string]: Character };
} 