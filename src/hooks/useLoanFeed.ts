import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';

export function useLoanFeed() {
  const [loanHistory, setLoanHistory] = useState<any[]>([]);
  const [loadingLoan, setLoadingLoan] = useState(true);

  useEffect(() => {
    const loansRef = ref(db, 'merchantLoans');
    const unsubscribe = onValue(loansRef, async (snapshot) => {
      const data = snapshot.val();
      let loans = data
        ? Object.entries(data).map(([id, loan]) => {
            const l = loan as any;
            return { id, ...l };
          })
        : [];
      loans = await Promise.all(loans.map(async (loan) => {
        let merchantDiscord = '';
        if (loan.source?.merchantId) {
          const merchantRef = ref(db, `tradeMerchants/${loan.source.merchantId}`);
          const merchantSnap = await get(merchantRef);
          if (merchantSnap.exists()) {
            merchantDiscord = merchantSnap.val().discord || '';
          }
        }
        let text = '';
        switch (loan.status) {
          case 'waitingApproval':
            text = `@${loan.borrower?.name || 'ผู้ยืม'} ขอเงินกู้ ${loan.amount}G จากร้าน @${merchantDiscord}`;
            break;
          case 'active':
            text = `@${merchantDiscord} อนุมัติเงินกู้ให้ @${loan.borrower?.name || 'ผู้ยืม'} จำนวน ${loan.amount}G`;
            break;
          case 'rejected':
            text = `@${merchantDiscord} ปฏิเสธเงินกู้ของ @${loan.borrower?.name || 'ผู้ยืม'} จำนวน ${loan.amount}G`;
            break;
          case 'completed':
            text = `@${merchantDiscord} ยืนยันว่าได้รับคืนเงินจาก @${loan.borrower?.name || 'ผู้ยืม'} จำนวน ${loan.amount}G แล้ว ✅`;
            break;
          case 'returned':
            text = `@${loan.borrower?.name || 'ผู้ยืม'} แจ้งคืนเงินกู้ให้ร้าน @${merchantDiscord} จำนวน ${loan.amount}G`;
            break;
          default:
            text = `@${loan.borrower?.name || 'ผู้ยืม'} ขอเงินกู้ ${loan.amount}G จากร้าน @${merchantDiscord}`;
        }
        return {
          ...loan,
          merchantDiscord,
          type: 'loan',
          timestamp: loan.updatedAt || loan.createdAt || Date.now(),
          subType: loan.status,
          text
        };
      }));
      setLoanHistory(loans);
      setLoadingLoan(false);
    });
    return () => unsubscribe();
  }, []);

  return { loanHistory, loadingLoan };
} 