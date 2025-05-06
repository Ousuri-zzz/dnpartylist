'use client';

import { useState, useEffect } from 'react';
import { getDatabase, ref, onValue, off, update } from 'firebase/database';
import { Character } from '../types/character';
import { User } from '../types/user';

export interface Users {
  [key: string]: User;
}

export function useUsers() {
  const [users, setUsers] = useState<Users>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const database = getDatabase();
    const usersRef = ref(database, 'users');
    setIsLoading(true);
    
    const unsubscribe = onValue(usersRef, 
      (snapshot) => {
        try {
        const data = snapshot.val();
          if (data) {
        const processedUsers: Users = {};
        
        Object.entries(data).forEach(([uid, userData]: [string, any]) => {
          // Process characters into an object
          const characters: { [key: string]: Character } = {};
          if (userData.characters) {
            Object.entries(userData.characters).forEach(([charId, charData]: [string, any]) => {
              characters[charId] = {
                id: charId,
                name: charData.name,
                level: charData.level || 1,
                class: charData.class || 'Unknown',
                mainClass: charData.mainClass || '',
                userId: charData.userId || '',
                stats: {
                  str: charData.stats?.str || 0,
                  agi: charData.stats?.agi || 0,
                  int: charData.stats?.int || 0,
                  vit: charData.stats?.vit || 0,
                  spr: charData.stats?.spr || 0,
                  points: charData.stats?.points || 0,
                  atk: charData.stats?.atk || 0,
                  hp: charData.stats?.hp || 0,
                  pdef: charData.stats?.pdef || 0,
                  mdef: charData.stats?.mdef || 0,
                  cri: charData.stats?.cri || 0,
                  ele: charData.stats?.ele || 0,
                  fd: charData.stats?.fd || 0
                },
                checklist: {
                  daily: {
                    dailyQuest: charData.checklist?.daily?.dailyQuest || false,
                    ftg: charData.checklist?.daily?.ftg || false
                  },
                  weekly: {
                    minotaur: charData.checklist?.weekly?.minotaur || 0,
                    cerberus: charData.checklist?.weekly?.cerberus || 0,
                    cerberusHell: charData.checklist?.weekly?.cerberusHell || 0,
                    cerberusChallenge: charData.checklist?.weekly?.cerberusChallenge || 0,
                    manticore: charData.checklist?.weekly?.manticore || 0,
                    manticoreHell: charData.checklist?.weekly?.manticoreHell || 0,
                    apocalypse: charData.checklist?.weekly?.apocalypse || 0,
                    apocalypseHell: charData.checklist?.weekly?.apocalypseHell || 0,
                    seaDragon: charData.checklist?.weekly?.seaDragon || 0,
                    themePark: charData.checklist?.weekly?.themePark || 0,
                    themeHell: charData.checklist?.weekly?.themeHell || 0,
                    chaosRiftKamala: charData.checklist?.weekly?.chaosRiftKamala || 0,
                    chaosRiftBairra: charData.checklist?.weekly?.chaosRiftBairra || 0,
                    banquetHall: charData.checklist?.weekly?.banquetHall || 0,
                    jealousAlbeuteur: charData.checklist?.weekly?.jealousAlbeuteur || 0
                  }
                }
              };
            });
          }

          processedUsers[uid] = {
            uid,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            meta: {
                  discord: userData.meta?.discord || 'ไม่ทราบ',
                  lastResetDaily: userData.meta?.lastResetDaily,
                  lastResetWeekly: userData.meta?.lastResetWeekly
            },
            characters,
            discordId: userData.meta?.discord || ''
          };

              // Initialize lastReset values if not present
          if (userData?.meta) {
            const updates: Record<string, number> = {};
                if (userData.meta.lastResetDaily === undefined) {
              updates['lastResetDaily'] = Date.now();
            }
                if (userData.meta.lastResetWeekly === undefined) {
              updates['lastResetWeekly'] = Date.now();
            }
            if (Object.keys(updates).length > 0) {
                  update(ref(database, `users/${uid}/meta`), updates);
            }
          }
        });
        
        setUsers(processedUsers);
      } else {
        setUsers({});
      }
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Failed to fetch users'));
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        setError(error);
        setIsLoading(false);
      }
    );

    return () => {
      off(usersRef);
      unsubscribe();
    };
  }, []);

  return { users, isLoading, error };
} 