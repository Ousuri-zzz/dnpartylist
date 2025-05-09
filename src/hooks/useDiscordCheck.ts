import { useEffect, useState, useCallback } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';

export function useDiscordCheck() {
  const { user, setShowDiscordDialog } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);

  const checkDiscordName = useCallback(async () => {
    if (!user || hasChecked) {
      setIsChecking(false);
      return;
    }

    try {
      const userMetaRef = ref(db, `users/${user.uid}/meta`);
      const snapshot = await get(userMetaRef);
      
      if (!snapshot.exists() || !snapshot.val().discord) {
        // แสดง dialog โดยตรงแทนการใช้ event
        setShowDiscordDialog(true);
      }
    } catch (error) {
      console.error('Error checking Discord name:', error);
      // ถ้าเกิด error ให้แสดง dialog
      setShowDiscordDialog(true);
    } finally {
      setIsChecking(false);
      setHasChecked(true);
    }
  }, [user, hasChecked, setShowDiscordDialog]);

  useEffect(() => {
    checkDiscordName();
  }, [checkDiscordName]);

  return { isChecking };
} 