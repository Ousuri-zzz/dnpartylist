'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Check, X, Clock, History } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { ref, onValue, update, push, runTransaction, get } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { LoanService } from '@/lib/loanService';

type Trade = {
  status: string;
  amountLeft: number;
  timestamp: number;
};

export default function MerchantLoanPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [merchant, setMerchant] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'returned' | 'history'>('pending');

  useEffect(() => {
    if (!user) {
      router.push('/trade');
      return;
    }

    const merchantRef = ref(db, `tradeMerchants/${user.uid}`);
    const loansRef = ref(db, 'merchantLoans');

    const unsubscribeMerchant = onValue(merchantRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        router.push('/trade');
        return;
      }
      setMerchant({ id: user.uid, ...data });
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
          loan.source?.merchantId === user.uid
        )
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setLoans(loansList);
    });

    return () => {
      unsubscribeMerchant();
      unsubscribeLoans();
    };
  }, [user, router]);

  const handleApprove = async (loanId: string) => {
    try {
      await LoanService.approveLoan(loanId, user?.uid || '');
      toast.success('Loan approved successfully');
    } catch (error) {
      console.error('Error approving loan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to approve loan');
    }
  };

  const handleReject = async (loanId: string) => {
    if (!user) return;

    try {
      const loanRef = ref(db, `merchantLoans/${loanId}`);
      await update(loanRef, { status: 'rejected' });
      const snapshot = await import('firebase/database').then(m => m.get(ref(db, `merchantLoans/${loanId}`)));
      const loan = snapshot.val();
      if (loan) {
        const rejectText = `@${merchant.discordName || merchant.name || merchant.displayName || 'พ่อค้า'} ปฏิเสธเงินกู้ของ @${loan.borrowerName || 'ผู้ยืม'} จำนวน ${loan.amount || ''}G`;
        await push(ref(db, 'feed/all'), {
          from: loan.from,
          to: loan.to,
          text: rejectText,
          relatedId: loanId,
          subType: 'rejected',
          timestamp: Date.now(),
          type: 'loan'
        });
        await push(ref(db, 'feed/trade'), {
          from: loan.from,
          to: loan.to,
          text: rejectText,
          relatedId: loanId,
          subType: 'rejected',
          timestamp: Date.now(),
          type: 'loan'
        });
      }
      toast.success('ปฏิเสธการกู้ยืมสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการปฏิเสธ');
    }
  };

  const handleComplete = async (loanId: string) => {
    if (!user) return;

    try {
      const loanRef = ref(db, `merchantLoans/${loanId}`);
      await update(loanRef, { status: 'completed' });
      const snapshot = await import('firebase/database').then(m => m.get(ref(db, `merchantLoans/${loanId}`)));
      const loan = snapshot.val();
      if (loan) {
        const completeText = `@${merchant.discordName || merchant.name || merchant.displayName || 'พ่อค้า'} ยืนยันว่าได้รับคืนเงินจาก @${loan.borrowerName || 'ผู้ยืม'} จำนวน ${loan.amount || ''}G แล้ว ✅`;
        await push(ref(db, 'feed/all'), {
          from: loan.from,
          to: loan.to,
          text: completeText,
          relatedId: loanId,
          subType: 'complete',
          timestamp: Date.now(),
          type: 'loan'
        });
        await push(ref(db, 'feed/trade'), {
          from: loan.from,
          to: loan.to,
          text: completeText,
          relatedId: loanId,
          subType: 'complete',
          timestamp: Date.now(),
          type: 'loan'
        });
      }
      toast.success('ยืนยันการคืนเงินสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการยืนยัน');
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (activeTab === 'pending') return loan.status === 'waitingApproval';
    if (activeTab === 'returned') return loan.status === 'returned';
    return ['active', 'completed', 'rejected'].includes(loan.status);
  });

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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">💼 ปล่อยกู้โดยพ่อค้า</h1>
              <p className="text-gray-600 mt-2">ร้าน @{merchant.discordName}</p>
            </div>
            <div className="bg-pink-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Gold ที่เหลือ</p>
              <p className="text-xl font-semibold text-gray-800">{merchant.gold || 0}G</p>
            </div>
          </div>
        </motion.div>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors",
              activeTab === 'pending'
                ? "bg-pink-100 text-pink-600"
                : "bg-white text-gray-600 hover:bg-pink-50"
            )}
          >
            <Clock className="w-5 h-5" />
            <span>รออนุมัติ</span>
          </button>
          <button
            onClick={() => setActiveTab('returned')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors",
              activeTab === 'returned'
                ? "bg-blue-100 text-blue-600"
                : "bg-white text-gray-600 hover:bg-blue-50"
            )}
          >
            <Check className="w-5 h-5" />
            <span>รอคืนเงิน</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors",
              activeTab === 'history'
                ? "bg-purple-100 text-purple-600"
                : "bg-white text-gray-600 hover:bg-purple-50"
            )}
          >
            <History className="w-5 h-5" />
            <span>ประวัติทั้งหมด</span>
          </button>
        </div>

        <div className="space-y-4">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-pink-100">
              <p className="text-gray-500">
                {activeTab === 'pending' && 'ยังไม่มีคำขอใหม่'}
                {activeTab === 'returned' && 'ยังไม่มีรายการรอคืนเงิน'}
                {activeTab === 'history' && 'ยังไม่มีประวัติการปล่อยกู้'}
              </p>
            </div>
          ) : (
            filteredLoans.map((loan, index) => {
              console.log('loan in list:', loan.id, loan.status);
              return (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-pink-100"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">@{loan.borrowerName}</h3>
                      <p className="text-xl font-bold text-gray-800 mt-1">{loan.amount}G</p>
                      <p className="text-sm text-gray-500 mt-2">
                        วันที่ขอ: {new Date(loan.createdAt).toLocaleString()}
                      </p>
                      {loan.dueDate && (
                        <p className="text-sm text-gray-500">
                          กำหนดคืน: {new Date(loan.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {loan.status === 'waitingApproval' && (
                        <>
                          <button
                            onClick={() => {
                              alert('Approve clicked: ' + loan.id);
                              console.log('Approve button clicked', loan.id);
                              handleApprove(loan.id);
                            }}
                            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            <span>อนุมัติ</span>
                          </button>
                          <button
                            onClick={() => handleReject(loan.id)}
                            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            <span>ปฏิเสธ</span>
                          </button>
                        </>
                      )}
                      {loan.status === 'returned' && (
                        <button
                          onClick={() => handleComplete(loan.id)}
                          className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          <span>ยืนยันคืนเงิน</span>
                        </button>
                      )}
                      {['active', 'completed', 'rejected'].includes(loan.status) && (
                        <span className={cn(
                          "px-3 py-1 rounded-full text-sm",
                          loan.status === 'active' && "bg-blue-100 text-blue-800",
                          loan.status === 'completed' && "bg-green-100 text-green-800",
                          loan.status === 'rejected' && "bg-red-100 text-red-800"
                        )}>
                          {loan.status === 'active' && 'กำลังกู้ยืม'}
                          {loan.status === 'completed' && 'เสร็จสิ้น'}
                          {loan.status === 'rejected' && 'ปฏิเสธแล้ว'}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
} 