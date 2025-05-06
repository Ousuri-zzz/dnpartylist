'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MessageSquare, Copy, Check, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { ref, onValue, update, push, set } from 'firebase/database';
import { useRouter } from 'next/navigation';
import { FeedService } from '@/lib/feedService';

export default function TradeConfirmationPage({ params }: { params: { tradeId: string } }) {
  const { user, discordName } = useAuth();
  const router = useRouter();
  const [trade, setTrade] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirms, setConfirms] = useState<any[]>([]);

  useEffect(() => {
    const tradeRef = ref(db, `trade/${params.tradeId}`);
    const confirmsRef = ref(db, `trade/${params.tradeId}/confirms`);

    const unsubscribeTrade = onValue(tradeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTrade({ id: params.tradeId, ...data });
      }
    });

    const unsubscribeConfirms = onValue(confirmsRef, (snapshot) => {
      const data = snapshot.val();
      const confirmsList = data ? Object.entries(data)
        .map(([id, confirm]: [string, any]) => ({
          id,
          ...confirm
        }))
        .sort((a, b) => b.confirmedAt - a.confirmedAt) : [];
      setConfirms(confirmsList);
    });

    return () => {
      unsubscribeTrade();
      unsubscribeConfirms();
    };
  }, [params.tradeId]);

  const handleConfirm = async () => {
    if (!user || !trade || !amount) return;

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('กรุณากรอกจำนวน Gold ที่ต้องการซื้อ');
      return;
    }

    if (amountNum > trade.amountLeft) {
      toast.error('จำนวน Gold ที่ต้องการซื้อมากกว่าที่มีอยู่');
      return;
    }

    setIsLoading(true);

    try {
      // Create confirmation
      const confirmsRef = ref(db, `trade/${params.tradeId}/confirms`);
      const newConfirmRef = push(confirmsRef);
      
      await set(newConfirmRef, {
        buyerId: user.uid,
        buyerName: discordName || '',
        amount: amountNum,
        status: 'waiting',
        confirmedAt: Date.now()
      });

      // Update trade amount
      const tradeRef = ref(db, `trade/${params.tradeId}`);
      await update(tradeRef, {
        amountLeft: trade.amountLeft - amountNum,
        status: trade.amountLeft - amountNum <= 0 ? 'closed' : 'open'
      });

      // Create feed notification (confirm)
      await FeedService.addTradeFeed(
        trade.merchantId,
        discordName || '',
        amountNum,
        trade.merchantName || '',
        trade.discordName || '',
        trade.merchantDiscord || trade.merchantName || ''
      );

      toast.success('ยืนยันการซื้อสำเร็จ');
      router.push('/trade');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการยืนยัน');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMerchantConfirm = async (confirmId: string) => {
    if (!user || !trade) return;

    try {
      const confirmRef = ref(db, `trade/${params.tradeId}/confirms/${confirmId}`);
      await update(confirmRef, { status: 'done' });

      // Find confirm data
      const confirm = confirms.find(c => c.id === confirmId);
      if (confirm) {
        await FeedService.addTradeCompleteFeed(
          trade.merchantId,
          confirm.buyerName || '',
          confirm.amount,
          trade.merchantName || '',
          confirm.buyerDiscord || '',
          trade.discordName || trade.merchantDiscord || trade.merchantName || ''
        );
      }

      toast.success('ยืนยันการเทรดสำเร็จ');
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการยืนยัน');
    }
  };

  if (!trade) {
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
              <h1 className="text-2xl font-bold text-gray-800">ร้าน @{trade.merchantName}</h1>
              <p className="text-gray-600 mt-2">{trade.advertisement}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-pink-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Gold ที่เหลือ</p>
                <p className="text-xl font-semibold text-gray-800">{trade.amountLeft}G</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">ราคาต่อ 100G</p>
                <p className="text-xl font-semibold text-gray-800">{trade.pricePer100} บาท</p>
              </div>
            </div>
          </div>
        </motion.div>

        {user?.uid === trade.merchantId ? (
          // Merchant View
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">รายการยืนยันการซื้อ</h2>
            {confirms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-pink-100">
                <p className="text-gray-500">ยังไม่มีรายการยืนยันการซื้อ</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {confirms.map((confirm, index) => (
                  <motion.div
                    key={confirm.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-pink-100"
                  >
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">@{confirm.buyerName}</h3>
                        <p className="text-sm text-gray-500">
                          จำนวน: {confirm.amount}G
                        </p>
                        <p className="text-sm text-gray-500">
                          ยืนยันเมื่อ: {new Date(confirm.confirmedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {confirm.status === 'waiting' ? (
                          <button
                            onClick={() => handleMerchantConfirm(confirm.id)}
                            className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                          >
                            <Check className="w-5 h-5" />
                            <span>ยืนยันการเทรด</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm">
                            ยืนยันแล้ว
                          </span>
                        )}
                        <button
                          onClick={() => {
                            const message = `@${confirm.buyerName}\nยืนยันการซื้อ Gold ${confirm.amount}G\nราคาต่อ 100G: ${trade.pricePer100} บาท\nยืนยันที่: https://dnpartylist.vercel.app/trade/confirm/${params.tradeId}`;
                            navigator.clipboard.writeText(message);
                            toast.success('คัดลอกข้อความเรียบร้อยแล้ว');
                          }}
                          className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors"
                        >
                          <Copy className="w-5 h-5" />
                          <span>คัดลอก</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Customer View
          <div className="bg-white rounded-xl p-6 shadow-sm border border-pink-100">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">ยืนยันการซื้อ Gold</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      จำนวน Gold ที่ต้องการซื้อ
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-pink-200 focus:ring-2 focus:ring-pink-400 focus:border-transparent"
                      placeholder="เช่น 300"
                    />
                    {amount && !isNaN(Number(amount)) && (
                      <div className="text-right text-pink-600 font-semibold mt-2">
                        ราคาที่ต้องจ่าย: {Number(amount) * trade.pricePer100} บาท
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={handleConfirm}
                      disabled={isLoading || !amount}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-lg text-white transition-colors",
                        isLoading || !amount
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500"
                      )}
                    >
                      {isLoading ? 'กำลังยืนยัน...' : 'ยืนยันการซื้อ'}
                    </button>
                    <button
                      onClick={() => {
                        const message = `@${trade.merchantName}\nผมสนใจ Gold ${amount}G\nราคาต่อ 100G: ${trade.pricePer100} บาท\nยืนยันที่: https://dnpartylist.vercel.app/trade/confirm/${params.tradeId}`;
                        navigator.clipboard.writeText(message);
                        toast.success('คัดลอกข้อความเรียบร้อยแล้ว');
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-colors"
                    >
                      <Copy className="w-5 h-5" />
                      <span>คัดลอก</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 