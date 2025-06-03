'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MerchantFeedPage() {
  const params = useParams();
  const merchantId = params?.merchantId as string;
  const [feedMessages, setFeedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (!merchantId) return;
    
    // ดึงข้อมูลจาก path ที่เฉพาะเจาะจง
    const tradeFeedRef = ref(db, `feed/merchant/${merchantId}/trade`);
    const merchantLoansRef = ref(db, 'merchantLoans');
    
    const unsubscribeTrade = onValue(tradeFeedRef, (snapshot) => {
      const tradeData = snapshot.val();
      const tradeList = tradeData ? Object.entries(tradeData)
        .map(([id, feed]: [string, any]) => ({ id, ...feed }))
        .sort((a, b) => b.timestamp - a.timestamp) : [];
      
      setFeedMessages(prev => {
        const loanFeeds = prev.filter(feed => feed.type === 'loan');
        return [...tradeList, ...loanFeeds].sort((a, b) => b.timestamp - a.timestamp);
      });
      setLoading(false);
    });

    const unsubscribeLoans = onValue(merchantLoansRef, (snapshot) => {
      const loansData = snapshot.val();
      if (!loansData) {
        setLoading(false);
        return;
      }

      const loanList = Object.entries(loansData)
        .map(([id, loan]: [string, any]) => {
          if (loan.source?.merchantId !== merchantId) return null;
          return {
            id,
            type: 'loan',
            subType: loan.status,
            text: getLoanMessage(loan),
            timestamp: loan.updatedAt || loan.createdAt,
            merchantId: merchantId,
            amount: loan.amount,
            borrowerName: loan.borrower?.name,
            borrowerDiscord: loan.borrower?.discordId
          };
        })
        .filter((v): v is any => !!v)
        .sort((a, b) => b.timestamp - a.timestamp);

      setFeedMessages(prev => {
        const tradeFeeds = prev.filter(feed => feed.type === 'gold' || feed.type === 'item');
        return [...tradeFeeds, ...loanList].sort((a, b) => b.timestamp - a.timestamp);
      });
      setLoading(false);
    });

    return () => {
      unsubscribeTrade();
      unsubscribeLoans();
    };
  }, [merchantId]);

  // ฟังก์ชันสร้างข้อความตามสถานะของ loan
  const getLoanMessage = (loan: any) => {
    const amount = loan.amount;
    const borrower = loan.borrower?.name || loan.borrower?.discordId || 'ผู้กู้';
    
    switch (loan.status) {
      case 'rejected':
        return `@${borrower} ขอกู้ ${amount}G แต่ถูกปฏิเสธ`;
      case 'completed':
        return `@${borrower} คืนเงินกู้ ${amount}G ครบถ้วนแล้ว`;
      case 'returned':
        return `@${borrower} แจ้งคืนเงินกู้ ${amount}G แล้ว`;
      case 'active':
        return `อนุมัติเงินกู้ ${amount}G ให้ @${borrower}`;
      case 'waitingApproval':
        return `@${borrower} ขอกู้ ${amount}G`;
      default:
        return `@${borrower} ขอกู้ ${amount}G`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50/50 to-purple-50/50">
        <div className="relative">
          {/* Outer ring with gradient */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-pink-100 to-purple-100 shadow-lg animate-pulse"></div>
          {/* Spinning ring */}
          <div className="absolute inset-0">
            <div className="w-24 h-24 rounded-full border-4 border-pink-300 border-t-transparent animate-spin"></div>
          </div>
          {/* Inner ring with gradient */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-200 to-purple-200 shadow-inner animate-pulse"></div>
          </div>
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-white shadow-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(feedMessages.length / itemsPerPage);
  const paginatedFeed = feedMessages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-3xl bg-white/90 backdrop-blur-sm shadow-lg border border-pink-200 px-6 py-7 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-pink-600">ประวัติการซื้อขายร้านนี้</h1>
          <Link href={`/trade/${merchantId}`} className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>กลับหน้าร้าน</span>
          </Link>
        </div>
        <div className="space-y-4">
          {feedMessages.length > 0 ? (
            <>
              {paginatedFeed.map((feed, index) => (
                <motion.div
                  key={feed.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl p-6 shadow-md border-2 border-pink-200 flex flex-col gap-2 transition-all bg-white/90 backdrop-blur-sm hover:shadow-xl"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-100 text-pink-600 shadow text-2xl">
                      {feed.type === 'loan' ? '🧾' : feed.type === 'gold' ? '💰' : '🎁'}
                    </span>
                    <span className="text-gray-800 font-bold text-base truncate">
                      {feed.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{new Date(feed.timestamp).toLocaleString('th-TH')}</span>
                    {feed.type === 'loan' && (
                      <span className={
                        'px-3 py-1 rounded-full font-bold shadow-sm border ' +
                        (feed.subType === 'rejected'
                          ? 'bg-red-100 text-red-600 border-red-200'
                          : feed.subType === 'completed'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : feed.subType === 'returned'
                          ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : feed.subType === 'active'
                          ? 'bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-yellow-100 text-yellow-700 border-yellow-200')
                      }>
                        {feed.subType === 'rejected' && 'กู้ยืมไม่สำเร็จ'}
                        {feed.subType === 'completed' && 'กู้ยืมสำเร็จ'}
                        {feed.subType === 'returned' && 'แจ้งคืนแล้ว'}
                        {feed.subType === 'active' && 'อนุมัติแล้ว'}
                        {feed.subType === 'waitingApproval' && 'รอดำเนินการ'}
                      </span>
                    )}
                    {(feed.type === 'gold' || feed.type === 'item') && (
                      <span className={
                        'px-3 py-1 rounded-full font-bold shadow-sm border ' +
                        (feed.subType === 'complete'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-yellow-100 text-yellow-700 border-yellow-200')
                      }>
                        {feed.subType === 'complete' ? 'ขายแล้ว' : 'กำลังขาย'}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    className={
                      `px-5 py-2 rounded-full font-semibold shadow-sm border transition-all duration-150 ` +
                      (currentPage === 1
                        ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                        : 'bg-white/90 backdrop-blur-sm text-pink-600 border-pink-200 hover:bg-pink-50')
                    }
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-1 rounded-full bg-white/90 backdrop-blur-sm text-pink-600 font-semibold border border-pink-200 shadow-sm">
                    หน้า {currentPage} / {totalPages}
                  </span>
                  <button
                    className={
                      `px-5 py-2 rounded-full font-semibold shadow-sm border transition-all duration-150 ` +
                      (currentPage === totalPages
                        ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed'
                        : 'bg-white/90 backdrop-blur-sm text-pink-600 border-pink-200 hover:bg-pink-50')
                    }
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-pink-100">
              <p className="text-gray-500">ยังไม่มีประวัติการซื้อขาย</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 