'use client';

import { useState, useEffect } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '../lib/firebase';
import { Character } from '../types/character';
import { User } from '../types/user';

interface Users {
  [key: string]: User;
}

export type UserWithCharacters = User & {
  characters?: { [key: string]: Character };
};

export function useUsers() {
  const [users, setUsers] = useState<Users>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useUsers: Initializing...');
    const usersRef = ref(db, 'users');
    
    const unsubscribe = onValue(usersRef, (snapshot) => {
      console.log('useUsers: Snapshot received:', snapshot.exists());
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('useUsers: Raw data:', data);
        
        const processedUsers: Users = {};
        
        Object.entries(data).forEach(([uid, userData]: [string, any]) => {
          console.log('useUsers: Processing user:', uid, userData);
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
              discord: userData.meta?.discord || 'ไม่ทราบ'
            },
            characters
          };

          // --- เพิ่ม logic ตรวจสอบ lastResetDaily/lastResetWeekly ---
          if (userData?.meta) {
            const updates: Record<string, number> = {};
            if (userData.meta.lastResetDaily === undefined || userData.meta.lastResetDaily === null) {
              updates['lastResetDaily'] = Date.now();
            }
            if (userData.meta.lastResetWeekly === undefined || userData.meta.lastResetWeekly === null) {
              updates['lastResetWeekly'] = Date.now();
            }
            if (Object.keys(updates).length > 0) {
              // เขียนค่าเริ่มต้นโดยไม่รีเซ็ต checklist ใด ๆ
              update(ref(db, `users/${uid}/meta`), updates);
            }
          }
        });
        
        console.log('useUsers: Processed users:', processedUsers);
        setUsers(processedUsers);
      } else {
        console.log('useUsers: No users found');
        setUsers({});
      }
      setLoading(false);
    }, (error) => {
      console.error('useUsers: Error:', error);
      setError(error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { users, loading, error };
} 