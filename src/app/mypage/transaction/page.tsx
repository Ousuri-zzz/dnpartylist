'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Check, Clock, History, ArrowLeft, Coins, ShoppingBag, Banknote, Loader2, XCircle, CheckCircle2, Store } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { ref, onValue, update } from 'firebase/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type TransactionType = 'all' | 'gold' | 'item' | 'loan' | 'return';

export default function TransactionHistoryPage() {
  const { user, discordName } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TransactionType>('all');
  const [trades, setTrades] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [merchantLoans, setMerchantLoans] = useState<any[]>([]);
  const [merchants, setMerchants] = useState<Record<string, any>>({});
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    const tradesRef = ref(db, 'feed/all');
    const loansRef = ref(db, 'guildLoans');
    const itemsRef = ref(db, 'tradeItems');
    const merchantLoansRef = ref(db, 'merchantLoans');
    const merchantsRef = ref(db, 'tradeMerchants');

    const unsubscribeTrades = onValue(tradesRef, (snapshot) => {
      const data = snapshot.val();
      const tradesList = data ? Object.entries(data)
        .map(([id, feed]: [string, any]) => ({
          id,
          ...feed
        }))
        .filter(feed => feed.type === 'gold' && feed.buyerName === (discordName || ''))
        .sort((a, b) => b.timestamp - a.timestamp) : [];
      setTrades(tradesList);
    });

    const unsubscribeLoans = onValue(loansRef, (snapshot) => {
      const data = snapshot.val();
      const loansList = data ? Object.entries(data)
        .map(([id, loan]: [string, any]) => ({
          id,
          ...loan
        }))
        .filter(loan => loan.borrowerId === user.uid)
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setLoans(loansList);
    });

    const unsubscribeItems = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      const itemsList = data ? Object.entries(data)
        .map(([id, item]: [string, any]) => ({
          id,
          ...item
        }))
        .filter(item => item.buyerId === user.uid)
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setItems(itemsList);
    });

    const unsubscribeMerchantLoans = onValue(merchantLoansRef, (snapshot) => {
      const data = snapshot.val();
      const merchantLoansList = data ? Object.entries(data)
        .map(([id, loan]: [string, any]) => ({
          id,
          ...loan
        }))
        .filter(loan => loan.borrower?.discordId === user.uid)
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setMerchantLoans(merchantLoansList);
    });

    const unsubscribeMerchants = onValue(merchantsRef, (snapshot) => {
      const data = snapshot.val();
      setMerchants(data || {});
    });

    return () => {
      unsubscribeTrades();
      unsubscribeLoans();
      unsubscribeItems();
      unsubscribeMerchantLoans();
      unsubscribeMerchants();
    };
  }, [user, router, discordName]);

  const handleReturn = async (loanId: string) => {
    if (!user) return;

    // หา transaction จาก filteredTransactions
    const transaction = filteredTransactions().find(t => t.id === loanId);
    if (!transaction) {
      toast.error('ไม่พบข้อมูลธุรกรรม');
      return;
    }
    const path = transaction.loanSource === 'merchant' ? 'merchantLoans' : 'guildLoans';
    try {
      const loanRef = ref(db, `${path}/${loanId}`);
      await update(loanRef, {
        status: 'returned',
        returnedAt: Date.now()
      });
      toast.success('แจ้งคืนเงินสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการแจ้งคืนเงิน');
    }
  };

  const merchantLoansWithDiscord = merchantLoans.map(loan => ({
    ...loan,
    merchantDiscord: merchants[loan.source?.merchantId]?.discord || ''
  }));

  const filteredTransactions = () => {
    if (activeTab === 'all') {
      const allTx = [
        ...trades.map(trade => ({
          ...trade,
          _sortTime: trade.timestamp || trade.createdAt || 0,
          type: 'gold'
        })),
        ...loans.map(loan => ({
          ...loan,
          _sortTime: loan.updatedAt || loan.returnedAt || loan.createdAt || 0,
          type: 'loan',
          loanSource: 'guild'
        })),
        ...merchantLoansWithDiscord.map(loan => ({
          ...loan,
          _sortTime: loan.updatedAt || loan.returnedAt || loan.createdAt || 0,
          type: 'loan',
          loanSource: 'merchant'
        }))
      ].sort((a, b) => b._sortTime - a._sortTime);
      return allTx;
    }
    if (activeTab === 'gold') return trades.map(trade => ({ ...trade, type: 'gold' }));
    if (activeTab === 'loan') return [
      ...loans.filter(loan => loan.status !== 'returned').map(loan => ({ ...loan, type: 'loan', loanSource: 'guild' })),
      ...merchantLoansWithDiscord.filter(loan => loan.status !== 'returned').map(loan => ({ ...loan, type: 'loan', loanSource: 'merchant' }))
    ];
    return [];
  };

  // ฟังก์ชันจัดลำดับความสำคัญของสถานะธุรกรรม (เหมือน guildloan)
  function sortTransactions(transactions: any[]) {
    const statusPriority: Record<string, number> = {
      waitingApproval: 4,
      returned: 3,
      active: 2,
      completed: 1
    };
    return transactions.slice().sort((a, b) => {
      const aP = statusPriority[a.status] || 0;
      const bP = statusPriority[b.status] || 0;
      if (aP !== bP) return bP - aP;
      // ถ้า priority เท่ากัน ให้เรียงตามเวลาล่าสุด
      return (b._sortTime || 0) - (a._sortTime || 0);
    });
  }

  // ใช้ sortTransactions ก่อนแบ่งหน้า
  const sortedTransactions = sortTransactions(filteredTransactions());
  const pagedTransactions = sortedTransactions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalPages = Math.ceil(sortedTransactions.length / PAGE_SIZE);

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
            <div className="flex items-center gap-3">
              <Banknote className="w-8 h-8 text-pink-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">ประวัติธุรกรรมของฉัน</h1>
                <p className="text-gray-600 mt-2">@{discordName}</p>
              </div>
            </div>
            <Link href="/trade" className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-5 h-5" />
              <span>กลับ</span>
            </Link>
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
            onClick={() => setActiveTab('gold')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
              activeTab === 'gold'
                ? "bg-yellow-100 text-yellow-700"
                : "bg-white text-gray-600 hover:bg-yellow-50"
            )}
          >
            <Coins className="w-5 h-5" />
            <span>ซื้อ Gold</span>
          </button>
          <button
            onClick={() => setActiveTab('loan')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
              activeTab === 'loan'
                ? "bg-purple-100 text-purple-700"
                : "bg-white text-gray-600 hover:bg-purple-50"
            )}
          >
            <Banknote className="w-5 h-5" />
            <span>กู้ยืม</span>
          </button>
        </div>

        <div className="space-y-4">
          {pagedTransactions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow border border-pink-100">
              <p className="text-gray-500">ยังไม่มีประวัติธุรกรรม</p>
            </div>
          ) : (
            pagedTransactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/90 rounded-2xl p-6 shadow-md border border-pink-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {transaction.type === 'gold' ? (
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 shadow">
                      <Coins className="w-7 h-7" />
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 text-purple-600 shadow">
                      <Banknote className="w-7 h-7" />
                    </span>
                  )}
                  <div className="min-w-0">
                    {transaction.type === 'gold' ? (
                      <>
                        <div className="font-bold text-lg text-yellow-700 flex items-center gap-2">
                          <Coins className="w-5 h-5" /> ซื้อ Gold
                        </div>
                        <div className="text-gray-800 font-semibold mt-1 truncate">
                          {transaction.amount}G จากร้าน @{transaction.merchantDiscord || transaction.merchantName}
                        </div>
                        <div className="text-gray-500 text-sm mt-1 truncate">
                          ผู้ซื้อ: @{transaction.buyerDiscord || transaction.buyerName}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-bold text-lg text-purple-700 flex items-center gap-2">
                          <Banknote className="w-5 h-5" />
                          {transaction.loanSource === 'guild'
                            ? 'กู้ยืมจากกิลด์'
                            : `กู้ยืมจากร้านค้า @${transaction.merchantDiscord || ''}`}
                        </div>
                        <div className="text-gray-800 font-semibold mt-1">
                          {transaction.amount}G
                        </div>
                        {transaction.dueDate && (
                          <div className="text-gray-500 text-sm mt-1">
                            กำหนดคืน: {new Date(transaction.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </>
                    )}
                    <div className="text-gray-400 text-xs mt-1">
                      {new Date(transaction.createdAt || transaction.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 min-w-[120px]">
                  {transaction.type === 'gold' ? (
                    <Link
                      href={`/trade/${transaction.merchantId}`}
                      className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-600 font-semibold shadow-sm border border-pink-100 transition-colors"
                    >
                      <Store className="w-4 h-4" />
                      <span>กลับไปร้าน</span>
                    </Link>
                  ) : transaction.status === 'active' ? (
                    <button
                      onClick={() => handleReturn(transaction.id)}
                      className="flex items-center space-x-1 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold shadow-sm border border-red-100 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>แจ้งคืนเงิน</span>
                    </button>
                  ) : null}
                  <span className={cn(
                    "px-4 py-1 rounded-full text-sm font-bold mt-1 shadow-sm border",
                    transaction.status === 'waitingApproval' && "bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1",
                    transaction.status === 'active' && "bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1",
                    transaction.status === 'returned' && "bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1",
                    transaction.status === 'completed' && "bg-green-100 text-green-800 border-green-200 flex items-center gap-1"
                  )}>
                    {transaction.status === 'waitingApproval' && (<><Loader2 className="w-4 h-4 animate-spin inline-block mr-1" />รออนุมัติ</>)}
                    {transaction.status === 'active' && (<><Clock className="w-4 h-4 inline-block mr-1" />ยืนยันแล้ว</>)}
                    {transaction.status === 'returned' && (<><XCircle className="w-4 h-4 inline-block mr-1" />คืนเงินแล้ว</>)}
                    {transaction.status === 'completed' && (<><CheckCircle2 className="w-4 h-4 inline-block mr-1" />เสร็จสิ้นแล้ว</>)}
                  </span>
                </div>
              </motion.div>
            ))
          )}
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={cn(
                  'px-5 py-2 rounded-full font-semibold shadow-sm border transition-all duration-150',
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 text-pink-600 border-pink-200 hover:from-pink-200 hover:to-blue-200 hover:text-purple-700'
                )}
              >
                ก่อนหน้า
              </button>
              <span className="px-4 py-1 rounded-full bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 text-pink-600 font-semibold border border-pink-200 shadow-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={cn(
                  'px-5 py-2 rounded-full font-semibold shadow-sm border transition-all duration-150',
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 text-blue-600 border-blue-200 hover:from-blue-200 hover:to-pink-200 hover:text-purple-700'
                )}
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 