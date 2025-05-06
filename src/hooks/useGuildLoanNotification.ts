import { useEffect, useRef } from 'react';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export function useGuildLoanNotification() {
  const { user } = useAuth();
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (!user) return;
    const loansRef = query(ref(db, 'guildLoans'), orderByChild('type'), equalTo('guild'));
    const unsubscribe = onValue(loansRef, (snapshot) => {
      if (snapshot.exists()) {
        const loans = Object.values(snapshot.val()).filter(
          (loan: any) => loan.status === 'waitingApproval' || loan.status === 'pending'
        );
        if (lastCountRef.current && loans.length > lastCountRef.current) {
          toast.success(`มีคำขอกู้ยืมใหม่ ${loans.length - lastCountRef.current} รายการ`, {
            icon: '🔔',
            duration: 5000,
          });
        }
        lastCountRef.current = loans.length;
      } else {
        lastCountRef.current = 0;
      }
    });
    return () => unsubscribe();
  }, [user]);
} 