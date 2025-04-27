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

    console.log('useCharacters: Starting to fetch characters for user:', user.uid);
    const charactersRef = ref(db, `users/${user.uid}/characters`);
    
    const unsubscribe = onValue(charactersRef, (snapshot) => {
      console.log('useCharacters: Snapshot received:', snapshot.exists());
      const data = snapshot.val();
      console.log('useCharacters: Raw characters data:', data);
      
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
        console.log('useCharacters: Processed characters array:', charactersArray);
        setCharacters(charactersArray);
      } else {
        console.log('useCharacters: No characters found');
        setCharacters([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('useCharacters: Error fetching characters:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => {
      console.log('useCharacters: Cleaning up subscription');
      unsubscribe();
    };
  }, [user]);

  return { characters, loading, error };
} 