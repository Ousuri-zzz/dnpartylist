'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MessageSquare, Copy, Clock, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { ref, onValue, push, set, get, update } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { FeedService } from '@/lib/feedService';

export default function LoanRequestPage({ params }: { params: { merchantId: string } }) {
  const { user, discordName } = useAuth();
  const router = useRouter();
  const [merchant, setMerchant] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loans, setLoans] = useState<any[]>([]);
  const [goldLeft, setGoldLeft] = useState(0);

  useEffect(() => {
    const merchantRef = ref(db, `tradeMerchants/${params.merchantId}`);
    const loansRef = ref(db, 'merchantLoans');
    const tradesRef = ref(db, 'trade');

    const unsubscribeMerchant = onValue(merchantRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        router.push('/trade');
        return;
      }
      setMerchant({ id: params.merchantId, ...data });
      // Debug log merchant data
      console.log('merchant:', { id: params.merchantId, ...data });
    });

    // ดึง trade ของร้านนี้และรวม Gold ที่เหลือ
    const unsubscribeTrades = onValue(tradesRef, (snapshot) => {
      const data = snapshot.val();
      const tradesList = data
        ? Object.values(data).filter(
            (trade: any) =>
              trade.merchantId === params.merchantId && trade.status === 'open'
          )
        : [];
      const totalGold = tradesList.reduce(
        (sum: number, trade: any) => sum + (trade.amountLeft || 0),
        0
      );
      setGoldLeft(totalGold);
    });

    const unsubscribeLoans = onValue(loansRef, (snapshot) => {
      const data = snapshot.val();
      const loansList = data ? Object.entries(data)
        .map(([id, loan]: [string, any]) => ({
          id,
          ...loan
        }))
        .filter(loan => 
          loan.source?.type === 'merchant' &&
          loan.source?.merchantId === params.merchantId &&
          loan.borrowerId === user?.uid
        )
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setLoans(loansList);
    });

    return () => {
      unsubscribeMerchant();
      unsubscribeTrades();
      unsubscribeLoans();
    };
  }, [params.merchantId, user?.uid, router]);

  const handleRequest = async () => {
    if (!user || !merchant) {
      toast.error('ไม่พบข้อมูลผู้ใช้หรือร้านค้า');
      return;
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('กรุณากรอกจำนวนเงินที่ต้องการยืมให้ถูกต้อง');
      return;
    }

    if (goldLeft < amountNum) {
      toast.error('ร้านค้าไม่มี Gold พอที่จะให้ยืม');
      return;
    }

    setIsLoading(true);

    try {
      const loansRef = ref(db, 'merchantLoans');
      const newLoanRef = push(loansRef);
      const loanId = newLoanRef.key;

      if (!loanId) {
        throw new Error('ไม่สามารถสร้าง ID สำหรับรายการกู้ยืมได้');
      }

      const loanData = {
        loanId,
        amount: amountNum,
        status: 'waitingApproval' as 'waitingApproval',
        source: {
          type: 'merchant' as 'merchant',
          merchantId: merchant.id
        },
        borrower: {
          discordId: user.uid,
          name: discordName || ''
        },
        dueDate: dueDate || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await set(newLoanRef, loanData);

      // push feed ด้วย FeedService
      await FeedService.addLoanFeed(loanData, 'create', user.uid);

      toast.success('ส่งคำขอกู้ยืมสำเร็จ');
      setAmount('');
      setDueDate('');
    } catch (error) {
      console.error('Error creating loan:', error);
      toast.error('เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturn = async (loanId: string) => {
    if (!user) {
      toast.error('ไม่พบข้อมูลผู้ใช้');
      return;
    }

    try {
      const loanRef = ref(db, `merchantLoans/${loanId}`);
      const loanSnapshot = await get(loanRef);
      const loanData = loanSnapshot.val();

      if (!loanData) {
        toast.error('ไม่พบรายการกู้ยืม');
        return;
      }

      if (loanData.status !== 'active') {
        toast.error('ไม่สามารถแจ้งคืนเงินได้ เนื่องจากสถานะไม่ถูกต้อง');
        return;
      }

      await update(loanRef, {
        status: 'returned',
        returnedAt: Date.now(),
        updatedAt: Date.now()
      });

      // push feed ด้วย FeedService
      await FeedService.addLoanFeed({
        ...loanData,
        loanId
      }, 'return', user.uid);

      toast.success('แจ้งคืนเงินสำเร็จ');
    } catch (error) {
      console.error('Error returning loan:', error);
      toast.error('เกิดข้อผิดพลาดในการแจ้งคืนเงิน');
    }
  };

  if (!merchant) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-white rounded-xl p-6 shadow-sm border border-pink-100"
        >
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                ร้าน @{merchant.discordName || merchant.discord_name || merchant.discord || merchant.name || merchant.displayName || 'ไม่พบชื่อ Discord'}
              </h1>
              <p className="text-gray-600 mt-2">{merchant.advertisement}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-pink-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Gold ที่เหลือ</p>
                <p className="text-xl font-semibold text-gray-800">{goldLeft}G</p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    const discord = merchant.discordName || merchant.discord_name || merchant.discord || merchant.name || merchant.displayName || '';
                    const message = `📋 ขอกู้ยืม Gold DN Classic\n👤 ร้าน: @${discord}\n💰 จำนวน: ${amount}G${dueDate ? `\n📅 กำหนดคืน: ${dueDate}` : ''}`;
                    navigator.clipboard.writeText(message);
                    toast.success('คัดลอกข้อความเรียบร้อยแล้ว');
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors"
                >
                  <Copy className="w-5 h-5" />
                  <span>คัดลอก</span>
                </button>
                <button
                  onClick={() => window.open(`https://discord.com/users/${merchant.discordId}`, '_blank')}
                  className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>DM</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Loan Request Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-pink-100"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">แบบฟอร์มขอยืมเงิน</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จำนวนเงินที่ต้องการยืม (G)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                  placeholder="เช่น 300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันที่ครบกำหนดคืน (ไม่บังคับ)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleRequest}
                disabled={isLoading || !amount}
                className={cn(
                  "w-full px-4 py-2 rounded-lg text-white transition-colors",
                  isLoading || !amount
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500"
                )}
              >
                {isLoading ? 'กำลังส่งคำขอ...' : 'ส่งคำขอกู้ยืม'}
              </button>
            </div>
          </motion.div>

          {/* Loan History */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-pink-100"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-4">ประวัติการกู้ยืม</h2>
            {loans.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">ยังไม่มีประวัติการกู้ยืม</p>
              </div>
            ) : (
              <div className="space-y-4">
                {loans.map((loan, index) => (
                  <motion.div
                    key={loan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border border-pink-100"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-lg font-semibold text-gray-800">{loan.amount}G</p>
                        <p className="text-sm text-gray-500">
                          วันที่ขอ: {new Date(loan.createdAt).toLocaleDateString()}
                        </p>
                        {loan.dueDate && (
                          <p className="text-sm text-gray-500">
                            กำหนดคืน: {new Date(loan.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {loan.status === 'active' ? (
                          <button
                            onClick={() => handleReturn(loan.id)}
                            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            <span>แจ้งคืนเงิน</span>
                          </button>
                        ) : (
                          <span className={cn(
                            "px-3 py-1 rounded-full text-sm",
                            loan.status === 'waitingApproval' && "bg-yellow-100 text-yellow-800",
                            loan.status === 'returned' && "bg-blue-100 text-blue-800",
                            loan.status === 'completed' && "bg-green-100 text-green-800"
                          )}>
                            {loan.status === 'waitingApproval' && 'รออนุมัติ'}
                            {loan.status === 'returned' && 'แจ้งคืนแล้ว'}
                            {loan.status === 'completed' && 'เสร็จสิ้น'}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
} 