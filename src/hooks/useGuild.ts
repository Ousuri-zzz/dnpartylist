import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase';
import { GuildSettings } from '@/types/trade';
import { useAuth } from './useAuth';

export function useGuild() {
  const { user } = useAuth();
  const [guild, setGuild] = useState<GuildSettings | null>(null);
  const [isGuildLeader, setIsGuildLeader] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const guildRef = ref(db, 'guild');
    const unsubscribe = onValue(guildRef, (snapshot) => {
      if (snapshot.exists()) {
        const guildData = snapshot.val();
        setGuild(guildData);
        setIsGuildLeader(guildData.leaders?.[user.uid] === true);
      } else {
        setGuild(null);
        setIsGuildLeader(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return {
    guild,
    isGuildLeader,
    loading
  };
} 