import React, { useState, useEffect } from 'react';
import { ref, onValue, get, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from '@/lib/firebase';
import { motion } from 'framer-motion';

export function FeedSection() {
  const [feedMessages, setFeedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // ดึงข้อมูล feed ทั้งหมดพร้อมจำกัดจำนวนและเรียงตาม timestamp
    const feedRef = query(
      ref(db, 'feed/all'),
      orderByChild('timestamp'),
      limitToLast(20)
    );
    
    const unsubFeed = onValue(feedRef, (snapshot) => {
      const data = snapshot.val();
      const feedList = data
        ? Object.entries(data).map(([id, message]: [string, any]) => ({
            id,
            ...message,
          }))
        : [];
      // เรียงลำดับจากใหม่ไปเก่า
      setFeedMessages(feedList.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    });
    return () => unsubFeed();
  }, []);

  return (
    <div className="space-y-4">
      {feedMessages.map((feed: any, index) => (
        <motion.div
          key={feed.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-pink-200"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-xl">
                  {feed.type === 'loan' ? '🧾' : feed.type === 'gold' ? '💰' : '🎁'}
                </span>
                <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  {feed.type === 'loan' ? 'กู้ยืม' : feed.type === 'gold' ? 'ซื้อขาย Gold' : 'ซื้อขายไอเทม'}
                </span>
                <p className="text-sm text-gray-500">{new Date(feed.timestamp).toLocaleString('th-TH')}</p>
              </div>
              {feed.type === 'loan' && (
                <div className="mt-2 text-sm text-gray-700">
                  <div>
                    <span className="font-semibold text-gray-600">ร้าน: </span>
                    <span className="text-pink-700 font-bold">
                      @{feed.merchantDiscord || feed.merchantName || 'พ่อค้า'}
                    </span>
                  </div>
                  <div className="mt-1">{feed.text}</div>
                  <div>
                    สถานะ: {
                      feed.subType === 'completed' ? (
                        <span className="text-green-600 font-bold">สำเร็จแล้ว</span>
                      ) : feed.subType === 'active' ? (
                        <span className="text-blue-600 font-bold">อนุมัติแล้ว</span>
                      ) : feed.subType === 'rejected' ? (
                        <span className="text-red-600 font-bold">ยกเลิก</span>
                      ) : feed.subType === 'returned' ? (
                        <span className="text-green-600 font-bold">แจ้งคืนแล้ว</span>
                      ) : (
                        <span className="text-yellow-600 font-bold">รอดำเนินการ</span>
                      )
                    }
                  </div>
                </div>
              )}
              {feed.type !== 'loan' && (
                <p className="text-gray-800 mt-2">{feed.text}</p>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}