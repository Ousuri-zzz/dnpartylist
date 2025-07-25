import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { Character } from '../types/character';
import { useAuth } from './useAuth';

export function useAllCharacters() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setCharacters([]);
      setLoading(false);
      return;
    }

    const usersRef = ref(db, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const allCharacters: Character[] = [];
          
          // Process each user's characters
          Object.entries(data).forEach(([userId, userData]: [string, any]) => {
            if (userData.characters) {
              Object.entries(userData.characters).forEach(([charId, charData]: [string, any]) => {
                allCharacters.push({
                  id: charId,
                  userId,
                  name: charData.name,
                  level: charData.level || 1,
                  class: charData.class,
                  mainClass: charData.mainClass,
                  stats: charData.stats || {},
                  checklist: charData.checklist || {},
                  discordName: userData.discordName || 'Unknown'
                });
              });
            }
          });

          setCharacters(allCharacters);
        } else {
          setCharacters([]);
        }
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process all characters');
        setLoading(false);
      }
    }, (error) => {
      setError(error.message);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  return { characters, loading, error };
} 