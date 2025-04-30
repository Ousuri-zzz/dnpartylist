import { Character } from './character';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  characters?: { [key: string]: Character };
  meta?: {
    discord?: string;
  };
  discordName?: string;
}

export interface UserWithCharacters extends User {
  characters: { [key: string]: Character };
} 