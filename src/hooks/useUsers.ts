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
                characters: userData.characters || {},
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