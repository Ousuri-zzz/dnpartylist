'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MessageSquare, Copy, ShoppingCart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';

interface Item {
  id: string;
  merchantId: string;
  merchantName: string;
  itemName: string;
  description: string;
  price: number;
  status: 'available' | 'sold';
  createdAt: number;
}

export function ItemList({ merchantId }: { merchantId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  useEffect(() => {
    const itemsRef = ref(db, 'tradeItems');
    const unsubscribe = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      const itemsList = data ? Object.entries(data)
        .map(([id, item]: [string, any]) => ({
          id,
          ...item
        }))
        .filter((item) => item.merchantId === merchantId)
        .sort((a, b) => b.createdAt - a.createdAt) : [];
      setItems(itemsList);
    });

    return () => unsubscribe();
  }, [merchantId]);

  const copyMessage = (item: Item) => {
    const message = `@${item.merchantName}\nผมสนใจไอเทม: [${item.itemName}]\nราคา: ${item.price}G\nยืนยันที่: https://dnpartylist.vercel.app/trade/item/${item.id}`;
    navigator.clipboard.writeText(message);
    toast.success('คัดลอกข้อความเรียบร้อยแล้ว');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">รายการไอเทม</h2>
      
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          ยังไม่มีรายการไอเทมในร้านนี้
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-pink-200 shadow-xl hover:shadow-2xl transition-shadow",
                item.status === 'sold' ? 'border-gray-200' : 'border-pink-100'
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{item.itemName}</h3>
                  <p className="text-sm text-gray-500 mt-1">ราคา: {item.price}G</p>
                </div>
                {item.status === 'sold' && (
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                    ขายแล้ว
                  </span>
                )}
              </div>
              
              <p className="text-gray-600 text-sm mb-4">{item.description}</p>
              
              {item.status === 'available' && (
                <div className="flex space-x-2">
                  <a
                    href={`https://discord.com/users/${item.merchantId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-pink-50 hover:bg-pink-100 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5 text-pink-500" />
                    <span>DM</span>
                  </a>
                  <button
                    onClick={() => copyMessage(item)}
                    className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                  >
                    <Copy className="w-5 h-5 text-purple-500" />
                    <span>คัดลอก</span>
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 