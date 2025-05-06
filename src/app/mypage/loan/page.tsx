'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Check, Clock, History, ArrowLeft, Building2, Store } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type LoanType = 'all' | 'guild' | 'merchant';

export default function LoanStatusPage() {
  const { user, discordName } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LoanType>('all');
  const [loans, setLoans] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const loansRef = ref(db, 'guildLoans');
    const merchantsRef = ref(db, 'tradeMerchants');

    const unsubscribeLoans = onValue(loansRef, (snapshot) => {
      const data = snapshot.val();
      const loansList = data ? Object.entries(data)
        .map(([id, loan]: [string, any]) => ({
          id,
          ...loan
        }))
        .filter(loan => 
          loan.borrowerId === user.uid
        )
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setLoans(loansList);
    });

    const unsubscribeMerchants = onValue(merchantsRef, (snapshot) => {
      const data = snapshot.val();
      setMerchants(data || {});
    });

    return () => {
      unsubscribeLoans();
      unsubscribeMerchants();
    };
  }, [user, router]);

  const handleReturn = async (loanId: string) => {
    if (!user) return;

    try {
      const loanRef = ref(db, `guildLoans/${loanId}`);
      await update(loanRef, { 
        status: 'returned',
        returnedAt: Date.now()
      });
      toast.success('แจ้งคืนเงินสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการแจ้งคืนเงิน');
    }
  };

  const filteredLoans = loans.filter(loan => {
    if (activeTab === 'all') return true;
    return loan.source?.type === activeTab;
  });

  if (!user) {
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
              <h1 className="text-2xl font-bold text-gray-800">📊 สถานะการกู้ยืมของฉัน</h1>
              <p className="text-gray-600 mt-2">@{discordName}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
              activeTab === 'all'
                ? "bg-pink-100 text-pink-600"
                : "bg-white text-gray-600 hover:bg-pink-50"
            )}
          >
            <History className="w-5 h-5" />
            <span>ทั้งหมด</span>
          </button>
          <button
            onClick={() => setActiveTab('guild')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
              activeTab === 'guild'
                ? "bg-blue-100 text-blue-600"
                : "bg-white text-gray-600 hover:bg-blue-50"
            )}
          >
            <Building2 className="w-5 h-5" />
            <span>จากกิลด์</span>
          </button>
          <button
            onClick={() => setActiveTab('merchant')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
              activeTab === 'merchant'
                ? "bg-purple-100 text-purple-600"
                : "bg-white text-gray-600 hover:bg-purple-50"
            )}
          >
            <Store className="w-5 h-5" />
            <span>จากร้านพ่อค้า</span>
          </button>
        </div>

        <div className="space-y-4">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-pink-100">
              <p className="text-gray-500">คุณยังไม่เคยกู้ยืมเงิน</p>
            </div>
          ) : (
            filteredLoans.map((loan, index) => (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-pink-100"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      {loan.source?.type === 'guild' ? (
                        <Building2 className="w-5 h-5 text-blue-500" />
                      ) : (
                        <Store className="w-5 h-5 text-purple-500" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-800">
                        {loan.source?.type === 'guild' 
                          ? `กิลด์ ${loan.source?.guild}`
                          : `ร้าน @${merchants[loan.source?.merchantId]?.discordName || 'ไม่พบข้อมูล'}`}
                      </h3>
                    </div>
                    <p className="text-xl font-bold text-gray-800 mt-2">{loan.amount}G</p>
                    <div className="space-y-1 mt-2">
                      <p className="text-sm text-gray-500">
                        วันที่ขอ: {new Date(loan.createdAt).toLocaleString()}
                      </p>
                      {loan.dueDate && (
                        <p className="text-sm text-gray-500">
                          กำหนดคืน: {new Date(loan.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {loan.status === 'active' ? (
                      <button
                        onClick={() => handleReturn(loan.id)}
                        className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>แจ้งคืนเงินแล้ว</span>
                      </button>
                    ) : loan.status === 'returned' ? (
                      <span className="px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                        รอการยืนยันคืนเงิน
                      </span>
                    ) : loan.status === 'completed' ? (
                      <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                        เสร็จสิ้น
                      </span>
                    ) : null}
                    <span className={cn(
                      "px-3 py-1 rounded-full text-sm",
                      loan.status === 'waitingApproval' && "bg-yellow-100 text-yellow-800",
                      loan.status === 'active' && "bg-blue-100 text-blue-800",
                      loan.status === 'returned' && "bg-orange-100 text-orange-800",
                      loan.status === 'completed' && "bg-green-100 text-green-800"
                    )}>
                      {loan.status === 'waitingApproval' && 'รออนุมัติ'}
                      {loan.status === 'active' && 'กำลังกู้ยืม'}
                      {loan.status === 'returned' && 'แจ้งคืนแล้ว'}
                      {loan.status === 'completed' && 'เสร็จสิ้น'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 