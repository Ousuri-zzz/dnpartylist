import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, off, get } from 'firebase/database';
import { useAuth } from '@/hooks/useAuth';
import { calculateSplit } from './splitUtils';

export interface Item {
  name: string;
  price: number;
}

export interface Participant {
  name: string;
  characterId: string;
  level: number;
  class: string;
  paid?: boolean;
}

export interface Bill {
  id: string;
  title: string;
  serviceFee: number;
  ownerUid: string;
  createdAt: number;
  expiresAt: number;
  participants: Record<string, Participant>;
  items: Record<string, Item>;
}

export function useSplitBills() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const [characterIds, setCharacterIds] = useState<string[]>([]);

  // โหลด characterIds แค่ตอน user เปลี่ยน
  useEffect(() => {
    if (!user) {
      setCharacterIds([]);
      return;
    }
    const fetchCharacters = async () => {
      const charactersRef = ref(db, `users/${user.uid}/characters`);
      const snapshot = await get(charactersRef);
      if (snapshot.exists()) {
        const ids: string[] = [];
        snapshot.forEach(child => { ids.push(child.key!); });
        setCharacterIds(ids);
      } else {
        setCharacterIds([]);
      }
    };
    fetchCharacters();
  }, [user]);

  // subscribe bills เมื่อ user หรือ characterIds เปลี่ยน
  useEffect(() => {
    if (!user) {
      setBills([]);
      setLoading(false);
      return;
    }
    const billsRef = ref(db, 'splitBills');
    const unsubscribe = onValue(
      billsRef,
      (snapshot) => {
        try {
          const data = snapshot.val();
          if (!data) {
            setBills([]);
            return;
          }
          const billsArray = Object.entries(data)
            .map(([id, bill]: [string, any]) => ({
              id,
              ...bill,
            }))
            .filter((bill: Bill) =>
              bill.ownerUid === user.uid ||
              (bill.participants &&
                Object.keys(bill.participants).some(pid => characterIds.includes(pid)))
            );
          setBills(billsArray);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => {
      off(billsRef);
    };
  }, [user, characterIds]);

  return { bills, loading, error };
} 