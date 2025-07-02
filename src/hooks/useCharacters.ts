import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';
import { Character } from '../types/character';
import { useAuth } from './useAuth';

export function useCharacters() {
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

    const charactersRef = ref(db, `users/${user.uid}/characters`);
    
    const unsubscribe = onValue(charactersRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        const charactersArray = Object.entries(data).map(([id, charData]: [string, any]) => ({
          id,
          name: charData.name,
          level: charData.level || 1,
          class: charData.class,
          mainClass: charData.mainClass,
          stats: charData.stats,
          checklist: charData.checklist,
          userId: charData.userId,
          discordName: charData.discordName
        } as Character));
        setCharacters(charactersArray);
      } else {
        setCharacters([]);
      }
      setLoading(false);
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