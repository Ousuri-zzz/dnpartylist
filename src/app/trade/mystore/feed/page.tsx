'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { useRouter } from 'next/navigation';

export default function MerchantFeedPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [feedMessages, setFeedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/trade');
      return;
    }

    const feedRef = ref(db, `feed/merchant/${user.uid}/trade`);
    const unsubscribeFeed = onValue(feedRef, (snapshot) => {
      const data = snapshot.val();
      const feedList = data ? Object.entries(data)
        .map(([id, feed]: [string, any]) => ({
          id,
          ...feed
        }))
        .sort((a, b) => b.timestamp - a.timestamp) : [];
      setFeedMessages(feedList);
      setLoading(false);
    });

    return () => unsubscribeFeed();
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const filteredFeed = feedMessages.filter(feed => feed.type === 'gold' || feed.type === 'item' || feed.type === 'loan');

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-pink-600 mb-4">ประวัติการซื้อขาย</h1>
          <div className="space-y-4">
            {filteredFeed.length > 0 ? (
              filteredFeed.map((feed, index) => (
                <motion.div
                  key={feed.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-6 shadow-sm border border-pink-100"
                >
                  <p className="text-gray-700">{feed.message || feed.text}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(feed.timestamp).toLocaleString('th-TH')}
                  </p>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-pink-100">
                <p className="text-gray-500">ยังไม่มีประวัติการซื้อขาย</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 