'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MessageSquare, Copy, ShoppingCart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

export function MerchantList() {
  const { user } = useAuth();
  const [merchants, setMerchants] = useState<any[]>([]);

  useEffect(() => {
    const merchantsRef = ref(db, 'trade');
    const unsubscribe = onValue(merchantsRef, (snapshot) => {
      const data = snapshot.val();
      const merchantsList = data ? Object.entries(data)
        .map(([id, trade]: [string, any]) => ({
          id,
          ...trade,
          confirms: trade.confirms || {}
        }))
        .filter((trade) => trade.status === 'open')
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setMerchants(merchantsList);
    });

    return () => unsubscribe();
  }, []);

  const copyMessage = (merchantName: string, tradeId: string) => {
    const message = `@${merchantName}\nสนใจซื้อ Gold ครับ\nลิงก์ยืนยัน: https://dnpartylist.vercel.app/trade/confirm/${tradeId}`;
    navigator.clipboard.writeText(message);
    toast.success('คัดลอกข้อความเรียบร้อยแล้ว');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">ร้านค้าพ่อค้าทั้งหมด</h2>
      
      {merchants.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          ยังไม่มีร้านเปิดให้บริการในขณะนี้
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {merchants.map((merchant, index) => (
            <motion.div
              key={merchant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-pink-200 shadow-xl hover:shadow-2xl transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">@{merchant.merchantName}</h3>
                  <p className="text-sm text-gray-500 mt-1">Gold เหลือ: {merchant.amountLeft}G</p>
                  <p className="text-sm text-gray-500">ราคาต่อ 100G: {merchant.pricePer100} บาท</p>
                </div>
                <div className="flex space-x-2">
                  <a
                    href={`https://discord.com/users/${merchant.merchantId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-pink-50 hover:bg-pink-100 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5 text-pink-500" />
                  </a>
                  <button
                    onClick={() => copyMessage(merchant.merchantName, merchant.id)}
                    className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <Copy className="w-5 h-5 text-purple-500" />
                  </button>
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{merchant.advertisement}</p>
              
              <a
                href={`/trade/confirm/${merchant.id}`}
                className="flex items-center justify-center space-x-2 w-full py-2 rounded-lg bg-gradient-to-r from-pink-400 to-purple-400 text-white hover:from-pink-500 hover:to-purple-500 transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>ยืนยันการซื้อ</span>
              </a>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 