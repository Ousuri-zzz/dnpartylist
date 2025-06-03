'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MessageSquare, Copy, ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { ref, onValue, query, orderByChild, update, get } from 'firebase/database';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type FeedType = 'all' | 'gold' | 'item' | 'loan' | 'donate';

export default function FeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FeedType>('all');
  const [feedMessages, setFeedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loanHistory, setLoanHistory] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [guildLoanHistory, setGuildLoanHistory] = useState<any[]>([]);

  // ฟังก์ชันจัดรูปแบบข้อความ feed
  const formatFeedMessage = (msg: any) => {
    // Gold
    if (msg.type === 'gold') {
      if (msg.subType === 'confirm') {
        return `@${msg.buyerDiscord || msg.buyerName || 'ผู้ซื้อ'} ซื้อ Gold ${msg.amount || ''}G จาก @${msg.merchantDiscord || msg.merchantName || 'พ่อค้า'}`;
      }
      if (msg.subType === 'complete') {
        return `@${msg.merchantDiscord || msg.merchantName || 'พ่อค้า'} ยืนยันการขาย Gold ${msg.amount || ''}G ให้ @${msg.buyerDiscord || msg.buyerName || 'ผู้ซื้อ'} ✅`;
      }
      return msg.text;
    }
    // Loan
    if (msg.type === 'loan') {
      // ถ้าเป็นกู้ยืมจากกิลด์
      if (msg.source?.type === 'guild') {
        const guildName = msg.source.guild || 'กิลด์';
        const borrowerName = msg.borrower?.name || 'ผู้ยืม';
        if (msg.subType === 'waitingApproval' || msg.subType === 'create') {
          return `@${borrowerName} ขอยืม ${msg.amount || ''}G จากกิลด์ ${guildName}`;
        }
        if (msg.subType === 'active' || msg.subType === 'approve') {
          return `กิลด์ ${guildName} อนุมัติเงินกู้ ${msg.amount || ''}G ให้ @${borrowerName} ✅`;
        }
        if (msg.subType === 'rejected' || msg.subType === 'reject') {
          return `กิลด์ ${guildName} ปฏิเสธเงินกู้ ${msg.amount || ''}G ของ @${borrowerName}`;
        }
        if (msg.subType === 'returned' || msg.subType === 'return') {
          return `@${borrowerName} แจ้งคืนเงินกู้ ${msg.amount || ''}G ให้กิลด์ ${guildName}`;
        }
        if (msg.subType === 'completed' || msg.subType === 'complete') {
          return `กิลด์ ${guildName} ยืนยันว่าได้รับคืนเงินกู้ ${msg.amount || ''}G จาก @${borrowerName} ✅`;
        }
        return msg.text;
      }
      // ถ้าเป็น merchant loan (เดิม)
      if (msg.subType === 'waitingApproval' || msg.subType === 'create') {
        return `@${msg.borrower?.name || 'ผู้ยืม'} ขอเงินกู้ ${msg.amount || ''}G จาก @${msg.merchantDiscord || msg.merchantName || 'พ่อค้า'}`;
      }
      if (msg.subType === 'active' || msg.subType === 'approve') {
        return `@${msg.merchantDiscord || msg.merchantName || 'พ่อค้า'} อนุมัติเงินกู้ ${msg.amount || ''}G ให้ @${msg.borrower?.name || 'ผู้ยืม'} ✅`;
      }
      if (msg.subType === 'rejected' || msg.subType === 'reject') {
        return `@${msg.merchantDiscord || msg.merchantName || 'พ่อค้า'} ปฏิเสธเงินกู้ ${msg.amount || ''}G ของ @${msg.borrower?.name || 'ผู้ยืม'}`;
      }
      if (msg.subType === 'returned' || msg.subType === 'return') {
        return `@${msg.borrower?.name || 'ผู้ยืม'} แจ้งคืนเงินกู้ ${msg.amount || ''}G ให้ @${msg.merchantDiscord || msg.merchantName || 'พ่อค้า'}`;
      }
      if (msg.subType === 'completed' || msg.subType === 'complete') {
        return `@${msg.merchantDiscord || msg.merchantName || 'พ่อค้า'} ยืนยันว่าได้รับคืนเงินกู้ ${msg.amount || ''}G จาก @${msg.borrower?.name || 'ผู้ยืม'} ✅`;
      }
      return msg.text;
    }
    // Donate
    if (msg.type === 'donate') {
      return msg.text;
    }
    // Default
    return msg.text;
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    setLoading(true);

    const feedRef = query(ref(db, 'feed/all'), orderByChild('timestamp'));
    let unsubFeed: any;
    let feedList: any[] = [];

    unsubFeed = onValue(feedRef, (snapshot) => {
      const data = snapshot.val();
      feedList = data
        ? Object.entries(data)
            .map(([id, message]: [string, any]) => ({
              id,
              ...message,
            }))
        : [];
      setFeedMessages(feedList.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    });

    return () => {
      if (unsubFeed) unsubFeed();
    };
  }, [user, router]);

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

      // ดึง merchantDiscord สำหรับแต่ละ loan
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
    });
    return () => unsubscribe();
  }, []);

  // เพิ่ม useEffect สำหรับ guildLoans
  useEffect(() => {
    const guildLoansRef = ref(db, 'guildLoans');
    const unsubscribe = onValue(guildLoansRef, (snapshot) => {
      const data = snapshot.val();
      const loans = data
        ? Object.entries(data).map(([id, loan]: [string, any]) => ({
            id,
            ...loan,
            type: 'loan',
            subType: loan.status,
            timestamp: loan.updatedAt || loan.createdAt || Date.now(),
          }))
        : [];
      setGuildLoanHistory(loans);
    });
    return () => unsubscribe();
  }, []);

  const validTypes = ['gold', 'loan', 'donate'];
  // รวม feedMessages, loanHistory, guildLoanHistory
  const mergedFeed = feedMessages
    .filter(msg => validTypes.includes(msg.type))
    .filter(msg => activeTab === 'all' ? true : msg.type === activeTab)
    .sort((a, b) => b.timestamp - a.timestamp);

  // filter ด้วย searchQuery จากข้อความที่แสดงจริง
  const filteredFeed = mergedFeed.filter(msg => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const displayText = (formatFeedMessage(msg) || '').toLowerCase();
    return displayText.includes(q);
  });

  // slice feed ตามหน้าปัจจุบัน
  const totalPages = Math.ceil(filteredFeed.length / itemsPerPage);
  const pagedFeed = filteredFeed.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset currentPage เป็น 1 เมื่อ searchQuery หรือ activeTab เปลี่ยน
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab]);

  const copyMessage = (message: string) => {
    navigator.clipboard.writeText(message);
    toast.success('คัดลอกข้อความสำเร็จ');
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(timestamp);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'gold': return '💰';
      case 'item': return '🎁';
      case 'loan': return '🧾';
      case 'donate': return '💖';
      default: return '📋';
    }
  };

  const updateLoanStatus = async (loanId: string, status: 'active' | 'rejected' | 'return' | 'complete') => {
    const loanRef = ref(db, `all/${loanId}`);
    await update(loanRef, { subType: status });
    toast.success('อัปเดตสถานะสำเร็จ');
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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 rounded-3xl bg-white/90 backdrop-blur-sm shadow-lg border border-pink-200 px-6 py-7 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-pink-600">ประวัติการซื้อขายทั้งหมด</h1>
          <Link href="/trade" className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex space-x-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
                activeTab === 'all'
                  ? "bg-pink-100 text-pink-600"
                  : "bg-white text-gray-600 hover:bg-pink-50"
              )}
            >
              <span>ทั้งหมด</span>
            </button>
            <button
              onClick={() => setActiveTab('gold')}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
                activeTab === 'gold'
                  ? "bg-blue-100 text-blue-600"
                  : "bg-white text-gray-600 hover:bg-blue-50"
              )}
            >
              <span>💰 Gold</span>
            </button>
            <button
              onClick={() => setActiveTab('loan')}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
                activeTab === 'loan'
                  ? "bg-green-100 text-green-600"
                  : "bg-white text-gray-600 hover:bg-green-50"
              )}
            >
              <span>🧾 กู้ยืม</span>
            </button>
            <button
              onClick={() => setActiveTab('donate')}
              className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap",
                activeTab === 'donate'
                  ? "bg-pink-100 text-pink-600"
                  : "bg-white text-gray-600 hover:bg-pink-50"
              )}
            >
              <span>💖 บริจาค</span>
            </button>
          </div>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ค้นหาจากข้อความที่แสดงในหน้าทั้งหมด..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 rounded-lg border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto"></div>
              <p className="mt-4 text-gray-600">กำลังโหลดข้อความ...</p>
            </div>
          ) : pagedFeed.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-pink-100">
              <p className="text-gray-500">ไม่มีข้อความในขณะนี้</p>
            </div>
          ) : (
            pagedFeed.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl p-6 shadow-md border-2 border-pink-200 flex flex-col gap-2 transition-all bg-white/90 backdrop-blur-sm hover:shadow-xl"
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-2xl">
                    {getTypeIcon(message.type)}
                  </span>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold",
                    message.type === 'gold' && "bg-blue-100 text-blue-800",
                    message.type === 'loan' && "bg-green-100 text-green-800",
                    message.type === 'donate' && "bg-pink-100 text-pink-800"
                  )}>
                    {message.type === 'gold' && 'Gold'}
                    {message.type === 'loan' && 'กู้ยืม'}
                    {message.type === 'donate' && 'บริจาค'}
                  </span>
                  {message.type === 'loan' && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-bold ml-1",
                      message.subType === 'complete' || message.subType === 'return'
                        ? 'bg-green-100 text-green-700'
                        : message.subType === 'active'
                        ? 'bg-blue-100 text-blue-700'
                        : message.subType === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {message.subType === 'complete' || message.subType === 'return'
                        ? 'สำเร็จแล้ว'
                        : message.subType === 'active'
                        ? 'อนุมัติแล้ว'
                        : message.subType === 'rejected'
                        ? 'ยกเลิก'
                        : 'รอดำเนินการ'}
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">
                    {formatDate(message.timestamp)}
                  </span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="text-gray-800 text-sm md:text-base whitespace-pre-line">
                    {formatFeedMessage(message)}
                  </div>
                  <div className="flex items-center gap-2 mt-2 md:mt-0">
                    <button
                      onClick={() => copyMessage(message.text || '')}
                      className="p-2 rounded-lg hover:bg-pink-50 text-gray-600 hover:text-gray-800 transition-colors"
                      title="คัดลอกข้อความ"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <a
                      href={`https://discord.com/users/${message.from}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-pink-50 text-gray-600 hover:text-gray-800 transition-colors"
                      title="DM Discord"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </a>
                    {message.relatedId && message.type !== 'loan' && (
                      <Link
                        href={`/trade/confirm/${message.relatedId}`}
                        className="text-pink-600 hover:text-pink-700 text-xs underline ml-2"
                      >
                        ดูรายละเอียด
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
        {/* Pagination */}
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
      </div>
    </div>
  );
} 