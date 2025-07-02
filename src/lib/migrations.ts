import { ref, get, update } from 'firebase/database';
import { Character, CharacterClass } from '@/types/character';
import { db } from './firebase';

export async function migrateCharacterJobs() {
  try {
    // Get all users
    const usersRef = ref(db, 'users');
    const usersSnapshot = await get(usersRef);
    
    if (!usersSnapshot.exists()) {
      return;
    }

    const users = usersSnapshot.val();
    const updates: { [key: string]: any } = {};

    // Iterate through each user
    for (const userId in users) {
      const charactersRef = ref(db, `users/${userId}/characters`);
      const charactersSnapshot = await get(charactersRef);

      if (!charactersSnapshot.exists()) {
        continue;
      }

      const characters = charactersSnapshot.val();

      // Iterate through each character
      for (const characterId in characters) {
        const character = characters[characterId] as Character;
        let needsUpdate = false;

        // Check if character needs migration
        if (character.class === 'Swordsman' as CharacterClass) {
          updates[`users/${userId}/characters/${characterId}/class`] = 'Sword Master';
          needsUpdate = true;
        } else if (character.class === 'Saint' as CharacterClass) {
          updates[`users/${userId}/characters/${characterId}/class`] = 'Priest';
          needsUpdate = true;
        }

        if (needsUpdate) {
        }
      }
    }

    // Apply all updates
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
    }
  } catch (error) {
    throw error;
  }
} 