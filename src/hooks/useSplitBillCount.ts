import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, off, get } from 'firebase/database';
import { useAuth } from '@/hooks/useAuth';

export function useSplitBillCount() {
  const [billCount, setBillCount] = useState(0);
  const [loading, setLoading] = useState(true);
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
      setBillCount(0);
      setLoading(false);
      return;
    }
    const billsRef = ref(db, 'splitBills');
    const unsubscribe = onValue(
      billsRef,
      async (snapshot) => {
        try {
          const data = snapshot.val();
          if (!data) {
            setBillCount(0);
            return;
          }
          const now = Date.now();
          const billsArray = Object.entries(data)
            .map(([id, bill]: [string, any]) => ({
              id,
              ...bill,
            }))
            .filter((bill: any) =>
              bill.ownerUid === user.uid ||
              (bill.participants &&
                Object.keys(bill.participants).some(pid => characterIds.includes(pid)))
            );

          // กรองบิลที่ยังไม่หมดอายุเท่านั้น
          const activeBills = billsArray.filter(bill => bill.expiresAt >= now);
          setBillCount(activeBills.length);
        } catch (err) {
          setBillCount(0);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setBillCount(0);
        setLoading(false);
      }
    );
    return () => {
      off(billsRef);
    };
  }, [user, characterIds]);

  return { billCount, loading };
} 