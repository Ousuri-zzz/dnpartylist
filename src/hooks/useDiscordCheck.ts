import { useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';

export function useDiscordCheck() {
  const { user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkDiscordName = async () => {
      if (!user) {
        setIsChecking(false);
        return;
      }

      try {
        const userMetaRef = ref(db, `users/${user.uid}/meta`);
        const snapshot = await get(userMetaRef);
        
        if (!snapshot.exists() || !snapshot.val().discord) {
          // เปิด modal เปลี่ยนชื่อ Discord อัตโนมัติ
          const event = new CustomEvent('openDiscordModal');
          window.dispatchEvent(event);
        }
      } catch (error) {
        console.error('Error checking Discord name:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkDiscordName();
  }, [user]);

  return { isChecking };
} 